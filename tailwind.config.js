/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#f9ebd8',
          200: '#f2d5af',
          300: '#e9b87d',
          400: '#df994d',
          500: '#c2410c',
          600: '#a3360a',
          700: '#862b08',
          800: '#6b2206',
          900: '#4a1704',
        },
        surface: {
          0: '#faf8f5',
          50: '#f5f3f0',
          100: '#eae7e2',
          200: '#ddd9d2',
          300: '#c7c1b8',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0f0e0d',
        },
        success: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#166534',
          text: '#166534',
        },
        warning: {
          light: '#fef9c3',
          DEFAULT: '#ca8a04',
          dark: '#854d0e',
          text: '#854d0e',
        },
        danger: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',
          dark: '#991b1b',
          text: '#991b1b',
        },
      },
      boxShadow: {
        soft: '0 1px 3px rgba(28, 25, 23, 0.04)',
        card: '0 2px 12px rgba(28, 25, 23, 0.05), 0 1px 2px rgba(28, 25, 23, 0.03)',
        'card-hover': '0 8px 32px rgba(28, 25, 23, 0.08), 0 2px 8px rgba(28, 25, 23, 0.04)',
        elevated: '0 4px 24px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04)',
        sidebar: '2px 0 12px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)',
        'brand-gradient-light': 'linear-gradient(135deg, #fdf8f0 0%, #f9ebd8 100%)',
      },
    },
  },
  plugins: [],
};
