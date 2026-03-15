-- Custom Test Cases Feature
-- Purpose: Allow students to run custom inputs for debugging WITHOUT counting as submissions.
-- All data access goes through the execute-code edge function (service role key), not the frontend
-- directly, so no RLS policies are needed on these tables.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Persistent test case storage (survives page reloads)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_custom_tests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  problem_id      UUID        NOT NULL REFERENCES problems(id)          ON DELETE CASCADE,
  input           TEXT        NOT NULL,
  expected_output TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_problem_test UNIQUE (session_id, problem_id, input)
);

CREATE INDEX IF NOT EXISTS idx_student_custom_tests_session_problem
  ON student_custom_tests (session_id, problem_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_custom_test_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_tests_updated_at
  BEFORE UPDATE ON student_custom_tests
  FOR EACH ROW EXECUTE FUNCTION update_custom_test_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Execution audit log (rate limiting + analytics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_test_executions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  problem_id       UUID        NOT NULL REFERENCES problems(id)          ON DELETE CASCADE,
  input            TEXT        NOT NULL,
  output           TEXT,
  status           TEXT        NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  execution_time_ms INTEGER,
  language         TEXT        NOT NULL,
  engine           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast rate-limit queries: "how many runs in the last minute for this session?"
CREATE INDEX IF NOT EXISTS idx_custom_test_executions_session_time
  ON custom_test_executions (session_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-cleanup trigger: keep max 100 rows per session to bound table growth
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_custom_test_executions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM custom_test_executions
  WHERE session_id = NEW.session_id
    AND id NOT IN (
      SELECT id
      FROM   custom_test_executions
      WHERE  session_id = NEW.session_id
      ORDER  BY created_at DESC
      LIMIT  100
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_custom_test_executions
  AFTER INSERT ON custom_test_executions
  FOR EACH ROW EXECUTE FUNCTION cleanup_old_custom_test_executions();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — enabled so the anon/authenticated keys cannot access these tables
--    directly. All reads/writes go through the execute-code edge function which
--    uses the service role key and therefore bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE student_custom_tests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_executions  ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE student_custom_tests   IS 'Student-saved custom test inputs (max 10 per problem, persisted across reloads)';
COMMENT ON TABLE custom_test_executions IS 'Execution audit log for custom tests — used for rate limiting and analytics';
