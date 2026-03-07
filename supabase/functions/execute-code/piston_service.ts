// Piston API Service - Fallback execution engine

const PISTON_CONFIG: Record<string, { language: string; version: string; filename: string }> = {
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
  c: { language: "c", version: "10.2.0", filename: "main.c" },
  cpp: { language: "cpp", version: "10.2.0", filename: "main.cpp" },
  go: { language: "go", version: "1.16.2", filename: "main.go" },
};

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
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

export async function executeWithPiston(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  const config = PISTON_CONFIG[language];
  if (!config) {
    return { success: false, output: "", error: `Unsupported language: ${language}` };
  }

  const startTime = Date.now();

  const response = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: config.language,
      version: config.version,
      files: [{ name: config.filename, content: code }],
      stdin: input,
      run_timeout: 10000,
      compile_timeout: 10000,
    }),
  });

  const data: PistonResponse = await response.json();
  const executionTime = Date.now() - startTime;

  if (data.compile && data.compile.code !== 0) {
    return {
      success: false,
      output: "",
      error: `Compilation Error:\n${data.compile.stderr || data.compile.output}`,
      executionTime,
    };
  }

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
}
