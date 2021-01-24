import { json } from "https://deno.land/x/sift@0.1.2/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.1/mod.ts";
import { validateRequest } from "../util.js";
import {
  createComment,
  createPost,
  getCommentsOfPost,
  getPostId,
} from "../db/mod.js";

/**
 *
 * @param {Request} request
 * @param {object} params
 */
export async function commentsHandler(request, { postslug }) {
  try {
    validateRequest(request, {
      allowedMethods: ["POST", "GET"],
    });

    /**
     * Handle POST requests.
     *
     * This involves creation of new comments and posts when required.
     */
    if (request.method == "POST" && postslug) {
      const token = request.headers.get("Authorization").split("Bearer ")[1];
      // TODO(@satyarohith): Handle invalid token.
      const { id: userId } = await verify(token, "secret", "HS512");
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

      const { comment } = await request.json();
      const body = await createComment({
        postId,
        userId,
        comment,
      });

      return json(body, { status: 201 });
    }

    /**
     * Handle GET requests.
     *
     * The code fetches the comments associated with a post slug and returns them.
     */
    if (request.method == "GET" && postslug) {
      const {
        data: { comments },
        error,
      } = await getCommentsOfPost(postslug);
      if (error) {
        return json({ error: error.message });
      }

      return json({
        comments,
      });
    }
  } catch (error) {
    console.error(error);
    return json({ error: error.message }, { status: 500 });
  }
}
