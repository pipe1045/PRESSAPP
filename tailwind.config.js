/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: '#0a0a0a',
        neon: '#39FF14',
        surface: '#1a1a1a',
      },
      boxShadow: {
        'neon': '0 0 10px #39FF14, 0 0 20px #39FF14',
      }
    },
  },
  plugins: [],
}