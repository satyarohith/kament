import { json, validateRequest } from "https://deno.land/x/sift@0.1.3/mod.ts";
import { create } from "https://deno.land/x/djwt@v2.1/mod.ts";
import { createUser, getUser, User } from "../db/mod.ts";

const requestTerms = {
  OPTIONS: {},
  GET: { params: ["code"] },
};

/**
 * Generate a JWT token for a user based on the GitHub code provided.
 *
 * The main functionality involves fetching an access token from GitHub
 * by providing our credentials (GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET)
 * and the code passed on as parameter.
 * @param {Request} request
 * @param {object} params
 */
export async function tokenHandler(request: Request) {
  const { error } = await validateRequest(request, requestTerms);
  if (error) {
    return json({ error: error.message }, { status: error.status });
  }

  /**
   * Handle OPTIONS requests.
   *
   * Usually to respond to pre-flight requests by browsers.
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
   * Handle GET requests.
   *
   * The request should have a code param. With the code, we will
   * extract an access token from GitHub and then retrieve user information.
   *
   * We then create an user in our db and generate an access token that can
   * be used by the client to make requests to our endpoints.
   */
  let responseStatus = 200;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const {
    access_token = "",
    error: tokenError,
    scope = "",
  } = await getGHAcessToken(code!);
  if (tokenError) {
    return json({ error: tokenError }, { status: 400 });
  }

  if (!scope.includes("email")) {
    return json(
      {
        error: "user:email scope not available",
      },
      { status: 400 },
    );
  }

  const { username, name, email, avatar } = await getGHUserInfo(access_token);
  let { data } = await getUser(username);
  if (!data?.id) {
    const { data: userData, error } = await createUser({
      name,
      email,
      username,
      avatar,
    });

    if (error) {
      return json({ error: "couldn't create the user" }, { status: 500 });
    }

    responseStatus = 201;
    data = userData!;
  }

  const jwtSigningSecret = Deno.env.get("JWT_SIGNING_SECRET");
  if (!jwtSigningSecret) {
    return json(
      { error: "environment variable JWT_SIGNING_SECRET not set" },
      { status: 500 },
    );
  }

  // Generate a JWT token using the user id and username.
  const jwt = await create(
    { alg: "HS512", typ: "JWT" },
    {
      userId: data.id,
      username: data.username,
    },
    jwtSigningSecret,
  );

  return json(
    {
      token: jwt,
      name: data.name,
      username: data.username,
      avatar: data.avatar,
    },
    { status: responseStatus },
  );
}

/**
 * Obtain an access token using the temperorary code
 * provided by GitHub after a user authorizes the application.
 */
async function getGHAcessToken(
  code: string,
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
      accept: "application/json",
    },
    body: JSON.stringify({ client_id, client_secret, code }),
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
      accept: "application/json",
    },
  });

  const {
    email,
    name,
    login: username,
    avatar_url: avatar,
  } = await response.json();

  return {
    name,
    email,
    username,
    avatar,
  };
}
