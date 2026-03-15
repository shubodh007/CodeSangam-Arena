-- Admin Code Viewing Feature
-- Provides admins with full read access to all student submissions

-- Create comprehensive view for admin submission access
CREATE OR REPLACE VIEW admin_submissions_view AS
SELECT
  s.id AS submission_id,
  s.session_id,
  s.problem_id,
  s.code,
  s.language,
  s.status,
  s.score,
  s.submitted_at,
  -- Student info
  ss.username,
  ss.is_disqualified,
  ss.warnings,
  ss.contest_id,
  -- Problem info
  p.title AS problem_title,
  p.score AS problem_max_score,
  -- Contest info
  c.title AS contest_title,
  -- Calculated fields
  LENGTH(s.code) AS code_length,
  -- Attempt number within same student+problem (1 = most recent)
  ROW_NUMBER() OVER (
    PARTITION BY s.problem_id, s.session_id
    ORDER BY s.submitted_at DESC
  ) AS attempt_number
FROM submissions s
INNER JOIN student_sessions ss ON ss.id = s.session_id
INNER JOIN problems p ON p.id = s.problem_id
INNER JOIN contests c ON c.id = ss.contest_id
ORDER BY s.submitted_at DESC;

-- Grant view access to authenticated users (RLS on underlying table handles admin-only)
GRANT SELECT ON admin_submissions_view TO authenticated;

-- Enable RLS on submissions (idempotent)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Add admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all submissions" ON submissions;
CREATE POLICY "Admins can view all submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add student self-access SELECT policy (in case not already present)
DROP POLICY IF EXISTS "Students can view own submissions" ON submissions;
CREATE POLICY "Students can view own submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM student_sessions
      WHERE user_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at
  ON submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_session_problem
  ON submissions(session_id, problem_id, submitted_at DESC);

-- Helper function: aggregate submission stats per problem in a contest
CREATE OR REPLACE FUNCTION get_submission_stats(p_contest_id UUID)
RETURNS TABLE (
  problem_id UUID,
  problem_title TEXT,
  total_submissions BIGINT,
  unique_students BIGINT,
  accepted_submissions BIGINT,
  partial_submissions BIGINT,
  failed_submissions BIGINT,
  average_score NUMERIC,
  average_attempts NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS problem_id,
    p.title AS problem_title,
    COUNT(s.id) AS total_submissions,
    COUNT(DISTINCT s.session_id) AS unique_students,
    COUNT(CASE WHEN s.status = 'accepted' THEN 1 END) AS accepted_submissions,
    COUNT(CASE WHEN s.status = 'partial' THEN 1 END) AS partial_submissions,
    COUNT(CASE WHEN s.status = 'failed' THEN 1 END) AS failed_submissions,
    ROUND(AVG(s.score), 2) AS average_score,
    ROUND(COUNT(s.id)::NUMERIC / NULLIF(COUNT(DISTINCT s.session_id), 0), 2) AS average_attempts
  FROM problems p
  LEFT JOIN submissions s ON s.problem_id = p.id
  LEFT JOIN student_sessions ss ON ss.id = s.session_id
  WHERE p.contest_id = p_contest_id
  GROUP BY p.id, p.title, p.order_index
  ORDER BY p.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON VIEW admin_submissions_view IS 'Admin-only view of all student submissions with joined metadata';
COMMENT ON FUNCTION get_submission_stats IS 'Get aggregated submission statistics per problem in a contest';
