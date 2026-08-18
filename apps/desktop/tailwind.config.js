/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'], // Elegant for formulas/titles
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }], // Minimal labels
        'sm': ['0.875rem', { lineHeight: '1.57', letterSpacing: '0.01em' }], // Comfortable secondary text
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }], // Comfortable body
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.015em' }], // Subheadings
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.025em' }], // Section titles
        '3xl': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.03em' }], // Page titles
        '4xl': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }], // Hero titles
        '5xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.05em' }],
      },
      colors: {
        // BACHAM V2 base palette
        lime:    { DEFAULT: '#A6FF00', dim: 'rgba(166,255,0,0.15)', glow: 'rgba(166,255,0,0.25)' },
        onyx:    { DEFAULT: '#111111', surface: '#1E1E1E', raised: '#252525', hover: '#2E2E2E' },
        
        // Tailwind CSS variable bridge
        border:       "var(--border)",
        input:        "var(--input)",
        ring:         "var(--ring)",
        background:   "var(--bg)",
        foreground:   "var(--text-primary)",
        surface:      "var(--surface)",
        
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          dim:        "var(--destructive-dim)",
          foreground: "var(--color-white)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          dim:        "var(--accent-dim)",
          foreground: "var(--color-black)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        
        // Semantic Colors
        success: {
          DEFAULT: "var(--success)",
          dim:     "var(--success-dim)"
        },
        warning: {
          DEFAULT: "var(--warning)",
          dim:     "var(--warning-dim)"
        },
        info: {
          DEFAULT: "var(--info)",
          dim:     "var(--info-dim)"
        }
      },
      borderRadius: {
        xs:   "var(--radius-xs)",
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        '2xl': "var(--radius-2xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-lg)",
        '2xl': "var(--shadow-lg)",
        inner: "inset 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        lime: "none",
        "lime-strong": "none",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.6, transform: "scale(0.85)" },
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: 0, transform: "translateX(12px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "lime-ping": {
          "0%": { transform: "scale(1)", opacity: 0.8 },
          "100%": { transform: "scale(2)", opacity: 0 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "card-flip": {
          from: { transform: "rotateY(0)" },
          to: { transform: "rotateY(180deg)" },
        },
      },
      animation: {
        breathe:         "breathe 2s ease-in-out infinite",
        "breathe-fast":  "breathe 1.2s ease-in-out infinite",
        "slide-up":      "slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-right":"slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":      "scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
        "lime-ping":     "lime-ping 1.5s ease-out infinite",
        shimmer:         "shimmer 1.5s infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
}
