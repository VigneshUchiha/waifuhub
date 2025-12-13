/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["*"],
  theme: {
    extend: {
      colors: {
        'glass-black': 'rgba(0, 0, 0, 0.6)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'accent-primary': '#0A84FF', // Apple-like blue
        'accent-pink': '#FF375F', // Apple-like pink
        'deep-bg': '#000000',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
