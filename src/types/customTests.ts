export type CustomTestStatus = "success" | "error" | "timeout";

/** One test case as the user writes it in the UI */
export interface CustomTestCase {
  /** UUID is present only for tests loaded from the database */
  id?: string;
  input: string;
  expectedOutput: string;
}

/** What the backend returns for each executed test case */
export interface CustomTestResult {
  input: string;
  expectedOutput: string | null;
  actualOutput: string;
  status: CustomTestStatus;
  executionTime: number;
  /** null when no expectedOutput was given */
  passed: boolean | null;
  engine?: "judge0" | "piston";
}

/** Full response from mode="custom-test" */
export interface CustomTestRunResponse {
  success: boolean;
  results: CustomTestResult[];
  error?: string;
  retryAfter?: number;
}
