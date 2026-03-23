/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './popup/**/*.{js,jsx,ts,tsx,html}',
    '../components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'gh-bg':      '#0d1117',
        'gh-card':    '#161b22',
        'gh-border':  '#30363d',
        'gh-text':    '#e6edf3',
        'gh-muted':   '#8b949e',
        'gh-green':   '#3fb950',
        'gh-blue':    '#58a6ff',
        'gh-red':     '#f85149',
        'gh-yellow':  '#d29922',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow':   'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.3s ease-out forwards',
        'slide-in':     'slideIn 0.4s ease-out forwards',
        'progress-bar': 'progressBar 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        progressBar: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--progress)' },
        },
      },
    },
  },
  plugins: [],
};
