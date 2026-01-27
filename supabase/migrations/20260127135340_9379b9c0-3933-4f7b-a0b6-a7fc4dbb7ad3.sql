-- Add user_id column to student_sessions for proper RLS
ALTER TABLE public.student_sessions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique constraint to prevent duplicate sessions per user per contest
CREATE UNIQUE INDEX IF NOT EXISTS one_session_per_user_per_contest 
ON public.student_sessions (user_id, contest_id) 
WHERE user_id IS NOT NULL;

-- Drop existing restrictive policies that are causing issues
DROP POLICY IF EXISTS "Students can create sessions for active contests" ON public.student_sessions;
DROP POLICY IF EXISTS "Students can update own session safely" ON public.student_sessions;
DROP POLICY IF EXISTS "Only admins can view student sessions directly" ON public.student_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.student_sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.student_sessions;
DROP POLICY IF EXISTS "Public can view basic session data for leaderboard" ON public.student_sessions;

-- Create PERMISSIVE policies (these GRANT access)

-- Admins can do everything
CREATE POLICY "Admins can manage all sessions"
ON public.student_sessions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Students (including anonymous) can INSERT their own session
CREATE POLICY "Students can create own session"
ON public.student_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be for themselves
  auth.uid() = user_id
  -- Contest must be active
  AND EXISTS (
    SELECT 1 FROM public.contests c 
    WHERE c.id = contest_id AND c.is_active = true
  )
  -- Username must not already exist in this contest
  AND NOT EXISTS (
    SELECT 1 FROM public.student_sessions ss 
    WHERE ss.contest_id = student_sessions.contest_id 
    AND ss.username = student_sessions.username
  )
);

-- Students can SELECT their own session
CREATE POLICY "Students can read own session"
ON public.student_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Students can UPDATE their own session (if not disqualified)
CREATE POLICY "Students can update own session"
ON public.student_sessions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND is_disqualified = false 
  AND ended_at IS NULL
)
WITH CHECK (
  auth.uid() = user_id 
  AND is_disqualified = false 
  AND ended_at IS NULL
);