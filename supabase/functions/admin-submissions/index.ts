import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // GET /admin-submissions/list
    if (action === 'list' && req.method === 'GET') {
      const contestId = url.searchParams.get('contestId');
      const problemId = url.searchParams.get('problemId');
      const sessionId = url.searchParams.get('sessionId');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabaseClient
        .from('admin_submissions_view')
        .select('*', { count: 'exact' });

      if (contestId) query = query.eq('contest_id', contestId);
      if (problemId) query = query.eq('problem_id', problemId);
      if (sessionId) query = query.eq('session_id', sessionId);
      if (status) query = query.eq('status', status);

      query = query
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ submissions: data, total: count, limit, offset }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin-submissions/detail?id=...
    if (action === 'detail' && req.method === 'GET') {
      const submissionId = url.searchParams.get('id');

      if (!submissionId) {
        return new Response(
          JSON.stringify({ error: 'Submission ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient
        .from('admin_submissions_view')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

      if (error) throw error;

      // Submission history for this student on this problem
      const { data: history } = await supabaseClient
        .from('submissions')
        .select('id, status, score, submitted_at')
        .eq('session_id', data.session_id)
        .eq('problem_id', data.problem_id)
        .order('submitted_at', { ascending: false });

      return new Response(
        JSON.stringify({ submission: data, history: history || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin-submissions/stats?contestId=...
    if (action === 'stats' && req.method === 'GET') {
      const contestId = url.searchParams.get('contestId');

      if (!contestId) {
        return new Response(
          JSON.stringify({ error: 'Contest ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient.rpc('get_submission_stats', {
        p_contest_id: contestId,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ stats: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin-submissions/by-student?sessionId=...
    if (action === 'by-student' && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Session ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient
        .from('admin_submissions_view')
        .select('*')
        .eq('session_id', sessionId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ submissions: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
