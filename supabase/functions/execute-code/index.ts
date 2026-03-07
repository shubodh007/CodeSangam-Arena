import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeCode, normalizeOutput, isLanguageSupported } from "./execution_controller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (per session)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_EXECUTIONS_PER_SESSION = 500;

interface ExecuteRequest {
  code: string;
  language: string;
  input: string;
  mode: "run" | "submit";
  sessionId?: string;
  problemId?: string;
}

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

// deno-lint-ignore no-explicit-any
async function validateSession(supabase: any, sessionId: string, problemId?: string): Promise<{ valid: boolean; error?: string; contestId?: string }> {
  const { data: session, error: sessionError } = await supabase
    .from("student_sessions")
    .select("id, contest_id, is_disqualified, ended_at, started_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) return { valid: false, error: "Invalid session" };

  const s = session as { id: string; contest_id: string; is_disqualified: boolean; ended_at: string | null; started_at: string };
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
      .from("problems").select("id, contest_id").eq("id", problemId).eq("contest_id", s.contest_id).single();
    if (problemError || !problem) return { valid: false, error: "Problem not found in this contest" };

    const { data: status } = await supabase
      .from("student_problem_status").select("is_locked, accepted_at").eq("session_id", sessionId).eq("problem_id", problemId).single();
    const st = status as { is_locked: boolean; accepted_at: string | null } | null;
    if (st?.is_locked || st?.accepted_at) return { valid: false, error: "Problem already solved" };
  }

  return { valid: true, contestId: s.contest_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, input, mode, sessionId, problemId }: ExecuteRequest = await req.json();

    console.log(`Execute request: mode=${mode}, language=${language}, sessionId=${sessionId?.slice(0, 8)}...`);

    if (!code || !language) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields: code, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isLanguageSupported(language)) {
      return new Response(JSON.stringify({ success: false, error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (code.length > 50000) {
      return new Response(JSON.stringify({ success: false, error: "Code exceeds maximum length (50KB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, error: "Session ID is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sessionValidation = await validateSession(supabase, sessionId, mode === "submit" ? problemId : undefined);
    if (!sessionValidation.valid) {
      return new Response(JSON.stringify({ success: false, error: sessionValidation.error }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rateLimit = checkRateLimit(sessionId);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please wait before submitting again.", retryAfter: 60 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } });
    }

    // Execution quota
    const { data: sessionData } = await supabase.from("student_sessions").select("execution_count").eq("id", sessionId).single();
    const currentCount = (sessionData as { execution_count: number } | null)?.execution_count || 0;
    if (currentCount >= MAX_EXECUTIONS_PER_SESSION) {
      return new Response(JSON.stringify({ success: false, error: `Execution quota exceeded (${MAX_EXECUTIONS_PER_SESSION} max per contest).` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("student_sessions").update({ execution_count: currentCount + 1 }).eq("id", sessionId);

    // Audit logging helper
    const logExecution = async (execStatus: string, execTime?: number) => {
      try {
        await supabase.from("execution_logs").insert({
          session_id: sessionId, problem_id: problemId || null, language, mode, status: execStatus,
          execution_time_ms: execTime || 0, code_length: code.length,
        });
      } catch (e) { console.error("Log error:", e); }
    };

    // RUN mode
    if (mode === "run") {
      const result = await executeCode(code, language, input || "");
      await logExecution(result.success ? "success" : "error", result.executionTime);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-RateLimit-Remaining": rateLimit.remaining.toString() },
      });
    }

    // SUBMIT mode
    if (mode === "submit") {
      if (!problemId) {
        return new Response(JSON.stringify({ success: false, error: "Missing problemId for submit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: testCases, error: tcError } = await supabase
        .from("hidden_test_cases").select("id, input, expected_output").eq("problem_id", problemId);
      if (tcError || !testCases || testCases.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "No hidden test cases found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let allPassed = true;
      let failedTestCase = 0;
      let status = "accepted";
      let errorMessage = "";
      let totalExecutionTime = 0;
      const testResults: { passed: boolean; testCase: number; error?: string }[] = [];

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const result = await executeCode(code, language, tc.input);
        totalExecutionTime += result.executionTime || 0;

        if (!result.success) {
          allPassed = false;
          failedTestCase = i + 1;
          status = result.error?.includes("Compilation Error") ? "compilation_error" : "runtime_error";
          errorMessage = result.error || "Unknown error";
          testResults.push({ passed: false, testCase: i + 1, error: result.error });
          break;
        }

        if (normalizeOutput(result.output) !== normalizeOutput(tc.expected_output)) {
          allPassed = false;
          failedTestCase = i + 1;
          status = "wrong_answer";
          errorMessage = `Test case ${i + 1} failed: Output mismatch`;
          testResults.push({ passed: false, testCase: i + 1 });
          break;
        }
        testResults.push({ passed: true, testCase: i + 1 });
      }

      const { data: problemData } = await supabase.from("problems").select("score").eq("id", problemId).single();
      const score = allPassed ? (problemData?.score || 0) : 0;

      await supabase.from("submissions").insert({
        session_id: sessionId, problem_id: problemId, code, language, status, score,
      });

      if (!allPassed) {
        const { data: statusData } = await supabase.from("student_problem_status")
          .select("wrong_attempts").eq("session_id", sessionId).eq("problem_id", problemId).single();
        await supabase.from("student_problem_status")
          .update({ wrong_attempts: (statusData?.wrong_attempts || 0) + 1 })
          .eq("session_id", sessionId).eq("problem_id", problemId);
      } else {
        await supabase.from("student_problem_status")
          .update({ accepted_at: new Date().toISOString(), is_locked: true })
          .eq("session_id", sessionId).eq("problem_id", problemId);
      }

      await logExecution(status, totalExecutionTime);

      return new Response(JSON.stringify({
        success: allPassed, status, score,
        testCasesPassed: testResults.filter((t) => t.passed).length,
        totalTestCases: testCases.length, failedTestCase,
        error: errorMessage, executionTime: totalExecutionTime,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json", "X-RateLimit-Remaining": rateLimit.remaining.toString() } });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid mode" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
