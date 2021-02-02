import {
  json,
  PathParams,
  validateRequest,
} from "https://deno.land/x/sift@0.1.4/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.1/mod.ts";
import { Status } from "https://deno.land/std@0.85.0/http/http_status.ts";
import {
  createComment,
  createPost,
  getCommentsOfPost,
  getPostId,
} from "../db/mod.ts";

const commentsCache: { [key: string]: any } = {};

const requestSchema = {
  POST: {
    headers: ["Authorization"],
    body: ["comment"],
  },
  OPTIONS: {},
  GET: {},
};

/**
 * GET comments of a post, create (POST) new comments on a post.
 *
 * POST is secured endpoint and requires Authorization header.
 */
export async function commentsHandler(request: Request, params?: PathParams) {
  const accessControlHeaders = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "600",
  };
  const { postslug } = params!;
  const { body, error } = await validateRequest(request, requestSchema);
  if (error) {
    return json(
      { error: error.message },
      { status: error.status, headers: { ...accessControlHeaders } },
    );
  }

  /**
   * Handle OPTIONS requests.
   *
   * Respond to pre-flight requests (by browsers) with appropriate headers.
   */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: Status.NoContent,
      headers: {
        ...accessControlHeaders,
      },
    });
  }

  /**
   * Handle POST requests.
   *
   * The functionality of this method is to create comments. But when a
   * post with the provided postslug isn't available in the database, a new post
   * is created in the database along with the comment.
   */
  if (request.method == "POST" && postslug) {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return json(
        { error: "auth token is empty" },
        {
          status: Status.BadRequest,
          headers: { ...accessControlHeaders },
        },
      );
    }

    const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
    if (!jwtSigningSecret) {
      return json(
        {
          error: "environment variable JWT_SIGNING_SECRET not set",
        },
        {
          status: Status.InternalServerError,
          headers: { ...accessControlHeaders },
        },
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
      return json(
        { error: "invalid auth token" },
        { status: Status.BadRequest, headers: { ...accessControlHeaders } },
      );
    }

    const { data } = await getPostId(postslug);
    if (!data?.id) {
      // Create a new post in db with the slug.
      const { data, error } = await createPost(postslug);
      if (error && !data) {
        return json(
          { error: "couldn't create the post" },
          { status: Status.InternalServerError },
        );
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
      return json(
        { error: "couldn't create the comment" },
        { status: Status.InternalServerError },
      );
    }

    delete commentsCache[postslug];
    return json(
      { ...commentData },
      { status: Status.Created, headers: { ...accessControlHeaders } },
    );
  }

  /**
   * Handle GET requests.
   *
   * The code fetches the comments associated with a post slug and returns them.
   */
  if (commentsCache[postslug]) {
    return json(
      {
        comments: commentsCache[postslug],
      },
      {
        headers: {
          ...accessControlHeaders,
        },
      },
    );
  }

  const { data, error: err } = await getCommentsOfPost(postslug);
  if (err) {
    return json(
      { error: "couldn't retrieve data from database" },
      {
        status: Status.InternalServerError,
        headers: { ...accessControlHeaders },
      },
    );
  }

  const comments = data && data.comments ? data.comments : [];
  commentsCache[postslug] = comments;
  return json(
    {
      comments,
    },
    {
      headers: {
        ...accessControlHeaders,
      },
    },
  );
}
