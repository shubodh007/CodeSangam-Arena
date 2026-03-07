// Execution Controller - Judge0 primary, Piston fallback

import { executeWithJudge0, JUDGE0_LANGUAGE_IDS } from "./judge0_service.ts";
import { executeWithPiston } from "./piston_service.ts";

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  engine?: "judge0" | "piston";
}

const SUPPORTED_LANGUAGES = ["python", "java", "c", "cpp", "go"];

export function isLanguageSupported(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language);
}

export async function executeCode(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  if (!isLanguageSupported(language)) {
    return { success: false, output: "", error: `Unsupported language: ${language}` };
  }

  // Try Judge0 first
  try {
    console.log(`[ExecutionController] Trying Judge0 for ${language}...`);
    const result = await executeWithJudge0(code, language, input);
    console.log(`[ExecutionController] Judge0 succeeded`);
    return { ...result, engine: "judge0" };
  } catch (judge0Error: unknown) {
    const errorMsg = judge0Error instanceof Error ? judge0Error.message : "Unknown Judge0 error";
    console.warn(`[ExecutionController] Judge0 failed: ${errorMsg}. Falling back to Piston...`);
  }

  // Fallback to Piston
  try {
    console.log(`[ExecutionController] Trying Piston fallback for ${language}...`);
    const result = await executeWithPiston(code, language, input);
    console.log(`[ExecutionController] Piston fallback succeeded`);
    return { ...result, engine: "piston" };
  } catch (pistonError: unknown) {
    const errorMsg = pistonError instanceof Error ? pistonError.message : "Unknown Piston error";
    console.error(`[ExecutionController] Both engines failed. Piston error: ${errorMsg}`);
    return {
      success: false,
      output: "",
      error: `Execution failed on all engines: ${errorMsg}`,
    };
  }
}

// Normalize output for comparison
export function normalizeOutput(output: string): string {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
