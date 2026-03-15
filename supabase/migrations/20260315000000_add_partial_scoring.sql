-- Add columns to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS test_cases_passed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_test_cases INTEGER DEFAULT 0;

-- Add columns to student_problem_status table
ALTER TABLE student_problem_status
ADD COLUMN IF NOT EXISTS partial_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_test_cases_passed INTEGER DEFAULT 0;

-- Backfill total_test_cases for existing submissions
UPDATE submissions s
SET total_test_cases = (
  SELECT COUNT(*)
  FROM hidden_test_cases htc
  WHERE htc.problem_id = s.problem_id
)
WHERE total_test_cases = 0;

-- Backfill partial_score for already-accepted problems
UPDATE student_problem_status sps
SET partial_score = (
  SELECT p.score FROM problems p WHERE p.id = sps.problem_id
)
WHERE sps.accepted_at IS NOT NULL AND sps.partial_score = 0;

-- Index for submission lookup by session + problem
CREATE INDEX IF NOT EXISTS idx_submissions_session_problem
ON submissions(session_id, problem_id, created_at DESC);

-- Update leaderboard_view to use partial_score for total_score
CREATE OR REPLACE VIEW public.leaderboard_view WITH (security_invoker = false) AS
SELECT
  ss.id AS session_id,
  ss.contest_id,
  ss.username,
  COALESCE(SUM(sps.partial_score), 0)::integer AS total_score,
  COUNT(sps.accepted_at)::integer AS problems_solved,
  COALESCE(SUM(sps.wrong_attempts), 0)::integer AS wrong_attempts,
  MAX(sps.accepted_at) AS last_accepted_at,
  COALESCE(
    SUM(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer)
      FILTER (WHERE sps.accepted_at IS NOT NULL),
    0
  )::integer AS total_time_seconds,
  rank() OVER (
    PARTITION BY ss.contest_id
    ORDER BY
      COALESCE(SUM(sps.partial_score), 0) DESC,
      COALESCE(SUM(sps.wrong_attempts), 0) ASC,
      COALESCE(
        SUM(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer)
          FILTER (WHERE sps.accepted_at IS NOT NULL),
        0
      ) ASC,
      MAX(sps.accepted_at) ASC NULLS LAST,
      ss.username ASC
  ) AS rank
FROM student_sessions ss
  LEFT JOIN student_problem_status sps ON sps.session_id = ss.id
WHERE ss.is_disqualified = false
  AND EXISTS (
    SELECT 1 FROM contests c WHERE c.id = ss.contest_id AND c.is_active = true
  )
GROUP BY ss.id, ss.contest_id, ss.username, ss.started_at;

-- Update admin_leaderboard_view to use partial_score and add partial solve count
CREATE OR REPLACE VIEW public.admin_leaderboard_view AS
SELECT
  ss.id AS session_id,
  ss.contest_id,
  ss.username,
  ss.warnings,
  ss.is_disqualified,
  ss.execution_count,
  COALESCE(SUM(sps.partial_score), 0)::integer AS total_score,
  COUNT(sps.accepted_at)::integer AS problems_solved,
  COALESCE(SUM(sps.wrong_attempts), 0)::integer AS wrong_attempts,
  MAX(sps.accepted_at) AS last_accepted_at,
  COALESCE(
    SUM(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer)
      FILTER (WHERE sps.accepted_at IS NOT NULL),
    0
  )::integer AS total_time_seconds,
  COUNT(DISTINCT CASE WHEN sps.partial_score > 0 AND sps.accepted_at IS NULL THEN sps.problem_id END)::integer AS problems_partially_solved,
  rank() OVER (
    PARTITION BY ss.contest_id
    ORDER BY
      COALESCE(SUM(sps.partial_score), 0) DESC,
      COALESCE(SUM(sps.wrong_attempts), 0) ASC,
      COALESCE(
        SUM(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer)
          FILTER (WHERE sps.accepted_at IS NOT NULL),
        0
      ) ASC,
      MAX(sps.accepted_at) ASC NULLS LAST,
      ss.username ASC
  ) AS rank
FROM student_sessions ss
  LEFT JOIN student_problem_status sps ON sps.session_id = ss.id
GROUP BY ss.id, ss.contest_id, ss.username, ss.warnings, ss.is_disqualified, ss.execution_count, ss.started_at;

COMMENT ON COLUMN submissions.test_cases_passed IS 'Number of test cases that passed in this submission';
COMMENT ON COLUMN submissions.total_test_cases IS 'Total number of test cases for this problem';
COMMENT ON COLUMN student_problem_status.partial_score IS 'Best score earned for this problem so far (full or partial)';
COMMENT ON COLUMN student_problem_status.best_test_cases_passed IS 'Highest test case pass count achieved across all attempts';
