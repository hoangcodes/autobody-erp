/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // AutoSuite Blue — brand scale (600 = #2B54D9, 700 = #2242B8 hover)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eef2fe',
          100: '#dce4fd',
          200: '#becdfb',
          300: '#93a9f7',
          400: '#6480f1',
          500: '#3e5ce6',
          600: '#2b54d9',
          700: '#2242b8',
          800: '#22399a',
          900: '#21357b',
          950: '#18244b',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          strong: 'hsl(var(--sidebar-strong))',
          foreground: 'hsl(var(--sidebar-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        amber: {
          50: '#fffaf0',
          100: '#fdecc8',
          400: '#f0a93a',
          500: '#dd8b1a',
          600: '#b96f10',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.08)',
        pop: '0 8px 24px -4px rgb(15 23 42 / 0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        // Centered dialog entrance: the transform keeps the -50%/-50% centering
        // (so it never "flies in from a corner") and only fades + scales.
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.18s ease-out',
        'dialog-in': 'dialog-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
