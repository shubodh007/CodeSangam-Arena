-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Student activity tracking for Admin Live Monitor
-- Adds three columns to student_sessions so the admin can see real-time
-- presence (is the student online, what problem are they on, are they typing).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.student_sessions
  ADD COLUMN IF NOT EXISTS last_active_at  TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_problem_id UUID
    REFERENCES public.problems(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_typing       BOOLEAN      NOT NULL DEFAULT false;

-- Index: monitor page queries sessions by contest, ordered by activity
CREATE INDEX IF NOT EXISTS idx_student_sessions_contest_activity
  ON public.student_sessions (contest_id, last_active_at DESC NULLS LAST);

-- Ensure student_sessions rows are published to Supabase Realtime.
-- (The initial migration may have already done this; the DO block is safe to
-- run again — it only adds the table if it is not yet a member.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'student_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_sessions;
  END IF;
END $$;
