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
import { useRealtimeLeaderboard } from "@/hooks/useRealtimeLeaderboard";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AdminLeaderboardEntry, RankChange } from "@/store/leaderboardStore";
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
  FileCode2,
  FileText,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

interface Contest {
  id: string;
  title: string;
  is_active: boolean;
}

const DEBOUNCE_MS = 2000;

export default function ContestLeaderboard() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contest, setContest] = useState<Contest | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disqualified">("all");

  const lastManualRefreshRef = useRef(0);

  // ── Auth + contest fetch ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function checkAuthAndFetch() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
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

      if (cancelled) return;
      if (!roleData) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      const { data: contestData, error: contestError } = await supabase
        .from("contests")
        .select("id, title, is_active")
        .eq("id", contestId)
        .single();

      if (cancelled) return;
      if (contestError) console.error("Error fetching contest:", contestError);
      else setContest(contestData);

      setPageLoading(false);
      setIsAuthChecked(true);
    }

    checkAuthAndFetch();
    return () => {
      cancelled = true;
    };
  }, [contestId, navigate]);

  // ── Realtime leaderboard hook ────────────────────────────────────────────
  const {
    adminLeaderboard: leaderboard,
    loading: leaderboardLoading,
    isRefreshing,
    connectionStatus,
    lastUpdated,
    rankChanges,
    recentlyUpdated,
    manualRefresh: hookManualRefresh,
  } = useRealtimeLeaderboard({
    contestId: contestId ?? "",
    isAdmin: true,
    enabled: isAuthChecked && !!contestId,
    // Keep a 30 s safety-net poll for admin (tighter than the default 60 s)
    fallbackPollMs: 30_000,
  });

  // ── Manual refresh (debounced + toast) ──────────────────────────────────
  const handleManualRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastManualRefreshRef.current < DEBOUNCE_MS) return;
    lastManualRefreshRef.current = now;
    hookManualRefresh();
    toast({
      title: "✅ Leaderboard refreshed",
      description: "Rankings recalculated successfully.",
    });
  }, [hookManualRefresh, toast]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "—";
    return lastUpdated.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getRankDisplay = (rank: number, solved: number) => {
    if (solved === 0) return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-muted-foreground font-mono text-sm font-bold">{rank}</span>;
  };

  const getRankRowClass = (entry: AdminLeaderboardEntry, isUpdated: boolean) => {
    const base = isUpdated ? "leaderboard-row-glow" : "";
    if (entry.is_disqualified) return `${base} opacity-50 bg-destructive/5`;
    if (entry.problems_solved > 0) {
      if (entry.rank === 1) return `${base} bg-rank-gold/8 border-l-2 border-l-rank-gold`;
      if (entry.rank === 2) return `${base} bg-rank-silver/8 border-l-2 border-l-rank-silver`;
      if (entry.rank === 3) return `${base} bg-rank-bronze/8 border-l-2 border-l-rank-bronze`;
    }
    return base;
  };

  const getStatusIndicator = (entry: AdminLeaderboardEntry) => {
    if (entry.is_disqualified)
      return (
        <span title="Disqualified" className="flex items-center gap-1.5 text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive inline-block" />DQ
        </span>
      );
    if (entry.problems_solved > 0 || entry.execution_count > 0)
      return (
        <span title="Active" className="flex items-center gap-1.5 text-success">
          <span className="w-2 h-2 rounded-full bg-success inline-block animate-status-pulse" />Active
        </span>
      );
    return (
      <span title="Idle" className="flex items-center gap-1.5 text-warning">
        <span className="w-2 h-2 rounded-full bg-warning inline-block" />Idle
      </span>
    );
  };

  const getRankChangeIcon = (change?: RankChange, currentRank?: number) => {
    if (!change || change.direction === "same")
      return <Minus size={12} className="text-muted-foreground" />;

    const delta = currentRank != null ? Math.abs(change.previousRank - currentRank) : 0;

    if (change.direction === "up")
      return (
        <span className="flex items-center gap-0.5 text-success text-xs font-bold">
          <TrendingUp size={12} />+{delta}
        </span>
      );
    if (change.direction === "down")
      return (
        <span className="flex items-center gap-0.5 text-destructive text-xs font-bold">
          <TrendingDown size={12} />-{delta}
        </span>
      );
    if (change.direction === "new")
      return <span className="text-[10px] font-bold text-accent uppercase">NEW</span>;
    return null;
  };

  const getWarningColor = (warnings: number) => {
    if (warnings >= 15) return "text-destructive font-bold";
    if (warnings >= 10) return "text-destructive font-medium";
    if (warnings >= 5) return "text-warning font-medium";
    if (warnings > 0) return "text-foreground-secondary";
    return "text-muted-foreground";
  };

  // ── CSV export ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Rank", "Username", "Score", "Solved", "Partial", "Wrong", "Time", "Warnings", "Status"];
    const rows = filteredLeaderboard.map((e) => [
      e.rank,
      e.username,
      e.total_score,
      e.problems_solved,
      e.problems_partially_solved,
      e.wrong_attempts,
      formatTime(e.total_time_seconds),
      e.warnings,
      e.is_disqualified ? "Disqualified" : e.problems_solved > 0 ? "Active" : "Idle",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${contest?.title ?? "contest"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredLeaderboard = leaderboard.filter((entry) => {
    const matchesSearch =
      !searchQuery || entry.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      statusFilter === "all" ||
      (statusFilter === "active" && !entry.is_disqualified) ||
      (statusFilter === "disqualified" && entry.is_disqualified);
    return matchesSearch && matchesFilter;
  });

  const totalActive = leaderboard.filter(
    (e) => !e.is_disqualified && (e.problems_solved > 0 || e.execution_count > 0)
  ).length;
  const totalDisqualified = leaderboard.filter((e) => e.is_disqualified).length;
  const totalWithSolved = leaderboard.filter((e) => e.problems_solved > 0).length;

  // Virtualization for large tables
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = filteredLeaderboard.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? filteredLeaderboard.length : 0,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (pageLoading) {
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
            {[1, 2, 3, 4].map((i) => (
              <ArenaCard key={i}>
                <ArenaCardContent>
                  <Skeleton className="h-16 w-full" />
                </ArenaCardContent>
              </ArenaCard>
            ))}
          </div>
          <ArenaCard>
            <ArenaCardContent>
              <Skeleton className="h-64 w-full" />
            </ArenaCardContent>
          </ArenaCard>
        </main>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
            {/* Last updated */}
            <span className="hidden md:inline text-xs text-muted-foreground">
              Updated: {formatLastUpdated()}
            </span>

            {/* Live / reconnecting indicator */}
            {connectionStatus === "connected" ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
                <Wifi size={13} className="text-success" />
                <span className="text-[11px] font-bold text-success uppercase tracking-wide">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 border border-warning/20">
                <WifiOff size={13} className="text-warning" />
                <span className="text-[11px] font-bold text-warning uppercase tracking-wide">
                  {connectionStatus === "reconnecting" ? "Reconnecting" : "Offline"}
                </span>
              </div>
            )}

            {/* Manual refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </Button>

            {/* View submissions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/submissions`)}
              className="gap-1.5"
            >
              <FileCode2 size={13} />
              Submissions
            </Button>

            {/* Live monitor */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/monitor`)}
              className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Activity size={13} />
              Monitor
            </Button>

            {/* Generate PDF report */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/report`)}
              className="gap-1.5"
            >
              <FileText size={13} />
              Report
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
              {contest?.title ?? "Contest"} — Leaderboard
            </h1>
            <StatusBadge
              status={contest?.is_active ? "active" : "inactive"}
              size="sm"
              pulse={contest?.is_active}
            />
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
            <ArenaCard
              key={s.label}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
            >
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
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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

        {/* Table */}
        <ArenaCard
          className="animate-slide-up"
          style={{ animationDelay: "200ms" } as React.CSSProperties}
        >
          <ArenaCardContent className="p-0">
            {leaderboardLoading ? (
              <div className="p-6">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all"
                    ? "No matching participants"
                    : "No Participants Yet"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : "Students will appear here once they join"}
                </p>
              </div>
            ) : (
              <div
                ref={tableScrollRef}
                className="overflow-x-auto"
                style={shouldVirtualize ? { height: "calc(100vh - 360px)", overflowY: "auto" } : undefined}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="w-14 text-center sticky top-0 bg-card">#</TableHead>
                      <TableHead className="w-8 text-center sticky top-0 bg-card" />
                      <TableHead className="sticky top-0 bg-card">Username</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Score</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Solved</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Partial</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Wrong</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Time</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Warnings</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card">Status</TableHead>
                      <TableHead className="text-center sticky top-0 bg-card w-28">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : null;
                      const totalSize = shouldVirtualize ? rowVirtualizer.getTotalSize() : 0;
                      const paddingTop = virtualItems?.length ? virtualItems[0].start : 0;
                      const paddingBottom = virtualItems?.length
                        ? totalSize - virtualItems[virtualItems.length - 1].end
                        : 0;
                      const items = shouldVirtualize
                        ? virtualItems!.map((v) => ({ entry: filteredLeaderboard[v.index], idx: v.index }))
                        : filteredLeaderboard.map((entry, idx) => ({ entry, idx }));

                      return (
                        <>
                          {paddingTop > 0 && (
                            <TableRow style={{ height: `${paddingTop}px` }}>
                              <TableCell colSpan={11} className="p-0 border-0" />
                            </TableRow>
                          )}
                          {items.map(({ entry, idx }) => {
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
                                  {getRankChangeIcon(change, entry.rank)}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <span
                                    className={
                                      entry.is_disqualified ? "line-through text-muted-foreground" : ""
                                    }
                                  >
                                    {entry.username}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={`font-bold tabular-nums ${
                                      isUpdated && change?.direction === "up"
                                        ? "text-success"
                                        : "text-primary"
                                    }`}
                                  >
                                    {entry.total_score}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {entry.problems_solved}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  <span
                                    className={
                                      entry.problems_partially_solved > 0
                                        ? "text-warning font-medium"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {entry.problems_partially_solved > 0
                                      ? entry.problems_partially_solved
                                      : "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  <span
                                    className={
                                      entry.wrong_attempts > 0
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                    }
                                  >
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
                                  <span
                                    className={`tabular-nums ${getWarningColor(entry.warnings)}`}
                                  >
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
                                      onWarningAdded={hookManualRefresh}
                                    />
                                    <ResetWarningsDialog
                                      sessionId={entry.session_id}
                                      username={entry.username}
                                      currentWarnings={entry.warnings}
                                      isDisqualified={entry.is_disqualified}
                                      onWarningsReset={hookManualRefresh}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {paddingBottom > 0 && (
                            <TableRow style={{ height: `${paddingBottom}px` }}>
                              <TableCell colSpan={11} className="p-0 border-0" />
                            </TableRow>
                          )}
                        </>
                      );
                    })()}
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
            <span className="flex items-center gap-1.5">
              <TrendingUp size={11} className="text-success" /> Rank improved
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown size={11} className="text-destructive" /> Rank dropped
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
