/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#faf8f4", // warm off-white
        ink: "#16140f", // near-black, warm
        moss: "#0c7a4d", // primary green
        "moss-dark": "#0a5e3c",
        sand: "#efe9df", // subtle surface
        clay: "#b4541f", // warning
        rust: "#b3261e", // revoked / danger
        slatey: "#5b5750", // muted text
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,20,15,0.04), 0 8px 24px -12px rgba(22,20,15,0.12)",
      },
      maxWidth: {
        "6xl": "72rem",
      },
    },
  },
  plugins: [],
};
