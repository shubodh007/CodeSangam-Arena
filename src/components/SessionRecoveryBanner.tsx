import { ArrowRight, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActiveSession {
  sessionId: string;
  contestId: string;
  contestTitle: string;
  username: string;
  startedAt: string;
  warnings: number;
}

interface SessionRecoveryBannerProps {
  session: ActiveSession;
  onResume: () => void;
  isLoading?: boolean;
}

export function SessionRecoveryBanner({ 
  session, 
  onResume, 
  isLoading 
}: SessionRecoveryBannerProps) {
  const startedAt = new Date(session.startedAt);
  const timeAgo = getTimeAgo(startedAt);

  return (
    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <RefreshCw size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">
            Resume Your Contest
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            You have an active session in <span className="font-medium text-foreground">{session.contestTitle}</span>
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Started {timeAgo}
            </span>
            <span>
              Playing as <span className="font-medium text-foreground">{session.username}</span>
            </span>
            {session.warnings > 0 && (
              <span className="text-warning">
                {session.warnings} warning{session.warnings !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="arena" 
          size="sm" 
          onClick={onResume}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Resume
              <ArrowRight size={14} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}
