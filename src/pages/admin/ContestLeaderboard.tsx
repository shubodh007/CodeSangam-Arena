import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AddWarningDialog } from "@/components/admin/AddWarningDialog";
import { ResetWarningsDialog } from "@/components/admin/ResetWarningsDialog";
import { useToast } from "@/hooks/use-toast";
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
  AlertTriangle,
  Clock,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
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

interface RankChange {
  direction: "up" | "down" | "same" | "new";
  delta: number;
}

interface Contest {
  id: string;
  title: string;
  is_active: boolean;
}

const REFRESH_INTERVAL = 5;
const DEBOUNCE_MS = 2000;

export default function ContestLeaderboard() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disqualified">("all");
  const [rankChanges, setRankChanges] = useState<Map<string, RankChange>>(new Map());
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  const previousDataRef = useRef<Map<string, LeaderboardEntry>>(new Map());
  const lastManualRefreshRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const autoRefreshRef = useRef<ReturnType<typeof setInterval>>();

  // Auth check + initial fetch
  useEffect(() => {
    checkAuthAndFetch();
    return () => {
      supabase.removeAllChannels();
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [contestId]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || loading) return;

    setCountdown(REFRESH_INTERVAL);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLeaderboard(true);
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, loading]);

  // Realtime subscription
  useEffect(() => {
    if (!contestId) return;

    const channel = supabase
      .channel("leaderboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_problem_status" }, () => fetchLeaderboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => fetchLeaderboard(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "student_sessions" }, () => fetchLeaderboard(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contestId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/login"); return; }

    const { data: roleData } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();

    if (!roleData) { await supabase.auth.signOut(); navigate("/admin/login"); return; }
    fetchContestAndLeaderboard();
  };

  const fetchContestAndLeaderboard = async () => {
    try {
      const { data: contestData, error: contestError } = await supabase
        .from("contests").select("id, title, is_active").eq("id", contestId).single();
      if (contestError) throw contestError;
      setContest(contestData);
      await fetchLeaderboard(false);
    } catch (err) {
      console.error("Error fetching contest:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from("admin_leaderboard_view").select("*")
        .eq("contest_id", contestId).order("rank", { ascending: true });

      if (error) throw error;
      const entries: LeaderboardEntry[] = (data || []).map((d) => ({
        session_id: d.session_id || "",
        contest_id: d.contest_id || "",
        username: d.username || "",
        is_disqualified: d.is_disqualified || false,
        warnings: d.warnings || 0,
        execution_count: d.execution_count || 0,
        total_score: d.total_score || 0,
        problems_solved: d.problems_solved || 0,
        wrong_attempts: d.wrong_attempts || 0,
        total_time_seconds: d.total_time_seconds || 0,
        last_accepted_at: d.last_accepted_at,
        rank: d.rank || 0,
      }));

      // Compute rank changes
      const prevMap = previousDataRef.current;
      const changes = new Map<string, RankChange>();
      const updated = new Set<string>();

      entries.forEach((entry) => {
        const prev = prevMap.get(entry.session_id);
        if (!prev) {
          changes.set(entry.session_id, { direction: prevMap.size > 0 ? "new" : "same", delta: 0 });
        } else {
          const rankDelta = prev.rank - entry.rank;
          const direction = rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : "same";
          changes.set(entry.session_id, { direction, delta: Math.abs(rankDelta) });

          if (entry.total_score !== prev.total_score || entry.rank !== prev.rank || entry.warnings !== prev.warnings) {
            updated.add(entry.session_id);
          }
        }
      });

      const newPrevMap = new Map<string, LeaderboardEntry>();
      entries.forEach((e) => newPrevMap.set(e.session_id, e));
      previousDataRef.current = newPrevMap;

      setRankChanges(changes);
      setRecentlyUpdated(updated);
      setLeaderboard(entries);
      setLastUpdated(new Date());

      if (updated.size > 0) {
        setTimeout(() => setRecentlyUpdated(new Set()), 3000);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      toast({ title: "Refresh failed", description: "Failed to refresh. Retrying...", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [contestId, toast]);

  const handleManualRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRefreshRef.current < DEBOUNCE_MS) return;
    lastManualRefreshRef.current = now;
    setIsRefreshing(true);
    await fetchLeaderboard(false);
    setCountdown(REFRESH_INTERVAL);
    toast({ title: "✅ Leaderboard refreshed", description: "Rankings recalculated successfully." });
  }, [fetchLeaderboard, toast]);

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "—";
    return lastUpdated.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getRankDisplay = (rank: number, solved: number) => {
    if (solved === 0) return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-muted-foreground font-mono text-sm font-bold">{rank}</span>;
  };

  const getRankRowClass = (entry: LeaderboardEntry, isUpdated: boolean) => {
    const base = isUpdated ? "leaderboard-row-glow" : "";
    if (entry.is_disqualified) return `${base} opacity-50 bg-destructive/5`;
    if (entry.problems_solved > 0) {
      if (entry.rank === 1) return `${base} bg-rank-gold/8 border-l-2 border-l-rank-gold`;
      if (entry.rank === 2) return `${base} bg-rank-silver/8 border-l-2 border-l-rank-silver`;
      if (entry.rank === 3) return `${base} bg-rank-bronze/8 border-l-2 border-l-rank-bronze`;
    }
    return base;
  };

  const getStatusIndicator = (entry: LeaderboardEntry) => {
    if (entry.is_disqualified) return <span title="Disqualified" className="flex items-center gap-1.5 text-destructive"><span className="w-2 h-2 rounded-full bg-destructive inline-block" />DQ</span>;
    if (entry.problems_solved > 0 || entry.execution_count > 0) return <span title="Active" className="flex items-center gap-1.5 text-success"><span className="w-2 h-2 rounded-full bg-success inline-block animate-status-pulse" />Active</span>;
    return <span title="Idle" className="flex items-center gap-1.5 text-warning"><span className="w-2 h-2 rounded-full bg-warning inline-block" />Idle</span>;
  };

  const getRankChangeIcon = (change?: RankChange) => {
    if (!change || change.direction === "same") return <Minus size={12} className="text-muted-foreground" />;
    if (change.direction === "up") return <span className="flex items-center gap-0.5 text-success text-xs font-bold"><TrendingUp size={12} />+{change.delta}</span>;
    if (change.direction === "down") return <span className="flex items-center gap-0.5 text-destructive text-xs font-bold"><TrendingDown size={12} />-{change.delta}</span>;
    if (change.direction === "new") return <span className="text-[10px] font-bold text-accent uppercase">NEW</span>;
    return null;
  };

  const getWarningColor = (warnings: number) => {
    if (warnings >= 15) return "text-destructive font-bold";
    if (warnings >= 10) return "text-destructive font-medium";
    if (warnings >= 5) return "text-warning font-medium";
    if (warnings > 0) return "text-foreground-secondary";
    return "text-muted-foreground";
  };

  const exportCSV = () => {
    const headers = ["Rank", "Username", "Score", "Solved", "Wrong", "Time", "Warnings", "Status"];
    const rows = filteredLeaderboard.map((e) => [
      e.rank, e.username, e.total_score, e.problems_solved, e.wrong_attempts,
      formatTime(e.total_time_seconds), e.warnings,
      e.is_disqualified ? "Disqualified" : e.problems_solved > 0 ? "Active" : "Idle",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${contest?.title || "contest"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered leaderboard
  const filteredLeaderboard = leaderboard.filter((entry) => {
    const matchesSearch = !searchQuery || entry.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      statusFilter === "all" ||
      (statusFilter === "active" && !entry.is_disqualified) ||
      (statusFilter === "disqualified" && entry.is_disqualified);
    return matchesSearch && matchesFilter;
  });

  const totalActive = leaderboard.filter((e) => !e.is_disqualified && (e.problems_solved > 0 || e.execution_count > 0)).length;
  const totalDisqualified = leaderboard.filter((e) => e.is_disqualified).length;
  const totalWithSolved = leaderboard.filter((e) => e.problems_solved > 0).length;

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
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
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
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <ChevronLeft size={16} /> Back
            </Button>
            <Logo size="md" />
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle + countdown */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  autoRefresh
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                Auto: {autoRefresh ? "ON" : "OFF"}
              </button>
              {autoRefresh && (
                <span className="font-mono text-muted-foreground tabular-nums min-w-[40px]">
                  {countdown}s
                </span>
              )}
            </div>

            {/* Last updated */}
            <span className="hidden md:inline text-xs text-muted-foreground">
              Updated: {formatLastUpdated()}
            </span>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-status-pulse" />
              <span className="text-[11px] font-bold text-success uppercase tracking-wide">LIVE</span>
            </div>

            {/* Manual refresh */}
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing} className="gap-1.5">
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Contest title */}
        <div className="mb-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="text-primary" size={24} />
            <h1 className="text-xl font-bold text-foreground">
              {contest?.title || "Contest"} — Leaderboard
            </h1>
            <StatusBadge status={contest?.is_active ? "active" : "inactive"} size="sm" pulse={contest?.is_active} />
          </div>
          <p className="text-sm text-muted-foreground">
            Ranked by: Score ↓ · Wrong ↑ · Time ↑ · Last Accepted ↑ · Username A-Z
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: leaderboard.length, icon: Users, cls: "text-primary" },
            { label: "Active", value: totalActive, icon: TrendingUp, cls: "text-success" },
            { label: "Solved 1+", value: totalWithSolved, icon: Trophy, cls: "text-accent" },
            { label: "Disqualified", value: totalDisqualified, icon: AlertTriangle, cls: "text-destructive" },
          ].map((s, i) => (
            <ArenaCard key={s.label} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}>
              <ArenaCardContent className="flex items-center gap-3 py-3">
                <s.icon size={20} className={s.cls} />
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </ArenaCardContent>
            </ArenaCard>
          ))}
        </div>

        {/* Search + Filter + Export */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background-secondary border-border"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter size={14} className="text-muted-foreground mr-1" />
            {(["all", "active", "disqualified"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  statusFilter === f
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 ml-auto">
            <Download size={13} /> CSV
          </Button>
        </div>

        {/* Refresh progress bar */}
        {autoRefresh && (
          <div className="h-0.5 bg-background-secondary rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-primary/40 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100}%` }}
            />
          </div>
        )}

        {/* Table */}
        <ArenaCard className="animate-slide-up" style={{ animationDelay: "200ms" } as React.CSSProperties}>
          <ArenaCardContent className="p-0">
            {filteredLeaderboard.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all" ? "No matching participants" : "No Participants Yet"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "Try a different search term" : "Students will appear here once they join"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="w-14 text-center sticky top-0 bg-card">#</TableHead>
                      <TableHead className="w-8 text-center sticky top-0 bg-card" />
                      <TableHead className="sticky top-0 bg-card">Username</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Score</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Solved</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Wrong</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Time</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Warnings</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Status</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaderboard.map((entry, idx) => {
                      const change = rankChanges.get(entry.session_id);
                      const isUpdated = recentlyUpdated.has(entry.session_id);

                      return (
                        <TableRow
                          key={entry.session_id}
                          className={`transition-all duration-300 ${getRankRowClass(entry, isUpdated)}`}
                          style={{ animationDelay: `${idx * 20}ms` } as React.CSSProperties}
                        >
                          <TableCell className="text-center font-mono">
                            {getRankDisplay(entry.rank, entry.problems_solved)}
                          </TableCell>
                          <TableCell className="text-center px-1">
                            {getRankChangeIcon(change)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className={entry.is_disqualified ? "line-through text-muted-foreground" : ""}>
                              {entry.username}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold tabular-nums ${isUpdated && change && change.direction === "up" ? "text-success" : "text-primary"}`}>
                              {entry.total_score}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{entry.problems_solved}</TableCell>
                          <TableCell className="text-center tabular-nums">
                            <span className={entry.wrong_attempts > 0 ? "text-destructive" : "text-muted-foreground"}>
                              {entry.wrong_attempts > 0 ? entry.wrong_attempts : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-1 text-xs font-mono tabular-nums">
                              <Clock size={11} />
                              {formatTime(entry.total_time_seconds)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`tabular-nums ${getWarningColor(entry.warnings)}`}>
                              {entry.warnings}
                              <span className="text-muted-foreground text-[10px]">/15</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {getStatusIndicator(entry)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <AddWarningDialog
                                sessionId={entry.session_id}
                                username={entry.username}
                                currentWarnings={entry.warnings}
                                isDisqualified={entry.is_disqualified}
                                onWarningAdded={() => fetchLeaderboard(false)}
                              />
                              <ResetWarningsDialog
                                sessionId={entry.session_id}
                                username={entry.username}
                                currentWarnings={entry.warnings}
                                isDisqualified={entry.is_disqualified}
                                onWarningsReset={() => fetchLeaderboard(false)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ArenaCardContent>
        </ArenaCard>

        {/* Footer info */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {filteredLeaderboard.length} of {leaderboard.length} participants
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">🥇🥈🥉 Top 3 highlighted</span>
            <span className="flex items-center gap-1.5"><TrendingUp size={11} className="text-success" /> Rank improved</span>
            <span className="flex items-center gap-1.5"><TrendingDown size={11} className="text-destructive" /> Rank dropped</span>
          </div>
        </div>
      </main>
    </div>
  );
}
