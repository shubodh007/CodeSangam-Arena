import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ExitContestDialog } from "@/components/ExitContestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useContestTimer } from "@/hooks/useContestTimer";
import { useRealtimeContest } from "@/hooks/useRealtimeContest";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  FileText,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Lock,
  CheckCircle2,
  XCircle,
  Shield,
  Maximize2,
} from "lucide-react";

interface ProblemStatus {
  problem_id: string;
  is_locked: boolean;
  accepted_at: string | null;
  opened_at: string | null;
  wrong_attempts: number;
}

interface SessionData {
  sessionId: string;
  contestId: string;
  username: string;
}

export default function ContestPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [problemStatuses, setProblemStatuses] = useState<Map<string, ProblemStatus>>(new Map());
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [showContestEnded, setShowContestEnded] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Anti-cheat callbacks - auto-end contest on disqualification
  const handleDisqualified = useCallback(async () => {
    // End session server-side
    if (session?.sessionId) {
      await supabase
        .from("student_sessions")
        .update({
          is_disqualified: true,
          ended_at: new Date().toISOString(),
        })
        .eq("id", session.sessionId);
    }
    setShowDisqualified(true);
    localStorage.removeItem("arena_session");
  }, [session?.sessionId]);

  const handleWarning = useCallback((count: number, reason: string) => {
    toast({
      title: `⚠️ Warning ${count} / 15`,
      description: reason,
      variant: "destructive",
    });
  }, [toast]);

  const {
    warnings,
    isFullscreen,
    requestFullscreen,
    warningLimit,
  } = useAntiCheat({
    sessionId: session?.sessionId || "",
    onDisqualified: handleDisqualified,
    onWarning: handleWarning,
    enabled: !!session && !showFullscreenPrompt,
  });

  // Real-time contest updates with instant admin changes
  const handleContestDeactivated = useCallback(() => {
    toast({
      title: "Contest Ended",
      description: "This contest has been deactivated by the administrator.",
      variant: "destructive",
    });
    setShowContestEnded(true);
  }, [toast]);

  const handleContestUpdated = useCallback((contest: any) => {
    toast({
      title: "Contest Updated",
      description: "The contest has been updated by the administrator.",
    });
  }, [toast]);

  const handleProblemsUpdated = useCallback((problems: any[]) => {
    toast({
      title: "Problems Updated",
      description: "The problem list has been updated.",
    });
  }, [toast]);

  const { contest, problems, isSubscribed } = useRealtimeContest({
    contestId: contestId || "",
    onContestDeactivated: handleContestDeactivated,
    onContestUpdated: handleContestUpdated,
    onProblemsUpdated: handleProblemsUpdated,
  });

  // Server-driven contest timer
  const handleTimeUp = useCallback(() => {
    setShowContestEnded(true);
    toast({
      title: "⏰ Time's Up!",
      description: "The contest has ended. Your work has been saved.",
      variant: "destructive",
    });
  }, [toast]);

  const {
    formattedTime,
    timerColorClass,
    isExpired,
    isWarning: timerWarning,
    isCritical: timerCritical,
  } = useContestTimer({
    sessionId: session?.sessionId || "",
    contestId: contestId || "",
    durationMinutes: contest?.duration_minutes || 60,
    enabled: !!session && !showFullscreenPrompt && !!contest,
    onTimeUp: handleTimeUp,
  });

  useEffect(() => {
    const storedSession = localStorage.getItem("arena_session");
    if (!storedSession) {
      navigate("/student/entry");
      return;
    }

    const sessionData: SessionData = JSON.parse(storedSession);
    if (sessionData.contestId !== contestId) {
      navigate("/student/entry");
      return;
    }

    setSession(sessionData);
    checkSessionAndFetch(sessionData.sessionId);
  }, [contestId]);

  const checkSessionAndFetch = async (sessionId: string) => {
    try {
      // Check if session is valid and not disqualified
      const { data: sessionData, error: sessionError } = await supabase
        .from("student_sessions")
        .select("is_disqualified, warnings")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        navigate("/student/entry");
        return;
      }

      if (sessionData.is_disqualified) {
        setShowDisqualified(true);
        return;
      }

      await fetchProblemStatuses(sessionId);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const fetchProblemStatuses = async (sessionId: string) => {
    try {
      const { data: statusData } = await supabase
        .from("student_problem_status")
        .select("*")
        .eq("session_id", sessionId);

      if (statusData) {
        const statusMap = new Map<string, ProblemStatus>();
        statusData.forEach((s) => {
          statusMap.set(s.problem_id, s);
        });
        setProblemStatuses(statusMap);
      }
    } catch (err) {
      console.error("Error fetching problem statuses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExitClick = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    // End session server-side
    if (session?.sessionId) {
      await supabase
        .from("student_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", session.sessionId);
    }
    localStorage.removeItem("arena_session");
    navigate("/");
  };

  const handleEnterFullscreen = async () => {
    await requestFullscreen();
    setShowFullscreenPrompt(false);
  };

  const getProblemStatus = (problemId: string) => {
    const status = problemStatuses.get(problemId);
    if (status?.accepted_at || status?.is_locked) {
      return "accepted";
    }
    if (status?.opened_at) {
      return "pending";
    }
    return "inactive";
  };

  const isProblemLocked = (problemId: string) => {
    const status = problemStatuses.get(problemId);
    return status?.accepted_at != null || status?.is_locked;
  };

  const getScore = () => {
    let total = 0;
    problems.forEach((p) => {
      const status = problemStatuses.get(p.id);
      if (status?.accepted_at) {
        total += p.score;
      }
    });
    return total;
  };

  const getSolvedCount = () => {
    let count = 0;
    problems.forEach((p) => {
      const status = problemStatuses.get(p.id);
      if (status?.accepted_at) {
        count++;
      }
    });
    return count;
  };

  // Disqualified screen
  if (showDisqualified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Disqualified</h1>
          <p className="text-muted-foreground mb-6">
            You have been disqualified from this contest due to exceeding the warning limit.
            Your contest session has ended.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Contest ended screen
  if (showContestEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Contest Ended</h1>
          <p className="text-muted-foreground mb-6">
            This contest has ended. Thank you for participating.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Fullscreen prompt
  if (showFullscreenPrompt && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Proctored Environment</h1>
          <p className="text-muted-foreground mb-6">
            This is a proctored coding contest. You must enter fullscreen mode to continue.
          </p>
          <ArenaCard className="text-left mb-6">
            <ArenaCardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Shield size={14} className="text-primary" />
                <span>Copy/Paste/Cut disabled in editor (typing only)</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Exiting fullscreen, tab switch, minimize = warning</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>DevTools or right-click = warning</span>
              </div>
              <div className="flex items-center gap-2 text-destructive">
                <XCircle size={14} />
                <span>15 warnings = automatic disqualification</span>
              </div>
            </ArenaCardContent>
          </ArenaCard>
          <Button variant="arena" size="lg" onClick={handleEnterFullscreen}>
            <Maximize2 size={18} />
            Enter Fullscreen & Continue
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !contest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* Header */}
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {contest.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {session?.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Score */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-success/10 border border-success/20">
              <CheckCircle2 size={14} className="text-success" />
              <span className="text-sm font-medium text-success">
                {getScore()} pts
              </span>
            </div>

            {/* Timer - Server-driven with visual warning states */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
              timerCritical 
                ? "bg-destructive/10 border-destructive/30 animate-pulse" 
                : timerWarning 
                  ? "bg-warning/10 border-warning/30" 
                  : "bg-secondary border-border"
            }`}>
              <Clock size={18} className={timerColorClass} />
              <span className={`font-mono text-lg font-bold ${timerColorClass}`}>
                {formattedTime}
              </span>
              {timerCritical && (
                <span className="text-xs text-destructive font-medium">HURRY!</span>
              )}
            </div>

            {/* Warnings */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
              warnings >= 10 
                ? "bg-destructive/10 border-destructive/20" 
                : warnings >= 5 
                  ? "bg-warning/10 border-warning/20"
                  : "bg-secondary border-border"
            }`}>
              <AlertTriangle size={14} className={
                warnings >= 10 ? "text-destructive" : warnings >= 5 ? "text-warning" : "text-muted-foreground"
              } />
              <span className={`text-sm font-medium ${
                warnings >= 10 ? "text-destructive" : warnings >= 5 ? "text-warning" : "text-foreground"
              }`}>
                {warnings} / {warningLimit}
              </span>
            </div>

            {/* Fullscreen indicator */}
            {!isFullscreen && (
              <Button variant="warning" size="sm" onClick={requestFullscreen}>
                <Maximize2 size={14} />
                Re-enter Fullscreen
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={handleExitClick}>
              <LogOut size={14} />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Exit Confirmation Dialog */}
      <ExitContestDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={handleConfirmExit}
      />
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Contest Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {contest.title}
            </h2>
            <p className="text-muted-foreground">{contest.description}</p>
          </div>

          {/* Progress */}
          <ArenaCard className="mb-6">
            <ArenaCardContent className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {getSolvedCount()} / {problems.length} Problems Solved
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current Score: {getScore()} points
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Available</p>
                <p className="text-lg font-bold text-foreground">
                  {problems.reduce((acc, p) => acc + p.score, 0)} pts
                </p>
              </div>
            </ArenaCardContent>
          </ArenaCard>

          {/* Real-time indicator */}
          {isSubscribed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Live updates enabled</span>
            </div>
          )}

          {/* Problems List */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Problems
            </h3>
          </div>

          {problems.length === 0 ? (
            <ArenaCard>
              <ArenaCardContent className="py-12 text-center">
                <FileText size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No problems available for this contest yet.
                </p>
              </ArenaCardContent>
            </ArenaCard>
          ) : (
            <div className="space-y-3">
              {problems.map((problem, index) => {
                const isLocked = isProblemLocked(problem.id);
                const status = getProblemStatus(problem.id);

                return (
                  <ArenaCard 
                    key={problem.id} 
                    hover={!isLocked && !isExpired}
                    className={isLocked || isExpired ? "opacity-75" : ""}
                  >
                    <ArenaCardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isLocked 
                            ? "bg-success/10 text-success" 
                            : "bg-secondary text-foreground"
                        }`}>
                          {isLocked ? <CheckCircle2 size={20} /> : index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">
                            {problem.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {problem.score} points
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <>
                            <StatusBadge status="accepted" label="Solved" size="sm" />
                            <Button variant="ghost" size="sm" disabled>
                              <Lock size={14} />
                              Locked
                            </Button>
                          </>
                        ) : isExpired ? (
                          <Button variant="ghost" size="sm" disabled>
                            <Clock size={14} />
                            Time's Up
                          </Button>
                        ) : (
                          <>
                            {status === "pending" && (
                              <StatusBadge status="pending" label="In Progress" size="sm" />
                            )}
                            <Button
                              variant="arena"
                              size="sm"
                              onClick={() => navigate(`/contest/${contestId}/problem/${problem.id}`)}
                            >
                              {status === "pending" ? "Continue" : "Solve"}
                              <ChevronRight size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </ArenaCardContent>
                  </ArenaCard>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
