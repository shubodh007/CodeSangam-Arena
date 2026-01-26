-- Enable realtime for contests table (for admin live editing)
ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;

-- Enable realtime for problems table (for admin live problem management)
ALTER PUBLICATION supabase_realtime ADD TABLE public.problems;