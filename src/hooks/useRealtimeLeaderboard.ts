/**
 * useRealtimeLeaderboard
 *
 * Replaces the polling-based useLeaderboard hook with a pure
 * event-driven implementation:
 *
 *  1. Fetches initial data from leaderboard_view / admin_leaderboard_view.
 *  2. Subscribes to leaderboard_events filtered by contest_id — Supabase
 *     Realtime delivers only events for THIS contest, eliminating the
 *     cross-contest noise of the old approach.
 *  3. On each event, re-fetches the view (cheap read) and pushes results
 *     into the Zustand store so every subscriber stays in sync.
 *  4. A 60-second fallback poll acts as a safety net for any missed events
 *     during brief network drops (configurable / disable-able).
 *  5. Exponential back-off reconnects the channel after failures.
 *  6. Proper cleanup on unmount — no memory leaks, no dangling channels.
 */

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  useLeaderboardStore,
  useContestLeaderboard,
  type LeaderboardEntry,
  type AdminLeaderboardEntry,
} from "@/store/leaderboardStore";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UseRealtimeLeaderboardOptions {
  contestId: string;
  /** Highlight the current user's row. */
  currentUsername?: string;
  /** Query admin_leaderboard_view instead of leaderboard_view. */
  isAdmin?: boolean;
  /** Mount / unmount the hook. Defaults to true. */
  enabled?: boolean;
  /**
   * Safety-net polling interval in ms.
   * Set to 0 to disable (not recommended — Realtime can miss events).
   * Defaults to 60 000 (1 min).
   */
  fallbackPollMs?: number;
}

interface UseRealtimeLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  adminLeaderboard: AdminLeaderboardEntry[];
  loading: boolean;
  isRefreshing: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  lastUpdated: Date | null;
  rankChanges: Map<string, import("@/store/leaderboardStore").RankChange>;
  recentlyUpdated: Set<string>;
  newTopTen: Set<string>;
  /** Entry for the current user (student view). */
  currentUserEntry: LeaderboardEntry | undefined;
  /** Highest score among all entries — useful for progress-bar normalisation. */
  maxScore: number;
  manualRefresh(): void;
  getTimeSinceUpdate(): string;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useRealtimeLeaderboard({
  contestId,
  currentUsername,
  isAdmin = false,
  enabled = true,
  fallbackPollMs = 60_000,
}: UseRealtimeLeaderboardOptions): UseRealtimeLeaderboardReturn {
  // Zustand actions
  const {
    applyEntries,
    applyAdminEntries,
    setConnectionStatus,
    setLoading,
    setRefreshing,
    clearContest,
  } = useLeaderboardStore();

  // Reactive slice for this contest
  const state = useContestLeaderboard(contestId);

  // Internal refs (don't need re-render)
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);

  // ───────────────────────────────────────────
  // Data fetcher
  // ───────────────────────────────────────────

  const fetchLeaderboard = useCallback(
    async (silent = true) => {
      if (!contestId || !enabled || !mountedRef.current) return;

      if (!silent) setRefreshing(contestId, true);

      try {
        const view = isAdmin ? "admin_leaderboard_view" : "leaderboard_view";

        const { data, error } = await supabase
          .from(view)
          .select("*")
          .eq("contest_id", contestId)
          .order("rank", { ascending: true });

        if (error) throw error;
        if (!mountedRef.current) return;

        if (isAdmin) {
          const entries: AdminLeaderboardEntry[] = (data ?? []).map((d) => ({
            session_id: d.session_id ?? "",
            contest_id: d.contest_id ?? "",
            username: d.username ?? "",
            total_score: d.total_score ?? 0,
            problems_solved: d.problems_solved ?? 0,
            wrong_attempts: d.wrong_attempts ?? 0,
            total_time_seconds: d.total_time_seconds ?? 0,
            last_accepted_at: d.last_accepted_at ?? null,
            rank: d.rank ?? 0,
            is_disqualified: d.is_disqualified ?? false,
            warnings: d.warnings ?? 0,
            execution_count: d.execution_count ?? 0,
            problems_partially_solved: d.problems_partially_solved ?? 0,
          }));
          applyAdminEntries(contestId, entries);
        } else {
          const entries: LeaderboardEntry[] = (data ?? []).map((d) => ({
            session_id: d.session_id ?? "",
            contest_id: d.contest_id ?? "",
            username: d.username ?? "",
            total_score: d.total_score ?? 0,
            problems_solved: d.problems_solved ?? 0,
            wrong_attempts: d.wrong_attempts ?? 0,
            total_time_seconds: d.total_time_seconds ?? 0,
            last_accepted_at: d.last_accepted_at ?? null,
            rank: d.rank ?? 0,
          }));
          applyEntries(contestId, entries);
        }

        setConnectionStatus(contestId, "connected");
        retryCountRef.current = 0;
      } catch (err) {
        console.error("[useRealtimeLeaderboard] fetch error:", err);
        if (!mountedRef.current) return;

        retryCountRef.current += 1;
        const status = retryCountRef.current >= 5 ? "disconnected" : "reconnecting";
        setConnectionStatus(contestId, status);
        setRefreshing(contestId, false);
        setLoading(contestId, false);

        // Exponential back-off retry (only on hard errors, not on event trigger)
        if (silent && retryCountRef.current < 5) {
          const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
          retryTimerRef.current = setTimeout(() => fetchLeaderboard(true), delay);
        }
      }
    },
    [contestId, enabled, isAdmin, applyEntries, applyAdminEntries, setConnectionStatus, setLoading, setRefreshing]
  );

  // ───────────────────────────────────────────
  // Realtime channel
  // ───────────────────────────────────────────

  const setupChannel = useCallback(() => {
    if (!contestId || !enabled) return;

    // Tear down any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`leaderboard-events:${contestId}`, {
        config: { broadcast: { self: false } },
      })
      // ── Only events for THIS contest (filtered server-side) ──────────
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leaderboard_events",
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          const { event_type, data: eventData } = payload.new as {
            event_type: string;
            data: Record<string, unknown>;
          };

          // Show disqualification toast to admins immediately
          if (event_type === "disqualification" && isAdmin) {
            toast.error(`${eventData.username} has been disqualified`, {
              description: "Leaderboard will update momentarily.",
              duration: 5000,
            });
          }

          // Re-fetch leaderboard data on every relevant event
          fetchLeaderboard(true);
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;

        if (status === "SUBSCRIBED") {
          setConnectionStatus(contestId, "connected");
          retryCountRef.current = 0;
        } else if (status === "CLOSED") {
          setConnectionStatus(contestId, "reconnecting");
          scheduleChannelReconnect();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus(contestId, "reconnecting");
          scheduleChannelReconnect();
        }
      });

    channelRef.current = channel;
  }, [contestId, enabled, isAdmin, fetchLeaderboard, setConnectionStatus]);

  // Reconnect with back-off
  const scheduleChannelReconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
    retryTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      retryCountRef.current += 1;
      setupChannel();
    }, delay);
  }, [setupChannel]);

  // ───────────────────────────────────────────
  // Initial load + effects
  // ───────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !contestId) return;

    mountedRef.current = true;
    setLoading(contestId, true);

    // 1. Initial fetch
    fetchLeaderboard(false);

    // 2. Realtime subscription
    setupChannel();

    // 3. Safety-net fallback poll
    if (fallbackPollMs > 0) {
      fallbackTimerRef.current = setInterval(() => {
        fetchLeaderboard(true);
      }, fallbackPollMs);
    }

    return () => {
      mountedRef.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);

      // Leave Zustand state so that navigating back is instant (stale-while-revalidate)
      // Call clearContest() only if you want a clean slate on every mount.
    };
    // setupChannel is stable but we intentionally omit it from deps to avoid
    // re-running this effect when the channel reference re-creates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, enabled, fallbackPollMs, fetchLeaderboard]);

  // ───────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────

  const manualRefresh = useCallback(() => {
    if (!state.isRefreshing) fetchLeaderboard(false);
  }, [state.isRefreshing, fetchLeaderboard]);

  const getTimeSinceUpdate = useCallback((): string => {
    if (!state.lastUpdated) return "—";
    const secs = Math.floor((Date.now() - state.lastUpdated.getTime()) / 1000);
    if (secs < 5) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }, [state.lastUpdated]);

  const currentUserEntry = state.entries.find((e) => e.username === currentUsername);
  const maxScore = state.entries.length > 0
    ? Math.max(...state.entries.map((e) => e.total_score), 1)
    : 1;

  return {
    leaderboard: state.entries,
    adminLeaderboard: state.adminEntries,
    loading: state.loading,
    isRefreshing: state.isRefreshing,
    connectionStatus: state.connectionStatus,
    lastUpdated: state.lastUpdated,
    rankChanges: state.rankChanges,
    recentlyUpdated: state.recentlyUpdated,
    newTopTen: state.newTopTen,
    currentUserEntry,
    maxScore,
    manualRefresh,
    getTimeSinceUpdate,
  };
}
