import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentSession {
  session_id: string;
  username: string;
  last_active_at: string | null;
  current_problem_id: string | null;
  is_typing: boolean;
  is_disqualified: boolean;
  warnings: number;
  execution_count: number;
  problems_solved: number;
}

export interface ContestProblem {
  id: string;
  title: string;
  order_index: number;
}

export type PresenceStatus = "typing" | "online" | "away" | "offline";

export function getPresenceStatus(s: StudentSession): PresenceStatus {
  if (s.is_disqualified) return "offline";
  if (!s.last_active_at) return "offline";
  const diffMs = Date.now() - new Date(s.last_active_at).getTime();
  if (diffMs > 5 * 60 * 1000) return "offline";
  if (diffMs > 90 * 1000) return "away";
  return s.is_typing ? "typing" : "online";
}

interface UseStudentPresenceOptions {
  contestId: string;
  enabled: boolean;
  fallbackPollMs?: number;
}

interface UseStudentPresenceReturn {
  sessions: StudentSession[];
  problems: ContestProblem[];
  isLoading: boolean;
  lastUpdated: Date | null;
  manualRefresh: () => void;
  onlineCount: number;
  typingCount: number;
  awayCount: number;
  offlineCount: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudentPresence({
  contestId,
  enabled,
  fallbackPollMs = 30_000,
}: UseStudentPresenceOptions): UseStudentPresenceReturn {
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all sessions + solve counts ──────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!contestId) return;

    const [sessionsRes, problemsRes] = await Promise.all([
      supabase
        .from("student_sessions")
        .select(
          "id, username, last_active_at, current_problem_id, is_typing, is_disqualified, warnings, execution_count"
        )
        .eq("contest_id", contestId)
        .order("username", { ascending: true }),
      supabase
        .from("problems")
        .select("id, title, order_index")
        .eq("contest_id", contestId)
        .order("order_index", { ascending: true }),
    ]);

    if (sessionsRes.error || problemsRes.error) return;

    const rawSessions = sessionsRes.data || [];

    // Fetch solved counts for all sessions in one query
    const sessionIds = rawSessions.map((s) => s.id);
    let solvedMap: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: solvedData } = await supabase
        .from("student_problem_status")
        .select("session_id")
        .in("session_id", sessionIds)
        .not("accepted_at", "is", null);

      (solvedData || []).forEach((row: { session_id: string }) => {
        solvedMap[row.session_id] = (solvedMap[row.session_id] || 0) + 1;
      });
    }

    const mapped: StudentSession[] = rawSessions.map((s) => ({
      session_id: s.id,
      username: s.username,
      last_active_at: (s as unknown as { last_active_at: string | null }).last_active_at,
      current_problem_id: (s as unknown as { current_problem_id: string | null }).current_problem_id,
      is_typing: (s as unknown as { is_typing: boolean }).is_typing ?? false,
      is_disqualified: s.is_disqualified,
      warnings: s.warnings,
      execution_count: s.execution_count,
      problems_solved: solvedMap[s.id] || 0,
    }));

    setSessions(mapped);
    setProblems(
      (problemsRes.data || []).map((p) => ({
        id: p.id,
        title: p.title,
        order_index: p.order_index,
      }))
    );
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [contestId]);

  // ── Apply a single session UPDATE from Realtime ───────────────────────────

  const applyUpdate = useCallback(
    // deno-lint-ignore no-explicit-any
    (updated: Record<string, any>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === updated.id
            ? {
                ...s,
                last_active_at: updated.last_active_at ?? s.last_active_at,
                current_problem_id: updated.current_problem_id ?? s.current_problem_id,
                is_typing: updated.is_typing ?? s.is_typing,
                is_disqualified: updated.is_disqualified ?? s.is_disqualified,
                warnings: updated.warnings ?? s.warnings,
                execution_count: updated.execution_count ?? s.execution_count,
              }
            : s
        )
      );
      setLastUpdated(new Date());
    },
    []
  );

  // ── Realtime subscription + fallback poll ──────────────────────────────────

  useEffect(() => {
    if (!enabled || !contestId) return;

    fetchSessions();

    // Subscribe to student_sessions UPDATE events for this contest
    channelRef.current = supabase
      .channel(`student-presence:${contestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "student_sessions",
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          applyUpdate(payload.new as Record<string, unknown>);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_sessions",
          filter: `contest_id=eq.${contestId}`,
        },
        () => {
          // New student joined — re-fetch to get full row + solved count
          fetchSessions();
        }
      )
      .subscribe();

    // Fallback poll in case of missed events
    pollTimerRef.current = setInterval(fetchSessions, fallbackPollMs);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [enabled, contestId, fetchSessions, applyUpdate, fallbackPollMs]);

  // ── Derived counts ────────────────────────────────────────────────────────

  const typingCount  = sessions.filter((s) => getPresenceStatus(s) === "typing").length;
  const onlineCount  = sessions.filter((s) => getPresenceStatus(s) === "online").length;
  const awayCount    = sessions.filter((s) => getPresenceStatus(s) === "away").length;
  const offlineCount = sessions.filter((s) => getPresenceStatus(s) === "offline").length;

  return {
    sessions,
    problems,
    isLoading,
    lastUpdated,
    manualRefresh: fetchSessions,
    onlineCount,
    typingCount,
    awayCount,
    offlineCount,
  };
}
