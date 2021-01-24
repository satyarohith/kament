import { json } from "https://deno.land/x/sift@0.1.2/mod.ts";
import { create } from "https://deno.land/x/djwt@v2.1/mod.ts";
import { createUser, getUserId } from "../db/mod.js";
import { validateRequest } from "../util.js";

// TODO(@satyarohith): move to db/mod.ts
interface User {
  name: string;
  email: string;
  username: string;
  avatar: string;
}

/**
 * Generate a JWT token for a user based on the GitHub code provided.
 *
 * The main functionality involves fetching an access token from GitHub
 * by providing our credentials (GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET)
 * and the code passed on as parameter.
 * @param {Request} request
 * @param {object} params
 */
export async function tokenHandler(request: Request, params: any) {
  try {
    validateRequest(request, {
      allowedMethods: ["GET", "OPTIONS"],
      params: ["code"]
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
            "Access-Control-Allow-Methods": "GET, OPTIONS"
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const { access_token = "", error, scope = "" } = await getGHAcessToken(
      code!
    );
    if (error) {
      return json({ error }, { status: 400 });
    }
    if (!scope.includes("email")) {
      return json(
        {
          error: "user:email scope not available"
        },
        { status: 400 }
      );
    }

    const { username, name, email, avatar } = await getGHUserInfo(access_token);
    let { data } = await getUserId(username);
    if (!data?.id) {
      const { data: userData, error } = await createUser({
        name,
        email,
        username,
        avatar,
        createdAt: new Date().toISOString()
      });

      if (error) {
        // FIXME(@satyarohith)
        return json({ error: error.message }, { status: 500 });
      }

      data = userData;
    }

    // Generate a JWT token using the user id and username.
    // TODO(@satyarohith): handle failures.
    const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
    if (!jwtSigningSecret) {
      throw new Error("environment variable JWT_SIGNING_SECRET not set");
    }

    const jwt = await create(
      { alg: "HS512", typ: "JWT" },
      {
        userId: data.id,
        username: data.username
      },
      jwtSigningSecret
    );

    return json({ token: jwt });
  } catch (error) {
    console.log({ error });
    return json({ error: error.message }, { status: 500 });
  }
}

/**
 * Obtain an access token using the provided temperorary code
 * provided by GitHub after a user authorizes the application.
 */
async function getGHAcessToken(
  code: string
): Promise<{ access_token?: string; scope?: string; error?: string }> {
  const client_id = Deno.env.get("GITHUB_CLIENT_ID");
  if (!client_id) {
    throw new Error("environment variable GITHUB_CLIENT_ID not set");
  }
  const client_secret = Deno.env.get("GITHUB_CLIENT_SECRET");
  if (!client_secret) {
    throw new Error("environment variable GITHUB_CLIENT_SECRET not set");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "kament",
      accept: "application/json"
    },
    body: JSON.stringify({ client_id, client_secret, code })
  });

  const data = await response.json();
  if (data?.error) {
    return { error: data.error_description };
  }

  return data;
}

/** Obtain GitHub user information like username, avatar_url, name and email. */
async function getGHUserInfo(accessToken: string): Promise<User> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      "Content-Type": "application/json",
      "user-agent": "kament",
      Authorization: "token " + accessToken,
      accept: "application/json"
    }
  });

  const {
    email,
    name,
    login: username,
    avatar_url: avatar
  } = await response.json();

  return {
    name,
    email,
    username,
    avatar
  };
}
