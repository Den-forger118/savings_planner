/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': 'rgb(20 28 51 / <alpha-value>)',
        'primary-dark-alt': 'rgb(30 42 74 / <alpha-value>)',
        'cream': 'rgb(255 255 255 / <alpha-value>)',
        'ivory': 'rgb(255 255 255 / <alpha-value>)',
        'gold': 'rgb(196 165 116 / <alpha-value>)',
        'gold-light': 'rgb(217 194 154 / <alpha-value>)',
        'taupe': 'rgb(92 87 79 / <alpha-value>)',
        'ink': 'rgb(14 19 34 / <alpha-value>)',
        'line': 'rgba(20, 28, 51, 0.10)',
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
        'soft': '0 1px 1px rgba(14, 19, 34, 0.03), 0 8px 28px rgba(14, 19, 34, 0.045)',
        'lift': '0 12px 32px rgba(14, 19, 34, 0.07)',
        'inset-line': 'inset 0 0 0 1px rgba(20, 28, 51, 0.08)',
      },
      borderRadius: {
        'card': '0.75rem',
      },
      backgroundImage: {
        'app-grain':
          'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(196, 165, 116, 0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(20, 28, 51, 0.05), transparent 50%)',
        'navy-sheen':
          'linear-gradient(165deg, #1E2A4A 0%, #141C33 48%, #0E1322 100%)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
