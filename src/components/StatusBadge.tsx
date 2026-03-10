import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from "lucide-react";

type StatusType = "active" | "inactive" | "accepted" | "pending" | "failed" | "warning" | "disqualified";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  pulse?: boolean;
}

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  active: {
    bg: "bg-success/10 border-success/20",
    text: "text-success",
    icon: CheckCircle2,
  },
  inactive: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    icon: Circle,
  },
  accepted: {
    bg: "bg-success/10 border-success/20",
    text: "text-success",
    icon: CheckCircle2,
  },
  pending: {
    bg: "bg-warning/10 border-warning/20",
    text: "text-warning",
    icon: Clock,
  },
  failed: {
    bg: "bg-destructive/10 border-destructive/20",
    text: "text-destructive",
    icon: XCircle,
  },
  warning: {
    bg: "bg-warning/10 border-warning/20",
    text: "text-warning",
    icon: AlertTriangle,
  },
  disqualified: {
    bg: "bg-destructive/10 border-destructive/20",
    text: "text-destructive",
    icon: XCircle,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "md",
  pulse = false,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        pulse && "animate-status-pulse"
      )}
    >
      {showIcon && <Icon size={size === "sm" ? 12 : 14} />}
      {displayLabel}
    </span>
  );
}
