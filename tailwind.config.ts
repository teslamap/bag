import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: 'rgb(var(--c-ivory) / <alpha-value>)',
        warmwhite: 'rgb(var(--c-warmwhite) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        champagne: 'rgb(var(--c-champagne) / <alpha-value>)',
        taupe: 'rgb(var(--c-taupe) / <alpha-value>)',
        stone: 'rgb(var(--c-stone) / <alpha-value>)',
        earth: 'rgb(var(--c-earth) / <alpha-value>)',
        forest: 'rgb(var(--c-forest) / <alpha-value>)',
        oxblood: 'rgb(var(--c-oxblood) / <alpha-value>)',
        sand: 'rgb(var(--c-sand) / <alpha-value>)',
        soft: 'rgb(var(--c-soft) / <alpha-value>)',
        inkhover: 'rgb(var(--c-ink-hover) / <alpha-value>)',
        champagnehover: 'rgb(var(--c-champagne-hover) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Noto Sans Georgian"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Noto Serif Georgian"', 'Georgia', 'serif'],
        serif: ['"Noto Serif Georgian"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        display: '-0.03em',
        widecaps: '0.18em',
        ultrawide: '0.3em',
      },
      maxWidth: {
        editorial: '1640px',
        reading: '68ch',
      },
      boxShadow: {
        soft: '0 18px 60px -30px rgba(23,23,23,0.22)',
        lift: '0 30px 80px -40px rgba(23,23,23,0.38)',
        drawer: '-30px 0 80px -40px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1.08)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        kenburns: 'kenburns 14s ease-out forwards',
        'fade-in': 'fade-in .4s ease both',
      },
    },
  },
  plugins: [],
} satisfies Config;
