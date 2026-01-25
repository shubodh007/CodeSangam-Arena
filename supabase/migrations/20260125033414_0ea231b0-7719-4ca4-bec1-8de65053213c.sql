-- Create leaderboard view with proper ranking
CREATE OR REPLACE VIEW public.leaderboard_view AS
WITH student_scores AS (
  SELECT 
    ss.id as session_id,
    ss.contest_id,
    ss.username,
    ss.is_disqualified,
    ss.warnings,
    ss.started_at,
    ss.ended_at,
    COALESCE(SUM(
      CASE WHEN sps.accepted_at IS NOT NULL THEN p.score ELSE 0 END
    ), 0) as total_score,
    COUNT(CASE WHEN sps.accepted_at IS NOT NULL THEN 1 END) as problems_solved,
    COALESCE(SUM(sps.wrong_attempts), 0) as wrong_attempts,
    COALESCE(
      SUM(
        CASE WHEN sps.accepted_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (sps.accepted_at - sps.opened_at))
        ELSE 0 END
      ), 0
    ) as total_time_seconds,
    MAX(sps.accepted_at) as last_accepted_at
  FROM public.student_sessions ss
  LEFT JOIN public.student_problem_status sps ON sps.session_id = ss.id
  LEFT JOIN public.problems p ON p.id = sps.problem_id
  GROUP BY ss.id, ss.contest_id, ss.username, ss.is_disqualified, ss.warnings, ss.started_at, ss.ended_at
)
SELECT 
  session_id,
  contest_id,
  username,
  is_disqualified,
  warnings,
  total_score,
  problems_solved::integer,
  wrong_attempts::integer,
  total_time_seconds::integer,
  last_accepted_at,
  RANK() OVER (
    PARTITION BY contest_id 
    ORDER BY 
      total_score DESC,
      wrong_attempts ASC,
      total_time_seconds ASC,
      last_accepted_at ASC NULLS LAST,
      username ASC
  ) as rank
FROM student_scores;

-- Grant select on leaderboard_view to authenticated and anon
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;