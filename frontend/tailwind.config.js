/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        button: "#ffd803",
        highlight: "#ffd803",
      },
    },
  },
  plugins: [],
};
