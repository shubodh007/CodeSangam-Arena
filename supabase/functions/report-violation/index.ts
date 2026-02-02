import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ViolationRequest {
  session_id: string;
  reason: string;
}

interface ViolationResponse {
  success: boolean;
  warnings?: number;
  is_disqualified?: boolean;
  error?: string;
  request_id: string;
}

const WARNING_LIMIT = 15;

Deno.serve(async (req: Request) => {
  const requestId = `vio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
          request_id: requestId,
        } as ViolationResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header - student must be authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized - missing token",
          request_id: requestId,
        } as ViolationResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error(`[${requestId}] JWT verification failed:`, claimsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized - invalid token",
          request_id: requestId,
        } as ViolationResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    let body: ViolationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON body",
          request_id: requestId,
        } as ViolationResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { session_id, reason } = body;

    // Validate session_id
    if (!session_id || typeof session_id !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id is required",
          request_id: requestId,
        } as ViolationResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id must be a valid UUID",
          request_id: requestId,
        } as ViolationResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to bypass RLS for atomic update
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the session belongs to this user and is still active
    const { data: session, error: fetchError } = await supabaseAdmin
      .from("student_sessions")
      .select("id, user_id, warnings, is_disqualified, ended_at, username")
      .eq("id", session_id)
      .single();

    if (fetchError || !session) {
      console.error(`[${requestId}] Session not found:`, fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found",
          request_id: requestId,
        } as ViolationResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership - student can only report violations for their own session
    if (session.user_id !== userId) {
      console.warn(`[${requestId}] User ${userId.substring(0, 8)}... attempted to report violation for session owned by ${session.user_id?.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden - not your session",
          request_id: requestId,
        } as ViolationResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already disqualified - just return current state
    if (session.is_disqualified) {
      console.info(`[${requestId}] Session already disqualified, returning current state`);
      return new Response(
        JSON.stringify({
          success: true,
          warnings: session.warnings,
          is_disqualified: true,
          request_id: requestId,
        } as ViolationResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Contest already ended
    if (session.ended_at) {
      console.info(`[${requestId}] Contest already ended for session`);
      return new Response(
        JSON.stringify({
          success: true,
          warnings: session.warnings,
          is_disqualified: session.is_disqualified,
          request_id: requestId,
        } as ViolationResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ATOMIC UPDATE: Increment warnings and compute disqualification in single query
    // This bypasses RLS using service role, ensuring the update always succeeds
    const newWarnings = session.warnings + 1;
    const shouldDisqualify = newWarnings >= WARNING_LIMIT;

    const updateData: Record<string, unknown> = {
      warnings: newWarnings,
      is_disqualified: shouldDisqualify,
    };

    // If disqualifying, also end the contest
    if (shouldDisqualify) {
      updateData.ended_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("student_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select("warnings, is_disqualified")
      .single();

    if (updateError) {
      console.error(`[${requestId}] Update failed:`, updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update warnings",
          request_id: requestId,
        } as ViolationResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the violation
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: shouldDisqualify ? "student_disqualified" : "violation_recorded",
        request_id: requestId,
        session_id: session_id.substring(0, 8) + "...",
        username: session.username,
        reason,
        previous_warnings: session.warnings,
        new_warnings: updated.warnings,
        is_disqualified: updated.is_disqualified,
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        warnings: updated.warnings,
        is_disqualified: updated.is_disqualified,
        request_id: requestId,
      } as ViolationResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        request_id: requestId,
      } as ViolationResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
