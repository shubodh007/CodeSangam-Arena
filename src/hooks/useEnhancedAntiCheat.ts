import { useEffect, useRef, useCallback } from "react";
import { getViolationMessage } from "@/lib/antiCheat";

interface EnhancedAntiCheatOptions {
  /**
   * The `reportViolation` callback from `useAntiCheat`.
   * Passing the existing hook's reporter keeps local warning state in sync
   * (counter, toast, disqualification flow) without any duplication.
   */
  reportViolation: (reason: string) => void;
  enabled: boolean;
}

/**
 * Extends the existing `useAntiCheat` hook with additional detection methods:
 *  - Window/application blur (Alt+Tab, Windows key, Cmd+Tab)
 *  - Windows / Meta key presses
 *  - Screenshot key shortcuts (PrintScreen, Cmd+Shift+3/4/5, Alt+PrtSc)
 *  - Virtual desktop switching (Ctrl+Win+Arrow, Win+Tab, Ctrl+Up/Down)
 *  - Mouse leaving the browser window (possible second monitor)
 *
 * Mount this hook alongside `useAntiCheat` in ProblemSolver.
 * The shared `reportViolation` ref ensures both use the same debounce path.
 */
export function useEnhancedAntiCheat({
  reportViolation,
  enabled,
}: EnhancedAntiCheatOptions) {
  // Stable ref so callbacks inside closures always read the latest prop
  const reportRef = useRef(reportViolation);
  reportRef.current = reportViolation;

  const lastBlurTime = useRef<number>(0);

  // ─── Detection 1: Window blur (Alt+Tab / application switch) ───────────────
  const handleWindowBlur = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    // Debounce: ignore if blur fired < 600 ms ago (prevents double-triggers
    // on some browsers where blur + visibilitychange both fire for the same event)
    if (now - lastBlurTime.current < 600) return;
    lastBlurTime.current = now;

    reportRef.current(getViolationMessage("application_switch"));
  }, [enabled]);

  // ─── Detection 2: Window focus return — report extended absences ───────────
  const handleWindowFocus = useCallback(() => {
    if (!enabled || lastBlurTime.current === 0) return;

    const awayMs = Date.now() - lastBlurTime.current;
    if (awayMs > 5000) {
      reportRef.current(getViolationMessage("extended_absence"));
    }
  }, [enabled]);

  // ─── Detection 3 & 4: Meta/Windows key + screenshot shortcuts ──────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Block and warn for Windows/Meta key presses
      if (e.key === "Meta" || e.code === "MetaLeft" || e.code === "MetaRight") {
        e.preventDefault();
        reportRef.current(getViolationMessage("forbidden_key"));
        return;
      }

      // Virtual desktop shortcuts — Ctrl+Win+Arrow (Windows Task View) or Win+Tab
      const isWinTaskView =
        (e.ctrlKey && e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) ||
        (e.metaKey && e.key === "Tab");

      // macOS Mission Control — Ctrl+Up / Ctrl+Down (Exposé)
      const isMacMissionControl =
        e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown");

      if (isWinTaskView || isMacMissionControl) {
        e.preventDefault();
        reportRef.current(getViolationMessage("virtual_desktop_switch"));
        return;
      }

      // Screenshot key combos
      const isScreenshot =
        e.key === "PrintScreen" || // Windows PrtSc
        (e.altKey && e.key === "PrintScreen") || // Windows Alt+PrtSc
        (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)); // macOS Cmd+Shift+3/4/5

      if (isScreenshot) {
        e.preventDefault();
        reportRef.current(getViolationMessage("screenshot_attempt"));
      }
    },
    [enabled]
  );

  // ─── Detection 5: Mouse leaves browser viewport (second monitor) ───────────
  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;

      // Only fire when pointer exits the document completely
      if (
        e.clientY < 0 ||
        e.clientX < 0 ||
        e.clientX > window.innerWidth ||
        e.clientY > window.innerHeight
      ) {
        reportRef.current(getViolationMessage("mouse_left_bounds"));
      }
    },
    [enabled]
  );

  // ─── Mount / unmount all listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [enabled, handleWindowBlur, handleWindowFocus, handleKeyDown, handleMouseLeave]);

  return { isActive: enabled };
}
