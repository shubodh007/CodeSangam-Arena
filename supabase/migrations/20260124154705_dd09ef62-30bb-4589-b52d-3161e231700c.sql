-- Add student_problem_status table to track opened/solved problems
CREATE TABLE public.student_problem_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.student_sessions(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  wrong_attempts INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, problem_id)
);

-- Enable RLS
ALTER TABLE public.student_problem_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view student problem status" 
  ON public.student_problem_status FOR SELECT USING (true);

CREATE POLICY "Anyone can insert student problem status" 
  ON public.student_problem_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update student problem status" 
  ON public.student_problem_status FOR UPDATE USING (true);

-- Enable realtime for student_problem_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_problem_status;