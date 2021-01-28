export interface User {
  id?: string;
  name: string;
  email?: string;
  username: string;
  avatar: string;
}

export interface Comment {
  id: string;
  _id: string;
  text: string;
  createdAt: string;
  user: { name: string; avatar: string; username: string };
}

/** Query FuanaDB GraphQL endpoint with the provided query and variables. */
async function queryFuana(
  query: string,
  variables: { [key: string]: unknown },
): Promise<{
  data?: any;
  error?: any;
}> {
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

    return { data };
  } catch (error) {
    return { error };
  }
}

/** Create a Post in the database using the provided slug as unique identifier. */
async function createPost(
  slug: string,
): Promise<{
  data?: { id: string; slug: string };
  error?: { message: string };
}> {
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
      // deno-lint-ignore
      createPost: { _id, slug },
    } = data as { createPost: { _id: string; slug: string } };
    return { data: { id: _id, slug }, error };
  }

  return { data, error };
}

/**
 * Create an user in the database using the provided details.
 *
 * The `username` and `email` should be unique. And `createdAt` should be an ISO Date string.
 */
async function createUser({
  name,
  username,
  email,
  avatar,
}: User): Promise<{
  data?: User;
  error?: { message: string };
}> {
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
          username
          name
          avatar
        }
      }
    `,
    {
      username,
      email,
      avatar,
      createdAt: new Date().toISOString(),
      name,
    },
  );

  if (data && !error) {
    const {
      createUser: { _id, username, name, avatar },
    } = data as {
      createUser: {
        _id: string;
        username: string;
        name: string;
        avatar: string;
      };
    };
    return { data: { id: _id, username, name, avatar }, error };
  }

  return { data, error };
}

async function createComment({
  postId,
  userId,
  comment,
}: {
  postId: string;
  userId: string;
  comment: string;
}): Promise<{ data?: Comment; error?: { message: string } }> {
  const { data, error } = await queryFuana(
    gql`
      mutation(
        $userId: ID!
        $postId: ID!
        $comment: String!
        $createdAt: String!
      ) {
        createComment(
          data: {
            text: $comment
            user: { connect: $userId }
            post: { connect: $postId }
            createdAt: $createdAt
          }
        ) {
          _id
          text
          createdAt
          user {
            username
            avatar
            name
          }
        }
      }
    `,
    {
      userId,
      postId,
      comment,
      createdAt: new Date().toISOString(),
    },
  );

  if (data && !error) {
    const { createComment } = data as { createComment: Comment };
    createComment.id = createComment._id;
    return { data: createComment, error };
  }

  return { data, error };
}

async function getUser(
  username: string,
): Promise<{ data?: User; error?: { message: string } }> {
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
    } = data as {
      getUserByName: {
        _id: string;
        username: string;
        name: string;
        avatar: string;
      };
    };
    return { data: { id: _id, username, name, avatar }, error };
  }

  return { data, error };
}

async function getPostId(
  slug: string,
): Promise<{
  data?: { id: string; slug: string };
  error?: { message: string };
}> {
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
    } = data as { getPostBySlug: { _id: string; slug: string } };
    return { data: { id: _id, slug }, error };
  }

  return { data, error };
}

async function getCommentsOfPost(
  slug: string,
): Promise<{ data?: { comments: Comment[] }; error?: { message: string } }> {
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
    } = data as {
      getPostBySlug: {
        comments: {
          data: Comment[];
        };
      };
    };
    return { data: { comments }, error };
  }

  return { data, error };
}

/** This is a wrapper function to get formatting and syntax work in vscode. */
function gql(template: TemplateStringsArray) {
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
