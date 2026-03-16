import { cn } from "@/lib/utils";
import { AlertTriangle, Zap, CheckCircle2, Clock, PenLine } from "lucide-react";
import type { StudentSession, ContestProblem, PresenceStatus } from "@/hooks/useStudentPresence";
import { getPresenceStatus } from "@/hooks/useStudentPresence";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLastActive(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const STATUS_META: Record<
  PresenceStatus,
  { label: string; badgeCls: string; avatarCls: string; borderCls: string; dotCls: string }
> = {
  typing: {
    label: "Typing",
    badgeCls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    avatarCls: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    borderCls: "border-l-2 border-l-emerald-500/60",
    dotCls: "bg-emerald-400 animate-pulse",
  },
  online: {
    label: "Online",
    badgeCls: "bg-primary/15 text-primary border border-primary/30",
    avatarCls: "bg-primary shadow-[0_0_12px_rgba(59,130,246,0.4)]",
    borderCls: "border-l-2 border-l-primary/40",
    dotCls: "bg-primary",
  },
  away: {
    label: "Away",
    badgeCls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    avatarCls: "bg-amber-500/80",
    borderCls: "border-l-2 border-l-amber-500/40",
    dotCls: "bg-amber-400",
  },
  offline: {
    label: "Offline",
    badgeCls: "bg-muted/40 text-muted-foreground border border-border/40",
    avatarCls: "bg-muted-foreground/25",
    borderCls: "border-l-2 border-l-border/30",
    dotCls: "bg-muted-foreground/40",
  },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface StudentActivityCardProps {
  session: StudentSession;
  problems: ContestProblem[];
  totalProblems: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StudentActivityCard({
  session,
  problems,
  totalProblems,
}: StudentActivityCardProps) {
  const status = getPresenceStatus(session);
  const meta = STATUS_META[status];

  const initial = session.username.charAt(0).toUpperCase();

  const currentProblem = session.current_problem_id
    ? problems.find((p) => p.id === session.current_problem_id)
    : null;

  const solvedPercent =
    totalProblems > 0
      ? Math.round((session.problems_solved / totalProblems) * 100)
      : 0;

  const isDisq = session.is_disqualified;

  return (
    <div
      className={cn(
        "relative rounded-xl bg-background-secondary/60 border border-border/50 backdrop-blur-sm",
        "transition-all duration-300 hover:bg-background-secondary/80 hover:border-border",
        meta.borderCls,
        isDisq && "opacity-50"
      )}
    >
      {/* Card body */}
      <div className="p-4">
        {/* Top row: avatar + username + status badge */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500",
                meta.avatarCls
              )}
            >
              {initial}
            </div>
            {/* Status dot */}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                meta.dotCls
              )}
            />
          </div>

          {/* Username + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "font-semibold text-sm text-foreground truncate",
                  isDisq && "line-through text-muted-foreground"
                )}
              >
                {session.username}
              </span>
              {isDisq && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30 font-medium">
                  DQ
                </span>
              )}
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  meta.badgeCls
                )}
              >
                {status === "typing" && <PenLine size={9} />}
                {meta.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatLastActive(session.last_active_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Current problem chip */}
        <div className="mb-3 min-h-[24px]">
          {currentProblem ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary font-medium max-w-full">
              <span className="shrink-0 text-[10px] font-mono bg-primary/20 rounded px-1">
                P{currentProblem.order_index + 1}
              </span>
              <span className="truncate">{currentProblem.title}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/50 italic">
              No problem open
            </span>
          )}
        </div>

        {/* Solve progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Solved</span>
            <span className="font-mono">
              {session.problems_solved}/{totalProblems}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${solvedPercent}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <Metric
            icon={<Zap size={11} className="text-primary" />}
            value={session.execution_count}
            label="Runs"
          />
          <Metric
            icon={<AlertTriangle size={11} className="text-amber-400" />}
            value={session.warnings}
            label="Warnings"
            valueClass={session.warnings > 10 ? "text-destructive" : session.warnings > 5 ? "text-amber-400" : undefined}
          />
          <Metric
            icon={<CheckCircle2 size={11} className="text-emerald-400" />}
            value={session.problems_solved}
            label="Solved"
          />
        </div>
      </div>
    </div>
  );
}

// ── Metric sub-component ──────────────────────────────────────────────────────

function Metric({
  icon,
  value,
  label,
  valueClass,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg bg-background/50 border border-border/30">
      <div className="flex items-center gap-0.5">
        {icon}
        <span className={cn("text-xs font-bold font-mono tabular-nums text-foreground", valueClass)}>
          {value}
        </span>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}
