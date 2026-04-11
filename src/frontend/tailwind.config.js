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
        ink: {
          DEFAULT: '#0f1f3a',
          raised: '#16294a',
          soft: '#2e4267',
          muted: '#6b7f9f',
        },
        paper: {
          DEFAULT: '#f5f1ea',
          raised: '#fbf8f2',
          rail: '#ece6da',
        },
        accent: {
          DEFAULT: '#1953d8',
          ink: '#0a2a7a',
          soft: '#e6edfc',
        },
        rule: {
          DEFAULT: 'rgba(11,12,14,0.12)',
          strong: 'rgba(11,12,14,0.22)',
          invert: 'rgba(255,255,255,0.16)',
        },
        brand: {
          DEFAULT: '#1953d8',
          dark: '#0a2a7a',
          light: '#e6edfc',
        },
        error: {
          DEFAULT: '#A32D2D',
          bg: '#fff5f5',
          border: 'rgba(163,45,45,0.2)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['"JetBrains Mono"', '"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
        display: '-0.02em',
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'spin-fast': 'spin 0.8s linear infinite',
        'fade-up': 'fade-up 400ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
