import { useEffect, useRef } from "react";
import { useKeyboardStore } from "@/store/keyboardStore";

export interface Shortcut {
  key: string;
  action: () => void;
  description: string;
  enabled?: boolean;
}

interface Options {
  /** When false the entire hook is dormant */
  enabled?: boolean;
  /** Prevent default browser behaviour for matched keys */
  preventDefault?: boolean;
  /**
   * "global" (default) — fires everywhere except plain inputs/textareas.
   * "outside-monaco" — fires everywhere except Monaco editor AND inputs.
   * This hook is NOT used inside Monaco; register those via editor.addCommand.
   */
  context?: "global" | "outside-monaco";
}

/** Normalise a key-combo string into its parts. */
function parseKey(keyString: string) {
  const lower = keyString.toLowerCase();
  const parts = lower.split("+");
  return {
    ctrl: parts.includes("ctrl"),
    alt: parts.includes("alt"),
    meta: parts.includes("meta") || parts.includes("cmd"),
    // Everything after the last modifier is the actual key
    key: parts[parts.length - 1],
  };
}

function matchesKey(event: KeyboardEvent, keyString: string): boolean {
  const parsed = parseKey(keyString);
  return (
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta &&
    event.key.toLowerCase() === parsed.key
  );
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], options: Options = {}) {
  const { enabled = true, preventDefault = true, context = "outside-monaco" } = options;
  const { recordKeyPress } = useKeyboardStore();

  // Keep refs fresh so we never need to re-register the listener
  const shortcutsRef = useRef(shortcuts);
  const recordRef = useRef(recordKeyPress);
  const optionsRef = useRef({ enabled, preventDefault, context });

  // Synchronous updates — safe before the next event fires
  shortcutsRef.current = shortcuts;
  recordRef.current = recordKeyPress;
  optionsRef.current = { enabled, preventDefault, context };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { enabled: isEnabled, preventDefault: pd, context: ctx } = optionsRef.current;
      if (!isEnabled) return;

      const target = event.target as HTMLElement;

      // Always skip plain text inputs / contentEditable
      const isPlainInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isPlainInput) return;

      // Optionally skip Monaco editor focus
      if (ctx === "outside-monaco" && target.closest?.(".monaco-editor")) return;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        if (matchesKey(event, shortcut.key)) {
          if (pd) {
            event.preventDefault();
            event.stopPropagation();
          }
          recordRef.current(shortcut.key);
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []); // single mount/unmount — refs handle fresh values
}
