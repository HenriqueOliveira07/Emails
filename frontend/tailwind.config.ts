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
        critico: "#ef4444",
        alto: "#f97316",
        medio: "#eab308",
        baixo: "#22c55e",
      },
    },
  },
  plugins: [],
};
export default config;
