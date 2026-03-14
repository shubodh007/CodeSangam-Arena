
-- Fix leaderboard_view with correct 5-level ranking criteria
CREATE OR REPLACE VIEW public.leaderboard_view WITH (security_invoker = false) AS
SELECT 
  ss.id AS session_id,
  ss.contest_id,
  ss.username,
  COALESCE(sum(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0::bigint) AS total_score,
  count(sps.accepted_at)::integer AS problems_solved,
  COALESCE(sum(sps.wrong_attempts), 0::bigint)::integer AS wrong_attempts,
  max(sps.accepted_at) AS last_accepted_at,
  COALESCE(
    sum(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer) FILTER (WHERE sps.accepted_at IS NOT NULL),
    0
  )::integer AS total_time_seconds,
  rank() OVER (
    PARTITION BY ss.contest_id 
    ORDER BY 
      COALESCE(sum(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0::bigint) DESC,
      COALESCE(sum(sps.wrong_attempts), 0::bigint) ASC,
      COALESCE(sum(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer) FILTER (WHERE sps.accepted_at IS NOT NULL), 0) ASC,
      max(sps.accepted_at) ASC NULLS LAST,
      ss.username ASC
  ) AS rank
FROM student_sessions ss
  LEFT JOIN student_problem_status sps ON sps.session_id = ss.id
  LEFT JOIN problems p ON p.id = sps.problem_id
WHERE ss.is_disqualified = false 
  AND EXISTS (SELECT 1 FROM contests c WHERE c.id = ss.contest_id AND c.is_active = true)
GROUP BY ss.id, ss.contest_id, ss.username, ss.started_at;

-- Fix admin_leaderboard_view with same ranking criteria
CREATE OR REPLACE VIEW public.admin_leaderboard_view AS
SELECT 
  ss.id AS session_id,
  ss.contest_id,
  ss.username,
  ss.warnings,
  ss.is_disqualified,
  ss.execution_count,
  COALESCE(sum(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0::bigint) AS total_score,
  count(sps.accepted_at)::integer AS problems_solved,
  COALESCE(sum(sps.wrong_attempts), 0::bigint)::integer AS wrong_attempts,
  max(sps.accepted_at) AS last_accepted_at,
  COALESCE(
    sum(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer) FILTER (WHERE sps.accepted_at IS NOT NULL),
    0
  )::integer AS total_time_seconds,
  rank() OVER (
    PARTITION BY ss.contest_id 
    ORDER BY 
      COALESCE(sum(p.score) FILTER (WHERE sps.accepted_at IS NOT NULL), 0::bigint) DESC,
      COALESCE(sum(sps.wrong_attempts), 0::bigint) ASC,
      COALESCE(sum(EXTRACT(epoch FROM (sps.accepted_at - sps.opened_at))::integer) FILTER (WHERE sps.accepted_at IS NOT NULL), 0) ASC,
      max(sps.accepted_at) ASC NULLS LAST,
      ss.username ASC
  ) AS rank
FROM student_sessions ss
  LEFT JOIN student_problem_status sps ON sps.session_id = ss.id
  LEFT JOIN problems p ON p.id = sps.problem_id
GROUP BY ss.id, ss.contest_id, ss.username, ss.warnings, ss.is_disqualified, ss.execution_count, ss.started_at;
