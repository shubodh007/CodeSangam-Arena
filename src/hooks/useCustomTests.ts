import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CustomTestCase, CustomTestResult, CustomTestRunResponse } from "@/types/customTests";

const EMPTY_TEST: CustomTestCase = { input: "", expectedOutput: "" };

export function useCustomTests(sessionId: string, problemId: string) {
  const { toast } = useToast();

  const [testCases, setTestCases] = useState<CustomTestCase[]>([{ ...EMPTY_TEST }]);
  const [results, setResults] = useState<(CustomTestResult | undefined)[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Load saved test cases on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !problemId) return;

    setIsLoading(true);
    supabase.functions
      .invoke("execute-code", {
        body: { mode: "load-custom-tests", sessionId, problemId },
      })
      .then(({ data, error }) => {
        if (error || !data?.success) return; // silently fall back to empty
        if (data.testCases?.length > 0) {
          setTestCases(data.testCases as CustomTestCase[]);
          setResults(new Array(data.testCases.length).fill(undefined));
        }
      })
      .finally(() => setIsLoading(false));
  }, [sessionId, problemId]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const runTests = useCallback(
    async (code: string, language: string) => {
      const validTests = testCases.filter((tc) => tc.input.trim());
      if (!validTests.length) {
        toast({ title: "No input", description: "Add at least one test case with input." });
        return;
      }
      if (!code.trim()) {
        toast({ title: "Empty code", description: "Write some code before running tests." });
        return;
      }

      setIsRunning(true);
      setResults(new Array(testCases.length).fill(undefined));

      try {
        const { data, error } = await supabase.functions.invoke("execute-code", {
          body: { mode: "custom-test", sessionId, problemId, code, language, customInputs: validTests },
        });

        if (error) {
          // Supabase wraps non-2xx responses as a generic FunctionsHttpError.
          // Try to pull the real error message out of the response body first.
          let message = error.message;
          try {
            const body = await (error as { context?: Response }).context?.json();
            if (body?.error) message = body.error;
          } catch {
            // ignore — fall back to the generic message
          }
          throw new Error(message);
        }

        const res = data as CustomTestRunResponse;
        if (!res.success) {
          throw new Error(res.error || "Execution failed");
        }

        // Align results back to full testCases array (skipping empties that weren't sent)
        const aligned: (CustomTestResult | undefined)[] = [];
        let resultIndex = 0;
        for (const tc of testCases) {
          if (tc.input.trim()) {
            aligned.push(res.results[resultIndex++]);
          } else {
            aligned.push(undefined);
          }
        }
        setResults(aligned);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to run tests";
        // Rate limit gets a distinct UI hint
        if (msg.toLowerCase().includes("rate limit")) {
          toast({ title: "Rate limit reached", description: msg, variant: "destructive", duration: 6000 });
        } else {
          toast({ title: "Run failed", description: msg, variant: "destructive" });
        }
      } finally {
        setIsRunning(false);
      }
    },
    [sessionId, problemId, testCases, toast],
  );

  const saveTests = useCallback(async () => {
    const validTests = testCases.filter((tc) => tc.input.trim());
    if (!validTests.length) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: { mode: "save-custom-tests", sessionId, problemId, testCases: validTests },
      });
      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {}
        throw new Error(message);
      }
      if (!data?.success) throw new Error(data?.error || "Save failed");
      toast({ title: "Saved", description: "Test cases saved and will persist after reload." });
    } catch {
      toast({ title: "Save failed", description: "Could not save test cases.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, problemId, testCases, toast]);

  // ── Test-case list management ────────────────────────────────────────────────

  const addTestCase = useCallback(() => {
    setTestCases((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, { ...EMPTY_TEST }];
    });
    setResults((prev) => [...prev, undefined]);
  }, []);

  const removeTestCase = useCallback(
    async (index: number) => {
      const test = testCases[index];

      // Update state first for instant UI feedback
      setTestCases((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        return updated.length > 0 ? updated : [{ ...EMPTY_TEST }];
      });
      setResults((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        return updated.length > 0 ? updated : [undefined];
      });

      // Async delete from DB (fire-and-forget; don't block the UI)
      if (test.id) {
        await supabase.functions.invoke("execute-code", {
          body: { mode: "delete-custom-test", sessionId, problemId, testId: test.id },
        });
      }
    },
    [sessionId, problemId, testCases],
  );

  const updateTestCase = useCallback(
    (index: number, field: "input" | "expectedOutput", value: string) => {
      setTestCases((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
      // Clear the result for this test when the input changes so stale results aren't shown
      if (field === "input") {
        setResults((prev) => {
          const updated = [...prev];
          updated[index] = undefined;
          return updated;
        });
      }
    },
    [],
  );

  return {
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
  };
}
