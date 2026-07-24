/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': 'rgb(10 15 26 / <alpha-value>)',
        'primary-dark-alt': 'rgb(19 27 46 / <alpha-value>)',
        'primary-sheen': 'rgb(37 55 90 / <alpha-value>)',
        'cream': 'rgb(248 244 236 / <alpha-value>)',
        'ivory': 'rgb(251 250 247 / <alpha-value>)',
        'gold': 'rgb(212 177 109 / <alpha-value>)',
        'gold-light': 'rgb(244 224 165 / <alpha-value>)',
        'gold-deep': 'rgb(168 139 82 / <alpha-value>)',
        'taupe': 'rgb(92 87 79 / <alpha-value>)',
        'ink': 'rgb(10 15 26 / <alpha-value>)',
        'line': 'rgba(10, 15, 26, 0.10)',
      },
      fontFamily: {
        'serif': ['"Newsreader"', 'Georgia', 'serif'],
        'sans': ['Manrope', 'Helvetica', 'sans-serif'],
        'mono': ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        'money': ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        'engraved': ['Cinzel', 'Georgia', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', '1rem'],
        'sm': ['0.875rem', '1.35rem'],
        'base': ['1rem', '1.6rem'],
        'lg': ['1.125rem', '1.7rem'],
        'xl': ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '1.95rem'],
        '3xl': ['1.875rem', '2.35rem'],
        '4xl': ['2.25rem', '2.75rem'],
        '5xl': ['3rem', '1.2'],
      },
      boxShadow: {
        'soft': '0 1px 1px rgba(10, 15, 26, 0.04), 0 8px 28px rgba(10, 15, 26, 0.06)',
        'lift': '0 12px 32px rgba(10, 15, 26, 0.08)',
        'inset-line': 'inset 0 0 0 1px rgba(10, 15, 26, 0.08)',
      },
      borderRadius: {
        'card': '0.75rem',
      },
      backgroundImage: {
        'app-grain':
          'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(212, 177, 109, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(10, 15, 26, 0.05), transparent 50%)',
        'navy-sheen':
          'radial-gradient(120% 80% at 50% 0%, #25375A 0%, #131B2E 50%, #0A0F1A 100%)',
        'gold-divider':
          'linear-gradient(to bottom, #7B612C 0%, #F3E2AA 35%, #CFA95B 70%, #5C451D 100%)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
