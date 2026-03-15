# CodeSangam Arena

A competitive coding contest platform built for colleges and coding clubs. Students join contests, solve problems in a Monaco-powered editor, and compete on a live leaderboard — all without requiring an account.

---

## Features

### 1. Custom Test Cases
- Students can write, save, and run their own test inputs directly from the coding page
- Saved tests persist across sessions (stored in DB per student + problem)
- Custom runs do **not** count toward the execution quota
- Full CRUD — add, edit, delete test cases from a dedicated panel

### 2. Real-Time Leaderboard
- Live rank updates using Supabase Realtime — no polling, event-driven via DB triggers
- Each contest page only receives events for its own contest (filtered subscription)
- Rank-change animations (up/down indicators) with auto-clear after 3s
- Admin leaderboard shows disqualification/warning toasts in real time
- 60s safety-net poll as fallback for missed events during network drops

### 3. Keyboard Shortcuts System
- Global shortcuts: `Ctrl+R` run, `Ctrl+Enter` submit, `Ctrl+S` save, `Alt+1–9` navigate problems, `?` open shortcuts modal
- Monaco-aware: shortcuts registered via `editor.addCommand` to avoid conflicts
- Floating key-press indicator (bottom-right, auto-dismisses after 2.8s)
- Searchable shortcuts modal with category tabs

### 4. UI/UX Overhaul
- Custom Monaco `arena-dark` theme (One Dark Pro)
- Mobile-first tabbed layout in the problem solver
- Skeleton shimmer loaders, CSS-only animations (no framer-motion)
- Virtualized leaderboard rows for contests with 50+ participants
- Full accessibility: skip-to-content links, `aria-live` regions, focus management
- `ErrorBoundary` per route with auto-reset on navigation

### 5. Enhanced Anti-Cheat
- Detects: tab switch, window blur, Meta/Windows key, PrintScreen, virtual desktop switching (`Ctrl+Win+Arrow`)
- `document.mouseleave` detection for cursor leaving browser window
- 600ms debounce to avoid double-trigger on Alt+Tab with `visibilitychange`
- Transient violation warning banner (4s auto-dismiss, shake animation)
- Unified with existing warning/disqualification flow — no state duplication

### 6. Post-Contest PDF Reports (Admin)
- Auto-generated 5-page PDF: Cover, Summary, Problem Analytics, Leaderboard, Anti-Cheat stats
- Downloadable from the admin contest leaderboard page
- Code-split via `React.lazy` — ~1.3MB PDF renderer only loads on the report page
- Includes solve rates, average scores, warning/disqualification counts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Backend | Supabase (PostgreSQL + Edge Functions w/ Deno) |
| Code Execution | Judge0 (primary) → Piston (fallback) |
| State Management | Zustand (`subscribeWithSelector`) |
| Data Fetching | TanStack Query v5 |
| PDF Generation | `@react-pdf/renderer` v3.4 |
| Notifications | Sonner |

---

## Architecture Notes

- **No auth for students** — sessions are anonymous, identified by a `sessionId` UUID in `localStorage`
- **Edge functions** use the Supabase service role key to bypass RLS (students have no `auth.uid()`)
- **Admins** use Supabase Auth + `user_roles` table with an `app_role` enum
- **Code execution** is abstracted in `execution_controller.ts` with automatic Judge0 → Piston fallback

---

## Getting Started

```sh
# Clone the repo
git clone https://github.com/shubodh007/CodeSangam-Arena.git
cd CodeSangam-Arena

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase URL, anon key, and Judge0 API key

# Start the dev server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create a Supabase project
2. Run all migrations in `supabase/migrations/` in order
3. Deploy edge functions: `supabase functions deploy execute-code`
4. Enable Realtime on the `leaderboard_events` table

---

## Project Structure

```
src/
├── components/        # UI components (leaderboard, feedback, landing, etc.)
├── hooks/             # Custom React hooks
├── lib/               # Utilities (Monaco theme, anti-cheat helpers)
├── pages/             # Route-level page components
│   ├── admin/         # Admin contest management, leaderboard, reports
│   └── contest/       # Student-facing contest and problem pages
├── store/             # Zustand stores (leaderboard, keyboard shortcuts)
├── types/             # Shared TypeScript types
└── integrations/
    └── supabase/      # Auto-generated Supabase client + DB types

supabase/
├── functions/         # Deno edge functions
│   ├── execute-code/  # Unified code execution (run, submit, custom tests)
│   └── admin-submissions/
└── migrations/        # PostgreSQL migrations
```
