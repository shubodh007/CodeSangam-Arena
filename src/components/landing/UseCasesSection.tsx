import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Zap,
  Briefcase,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { AnimatedScore } from "@/components/leaderboard/AnimatedScore";

// ── Data ──────────────────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

interface UseCase {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: StatItem[];
  testimonial: Testimonial;
}

const USE_CASES: UseCase[] = [
  {
    title: "University Coding Exams",
    description:
      "Replace paper-based programming exams with secure online assessments. Instant grading, anti-cheat monitoring, and automated score export to LMS.",
    icon: GraduationCap,
    stats: [
      { label: "Avg. class size", value: 45, suffix: " students" },
      { label: "Grading time saved", value: 90, suffix: "%" },
      { label: "Avg. exam duration", value: 2, suffix: " hours" },
    ],
    testimonial: {
      quote:
        "We moved from manual grading to CodeSangam Arena and saved 20 hours per exam. The anti-cheat system gives us full confidence in results.",
      author: "Prof. Sarah Chen",
      role: "Computer Science, UC Berkeley",
    },
  },
  {
    title: "Coding Bootcamp Assessments",
    description:
      "Evaluate student progress with weekly timed challenges. Track improvement over time and identify students who need extra support.",
    icon: Zap,
    stats: [
      { label: "Weekly challenges", value: 3, suffix: " contests" },
      { label: "Completion rate", value: 95, suffix: "%" },
      { label: "Cohort size", value: 25, suffix: " people" },
    ],
    testimonial: {
      quote:
        "The live leaderboard motivates students to push harder. Our graduation rates improved by 15% since adopting CodeSangam Arena.",
      author: "Michael Rodriguez",
      role: "Lead Instructor, Code Academy NYC",
    },
  },
  {
    title: "Corporate Hiring Contests",
    description:
      "Run technical screening rounds at scale. Invite 500+ candidates, auto-grade submissions, and shortlist top performers in hours—not weeks.",
    icon: Briefcase,
    stats: [
      { label: "Candidates per round", value: 300, suffix: "+" },
      { label: "Cost-per-hire reduction", value: 60, suffix: "%" },
      { label: "Screening duration", value: 3, suffix: " hours" },
    ],
    testimonial: {
      quote:
        "CodeSangam Arena replaced our expensive third-party tools. We now run monthly screening contests at a fraction of the cost.",
      author: "David Park",
      role: "Engineering Manager, TechCorp",
    },
  },
];

// ── Stat Item ─────────────────────────────────────────────────────────────────

function StatBubble({ label, value, suffix = "", isVisible }: StatItem & { isVisible: boolean }) {
  return (
    <div className="text-center space-y-0.5">
      <div className="text-2xl font-bold font-mono text-primary">
        {isVisible ? (
          <>
            <AnimatedScore value={value} duration={900} />
            <span>{suffix}</span>
          </>
        ) : (
          <span>0{suffix}</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Use Case Card ─────────────────────────────────────────────────────────────

interface UseCaseCardProps extends UseCase {
  reverse: boolean;
  isVisible: boolean;
  delay: number;
}

function UseCaseCard({
  title,
  description,
  icon: Icon,
  stats,
  testimonial,
  reverse,
  isVisible,
  delay,
}: UseCaseCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden reveal-hidden",
        isVisible && "reveal-visible",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <CardContent className={cn("p-0 grid md:grid-cols-[1fr_auto] gap-0")}>
        {/* Main content */}
        <div className={cn("p-6 md:p-8 space-y-6", reverse && "md:order-2")}>
          {/* Title row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
          </div>

          {/* Description */}
          <p className="text-foreground-secondary leading-relaxed">{description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            {stats.map((s) => (
              <StatBubble key={s.label} {...s} isVisible={isVisible} />
            ))}
          </div>

          {/* Testimonial */}
          <blockquote className="border-l-4 border-primary/50 pl-4 py-1 bg-primary/5 rounded-r-lg space-y-1">
            <p className="text-sm italic text-foreground-secondary leading-relaxed">
              "{testimonial.quote}"
            </p>
            <footer className="text-xs text-muted-foreground">
              <strong className="text-foreground/70">{testimonial.author}</strong>
              {" · "}
              {testimonial.role}
            </footer>
          </blockquote>
        </div>

        {/* Decorative side panel */}
        <div
          className={cn(
            "hidden md:flex flex-col items-center justify-center gap-4 w-40 bg-gradient-to-b from-primary/5 to-primary/10 border-l border-border/50 p-6",
            reverse && "md:order-1 border-l-0 border-r border-border/50",
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                <div className={cn("h-1.5 rounded bg-foreground/10", i === 1 ? "w-14" : i === 2 ? "w-10" : "w-12")} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function UseCasesSection() {
  const { ref, isVisible } = useScrollReveal(0.08);

  return (
    <section id="use-cases" className="py-24 bg-background-secondary/20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 text-primary border-primary/30 bg-primary/5">
            Use Cases
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Who Uses CodeSangam Arena?
          </h2>
          <p className="text-foreground-secondary max-w-xl mx-auto">
            From universities to bootcamps to Fortune 500 companies—CodeSangam Arena scales to your needs.
          </p>
        </div>

        {/* Cards */}
        <div ref={ref} className="space-y-8 max-w-4xl mx-auto">
          {USE_CASES.map((useCase, i) => (
            <UseCaseCard
              key={useCase.title}
              {...useCase}
              reverse={i % 2 !== 0}
              isVisible={isVisible}
              delay={i * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
