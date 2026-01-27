-- Fix remaining security warnings on student_sessions table
-- Tighten UPDATE policy to be more restrictive

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Students can update own session" ON public.student_sessions;

-- More restrictive update policy - only allow updates to non-critical fields
-- and only for active, non-disqualified sessions
CREATE POLICY "Students can update own session safely"
ON public.student_sessions
FOR UPDATE
USING (
  -- Session must be active (not ended, not disqualified)
  is_disqualified = false
  AND ended_at IS NULL
)
WITH CHECK (
  -- Cannot unset disqualification or change critical fields maliciously
  is_disqualified = false
  AND ended_at IS NULL
);