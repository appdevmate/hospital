/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  corePlugins: {
    preflight: false   // <-- This is what stops Tailwind from breaking PrimeNG styles
  }
};
