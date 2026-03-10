import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        "border-active": "hsl(var(--border-active))",
        input: "hsl(var(--input))",
        "input-focus": "hsl(var(--input-focus))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          secondary: "hsl(var(--background-secondary))",
          tertiary: "hsl(var(--background-tertiary))",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--foreground-secondary))",
          muted: "hsl(var(--foreground-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover: "hsl(var(--card-hover))",
        },
        editor: {
          bg: "hsl(var(--editor-bg))",
          gutter: "hsl(var(--editor-gutter))",
          lineActive: "hsl(var(--editor-line-active))",
          selection: "hsl(var(--editor-selection))",
        },
        console: {
          bg: "hsl(var(--console-bg))",
          border: "hsl(var(--console-border))",
        },
        timer: {
          normal: "hsl(var(--timer-normal))",
          warning: "hsl(var(--timer-warning))",
          critical: "hsl(var(--timer-critical))",
        },
        rank: {
          gold: "hsl(var(--rank-gold))",
          silver: "hsl(var(--rank-silver))",
          bronze: "hsl(var(--rank-bronze))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary-glow) / 0.15)" },
          "50%": { boxShadow: "0 0 35px hsl(var(--primary-glow) / 0.3)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "orb-float-1": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(30px, -20px)" },
          "66%": { transform: "translate(-20px, 15px)" },
        },
        "orb-float-2": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(-25px, 20px)" },
          "66%": { transform: "translate(20px, -30px)" },
        },
        "orb-float-3": {
          "0%, 100%": { transform: "translate(-50%, -50%)" },
          "50%": { transform: "translate(-50%, calc(-50% + 20px))" },
        },
        "status-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 25s ease-in-out infinite",
        "orb-float-1": "orb-float-1 35s ease-in-out infinite",
        "orb-float-2": "orb-float-2 40s ease-in-out infinite",
        "orb-float-3": "orb-float-3 30s ease-in-out infinite",
        "status-pulse": "status-pulse 2s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 15px hsl(var(--primary-glow) / 0.12), 0 0 40px hsl(var(--primary-glow) / 0.06)",
        "glow-accent": "0 0 15px hsl(var(--accent) / 0.12), 0 0 40px hsl(var(--accent) / 0.06)",
        "glow-intense": "0 0 20px hsl(var(--primary-glow) / 0.2), 0 0 60px hsl(var(--primary-glow) / 0.1)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 8px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 10px -4px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
