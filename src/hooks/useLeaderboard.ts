import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  session_id: string;
  contest_id: string;
  username: string;
  total_score: number;
  problems_solved: number;
  wrong_attempts: number;
  total_time_seconds: number;
  last_accepted_at: string | null;
  rank: number;
}

export interface RankChange {
  previousRank: number;
  previousScore: number;
  direction: "up" | "down" | "same" | "new";
  scoreDelta: number;
}

interface UseLeaderboardOptions {
  contestId: string;
  currentUsername?: string;
  pollIntervalMs?: number;
  enabled?: boolean;
}

export function useLeaderboard({
  contestId,
  currentUsername,
  pollIntervalMs = 7000,
  enabled = true,
}: UseLeaderboardOptions) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected");
  const [rankChanges, setRankChanges] = useState<Map<string, RankChange>>(new Map());
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [newTopTen, setNewTopTen] = useState<Set<string>>(new Set());

  const previousDataRef = useRef<Map<string, LeaderboardEntry>>(new Map());
  const previousTopTenRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!contestId || !enabled) return;

    if (!silent) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from("leaderboard_view")
        .select("*")
        .eq("contest_id", contestId)
        .order("rank", { ascending: true });

      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((d) => ({
        session_id: d.session_id || "",
        contest_id: d.contest_id || "",
        username: d.username || "",
        total_score: d.total_score || 0,
        problems_solved: d.problems_solved || 0,
        wrong_attempts: d.wrong_attempts || 0,
        total_time_seconds: d.total_time_seconds || 0,
        last_accepted_at: d.last_accepted_at,
        rank: d.rank || 0,
      }));

      // Compute rank changes
      const prevMap = previousDataRef.current;
      const changes = new Map<string, RankChange>();
      const updated = new Set<string>();
      const currentTopTen = new Set(entries.filter((e) => e.rank <= 10).map((e) => e.session_id));
      const newTop = new Set<string>();

      entries.forEach((entry) => {
        const prev = prevMap.get(entry.session_id);
        if (!prev) {
          changes.set(entry.session_id, {
            previousRank: entry.rank,
            previousScore: 0,
            direction: prevMap.size > 0 ? "new" : "same",
            scoreDelta: 0,
          });
        } else {
          const scoreDelta = entry.total_score - prev.total_score;
          const direction = entry.rank < prev.rank ? "up" : entry.rank > prev.rank ? "down" : "same";

          changes.set(entry.session_id, {
            previousRank: prev.rank,
            previousScore: prev.total_score,
            direction: scoreDelta !== 0 || direction !== "same" ? direction : "same",
            scoreDelta,
          });

          if (scoreDelta !== 0 || entry.rank !== prev.rank) {
            updated.add(entry.session_id);
          }

          // Check new top 10 entries
          if (entry.rank <= 10 && !previousTopTenRef.current.has(entry.session_id) && previousTopTenRef.current.size > 0) {
            newTop.add(entry.session_id);
          }
        }
      });

      // Update refs
      const newPrevMap = new Map<string, LeaderboardEntry>();
      entries.forEach((e) => newPrevMap.set(e.session_id, e));
      previousDataRef.current = newPrevMap;
      previousTopTenRef.current = currentTopTen;

      setRankChanges(changes);
      setRecentlyUpdated(updated);
      setNewTopTen(newTop);
      setLeaderboard(entries);
      setLastUpdated(new Date());
      setConnectionStatus("connected");
      retryCountRef.current = 0;

      // Clear recently updated after animation
      if (updated.size > 0) {
        setTimeout(() => setRecentlyUpdated(new Set()), 3000);
      }
      if (newTop.size > 0) {
        setTimeout(() => setNewTopTen(new Set()), 5000);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      retryCountRef.current++;
      if (retryCountRef.current >= maxRetries) {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus("reconnecting");
        // Exponential backoff retry
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        setTimeout(() => fetchLeaderboard(true), delay);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [contestId, enabled]);

  const manualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    await fetchLeaderboard(false);
  }, [fetchLeaderboard, isRefreshing]);

  // Initial fetch + polling
  useEffect(() => {
    if (!enabled || !contestId) return;

    fetchLeaderboard(false);

    pollTimerRef.current = setInterval(() => {
      fetchLeaderboard(true);
    }, pollIntervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [contestId, enabled, pollIntervalMs, fetchLeaderboard]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!enabled || !contestId) return;

    const channel = supabase
      .channel(`student-leaderboard-${contestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_problem_status" }, () => {
        fetchLeaderboard(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => {
        fetchLeaderboard(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "student_sessions" }, () => {
        fetchLeaderboard(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("reconnecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contestId, enabled, fetchLeaderboard]);

  // Time ago helper
  const getTimeSinceUpdate = useCallback(() => {
    const diffMs = Date.now() - lastUpdated.getTime();
    const secs = Math.floor(diffMs / 1000);
    if (secs < 5) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  }, [lastUpdated]);

  // Current user entry
  const currentUserEntry = leaderboard.find((e) => e.username === currentUsername);

  // Max possible score (estimate from top scorer or problems solved patterns)
  const maxScore = leaderboard.length > 0 ? Math.max(...leaderboard.map((e) => e.total_score), 1) : 1;

  return {
    leaderboard,
    loading,
    isRefreshing,
    lastUpdated,
    connectionStatus,
    rankChanges,
    recentlyUpdated,
    newTopTen,
    currentUserEntry,
    maxScore,
    manualRefresh,
    getTimeSinceUpdate,
  };
}
