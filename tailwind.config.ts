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
        display: ["Rubik", "system-ui", "sans-serif"],
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
        "bg-elevated": "hsl(var(--bg-elevated))",
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
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "key-glow": {
          "0%, 100%": {
            boxShadow: "0 0 6px hsl(var(--primary-glow) / 0.4), 0 0 12px hsl(var(--primary-glow) / 0.2)",
          },
          "50%": {
            boxShadow: "0 0 14px hsl(var(--primary-glow) / 0.7), 0 0 28px hsl(var(--primary-glow) / 0.35)",
          },
        },
        "submission-success": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)", boxShadow: "0 0 0px hsl(var(--success) / 0)" },
          "60%": { boxShadow: "0 0 25px hsl(var(--success) / 0.3)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)", boxShadow: "0 0 0px hsl(var(--success) / 0)" },
        },
        "submission-error": {
          "0%, 100%": { transform: "translateX(0)" },
          "15%": { transform: "translateX(-8px)" },
          "30%": { transform: "translateX(7px)" },
          "45%": { transform: "translateX(-6px)" },
          "60%": { transform: "translateX(5px)" },
          "75%": { transform: "translateX(-3px)" },
        },
        "rank-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rank-down": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(1deg)" },
        },
        "float-2": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(-1.5deg)" },
        },
        "float-3": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(0.8deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(-50%)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(calc(-50% - 4px))" },
          "20%, 40%, 60%, 80%": { transform: "translateX(calc(-50% + 4px))" },
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
        "fade-out": "fade-out 0.3s ease-in",
        "key-glow": "key-glow 1.8s ease-in-out infinite",
        "submission-success": "submission-success 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "submission-error": "submission-error 0.5s ease-out",
        "rank-up": "rank-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "rank-down": "rank-down 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        float: "float 6s ease-in-out infinite",
        "float-2": "float-2 7s ease-in-out 0.5s infinite",
        "float-3": "float-3 8s ease-in-out 1s infinite",
        shimmer: "shimmer 2s linear infinite",
        shake: "shake 400ms ease-in-out",
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
