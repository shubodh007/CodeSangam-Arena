import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AntiCheatConfig {
  sessionId: string;
  onDisqualified: () => void;
  onWarning: (count: number, reason: string) => void;
  enabled?: boolean;
}

interface AntiCheatState {
  warnings: number;
  isDisqualified: boolean;
  isFullscreen: boolean;
}

const WARNING_LIMIT = 15;

export function useAntiCheat({
  sessionId,
  onDisqualified,
  onWarning,
  enabled = true,
}: AntiCheatConfig) {
  const { toast } = useToast();
  const [state, setState] = useState<AntiCheatState>({
    warnings: 0,
    isDisqualified: false,
    isFullscreen: false,
  });
  
  const lastViolationTime = useRef<number>(0);
  const devToolsOpen = useRef<boolean>(false);
  const initialWindowSize = useRef({ width: window.outerWidth, height: window.outerHeight });

  // Fetch current warning count from server
  const fetchWarnings = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from("student_sessions")
      .select("warnings, is_disqualified")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Failed to fetch warnings:", error);
      return;
    }

    if (data) {
      setState((prev) => ({
        ...prev,
        warnings: data.warnings,
        isDisqualified: data.is_disqualified,
      }));

      if (data.is_disqualified) {
        onDisqualified();
      }
    }
  }, [sessionId, onDisqualified]);

  // Report violation to server
  const reportViolation = useCallback(
    async (reason: string) => {
      if (!sessionId || !enabled) return;

      // Debounce violations (min 1 second between reports)
      const now = Date.now();
      if (now - lastViolationTime.current < 1000) return;
      lastViolationTime.current = now;

      try {
        // Fetch current state from server
        const { data: session, error: fetchError } = await supabase
          .from("student_sessions")
          .select("warnings, is_disqualified")
          .eq("id", sessionId)
          .single();

        if (fetchError || !session) return;

        // Already disqualified
        if (session.is_disqualified) {
          onDisqualified();
          return;
        }

        const newWarnings = session.warnings + 1;
        const shouldDisqualify = newWarnings >= WARNING_LIMIT;

        // Update server
        const { error: updateError } = await supabase
          .from("student_sessions")
          .update({
            warnings: newWarnings,
            is_disqualified: shouldDisqualify,
            ...(shouldDisqualify && { ended_at: new Date().toISOString() }),
          })
          .eq("id", sessionId);

        if (updateError) {
          console.error("Failed to update warnings:", updateError);
          return;
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          warnings: newWarnings,
          isDisqualified: shouldDisqualify,
        }));

        // Notify UI
        onWarning(newWarnings, reason);

        if (shouldDisqualify) {
          onDisqualified();
        }
      } catch (err) {
        console.error("Error reporting violation:", err);
      }
    },
    [sessionId, enabled, onDisqualified, onWarning]
  );

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  }, []);

  // Check if in fullscreen
  const checkFullscreen = useCallback(() => {
    const isFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );
    setState((prev) => ({ ...prev, isFullscreen: isFs }));
    return isFs;
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!enabled) return;

    // Fetch initial warnings
    fetchWarnings();

    // Fullscreen change
    const handleFullscreenChange = () => {
      const isFs = checkFullscreen();
      if (!isFs) {
        reportViolation("Exited fullscreen mode");
      }
    };

    // Visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation("Tab switch or window minimized");
      }
    };

    // Before unload (refresh/close)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      reportViolation("Page refresh or close attempt");
      e.preventDefault();
      e.returnValue = "You are in an active contest. Leaving will count as a violation.";
      return e.returnValue;
    };

    // Keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      // Copy/Cut/Paste
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        // Allow in code editor (check if target is in monaco editor)
        const target = e.target as HTMLElement;
        if (!target.closest(".monaco-editor")) {
          e.preventDefault();
          reportViolation(`Keyboard ${e.key.toUpperCase()} detected outside editor`);
        }
      }

      // DevTools shortcuts
      if (e.key === "F12" || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        reportViolation("DevTools shortcut detected");
      }

      // Refresh
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        reportViolation("Refresh attempt detected");
      }
    };

    // Context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".monaco-editor")) {
        e.preventDefault();
        reportViolation("Right-click detected");
      }
    };

    // Window resize (split screen detection)
    const handleResize = () => {
      const widthDelta = Math.abs(window.outerWidth - initialWindowSize.current.width);
      const heightDelta = Math.abs(window.outerHeight - initialWindowSize.current.height);
      
      // Significant resize might indicate split screen
      if (widthDelta > 100 || heightDelta > 100) {
        // Don't report if just entering/exiting fullscreen
        if (checkFullscreen()) return;
        reportViolation("Window resize detected (possible split-screen)");
        initialWindowSize.current = { width: window.outerWidth, height: window.outerHeight };
      }
    };

    // DevTools detection via window size
    const devToolsChecker = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if ((widthThreshold || heightThreshold) && !devToolsOpen.current) {
        devToolsOpen.current = true;
        reportViolation("DevTools opened");
      } else if (!widthThreshold && !heightThreshold) {
        devToolsOpen.current = false;
      }
    }, 1000);

    // Copy/Cut/Paste events
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".monaco-editor")) {
        e.preventDefault();
        reportViolation("Copy attempt detected");
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".monaco-editor")) {
        e.preventDefault();
        reportViolation("Paste attempt detected");
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".monaco-editor")) {
        e.preventDefault();
        reportViolation("Cut attempt detected");
      }
    };

    // Add listeners
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("resize", handleResize);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);

    // Cleanup
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      clearInterval(devToolsChecker);
    };
  }, [enabled, fetchWarnings, reportViolation, checkFullscreen]);

  return {
    warnings: state.warnings,
    isDisqualified: state.isDisqualified,
    isFullscreen: state.isFullscreen,
    requestFullscreen,
    fetchWarnings,
    warningLimit: WARNING_LIMIT,
  };
}
