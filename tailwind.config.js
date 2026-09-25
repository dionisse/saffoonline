/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D10024',
          'primary-dark': '#A8001D',
          'primary-light': '#E02B48',
          accent: '#D10024',
          'accent-dark': '#A8001D',
          'accent-light': '#FF4D6D',
          gold: '#FFB300',
          muted: '#8D99AE',
          surface: '#F8F9FA',
          border: '#E4E7ED',
          dark: '#15161D',
          header: '#1E1F29',
          'text-dark': '#2B2D42',
          success: '#28A745',
          warning: '#FFB300',
          danger: '#D10024',
          info: '#00838F',
        },
        // Alias odoo → brand for backward compatibility
        odoo: {
          primary: '#D10024',
          'primary-dark': '#A8001D',
          'primary-light': '#E02B48',
          secondary: '#15161D',
          accent: '#FFB300',
          surface: '#F8F9FA',
          border: '#E4E7ED',
          muted: '#8D99AE',
          dark: '#15161D',
          success: '#28A745',
          warning: '#FFB300',
          danger: '#D10024',
          info: '#00838F',
        },
        electro: {
          red: '#D10024',
          'red-dark': '#A8001D',
          dark: '#15161D',
          top: '#1E1F29',
          body: '#2B2D42',
          muted: '#8D99AE',
          border: '#E4E7ED',
          gold: '#FFB300',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        pageEnter: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        badgeBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '30%':       { transform: 'scale(1.55)' },
          '60%':       { transform: 'scale(0.85)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        successPop: {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '60%':  { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
      animation: {
        'page-enter':   'pageEnter 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-up':   'fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'badge-bounce': 'badgeBounce 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'float':        'float 3.8s ease-in-out infinite',
        'shimmer':      'shimmer 1.5s infinite linear',
        'success-pop':  'successPop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'spin-slow':    'spin 2s linear infinite',
      },
      boxShadow: {
        'card-hover': '0 8px 30px -6px rgba(10, 42, 74, 0.25)',
        'card-lg':    '0 20px 60px -12px rgba(10, 42, 74, 0.15)',
        'accent':     '0 4px 14px -3px rgba(255, 215, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
