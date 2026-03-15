import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProblemAnalytic {
  problem_id: string;
  problem_title: string;
  total_submissions: number;
  unique_students: number;
  accepted_submissions: number;
  partial_submissions: number;
  failed_submissions: number;
  average_score: number;
  average_attempts: number;
  solve_rate: number;
}

export interface LeaderboardEntry {
  rank: number;
  session_id: string;
  username: string;
  total_score: number;
  problems_solved: number;
  total_time_seconds: number;
  warnings: number;
  wrong_attempts: number;
  is_disqualified: boolean;
}

export interface ContestReportData {
  contest: {
    id: string;
    title: string;
    created_at: string;
    duration_minutes: number;
  };
  statistics: {
    totalParticipants: number;
    activeParticipants: number;
    disqualifiedCount: number;
    averageScore: number;
    medianScore: number;
    completionRate: number;
    totalWarnings: number;
  };
  leaderboard: LeaderboardEntry[];
  problemAnalytics: ProblemAnalytic[];
}

export function useContestReport(contestId: string) {
  return useQuery({
    queryKey: ["contest-report", contestId],
    queryFn: async (): Promise<ContestReportData> => {
      // 1. Contest metadata
      const { data: contest, error: contestErr } = await supabase
        .from("contests")
        .select("id, title, created_at, duration_minutes")
        .eq("id", contestId)
        .single();

      if (contestErr) throw contestErr;

      // 2. Leaderboard (admin view)
      const { data: rawLeaderboard, error: lbErr } = await supabase
        .from("admin_leaderboard_view")
        .select(
          "rank, session_id, username, total_score, problems_solved, total_time_seconds, warnings, wrong_attempts, is_disqualified"
        )
        .eq("contest_id", contestId)
        .order("rank", { ascending: true });

      if (lbErr) throw lbErr;

      const leaderboard: LeaderboardEntry[] = (rawLeaderboard ?? []).map((r) => ({
        rank: r.rank ?? 0,
        session_id: r.session_id ?? "",
        username: r.username ?? "Anonymous",
        total_score: r.total_score ?? 0,
        problems_solved: r.problems_solved ?? 0,
        total_time_seconds: r.total_time_seconds ?? 0,
        warnings: r.warnings ?? 0,
        wrong_attempts: r.wrong_attempts ?? 0,
        is_disqualified: r.is_disqualified ?? false,
      }));

      // 3. Problem analytics via DB function
      const { data: rawProblems, error: problemErr } = await supabase.rpc(
        "get_submission_stats",
        { p_contest_id: contestId }
      );

      if (problemErr) throw problemErr;

      const problemAnalytics: ProblemAnalytic[] = (rawProblems ?? []).map((p) => ({
        problem_id: p.problem_id,
        problem_title: p.problem_title,
        total_submissions: p.total_submissions ?? 0,
        unique_students: p.unique_students ?? 0,
        accepted_submissions: p.accepted_submissions ?? 0,
        partial_submissions: p.partial_submissions ?? 0,
        failed_submissions: p.failed_submissions ?? 0,
        average_score: Math.round(p.average_score ?? 0),
        average_attempts: Math.round(p.average_attempts ?? 0),
        solve_rate:
          p.unique_students > 0
            ? Math.round((p.accepted_submissions / p.unique_students) * 100)
            : 0,
      }));

      // 4. Compute aggregate statistics
      const totalParticipants = leaderboard.length;
      const disqualifiedCount = leaderboard.filter((e) => e.is_disqualified).length;
      const activeParticipants = totalParticipants - disqualifiedCount;
      const totalWarnings = leaderboard.reduce((sum, e) => sum + e.warnings, 0);

      const scores = leaderboard.map((e) => e.total_score).sort((a, b) => a - b);
      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const medianScore =
        scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0;

      const maxProblems = problemAnalytics.length;
      const fullyCompletedCount =
        maxProblems > 0
          ? leaderboard.filter((e) => e.problems_solved === maxProblems).length
          : 0;
      const completionRate =
        totalParticipants > 0
          ? Math.round((fullyCompletedCount / totalParticipants) * 100)
          : 0;

      return {
        contest: {
          id: contest.id,
          title: contest.title,
          created_at: contest.created_at,
          duration_minutes: contest.duration_minutes,
        },
        statistics: {
          totalParticipants,
          activeParticipants,
          disqualifiedCount,
          averageScore,
          medianScore,
          completionRate,
          totalWarnings,
        },
        leaderboard,
        problemAnalytics,
      };
    },
    staleTime: Infinity,
    retry: 1,
  });
}
