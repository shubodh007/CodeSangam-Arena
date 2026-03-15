import { useRef, useEffect } from "react";
import { Maximize2, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenLockOverlayProps {
  warnings: number;
  warningLimit: number;
  lastWarning: string;
  onReenterFullscreen: () => void;
}

export function FullscreenLockOverlay({
  warnings,
  warningLimit,
  lastWarning,
  onReenterFullscreen,
}: FullscreenLockOverlayProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { btnRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md text-center animate-fade-in p-6">
        {/* Lock Icon */}
        <div className="w-20 h-20 rounded-full bg-warning/10 border-2 border-warning/30 flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-warning" />
        </div>

        {/* Warning Count */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
          warnings >= 10 
            ? "bg-destructive/10 border border-destructive/30" 
            : "bg-warning/10 border border-warning/30"
        }`}>
          <AlertTriangle size={16} className={warnings >= 10 ? "text-destructive" : "text-warning"} />
          <span className={`font-bold ${warnings >= 10 ? "text-destructive" : "text-warning"}`}>
            Warning {warnings} / {warningLimit}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Contest Paused</h1>
        <p className="text-muted-foreground mb-2">
          You exited fullscreen mode.
        </p>
        {lastWarning && (
          <p className="text-sm text-warning mb-6">
            Violation: {lastWarning}
          </p>
        )}

        <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-foreground mb-2">Contest is locked</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Editor input is disabled</li>
            <li>• Run & Submit buttons are disabled</li>
            <li>• Timer continues running</li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Re-enter fullscreen to continue your contest. Your warning count will not reset.
        </p>

        <Button
          ref={btnRef}
          variant="arena"
          size="lg"
          onClick={onReenterFullscreen}
          className="w-full"
        >
          <Maximize2 size={18} />
          Re-enter Fullscreen
        </Button>

        {warnings >= 12 && (
          <p className="text-xs text-destructive mt-4">
            ⚠️ You are close to disqualification ({warningLimit - warnings} warnings remaining)
          </p>
        )}
      </div>
    </div>
  );
}
