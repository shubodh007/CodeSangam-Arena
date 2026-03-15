import { useEffect, useRef, useState } from "react";
import { useKeyboardStore } from "@/store/keyboardStore";
import { KeyboardKey } from "@/components/ui/keyboard-key";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Auto-dismiss delay (ms)
const DISMISS_DELAY = 2800;
// Exit animation duration (must match CSS)
const EXIT_DURATION = 250;

export function KeyPressIndicator() {
  const { lastPressedKeys, clearKeyHistory } = useKeyboardStore();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (exitTimer.current)    clearTimeout(exitTimer.current);

    dismissTimer.current = setTimeout(() => {
      setLeaving(true);
      exitTimer.current = setTimeout(() => {
        setVisible(false);
        setLeaving(false);
      }, EXIT_DURATION);
    }, DISMISS_DELAY);
  };

  useEffect(() => {
    if (lastPressedKeys.length === 0) return;
    setLeaving(false);
    setVisible(true);
    scheduleHide();
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (exitTimer.current)    clearTimeout(exitTimer.current);
    };
  }, [lastPressedKeys]);

  const handleClose = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (exitTimer.current)    clearTimeout(exitTimer.current);
    setLeaving(true);
    exitTimer.current = setTimeout(() => {
      setVisible(false);
      setLeaving(false);
      clearKeyHistory();
    }, EXIT_DURATION);
  };

  if (!visible || lastPressedKeys.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Recently pressed keys"
      className={cn(
        "fixed bottom-5 right-5 z-50",
        "select-none pointer-events-auto",
        leaving ? "animate-[fade-out_250ms_ease-in_both]" : "animate-[slide-up_250ms_ease-out_both]",
      )}
    >
      <div
        className="relative rounded-2xl overflow-hidden px-4 py-3"
        style={{
          background: "rgba(8, 8, 18, 0.90)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), " +
            "0 0 24px rgba(139, 92, 246, 0.2), " +
            "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Subtle top gradient line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)",
          }}
        />

        <div className="flex items-center gap-2">
          {/* Label */}
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest mr-1">
            Keys
          </span>

          {/* Key caps — most recent first, fade out older ones */}
          <ol className="flex items-center gap-1.5">
            {lastPressedKeys.slice(0, 5).map((key, i) => (
              <li
                key={`${key}-${i}`}
                style={{
                  animation: `slide-up 0.2s ease-out ${i * 40}ms both`,
                  opacity: Math.max(1 - i * 0.22, 0.3),
                  transform: `scale(${1 - i * 0.04})`,
                }}
              >
                <KeyboardKey
                  glow={i === 0}
                  className={cn(
                    "min-w-0 h-7 px-2 text-[10px]",
                    i === 0 && "text-white border-[hsl(var(--primary)/0.55)]"
                  )}
                >
                  {key}
                </KeyboardKey>
              </li>
            ))}
          </ol>

          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Dismiss"
            className={cn(
              "ml-1 w-5 h-5 rounded-md flex items-center justify-center",
              "text-white/25 hover:text-white/60",
              "hover:bg-white/[0.06]",
              "transition-colors duration-150",
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
