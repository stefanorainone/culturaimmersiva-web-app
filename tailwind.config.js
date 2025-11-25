/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#022553',
          dark: '#011938',
        },
        secondary: {
          DEFAULT: '#c7925c',
          light: '#d4a774',
        }
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'dancing': ['Dancing Script', 'cursive'],
      }
    },
  },
  plugins: [],
}
