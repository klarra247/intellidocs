import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        /* Design system colors via CSS vars */
        surface: {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        content: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          error: 'var(--error)',
          info: 'var(--info)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },

        /* Keep primary alias for existing component compat */
        primary: {
          50: 'var(--accent-light)',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent-hover)',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
        'modal': 'var(--shadow-lg)',
      },
      borderRadius: {
        'card': '8px',
        'button': '6px',
        'badge': '4px',
      },
      letterSpacing: {
        'heading': '-0.02em',
      },
    },
  },
  plugins: [],
};

export default config;
