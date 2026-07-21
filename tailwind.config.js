/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        canvas: 'var(--canvas)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        hairline: 'var(--hairline)',
        'hairline-strong': 'var(--hairline-strong)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          fg: 'var(--accent-fg)',
        },
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
      },
      ringColor: {
        accent: 'var(--accent-ring)',
      },
    },
  },
  plugins: [],
};
