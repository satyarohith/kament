import { h, jsx, serve } from "https://deno.land/x/sift@0.1.4/mod.ts";

serve({
  "/": homePage,
});

function homePage(request) {
  return jsx(
    <Layout>
      <main
        style={{ display: "grid", justifyContent: "center", marginTop: "3rem" }}
      >
        <div
          data-post-id="kament-home-page"
          data-github-client-id="27f96448f68c6c2547ce"
          data-kament-endpoint="https://kament-api.deno.dev"
          id="kament"
        >
        </div>
      </main>
    </Layout>,
  );
}

const globalStyle = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
}

.parent {
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: 60%;
  height: 100%;
  margin: auto;
}

@media screen and (max-width: 700px) {
  .parent {
    width: 90%;
  }
}

@media screen and (max-width: 400px) {
  .parent {
    width: 95%;
  }
}

#brand {
  font-size: 2rem;
  font-weight: 500;
}
`;

function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width" />
        <style dangerouslySetInnerHTML={{ __html: globalStyle }}></style>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/satyarohith/kament@cb745b279c9fc64359c00c198b45eb129f2933d9/client/dist/kament.css"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/gh/satyarohith/kament@cb745b279c9fc64359c00c198b45eb129f2933d9/client/dist/kament.js"
          type="module"
        />
        <title>Kament - A Basic Comments Widget for Static Sites</title>
      </head>
      <body>
        <div
          className="parent"
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              placeItems: "center",
            }}
          >
            <h1 id="brand">Kament</h1>
            <a href="http://github.com/satyarohith/kament">
              <img
                height="32"
                width="32"
                src="data:image/svg+xml,%3Csvg role='img' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ctitle%3EGitHub icon%3C/title%3E%3Cpath d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'/%3E%3C/svg%3E"
              />
            </a>
          </header>
          {children}
          <footer></footer>
        </div>
      </body>
    </html>
  );
}
