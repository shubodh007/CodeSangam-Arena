/**
 * Leaderboard Zustand store
 *
 * Centralises leaderboard state so multiple components can watch
 * the same data without prop-drilling or redundant fetches.
 *
 * Keyed by contestId so the store is safe when multiple hooks are
 * mounted simultaneously (e.g. embedded widgets, admin overlays).
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ─────────────────────────────────────────────
// Types — mirror existing leaderboard_view columns exactly
// ─────────────────────────────────────────────

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

export interface AdminLeaderboardEntry extends LeaderboardEntry {
  is_disqualified: boolean;
  warnings: number;
  execution_count: number;
  problems_partially_solved: number;
}

export interface RankChange {
  previousRank: number;
  previousScore: number;
  direction: "up" | "down" | "same" | "new";
  scoreDelta: number;
}

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

// ─────────────────────────────────────────────
// Per-contest slice (one instance per contestId)
// ─────────────────────────────────────────────

export interface ContestLeaderboardState {
  entries: LeaderboardEntry[];
  adminEntries: AdminLeaderboardEntry[];
  rankChanges: Map<string, RankChange>;
  recentlyUpdated: Set<string>;
  newTopTen: Set<string>;
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  /** True only during the very first load — subsequent refreshes use isRefreshing */
  loading: boolean;
  isRefreshing: boolean;
}

const EMPTY_CONTEST_STATE: ContestLeaderboardState = {
  entries: [],
  adminEntries: [],
  rankChanges: new Map(),
  recentlyUpdated: new Set(),
  newTopTen: new Set(),
  connectionStatus: "connected",
  lastUpdated: null,
  loading: true,
  isRefreshing: false,
};

// ─────────────────────────────────────────────
// Store actions
// ─────────────────────────────────────────────

interface LeaderboardStoreState {
  contests: Map<string, ContestLeaderboardState>;

  /** Get (or lazily create) the slice for a contestId. */
  getContest(contestId: string): ContestLeaderboardState;

  setEntries(contestId: string, entries: LeaderboardEntry[]): void;
  setAdminEntries(contestId: string, entries: AdminLeaderboardEntry[]): void;
  setConnectionStatus(contestId: string, status: ConnectionStatus): void;
  setLoading(contestId: string, loading: boolean): void;
  setRefreshing(contestId: string, refreshing: boolean): void;

  /** Called after fetching fresh data — computes rank/score diffs. */
  applyEntries(contestId: string, entries: LeaderboardEntry[]): void;
  applyAdminEntries(contestId: string, entries: AdminLeaderboardEntry[]): void;

  clearContest(contestId: string): void;
}

// ─────────────────────────────────────────────
// Diff helpers
// ─────────────────────────────────────────────

function computeDiff(
  prev: Map<string, LeaderboardEntry>,
  next: LeaderboardEntry[]
): {
  rankChanges: Map<string, RankChange>;
  recentlyUpdated: Set<string>;
  newTopTen: Set<string>;
} {
  const rankChanges = new Map<string, RankChange>();
  const recentlyUpdated = new Set<string>();
  const prevTopTenIds = new Set(
    [...prev.values()].filter((e) => e.rank <= 10).map((e) => e.session_id)
  );
  const newTopTen = new Set<string>();

  for (const entry of next) {
    const old = prev.get(entry.session_id);

    if (!old) {
      rankChanges.set(entry.session_id, {
        previousRank: entry.rank,
        previousScore: 0,
        direction: prev.size > 0 ? "new" : "same",
        scoreDelta: 0,
      });
      continue;
    }

    const scoreDelta = entry.total_score - old.total_score;
    const rankDelta = old.rank - entry.rank; // positive = moved up
    const direction: RankChange["direction"] =
      rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : "same";

    rankChanges.set(entry.session_id, {
      previousRank: old.rank,
      previousScore: old.total_score,
      direction: scoreDelta !== 0 || direction !== "same" ? direction : "same",
      scoreDelta,
    });

    if (scoreDelta !== 0 || entry.rank !== old.rank) {
      recentlyUpdated.add(entry.session_id);
    }

    if (entry.rank <= 10 && !prevTopTenIds.has(entry.session_id) && prevTopTenIds.size > 0) {
      newTopTen.add(entry.session_id);
    }
  }

  return { rankChanges, recentlyUpdated, newTopTen };
}

// ─────────────────────────────────────────────
// Store creation
// ─────────────────────────────────────────────

export const useLeaderboardStore = create<LeaderboardStoreState>()(
  subscribeWithSelector((set, get) => ({
    contests: new Map(),

    getContest(contestId) {
      return get().contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
    },

    setEntries(contestId, entries) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, { ...slice, entries });
        return { contests: next };
      });
    },

    setAdminEntries(contestId, entries) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, { ...slice, adminEntries: entries });
        return { contests: next };
      });
    },

    setConnectionStatus(contestId, connectionStatus) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, { ...slice, connectionStatus });
        return { contests: next };
      });
    },

    setLoading(contestId, loading) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, { ...slice, loading });
        return { contests: next };
      });
    },

    setRefreshing(contestId, isRefreshing) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, { ...slice, isRefreshing });
        return { contests: next };
      });
    },

    applyEntries(contestId, entries) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };

        // Build previous map for diff
        const prevMap = new Map<string, LeaderboardEntry>(
          slice.entries.map((e) => [e.session_id, e])
        );

        const { rankChanges, recentlyUpdated, newTopTen } = computeDiff(prevMap, entries);

        const next = new Map(state.contests);
        next.set(contestId, {
          ...slice,
          entries,
          rankChanges,
          recentlyUpdated,
          newTopTen,
          loading: false,
          isRefreshing: false,
          lastUpdated: new Date(),
        });
        return { contests: next };
      });

      // Auto-clear highlight sets after animations complete
      const { recentlyUpdated, newTopTen } = get().getContest(contestId);

      if (recentlyUpdated.size > 0) {
        setTimeout(() => {
          set((state) => {
            const slice = state.contests.get(contestId);
            if (!slice) return state;
            const next = new Map(state.contests);
            next.set(contestId, { ...slice, recentlyUpdated: new Set() });
            return { contests: next };
          });
        }, 3000);
      }

      if (newTopTen.size > 0) {
        setTimeout(() => {
          set((state) => {
            const slice = state.contests.get(contestId);
            if (!slice) return state;
            const next = new Map(state.contests);
            next.set(contestId, { ...slice, newTopTen: new Set() });
            return { contests: next };
          });
        }, 5000);
      }
    },

    applyAdminEntries(contestId, entries) {
      set((state) => {
        const slice = state.contests.get(contestId) ?? { ...EMPTY_CONTEST_STATE };
        const next = new Map(state.contests);
        next.set(contestId, {
          ...slice,
          adminEntries: entries,
          loading: false,
          isRefreshing: false,
          lastUpdated: new Date(),
        });
        return { contests: next };
      });
    },

    clearContest(contestId) {
      set((state) => {
        const next = new Map(state.contests);
        next.delete(contestId);
        return { contests: next };
      });
    },
  }))
);

/** Convenience selector — subscribe to a single contest's state. */
export function useContestLeaderboard(contestId: string): ContestLeaderboardState {
  return useLeaderboardStore((state) => state.contests.get(contestId) ?? EMPTY_CONTEST_STATE);
}
