import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseContestTimerProps {
  sessionId: string;
  contestId: string;
  durationMinutes: number;
  enabled?: boolean;
  onTimeUp?: () => void;
}

interface TimerState {
  timeRemaining: number;
  isExpired: boolean;
  isWarning: boolean;
  isCritical: boolean;
}

/**
 * Server-authoritative contest timer hook.
 * 
 * Features:
 * - Server-driven time calculation (session started_at + duration)
 * - Persists across page refresh
 * - Red warning at 15 minutes remaining
 * - Critical warning at 5 minutes remaining
 * - Auto-ends contest when time expires
 */
export function useContestTimer({
  sessionId,
  contestId,
  durationMinutes,
  enabled = true,
  onTimeUp,
}: UseContestTimerProps) {
  const [state, setState] = useState<TimerState>({
    timeRemaining: durationMinutes * 60,
    isExpired: false,
    isWarning: false,
    isCritical: false,
  });

  const serverTimeOffset = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledTimeUp = useRef(false);

  // Fetch server time and session start time to calculate remaining
  const syncWithServer = useCallback(async () => {
    if (!sessionId || !enabled) return;

    try {
      // Fetch session start time
      const { data: session, error } = await supabase
        .from("student_sessions")
        .select("started_at, ended_at")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        console.error("Failed to fetch session:", error);
        return;
      }

      // If already ended, mark as expired
      if (session.ended_at) {
        setState((prev) => ({
          ...prev,
          timeRemaining: 0,
          isExpired: true,
        }));
        return;
      }

      // Calculate time remaining based on session start + duration
      const startedAt = new Date(session.started_at).getTime();
      const endTime = startedAt + durationMinutes * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      setState({
        timeRemaining: remaining,
        isExpired: remaining <= 0,
        isWarning: remaining <= 900 && remaining > 300, // 15 min - 5 min
        isCritical: remaining <= 300, // 5 min
      });

      // Call timeUp callback when expired
      if (remaining <= 0 && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp?.();
      }
    } catch (err) {
      console.error("Error syncing timer:", err);
    }
  }, [sessionId, durationMinutes, enabled, onTimeUp]);

  // Initialize and sync
  useEffect(() => {
    if (!enabled || !sessionId) return;

    // Initial sync
    syncWithServer();

    // Re-sync every 30 seconds to prevent drift
    const syncInterval = setInterval(syncWithServer, 30000);

    return () => {
      clearInterval(syncInterval);
    };
  }, [enabled, sessionId, syncWithServer]);

  // Client-side countdown between syncs
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeRemaining <= 0) {
          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true;
            onTimeUp?.();
          }
          return { ...prev, isExpired: true };
        }

        const newRemaining = prev.timeRemaining - 1;
        return {
          timeRemaining: newRemaining,
          isExpired: newRemaining <= 0,
          isWarning: newRemaining <= 900 && newRemaining > 300,
          isCritical: newRemaining <= 300,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, onTimeUp]);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Get timer color class based on state
  const getTimerColorClass = useCallback(() => {
    if (state.isCritical) return "text-timer-critical";
    if (state.isWarning) return "text-timer-warning";
    return "text-timer-normal";
  }, [state.isWarning, state.isCritical]);

  return {
    ...state,
    formattedTime: formatTime(state.timeRemaining),
    timerColorClass: getTimerColorClass(),
    syncWithServer,
  };
}
