import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCustomTests } from "@/hooks/useCustomTests";
import type { CustomTestResult } from "@/types/customTests";

interface CustomTestPanelProps {
  sessionId: string;
  problemId: string;
  code: string;
  language: string;
  /** Disabled when contest has expired or editor is read-only */
  disabled?: boolean;
}

// ─── Individual test case card ─────────────────────────────────────────────

interface TestCardProps {
  index: number;
  input: string;
  expectedOutput: string;
  result: CustomTestResult | undefined;
  isRunning: boolean;
  canDelete: boolean;
  onInputChange: (v: string) => void;
  onExpectedChange: (v: string) => void;
  onDelete: () => void;
}

function StatusIcon({ result }: { result: CustomTestResult | undefined }) {
  if (!result) return null;
  if (result.status === "timeout")
    return <Clock className="h-3.5 w-3.5 text-yellow-400" aria-label="Timeout" />;
  if (result.status === "error")
    return <XCircle className="h-3.5 w-3.5 text-red-400" aria-label="Error" />;
  if (result.passed === true)
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-label="Passed" />;
  if (result.passed === false)
    return <XCircle className="h-3.5 w-3.5 text-red-400" aria-label="Wrong answer" />;
  // success with no expected output
  return <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" aria-label="Ran successfully" />;
}

function TestCard({
  index,
  input,
  expectedOutput,
  result,
  isRunning,
  canDelete,
  onInputChange,
  onExpectedChange,
  onDelete,
}: TestCardProps) {
  const hasResult = !!result;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        hasResult && result.status === "success" && result.passed === true
          ? "border-green-800/60"
          : hasResult && (result.status === "error" || result.passed === false)
          ? "border-red-800/60"
          : hasResult && result.status === "timeout"
          ? "border-yellow-800/60"
          : "border-border",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background-secondary/40 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Test {index + 1}
          </span>
          <StatusIcon result={result} />
          {hasResult && (
            <span className="text-[10px] text-muted-foreground">{result.executionTime}ms</span>
          )}
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isRunning}
            aria-label={`Remove test case ${index + 1}`}
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 select-text">
        {/* Input */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">
            Input
          </label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Enter stdin here..."
            disabled={isRunning}
            rows={3}
            spellCheck={false}
            className="w-full resize-y rounded border border-border bg-[hsl(var(--editor-bg))] px-2.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 disabled:opacity-60 min-h-[56px]"
          />
        </div>

        {/* Expected output (optional) */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">
            Expected output{" "}
            <span className="normal-case text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            value={expectedOutput}
            onChange={(e) => onExpectedChange(e.target.value)}
            placeholder="Leave blank to skip pass/fail check"
            disabled={isRunning}
            rows={2}
            spellCheck={false}
            className="w-full resize-y rounded border border-border bg-[hsl(var(--editor-bg))] px-2.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 disabled:opacity-60 min-h-[40px]"
          />
        </div>

        {/* Result */}
        {hasResult && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Actual output
              </span>
              <Badge
                variant={result.status === "success" ? "default" : "destructive"}
                className="text-[10px] px-1 py-0 h-4"
              >
                {result.status}
              </Badge>
              {result.engine && (
                <span className="text-[10px] text-muted-foreground/60">via {result.engine}</span>
              )}
            </div>
            <pre
              className={cn(
                "rounded px-2.5 py-2 font-mono text-xs whitespace-pre-wrap break-all border",
                result.status === "success"
                  ? "bg-green-950/40 border-green-800/40 text-green-300"
                  : result.status === "timeout"
                  ? "bg-yellow-950/40 border-yellow-800/40 text-yellow-300"
                  : "bg-red-950/40 border-red-800/40 text-red-300",
              )}
            >
              {result.actualOutput || "(empty)"}
            </pre>

            {/* Pass/fail verdict */}
            {result.passed !== null && (
              <div
                className={cn(
                  "text-[11px] font-medium px-2 py-1 rounded",
                  result.passed
                    ? "bg-green-950/50 text-green-300"
                    : "bg-red-950/50 text-red-300",
                )}
              >
                {result.passed ? "Output matches expected" : "Output does not match expected"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

export function CustomTestPanel({
  sessionId,
  problemId,
  code,
  language,
  disabled = false,
}: CustomTestPanelProps) {
  const {
    testCases,
    results,
    isRunning,
    isSaving,
    isLoading,
    runTests,
    saveTests,
    addTestCase,
    removeTestCase,
    updateTestCase,
  } = useCustomTests(sessionId, problemId);

  // If code or language changes and we have old results, clear them so they
  // don't show stale pass/fail verdicts.
  useEffect(() => {
    // intentionally empty — the hook handles result clearing per-field change
  }, [code, language]);

  const handleRun = () => {
    if (!disabled) runTests(code, language);
  };

  const validCount = testCases.filter((tc) => tc.input.trim()).length;

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--console-bg))]">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Custom Tests</span>
          <Badge variant="outline" className="text-[10px] px-1.5 h-4">
            {testCases.length}/10
          </Badge>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={saveTests}
            disabled={isRunning || isSaving || disabled || validCount === 0}
            title="Save test cases (persists after reload)"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            <span className="ml-1">Save</span>
          </Button>

          <Button
            variant="arena-secondary"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={handleRun}
            disabled={isRunning || disabled || validCount === 0}
            title="Run code against custom test cases (does not count as a submission)"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            <span className="ml-1">{isRunning ? "Running…" : "Run"}</span>
          </Button>
        </div>
      </div>

      {/* ── Rate-limit notice ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground">
          Custom runs don't count as submissions. Limit: 10 runs/min.
        </p>
      </div>

      {/* ── Test case list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {testCases.map((tc, i) => (
          <TestCard
            key={tc.id ?? i}
            index={i}
            input={tc.input}
            expectedOutput={tc.expectedOutput}
            result={results[i]}
            isRunning={isRunning}
            canDelete={testCases.length > 1}
            onInputChange={(v) => updateTestCase(i, "input", v)}
            onExpectedChange={(v) => updateTestCase(i, "expectedOutput", v)}
            onDelete={() => removeTestCase(i)}
          />
        ))}

        {/* Add test case */}
        {testCases.length < 10 && (
          <button
            onClick={addTestCase}
            disabled={isRunning || disabled}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add test case
          </button>
        )}
      </div>
    </div>
  );
}
