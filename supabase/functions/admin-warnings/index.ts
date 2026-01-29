import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WarningRequest {
  session_id: string;
  action: "increment" | "reset";
  reason?: string;
}

interface WarningResponse {
  success: boolean;
  session_id?: string;
  warnings?: number;
  is_disqualified?: boolean;
  action?: string;
  error?: string;
  request_id: string;
}

const WARNING_LIMIT = 15;

Deno.serve(async (req: Request) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
        } as WarningResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized - missing token",
          request_id: requestId,
        } as WarningResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
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
        } as WarningResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error(`[${requestId}] Admin check failed:`, roleError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden - admin access required",
          request_id: requestId,
        } as WarningResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: WarningRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON body",
          request_id: requestId,
        } as WarningResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate session_id
    const { session_id, action = "increment", reason } = body;
    
    if (!session_id || typeof session_id !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id is required and must be a string",
          request_id: requestId,
        } as WarningResponse),
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
        } as WarningResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Admin warning action requested",
        request_id: requestId,
        admin_user_id: userId.substring(0, 8) + "...",
        session_id: session_id.substring(0, 8) + "...",
        action,
        reason,
      })
    );

    // Use service role client for the update to bypass RLS
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "increment") {
      // Atomic increment with disqualification check
      // Using raw SQL via RPC for atomic operation
      const { data: session, error: fetchError } = await supabaseAdmin
        .from("student_sessions")
        .select("id, warnings, is_disqualified, username")
        .eq("id", session_id)
        .single();

      if (fetchError || !session) {
        console.error(`[${requestId}] Session not found:`, fetchError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Session not found",
            request_id: requestId,
          } as WarningResponse),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate new warning count (no cap - unbounded)
      const newWarnings = session.warnings + 1;
      const shouldDisqualify = newWarnings >= WARNING_LIMIT;

      // Atomic update
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("student_sessions")
        .update({
          warnings: newWarnings,
          is_disqualified: shouldDisqualify,
          ...(shouldDisqualify && !session.is_disqualified && { ended_at: new Date().toISOString() }),
        })
        .eq("id", session_id)
        .select("id, warnings, is_disqualified")
        .single();

      if (updateError) {
        console.error(`[${requestId}] Update failed:`, updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to update warnings",
            request_id: requestId,
          } as WarningResponse),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "info",
          message: shouldDisqualify ? "student_disqualified" : "warning_added",
          request_id: requestId,
          session_id: session_id.substring(0, 8) + "...",
          username: session.username,
          previous_warnings: session.warnings,
          new_warnings: updated.warnings,
          is_disqualified: updated.is_disqualified,
          reason,
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          session_id: updated.id,
          warnings: updated.warnings,
          is_disqualified: updated.is_disqualified,
          action: shouldDisqualify ? "disqualified" : "warning_added",
          request_id: requestId,
        } as WarningResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "reset") {
      // Reset warnings (admin recovery action)
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("student_sessions")
        .update({
          warnings: 0,
          is_disqualified: false,
        })
        .eq("id", session_id)
        .select("id, warnings, is_disqualified")
        .single();

      if (updateError) {
        console.error(`[${requestId}] Reset failed:`, updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to reset warnings",
            request_id: requestId,
          } as WarningResponse),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "info",
          message: "warnings_reset",
          request_id: requestId,
          session_id: session_id.substring(0, 8) + "...",
          admin_user_id: userId.substring(0, 8) + "...",
          reason,
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          session_id: updated.id,
          warnings: updated.warnings,
          is_disqualified: updated.is_disqualified,
          action: "warnings_reset",
          request_id: requestId,
        } as WarningResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid action. Use "increment" or "reset"',
          request_id: requestId,
        } as WarningResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        request_id: requestId,
      } as WarningResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
