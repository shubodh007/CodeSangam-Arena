import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ViolationWarningProps {
  /** The reason string of the most recent violation (empty string = none). */
  lastViolationReason: string;
}

/**
 * Transient violation banner shown at the top of the screen whenever
 * a new anti-cheat violation fires.  Does not duplicate the persistent
 * warning counter already shown in the ProblemSolver header.
 *
 * No framer-motion — uses Tailwind CSS animations only.
 */
export function ViolationWarning({ lastViolationReason }: ViolationWarningProps) {
  const [visible, setVisible] = useState(false);
  const [displayedReason, setDisplayedReason] = useState("");

  useEffect(() => {
    if (!lastViolationReason) return;

    setDisplayedReason(lastViolationReason);
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [lastViolationReason]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm pointer-events-none animate-shake"
    >
      <div className="mx-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 backdrop-blur-sm px-4 py-3 shadow-lg">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0 text-destructive animate-pulse"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">
            ⚠️ Anti-Cheat Warning
          </p>
          <p className="mt-0.5 text-xs text-destructive/80 leading-snug">
            {displayedReason}
          </p>
        </div>
      </div>
    </div>
  );
}
