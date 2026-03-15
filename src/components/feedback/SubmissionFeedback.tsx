import { CheckCircle2, XCircle, AlertTriangle, Loader2, Trophy, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AnimatedScore } from "@/components/leaderboard/AnimatedScore";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export type SubmissionState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "accepted";
      score: number;
      maxScore: number;
      totalTestCases: number;
      executionTime?: number;
    }
  | {
      status: "partial";
      score: number;
      maxScore: number;
      testCasesPassed: number;
      totalTestCases: number;
    }
  | {
      status: "failed";
      testCasesPassed: number;
      totalTestCases: number;
      error?: string;
    };

interface SubmissionFeedbackProps {
  state: SubmissionState;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Structured submission result card with status-specific animations.
 *
 * - Accepted:  emerald glow entrance (animate-submission-success)
 * - Failed:    horizontal shake   (animate-submission-error)
 * - Partial:   amber progress bar
 * - Running:   spinner
 *
 * Wrap the usage site in `aria-live="polite" aria-atomic="true"` for
 * screen reader announcements on state changes.
 */
export function SubmissionFeedback({ state, className }: SubmissionFeedbackProps) {
  if (state.status === "idle") return null;

  if (state.status === "running") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
          className,
        )}
        role="status"
        aria-label="Evaluating submission"
      >
        <Loader2 className="h-5 w-5 text-accent animate-spin flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Evaluating...</p>
          <p className="text-xs text-muted-foreground">Running against hidden test cases</p>
        </div>
      </div>
    );
  }

  if (state.status === "accepted") {
    const pct = state.maxScore > 0 ? Math.round((state.score / state.maxScore) * 100) : 100;
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-success/40 bg-success/5 p-4 animate-submission-success",
          className,
        )}
        role="status"
        aria-label={`Accepted. Score: ${state.score} out of ${state.maxScore}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-success">Accepted</span>
                <Trophy className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                All {state.totalTestCases} test case{state.totalTestCases !== 1 ? "s" : ""} passed
                {state.executionTime != null && ` · ${state.executionTime}ms`}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold font-mono text-success">
              +<AnimatedScore value={state.score} duration={800} />
            </div>
            <div className="text-xs text-muted-foreground">/ {state.maxScore} pts</div>
          </div>
        </div>
        {state.maxScore > 0 && (
          <Progress value={pct} className="mt-3 h-1.5 bg-success/20 [&>div]:bg-success" />
        )}
      </div>
    );
  }

  if (state.status === "partial") {
    const pct = state.totalTestCases > 0
      ? Math.round((state.testCasesPassed / state.totalTestCases) * 100)
      : 0;
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-warning/40 bg-warning/5 p-4",
          className,
        )}
        role="status"
        aria-label={`Partial credit. Score: ${state.score} out of ${state.maxScore}. Passed ${state.testCasesPassed} of ${state.totalTestCases} test cases.`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" aria-hidden="true" />
            <div>
              <span className="text-sm font-semibold text-warning">Partial Credit</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {state.testCasesPassed} / {state.totalTestCases} test cases passed
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold font-mono text-warning">
              +<AnimatedScore value={state.score} duration={600} />
            </div>
            <div className="text-xs text-muted-foreground">/ {state.maxScore} pts</div>
          </div>
        </div>
        <Progress value={pct} className="mt-3 h-1.5 bg-warning/20 [&>div]:bg-warning" />
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 animate-submission-error",
          className,
        )}
        role="alert"
        aria-label={`Wrong answer. Passed ${state.testCasesPassed} of ${state.totalTestCases} test cases.`}
      >
        <div className="flex items-start gap-2">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-destructive">Wrong Answer</span>
              <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                {state.testCasesPassed} / {state.totalTestCases} passed
              </span>
            </div>
            {state.error && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Show error output
                </summary>
                <pre className="mt-2 p-2.5 bg-muted rounded text-xs text-destructive overflow-x-auto max-h-32 font-mono leading-relaxed">
                  {state.error}
                </pre>
              </details>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Progress
            value={state.totalTestCases > 0 ? Math.round((state.testCasesPassed / state.totalTestCases) * 100) : 0}
            className="h-1.5 bg-destructive/20 [&>div]:bg-destructive"
          />
        </div>
      </div>
    );
  }

  return null;
}

// ── Utility: parse legacy consoleOutput string into SubmissionState ─────────

/**
 * Parses the legacy raw `consoleOutput` string (from the edge function) into
 * a `SubmissionState` object so it can be rendered by `<SubmissionFeedback>`.
 *
 * This is a best-effort parser — if the string cannot be parsed, it returns `idle`.
 */
export function parseConsoleOutputToSubmissionState(
  raw: string | null,
  maxScore: number,
): SubmissionState {
  if (!raw) return { status: "idle" };
  if (raw.trim() === "running") return { status: "running" };

  const lower = raw.toLowerCase();

  // Accepted pattern: "✅ Submission Accepted" or "accepted"
  if (lower.includes("accepted") && !lower.includes("wrong") && !lower.includes("failed")) {
    const scoreMatch = raw.match(/Score[:\s]+\+?(\d+)/i);
    const casesMatch = raw.match(/(\d+)\s*(?:hidden\s*)?test\s*cases?\s*passed/i);
    const timeMatch = raw.match(/(\d+)\s*ms/i);
    return {
      status: "accepted",
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : maxScore,
      maxScore,
      totalTestCases: casesMatch ? parseInt(casesMatch[1], 10) : 1,
      executionTime: timeMatch ? parseInt(timeMatch[1], 10) : undefined,
    };
  }

  // Partial pattern: "partial" or "partial credit" or "X/Y test cases passed"
  if (lower.includes("partial")) {
    const scoreMatch = raw.match(/Score[:\s]+\+?(\d+)/i);
    const passedMatch = raw.match(/(\d+)\s*\/\s*(\d+)/);
    return {
      status: "partial",
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
      maxScore,
      testCasesPassed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
      totalTestCases: passedMatch ? parseInt(passedMatch[2], 10) : 1,
    };
  }

  // Failed / wrong answer
  if (
    lower.includes("wrong") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("runtime") ||
    lower.includes("time limit") ||
    lower.includes("compilation")
  ) {
    const passedMatch = raw.match(/(\d+)\s*\/\s*(\d+)/);
    return {
      status: "failed",
      testCasesPassed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
      totalTestCases: passedMatch ? parseInt(passedMatch[2], 10) : 1,
      error: raw.length > 200 ? raw.slice(0, 200) + "…" : raw,
    };
  }

  return { status: "idle" };
}
