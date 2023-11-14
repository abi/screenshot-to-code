/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Helvetica", "sans-serif"],
      },
      colors: {
        button: "#ffd803",
        highlight: "#ffd803",
      },
    },
  },
  plugins: [],
};
