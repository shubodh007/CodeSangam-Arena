import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { Users, Trophy, Zap } from "lucide-react";
import { AnimatedScore } from "./AnimatedScore";
import type { LeaderboardEntry } from "@/hooks/useLeaderboard";

interface LeaderboardStatsProps {
  leaderboard: LeaderboardEntry[];
}

export function LeaderboardStats({ leaderboard }: LeaderboardStatsProps) {
  const totalParticipants = leaderboard.length;
  const withSolved = leaderboard.filter((e) => e.problems_solved > 0).length;
  const topScore = leaderboard.length > 0 ? leaderboard[0]?.total_score || 0 : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <ArenaCard>
        <ArenaCardContent className="flex items-center gap-3 py-3 px-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">
              <AnimatedScore value={totalParticipants} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Participants</p>
          </div>
        </ArenaCardContent>
      </ArenaCard>

      <ArenaCard>
        <ArenaCardContent className="flex items-center gap-3 py-3 px-4">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">
              <AnimatedScore value={withSolved} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scored</p>
          </div>
        </ArenaCardContent>
      </ArenaCard>

      <ArenaCard>
        <ArenaCardContent className="flex items-center gap-3 py-3 px-4">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">
              <AnimatedScore value={topScore} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Top Score</p>
          </div>
        </ArenaCardContent>
      </ArenaCard>
    </div>
  );
}
