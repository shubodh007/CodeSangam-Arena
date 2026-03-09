import { cn } from "@/lib/utils";
import { WifiOff, RefreshCw } from "lucide-react";

interface ConnectionBannerProps {
  status: "connected" | "disconnected" | "reconnecting";
}

export function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === "connected") return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border animate-fade-in",
        status === "disconnected" && "bg-destructive/10 border-destructive/20 text-destructive",
        status === "reconnecting" && "bg-warning/10 border-warning/20 text-warning"
      )}
    >
      {status === "disconnected" ? (
        <>
          <WifiOff size={14} />
          <span>Connection lost — showing cached data</span>
        </>
      ) : (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  );
}
