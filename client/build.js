const esbuild = require("esbuild");
const path = require("path");

let aliasPlugin = {
  name: "env",
  setup(build) {
    // Intercept import paths called "react" and "react-dom" and return the path
    // of "preact/compat".
    build.onResolve({ filter: /^react|react-dom$/ }, args => ({
      path: path.join(
        process.cwd(),
        "node_modules",
        "preact",
        "compat",
        "dist",
        "compat.module.js"
      )
    }));
  }
};

esbuild
  .build({
    entryPoints: ["./src/kament.jsx"],
    bundle: true,
    minify: true,
    define: {
      "process.env.NODE_ENV": "'production'"
    },
    outfile: "dist/kament.js",
    plugins: [aliasPlugin]
  })
  .then(() => {
    const { stat } = require("fs");
    stat("./dist/kament.js", (err, { size }) => {
      console.log("kament.js: ", Math.ceil(size / 1024), "KB");
    });
    stat("./dist/kament.css", (err, { size }) => {
      console.log("kament.css: ", Math.ceil(size / 1024), "KB");
    });
  })
  .catch(() => process.exit(1));
