/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './components/**/*.{js,jsx}',
    'App.jsx',
    './styles/**/*.css',
    './features/**/*.{js,jsx,css}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a73e8',
          dark:    '#1558b0',
          light:   '#e8f0fe',
        },
        error: {
          DEFAULT: '#A32D2D',
          bg:      '#fff5f5',
          border:  'rgba(163,45,45,0.2)',
        },
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-fast': 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}
