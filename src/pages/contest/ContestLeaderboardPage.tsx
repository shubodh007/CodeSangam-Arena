import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArenaCard, ArenaCardContent, ArenaCardHeader } from "@/components/ArenaCard";
import { LiveIndicator } from "@/components/leaderboard/LiveIndicator";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";
import { LeaderboardStats } from "@/components/leaderboard/LeaderboardStats";
import { LeaderboardSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import { ConnectionBanner } from "@/components/leaderboard/ConnectionBanner";
import { useRealtimeLeaderboard } from "@/hooks/useRealtimeLeaderboard";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  Trophy,
  RefreshCw,
  Users,
} from "lucide-react";

export default function ContestLeaderboardPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contestTitle, setContestTitle] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | undefined>();
  const [timeSinceUpdate, setTimeSinceUpdate] = useState("Just now");

  // Get current user's username from session
  useEffect(() => {
    const stored = localStorage.getItem("arena_session");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCurrentUsername(data.username);
      } catch {}
    }
  }, []);

  // Fetch contest title
  useEffect(() => {
    if (!contestId) return;
    supabase
      .from("contests")
      .select("title")
      .eq("id", contestId)
      .single()
      .then(({ data }) => {
        if (data) setContestTitle(data.title);
      });
  }, [contestId]);

  const {
    leaderboard,
    loading,
    isRefreshing,
    connectionStatus,
    rankChanges,
    recentlyUpdated,
    newTopTen,
    currentUserEntry,
    maxScore,
    manualRefresh,
    getTimeSinceUpdate,
  } = useRealtimeLeaderboard({
    contestId: contestId || "",
    currentUsername,
    enabled: !!contestId,
  });

  // Update "time since" display every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceUpdate(getTimeSinceUpdate());
    }, 1000);
    return () => clearInterval(interval);
  }, [getTimeSinceUpdate]);

  // Pull to refresh (touch support)
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientY;
      const pullDistance = touchEnd - touchStart;
      if (pullDistance > 80 && window.scrollY === 0) {
        manualRefresh();
      }
    },
    [touchStart, manualRefresh]
  );

  // Virtualization for large leaderboards
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = leaderboard.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? leaderboard.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip to content */}
      <a
        href="#leaderboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      {/* Header */}
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/contest/${contestId}`)}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-3">
            <LiveIndicator status={connectionStatus} />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>Updated {timeSinceUpdate}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={manualRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="leaderboard-main" className="container mx-auto px-4 sm:px-6 py-6 max-w-3xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {contestTitle || "Leaderboard"}
            </h1>
            <p className="text-xs text-muted-foreground">Live rankings</p>
          </div>
        </div>

        {/* Connection banner */}
        <ConnectionBanner status={connectionStatus} />

        {/* Current user position card */}
        {currentUserEntry && (
          <ArenaCard className="mb-5 ring-1 ring-primary/20" glow>
            <ArenaCardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  #{currentUserEntry.rank}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{currentUserEntry.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentUserEntry.problems_solved} solved · {currentUserEntry.wrong_attempts} wrong
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{currentUserEntry.total_score}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
            </ArenaCardContent>
          </ArenaCard>
        )}

        {/* Stats */}
        {!loading && <LeaderboardStats leaderboard={leaderboard} />}

        {/* Leaderboard */}
        <ArenaCard className="mt-5">
          <ArenaCardHeader className="flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Rankings</h2>
              <span className="text-xs text-muted-foreground">
                ({leaderboard.length})
              </span>
            </div>
          </ArenaCardHeader>
          <ArenaCardContent className="p-3">
            {loading ? (
              <LeaderboardSkeleton />
            ) : leaderboard.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No participants yet</p>
              </div>
            ) : (
              shouldVirtualize ? (
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ height: "calc(100vh - 240px)" }}
                >
                  {(() => {
                    const virtualItems = rowVirtualizer.getVirtualItems();
                    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
                    const paddingBottom = virtualItems.length > 0
                      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
                      : 0;
                    return (
                      <div className="space-y-1.5" style={{ paddingTop, paddingBottom }}>
                        {virtualItems.map((virtualRow) => {
                          const entry = leaderboard[virtualRow.index];
                          return (
                            <LeaderboardRow
                              key={entry.session_id}
                              entry={entry}
                              change={rankChanges.get(entry.session_id)}
                              isCurrentUser={entry.username === currentUsername}
                              isRecentlyUpdated={recentlyUpdated.has(entry.session_id)}
                              isNewTopTen={newTopTen.has(entry.session_id)}
                              maxScore={maxScore}
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.session_id}
                      entry={entry}
                      change={rankChanges.get(entry.session_id)}
                      isCurrentUser={entry.username === currentUsername}
                      isRecentlyUpdated={recentlyUpdated.has(entry.session_id)}
                      isNewTopTen={newTopTen.has(entry.session_id)}
                      maxScore={maxScore}
                    />
                  ))}
                </div>
              )
            )}
          </ArenaCardContent>
        </ArenaCard>

        {/* Legend */}
        <div className="mt-4 p-3 rounded-lg bg-background-secondary/50 border border-border">
          <p className="text-[11px] text-muted-foreground">
            Ranked by: Score ↓ · Wrong Attempts ↑ · Time ↑ · Last Accepted ↑
          </p>
        </div>
      </main>
    </div>
  );
}
