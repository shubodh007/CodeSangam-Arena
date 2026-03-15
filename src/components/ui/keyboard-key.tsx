import React from "react";
import { cn } from "@/lib/utils";

export type KeyVariant = "default" | "modifier" | "special" | "action";

interface KeyboardKeyProps {
  children: React.ReactNode;
  className?: string;
  variant?: KeyVariant;
  pressed?: boolean;
  glow?: boolean;
}

// Variant colour tokens (all CSS-transition-able, no 3D)
const variantBase: Record<KeyVariant, string> = {
  default:
    "bg-[hsl(var(--background-secondary))] border-[hsl(var(--border))] text-[hsl(var(--foreground-secondary))]" +
    " hover:border-[hsl(var(--primary)/0.5)] hover:text-[hsl(var(--foreground))]" +
    " hover:shadow-[0_0_10px_hsl(var(--primary-glow)/0.35),0_0_20px_hsl(var(--primary-glow)/0.15)]",
  modifier:
    "bg-[hsl(var(--primary)/0.08)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]" +
    " hover:border-[hsl(var(--primary)/0.6)] hover:bg-[hsl(var(--primary)/0.15)]" +
    " hover:shadow-[0_0_10px_hsl(var(--primary)/0.4),0_0_22px_hsl(var(--primary)/0.2)]",
  special:
    "bg-[hsl(var(--accent)/0.08)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]" +
    " hover:border-[hsl(var(--accent)/0.6)] hover:bg-[hsl(var(--accent)/0.15)]" +
    " hover:shadow-[0_0_10px_hsl(var(--accent)/0.4),0_0_22px_hsl(var(--accent)/0.18)]",
  action:
    "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]" +
    " hover:border-[hsl(var(--success)/0.6)] hover:bg-[hsl(var(--success)/0.15)]" +
    " hover:shadow-[0_0_10px_hsl(var(--success)/0.4),0_0_22px_hsl(var(--success)/0.18)]",
};

const pressedBase: Record<KeyVariant, string> = {
  default: "shadow-[0_0_14px_hsl(var(--primary-glow)/0.55)] border-[hsl(var(--primary)/0.7)] scale-95",
  modifier: "shadow-[0_0_14px_hsl(var(--primary)/0.65)] border-[hsl(var(--primary)/0.8)] scale-95",
  special:  "shadow-[0_0_14px_hsl(var(--accent)/0.65)] border-[hsl(var(--accent)/0.8)] scale-95",
  action:   "shadow-[0_0_14px_hsl(var(--success)/0.65)] border-[hsl(var(--success)/0.8)] scale-95",
};

const MODIFIERS = new Set(["Ctrl", "Alt", "Shift", "Cmd", "Meta", "Win"]);
const SPECIALS  = new Set(["Enter", "Esc", "Tab", "Space", "Backspace", "Delete", "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]);
const ACTIONS   = new Set(["R", "S", "K", "L", "P", "Z", "Y", "/"]);

/** Pick the right variant automatically when not overridden */
export function inferVariant(key: string): KeyVariant {
  if (MODIFIERS.has(key)) return "modifier";
  if (SPECIALS.has(key))  return "special";
  if (ACTIONS.has(key))   return "action";
  return "default";
}

export function KeyboardKey({
  children,
  className,
  variant,
  pressed = false,
  glow = true,
}: KeyboardKeyProps) {
  const v: KeyVariant = variant ?? inferVariant(String(children));

  return (
    <kbd
      className={cn(
        // Layout
        "relative inline-flex items-center justify-center",
        "min-w-[2.25rem] h-8 px-2.5 rounded-md",
        // Typography
        "font-mono font-semibold text-xs",
        // Structure — key-cap shadow via bottom border
        "border-2",
        "shadow-[0_3px_0_0_hsl(var(--border-subtle))]",
        // Interaction
        "cursor-default select-none",
        "transition-all duration-150 ease-out",
        "hover:-translate-y-px",
        "active:translate-y-px active:shadow-none",
        // Colour variant
        variantBase[v],
        // Pressed feedback
        pressed && pressedBase[v],
        // Glow disable
        !glow && "hover:shadow-none",
        className
      )}
    >
      {children}
    </kbd>
  );
}

// ── Key combination ─────────────────────────────────────────────────────────
interface KeyComboProps {
  keys: string[];
  className?: string;
  pressed?: boolean;
}

export function KeyCombo({ keys, className, pressed = false }: KeyComboProps) {
  return (
    <ol className={cn("flex items-center gap-1", className)}>
      {keys.map((key, idx) => (
        <React.Fragment key={`${key}-${idx}`}>
          <li>
            <KeyboardKey
              variant={inferVariant(key)}
              pressed={pressed}
            >
              {key}
            </KeyboardKey>
          </li>
          {idx < keys.length - 1 && (
            <li
              aria-hidden
              className="text-[hsl(var(--foreground-muted))] text-[10px] font-bold"
            >
              +
            </li>
          )}
        </React.Fragment>
      ))}
    </ol>
  );
}

/** Parse "Ctrl+Enter" → ["Ctrl", "Enter"] */
export function parseKeysForDisplay(keyString: string): string[] {
  return keyString.split("+").map((k) => {
    // Friendly display names
    const map: Record<string, string> = {
      ctrl: "Ctrl",
      alt: "Alt",
      shift: "Shift",
      meta: "Cmd",
      cmd: "Cmd",
      enter: "Enter",
      esc: "Esc",
      escape: "Esc",
      space: "Space",
      tab: "Tab",
      backspace: "Bksp",
      delete: "Del",
    };
    const lower = k.toLowerCase();
    return map[lower] ?? k.toUpperCase();
  });
}
