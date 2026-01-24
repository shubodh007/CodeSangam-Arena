import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock,
  FileText,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Trophy,
  CheckCircle2,
} from "lucide-react";

interface Problem {
  id: string;
  title: string;
  description: string;
  score: number;
  order_index: number;
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
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Check for session
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
    fetchContestData();
  }, [contestId]);

  useEffect(() => {
    if (contest) {
      // Set initial time (for demo, using duration_minutes)
      setTimeRemaining(contest.duration_minutes * 60);

      // Start countdown timer
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

  const fetchContestData = async () => {
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
    if (timeRemaining <= 300) return "text-timer-critical"; // Last 5 mins
    if (timeRemaining <= 900) return "text-timer-warning"; // Last 15 mins
    return "text-timer-normal";
  };

  const handleExitContest = () => {
    localStorage.removeItem("arena_session");
    navigate("/");
  };

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
    <div className="min-h-screen bg-background flex flex-col">
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
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock size={18} className={getTimerColor()} />
              <span className={`font-mono text-lg font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Warnings */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/20">
              <AlertTriangle size={14} className="text-warning" />
              <span className="text-sm text-warning font-medium">0 / 15</span>
            </div>

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

          {/* Problems List */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Problems ({problems.length})
            </h3>
            <div className="text-sm text-muted-foreground">
              Total Score: {problems.reduce((acc, p) => acc + p.score, 0)} pts
            </div>
          </div>

          {problems.length === 0 ? (
            <ArenaCard>
              <ArenaCardContent className="py-12 text-center">
                <FileText
                  size={48}
                  className="mx-auto mb-4 text-muted-foreground/50"
                />
                <p className="text-muted-foreground">
                  No problems available for this contest yet.
                </p>
              </ArenaCardContent>
            </ArenaCard>
          ) : (
            <div className="space-y-3">
              {problems.map((problem, index) => (
                <ArenaCard key={problem.id} hover>
                  <ArenaCardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                        {index + 1}
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
                      <StatusBadge status="pending" label="Not Started" size="sm" />
                      <Button
                        variant="arena"
                        size="sm"
                        onClick={() =>
                          navigate(`/contest/${contestId}/problem/${problem.id}`)
                        }
                      >
                        Solve
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </ArenaCardContent>
                </ArenaCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
