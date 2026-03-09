import { cn } from "@/lib/utils";
import { Medal, Clock, Sparkles } from "lucide-react";
import { AnimatedScore } from "./AnimatedScore";
import { RankChangeIndicator } from "./RankChangeIndicator";
import { Progress } from "@/components/ui/progress";
import type { LeaderboardEntry, RankChange } from "@/hooks/useLeaderboard";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  change?: RankChange;
  isCurrentUser: boolean;
  isRecentlyUpdated: boolean;
  isNewTopTen: boolean;
  maxScore: number;
  contestStartTime?: string;
}

export function LeaderboardRow({
  entry,
  change,
  isCurrentUser,
  isRecentlyUpdated,
  isNewTopTen,
  maxScore,
}: LeaderboardRowProps) {
  const progressPercent = maxScore > 0 ? Math.round((entry.total_score / maxScore) * 100) : 0;

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-mono text-muted-foreground font-bold">{rank}</span>;
  };

  const isTopThree = entry.rank <= 3 && entry.problems_solved > 0;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-500",
        // Base styles
        "bg-card border-border",
        // Top 3 gradient backgrounds
        isTopThree && entry.rank === 1 && "bg-gradient-to-r from-rank-gold/10 via-card to-card border-rank-gold/30",
        isTopThree && entry.rank === 2 && "bg-gradient-to-r from-rank-silver/10 via-card to-card border-rank-silver/30",
        isTopThree && entry.rank === 3 && "bg-gradient-to-r from-rank-bronze/10 via-card to-card border-rank-bronze/30",
        // Current user highlight
        isCurrentUser && "ring-2 ring-primary/40 border-primary/30 bg-primary/5",
        // Recently updated glow
        isRecentlyUpdated && "leaderboard-row-glow",
        // Hover
        "hover:bg-card-hover hover:border-border-active"
      )}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background-secondary shrink-0">
        {getRankDisplay(entry.rank)}
      </div>

      {/* Rank change indicator */}
      <div className="w-8 shrink-0">
        <RankChangeIndicator change={change} />
      </div>

      {/* Username + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-semibold truncate",
            isCurrentUser ? "text-primary" : "text-foreground"
          )}>
            {entry.username}
          </span>
          {isCurrentUser && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase">
              You
            </span>
          )}
          {isNewTopTen && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent uppercase animate-fade-in">
              <Sparkles size={10} />
              NEW
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-1 flex items-center gap-2">
          <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[120px]" />
          <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0 w-20">
        <div className="flex items-center justify-end gap-1">
          <AnimatedScore
            value={entry.total_score}
            className={cn(
              "font-bold text-lg",
              isRecentlyUpdated && change && change.scoreDelta > 0
                ? "text-success"
                : "text-primary"
            )}
          />
        </div>
        {change && change.scoreDelta > 0 && isRecentlyUpdated && (
          <span className="text-[10px] text-success font-medium animate-fade-in">
            +{change.scoreDelta}
          </span>
        )}
      </div>

      {/* Solved */}
      <div className="text-center shrink-0 w-14">
        <p className="text-sm font-medium text-foreground">{entry.problems_solved}</p>
        <p className="text-[10px] text-muted-foreground">solved</p>
      </div>

      {/* Time */}
      <div className="text-center shrink-0 w-20 hidden sm:block">
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          <Clock size={10} />
          <span className="text-xs">{formatTime(entry.total_time_seconds)}</span>
        </div>
      </div>
    </div>
  );
}
