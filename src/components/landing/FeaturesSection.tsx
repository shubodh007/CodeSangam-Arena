import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Cpu,
  TrendingUp,
  Code2,
  Building2,
  Globe,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

interface Feature {
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  details: string[];
}

const FEATURES: Feature[] = [
  {
    category: "Contest Security",
    title: "Military-Grade Anti-Cheat",
    description:
      "Fullscreen enforcement, tab detection, clipboard monitoring, and DevTools blocking ensure every participant competes fairly.",
    icon: Shield,
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-500",
    details: [
      "Auto-disqualification after repeated violations",
      "Real-time violation tracking for admins",
      "Browser fingerprinting to catch multi-session abuse",
    ],
  },
  {
    category: "Code Execution",
    title: "Enterprise-Grade Sandbox",
    description:
      "Powered by Judge0 → Piston fallback with isolated containers. Run Python, Java, C, C++, and Go with millisecond latency.",
    icon: Cpu,
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-500",
    details: [
      "5 programming languages supported",
      "2-second execution time limit per test case",
      "256 MB memory limit with overflow protection",
    ],
  },
  {
    category: "Live Leaderboard",
    title: "WebSocket Real-Time Updates",
    description:
      "Watch ranks change instantly as students submit—no page refresh needed. Sub-second latency via Supabase Realtime.",
    icon: TrendingUp,
    gradientFrom: "from-green-500",
    gradientTo: "to-emerald-500",
    details: [
      "Animated rank-change indicators (↑ / ↓)",
      "Filters: All, Active, Disqualified",
      "Export leaderboard to CSV in one click",
    ],
  },
  {
    category: "Professional Editor",
    title: "Monaco Code Editor",
    description:
      "The same editor powering VS Code. Syntax highlighting, bracket matching, and auto-indentation for a pro experience.",
    icon: Code2,
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-500",
    details: [
      "Custom dark theme optimised for long sessions",
      "Auto-save every 30 s to prevent data loss",
      "Ctrl+R to run, Ctrl+Enter to submit",
    ],
  },
  {
    category: "Admin Dashboard",
    title: "Institutional Management",
    description:
      "Create unlimited contests, monitor student progress, view all submissions, and generate reports—from one dashboard.",
    icon: Building2,
    gradientFrom: "from-yellow-500",
    gradientTo: "to-amber-500",
    details: [
      "Run 10+ contests simultaneously",
      "Download any student's code submission",
      "Analytics: avg score, solve rate, time distribution",
    ],
  },
  {
    category: "Accessibility",
    title: "Works Everywhere",
    description:
      "100% browser-based. No downloads, no plugins. Works on any OS with Chrome, Firefox, Safari, or Edge.",
    icon: Globe,
    gradientFrom: "from-indigo-500",
    gradientTo: "to-violet-500",
    details: [
      "Responsive for desktop and laptop",
      "WCAG 2.1 AA compliant",
      "Keyboard-navigable with shortcut overlay",
    ],
  },
];

// ── Sub-component ─────────────────────────────────────────────────────────────

interface FeatureCardProps extends Feature {
  isVisible: boolean;
  delay: number;
}

function FeatureCard({
  category,
  title,
  description,
  icon: Icon,
  gradientFrom,
  gradientTo,
  details,
  isVisible,
  delay,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 reveal-hidden",
        isVisible && "reveal-visible",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradient hover overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 bg-gradient-to-br",
          gradientFrom,
          gradientTo,
        )}
      />

      <CardHeader className="pb-3">
        {/* Icon */}
        <div
          className={cn(
            "inline-flex items-center justify-center w-11 h-11 rounded-lg mb-3 bg-gradient-to-br",
            gradientFrom,
            gradientTo,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Category badge */}
        <Badge variant="outline" className="w-fit mb-1 text-[10px] text-muted-foreground border-border/60">
          {category}
        </Badge>

        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-foreground-secondary leading-relaxed">{description}</p>

        <ul className="space-y-1.5">
          {details.map((detail) => (
            <li key={detail} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal(0.08);

  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 text-primary border-primary/30 bg-primary/5">
            Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Built for Competitive Programming
          </h2>
          <p className="text-foreground-secondary max-w-xl mx-auto">
            Everything you need to run professional coding contests—from proctoring to grading to analytics.
          </p>
        </div>

        {/* Grid */}
        <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              isVisible={isVisible}
              delay={i * 70}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
