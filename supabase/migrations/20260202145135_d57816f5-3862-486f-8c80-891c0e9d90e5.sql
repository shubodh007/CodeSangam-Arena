-- Replace upsert_student_session to reject existing sessions instead of returning them
CREATE OR REPLACE FUNCTION public.upsert_student_session(
  p_user_id UUID,
  p_contest_id UUID,
  p_username TEXT
)
RETURNS TABLE(
  session_id UUID,
  username TEXT,
  contest_id UUID,
  user_id UUID,
  warnings INTEGER,
  is_disqualified BOOLEAN,
  ended_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if session already exists for this user+contest (reject recovery)
  IF EXISTS (
    SELECT 1 FROM public.student_sessions ss
    WHERE ss.user_id = p_user_id AND ss.contest_id = p_contest_id
  ) THEN
    RAISE EXCEPTION 'SESSION_EXISTS: You already have a session in this contest';
  END IF;
  
  -- Check if username is taken in this contest by another user
  IF EXISTS (
    SELECT 1 FROM public.student_sessions 
    WHERE student_sessions.contest_id = p_contest_id 
    AND student_sessions.username = p_username
  ) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN: Username already taken in this contest';
  END IF;
  
  -- Check if contest is active
  IF NOT EXISTS (
    SELECT 1 FROM public.contests c 
    WHERE c.id = p_contest_id AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'CONTEST_INACTIVE: Contest is not active';
  END IF;
  
  -- Insert new session (no upsert, create-only)
  INSERT INTO public.student_sessions (user_id, contest_id, username, warnings, is_disqualified)
  VALUES (p_user_id, p_contest_id, p_username, 0, false)
  RETURNING id INTO v_session_id;
  
  RETURN QUERY 
  SELECT ss.id, ss.username, ss.contest_id, ss.user_id, ss.warnings,
         ss.is_disqualified, ss.ended_at, ss.started_at, ss.execution_count, 'created'::TEXT
  FROM public.student_sessions ss
  WHERE ss.id = v_session_id;
END;
$$;