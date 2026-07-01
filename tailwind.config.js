/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          bg: '#111b21',
          panel: '#202c33',
          green: '#00a884',
          greenHover: '#029072',
          textDark: '#d1d7db',
          textMuted: '#8696a0',
          border: '#222d34',
          hover: '#2a3942',
          danger: '#f15c6d',
          chatBg: '#222e35'
        }
      }
    },
  },
  plugins: [],
}
