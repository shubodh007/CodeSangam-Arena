import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
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
        { event: "*", schema: "public", table: "student_problem_status" },
        () => { fetchLeaderboard(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => { fetchLeaderboard(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_sessions" },
        () => { fetchLeaderboard(); }
      )
      .subscribe();
  };

  const fetchContestAndLeaderboard = async () => {
    try {
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
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
  };

  const getRankRowClass = (rank: number, isDisqualified: boolean) => {
    if (isDisqualified) return "opacity-50 bg-destructive/5";
    if (rank === 1) return "bg-rank-gold/5 border-l-2 border-l-rank-gold";
    if (rank === 2) return "bg-rank-silver/5 border-l-2 border-l-rank-silver";
    if (rank === 3) return "bg-rank-bronze/5 border-l-2 border-l-rank-bronze";
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border header-glass sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <ArenaCard key={i}><ArenaCardContent><Skeleton className="h-16 w-full" /></ArenaCardContent></ArenaCard>
            ))}
          </div>
          <ArenaCard><ArenaCardContent><Skeleton className="h-64 w-full" /></ArenaCardContent></ArenaCard>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border header-glass sticky top-0 z-50">
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
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-foreground">
              {contest?.title || "Contest"} — Leaderboard
            </h1>
            <StatusBadge 
              status={contest?.is_active ? "active" : "inactive"} 
              size="sm"
              pulse={contest?.is_active}
            />
          </div>
          <p className="text-muted-foreground">
            Real-time rankings updated automatically
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Participants", value: leaderboard.length, icon: Users, color: "bg-primary/10 text-primary" },
            { label: "With Solved Problems", value: leaderboard.filter(e => e.problems_solved > 0).length, icon: Trophy, color: "bg-success/10 text-success" },
            { label: "Disqualified", value: leaderboard.filter(e => e.is_disqualified).length, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
          ].map((stat, i) => (
            <ArenaCard key={stat.label} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` } as React.CSSProperties}>
              <ArenaCardContent className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color.split(" ")[0]}`}>
                  <stat.icon size={24} className={stat.color.split(" ")[1]} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </ArenaCardContent>
            </ArenaCard>
          ))}
        </div>

        {/* Leaderboard Table */}
        <ArenaCard className="animate-slide-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
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
                    <TableHead className="text-center">Wrong</TableHead>
                    <TableHead className="text-center">Time</TableHead>
                    <TableHead className="text-center">Warnings</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow
                      key={entry.session_id}
                      className={`transition-colors ${getRankRowClass(entry.rank, entry.is_disqualified)}`}
                    >
                      <TableCell className="text-center">
                        {getRankDisplay(entry.rank)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.username}
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
        <div className="mt-6 p-4 rounded-lg bg-background-secondary/50 border border-border animate-fade-in">
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
