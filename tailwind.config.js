/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'claude': {
          // Primary surfaces - dark grays with subtle blue tint
          'dark': '#0D1117',     // Main background (GitHub-inspired)
          'darker': '#010409',   // Darker variant
          'gray': '#161B22',     // Card/panel background
          'surface': '#1C2128',  // Elevated surfaces
          
          // Borders and dividers
          'border': '#30363D',   // Default border
          'border-muted': '#21262D', // Subtle border
          'hover': '#262C36',    // Hover state background
          
          // Text hierarchy
          'text': '#E6EDF3',     // Primary text
          'text-secondary': '#8B949E', // Secondary text
          'muted': '#6E7681',    // Muted/disabled text
          
          // Accent colors - desaturated for dark mode
          'accent': '#58A6FF',   // Primary blue accent (desaturated)
          'accent-secondary': '#7D8590', // Secondary accent
          'accent-tertiary': '#388BFD',  // Tertiary accent (links, buttons)
          
          // Semantic colors - desaturated jewel tones
          'success': '#3FB950',  // Emerald green
          'warning': '#D29922',  // Amber (desaturated)
          'error': '#F85149',    // Ruby red
          'info': '#58A6FF',     // Sapphire blue
          'purple': '#A371F7',   // Amethyst purple
          'teal': '#56D4DD',     // Teal/cyan
          
          // Special purpose
          'code-bg': '#0D1117',  // Code block background
          'highlight': '#1F6FEB33', // Selection/highlight (with opacity)
        }
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
        'xs': '0.7rem',
      },
      spacing: {
        '0.5': '0.125rem',
        '1': '0.25rem',
        '1.5': '0.375rem',
      }
    },
  },
  plugins: [],
}