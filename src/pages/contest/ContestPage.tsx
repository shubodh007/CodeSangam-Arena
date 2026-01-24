import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAntiCheat } from "@/hooks/useAntiCheat";
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

interface Problem {
  id: string;
  title: string;
  description: string;
  score: number;
  order_index: number;
}

interface ProblemStatus {
  problem_id: string;
  is_locked: boolean;
  accepted_at: string | null;
  opened_at: string | null;
  wrong_attempts: number;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
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
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemStatuses, setProblemStatuses] = useState<Map<string, ProblemStatus>>(new Map());
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [showDisqualified, setShowDisqualified] = useState(false);

  // Anti-cheat callbacks
  const handleDisqualified = useCallback(() => {
    setShowDisqualified(true);
    localStorage.removeItem("arena_session");
  }, []);

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

  useEffect(() => {
    if (contest) {
      setTimeRemaining(contest.duration_minutes * 60);

      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [contest]);

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

      await fetchContestData(sessionId);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const fetchContestData = async (sessionId: string) => {
    try {
      // Fetch contest
      const { data: contestData, error: contestError } = await supabase
        .from("contests")
        .select("*")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;
      setContest(contestData);

      // Fetch problems
      const { data: problemsData, error: problemsError } = await supabase
        .from("problems")
        .select("*")
        .eq("contest_id", contestId)
        .order("order_index", { ascending: true });

      if (problemsError) throw problemsError;
      setProblems(problemsData || []);

      // Fetch problem statuses
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
      console.error("Error fetching contest data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-timer-critical";
    if (timeRemaining <= 900) return "text-timer-warning";
    return "text-timer-normal";
  };

  const handleExitContest = () => {
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
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Exiting fullscreen, switching tabs, or minimizing = warning</span>
              </div>
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <span>Opening DevTools or copy/paste outside editor = warning</span>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
          <h1 className="text-xl font-semibold mb-2">Contest Not Found</h1>
          <p className="text-muted-foreground mb-4">
            This contest may have ended or doesn't exist.
          </p>
          <Button variant="arena" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
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

            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock size={18} className={getTimerColor()} />
              <span className={`font-mono text-lg font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
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

            <Button variant="ghost" size="sm" onClick={handleExitContest}>
              <LogOut size={14} />
              Exit
            </Button>
          </div>
        </div>
      </header>

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
                    hover={!isLocked}
                    className={isLocked ? "opacity-75" : ""}
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
                        ) : (
                          <>
                            <StatusBadge 
                              status={status === "pending" ? "pending" : "inactive"} 
                              label={status === "pending" ? "In Progress" : "Not Started"} 
                              size="sm" 
                            />
                            <Button
                              variant="arena"
                              size="sm"
                              onClick={() => navigate(`/contest/${contestId}/problem/${problem.id}`)}
                            >
                              Solve
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
