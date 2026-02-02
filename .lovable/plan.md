
# Plan: Remove Session Recovery Functionality

## Overview

The session recovery system allows students to rejoin a contest if they have an existing session. This is implemented through:

1. **Database function (`upsert_student_session`)** - Returns existing sessions when a user+contest pair already exists
2. **Edge function (`session-management`)** - Uses the database function and returns `action: "existing"` for existing sessions
3. **Frontend handling** - Stores session in localStorage and uses it to resume

## What Needs to Change

### 1. Database Function Update

The `upsert_student_session` function currently:
- Checks if a session exists for user+contest
- If exists: returns it with `action: "existing"` 
- If not: creates new session

**Change**: Modify to reject existing sessions instead of returning them. If a session already exists for a user+contest:
- If session is active (not ended/disqualified): Reject with error
- If session has ended or is disqualified: Also reject with error

This ensures students cannot "recover" into any existing session.

### 2. Edge Function Update (`session-management/index.ts`)

- Remove the `action: "existing"` response type
- Only return success for newly created sessions
- Handle the new error case when an existing session is found

### 3. Frontend Update (`StudentEntry.tsx`)

- Remove handling for existing session responses
- Simplify error handling since sessions are now create-only
- Show appropriate error message when user already has a session

### 4. localStorage Session Handling

The localStorage `arena_session` storage is still needed for active contest navigation, but:
- It will only be set for NEW sessions
- No recovery flow will use it

---

## Technical Implementation Details

### Database Migration

Create a new migration to replace the `upsert_student_session` function:

```sql
CREATE OR REPLACE FUNCTION public.upsert_student_session(
  p_user_id UUID,
  p_contest_id UUID,
  p_username TEXT
)
RETURNS TABLE (...)
AS $$
BEGIN
  -- Check if session already exists for this user+contest
  IF EXISTS (
    SELECT 1 FROM public.student_sessions 
    WHERE user_id = p_user_id AND contest_id = p_contest_id
  ) THEN
    RAISE EXCEPTION 'SESSION_EXISTS: You already have a session in this contest';
  END IF;
  
  -- Check username availability
  IF EXISTS (
    SELECT 1 FROM public.student_sessions 
    WHERE contest_id = p_contest_id AND username = p_username
  ) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN: Username already taken in this contest';
  END IF;
  
  -- Check contest is active
  IF NOT EXISTS (
    SELECT 1 FROM public.contests WHERE id = p_contest_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'CONTEST_INACTIVE: Contest is not active';
  END IF;
  
  -- Insert new session only
  INSERT INTO public.student_sessions (user_id, contest_id, username, warnings, is_disqualified)
  VALUES (p_user_id, p_contest_id, p_username, 0, false)
  RETURNING id, username, contest_id, user_id, warnings, is_disqualified, ended_at, started_at, execution_count, 'created';
END;
$$;
```

### Edge Function Changes (`session-management/index.ts`)

1. Remove `action?: "created" | "existing"` from response type (or simplify to always be `"created"`)
2. Add error handler for `SESSION_EXISTS` exception
3. Remove the "existing" session logging branch

### Frontend Changes (`StudentEntry.tsx`)

1. Add error handling for "SESSION_EXISTS" error from the edge function
2. Display user-friendly message: "You already have a session in this contest. Each student can only join once."
3. Remove any differentiation between new and existing sessions

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/new_migration.sql` | Create new migration to update `upsert_student_session` function |
| `supabase/functions/session-management/index.ts` | Handle SESSION_EXISTS error, remove "existing" action handling |
| `supabase/functions/session-management/README.md` | Update documentation |
| `src/pages/student/StudentEntry.tsx` | Add SESSION_EXISTS error handling with user-friendly message |

---

## User Experience After Change

1. **First entry**: Student enters username, selects contest → Session created → Enters contest
2. **Second entry attempt**: Student tries to join same contest → Error: "You already have a session in this contest"
3. **Browser refresh during contest**: Still works (localStorage session used for navigation validation)
4. **After disqualification/contest end**: Cannot rejoin at all
