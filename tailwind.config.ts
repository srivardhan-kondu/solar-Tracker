import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fbd7ac',
          300: '#f7b977',
          400: '#f3943f',
          500: '#ef7417',
          600: '#e0570d',
          700: '#ba400d',
          800: '#943312',
          900: '#772c12',
          950: '#401306',
        },
        solar: {
          amber: '#f59e0b',
          blue: '#0284c7',
          navy: '#0f172a',
          emerald: '#10b981',
          slate: '#334155'
        }
      },
    },
  },
  plugins: [],
};
export default config;
