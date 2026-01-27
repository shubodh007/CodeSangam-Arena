-- Fix is_admin function to use authoritative user_roles table
-- Using CREATE OR REPLACE to avoid dropping dependent policies

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
  )
$$;