// Judge0 API Service - Primary execution engine

const JUDGE0_BASE_URL = "https://ce.judge0.com";

// Judge0 language IDs
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,  // Python 3
  java: 62,    // Java (OpenJDK 13)
  c: 50,       // C (GCC 9.2.0)
  cpp: 54,     // C++ (GCC 9.2.0)
  go: 60,      // Go (1.13.5)
};

interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1000;

async function pollResult(token: string): Promise<Judge0Result> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(
      `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      throw new Error(`Judge0 poll failed: ${response.status}`);
    }

    const result: Judge0Result = await response.json();

    // Status IDs: 1=In Queue, 2=Processing
    if (result.status.id > 2) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Judge0 execution timed out (polling)");
}

export async function executeWithJudge0(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];
  if (!languageId) {
    throw new Error(`Unsupported language for Judge0: ${language}`);
  }

  const startTime = Date.now();

  const submission: Judge0Submission = {
    source_code: code,
    language_id: languageId,
    stdin: input || "",
  };

  // Submit code
  const submitResponse = await fetch(
    `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    }
  );

  if (!submitResponse.ok) {
    throw new Error(`Judge0 submission failed: ${submitResponse.status}`);
  }

  const { token } = await submitResponse.json();
  if (!token) {
    throw new Error("Judge0 did not return a token");
  }

  // Poll for result
  const result = await pollResult(token);
  const executionTime = Date.now() - startTime;

  // Status mapping:
  // 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded
  // 6 = Compilation Error, 7-12 = Runtime errors
  const statusId = result.status.id;

  if (statusId === 6) {
    return {
      success: false,
      output: "",
      error: `Compilation Error:\n${result.compile_output || "Unknown compilation error"}`,
      executionTime,
    };
  }

  if (statusId >= 7 && statusId <= 12) {
    return {
      success: false,
      output: result.stdout || "",
      error: `Runtime Error:\n${result.stderr || result.status.description}`,
      executionTime,
    };
  }

  if (statusId === 5) {
    return {
      success: false,
      output: result.stdout || "",
      error: "Time Limit Exceeded",
      executionTime,
    };
  }

  // Status 3 (Accepted) or 4 (Wrong Answer) - both ran successfully
  return {
    success: true,
    output: result.stdout || "",
    executionTime,
  };
}
