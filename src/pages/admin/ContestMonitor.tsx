import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { StudentActivityCard } from "@/components/monitor/StudentActivityCard";
import { useStudentPresence, getPresenceStatus } from "@/hooks/useStudentPresence";
import {
  ChevronLeft,
  RefreshCw,
  Search,
  Users,
  PenLine,
  Clock,
  WifiOff,
  Activity,
  BarChart3,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Contest {
  id: string;
  title: string;
  is_active: boolean;
}

type FilterTab = "all" | "online" | "away" | "offline";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  value,
  label,
  colorCls,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorCls: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-sm ${colorCls}`}>
      {icon}
      <div>
        <p className="text-xl font-bold font-mono leading-none">{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-current opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-background-secondary/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-36 rounded-md" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="grid grid-cols-3 gap-1">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContestMonitor() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();

  const [contest, setContest] = useState<Contest | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // ── Auth check ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
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

      const { data: contestData } = await supabase
        .from("contests")
        .select("id, title, is_active")
        .eq("id", contestId!)
        .single();

      if (!cancelled) {
        setContest(contestData);
        setIsAuthChecked(true);
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [contestId, navigate]);

  // ── Presence hook ─────────────────────────────────────────────────────────

  const {
    sessions,
    problems,
    isLoading,
    lastUpdated,
    manualRefresh,
    onlineCount,
    typingCount,
    awayCount,
    offlineCount,
  } = useStudentPresence({
    contestId: contestId || "",
    enabled: isAuthChecked,
    fallbackPollMs: 30_000,
  });

  // ── Filter + search ───────────────────────────────────────────────────────

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const status = getPresenceStatus(s);
    if (filterTab === "online") return status === "online" || status === "typing";
    if (filterTab === "away") return status === "away";
    if (filterTab === "offline") return status === "offline";
    return true;
  });

  const totalCount = sessions.length;

  // ── Tab definitions ───────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: totalCount },
    { key: "online",  label: "Online",  count: onlineCount + typingCount },
    { key: "away",    label: "Away",    count: awayCount },
    { key: "offline", label: "Offline", count: offlineCount },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border header-glass">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/leaderboard`)}
              className="gap-1.5 shrink-0"
            >
              <ChevronLeft size={16} />
              Leaderboard
            </Button>
            <div className="h-5 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-foreground hidden sm:block">
                  Live Monitor
                </span>
              </div>
              {contest && (
                <>
                  <span className="text-muted-foreground/50 hidden sm:block">·</span>
                  <span className="text-sm text-muted-foreground truncate hidden sm:block">
                    {contest.title}
                  </span>
                  <StatusBadge
                    status={contest.is_active ? "active" : "inactive"}
                    size="sm"
                    pulse={contest.is_active}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground hidden md:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={manualRefresh}
              className="gap-1.5"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/leaderboard`)}
              className="gap-1.5"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatChip
            icon={<PenLine size={16} />}
            value={typingCount}
            label="Typing"
            colorCls="bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
          />
          <StatChip
            icon={<Activity size={16} />}
            value={onlineCount}
            label="Online"
            colorCls="bg-primary/10 text-primary border-primary/25"
          />
          <StatChip
            icon={<Clock size={16} />}
            value={awayCount}
            label="Away"
            colorCls="bg-amber-500/10 text-amber-400 border-amber-500/25"
          />
          <StatChip
            icon={<WifiOff size={16} />}
            value={offlineCount}
            label="Offline"
            colorCls="bg-muted/50 text-muted-foreground border-border/50"
          />
        </div>

        {/* ── Search + filter ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              variant="arena"
              placeholder="Search student..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-background-secondary/60 rounded-lg p-1 border border-border/50 w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                {t.label}
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    filterTab === t.key
                      ? "bg-white/20"
                      : "bg-border/60 text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Card grid ─────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {sessions.length === 0
                ? "No students have joined yet"
                : "No students match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {sessions.length === 0
                ? "Students will appear here once they join the contest."
                : "Try clearing your search or changing the filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((session) => (
              <StudentActivityCard
                key={session.session_id}
                session={session}
                problems={problems}
                totalProblems={problems.length}
              />
            ))}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Showing {filtered.length} of {totalCount} students · auto-refreshes every 30s
          </p>
        )}
      </main>
    </div>
  );
}
