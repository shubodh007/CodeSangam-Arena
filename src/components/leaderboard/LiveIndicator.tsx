import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  status: "connected" | "disconnected" | "reconnecting";
  className?: string;
}

export function LiveIndicator({ status, className }: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border",
        status === "connected" && "bg-success/10 border-success/30 text-success",
        status === "reconnecting" && "bg-warning/10 border-warning/30 text-warning",
        status === "disconnected" && "bg-destructive/10 border-destructive/30 text-destructive",
        className
      )}
    >
      <span
        className={cn(
          "relative flex h-2.5 w-2.5",
        )}
      >
        {status === "connected" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full h-2.5 w-2.5",
            status === "connected" && "bg-success",
            status === "reconnecting" && "bg-warning animate-pulse",
            status === "disconnected" && "bg-destructive"
          )}
        />
      </span>
      {status === "connected" && "LIVE"}
      {status === "reconnecting" && "Reconnecting..."}
      {status === "disconnected" && "Offline"}
    </div>
  );
}
