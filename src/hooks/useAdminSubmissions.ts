import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminSubmissionView, SubmissionHistory, SubmissionStats } from '@/types/admin';

interface SubmissionFilters {
  contestId?: string;
  problemId?: string;
  sessionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const useAdminSubmissions = (filters: SubmissionFilters = {}) => {
  return useQuery({
    queryKey: ['admin-submissions', filters],
    queryFn: async () => {
      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      let query = supabase
        .from('admin_submissions_view')
        .select('*', { count: 'exact' });

      if (filters.contestId) query = query.eq('contest_id', filters.contestId);
      if (filters.problemId) query = query.eq('problem_id', filters.problemId);
      if (filters.sessionId) query = query.eq('session_id', filters.sessionId);
      if (filters.status) query = query.eq('status', filters.status);

      query = query
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        submissions: (data ?? []) as AdminSubmissionView[],
        total: count ?? 0,
        limit,
        offset,
      };
    },
    staleTime: 30000,
  });
};

export const useSubmissionDetail = (submissionId: string | null) => {
  return useQuery({
    queryKey: ['submission-detail', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;

      const { data, error } = await supabase
        .from('admin_submissions_view')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

      if (error) throw error;

      const { data: history } = await supabase
        .from('submissions')
        .select('id, status, score, submitted_at')
        .eq('session_id', (data as AdminSubmissionView).session_id)
        .eq('problem_id', (data as AdminSubmissionView).problem_id)
        .order('submitted_at', { ascending: false });

      return {
        submission: data as AdminSubmissionView,
        history: (history ?? []) as SubmissionHistory[],
      };
    },
    enabled: !!submissionId,
  });
};

export const useSubmissionStats = (contestId: string | null) => {
  return useQuery({
    queryKey: ['submission-stats', contestId],
    queryFn: async () => {
      if (!contestId) return null;

      const { data, error } = await supabase.rpc('get_submission_stats', {
        p_contest_id: contestId,
      });

      if (error) throw error;
      return { stats: (data ?? []) as SubmissionStats[] };
    },
    enabled: !!contestId,
    staleTime: 60000,
  });
};
