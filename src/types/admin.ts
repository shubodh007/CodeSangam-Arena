export interface AdminSubmissionView {
  submission_id: string;
  session_id: string;
  problem_id: string;
  code: string;
  language: string;
  status: 'accepted' | 'partial' | 'failed' | 'error';
  score: number | null;
  submitted_at: string;
  // Student info
  username: string;
  is_disqualified: boolean;
  warnings: number;
  contest_id: string;
  // Problem/contest info
  problem_title: string;
  problem_max_score: number;
  contest_title: string;
  // Calculated
  code_length: number;
  attempt_number: number;
}

export interface SubmissionHistory {
  id: string;
  status: string;
  score: number | null;
  submitted_at: string;
}

export interface SubmissionStats {
  problem_id: string;
  problem_title: string;
  total_submissions: number;
  unique_students: number;
  accepted_submissions: number;
  partial_submissions: number;
  failed_submissions: number;
  average_score: number;
  average_attempts: number;
}
