import {
  json,
  validateRequest,
  PathParams
} from "https://deno.land/x/sift@0.1.3/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.1/mod.ts";
import {
  createComment,
  createPost,
  getCommentsOfPost,
  getPostId
} from "../db/mod.js";

const commentsCache = {};

const requestTerms = {
  POST: {
    headers: ["Authorization"],
    body: ["comment", "createdAt"]
  },
  OPTIONS: {},
  GET: {}
};

export async function commentsHandler(
  request: Request,
  { postslug }: PathParams
) {
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
          "Access-Control-Allow-Methods": Object.keys(requestTerms).join(", ")
        }
      }
    );
  }

  /**
   * Handle POST requests.
   *
   * This involves creation of new comments and posts when required.
   */
  if (request.method == "POST" && postslug) {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
    if (!jwtSigningSecret) {
      return json(
        {
          error: "environment variable JWT_SIGNING_SECRET not set"
        },
        { status: 500 }
      );
    }

    let postId;
    let userId;
    try {
      const { userId: id } = await verify(token, jwtSigningSecret, "HS512");
      userId = id;
    } catch (error) {
      return json({ error: "invalid auth token" }, { status: 400 });
    }

    const { data } = await getPostId(postslug);
    if (!data?.id) {
      // Create a new post in db with the slug.
      const { data, error } = await createPost(postslug);
      if (error) throw error;
      postId = data.id;
    } else {
      postId = data.id;
    }

    // Add the comment to the database.
    const { comment, createdAt } = body;
    const { data: commentData, error } = await createComment({
      postId,
      userId,
      comment,
      createdAt
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
  if (request.method == "GET" && postslug) {
    if (commentsCache[postslug]) {
      return json({
        comments: commentsCache[postslug]
      });
    }

    const { data, error } = await getCommentsOfPost(postslug);
    if (error) {
      return json({ error: error.message });
    }

    const comments = data && data.comments ? data.comments : [];
    commentsCache[postslug] = comments;
    return json({
      comments
    });
  }
}
