import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        "ok-soft": "rgb(var(--ok-soft) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        "warn-soft": "rgb(var(--warn-soft) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        "bad-soft": "rgb(var(--bad-soft) / <alpha-value>)",
        neutral: "rgb(var(--neutral) / <alpha-value>)",
        "neutral-soft": "rgb(var(--neutral-soft) / <alpha-value>)",
        // Centinela v2: tokens aditivos con prefijo (viven bajo la clase .v2)
        "v2-bg": "rgb(var(--v2-bg) / <alpha-value>)",
        "v2-s1": "rgb(var(--v2-s1) / <alpha-value>)",
        "v2-s2": "rgb(var(--v2-s2) / <alpha-value>)",
        "v2-line": "rgb(var(--v2-line) / <alpha-value>)",
        "v2-line2": "rgb(var(--v2-line2) / <alpha-value>)",
        "v2-ink": "rgb(var(--v2-ink) / <alpha-value>)",
        "v2-ink2": "rgb(var(--v2-ink2) / <alpha-value>)",
        "v2-ink3": "rgb(var(--v2-ink3) / <alpha-value>)",
        "v2-acc": "rgb(var(--v2-acc) / <alpha-value>)",
        "v2-ok": "rgb(var(--v2-ok) / <alpha-value>)",
        "v2-warn": "rgb(var(--v2-warn) / <alpha-value>)",
        "v2-bad": "rgb(var(--v2-bad) / <alpha-value>)",
        "v2-d1": "rgb(var(--v2-d1) / <alpha-value>)",
        "v2-d2": "rgb(var(--v2-d2) / <alpha-value>)",
        "v2-d3": "rgb(var(--v2-d3) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        plex: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
} satisfies Config;
