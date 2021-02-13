import React, { render, useEffect, useState } from "preact/compat";
import { formatDistanceToNow } from "date-fns";
import Markdown from "markdown-to-jsx";
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

  const [creds, setCreds] = useLocalStorageState("kamentCreds");
  const [comments, setComments] = useState();
  const [fetched, setFetched] = useState(false);

  const addComment = (comment) => {
    setComments((prev) => [...prev, comment]);
  };

  const updateCreds = (creds) => {
    setCreds(JSON.stringify(creds));
  };

  useEffect(async () => {
    if (fetched) {
      return;
    }
    try {
      const response = await fetch(
        kamentEndpoint + "/api/comments/" + encodeURIComponent(postId),
      );
      if (response.ok) {
        const { comments = [] } = await response.json();
        console.log({ comments });
        setComments(comments);
        setFetched(true);
      } else {
        console.log(response);
      }
    } catch (error) {
      console.log(error);
    }
  });

  if (!fetched) return <>loading data...</>;

  return (
    <>
      <CommentList comments={comments} />
      {creds
        ? <CommentInput creds={creds} addComment={addComment} />
        : <LoginWithGitHub updateCreds={updateCreds} />}
    </>
  );
}

function Comment({ user: { username, name }, text, createdAt }) {
  return (
    <div className="border rounded-md p-2 grid gap-2 max-w-sm mb-2">
      <div className="flex place-items-center gap-2">
        <img
          className="rounded-md"
          src={`https://avatars.githubusercontent.com/${username}`}
          width="28"
        />
        <h3 className="text-xl">{name ?? username}</h3>
      </div>
      <Markdown>
        {text}
      </Markdown>
      <span className="text-gray-600">
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

function CommentInput({ addComment, username }) {
  const [preview, setPreview] = useState(false);
  const [text, setText] = useState("");

  const handleClick = (e) => {
    e.preventDefault();
    setPreview((prev) => !prev);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    addComment({
      text: text,
      user: { username, name },
      createdAt: new Date().toISOString(),
    });
    setState({ comment: "" }); // Clear the textarea.
    const response = await fetch(
      kamentEndpoint + "/api/comments/" + encodeURIComponent(postId),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          comment: text,
          createdAt: new Date().toISOString(),
        }),
      },
    );

    const results = await response.json();
    if (results.error) {
      console.error(results); // FIXME
    }
  };

  const handleChange = (e) => {
    // setState((prevState) => ({ ...prevState, [e.target.id]: e.target.value }));
    setText(e.target.value);
  };

  return <div className="border rounded-md p-2 grid gap-2 max-w-sm mb-2">
    <div className="flex place-items-center gap-2">
      <img
        className="rounded-md"
        src={`https://avatars.githubusercontent.com/${username}`}
        width="28"
      />
      <h3 className="text-xl">{username}</h3>
    </div>

    <form onSubmit={onSubmit}>
      {preview
        ? <div className="markdown">
          <Markdown>
            {text}
          </Markdown>
        </div>
        : <textarea
          onChange={handleChange}
          value={text}
          id="comment"
          className="rounded-md w-full h-24 resize-y border p-1 text-xl"
        />}
      <button
        onClick={handleClick}
        className="rounded border font-sans w-24 py-1 px-2"
      >
        {preview ? "edit" : "preview"}
      </button>
      <button
        type="submit"
        className="bg-green-500 text-white font-semibold max-w-xs w-auto py-1 px-2 rounded float-right"
      >
        Comment
      </button>
    </form>
  </div>;
}

function LoginWithGitHub({ updateCreds }) {
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
      console.log({ code });
      // Call token with code
      const response = await fetch(
        kamentEndpoint + "/api/token?code=" + encodeURIComponent(code),
      );
      const creds = await response.json();
      if (creds) {
        console.log({ creds, login: true });
        updateCreds(creds);
      } else {
        console.log("something went wrong while requesting credentials: ", {
          creds,
        });
      }
    });
  };

  return (
    <button className="km-login-button" onClick={onSubmit}>
      Login with GitHub
    </button>
  );
}
