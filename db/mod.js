/**
 * Query FuanaDB GraphQL endpoint with the provided query and variables.
 *
 * @param {string} query graphql query string
 * @param {unknown} variables
 */
async function queryFuana(query, variables) {
  const token = Deno.env.get("FAUNA_SECRET");
  if (!token) {
    throw new Error("environment variable FAUNA_SECRET not set");
  }

  try {
    const res = await fetch("https://graphql.fauna.com/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const { data, errors } = await res.json();
    if (errors) {
      return { data, error: errors[0] };
    }

    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error };
  }
}

/**
 * Create a Post in the database using the provided slug as unique identifier.
 *
 * @param {string} slug
 */
async function createPost(slug) {
  const { data, error } = await queryFuana(
    gql`
      mutation($slug: String!) {
        createPost(data: { slug: $slug }) {
          _id
          slug
        }
      }
    `,
    {
      slug,
    },
  );

  if (data && !error) {
    const {
      createPost: { _id, slug },
    } = data;
    return { data: { id: _id, slug }, error };
  }

  return { data, error };
}

/**
 * Create an user in the database using the provided details.
 *
 * The `username` and `email` should be unique. And `createdAt` should be an ISO Date string.
 * @param {{name: string, username: string, email: string, avatar: string, createdAt: string}}
 */
async function createUser({ name, username, email, avatar, createdAt }) {
  const { data, error } = await queryFuana(
    gql`
      mutation(
        $username: String!
        $email: String!
        $name: String
        $avatar: String
        $createdAt: Time
      ) {
        createUser(
          data: {
            email: $email
            username: $username
            avatar: $avatar
            createdAt: $createdAt
            name: $name
          }
        ) {
          _id
          name
          username
          avatar
        }
      }
    `,
    {
      username,
      email,
      avatar,
      createdAt,
      name,
    },
  );

  if (data && !error) {
    const {
      createUser: { _id, username, name, avatar },
    } = data;
    return { data: { id: _id, username, name, avatar }, error };
  }

  return { data, error };
}

async function createComment({ postId, userId, comment, createdAt }) {
  const { data, error } = await queryFuana(
    gql`
      mutation(
        $userId: ID!
        $postId: ID!
        $comment: String!
        $createdAt: Time
      ) {
        createComment(
          data: {
            # TODO(@satyarohith): change this to message or something more appropriate.
            text: $comment
            createdAt: $createdAt
            user: { connect: $userId }
            post: { connect: $postId }
          }
        ) {
          _id
          text
          createdAt
          user {
            username
            name
            avatar
          }
          post {
            slug
          }
        }
      }
    `,
    {
      userId,
      postId,
      comment,
      createdAt,
    },
  );

  if (data && !error) {
    const { createComment } = data;
    createComment.id = createComment._id;
    delete createComment._id;
    return { data: createComment, error };
  }

  return { data, error };
}

async function getUser(username) {
  const { data, error } = await queryFuana(
    gql`
      query($username: String!) {
        getUserByName(username: $username) {
          _id
          username
          name
          avatar
        }
      }
    `,
    {
      username,
    },
  );

  if (data && !error) {
    const {
      getUserByName: { _id, username, name, avatar },
    } = data;
    return { data: { id: _id, username, name, avatar }, error };
  }

  return { data, error };
}

async function getPostId(slug) {
  const { data, error } = await queryFuana(
    gql`
      query($slug: String!) {
        getPostBySlug(slug: $slug) {
          _id
          slug
        }
      }
    `,
    {
      slug,
    },
  );

  if (data && !error) {
    const {
      getPostBySlug: { _id, slug },
    } = data;
    return { data: { id: _id, slug }, error };
  }

  return { data, error };
}

// FIXME(@satyarohith)
async function getCommentsOfPost(slug) {
  const { data, error } = await queryFuana(
    gql`
      query($slug: String!) {
        getPostBySlug(slug: $slug) {
          comments {
            data {
              _id
              text
              createdAt
              user {
                name
                username
                avatar
              }
            }
            before
            after
          }
        }
      }
    `,
    { slug },
  );

  if (data && !error) {
    const {
      getPostBySlug: {
        comments: { data: comments },
      },
    } = data;
    return { data: { comments }, error };
  }

  return { data, error };
}

/** This is a wrapper function to get formatting and syntax work in vscode. */
function gql(template) {
  return template.join("");
}

export {
  createComment,
  createPost,
  createUser,
  getCommentsOfPost,
  getPostId,
  getUser,
};
