-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Add role column to profiles for convenience (non-authoritative)
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';

-- Create contests table
CREATE TABLE public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create problems table
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  score INTEGER NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sample_test_cases table (visible to students)
CREATE TABLE public.sample_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hidden_test_cases table (for submission grading)
CREATE TABLE public.hidden_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student_sessions table
CREATE TABLE public.student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  warnings INTEGER NOT NULL DEFAULT 0,
  is_disqualified BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contest_id, username)
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.student_sessions(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));

-- Contests policies (public read for active, admin full access)
CREATE POLICY "Anyone can view active contests" ON public.contests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can do everything with contests" ON public.contests FOR ALL USING (public.is_admin(auth.uid()));

-- Problems policies
CREATE POLICY "Anyone can view problems of active contests" ON public.problems FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.contests WHERE id = contest_id AND is_active = true));
CREATE POLICY "Admins can do everything with problems" ON public.problems FOR ALL USING (public.is_admin(auth.uid()));

-- Sample test cases policies
CREATE POLICY "Anyone can view sample test cases" ON public.sample_test_cases FOR SELECT USING (true);
CREATE POLICY "Admins can do everything with sample test cases" ON public.sample_test_cases FOR ALL USING (public.is_admin(auth.uid()));

-- Hidden test cases policies (admin only)
CREATE POLICY "Only admins can access hidden test cases" ON public.hidden_test_cases FOR ALL USING (public.is_admin(auth.uid()));

-- Student sessions policies
CREATE POLICY "Anyone can create student sessions" ON public.student_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view student sessions" ON public.student_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update student sessions" ON public.student_sessions FOR UPDATE USING (true);

-- Submissions policies
CREATE POLICY "Anyone can create submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view submissions" ON public.submissions FOR SELECT USING (true);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;