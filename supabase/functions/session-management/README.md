# Session Management Edge Function

## Overview

This edge function provides **session creation** for contest participants. Sessions are create-only—students cannot recover or rejoin a contest once they have a session.

## Behavior

The function uses a database-level check via the `upsert_student_session` PostgreSQL function:

1. **New Session**: If no session exists for the user+contest combination, creates a new session.

2. **Existing Session**: If a session already exists (active, ended, or disqualified), returns a 409 error. **No session recovery is allowed.**

3. **Business Rules Enforced**:
   - One session per user per contest (returns 409 if session exists)
   - Username uniqueness per contest (returns 409 if taken)
   - Contest must be active (returns 400 if inactive)

## API

### Request

```http
POST /functions/v1/session-management
Content-Type: application/json
Authorization: Bearer <anon_key>

{
  "user_id": "uuid",
  "contest_id": "uuid",
  "username": "string (1-50 chars)"
}
```

### Responses

| Status | Condition |
|--------|-----------|
| 200 | New session created |
| 400 | Missing/invalid input, inactive contest |
| 405 | Method not allowed (only POST accepted) |
| 409 | Session already exists OR username taken |
| 500 | Unexpected server error |

### Success Response

```json
{
  "success": true,
  "session": {
    "session_id": "uuid",
    "username": "string",
    "contest_id": "uuid",
    "user_id": "uuid",
    "warnings": 0,
    "is_disqualified": false,
    "ended_at": null,
    "started_at": "2024-01-01T00:00:00.000Z",
    "execution_count": 0
  },
  "request_id": "req_abc123"
}
```

### Error Response (Session Exists)

```json
{
  "success": false,
  "error": "You already have a session in this contest. Each student can only join once.",
  "request_id": "req_abc123"
}
```

## Concurrency

- **Database-level check**: Uses row-level checks to prevent race conditions.
- **Retry with backoff**: Transient DB errors trigger up to 3 retries with exponential backoff.

## Observability

Structured JSON logs include:

- `request_id`: Unique identifier for request tracing
- `user_id`, `contest_id`: Truncated identifiers
- `duration_ms`: Request processing time

## Testing

Run tests with:

```bash
deno test --allow-net --allow-env supabase/functions/session-management/index.test.ts
```

Tests cover:
- Input validation (missing fields, invalid UUIDs, username length)
- CORS headers
- HTTP method validation
