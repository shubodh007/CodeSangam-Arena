import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { AddWarningDialog } from "@/components/admin/AddWarningDialog";
import { ResetWarningsDialog } from "@/components/admin/ResetWarningsDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Trophy,
  Users,
  RefreshCw,
  Medal,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface LeaderboardEntry {
  session_id: string;
  contest_id: string;
  username: string;
  is_disqualified: boolean;
  warnings: number;
  execution_count: number;
  total_score: number;
  problems_solved: number;
  wrong_attempts: number;
  total_time_seconds: number;
  last_accepted_at: string | null;
  rank: number;
}

interface Contest {
  id: string;
  title: string;
  is_active: boolean;
}

export default function ContestLeaderboard() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
    setupRealtimeSubscription();

    return () => {
      supabase.removeAllChannels();
    };
  }, [contestId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/admin/login");
      return;
    }

    // Verify admin role using authoritative user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate("/admin/login");
      return;
    }

    fetchContestAndLeaderboard();
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_problem_status",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_sessions",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();
  };

  const fetchContestAndLeaderboard = async () => {
    try {
      // Fetch contest details
      const { data: contestData, error: contestError } = await supabase
        .from("contests")
        .select("id, title, is_active")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;
      setContest(contestData);

      await fetchLeaderboard();
    } catch (err) {
      console.error("Error fetching contest:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      // Use admin view that includes warnings and disqualification status
      const { data, error } = await supabase
        .from("admin_leaderboard_view")
        .select("*")
        .eq("contest_id", contestId)
        .order("rank", { ascending: true });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="text-yellow-500" size={20} />;
    if (rank === 2) return <Medal className="text-gray-400" size={20} />;
    if (rank === 3) return <Medal className="text-amber-600" size={20} />;
    return <span className="text-muted-foreground font-mono">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/dashboard")}
            >
              <ChevronLeft size={16} />
              Back
            </Button>
            <Logo size="md" />
          </div>
          <Button variant="outline" size="sm" onClick={fetchLeaderboard}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Contest Info */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-foreground">
              {contest?.title || "Contest"} — Leaderboard
            </h1>
            <StatusBadge 
              status={contest?.is_active ? "active" : "inactive"} 
              size="sm" 
            />
          </div>
          <p className="text-muted-foreground">
            Real-time rankings updated automatically
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ArenaCard>
            <ArenaCardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{leaderboard.length}</p>
                <p className="text-sm text-muted-foreground">Participants</p>
              </div>
            </ArenaCardContent>
          </ArenaCard>
          <ArenaCard>
            <ArenaCardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Trophy size={24} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {leaderboard.filter(e => e.problems_solved > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">With Solved Problems</p>
              </div>
            </ArenaCardContent>
          </ArenaCard>
          <ArenaCard>
            <ArenaCardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {leaderboard.filter(e => e.is_disqualified).length}
                </p>
                <p className="text-sm text-muted-foreground">Disqualified</p>
              </div>
            </ArenaCardContent>
          </ArenaCard>
        </div>

        {/* Leaderboard Table */}
        <ArenaCard>
          <ArenaCardHeader className="border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Rankings</h2>
          </ArenaCardHeader>
          <ArenaCardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Participants Yet
                </h3>
                <p className="text-muted-foreground">
                  Students will appear here once they join the contest
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Solved</TableHead>
                    <TableHead className="text-center">Wrong Attempts</TableHead>
                    <TableHead className="text-center">Total Time</TableHead>
                    <TableHead className="text-center">Warnings</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow
                      key={entry.session_id}
                      className={entry.is_disqualified ? "opacity-50 bg-destructive/5" : ""}
                    >
                      <TableCell className="text-center">
                        {getRankIcon(entry.rank)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.username}
                        {entry.rank <= 3 && entry.problems_solved > 0 && (
                          <span className="ml-2 text-xs text-primary">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {entry.total_score}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.problems_solved}
                      </TableCell>
                      <TableCell className="text-center text-destructive">
                        {entry.wrong_attempts > 0 ? entry.wrong_attempts : "—"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={12} />
                          {formatTime(entry.total_time_seconds)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={
                          entry.warnings >= 15 
                            ? "text-destructive font-bold" 
                            : entry.warnings >= 10 
                              ? "text-destructive font-medium" 
                              : entry.warnings >= 5 
                                ? "text-warning" 
                                : "text-muted-foreground"
                        }>
                          {entry.warnings}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.is_disqualified ? (
                          <StatusBadge status="disqualified" size="sm" />
                        ) : (
                          <StatusBadge status="active" size="sm" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AddWarningDialog
                            sessionId={entry.session_id}
                            username={entry.username}
                            currentWarnings={entry.warnings}
                            isDisqualified={entry.is_disqualified}
                            onWarningAdded={fetchLeaderboard}
                          />
                          <ResetWarningsDialog
                            sessionId={entry.session_id}
                            username={entry.username}
                            currentWarnings={entry.warnings}
                            isDisqualified={entry.is_disqualified}
                            onWarningsReset={fetchLeaderboard}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ArenaCardContent>
        </ArenaCard>

        {/* Legend */}
        <div className="mt-6 p-4 rounded-lg bg-background-secondary/50 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">Ranking Criteria (in order):</h3>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Total Score (higher is better)</li>
            <li>Wrong Attempts (fewer is better)</li>
            <li>Total Time (faster is better)</li>
            <li>Last Accepted Time (earlier is better)</li>
            <li>Username (alphabetical)</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
