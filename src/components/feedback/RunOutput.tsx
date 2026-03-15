import { CheckCircle2, XCircle, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedTestCase {
  index: number;
  input?: string;
  expected?: string;
  actual?: string;
  status: "passed" | "failed" | "error" | "unknown";
  executionTime?: number;
}

interface RunOutputProps {
  /** Raw console output string from the edge function */
  output: string;
  className?: string;
}

// ── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parses the `━━━ Test Case N ━━━` formatted output string produced by the
 * edge function into structured test case objects.
 */
function parseRunOutput(raw: string): { cases: ParsedTestCase[]; rawFallback?: string } {
  const dividerPattern = /━+\s*Test Case\s+(\d+)\s*━+/i;
  const blocks = raw.split(dividerPattern);

  // No structured format — return raw
  if (blocks.length <= 1) {
    return { cases: [], rawFallback: raw };
  }

  const cases: ParsedTestCase[] = [];
  // blocks layout: [preamble, "1", block1content, "2", block2content, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const index = parseInt(blocks[i], 10);
    const content = blocks[i + 1] ?? "";
    const lower = content.toLowerCase();

    const inputMatch = content.match(/Input[:\s]*\n([\s\S]*?)(?=Expected|Actual|Status|Time|$)/i);
    const expectedMatch = content.match(/Expected[:\s]*\n?([\s\S]*?)(?=Actual|Status|Time|$)/i);
    const actualMatch = content.match(/(?:Your\s+)?(?:Output|Actual)[:\s]*\n?([\s\S]*?)(?=Status|Time|$)/i);
    const timeMatch = content.match(/(?:Time|Execution)[:\s]*(\d+(?:\.\d+)?)\s*ms/i);

    let status: ParsedTestCase["status"] = "unknown";
    if (lower.includes("✅") || lower.includes("passed") || lower.includes("correct")) {
      status = "passed";
    } else if (lower.includes("❌") || lower.includes("wrong") || lower.includes("failed")) {
      status = "failed";
    } else if (lower.includes("error") || lower.includes("runtime") || lower.includes("time limit")) {
      status = "error";
    }

    cases.push({
      index,
      input: inputMatch?.[1]?.trim(),
      expected: expectedMatch?.[1]?.trim(),
      actual: actualMatch?.[1]?.trim(),
      status,
      executionTime: timeMatch ? parseFloat(timeMatch[1]) : undefined,
    });
  }

  return { cases };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TestCaseRow({ tc }: { tc: ParsedTestCase }) {
  const statusConfig = {
    passed: { icon: CheckCircle2, color: "text-success", bg: "border-success/20 bg-success/5", label: "Passed" },
    failed: { icon: XCircle,      color: "text-destructive", bg: "border-destructive/20 bg-destructive/5", label: "Failed" },
    error:  { icon: Clock,        color: "text-warning", bg: "border-warning/20 bg-warning/5", label: "Error" },
    unknown: { icon: Clock,       color: "text-muted-foreground", bg: "border-border", label: "—" },
  } as const;

  const cfg = statusConfig[tc.status];
  const Icon = cfg.icon;

  return (
    <details className={cn("group rounded-md border p-3 text-xs", cfg.bg)}>
      <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", cfg.color)} aria-hidden="true" />
        <span className="font-medium">Test Case {tc.index}</span>
        <span className={cn("ml-auto font-mono", cfg.color)}>{cfg.label}</span>
        {tc.executionTime != null && (
          <span className="text-muted-foreground ml-2">{tc.executionTime}ms</span>
        )}
        <ChevronDown
          className="h-3.5 w-3.5 text-muted-foreground ml-1 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-3 space-y-2">
        {tc.input && (
          <div>
            <p className="text-muted-foreground mb-1 font-medium uppercase tracking-wide" style={{ fontSize: "0.65rem" }}>Input</p>
            <pre className="bg-muted rounded p-2 overflow-x-auto font-mono text-foreground">{tc.input}</pre>
          </div>
        )}
        {tc.expected && (
          <div>
            <p className="text-muted-foreground mb-1 font-medium uppercase tracking-wide" style={{ fontSize: "0.65rem" }}>Expected</p>
            <pre className="bg-muted rounded p-2 overflow-x-auto font-mono text-foreground">{tc.expected}</pre>
          </div>
        )}
        {tc.actual && (
          <div>
            <p className="text-muted-foreground mb-1 font-medium uppercase tracking-wide" style={{ fontSize: "0.65rem" }}>Your Output</p>
            <pre className={cn("rounded p-2 overflow-x-auto font-mono", tc.status === "passed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
              {tc.actual}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

/**
 * Parses and renders the edge function's `━━━ Test Case N ━━━` output format
 * as a collapsible list of structured test case cards.
 *
 * Falls back to a raw `<pre>` if the output has no structured format.
 */
export function RunOutput({ output, className }: RunOutputProps) {
  if (!output?.trim()) return null;

  const { cases, rawFallback } = parseRunOutput(output);

  if (rawFallback !== undefined) {
    return (
      <pre
        className={cn(
          "text-xs font-mono p-3 rounded-md bg-muted overflow-auto whitespace-pre-wrap break-words leading-relaxed",
          className,
        )}
      >
        {rawFallback}
      </pre>
    );
  }

  const passed = cases.filter((c) => c.status === "passed").length;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Sample test cases</span>
        <span className="font-mono">
          {passed}/{cases.length} passed
        </span>
      </div>
      {cases.map((tc) => (
        <TestCaseRow key={tc.index} tc={tc} />
      ))}
    </div>
  );
}
