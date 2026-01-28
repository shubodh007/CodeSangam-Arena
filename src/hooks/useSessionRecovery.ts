import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveSession {
  sessionId: string;
  contestId: string;
  contestTitle: string;
  username: string;
  startedAt: string;
  warnings: number;
}

interface UseSessionRecoveryResult {
  activeSession: ActiveSession | null;
  isLoading: boolean;
  checkForActiveSession: () => Promise<void>;
}

export function useSessionRecovery(): UseSessionRecoveryResult {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkForActiveSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.user) {
        setActiveSession(null);
        return;
      }

      // Query for active sessions belonging to this user
      const { data: sessions, error } = await supabase
        .from("student_sessions")
        .select(`
          id,
          contest_id,
          username,
          started_at,
          warnings,
          is_disqualified,
          ended_at,
          contests!inner (
            id,
            title,
            is_active,
            duration_minutes
          )
        `)
        .eq("user_id", authSession.user.id)
        .eq("is_disqualified", false)
        .is("ended_at", null);

      if (error) {
        console.error("Error checking for active sessions:", error);
        setActiveSession(null);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setActiveSession(null);
        return;
      }

      // Find sessions where the contest is still active and time hasn't expired
      const now = new Date().getTime();
      const validSession = sessions.find((session) => {
        const contest = session.contests as { id: string; title: string; is_active: boolean; duration_minutes: number };
        
        // Contest must be active
        if (!contest.is_active) return false;
        
        // Check if contest time has expired
        const sessionStart = new Date(session.started_at).getTime();
        const contestEndTime = sessionStart + contest.duration_minutes * 60 * 1000;
        
        return now < contestEndTime;
      });

      if (validSession) {
        const contest = validSession.contests as { id: string; title: string; is_active: boolean; duration_minutes: number };
        setActiveSession({
          sessionId: validSession.id,
          contestId: validSession.contest_id,
          contestTitle: contest.title,
          username: validSession.username,
          startedAt: validSession.started_at,
          warnings: validSession.warnings,
        });

        // Also update localStorage for consistency
        localStorage.setItem("arena_session", JSON.stringify({
          sessionId: validSession.id,
          contestId: validSession.contest_id,
          username: validSession.username,
          userId: authSession.user.id,
        }));
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Error in session recovery check:", err);
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkForActiveSession();
  }, [checkForActiveSession]);

  return {
    activeSession,
    isLoading,
    checkForActiveSession,
  };
}
