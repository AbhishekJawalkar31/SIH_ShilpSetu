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
        terracotta: {
          DEFAULT: "#B8502A",
          50: "#FDF6F3",
          100: "#F9ECE6",
          200: "#F3D6C9",
          300: "#E9B6A1",
          400: "#D68060",
          500: "#B8502A",
          600: "#A0421F",
          700: "#853416",
          800: "#6B2912",
          900: "#54200E",
        },
        ochre: {
          DEFAULT: "#E08D3C",
          50: "#FCF8F2",
          100: "#F8EFE0",
          200: "#F1DEC2",
          300: "#E7C596",
          400: "#E08D3C",
          500: "#C97426",
          600: "#A85B17",
        },
        craftgreen: {
          DEFAULT: "#2D6A4F",
          50: "#F0F7F4",
          100: "#D8ECE1",
          200: "#B5DAC7",
          300: "#82BEA0",
          400: "#4D9A74",
          500: "#2D6A4F",
          600: "#22533D",
          700: "#1B4332",
        },
        warmcream: {
          DEFAULT: "#FBF9F5",
          card: "#FFFFFF",
          border: "#EBE5DF",
          muted: "#F3EFEA",
        },
        earthy: {
          title: "#2D2421",
          body: "#4D433F",
          muted: "#7B6F69",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        artisan: "0 4px 20px -2px rgba(184, 80, 42, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        card: "0 2px 10px rgba(45, 36, 33, 0.05)",
        floating: "0 10px 25px -3px rgba(184, 80, 42, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

