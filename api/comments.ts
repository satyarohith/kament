import {
  json,
  PathParams,
  validateRequest,
} from "https://deno.land/x/sift@0.1.3/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.1/mod.ts";
import {
  createComment,
  createPost,
  getCommentsOfPost,
  getPostId,
} from "../db/mod.ts";

const commentsCache: { [key: string]: any } = {};

const requestTerms = {
  POST: {
    headers: ["Authorization"],
    body: ["comment"],
  },
  OPTIONS: {},
  GET: {},
};

export async function commentsHandler(request: Request, params?: PathParams) {
  const { postslug } = params!;
  const { body, error } = await validateRequest(request, requestTerms);
  if (error) {
    return json({ error: error.message }, { status: error.status });
  }

  /**
   * Handle OPTIONS requests.
   *
   * This is usually here to respond to pre-flight requests by browsers.
   */
  if (request.method === "OPTIONS") {
    return json(
      {},
      {
        headers: {
          "Access-Control-Allow-Origin": "*", // FIXME(@satyarohith)
          "Access-Control-Allow-Methods": Object.keys(requestTerms).join(", "),
        },
      },
    );
  }

  /**
   * Handle POST requests.
   *
   * This involves creation of new comments and posts when required.
   */
  if (request.method == "POST" && postslug) {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return json({ error: "auth token is empty" });
    }

    const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
    if (!jwtSigningSecret) {
      return json(
        {
          error: "environment variable JWT_SIGNING_SECRET not set",
        },
        { status: 500 },
      );
    }

    let postId: string;
    let userId: string;
    try {
      const { userId: id } = (await verify(
        token,
        jwtSigningSecret,
        "HS512",
      )) as { userId: string };
      userId = id;
    } catch (error) {
      return json({ error: "invalid auth token" }, { status: 400 });
    }

    const { data } = await getPostId(postslug);
    if (!data?.id) {
      // Create a new post in db with the slug.
      const { data, error } = await createPost(postslug);
      if (error && !data) {
        return json({ error: "couldn't create the post" }, { status: 500 });
      }
      postId = data!.id;
    } else {
      postId = data.id;
    }

    // Add the comment to the database.
    const { comment } = body!;
    const { data: commentData, error } = await createComment({
      postId,
      userId,
      comment,
    });

    if (error) {
      return json(error, { status: 500 });
    }

    delete commentsCache[postslug];
    return json({ ...commentData }, { status: 201 });
  }

  /**
   * Handle GET requests.
   *
   * The code fetches the comments associated with a post slug and returns them.
   */
  if (commentsCache[postslug]) {
    return json({
      comments: commentsCache[postslug],
    });
  }

  const { data, error: err } = await getCommentsOfPost(postslug);
  if (err) {
    return json({ error: err.message });
  }

  const comments = data && data.comments ? data.comments : [];
  commentsCache[postslug] = comments;
  return json({
    comments,
  });
}
