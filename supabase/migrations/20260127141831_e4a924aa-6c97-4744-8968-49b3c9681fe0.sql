-- Add INSERT policy for students to create submissions for their own active sessions
CREATE POLICY "Students can insert submissions for own session"
ON public.submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.id = submissions.session_id
    AND ss.user_id = auth.uid()
    AND ss.is_disqualified = false
    AND ss.ended_at IS NULL
  )
);