/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Force include all theme names to prevent purging
    { raw: 'data-theme="light" data-theme="dark" data-theme="cupcake" data-theme="cyberpunk" data-theme="synthwave" data-theme="forest" data-theme="lofi" data-theme="dracula" data-theme="bumblebee" data-theme="emerald" data-theme="corporate" data-theme="retro" data-theme="valentine" data-theme="aqua" data-theme="night" data-theme="coffee"' },
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: true
  },
}
