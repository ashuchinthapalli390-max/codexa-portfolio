/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070707",
        card: "#111111",
        "secondary-dark": "#191919",
        crimson: "#D90429",
        "bright-red": "#FF1E3C",
        "deep-red": "#63000F",
        white: "#F7F7F7",
        "secondary-text": "#A5A5A5",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        orbitron: ["Orbitron", "sans-serif"],
      },
      boxShadow: {
        'neon': '0 0 15px rgba(217, 4, 41, 0.25)',
        'neon-hover': '0 0 25px rgba(255, 30, 60, 0.4)',
      }
    },
  },
  plugins: [],
};
