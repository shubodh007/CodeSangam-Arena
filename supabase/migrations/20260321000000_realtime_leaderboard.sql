-- ============================================================
-- REALTIME LEADERBOARD - Event broadcast system
-- ============================================================
-- Strategy: instead of subscribing to every change on submissions,
-- student_problem_status, and student_sessions (all unfiltered),
-- we funnel all relevant events into a single leaderboard_events
-- table that IS filterable by contest_id at the Realtime layer.
-- This means each subscriber only receives events for their contest.
-- ============================================================

-- 1. Create the leaderboard_events broadcast table
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id   UUID        NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL CHECK (event_type IN (
                             'submission', 'problem_status', 'disqualification', 'warning'
                           )),
  session_id   UUID        REFERENCES student_sessions(id) ON DELETE CASCADE,
  data         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_events_contest_time
  ON leaderboard_events (contest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_events_session
  ON leaderboard_events (session_id, created_at DESC);

COMMENT ON TABLE leaderboard_events IS
  'Filtered event stream for real-time leaderboard updates. '
  'Each row carries the contest_id so Supabase Realtime can '
  'filter by contest — frontend subscribers only receive events '
  'for the contest they are currently viewing.';

-- 2. Auto-cleanup: keep at most 500 events per contest
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_leaderboard_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM leaderboard_events
  WHERE  contest_id = NEW.contest_id
    AND  id NOT IN (
           SELECT id
           FROM   leaderboard_events
           WHERE  contest_id = NEW.contest_id
           ORDER  BY created_at DESC
           LIMIT  500
         );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_leaderboard_events ON leaderboard_events;
CREATE TRIGGER trg_cleanup_leaderboard_events
  AFTER INSERT ON leaderboard_events
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_leaderboard_events();

-- 3. Generic trigger function: submissions & student_problem_status
-- ============================================================
-- This runs after INSERT or UPDATE on either table, resolves the
-- contest_id from student_sessions, and inserts one event row.
-- The trigger is DEFERRED so it does not slow down the main txn.
CREATE OR REPLACE FUNCTION emit_leaderboard_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contest_id UUID;
  v_event_type TEXT;
BEGIN
  -- Resolve contest_id
  SELECT contest_id
    INTO v_contest_id
    FROM student_sessions
   WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  IF v_contest_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine event type
  v_event_type := CASE TG_TABLE_NAME
    WHEN 'submissions'             THEN 'submission'
    WHEN 'student_problem_status'  THEN 'problem_status'
    ELSE 'submission'
  END;

  INSERT INTO leaderboard_events (contest_id, event_type, session_id, data)
  VALUES (
    v_contest_id,
    v_event_type,
    COALESCE(NEW.session_id, OLD.session_id),
    jsonb_build_object(
      'table',     TG_TABLE_NAME,
      'operation', TG_OP,
      'ts',        NOW()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to submissions
DROP TRIGGER IF EXISTS trg_submissions_leaderboard_event ON submissions;
CREATE TRIGGER trg_submissions_leaderboard_event
  AFTER INSERT OR UPDATE OF status, score
  ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION emit_leaderboard_event();

-- Attach to student_problem_status (partial scores, is_accepted changes)
DROP TRIGGER IF EXISTS trg_problem_status_leaderboard_event ON student_problem_status;
CREATE TRIGGER trg_problem_status_leaderboard_event
  AFTER INSERT OR UPDATE OF is_accepted, partial_score, wrong_attempts
  ON student_problem_status
  FOR EACH ROW
  EXECUTE FUNCTION emit_leaderboard_event();

-- 4. Disqualification / warning events (student_sessions)
-- ============================================================
CREATE OR REPLACE FUNCTION emit_session_leaderboard_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  -- Disqualification
  IF NEW.is_disqualified IS TRUE
     AND (OLD.is_disqualified IS NULL OR OLD.is_disqualified IS FALSE)
  THEN
    v_event_type := 'disqualification';
  -- Warning count increased
  ELSIF NEW.warnings IS DISTINCT FROM OLD.warnings
     AND NEW.warnings > COALESCE(OLD.warnings, 0)
  THEN
    v_event_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO leaderboard_events (contest_id, event_type, session_id, data)
  VALUES (
    NEW.contest_id,
    v_event_type,
    NEW.id,
    jsonb_build_object(
      'username',  NEW.username,
      'warnings',  NEW.warnings,
      'ts',        NOW()
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_leaderboard_event ON student_sessions;
CREATE TRIGGER trg_session_leaderboard_event
  AFTER UPDATE OF is_disqualified, warnings
  ON student_sessions
  FOR EACH ROW
  EXECUTE FUNCTION emit_session_leaderboard_event();

-- 5. RLS — anon/authenticated users can read events for their contest.
--    Service role (edge functions) can write. Admins can read all.
-- ============================================================
ALTER TABLE leaderboard_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admins) can read all
CREATE POLICY "admins_read_leaderboard_events"
  ON leaderboard_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon users (students) cannot read events directly —
-- they go through the hook which fetches leaderboard_view.
-- Service role bypasses RLS for inserts from triggers.

-- 6. Enable Realtime for the events table
-- ============================================================
DO $$
BEGIN
  -- supabase_realtime publication must already exist (it always does in Supabase).
  -- We add leaderboard_events if it is not already a member.
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  tablename = 'leaderboard_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_events;
  END IF;
END;
$$;
