import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Displays a rank badge.
 * Ranks 1–3 get medal emojis with accessible aria labels.
 * Rank 4+ displays a plain monospace number.
 */
export function RankBadge({ rank, size = "md", className }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <span
        role="img"
        aria-label="Gold medal rank 1"
        className={cn(size === "md" ? "text-2xl" : "text-lg", className)}
      >
        🥇
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        role="img"
        aria-label="Silver medal rank 2"
        className={cn(size === "md" ? "text-xl" : "text-base", className)}
      >
        🥈
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        role="img"
        aria-label="Bronze medal rank 3"
        className={cn(size === "md" ? "text-xl" : "text-base", className)}
      >
        🥉
      </span>
    );
  }

  return (
    <span
      className={cn(
        "font-mono font-bold text-muted-foreground",
        size === "md" ? "text-base" : "text-sm",
        className,
      )}
    >
      {rank}
    </span>
  );
}
