import type { Config } from "tailwindcss";

/**
 * Solar Tracker design system — built for older, non-technical users.
 *  - Larger type scale (every size ~25% bigger than Tailwind's default)
 *  - Calm, high-contrast blue for actions; white text on every filled button passes WCAG AA
 *  - Grey text shades darkened so secondary text stays readable
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["15px", { lineHeight: "1.45" }],
        sm: ["17px", { lineHeight: "1.5" }],
        base: ["18px", { lineHeight: "1.6" }],
        lg: ["21px", { lineHeight: "1.45" }],
        xl: ["25px", { lineHeight: "1.35" }],
        "2xl": ["29px", { lineHeight: "1.3" }],
        "3xl": ["36px", { lineHeight: "1.2" }],
      },
      colors: {
        // Primary: deep, calm blue. brand-600 on white = 6.7:1 contrast.
        brand: {
          50: "#eef4ff",
          100: "#dbe7fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#5b8def",
          500: "#2f66e0",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
          950: "#0f1a3d",
        },
        // Sun accent, used in the logo and highlights
        sun: {
          100: "#fef3c7",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Darker greens so white text on green buttons is readable
        emerald: {
          500: "#059669",
          600: "#047857",
          700: "#065f46",
          800: "#064e3b",
        },
        // Darker secondary text greys (400 and 500 were too faint)
        slate: {
          400: "#5f6b7d",
          500: "#4a5568",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
