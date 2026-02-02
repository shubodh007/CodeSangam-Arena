import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

interface SessionRequest {
  user_id: string;
  contest_id: string;
  username: string;
}

interface SessionResponse {
  success: boolean;
  session?: {
    session_id: string;
    username: string;
    contest_id: string;
    user_id: string;
    warnings: number;
    is_disqualified: boolean;
    ended_at: string | null;
    started_at: string;
    execution_count: number;
  };
  error?: string;
  request_id?: string;
}

// Generate request ID for tracing
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Sleep helper for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Structured logging
function log(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
          request_id: requestId,
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: SessionRequest = await req.json();
    const { user_id, contest_id, username } = body;

    // Input validation
    if (!user_id || !contest_id || !username) {
      log("warn", "Missing required fields", {
        request_id: requestId,
        has_user_id: !!user_id,
        has_contest_id: !!contest_id,
        has_username: !!username,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: user_id, contest_id, and username are required",
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate UUID formats
    if (!isValidUUID(user_id)) {
      log("warn", "Invalid user_id format", { request_id: requestId, user_id });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid user_id format",
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(contest_id)) {
      log("warn", "Invalid contest_id format", { request_id: requestId, contest_id });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid contest_id format",
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate username length
    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0 || trimmedUsername.length > 50) {
      log("warn", "Invalid username length", {
        request_id: requestId,
        username_length: trimmedUsername.length,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Username must be between 1 and 50 characters",
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log("info", "Session request received", {
      request_id: requestId,
      user_id: user_id.slice(0, 8) + "...",
      contest_id: contest_id.slice(0, 8) + "...",
      username: trimmedUsername,
    });

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute upsert with retry logic
    let lastError: Error | null = null;
    let result: SessionResponse | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.rpc("upsert_student_session", {
          p_user_id: user_id,
          p_contest_id: contest_id,
          p_username: trimmedUsername,
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("SESSION_EXISTS")) {
            log("warn", "Session already exists for user in contest", {
              request_id: requestId,
              user_id: user_id.slice(0, 8) + "...",
              contest_id: contest_id.slice(0, 8) + "...",
            });
            return new Response(
              JSON.stringify({
                success: false,
                error: "You already have a session in this contest. Each student can only join once.",
                request_id: requestId,
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          if (error.message.includes("USERNAME_TAKEN")) {
            log("warn", "Username already taken", {
              request_id: requestId,
              username: trimmedUsername,
              contest_id,
            });
            return new Response(
              JSON.stringify({
                success: false,
                error: "Username is already taken in this contest",
                request_id: requestId,
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          if (error.message.includes("CONTEST_INACTIVE")) {
            log("warn", "Contest is not active", {
              request_id: requestId,
              contest_id,
            });
            return new Response(
              JSON.stringify({
                success: false,
                error: "Contest is not active",
                request_id: requestId,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("No session returned from upsert");
        }

        const sessionData = data[0];

        log("info", "session_created", {
          request_id: requestId,
          session_id: sessionData.session_id,
          user_id: user_id.slice(0, 8) + "...",
          contest_id: contest_id.slice(0, 8) + "...",
          duration_ms: Date.now() - startTime,
        });

        result = {
          success: true,
          session: {
            session_id: sessionData.session_id,
            username: sessionData.username,
            contest_id: sessionData.contest_id,
            user_id: sessionData.user_id,
            warnings: sessionData.warnings,
            is_disqualified: sessionData.is_disqualified,
            ended_at: sessionData.ended_at,
            started_at: sessionData.started_at,
            execution_count: sessionData.execution_count,
          },
          request_id: requestId,
        };

        break; // Success, exit retry loop
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        log("warn", `Attempt ${attempt} failed`, {
          request_id: requestId,
          attempt,
          error: lastError.message,
        });

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
        }
      }
    }

    if (result) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All retries failed
    log("error", "All retry attempts failed", {
      request_id: requestId,
      error: lastError?.message,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create or retrieve session. Please try again.",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("error", "Unexpected error", {
      request_id: requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
