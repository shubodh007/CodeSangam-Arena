import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language configuration for Piston API
const LANGUAGE_CONFIG: Record<string, { language: string; version: string; filename: string }> = {
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
  c: { language: "c", version: "10.2.0", filename: "main.c" },
  cpp: { language: "cpp", version: "10.2.0", filename: "main.cpp" },
  go: { language: "go", version: "1.16.2", filename: "main.go" },
};

// In-memory rate limiting (per session) - short-term burst protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30; // max requests per minute
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window

// Per-session execution quota (stored in DB) - contest-wide limit
const MAX_EXECUTIONS_PER_SESSION = 500; // max total executions per contest session

interface ExecuteRequest {
  code: string;
  language: string;
  input: string;
  mode: "run" | "submit";
  sessionId?: string;
  problemId?: string;
}

interface PistonResponse {
  run?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  message?: string;
}

// Rate limiter check
function checkRateLimit(sessionId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count };
}

// Normalize output for comparison
function normalizeOutput(output: string): string {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

// Execute code against Piston API
async function executeCode(
  code: string,
  language: string,
  input: string
): Promise<{ success: boolean; output: string; error?: string; executionTime?: number }> {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { success: false, output: "", error: `Unsupported language: ${language}` };
  }

  const startTime = Date.now();

  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [
          {
            name: config.filename,
            content: code,
          },
        ],
        stdin: input,
        run_timeout: 10000, // 10 second timeout
        compile_timeout: 10000,
      }),
    });

    const data: PistonResponse = await response.json();
    const executionTime = Date.now() - startTime;

    // Check for compilation errors
    if (data.compile && data.compile.code !== 0) {
      return {
        success: false,
        output: "",
        error: `Compilation Error:\n${data.compile.stderr || data.compile.output}`,
        executionTime,
      };
    }

    // Check for runtime errors
    if (data.run) {
      if (data.run.code !== 0 || data.run.signal) {
        return {
          success: false,
          output: data.run.stdout || "",
          error: `Runtime Error:\n${data.run.stderr || data.run.output}`,
          executionTime,
        };
      }

      return {
        success: true,
        output: data.run.stdout || data.run.output || "",
        executionTime,
      };
    }

    return {
      success: false,
      output: "",
      error: data.message || "Unknown error occurred",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      output: "",
      error: `Execution failed: ${errorMessage}`,
    };
  }
}

// Validate session ownership and status
// deno-lint-ignore no-explicit-any
async function validateSession(
  supabase: any,
  sessionId: string,
  problemId?: string
): Promise<{ valid: boolean; error?: string; contestId?: string }> {
  // Fetch session and verify it's active
  const { data: session, error: sessionError } = await supabase
    .from("student_sessions")
    .select("id, contest_id, is_disqualified, ended_at, started_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    console.log(`Session validation failed: session ${sessionId} not found`);
    return { valid: false, error: "Invalid session" };
  }

  // Type assertion for session data
  const sessionData = session as {
    id: string;
    contest_id: string;
    is_disqualified: boolean;
    ended_at: string | null;
    started_at: string;
  };

  // Check if session is disqualified
  if (sessionData.is_disqualified) {
    console.log(`Session ${sessionId} is disqualified`);
    return { valid: false, error: "Session is disqualified" };
  }

  // Check if session has ended
  if (sessionData.ended_at) {
    console.log(`Session ${sessionId} has ended`);
    return { valid: false, error: "Session has ended" };
  }

  // Check if contest is still active
  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id, is_active, duration_minutes")
    .eq("id", sessionData.contest_id)
    .single();

  if (contestError || !contest) {
    console.log(`Contest not found for session ${sessionId}`);
    return { valid: false, error: "Contest not found" };
  }

  // Type assertion for contest data
  const contestData = contest as {
    id: string;
    is_active: boolean;
    duration_minutes: number;
  };

  if (!contestData.is_active) {
    console.log(`Contest ${contestData.id} is not active`);
    return { valid: false, error: "Contest is not active" };
  }

  // Check if contest time has expired
  const sessionStart = new Date(sessionData.started_at).getTime();
  const contestEndTime = sessionStart + contestData.duration_minutes * 60 * 1000;
  const now = Date.now();

  if (now > contestEndTime) {
    console.log(`Contest time expired for session ${sessionId}`);
    return { valid: false, error: "Contest time has expired" };
  }

  // If problemId provided, verify problem belongs to this contest
  if (problemId) {
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("id, contest_id")
      .eq("id", problemId)
      .eq("contest_id", sessionData.contest_id)
      .single();

    if (problemError || !problem) {
      console.log(`Problem ${problemId} not found in contest ${sessionData.contest_id}`);
      return { valid: false, error: "Problem not found in this contest" };
    }

    // Check if problem is already locked (solved)
    const { data: status } = await supabase
      .from("student_problem_status")
      .select("is_locked, accepted_at")
      .eq("session_id", sessionId)
      .eq("problem_id", problemId)
      .single();

    // Type assertion for status data
    const statusData = status as { is_locked: boolean; accepted_at: string | null } | null;

    if (statusData?.is_locked || statusData?.accepted_at) {
      console.log(`Problem ${problemId} already solved for session ${sessionId}`);
      return { valid: false, error: "Problem already solved" };
    }
  }

  return { valid: true, contestId: sessionData.contest_id };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ExecuteRequest = await req.json();
    const { code, language, input, mode, sessionId, problemId } = requestData;

    console.log(`Execute request: mode=${mode}, language=${language}, problemId=${problemId}, sessionId=${sessionId?.slice(0, 8)}...`);

    // Validate required fields
    if (!code || !language) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: code, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate language
    if (!LANGUAGE_CONFIG[language]) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code length limit (prevent abuse)
    if (code.length > 50000) {
      return new Response(
        JSON.stringify({ success: false, error: "Code exceeds maximum length (50KB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // SECURITY: SESSION VALIDATION (REQUIRED)
    // ============================================
    // SessionId is REQUIRED for all requests to prevent abuse
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Session ID is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate session exists and is active
    const sessionValidation = await validateSession(supabase, sessionId, mode === "submit" ? problemId : undefined);
    if (!sessionValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: sessionValidation.error }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // RATE LIMITING (per session - short-term burst)
    // ============================================
    const rateLimit = checkRateLimit(sessionId);
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for session ${sessionId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded. Please wait before submitting again.",
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60"
          } 
        }
      );
    }

    // ============================================
    // PER-SESSION EXECUTION QUOTA (contest-wide limit)
    // ============================================
    const { data: sessionData } = await supabase
      .from("student_sessions")
      .select("execution_count")
      .eq("id", sessionId)
      .single();

    const currentExecutionCount = (sessionData as { execution_count: number } | null)?.execution_count || 0;
    
    if (currentExecutionCount >= MAX_EXECUTIONS_PER_SESSION) {
      console.log(`Execution quota exceeded for session ${sessionId}: ${currentExecutionCount}/${MAX_EXECUTIONS_PER_SESSION}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Execution quota exceeded (${MAX_EXECUTIONS_PER_SESSION} max per contest). Contact administrator.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment execution count
    await supabase
      .from("student_sessions")
      .update({ execution_count: currentExecutionCount + 1 })
      .eq("id", sessionId);

    // ============================================
    // AUDIT LOGGING
    // ============================================
    const logExecution = async (execStatus: string, execTime?: number) => {
      try {
        await supabase.from("execution_logs").insert({
          session_id: sessionId,
          problem_id: problemId || null,
          language: language,
          mode: mode,
          status: execStatus,
          execution_time_ms: execTime || 0,
          code_length: code.length,
        });
      } catch (logError) {
        console.error("Failed to log execution:", logError);
      }
    };

    // For RUN mode: just execute against provided input
    if (mode === "run") {
      const result = await executeCode(code, language, input || "");
      
      // Log the execution
      await logExecution(result.success ? "success" : "error", result.executionTime);
      
      return new Response(JSON.stringify(result), {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateLimit.remaining.toString()
        },
      });
    }

    // For SUBMIT mode: execute against hidden test cases
    if (mode === "submit") {
      if (!problemId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing problemId for submit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch hidden test cases
      const { data: testCases, error: tcError } = await supabase
        .from("hidden_test_cases")
        .select("id, input, expected_output")
        .eq("problem_id", problemId);

      if (tcError) {
        console.error("Error fetching test cases:", tcError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch test cases" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!testCases || testCases.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "No hidden test cases found for this problem" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Running ${testCases.length} hidden test cases for session ${sessionId.slice(0, 8)}...`);

      let allPassed = true;
      let failedTestCase = 0;
      let status = "accepted";
      let errorMessage = "";
      let totalExecutionTime = 0;
      let testResults: { passed: boolean; testCase: number; error?: string }[] = [];

      // Run each test case sequentially, stop on first failure
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(`Running test case ${i + 1}/${testCases.length}`);

        const result = await executeCode(code, language, tc.input);
        totalExecutionTime += result.executionTime || 0;

        if (!result.success) {
          allPassed = false;
          failedTestCase = i + 1;

          if (result.error?.includes("Compilation Error")) {
            status = "compilation_error";
          } else if (result.error?.includes("Runtime Error")) {
            status = "runtime_error";
          } else {
            status = "runtime_error";
          }

          errorMessage = result.error || "Unknown error";
          testResults.push({ passed: false, testCase: i + 1, error: result.error });
          break;
        }

        // Compare output
        const normalizedOutput = normalizeOutput(result.output);
        const normalizedExpected = normalizeOutput(tc.expected_output);

        if (normalizedOutput !== normalizedExpected) {
          allPassed = false;
          failedTestCase = i + 1;
          status = "wrong_answer";
          errorMessage = `Test case ${i + 1} failed: Output mismatch`;
          testResults.push({ passed: false, testCase: i + 1 });
          break;
        }

        testResults.push({ passed: true, testCase: i + 1 });
      }

      // Get problem score
      const { data: problemData } = await supabase
        .from("problems")
        .select("score")
        .eq("id", problemId)
        .single();

      const score = allPassed ? (problemData?.score || 0) : 0;

      // Record submission in database
      const { error: subError } = await supabase.from("submissions").insert({
        session_id: sessionId,
        problem_id: problemId,
        code: code,
        language: language,
        status: status,
        score: score,
      });

      if (subError) {
        console.error("Error recording submission:", subError);
      }

      // If failed, increment wrong_attempts
      if (!allPassed) {
        const { data: statusData } = await supabase
          .from("student_problem_status")
          .select("wrong_attempts")
          .eq("session_id", sessionId)
          .eq("problem_id", problemId)
          .single();

        const currentWrongAttempts = statusData?.wrong_attempts || 0;

        await supabase
          .from("student_problem_status")
          .update({ wrong_attempts: currentWrongAttempts + 1 })
          .eq("session_id", sessionId)
          .eq("problem_id", problemId);
      } else {
        // If passed, mark problem as solved and locked
        await supabase
          .from("student_problem_status")
          .update({
            accepted_at: new Date().toISOString(),
            is_locked: true,
          })
          .eq("session_id", sessionId)
          .eq("problem_id", problemId);
      }

      // Log the submission execution
      await logExecution(status, totalExecutionTime);

      console.log(`Submission complete for session ${sessionId.slice(0, 8)}: status=${status}, score=${score}`);

      return new Response(
        JSON.stringify({
          success: allPassed,
          status: status,
          score: score,
          testCasesPassed: testResults.filter((t) => t.passed).length,
          totalTestCases: testCases.length,
          failedTestCase: failedTestCase,
          error: errorMessage,
          executionTime: totalExecutionTime,
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimit.remaining.toString()
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid mode" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
