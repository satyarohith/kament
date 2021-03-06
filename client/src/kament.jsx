import React, { render, useEffect, useState } from "preact/compat";
import { formatDistanceToNow } from "date-fns";
import Markdown from "markdown-to-jsx";
import { sanitize } from "dompurify";
import PopupWindow from "./popup.js";

const kament = document.getElementById("kament");
const { postId, githubClientId, kamentEndpoint } = kament.dataset;

render(<App />, kament);

function App() {
  function useLocalStorageState(key, defaultValue = "") {
    const [state, setState] = useState(
      () => window.localStorage.getItem(key) || defaultValue,
    );

    useEffect(() => {
      window.localStorage.setItem(key, state);
    }, [key, state]);

    return [state, setState];
  }

  // TODO(@satyarohith): do not use localstorage for credentials.
  const [creds, setCreds] = useLocalStorageState("kamentCreds");
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setErrorStr] = useState(null);

  const addComment = (comment) => {
    setComments((prev) => [...prev, comment]);
  };

  const updateCreds = (creds) => {
    setCreds(JSON.stringify(creds));
  };

  const setError = (error) => {
    setErrorStr(error);
  };

  useEffect(async () => {
    if (status !== "loading") {
      return;
    }

    const { comments, error } = await getComments(postId);
    if (error) {
      setError(error);
    } else {
      setComments((prev) => [...prev, ...comments]);
    }
    setStatus("done");
  });

  if (status === "loading") {
    return <>loading data...</>;
  }

  return (
    <div className="max-w-sm w-full">
      <CommentList comments={comments} setError={setError} />
      {error && <div className="text-red-400">{error}</div>}
      {creds
        ? <CommentInput
          {...JSON.parse(creds)}
          addComment={addComment}
          setError={setError}
          postId={postId}
        />
        : <LoginWithGitHub updateCreds={updateCreds} setError={setError} />}
    </div>
  );
}

function Comment({ user: { username, name }, text, createdAt }) {
  return (
    <div className="comment">
      <div className="comment_user">
        <img
          className="comment_user_image"
          src={`https://avatars.githubusercontent.com/${username}`}
          width="28"
        />
        <h3 className="comment_user_name">{name ?? username}</h3>
      </div>
      <div className="markdown">
        <Markdown options={{ wrapper: React.Fragment }}>
          {text}
        </Markdown>
      </div>
      <span className="comment_age">
        {formatDistanceToNow(new Date(createdAt)) + " ago"}
      </span>
    </div>
  );
}

function CommentList({ comments }) {
  if (comments.length > 0) {
    return comments.map((comment) => {
      return <>
        <Comment {...comment} />
        <div className="mt-2" />
      </>;
    });
  }

  return <div>No comments found</div>;
}

function CommentInput({ username, name, token, postId, addComment, setError }) {
  const [preview, setPreview] = useState(false);
  const [text, setText] = useState("");

  const handleClick = (e) => {
    e.preventDefault();
    setPreview((prev) => !prev);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const { error, comment } = await postComment(text, { token, postId });
    if (error) {
      setError(error);
    } else {
      addComment(comment);
    }
    setText("");
  };

  const handleChange = (e) => {
    setText(e.target.value);
  };

  return <div className="comment-input">
    <div className="comment-input_user">
      <img
        className="comment-input_user_image"
        src={`https://avatars.githubusercontent.com/${username}`}
        width="28"
      />
      <h3 className="comment-input_user_name">{name ?? username}</h3>
    </div>

    <form className="comment-input_form" onSubmit={onSubmit}>
      {preview
        ? <div className="comment-input_form_markdown_preview">
          <Markdown options={{ wrapper: React.Fragment }}>
            {sanitize(text)}
          </Markdown>
        </div>
        : <textarea
          onChange={handleChange}
          value={text}
          id="comment"
          className="comment-input_form_textarea"
        />}
      <button
        onClick={handleClick}
        className="comment-input_form_preview_toggle"
      >
        {preview ? "edit" : "preview"}
      </button>
      <button
        type="submit"
        className="comment-input_form_submit"
      >
        Comment
      </button>
    </form>
  </div>;
}

function LoginWithGitHub({ updateCreds, setError }) {
  const onSubmit = async (e) => {
    const popup = PopupWindow.open(
      "github-oauth-authorize",
      `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=${
        encodeURIComponent(
          "user:email",
        )
      }`,
      { height: 600, width: 600 },
    );

    popup.then(async ({ code }) => {
      const { credentials, error } = await getToken(code);
      if (error) {
        setError(error);
      } else {
        updateCreds(credentials);
      }
    });
  };

  return (
    <button className="github_login_button" onClick={onSubmit}>
      Login with GitHub
    </button>
  );
}

/**
 * Wrapper functions to communicate with Kament API.
 */
async function postComment(comment, { token, postId }) {
  const response = await fetch(
    kamentEndpoint + "/api/comments/" + encodeURIComponent(postId),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        comment,
        createdAt: new Date().toISOString(),
      }),
    },
  );

  if (response.ok) {
    const comment = await response.json();
    return { comment };
  }

  return {
    error: "error posting the comment",
  };
}

async function getComments(postId) {
  const response = await fetch(
    kamentEndpoint + "/api/comments/" + encodeURIComponent(postId),
  );
  if (response.ok) {
    const { comments = [] } = await response.json();
    return { comments };
  }

  return {
    error: "couldn't retrieve the comments for the post",
  };
}

async function getToken(code) {
  const response = await fetch(
    kamentEndpoint + "/api/token?code=" + encodeURIComponent(code),
  );

  if (response.ok) {
    const credentials = await response.json();
    return { credentials };
  }

  return {
    error: "couldn't retrieve the token",
  };
}
