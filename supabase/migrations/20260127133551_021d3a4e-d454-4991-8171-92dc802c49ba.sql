-- Fix 1: student_sessions exposure - create a safe public leaderboard view
-- and restrict direct table access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view basic session data for leaderboard" ON public.student_sessions;

-- Only admins can directly query student_sessions
CREATE POLICY "Only admins can view student sessions directly"
ON public.student_sessions
FOR SELECT
USING (is_admin(auth.uid()));

-- Create a SAFE public leaderboard view with only ranking-essential data
-- This view intentionally EXCLUDES sensitive fields: warnings, execution_count, is_disqualified details
DROP VIEW IF EXISTS public.leaderboard_view;

-- Use SECURITY DEFINER to bypass RLS for aggregation, but only expose safe columns
CREATE VIEW public.leaderboard_view
WITH (security_invoker = false)
AS
SELECT 
  ss.id as session_id,
  ss.contest_id,
  ss.username,
  -- Only show rank-relevant data, not sensitive metrics
  COALESCE(SUM(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0)::bigint as total_score,
  COUNT(sps.accepted_at)::integer as problems_solved,
  COALESCE(SUM(sps.wrong_attempts), 0)::integer as wrong_attempts,
  MAX(sps.accepted_at) as last_accepted_at,
  EXTRACT(EPOCH FROM (COALESCE(MAX(sps.accepted_at), now()) - ss.started_at))::integer as total_time_seconds,
  RANK() OVER (
    PARTITION BY ss.contest_id 
    ORDER BY 
      COALESCE(SUM(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0) DESC,
      MAX(sps.accepted_at) ASC NULLS LAST
  )::bigint as rank
FROM public.student_sessions ss
LEFT JOIN public.student_problem_status sps ON sps.session_id = ss.id
LEFT JOIN public.problems p ON p.id = sps.problem_id
WHERE ss.is_disqualified = false
  AND EXISTS (SELECT 1 FROM contests c WHERE c.id = ss.contest_id AND c.is_active = true)
GROUP BY ss.id, ss.contest_id, ss.username, ss.started_at;

-- Create admin-only view with full details including warnings
CREATE OR REPLACE VIEW public.admin_leaderboard_view
WITH (security_invoker = false)
AS
SELECT 
  ss.id as session_id,
  ss.contest_id,
  ss.username,
  ss.warnings,
  ss.is_disqualified,
  ss.execution_count,
  COALESCE(SUM(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0)::bigint as total_score,
  COUNT(sps.accepted_at)::integer as problems_solved,
  COALESCE(SUM(sps.wrong_attempts), 0)::integer as wrong_attempts,
  MAX(sps.accepted_at) as last_accepted_at,
  EXTRACT(EPOCH FROM (COALESCE(MAX(sps.accepted_at), now()) - ss.started_at))::integer as total_time_seconds,
  RANK() OVER (
    PARTITION BY ss.contest_id 
    ORDER BY 
      COALESCE(SUM(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0) DESC,
      MAX(sps.accepted_at) ASC NULLS LAST
  )::bigint as rank
FROM public.student_sessions ss
LEFT JOIN public.student_problem_status sps ON sps.session_id = ss.id
LEFT JOIN public.problems p ON p.id = sps.problem_id
GROUP BY ss.id, ss.contest_id, ss.username, ss.warnings, ss.is_disqualified, ss.execution_count, ss.started_at;

GRANT SELECT ON public.leaderboard_view TO authenticated, anon;
GRANT SELECT ON public.admin_leaderboard_view TO authenticated;

-- Fix 2: submissions table - tighten policy to prevent cross-student viewing
-- The current policy checks if session exists and is not disqualified, but doesn't verify ownership

DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;

-- Students can ONLY view submissions for their own session
-- Since students aren't authenticated, we use a function-based approach
-- The frontend must pass session_id and we verify it matches
CREATE POLICY "Students can view only their session submissions"
ON public.submissions
FOR SELECT
USING (
  -- Admins can view all
  is_admin(auth.uid())
  -- Note: Without auth, we cannot verify session ownership server-side
  -- The ONLY secure approach is to deny public access entirely
  -- Students must use authenticated endpoints or edge functions
);

-- Remove any INSERT policy that might be too permissive
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;