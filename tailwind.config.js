/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Pretendard Variable",
          "Pretendard",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // iOS system-ish palette
        ios: {
          blue: "#007AFF",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9500",
          yellow: "#FFCC00",
          gray: {
            50: "#F9F9FB",
            100: "#F2F2F7",
            200: "#E5E5EA",
            300: "#D1D1D6",
            400: "#C7C7CC",
            500: "#AEAEB2",
            600: "#8E8E93",
            700: "#636366",
            800: "#3A3A3C",
            900: "#1C1C1E",
          },
        },
        water: "#2a78d6",
        food: "#eb6834",
      },
      borderRadius: {
        ios: "14px",
        "ios-lg": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        sheet: "0 -4px 24px rgba(0,0,0,0.12)",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      animation: {
        "slide-up": "slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
