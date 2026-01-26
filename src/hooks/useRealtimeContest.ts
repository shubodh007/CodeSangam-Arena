import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
}

interface Problem {
  id: string;
  title: string;
  description: string | null;
  score: number;
  order_index: number;
}

interface UseRealtimeContestProps {
  contestId: string;
  onContestDeactivated?: () => void;
  onContestUpdated?: (contest: Contest) => void;
  onProblemsUpdated?: (problems: Problem[]) => void;
}

/**
 * Real-time contest subscription hook.
 * 
 * Features:
 * - Live updates when admin edits contest details
 * - Live updates when admin adds/removes/edits problems
 * - Automatic redirect when contest is deactivated
 * - No student refresh required
 */
export function useRealtimeContest({
  contestId,
  onContestDeactivated,
  onContestUpdated,
  onProblemsUpdated,
}: UseRealtimeContestProps) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Fetch initial data
  const fetchContestData = useCallback(async () => {
    if (!contestId) return;

    const [contestRes, problemsRes] = await Promise.all([
      supabase.from("contests").select("*").eq("id", contestId).single(),
      supabase.from("problems").select("*").eq("contest_id", contestId).order("order_index", { ascending: true }),
    ]);

    if (contestRes.data) {
      setContest(contestRes.data);
      
      // Check if contest was deactivated
      if (!contestRes.data.is_active) {
        onContestDeactivated?.();
      }
    }

    if (problemsRes.data) {
      setProblems(problemsRes.data);
    }
  }, [contestId, onContestDeactivated]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!contestId) return;

    // Initial fetch
    fetchContestData();

    // Subscribe to contest changes
    const contestChannel = supabase
      .channel(`contest-${contestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contests",
          filter: `id=eq.${contestId}`,
        },
        (payload) => {
          console.log("Contest update received:", payload);
          
          if (payload.eventType === "UPDATE") {
            const updatedContest = payload.new as Contest;
            setContest(updatedContest);
            onContestUpdated?.(updatedContest);

            // Check if contest was deactivated
            if (!updatedContest.is_active) {
              onContestDeactivated?.();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
        }
      });

    // Subscribe to problem changes
    const problemsChannel = supabase
      .channel(`problems-${contestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "problems",
          filter: `contest_id=eq.${contestId}`,
        },
        async (payload) => {
          console.log("Problems update received:", payload);
          
          // Refetch all problems to maintain order
          const { data } = await supabase
            .from("problems")
            .select("*")
            .eq("contest_id", contestId)
            .order("order_index", { ascending: true });

          if (data) {
            setProblems(data);
            onProblemsUpdated?.(data);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(contestChannel);
      supabase.removeChannel(problemsChannel);
      setIsSubscribed(false);
    };
  }, [contestId, fetchContestData, onContestDeactivated, onContestUpdated, onProblemsUpdated]);

  return {
    contest,
    problems,
    isSubscribed,
    refetch: fetchContestData,
  };
}
