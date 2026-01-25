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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ExecuteRequest = await req.json();
    const { code, language, input, mode, sessionId, problemId } = requestData;

    console.log(`Execute request: mode=${mode}, language=${language}, problemId=${problemId}`);

    // Validate required fields
    if (!code || !language) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: code, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For RUN mode: just execute against provided input
    if (mode === "run") {
      const result = await executeCode(code, language, input || "");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For SUBMIT mode: execute against hidden test cases
    if (mode === "submit") {
      if (!sessionId || !problemId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing sessionId or problemId for submit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      console.log(`Running ${testCases.length} hidden test cases`);

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
