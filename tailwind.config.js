/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    { raw: 'data-theme="atelier-dark" data-theme="atelier-light"' },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "atelier-dark": {
          "primary": "#f59e0b",           // amber-500
          "primary-content": "#451a03",   // very dark amber for text on primary
          "secondary": "#d97706",         // amber-600
          "secondary-content": "#fffbeb", // amber-50 for text on secondary
          "accent": "#fbbf24",            // amber-400
          "accent-content": "#451a03",
          "neutral": "#292524",           // stone-800
          "neutral-content": "#d6d3d1",   // stone-300
          "base-100": "#1c1917",          // stone-900
          "base-200": "#151311",          // between stone-900 and 950
          "base-300": "#0c0a09",          // stone-950
          "base-content": "#e7e5e4",      // stone-200
          "info": "#38bdf8",              // sky-400
          "info-content": "#082f49",
          "success": "#4ade80",           // green-400
          "success-content": "#052e16",
          "warning": "#fb923c",           // orange-400
          "warning-content": "#431407",
          "error": "#f87171",             // red-400
          "error-content": "#450a0a",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--animation-btn": "0.2s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
      {
        "atelier-light": {
          "primary": "#d97706",           // amber-600
          "primary-content": "#ffffff",
          "secondary": "#b45309",         // amber-700
          "secondary-content": "#ffffff",
          "accent": "#f59e0b",            // amber-500
          "accent-content": "#451a03",
          "neutral": "#44403c",           // stone-700
          "neutral-content": "#fafaf9",   // stone-50
          "base-100": "#fafaf9",          // stone-50
          "base-200": "#f5f5f4",          // stone-100
          "base-300": "#e7e5e4",          // stone-200
          "base-content": "#1c1917",      // stone-900
          "info": "#0284c7",              // sky-600
          "info-content": "#ffffff",
          "success": "#16a34a",           // green-600
          "success-content": "#ffffff",
          "warning": "#ea580c",           // orange-600
          "warning-content": "#ffffff",
          "error": "#dc2626",             // red-600
          "error-content": "#ffffff",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--animation-btn": "0.2s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
    ],
  },
}
