# Session Management Edge Function

## Overview

This edge function provides **idempotent session creation** for contest participants, permanently fixing the duplicate session error (`ERROR: duplicate key value violates unique constraint "one_session_per_user_per_contest"`).

## UPSERT Behavior

The function uses a database-level UPSERT pattern via the `upsert_student_session` PostgreSQL function:

1. **New Session**: If no session exists for the user+contest combination, creates a new session and returns `action: "created"`.

2. **Existing Session**: If a session already exists, returns the existing session with `action: "existing"`. No fields are overwritten (DO NOTHING behavior for existing sessions).

3. **Business Rules Enforced**:
   - Username uniqueness per contest (returns 409 Conflict if taken)
   - Contest must be active (returns 400 if inactive)
   - Row-level locking prevents race conditions

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
| 200 | Session created or existing session returned |
| 400 | Missing/invalid input, inactive contest |
| 405 | Method not allowed (only POST accepted) |
| 409 | Username already taken in contest |
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
  "action": "created" | "existing",
  "request_id": "req_abc123"
}
```

## Idempotency & Concurrency

- **Database-level UPSERT**: Uses `SELECT ... FOR UPDATE` to lock the row during check, preventing race conditions.
- **Retry with backoff**: Transient DB errors trigger up to 3 retries with exponential backoff.
- **No read-then-insert pattern**: Single atomic operation eliminates race windows.

## Observability

Structured JSON logs include:

- `request_id`: Unique identifier for request tracing
- `user_id`, `contest_id`: Truncated identifiers
- `action`: `created`, `existing`, or error type
- `duration_ms`: Request processing time
- `session_conflict_resolved`: Event when duplicate request returns existing session

## Testing

Run tests with:

```bash
deno test --allow-net --allow-env supabase/functions/session-management/index.test.ts
```

Tests cover:
- Input validation (missing fields, invalid UUIDs, username length)
- Concurrent request handling
- CORS headers
- HTTP method validation
