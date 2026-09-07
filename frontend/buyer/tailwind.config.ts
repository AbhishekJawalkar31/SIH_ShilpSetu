import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#183B36",
        forest: "#1E5B50",
        terracotta: "#C86443",
        saffron: "#E5A83B",
        ivory: "#FFFDF7",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(24, 59, 54, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
