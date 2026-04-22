/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          abismo: '#0D0F2B',
          medianoche: '#141852',
          real: '#1B2080',
          zafiro: '#2D3FBF',
          hielo: '#C8CCF5',
          papel: '#F2F3FB',
        },
        surface: {
          app: 'var(--surface-app)',
          soft: 'var(--surface-app-soft)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
          border: 'var(--surface-border)',
          'border-strong': 'var(--surface-border-strong)',
        },
        fg: {
          DEFAULT: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
          'on-brand': 'var(--fg-on-brand)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          ring: 'var(--accent-ring)',
        },
        gray: {
          50: '#f7f8fd',
          100: '#eef0fa',
          200: '#e0e3f1',
          300: '#c8ccf5',
          400: '#9ca0c9',
          500: '#6f739f',
          600: '#53587e',
          700: '#3d4160',
          800: '#2a2e4d',
          900: '#141852',
          950: '#0d0f2b',
        },
        blue: {
          50: '#f5f5fc',
          100: '#cdd1f0',
          200: '#a5ace3',
          300: '#7d88d7',
          400: '#5563cb',
          500: '#2d3fbf',
          600: '#2636a2',
          700: '#1f2c86',
          800: '#192369',
          900: '#12194c',
          950: '#0b1030',
        },
      },
      boxShadow: {
        brand: 'var(--shadow-md)',
        'brand-lg': 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      ringColor: {
        DEFAULT: 'var(--accent-ring)',
      },
    },
  },
  plugins: [],
};
