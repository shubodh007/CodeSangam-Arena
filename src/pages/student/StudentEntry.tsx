import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { User, ArrowLeft, AlertCircle, Trophy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contest {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
}

export default function StudentEntry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingContests, setLoadingContests] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActiveContests();
  }, []);

  const fetchActiveContests = async () => {
    try {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (err) {
      console.error("Error fetching contests:", err);
    } finally {
      setLoadingContests(false);
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!selectedContest) {
      setError("Please select a contest");
      return;
    }

    setLoading(true);

    try {
      let userId: string;
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        userId = authSession.user.id;
      } else {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        if (!anonData.user) throw new Error("Failed to create anonymous session");
        userId = anonData.user.id;
      }

      const { data: fnResponse, error: fnError } = await supabase.functions.invoke(
        "session-management",
        {
          body: {
            user_id: userId,
            contest_id: selectedContest,
            username: username.trim(),
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      if (!fnResponse.success) {
        if (fnResponse.error?.includes("already have a session")) {
          setError("You already have a session in this contest. Each student can only join once.");
          setLoading(false);
          return;
        }
        if (fnResponse.error === "Username is already taken in this contest") {
          setError("This username is already taken in this contest. Please choose another.");
          setLoading(false);
          return;
        }
        if (fnResponse.error === "Contest is not active") {
          setError("This contest is no longer active.");
          setLoading(false);
          return;
        }
        throw new Error(fnResponse.error || "Failed to create session");
      }

      const session = fnResponse.session;

      if (session.is_disqualified) {
        setError("You have been disqualified from this contest and cannot rejoin.");
        setLoading(false);
        return;
      }
      if (session.ended_at) {
        setError("You have already completed this contest and cannot rejoin.");
        setLoading(false);
        return;
      }

      localStorage.setItem("arena_session", JSON.stringify({
        sessionId: session.session_id,
        contestId: selectedContest,
        username: session.username,
        userId: userId,
      }));

      toast({
        title: "Welcome to the arena!",
        description: "Good luck with your contest.",
      });

      navigate(`/contest/${selectedContest}`);
    } catch (err: any) {
      console.error("Entry error:", err);
      setError(err.message || "Failed to join contest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <AnimatedBackground />

      {/* Header */}
      <header className="border-b border-border header-glass relative z-10">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Entry Form */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <Trophy size={14} />
              Student Entry
            </div>
          </div>

          <ArenaCard glow className="arena-glass">
            <ArenaCardHeader>
              <h1 className="text-xl font-semibold text-foreground">
                Join Contest
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your username to participate
              </p>
            </ArenaCardHeader>

            <ArenaCardContent>
              <form onSubmit={handleEntry} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Username
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      variant="arena"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on the leaderboard
                  </p>
                </div>

                {/* Contest Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Select Contest
                  </label>
                  {loadingContests ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : contests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No active contests available</p>
                      <p className="text-xs mt-1">Check back later!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contests.map((contest) => (
                        <label
                          key={contest.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedContest === contest.id
                              ? "border-primary bg-primary/5 shadow-glow"
                              : "border-border bg-secondary/30 hover:border-border-active hover:bg-secondary/50"
                          }`}
                        >
                          <div className="mt-0.5">
                            {selectedContest === contest.id ? (
                              <CheckCircle2 size={18} className="text-primary" />
                            ) : (
                              <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/40" />
                            )}
                          </div>
                          <input
                            type="radio"
                            name="contest"
                            value={contest.id}
                            checked={selectedContest === contest.id}
                            onChange={() => setSelectedContest(contest.id)}
                            className="sr-only"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {contest.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {contest.description}
                            </p>
                            <p className="text-xs text-primary mt-2">
                              Duration: {contest.duration_minutes} minutes
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="arena"
                  size="lg"
                  className="w-full mt-4"
                  disabled={loading || contests.length === 0}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trophy size={18} />
                      Enter Contest
                    </>
                  )}
                </Button>
              </form>
            </ArenaCardContent>
          </ArenaCard>
        </div>
      </main>
    </div>
  );
}
