import React, { useEffect, useMemo, useState } from "react";
import { render } from "react-dom";
import { formatDistanceToNow } from "date-fns";
// TODO(@satyarohith): switch to preact after figuring out how aliases in esbuild work.

const kament = document.getElementById("kament");
const { postId, githubClientId, kamentEndpoint } = kament.dataset;

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
      <Comments comments={comments} />
      {!creds && <LoginWithGitHub updateCreds={updateCreds} />}
      {creds && <CommentInput creds={creds} addComment={addComment} />}
    </>
  );
}

render(<App />, kament);

function Comment({ name, username, text, createdAt }) {
  return (
    <div className="border rounded-md p-2 grid gap-2 max-w-sm mb-2">
      <div className="flex place-items-center gap-2">
        <img
          className="rounded-md"
          src={`https://github.com/${username}.png`}
          width="28"
        />
        <h3 className="text-xl">{name ?? username}</h3>
      </div>
      <div>
        <p>{text}</p>
      </div>
      <span className="text-gray-600">
        {formatDistanceToNow(new Date(createdAt)) + " ago"}
      </span>
    </div>
  );
}

function Comments({ comments }) {
  return (
    <div>
      {comments.length == 0 && <span>be the first to comment</span>}
      {comments.length > 0 &&
        comments.map(({ text, user, createdAt }) => (
          <Comment
            text={text}
            name={user?.name ?? "not available name"}
            username={user?.username ?? "not available username"}
            createdAt={createdAt}
          />
        ))}
    </div>
  );
}

function CommentInput({ addComment, creds }) {
  const { token, username, name } = JSON.parse(creds);
  const [state, setState] = useState({ comment: "" });

  const onSubmit = async (e) => {
    e.preventDefault();
    addComment({
      text: state.comment,
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
          ...state,
          createdAt: new Date().toISOString(),
        }),
      },
    );

    const results = await response.json();
    if (results.error) {
      console.error(results); // FIXME
    }
  };

  const onChange = (e) => {
    setState((prevState) => ({ ...prevState, [e.target.id]: e.target.value }));
  };

  return (
    <div className="py-2 grid gap-2 max-w-sm mb-2">
      <div className="flex place-items-center gap-2">
        <img
          className="rounded-md"
          src={`https://github.com/${username}.png`}
          width="28"
        />
        <h3 className="text-xl">{name ?? username}</h3>
      </div>
      <form onSubmit={onSubmit}>
        <textarea
          onChange={onChange}
          value={state.comment}
          id="comment"
          className="rounded-md w-full h-24 resize-y border p-1 text-xl"
        >
        </textarea>
        <button
          type="submit"
          className="bg-green-500 text-white font-semibold max-w-xs w-auto py-1 px-2 rounded float-right"
        >
          Comment
        </button>
      </form>
    </div>
  );
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

/**
 * External code.
 */
class PopupWindow {
  constructor(id, url, options = {}) {
    this.id = id;
    this.url = url;
    this.options = options;
  }

  open() {
    const { url, id, options } = this;

    this.window = window.open(url, id, toQuery(options, ","));
  }

  close() {
    this.cancel();
    this.window.close();
  }

  poll() {
    this.promise = new Promise((resolve, reject) => {
      this._iid = window.setInterval(() => {
        try {
          const popup = this.window;

          if (!popup || popup.closed !== false) {
            this.close();

            reject(new Error("The popup was closed"));

            return;
          }

          if (
            popup.location.href === this.url ||
            popup.location.pathname === "blank"
          ) {
            return;
          }

          const params = toParams(popup.location.search.replace(/^\?/, ""));

          resolve(params);

          this.close();
        } catch (error) {
          console.log({ error });
          /*
           * Ignore DOMException: Blocked a frame with origin from accessing a
           * cross-origin frame.
           */
        }
      }, 200);
    });
  }

  cancel() {
    if (this._iid) {
      window.clearInterval(this._iid);
      this._iid = null;
    }
  }

  then(...args) {
    return this.promise.then(...args);
  }

  catch(...args) {
    return this.promise.then(...args);
  }

  static open(...args) {
    const popup = new this(...args);

    popup.open();
    popup.poll();

    return popup;
  }
}

function toParams(query) {
  const q = query.replace(/^\??\//, "");
  return q.split("&").reduce((values, param) => {
    const [key, value] = param.split("=");
    values[key] = value;
    return values;
  }, {});
}

function toQuery(params, delimiter = "&") {
  const keys = Object.keys(params);
  return keys.reduce((str, key, index) => {
    let query = `${str}${key}=${params[key]}`;
    if (index < keys.length - 1) {
      query += delimiter;
    }
    return query;
  }, "");
}
