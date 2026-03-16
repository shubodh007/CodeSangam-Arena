import { cn } from "@/lib/utils";
import { Trophy, CheckCircle2, Code2, Users, Zap } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

interface ActivityEvent {
  icon: typeof Trophy;
  iconColor: string;
  text: string;
  time: string;
}

const ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    icon: Trophy,
    iconColor: "text-yellow-400",
    text: "ACM_Coder solved \"Two Sum\" · 300 pts",
    time: "just now",
  },
  {
    icon: CheckCircle2,
    iconColor: "text-success",
    text: "ByteWiz passed all 10 test cases on \"Binary Search\"",
    time: "12 s ago",
  },
  {
    icon: Users,
    iconColor: "text-primary",
    text: "Prof. Sharma started a new contest · 32 students joined",
    time: "1 min ago",
  },
  {
    icon: Code2,
    iconColor: "text-cyan-400",
    text: "Looper_99 submitted Python solution for \"Graph DFS\"",
    time: "2 min ago",
  },
  {
    icon: Zap,
    iconColor: "text-amber-400",
    text: "AlgoKing climbed from rank 8 → 3 on Spring 2026 Final",
    time: "3 min ago",
  },
  {
    icon: CheckCircle2,
    iconColor: "text-success",
    text: "Dev Bootcamp NY: 28 / 30 students submitted",
    time: "4 min ago",
  },
  {
    icon: Trophy,
    iconColor: "text-yellow-400",
    text: "n00bCoder solved their first problem ever 🎉",
    time: "5 min ago",
  },
  {
    icon: Code2,
    iconColor: "text-cyan-400",
    text: "Java_Knight aced \"Knapsack DP\" with O(n²) solution",
    time: "6 min ago",
  },
];

// Double up so the CSS loop feels seamless
const DOUBLED = [...ACTIVITY_EVENTS, ...ACTIVITY_EVENTS];

// ── Sub-component ─────────────────────────────────────────────────────────────

function EventPill({ icon: Icon, iconColor, text, time }: ActivityEvent) {
  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/60 bg-background-secondary/60 backdrop-blur-sm flex-shrink-0 whitespace-nowrap">
      <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", iconColor)} />
      <span className="text-xs text-foreground-secondary">{text}</span>
      <span className="text-[10px] text-muted-foreground border-l border-border pl-2">{time}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Horizontal auto-scrolling ticker showing simulated live contest activity.
 * CSS-only infinite scroll — no framer-motion.
 */
export function LiveActivityTicker() {
  return (
    <section className="py-10 border-y border-border/40 bg-background-secondary/10 overflow-hidden" aria-label="Platform activity highlights">
      {/* Label */}
      <div className="container mx-auto px-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Platform Highlights
          </span>
        </div>
      </div>

      {/* Scrolling track */}
      <div className="relative">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Scrolling content */}
        <div
          className="flex gap-3 w-max ticker-track"
          style={{
            animation: "ticker-scroll 60s linear infinite",
          }}
        >
          {DOUBLED.map((event, i) => (
            <EventPill key={i} {...event} />
          ))}
        </div>
      </div>

      {/* Inline keyframe — injected once so it works without tailwind.config changes */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
