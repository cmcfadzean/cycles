import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Muted sage green for primary actions
        primary: {
          50: "#f4f6f1",
          100: "#e5eadd",
          200: "#ccd6bd",
          300: "#acbc95",
          400: "#8fa374",
          500: "#718857",
          600: "#576b42",
          700: "#445435",
          800: "#39442d",
          900: "#313a28",
          950: "#181f12",
        },
        // Neutral grays without blue tint
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          850: "#1c1c1c",
          900: "#171717",
          925: "#131313",
          950: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(113, 136, 87, 0.3)",
      },
      borderColor: {
        DEFAULT: "#262626",
      },
    },
  },
  plugins: [],
};

export default config;
