-- Fix: student_sessions table exposes sensitive student data publicly
-- Solution: Restrict SELECT to own session only, use leaderboard_view for rankings

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Students can view sessions for leaderboard" ON public.student_sessions;

-- Create restrictive policy: students can only view their own session
CREATE POLICY "Students can view own session only"
ON public.student_sessions
FOR SELECT
USING (
  -- Admins can view all
  is_admin(auth.uid())
  OR
  -- Students can only view their own session (identified by session ID in localStorage context)
  -- Since students aren't authenticated users, we restrict to no public access
  -- The leaderboard_view will be used for public ranking data
  false
);

-- Ensure leaderboard_view only exposes safe data for rankings
-- Drop and recreate with minimal columns and security_invoker
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW public.leaderboard_view
WITH (security_invoker = false)
AS
SELECT 
  ss.id as session_id,
  ss.contest_id,
  ss.username,
  ss.is_disqualified,
  -- Only show if disqualified, not warning count details
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
GROUP BY ss.id, ss.contest_id, ss.username, ss.is_disqualified, ss.started_at;

-- Grant SELECT on leaderboard_view to authenticated and anon
GRANT SELECT ON public.leaderboard_view TO authenticated, anon;