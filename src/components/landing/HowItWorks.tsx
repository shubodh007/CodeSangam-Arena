import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link2,
  Maximize2,
  Code2,
  Trophy,
  PlusCircle,
  Share2,
  Eye,
  Download,
  Users,
  Shield,
  type LucideIcon,
} from "lucide-react";

// ── Mockup Previews ─────────────────────────────────────────────────────────

function EntryMockup() {
  return (
    <MockupBrowser title="Join Contest">
      <div className="p-4 space-y-3">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <div className="h-3 w-32 bg-foreground/20 rounded mx-auto" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-16 bg-foreground/10 rounded" />
          <div className="h-8 rounded border border-border bg-background-secondary/50" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-20 bg-foreground/10 rounded" />
          <div className="h-8 rounded border border-border bg-background-secondary/50" />
        </div>
        <div className="h-8 w-full rounded bg-primary/80 flex items-center justify-center">
          <div className="h-2 w-16 bg-white/60 rounded" />
        </div>
      </div>
    </MockupBrowser>
  );
}

function FullscreenMockup() {
  return (
    <MockupBrowser title="Fullscreen Prompt">
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 bg-background-secondary/30">
        <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
          <Maximize2 className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <div className="h-2.5 w-28 bg-foreground/20 rounded mx-auto" />
          <div className="h-2 w-36 bg-foreground/10 rounded mx-auto" />
          <div className="h-2 w-24 bg-foreground/10 rounded mx-auto" />
        </div>
        <div className="h-7 w-24 rounded bg-primary/80" />
      </div>
    </MockupBrowser>
  );
}

function EditorMockup() {
  return (
    <MockupBrowser title="Problem Solver">
      <div className="grid grid-cols-2 h-full gap-0.5">
        {/* Problem pane */}
        <div className="p-2 space-y-1.5 border-r border-border">
          <div className="h-2 w-20 bg-primary/40 rounded" />
          <div className="h-1.5 w-full bg-foreground/10 rounded" />
          <div className="h-1.5 w-4/5 bg-foreground/10 rounded" />
          <div className="h-1.5 w-full bg-foreground/10 rounded" />
          <div className="h-1.5 w-3/5 bg-foreground/10 rounded" />
          <div className="h-1.5 w-full bg-foreground/10 rounded" />
          <div className="mt-2 h-1.5 w-16 bg-foreground/15 rounded" />
          <div className="space-y-0.5 pl-2">
            <div className="h-1.5 w-24 bg-success/30 rounded font-mono" />
            <div className="h-1.5 w-20 bg-success/30 rounded font-mono" />
          </div>
        </div>
        {/* Code editor pane */}
        <div className="p-2 space-y-1 font-mono bg-background">
          <div className="h-1.5 w-16 bg-blue-400/40 rounded" />
          <div className="h-1.5 w-24 bg-foreground/15 rounded ml-2" />
          <div className="h-1.5 w-20 bg-foreground/15 rounded ml-2" />
          <div className="h-1.5 w-28 bg-green-400/30 rounded ml-4" />
          <div className="h-1.5 w-16 bg-foreground/15 rounded ml-2" />
          <div className="h-1.5 w-4 bg-foreground/15 rounded" />
        </div>
      </div>
    </MockupBrowser>
  );
}

function LeaderboardMockup() {
  const rows = [
    { rank: 1, width: "w-24", score: "300" },
    { rank: 2, width: "w-20", score: "250" },
    { rank: 3, width: "w-16", score: "200" },
  ];
  return (
    <MockupBrowser title="Live Leaderboard">
      <div className="p-2 space-y-1.5">
        <div className="flex justify-between items-center pb-1 border-b border-border">
          <div className="h-2 w-16 bg-foreground/20 rounded" />
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <div className="h-1.5 w-6 bg-success/50 rounded" />
          </div>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2 p-1 rounded bg-background-secondary/30">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                row.rank === 1 && "bg-yellow-500/20 text-yellow-400",
                row.rank === 2 && "bg-slate-400/20 text-slate-300",
                row.rank === 3 && "bg-amber-600/20 text-amber-400",
              )}
            >
              {row.rank}
            </div>
            <div className={cn("h-1.5 bg-foreground/15 rounded", row.width)} />
            <div className="ml-auto h-2 w-8 bg-primary/40 rounded text-[8px]" />
          </div>
        ))}
      </div>
    </MockupBrowser>
  );
}

function AdminCreateMockup() {
  return (
    <MockupBrowser title="Create Contest">
      <div className="p-3 space-y-2">
        <div className="space-y-1">
          <div className="h-1.5 w-16 bg-foreground/10 rounded" />
          <div className="h-7 rounded border border-border bg-background-secondary/50" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="h-1.5 w-12 bg-foreground/10 rounded" />
            <div className="h-7 rounded border border-border bg-background-secondary/50" />
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-14 bg-foreground/10 rounded" />
            <div className="h-7 rounded border border-border bg-background-secondary/50" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-16 bg-foreground/10 rounded" />
          <div className="h-10 rounded border border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
            <div className="h-1.5 w-24 bg-primary/30 rounded" />
          </div>
        </div>
        <div className="h-7 rounded bg-primary/80" />
      </div>
    </MockupBrowser>
  );
}

function AdminShareMockup() {
  return (
    <MockupBrowser title="Share Contest Link">
      <div className="p-3 space-y-3">
        <div className="p-2 rounded bg-primary/5 border border-primary/20 flex items-center gap-2">
          <div className="h-2 w-full bg-primary/20 rounded font-mono text-[8px]" />
          <div className="h-5 w-8 rounded bg-primary/60 flex-shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Email", "LMS", "Chat"].map((l) => (
            <div key={l} className="p-1.5 rounded border border-border bg-background-secondary/30 text-center">
              <div className="h-1.5 w-8 bg-foreground/10 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="text-center">
          <div className="h-1.5 w-32 bg-foreground/10 rounded mx-auto" />
        </div>
      </div>
    </MockupBrowser>
  );
}

function AdminMonitorMockup() {
  return (
    <MockupBrowser title="Live Monitor">
      <div className="p-2 space-y-1.5">
        <div className="grid grid-cols-3 gap-1 pb-1.5 border-b border-border">
          {["24", "18", "3"].map((v, i) => (
            <div key={i} className="text-center space-y-0.5">
              <div className="h-3 font-mono text-[10px] text-primary font-bold text-center">{v}</div>
              <div className="h-1.5 w-12 bg-foreground/10 rounded mx-auto" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <div className="h-1.5 w-12 bg-foreground/15 rounded" />
            <div className="h-1.5 w-8 bg-success/40 rounded ml-auto" />
          </div>
        ))}
      </div>
    </MockupBrowser>
  );
}

function AdminResultsMockup() {
  return (
    <MockupBrowser title="Contest Results">
      <div className="p-2 space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="h-2 w-16 bg-foreground/20 rounded" />
          <div className="h-5 w-14 rounded bg-primary/60 flex items-center justify-center">
            <Download className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          {[85, 70, 60, 45].map((score, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-1.5 w-12 bg-foreground/10 rounded" />
              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="h-1.5 w-6 bg-foreground/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </MockupBrowser>
  );
}

// ── MockupBrowser Shell ──────────────────────────────────────────────────────

function MockupBrowser({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-lg bg-background">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-background-secondary border-b border-border">
        <div className="h-2 w-2 rounded-full bg-destructive/60" />
        <div className="h-2 w-2 rounded-full bg-warning/60" />
        <div className="h-2 w-2 rounded-full bg-success/60" />
        <div className="flex-1 h-4 mx-4 rounded bg-background border border-border flex items-center px-2">
          <div className="h-1.5 w-20 bg-foreground/10 rounded" />
        </div>
        <span className="text-[9px] text-muted-foreground font-medium">{title}</span>
      </div>
      {/* Content */}
      <div className="h-36">{children}</div>
    </div>
  );
}

// ── Step Card ────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
  mockup: React.ReactNode;
  reverse?: boolean;
  isVisible?: boolean;
  delay?: number;
}

function StepCard({ step, title, description, icon: Icon, mockup, reverse, isVisible, delay }: StepCardProps) {
  return (
    <div
      className={cn(
        "grid md:grid-cols-2 gap-8 items-center reveal-hidden",
        isVisible && "reveal-visible",
        reverse && "md:[&>*:first-child]:md:order-2",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Content */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 border-2 border-primary/40 text-primary font-bold text-lg">
            {step}
          </div>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-foreground-secondary leading-relaxed">{description}</p>
      </div>

      {/* Mockup */}
      <div className={cn("relative", reverse && "md:order-first")}>
        <div className="relative hover:shadow-xl transition-shadow duration-300">
          {mockup}
        </div>
        <div className="absolute -inset-3 bg-gradient-to-br from-primary/10 to-success/10 blur-2xl -z-10 opacity-60" />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const STUDENT_STEPS: Omit<StepCardProps, "isVisible" | "delay">[] = [
  {
    step: 1,
    title: "Enter Contest Code",
    description:
      "Your instructor shares a unique contest link. Click it and enter your name—no account, no signup required.",
    icon: Link2,
    mockup: <EntryMockup />,
  },
  {
    step: 2,
    title: "Enter Fullscreen Mode",
    description:
      "CodeSangam Arena activates proctored mode. Your screen locks to the contest—ensuring fair play for everyone.",
    icon: Maximize2,
    mockup: <FullscreenMockup />,
    reverse: true,
  },
  {
    step: 3,
    title: "Solve Problems",
    description:
      "Read problems, write code in our Monaco editor (same engine as VS Code), and test with sample inputs—all in one screen.",
    icon: Code2,
    mockup: <EditorMockup />,
  },
  {
    step: 4,
    title: "Submit & Watch Your Rank Climb",
    description:
      "Submit solutions to be graded instantly. Watch your rank update on the live leaderboard as you solve more problems.",
    icon: Trophy,
    mockup: <LeaderboardMockup />,
    reverse: true,
  },
];

const ADMIN_STEPS: Omit<StepCardProps, "isVisible" | "delay">[] = [
  {
    step: 1,
    title: "Create Contest in 2 Minutes",
    description:
      "Add problems, configure duration, and set scoring rules—then click Create. Our dashboard makes setup instant.",
    icon: PlusCircle,
    mockup: <AdminCreateMockup />,
  },
  {
    step: 2,
    title: "Share Link — No Student Accounts Needed",
    description:
      "Generate a unique contest link. Share via email, LMS, or classroom chat. Students join with just their name.",
    icon: Share2,
    mockup: <AdminShareMockup />,
    reverse: true,
  },
  {
    step: 3,
    title: "Monitor Live in Real-Time",
    description:
      "Watch submissions live. Track who's solving what, view anti-cheat warnings, and see the leaderboard update instantly.",
    icon: Eye,
    mockup: <AdminMonitorMockup />,
  },
  {
    step: 4,
    title: "Review & Export Results",
    description:
      "After the contest, view all submissions, download code files, export leaderboard CSV, and analyze performance metrics.",
    icon: Download,
    mockup: <AdminResultsMockup />,
    reverse: true,
  },
];

export function HowItWorks() {
  const { ref: studentRef, isVisible: studentVisible } = useScrollReveal(0.1);
  const { ref: adminRef, isVisible: adminVisible } = useScrollReveal(0.1);

  return (
    <section id="how-it-works" className="py-24 bg-background-secondary/20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 text-primary border-primary/30 bg-primary/5">
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Running a Contest Is Simple
          </h2>
          <p className="text-foreground-secondary max-w-xl mx-auto">
            Whether you're a student joining your first contest or an admin organizing your tenth,
            CodeSangam Arena makes competitive programming accessible.
          </p>
        </div>

        <Tabs defaultValue="student" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 mb-16">
            <TabsTrigger value="student" className="gap-2">
              <Users className="h-4 w-4" />
              For Students
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              For Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <div ref={studentRef} className="space-y-20">
              {STUDENT_STEPS.map((step, i) => (
                <StepCard
                  key={step.step}
                  {...step}
                  isVisible={studentVisible}
                  delay={i * 80}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="admin">
            <div ref={adminRef} className="space-y-20">
              {ADMIN_STEPS.map((step, i) => (
                <StepCard
                  key={step.step}
                  {...step}
                  isVisible={adminVisible}
                  delay={i * 80}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
