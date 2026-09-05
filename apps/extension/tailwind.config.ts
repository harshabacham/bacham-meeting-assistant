import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', ...defaultTheme.fontFamily.sans],
        serif: ['"Source Serif 4"', ...defaultTheme.fontFamily.serif],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--text-primary)',
        card: 'var(--surface)',
        'card-foreground': 'var(--text-primary)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        primary: 'var(--accent)',
        'primary-foreground': 'var(--accent-text)',
        muted: 'var(--text-muted)',
        'muted-foreground': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-text)',
        'accent-lime': 'var(--accent)',
        'accent-purple': 'var(--accent)',
        'accent-purple-hover': 'var(--accent-hover)',
        'accent-purple-subtle': 'var(--accent-dim)',
        border: 'var(--border)',
        success: 'var(--success)',
        destructive: 'var(--destructive)',
        'destructive-foreground': '#ffffff',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  plugins: [typography],
} satisfies Config
