-- Fix: Remove overly permissive INSERT policy and make it service-role only
-- Edge functions use service role key which bypasses RLS, so we can be restrictive

DROP POLICY IF EXISTS "Service can insert execution logs" ON public.execution_logs;

-- No INSERT policy needed - service role bypasses RLS
-- This makes the table insert-only via service role (edge functions)