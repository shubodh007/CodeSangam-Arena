-- Create a database function for atomic session upsert
-- This handles all the business logic at the database level for true idempotency
CREATE OR REPLACE FUNCTION public.upsert_student_session(
  p_user_id UUID,
  p_contest_id UUID,
  p_username TEXT
)
RETURNS TABLE (
  session_id UUID,
  username TEXT,
  contest_id UUID,
  user_id UUID,
  warnings INTEGER,
  is_disqualified BOOLEAN,
  ended_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  execution_count INTEGER,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_action TEXT;
  v_session_id UUID;
BEGIN
  -- First check if session already exists for this user+contest
  SELECT ss.id, ss.username, ss.contest_id, ss.user_id, ss.warnings, 
         ss.is_disqualified, ss.ended_at, ss.started_at, ss.execution_count
  INTO v_existing
  FROM public.student_sessions ss
  WHERE ss.user_id = p_user_id AND ss.contest_id = p_contest_id
  FOR UPDATE; -- Lock the row to prevent race conditions
  
  IF FOUND THEN
    -- Session exists - return it with 'existing' action
    v_action := 'existing';
    RETURN QUERY 
    SELECT v_existing.id, v_existing.username, v_existing.contest_id, v_existing.user_id,
           v_existing.warnings, v_existing.is_disqualified, v_existing.ended_at,
           v_existing.started_at, v_existing.execution_count, v_action;
  ELSE
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
    
    -- Insert new session
    INSERT INTO public.student_sessions (user_id, contest_id, username, warnings, is_disqualified)
    VALUES (p_user_id, p_contest_id, p_username, 0, false)
    RETURNING id INTO v_session_id;
    
    v_action := 'created';
    
    RETURN QUERY 
    SELECT ss.id, ss.username, ss.contest_id, ss.user_id, ss.warnings,
           ss.is_disqualified, ss.ended_at, ss.started_at, ss.execution_count, v_action
    FROM public.student_sessions ss
    WHERE ss.id = v_session_id;
  END IF;
END;
$$;