-- Update student_problem_status policies to work with user_id-based sessions
DROP POLICY IF EXISTS "Students can insert own problem status" ON public.student_problem_status;
DROP POLICY IF EXISTS "Students can update own problem status" ON public.student_problem_status;
DROP POLICY IF EXISTS "Students can view own problem status" ON public.student_problem_status;

-- Students can INSERT problem status for their own session
CREATE POLICY "Students can insert own problem status"
ON public.student_problem_status
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.id = session_id
    AND ss.user_id = auth.uid()
    AND ss.is_disqualified = false
    AND ss.ended_at IS NULL
  )
);

-- Students can UPDATE problem status for their own session
CREATE POLICY "Students can update own problem status"
ON public.student_problem_status
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.id = session_id
    AND ss.user_id = auth.uid()
    AND ss.is_disqualified = false
  )
);

-- Students can SELECT problem status for their own session
CREATE POLICY "Students can view own problem status"
ON public.student_problem_status
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.id = session_id
    AND ss.user_id = auth.uid()
  )
);