import { Zap, Code2, Users, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { AnimatedScore } from "@/components/leaderboard/AnimatedScore";
import { cn } from "@/lib/utils";

// ── Data ───────────────────────────────────────────────────────────────────

interface StatItem {
  icon: LucideIcon;
  value: number;
  suffix: string;
  label: string;
  decimals?: boolean;
}

const STATS: StatItem[] = [
  {
    icon: Users,
    value: 500,
    suffix: "+",
    label: "Students per contest",
  },
  {
    icon: Code2,
    value: 10,
    suffix: "",
    label: "Languages supported",
  },
  {
    icon: Zap,
    value: 999,
    suffix: "%",
    label: "Platform uptime",
  },
  {
    icon: Clock,
    value: 2,
    suffix: "s",
    label: "Avg. execution time",
  },
];

// ── Sub-component ──────────────────────────────────────────────────────────

interface StatCardProps extends StatItem {
  isVisible: boolean;
  delay: number;
}

function StatCard({ icon: Icon, value, suffix, label, isVisible, delay }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-6 reveal-hidden",
        isVisible && "reveal-visible",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="inline-flex p-3 rounded-full bg-primary/10">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <div className="text-3xl font-bold font-mono text-foreground">
        {isVisible ? (
          <>
            <AnimatedScore value={value} duration={1200} />
            <span>{suffix}</span>
          </>
        ) : (
          <span>0{suffix}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground text-center">{label}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

/**
 * Stats counter section for the landing page.
 * Counters animate up when the section scrolls into view,
 * using the existing AnimatedScore + useScrollReveal hooks.
 */
export function StatsSection() {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <section className="py-16 bg-background-secondary/40 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border/30 divide-y md:divide-y-0"
        >
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              {...stat}
              isVisible={isVisible}
              delay={i * 120}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
