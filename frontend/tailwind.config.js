/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your custom palette
        'primary-dark': '#1A2340',
        'primary-dark-alt': '#243054',
        'cream': '#FAFAF8',
        'gold': '#D4A574',
        'gold-light': '#E8C77A',
        'taupe': '#4E4B46',
      },
      fontFamily: {
        // High finance / luxury serif — headings, titles, heritage tone
        'serif': ['"Playfair Display"', 'Georgia', 'serif'],
        // Bold marketing sans — UI, labels, body, CTAs
        'sans': ['Montserrat', 'Helvetica', 'sans-serif'],
        // Tabular / monospace — financial figures, ledgers, alignment
        'mono': ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        'money': ['"IBM Plex Mono"', 'Consolas', 'monospace'],
        // Banknote / engraved — brand wordmarks (Trajan-like)
        'engraved': ['Cinzel', 'Trajan Pro', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', '1rem'],
        'sm': ['0.875rem', '1.25rem'],
        'base': ['1rem', '1.5rem'],
        'lg': ['1.125rem', '1.75rem'],
        'xl': ['1.25rem', '2rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
        '4xl': ['2.25rem', '2.5rem'],
      },
    },
  },
  plugins: [],
}
