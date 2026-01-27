-- Fix the INSERT policy warning on student_sessions
-- Require valid contest for session creation

DROP POLICY IF EXISTS "Anyone can create sessions" ON public.student_sessions;

CREATE POLICY "Students can create sessions for active contests"
ON public.student_sessions
FOR INSERT
WITH CHECK (
  -- Can only create session for an active contest
  EXISTS (
    SELECT 1 FROM public.contests c
    WHERE c.id = contest_id
    AND c.is_active = true
  )
  -- And username must not already exist in this contest
  AND NOT EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.contest_id = student_sessions.contest_id
    AND ss.username = student_sessions.username
  )
);

-- Also add RLS policy for user_roles table (the one with no policies)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);