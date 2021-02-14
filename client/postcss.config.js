module.exports = {
  plugins: {
    tailwindcss: {
      purge: ["./src/kament.jsx"],
      darkMode: false, // or 'media' or 'class'
      theme: {
        extend: {}
      },
      variants: {
        extend: {}
      },
      plugins: []
    },
    autoprefixer: {},
    cssnano: {
      preset: ["default", { discardComments: { removeAll: true } }]
    }
  }
};
