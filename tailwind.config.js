/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:       '#313283',
          teal:       '#009989',
          gold:       '#FAA61B',
          red:        '#FF0000',
          'navy-dark':  '#252268',
          'navy-light': '#4a4baa',
          'teal-light': '#e6f7f5',
          'teal-dark':  '#007a6d',
          'gold-light': '#fff4e0',
        },
      },
    },
  },
  plugins: [],
}
