import { json } from "https://deno.land/x/sift@0.1.2/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.1/mod.ts";
import { validateRequest } from "../util.js";
import {
  createComment,
  createPost,
  getCommentsOfPost,
  getPostId,
} from "../db/mod.js";

const commentsCache = {};

/**
 *
 * @param {Request} request
 * @param {object} params
 */
export async function commentsHandler(request, { postslug }) {
  try {
    validateRequest(request, {
      allowedMethods: ["POST", "GET", "OPTIONS"],
    });

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
            "Access-Control-Allow-Methods": "GET, OPTIONS",
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
      const token = request.headers.get("Authorization").split("Bearer ")[1];
      // TODO(@satyarohith): Handle invalid token.
      const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
      if (!jwtSigningSecret) {
        throw new Error("environment variable JWT_SIGNING_SECRET not set");
      }
      const { userId } = await verify(token, jwtSigningSecret, "HS512");
      let postId;
      const { data } = await getPostId(postslug);

      // Create a new post in db with the slug.
      if (!data?.id) {
        const { data, error } = await createPost(postslug);
        if (error) throw error;
        postId = data.id;
      } else {
        postId = data.id;
      }

      /* Add the comment to the database. */
      const { comment, createdAt } = await request.json();
      const { data: commentData, error } = await createComment({
        postId,
        userId,
        comment,
        createdAt,
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
        console.log();
        return json({
          comments: commentsCache[postslug],
        });
      }

      const { data, error } = await getCommentsOfPost(postslug);
      if (error) {
        return json({ error: error.message });
      }

      const comments = data && data.comments ? data.comments : [];
      commentsCache[postslug] = comments;
      return json({
        comments,
      });
    }
  } catch (error) {
    console.error(error);
    return json({ error: error.message }, { status: 500 });
  }
}
