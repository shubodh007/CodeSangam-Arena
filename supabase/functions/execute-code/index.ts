import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeCode, normalizeOutput, isLanguageSupported } from "./execution_controller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Submission / run rate limiter (existing)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_EXECUTIONS_PER_SESSION = 500;

function checkRateLimit(sessionId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count };
}

// Custom-test rate limiter (separate, tighter limit)
const customTestRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const CUSTOM_RATE_LIMIT_PER_MINUTE = 10;

function checkCustomTestRateLimit(sessionId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = customTestRateLimitMap.get(sessionId);
  if (!entry || now > entry.resetTime) {
    customTestRateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= CUSTOM_RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteRequest {
  code?: string;
  language?: string;
  input?: string;
  mode:
    | "run"
    | "submit"
    | "custom-test"
    | "load-custom-tests"
    | "save-custom-tests"
    | "delete-custom-test"
    | "heartbeat";
  sessionId?: string;
  problemId?: string;
  // heartbeat fields
  isTyping?: boolean;
  currentProblemId?: string | null;
  // custom-test fields
  customInputs?: Array<{ input: string; expectedOutput?: string }>;
  // save-custom-tests fields
  testCases?: Array<{ id?: string; input: string; expectedOutput?: string }>;
  // delete-custom-test fields
  testId?: string;
}

// ─── Session validation ───────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function validateSession(
  supabase: any,
  sessionId: string,
  problemId?: string,
): Promise<{ valid: boolean; error?: string; contestId?: string }> {
  const { data: session, error: sessionError } = await supabase
    .from("student_sessions")
    .select("id, contest_id, is_disqualified, ended_at, started_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) return { valid: false, error: "Invalid session" };

  const s = session as {
    id: string;
    contest_id: string;
    is_disqualified: boolean;
    ended_at: string | null;
    started_at: string;
  };
  if (s.is_disqualified) return { valid: false, error: "Session is disqualified" };
  if (s.ended_at) return { valid: false, error: "Session has ended" };

  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id, is_active, duration_minutes")
    .eq("id", s.contest_id)
    .single();

  if (contestError || !contest) return { valid: false, error: "Contest not found" };

  const c = contest as { id: string; is_active: boolean; duration_minutes: number };
  if (!c.is_active) return { valid: false, error: "Contest is not active" };

  const sessionStart = new Date(s.started_at).getTime();
  if (Date.now() > sessionStart + c.duration_minutes * 60 * 1000) {
    return { valid: false, error: "Contest time has expired" };
  }

  if (problemId) {
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("id, contest_id")
      .eq("id", problemId)
      .eq("contest_id", s.contest_id)
      .single();
    if (problemError || !problem) return { valid: false, error: "Problem not found in this contest" };

    const { data: status } = await supabase
      .from("student_problem_status")
      .select("is_locked, accepted_at")
      .eq("session_id", sessionId)
      .eq("problem_id", problemId)
      .single();
    const st = status as { is_locked: boolean; accepted_at: string | null } | null;
    if (st?.is_locked || st?.accepted_at) return { valid: false, error: "Problem already solved" };
  }

  return { valid: true, contestId: s.contest_id };
}

// Lighter validation for non-execution operations (load/save/delete custom tests).
// Only checks session exists and not disqualified — does not enforce contest time,
// so students can load their saved tests even just after a contest ends.
// deno-lint-ignore no-explicit-any
async function validateSessionLight(
  supabase: any,
  sessionId: string,
): Promise<{ valid: boolean; error?: string }> {
  const { data: session, error } = await supabase
    .from("student_sessions")
    .select("id, is_disqualified")
    .eq("id", sessionId)
    .single();

  if (error || !session) return { valid: false, error: "Invalid session" };
  const s = session as { is_disqualified: boolean };
  if (s.is_disqualified) return { valid: false, error: "Session is disqualified" };
  return { valid: true };
}

// ─── Helper responses ─────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ExecuteRequest = await req.json();
    const { mode, sessionId, problemId } = body;

    console.log(`Execute request: mode=${mode}, language=${body.language}, sessionId=${sessionId?.slice(0, 8)}...`);

    if (!sessionId) {
      return jsonResponse({ success: false, error: "Session ID is required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── HEARTBEAT ────────────────────────────────────────────────────────────
    // Light-weight presence ping sent every 30 s from ProblemSolver.
    // Updates last_active_at, current_problem_id, is_typing — no code execution.
    if (mode === "heartbeat") {
      const sv = await validateSessionLight(supabase, sessionId);
      if (!sv.valid) return jsonResponse({ success: false, error: sv.error }, 403);

      await supabase
        .from("student_sessions")
        .update({
          last_active_at: new Date().toISOString(),
          current_problem_id: body.currentProblemId ?? null,
          is_typing: body.isTyping ?? false,
        })
        .eq("id", sessionId);

      return jsonResponse({ success: true });
    }

    // ── CUSTOM TEST – LOAD ───────────────────────────────────────────────────
    if (mode === "load-custom-tests") {
      if (!problemId) return jsonResponse({ success: false, error: "Missing problemId" }, 400);

      const sv = await validateSessionLight(supabase, sessionId);
      if (!sv.valid) return jsonResponse({ success: false, error: sv.error }, 403);

      const { data, error } = await supabase
        .from("student_custom_tests")
        .select("id, input, expected_output")
        .eq("session_id", sessionId)
        .eq("problem_id", problemId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("load-custom-tests error:", error);
        return jsonResponse({ success: false, error: "Failed to load test cases" }, 500);
      }

      // Map snake_case → camelCase for the frontend
      const testCases = (data || []).map(
        (row: { id: string; input: string; expected_output: string | null }) => ({
          id: row.id,
          input: row.input,
          expectedOutput: row.expected_output ?? "",
        }),
      );

      return jsonResponse({ success: true, testCases });
    }

    // ── CUSTOM TEST – SAVE ───────────────────────────────────────────────────
    if (mode === "save-custom-tests") {
      if (!problemId) return jsonResponse({ success: false, error: "Missing problemId" }, 400);
      const { testCases } = body;
      if (!testCases?.length) return jsonResponse({ success: false, error: "No test cases provided" }, 400);
      if (testCases.length > 10) return jsonResponse({ success: false, error: "Maximum 10 test cases allowed" }, 400);

      const sv = await validateSessionLight(supabase, sessionId);
      if (!sv.valid) return jsonResponse({ success: false, error: sv.error }, 403);

      const rows = testCases.map((tc) => ({
        session_id: sessionId,
        problem_id: problemId,
        input: tc.input,
        expected_output: tc.expectedOutput || null,
      }));

      const { error } = await supabase
        .from("student_custom_tests")
        .upsert(rows, { onConflict: "session_id,problem_id,input", ignoreDuplicates: false });

      if (error) {
        console.error("save-custom-tests error:", error);
        return jsonResponse({ success: false, error: "Failed to save test cases" }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ── CUSTOM TEST – DELETE ─────────────────────────────────────────────────
    if (mode === "delete-custom-test") {
      const { testId } = body;
      if (!testId) return jsonResponse({ success: false, error: "Missing testId" }, 400);

      const sv = await validateSessionLight(supabase, sessionId);
      if (!sv.valid) return jsonResponse({ success: false, error: sv.error }, 403);

      // Scoped delete: also check session_id to prevent deleting other students' tests
      const { error } = await supabase
        .from("student_custom_tests")
        .delete()
        .eq("id", testId)
        .eq("session_id", sessionId);

      if (error) {
        console.error("delete-custom-test error:", error);
        return jsonResponse({ success: false, error: "Failed to delete test case" }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ── CUSTOM TEST – EXECUTE ────────────────────────────────────────────────
    if (mode === "custom-test") {
      const { code, language, customInputs } = body;

      if (!code || !language || !customInputs?.length) {
        return jsonResponse({ success: false, error: "Missing required fields: code, language, customInputs" }, 400);
      }
      if (!isLanguageSupported(language)) {
        return jsonResponse({ success: false, error: `Unsupported language: ${language}` }, 400);
      }
      if (code.length > 50_000) {
        return jsonResponse({ success: false, error: "Code exceeds maximum length (50 KB)" }, 400);
      }
      if (customInputs.length > 10) {
        return jsonResponse({ success: false, error: "Maximum 10 custom test cases per run" }, 400);
      }

      // Validate session (same rules as "run" mode — contest must be active, time not expired)
      const sv = await validateSession(supabase, sessionId);
      if (!sv.valid) return jsonResponse({ success: false, error: sv.error }, 403);

      // Rate limit: 10 runs/minute per session (separate budget from regular runs)
      const rl = checkCustomTestRateLimit(sessionId);
      if (!rl.allowed) {
        return jsonResponse(
          { success: false, error: `Rate limit: max ${CUSTOM_RATE_LIMIT_PER_MINUTE} custom test runs per minute.`, retryAfter: rl.retryAfter },
          429,
          { "Retry-After": String(rl.retryAfter) },
        );
      }

      // Execute all test cases (reuses existing Judge0 → Piston abstraction)
      const results = [];
      const logRows = [];

      for (const tc of customInputs) {
        const result = await executeCode(code, language, tc.input ?? "");
        const actualOutput = (result.output ?? "").trim();
        const passed =
          tc.expectedOutput !== undefined && tc.expectedOutput !== null && tc.expectedOutput !== ""
            ? normalizeOutput(actualOutput) === normalizeOutput(tc.expectedOutput)
            : null;

        // Map engine errors to a status the frontend understands
        const status: "success" | "error" | "timeout" =
          result.error?.toLowerCase().includes("time") ? "timeout"
          : !result.success ? "error"
          : "success";

        results.push({
          input: tc.input,
          expectedOutput: tc.expectedOutput ?? null,
          actualOutput: result.success ? actualOutput : (result.error ?? "Execution failed"),
          status,
          executionTime: result.executionTime ?? 0,
          passed,
          engine: result.engine,
        });

        logRows.push({
          session_id: sessionId,
          problem_id: problemId || null,
          input: tc.input,
          output: result.success ? actualOutput : (result.error ?? ""),
          status,
          execution_time_ms: result.executionTime ?? 0,
          language,
          engine: result.engine ?? null,
        });
      }

      // Fire-and-forget DB log (don't block response on this)
      supabase.from("custom_test_executions").insert(logRows).then(
        ({ error }: { error: unknown }) => { if (error) console.error("custom-test log error:", error); },
      );

      return jsonResponse({ success: true, results });
    }

    // ── EXISTING: RUN ────────────────────────────────────────────────────────

    const { code, language, input } = body;

    if (!code || !language) {
      return jsonResponse({ success: false, error: "Missing required fields: code, language" }, 400);
    }
    if (!isLanguageSupported(language)) {
      return jsonResponse({ success: false, error: `Unsupported language: ${language}` }, 400);
    }
    if (code.length > 50_000) {
      return jsonResponse({ success: false, error: "Code exceeds maximum length (50KB)" }, 400);
    }

    const sessionValidation = await validateSession(
      supabase,
      sessionId,
      mode === "submit" ? problemId : undefined,
    );
    if (!sessionValidation.valid) {
      return jsonResponse({ success: false, error: sessionValidation.error }, 403);
    }

    const rateLimit = checkRateLimit(sessionId);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { success: false, error: "Rate limit exceeded. Please wait before submitting again.", retryAfter: 60 },
        429,
        { "Retry-After": "60" },
      );
    }

    // Execution quota
    const { data: sessionData } = await supabase
      .from("student_sessions")
      .select("execution_count")
      .eq("id", sessionId)
      .single();
    const currentCount = (sessionData as { execution_count: number } | null)?.execution_count || 0;
    if (currentCount >= MAX_EXECUTIONS_PER_SESSION) {
      return jsonResponse(
        { success: false, error: `Execution quota exceeded (${MAX_EXECUTIONS_PER_SESSION} max per contest).` },
        429,
      );
    }
    await supabase.from("student_sessions").update({ execution_count: currentCount + 1 }).eq("id", sessionId);

    const logExecution = async (execStatus: string, execTime?: number) => {
      try {
        await supabase.from("execution_logs").insert({
          session_id: sessionId,
          problem_id: problemId || null,
          language,
          mode,
          status: execStatus,
          execution_time_ms: execTime || 0,
          code_length: code.length,
        });
      } catch (e) {
        console.error("Log error:", e);
      }
    };

    if (mode === "run") {
      const result = await executeCode(code, language, input || "");
      await logExecution(result.success ? "success" : "error", result.executionTime);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      });
    }

    if (mode === "submit") {
      if (!problemId) {
        return jsonResponse({ success: false, error: "Missing problemId for submit" }, 400);
      }

      const { data: testCases, error: tcError } = await supabase
        .from("hidden_test_cases")
        .select("id, input, expected_output")
        .eq("problem_id", problemId);
      if (tcError || !testCases || testCases.length === 0) {
        return jsonResponse({ success: false, error: "No hidden test cases found" }, 404);
      }

      let passedCount = 0;
      let firstError = "";
      let totalExecutionTime = 0;
      const totalCount = testCases.length;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const result = await executeCode(code, language, tc.input);
        totalExecutionTime += result.executionTime || 0;

        if (!result.success) {
          if (!firstError) firstError = result.error || "Execution error";
          if (result.error?.includes("Compilation Error")) break;
        } else if (normalizeOutput(result.output) !== normalizeOutput(tc.expected_output)) {
          if (!firstError) firstError = `Test case ${i + 1} failed: Output mismatch`;
        } else {
          passedCount++;
        }
      }

      const { data: problemData } = await supabase
        .from("problems")
        .select("score")
        .eq("id", problemId)
        .single();
      const maxScore = (problemData as { score: number } | null)?.score || 0;
      const partialScore = totalCount > 0 ? Math.floor((passedCount / totalCount) * maxScore) : 0;

      const submissionStatus =
        passedCount === totalCount ? "accepted" : passedCount > 0 ? "partial" : "failed";

      await supabase.from("submissions").insert({
        session_id: sessionId,
        problem_id: problemId,
        code,
        language,
        status: submissionStatus,
        score: partialScore,
        test_cases_passed: passedCount,
        total_test_cases: totalCount,
        execution_time: totalExecutionTime,
        error_message: submissionStatus === "failed" ? firstError || null : null,
      });

      const { data: currentStatus } = await supabase
        .from("student_problem_status")
        .select("wrong_attempts, best_test_cases_passed, accepted_at")
        .eq("session_id", sessionId)
        .eq("problem_id", problemId)
        .single();

      const cs = currentStatus as {
        wrong_attempts: number;
        best_test_cases_passed: number;
        accepted_at: string | null;
      } | null;

      // deno-lint-ignore no-explicit-any
      const updateData: Record<string, any> = {};

      if (passedCount > (cs?.best_test_cases_passed || 0)) {
        updateData.partial_score = partialScore;
        updateData.best_test_cases_passed = passedCount;
      }

      if (submissionStatus === "accepted") {
        updateData.accepted_at = new Date().toISOString();
        updateData.is_locked = true;
      } else if (!cs?.accepted_at) {
        updateData.wrong_attempts = (cs?.wrong_attempts || 0) + 1;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("student_problem_status")
          .update(updateData)
          .eq("session_id", sessionId)
          .eq("problem_id", problemId);
      }

      await logExecution(submissionStatus, totalExecutionTime);

      return new Response(
        JSON.stringify({
          success: submissionStatus === "accepted",
          status: submissionStatus,
          score: partialScore,
          maxScore,
          testCasesPassed: passedCount,
          totalTestCases: totalCount,
          executionTime: totalExecutionTime,
          error: submissionStatus === "failed" ? firstError : undefined,
          message:
            submissionStatus === "accepted"
              ? `All ${totalCount} test cases passed!`
              : submissionStatus === "partial"
              ? `${passedCount}/${totalCount} test cases passed`
              : "No test cases passed",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      );
    }

    return jsonResponse({ success: false, error: "Invalid mode" }, 400);
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
