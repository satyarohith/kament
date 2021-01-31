import {
  createElement,
  Fragment,
  render,
} from "./deps/preact@10.5.12/preact.js";
import { useEffect, useState } from "./deps/preact@10.5.12/hooks.js";
import htm from "./deps/htm@3.0.4/htm.js";
const html = htm.bind(createElement);

const kament = document.getElementById("kament");
const { postslug, ghid, kme } = kament.dataset;
const KAMENT_ENDPOINT = kme;
const GITHUB_CLIENT_ID = ghid;

function App() {
  function useLocalStorageState(key, defaultValue = "") {
    const [state, setState] = useState(
      () => window.localStorage.getItem(key) ?? defaultValue,
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
        KAMENT_ENDPOINT + "/api/comments/" + encodeURIComponent(postslug),
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

  if (!fetched) return html`<div>loading data...</div>`;

  return html`
    <${Fragment}>
    <link href="${KAMENT_ENDPOINT}/kament/kament.css" rel="stylesheet" />
      <${Comments} comments=${comments} />
      ${!creds && html`<${LoginWithGitHub} updateCreds=${updateCreds} />`}
      ${creds &&
    html`<${CommentInput} creds=${creds} addComment=${addComment} />`}
    </${Fragment}>
  `;
}

render(html`<${App} name="World" />`, kament);

function Comment({ name, username, text, createdAt }) {
  return html`
    <div className="km-comment-card">
      <div className="km-comment-user">
        <img
          className="km-comment-user-img"
          src="https://github.com/${username}.png"
          width="28"
        />
        <h3 className="km-comment-user-name">${name ?? username}</h3>
      </div>
      <div>
        <p>${text}</p>
      </div>
      <span className="km-comment-time">${new Date(createdAt) + " ago"}</span>
    </div>
  `;
}

function Comments({ comments }) {
  return html`
    <div>
      ${comments.length == 0 && html`<span>be the first to comment</span>`}
      ${comments.length > 0 &&
    comments.map(({ text, user, createdAt }) => {
      return html`
          <${Comment}
            text=${text}
            name=${user?.name ?? "not available name"}
            username=${user?.username ?? "not available username"}
            createdAt=${createdAt}
          />
        `;
    })}
    </div>
  `;
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
      KAMENT_ENDPOINT + "/api/comments/" + encodeURIComponent(postslug),
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

  return html`
    <div className="km-comment-input-card">
      <div className="km-comment-user">
        <img
          className="km-comment-user-img"
          src="https://github.com/${username}.png"
          width="28"
        />
        <h3 className="km-comment-user-name">${name ?? username}</h3>
      </div>
      <form onSubmit=${onSubmit}>
        <textarea
          onChange=${onChange}
          value=${state.comment}
          id="comment"
          className="km-comment-input-textarea"
        ></textarea>
        <button type="submit" className="km-comment-button">Comment</button>
      </form>
    </div>
  `;
}

function LoginWithGitHub({ updateCreds }) {
  const onSubmit = async (e) => {
    const popup = PopupWindow.open(
      "github-oauth-authorize",
      `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${
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
        KAMENT_ENDPOINT + "/api/token?code=" + encodeURIComponent(code),
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

  return html`<button className="km-login-button" onClick=${onSubmit}>
    Login with GitHub
  </button>`;
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
