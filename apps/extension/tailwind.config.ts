import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', ...defaultTheme.fontFamily.sans],
        serif: ['"Source Serif 4"', ...defaultTheme.fontFamily.serif],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        'accent-purple': 'var(--accent)',
        'accent-purple-hover': 'var(--accent)',
        'accent-purple-subtle': '#F2B70533',
        border: 'var(--border)',
        success: 'var(--success)',
        destructive: 'var(--destructive)',
        'destructive-foreground': '#ffffff',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-base)',
        sm: 'calc(var(--radius-base) - 2px)',
      },
    },
  },
  plugins: [typography],
} satisfies Config
