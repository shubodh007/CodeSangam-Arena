-- Add execution_count column to student_sessions for per-session quota tracking
ALTER TABLE public.student_sessions 
ADD COLUMN IF NOT EXISTS execution_count integer NOT NULL DEFAULT 0;

-- Add execution_logs table for audit logging
CREATE TABLE IF NOT EXISTS public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.student_sessions(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL,
  language text NOT NULL,
  mode text NOT NULL,
  status text NOT NULL,
  execution_time_ms integer,
  code_length integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on execution_logs
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view execution logs (for audit)
CREATE POLICY "Admins can view execution logs"
ON public.execution_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Edge function (service role) can insert logs
CREATE POLICY "Service can insert execution logs"
ON public.execution_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_execution_logs_session 
ON public.execution_logs(session_id, created_at DESC);