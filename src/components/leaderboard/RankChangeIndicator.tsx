import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import type { RankChange } from "@/hooks/useLeaderboard";

interface RankChangeIndicatorProps {
  change: RankChange | undefined;
  className?: string;
}

export function RankChangeIndicator({ change, className }: RankChangeIndicatorProps) {
  if (!change || change.direction === "same") {
    return (
      <span className={cn("inline-flex items-center text-muted-foreground", className)}>
        <Minus size={12} />
      </span>
    );
  }

  if (change.direction === "new") {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-accent animate-fade-in", className)}>
        <Sparkles size={12} />
        <span className="text-[10px] font-bold">NEW</span>
      </span>
    );
  }

  if (change.direction === "up") {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-success", className)}>
        <TrendingUp size={12} />
        <span className="text-[10px] font-bold">
          +{change.previousRank - (change.previousRank - Math.abs(change.previousRank))}
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-destructive", className)}>
      <TrendingDown size={12} />
    </span>
  );
}
