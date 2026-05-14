/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette pulled from the team_1 Figma:
        // sage = header / pills accent, cream = sidebar bg, sky = active filter pill / CTA
        sage: {
          50: '#F5F7EE',
          100: '#E8EED6',
          200: '#D7E0B9',
          300: '#C4D29A',
          400: '#B3C284',
          500: '#9DAE6C',
          600: '#7E8E55',
          700: '#5F6C40',
        },
        cream: {
          50: '#FBF8EC',
          100: '#F4EFDB',
          200: '#EDE6C6',
          300: '#E2D8A8',
        },
        sky: {
          50: '#F1F6FB',
          100: '#DCE9F5',
          200: '#C2D7EC',
          300: '#A6C3E1',
          400: '#7FA4CC',
        },
        ink: {
          900: '#1F1F1F',
          700: '#3E3E3E',
          500: '#666666',
          300: '#A8A8A8',
          100: '#E6E6E6',
        },
      },
      fontFamily: {
        // Pixel font reserved for wordmark + caps headers only.
        pixel: ['"VT323"', 'ui-monospace', 'monospace'],
        // Clean body font.
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(31, 31, 31, 0.06)',
        chip: '0 1px 2px rgba(31, 31, 31, 0.08)',
      },
      borderRadius: {
        chip: '999px',
      },
    },
  },
  plugins: [],
};
