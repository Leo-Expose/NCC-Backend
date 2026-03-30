**FRONTEND**

**SPECIFICATION**

Next.js 14 · TypeScript · Tailwind · Supabase · Vercel

NCC Digital Command & Management Platform

Version 1.0 \| Confidential

**⚠ This document is self-contained. Do not cross-reference other team
docs.**

**Table of Contents**

**1. Overview & Your Responsibilities**

You are the web frontend developer for the NCC Digital Command &
Management Platform. You build the Next.js web application --- primarily
the ANO (officer) dashboard and Admin panel. Cadets predominantly use
the mobile app, but the web app must also be fully usable for cadets on
desktop/laptop.

You do NOT build: the database, edge functions, storage configuration,
push notification backend, or the mobile app. You consume the backend
APIs provided by the backend dev.

**What you deliver:**

-   A Next.js 14 (App Router) web application deployed on Vercel.

-   All screens listed in Section 4, fully functional and connected to
    Supabase.

-   A responsive design that works on desktop (1280px+), tablet (768px),
    and mobile web (375px).

-   Accessibility: WCAG 2.1 AA compliance for all interactive elements.

  -----------------------------------------------------------------------
  **Before You Start:** Get from backend dev: NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY, staging environment access, and a test
  ANO login + test cadet login. Do not begin until you have these.

  -----------------------------------------------------------------------

**2. Technology Stack**

  ----------------------------------------------------------------------------
  **Concern**      **Package / Tool**       **Version / Notes**
  ---------------- ------------------------ ----------------------------------
  Framework        Next.js                  14.x, App Router (not Pages
                                            Router)

  Language         TypeScript               5.x, strict mode enabled

  Styling          Tailwind CSS             3.x --- utility-first, no custom
                                            CSS files except globals.css

  Component        shadcn/ui                Install components individually
  Library                                   via CLI, not the full package

  State (server)   TanStack Query (React    5.x --- all API calls go through
                   Query)                   useQuery/useMutation

  State (client)   Zustand                  4.x --- only for truly global UI
                                            state (auth user, sidebar open)

  Forms            React Hook Form + Zod    Zod schemas are the single source
                                            of truth for validation

  Rich text editor TipTap                   2.x --- used for blog/news body
                                            field

  Markdown         react-markdown +         For rendering blog/news body on
  renderer         remark-gfm               read screens

  Charts           Recharts                 2.x --- for attendance analytics

  Calendar         react-big-calendar       0.x --- for events calendar view

  Supabase client  \@supabase/supabase-js   2.x

  Supabase Auth    \@supabase/ssr           0.x --- handles cookies correctly
  helper                                    for Next.js App Router

  Icons            lucide-react             Latest stable

  Date handling    date-fns                 3.x --- no moment.js

  PDF export       Trigger Edge Function    
  (client)         --- do not use a         
                   frontend PDF lib         

  Deployment       Vercel                   Connect to main git branch for
                                            auto-deploy
  ----------------------------------------------------------------------------

**2.1 Project Setup**

+-----------------------------------------------------------------------+
| npx create-next-app@latest ncc-web \--typescript \--tailwind \--app   |
| \--src-dir                                                            |
|                                                                       |
| cd ncc-web                                                            |
|                                                                       |
| \# Install all dependencies                                           |
|                                                                       |
| npm install \@supabase/supabase-js \@supabase/ssr                     |
|                                                                       |
| npm install \@tanstack/react-query zustand                            |
|                                                                       |
| npm install react-hook-form \@hookform/resolvers zod                  |
|                                                                       |
| npm install \@tiptap/react \@tiptap/starter-kit                       |
| \@tiptap/extension-image                                              |
|                                                                       |
| npm install react-markdown remark-gfm                                 |
|                                                                       |
| npm install recharts react-big-calendar date-fns lucide-react         |
|                                                                       |
| npm install -D \@types/react-big-calendar                             |
|                                                                       |
| \# shadcn/ui init                                                     |
|                                                                       |
| npx shadcn-ui@latest init                                             |
|                                                                       |
| \# Then add components as needed: npx shadcn-ui@latest add button     |
| dialog table \...                                                     |
|                                                                       |
| \# Environment variables (.env.local --- never commit)                |
|                                                                       |
| NEXT_PUBLIC_SUPABASE_URL=https://\<project\>.supabase.co              |
|                                                                       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY=\<anon_key\>                            |
+-----------------------------------------------------------------------+

**3. Project Structure**

+-----------------------------------------------------------------------+
| src/                                                                  |
|                                                                       |
| ├── app/                                                              |
|                                                                       |
| │ ├── (auth)/ \# Auth layout group (no sidebar)                       |
|                                                                       |
| │ │ ├── login/page.tsx                                                |
|                                                                       |
| │ │ └── set-password/page.tsx \# Invite link password setup           |
|                                                                       |
| │ ├── (dashboard)/ \# Main app layout group (with sidebar)            |
|                                                                       |
| │ │ ├── layout.tsx \# Sidebar + header shell                          |
|                                                                       |
| │ │ ├── page.tsx \# Home dashboard (redirects by role)                |
|                                                                       |
| │ │ ├── attendance/                                                   |
|                                                                       |
| │ │ │ ├── page.tsx \# Session list                                    |
|                                                                       |
| │ │ │ ├── mark/\[sessionId\]/page.tsx                                 |
|                                                                       |
| │ │ │ └── disputes/page.tsx                                           |
|                                                                       |
| │ │ ├── events/                                                       |
|                                                                       |
| │ │ │ ├── page.tsx \# Calendar + list                                 |
|                                                                       |
| │ │ │ └── \[id\]/page.tsx                                             |
|                                                                       |
| │ │ ├── cadets/                                                       |
|                                                                       |
| │ │ │ ├── page.tsx \# Cadet list (ANO/Admin only)                     |
|                                                                       |
| │ │ │ └── \[id\]/page.tsx \# Cadet profile                            |
|                                                                       |
| │ │ ├── study/                                                        |
|                                                                       |
| │ │ │ ├── page.tsx                                                    |
|                                                                       |
| │ │ │ └── quiz/\[id\]/page.tsx                                        |
|                                                                       |
| │ │ ├── blog/page.tsx                                                 |
|                                                                       |
| │ │ ├── news/page.tsx                                                 |
|                                                                       |
| │ │ ├── ranks/page.tsx                                                |
|                                                                       |
| │ │ ├── feedback/page.tsx \# ANO inbox / Cadet submit form            |
|                                                                       |
| │ │ ├── notifications/page.tsx                                        |
|                                                                       |
| │ │ ├── reports/page.tsx \# ANO only                                  |
|                                                                       |
| │ │ └── settings/page.tsx                                             |
|                                                                       |
| │ ├── api/                                                            |
|                                                                       |
| │ │ └── auth/callback/route.ts \# Supabase auth callback handler      |
|                                                                       |
| │ └── layout.tsx \# Root layout                                       |
|                                                                       |
| ├── components/                                                       |
|                                                                       |
| │ ├── ui/ \# shadcn/ui components                                     |
|                                                                       |
| │ ├── layout/ \# Sidebar, Header, MobileNav                           |
|                                                                       |
| │ ├── attendance/ \# AttendanceTable, SessionCard, DisputeModal       |
|                                                                       |
| │ ├── blog/ \# PostCard, PostEditor, ModerationPanel                  |
|                                                                       |
| │ ├── events/ \# EventCard, EventCalendar, EventForm                  |
|                                                                       |
| │ ├── study/ \# ResourceCard, QuizRunner, QuizResults                 |
|                                                                       |
| │ └── shared/ \# ConfirmDialog, LoadingSkeleton, EmptyState,          |
| RoleGuard                                                             |
|                                                                       |
| ├── hooks/ \# useAuth, useAttendance, useEvents, etc.                 |
|                                                                       |
| ├── lib/                                                              |
|                                                                       |
| │ ├── supabase/ \# client.ts, server.ts, middleware.ts                |
|                                                                       |
| │ ├── validations/ \# Zod schemas --- one file per domain             |
|                                                                       |
| │ └── utils.ts                                                        |
|                                                                       |
| └── types/ \# database.types.ts (generated from Supabase)             |
+-----------------------------------------------------------------------+

**4. Screens & Component Specifications**

**4.1 Authentication Screens**

**Login Page (/login)**

-   Form: Email + Password fields, \"Sign in\" button.

-   Validation: Email format (Zod), password min 8 chars.

-   On success: redirect to / (role-based redirect handled by
    middleware).

-   Error states: \"Invalid credentials\" (from Supabase), \"Account
    deactivated\" (is_active=false check).

-   No \"Forgot password\" link on login page --- show \"Contact your
    ANO to reset\" text instead (ANO initiates reset).

**Set Password Page (/set-password)**

-   Reached via invite email magic link. URL contains access_token from
    Supabase Auth.

-   Form: New password + confirm password.

-   On success: redirect to dashboard. This completes onboarding.

-   Also shown when ANO triggers a password reset for a cadet.

**4.2 Home Dashboard (/)**

**Cadet View**

  -----------------------------------------------------------------------------------
  **Widget**         **Data Source**                    **Notes**
  ------------------ ---------------------------------- -----------------------------
  Attendance ring    users.attendance_eligibility_pct   Circular progress --- green
                                                        \>80%, amber 65--80%, red
                                                        \<65%

  Today\'s schedule  events filtered by today\'s date   Shows next event with
  card                                                  countdown timer; \"No events
                                                        today\" if empty

  Unread             notifications where is_read=false  Number badge on bell icon in
  notifications                                         header
  badge                                                 

  Cadet Spotlight    posts where post_type=spotlight    Most recent; show author
  card               AND is_featured=true               name, photo, achievement

  News preview       news where is_published=true ORDER Two cards; click → news page
                     BY published_at DESC LIMIT 2       

  Last quiz score    quiz_attempts ORDER BY             Show score/total; \"Take a
                     completed_at DESC LIMIT 1          Quiz\" button if no attempts
  -----------------------------------------------------------------------------------

**ANO View**

  --------------------------------------------------------------------------
  **Widget**         **Data Source**           **Notes**
  ------------------ ------------------------- -----------------------------
  Today\'s           attendance_sessions where Large CTA: \"Start Marking\"
  attendance session date=today                button; shows session type
  card                                         

  Pending items      posts where               Tappable counts --- link to
  panel              status=pending_approval   relevant section
                     (count); attendance where 
                     is_disputed=true (count)  

  Unit stats bar     Aggregate query: COUNT    Shows total present, %,
                     present today / total     compared to last parade
                     cadets                    

  Upcoming events    events ORDER BY           Next 5 events in a compact
  list               start_datetime ASC LIMIT  list
                     5                         

  Recent activity    audit_logs ORDER BY       ANO\'s own actions ---
  feed               created_at DESC LIMIT 10  attendance marked, posts
                                               reviewed
  --------------------------------------------------------------------------

**4.3 Attendance Module**

**Session List (/attendance)**

-   Shows all attendance_sessions ordered by date DESC.

-   ANO sees all. Cadet sees only sessions for their company/wing.

-   Filters: date range, type (drill/band/practice), company (ANO only),
    locked/unlocked.

-   Row: date, type, company, total present/total cadets, locked badge,
    \"Mark\" button (if unlocked, ANO only).

-   Cadet row: date, type, own status (Present/Absent/Late/Excused) with
    colour badge, \"Dispute\" button.

**Mark Attendance (/attendance/mark/\[sessionId\])**

-   Large screen: table with all cadets (name, chest no, company).
    Status radio buttons per row: P \| L \| A \| E.

-   Default status: Absent. ANO changes to Present/Late/Excused by
    clicking.

-   Bulk action: \"Mark all Present\" button at top.

-   Search bar to filter cadets by name or chest number.

-   Offline indicator: if network lost mid-session, show banner
    \"Offline --- changes saved locally.\" Submit button disabled; show
    \"Sync when online\" instead.

-   Submit: confirmation dialog \"Mark attendance for \[N\] cadets for
    \[Session type\] on \[Date\]?\" → Submit → success toast.

**Disputes (/attendance/disputes)**

-   ANO only. Table: cadet name, session date, session type, dispute
    reason, date submitted, action buttons.

-   \"Accept\" opens modal: confirm reason + optional ANO note. Updates
    attendance status.

-   \"Reject\" opens modal: requires rejection reason (mandatory text
    field).

-   Both actions send notification to cadet.

**4.4 Events Module**

**Events Page (/events)**

-   Toggle: Calendar view (react-big-calendar) \| List view.

-   Calendar: colour-coded by event_type. Click event → event detail
    modal/page.

-   List view: filterable by type, date range, company, mandatory flag.

-   ANO: \"Create Event\" button → slide-over panel (not full page).

**Create/Edit Event (Slide-over panel)**

-   Fields: title (text), event_type (select), start_datetime
    (datetime-local), end_datetime (datetime-local, optional), location
    (text), description (textarea), is_mandatory (checkbox),
    target_companies (multi-select A/B/C/D or All), target_wing
    (select), attachment (file upload, PDF only).

-   On submit: POST /events via Supabase. If is_mandatory=true, a
    notification is auto-sent by the backend trigger.

-   Validation: end_datetime must be after start_datetime. Title max 100
    chars.

**4.5 Cadet Management (/cadets --- ANO/Admin only)**

-   Searchable, sortable table: chest no, name, company, wing, year,
    rank, attendance %, eligibility badge, status (active/inactive).

-   Click row → Cadet Profile page.

-   \"Invite Cadet\" button → modal with invite form (calls send-invite
    Edge Function).

-   \"Bulk Import\" button → file upload modal (CSV), shows validation
    errors inline before submit.

**Cadet Profile (/cadets/\[id\])**

-   Photo, name, rank, chest number, company, wing, year.

-   Attendance tab: full attendance history table with filter,
    eligibility progress bar.

-   Achievements tab: published posts by this cadet.

-   Rank history tab: rank_holders records.

-   ANO actions: Edit profile (rank, company, wing), Deactivate account,
    Reset password.

**4.6 Study Module (/study)**

-   Tabbed: Resources \| Quizzes.

-   Resources: card grid --- category filter
    (notes/question_bank/previous_paper), wing filter, search. Each
    card: title, subject, wing, file type badge, download count,
    version. \"Download\" triggers get-signed-url → opens URL in new
    tab.

-   ANO: \"Upload Resource\" button → modal with upload form. File input
    (PDF/image/mp4 only, max 50MB). Shows upload progress.

**Quiz List**

-   Cards: title, subject, difficulty badge (colour-coded), time limit,
    question count, best score (if attempted).

-   ANO: \"Create Quiz\" → full page quiz builder (add/edit/reorder
    questions).

**Quiz Runner (/study/quiz/\[id\])**

-   Shows one question at a time. Progress bar (Q3/10). Timer (if timed
    quiz).

-   4 option buttons. Click to select (highlight). \"Next\" button
    advances.

-   On submit: show results screen --- score, % correct, each question
    with correct answer and explanation.

-   Leaderboard tab on results: top 10 scores for this quiz set
    (filtered to same wing).

**4.7 Blog & Achievements (/blog)**

-   Public feed: all published posts, filterable by post_type. Card:
    cover image, title, author name, date, type badge.

-   Featured Spotlight: pinned at top if is_featured=true.

-   \"Write a Post\" button (all roles) → TipTap editor page.

**Post Editor**

-   Fields: title, post_type (select), cover image upload, body (TipTap
    rich text editor), camp_name (if type=experience), achievement_type
    (if type=achievement).

-   Save as draft button (status=draft). Submit for Review button
    (status=pending_approval).

-   Author sees own drafts and pending posts with status badge.

**Moderation Panel (ANO only)**

-   List of pending_approval posts with preview. \"Approve\" and
    \"Reject\" buttons.

-   \"Reject\" requires rejection_reason text (mandatory). This is sent
    to cadet as notification.

**4.8 Rank Holders (/ranks)**

-   Company tabs (A / B / C / D) + \"All\" view.

-   Academic year selector (dropdown, defaults to current year).

-   Hierarchy display: SUO (unit-wide, prominent card at top) → UO →
    Sergeant → Corporal → Lance Corporal.

-   Each rank holder card: photo, name, rank badge, company. Click →
    cadet profile.

-   ANO: \"Manage Ranks\" button → slide-over panel to assign/end rank
    holder positions.

**4.9 Defence News (/news)**

-   Card list: cover image, title, category badge, date, source link.

-   Click → full article (Markdown rendered with react-markdown).

-   Category filter tabs: All \| NCC Update \| Armed Forces \| Current
    Affairs \| Unit News.

-   ANO: \"Publish News\" button → modal with: title, body (TipTap),
    category, cover image upload, source URL.

**4.10 Feedback (/feedback)**

**Cadet View**

-   Category dropdown, body textarea (max 1000 chars), submit button.

-   \"Anonymous Submission\" label visible and prominent.

-   Feedback Wall section below: shows published ANO responses (body,
    ANO reply) --- no submitter identity shown.

**ANO View**

-   Inbox: list of unread/read submissions with category badges. Click →
    detail panel.

-   Detail panel: body text, category, date, \"Write Response\"
    textarea, \"Publish Response to Feedback Wall\" button.

-   Marking a response as published is irreversible (warn in
    confirmation dialog).

**4.11 Notifications (/notifications)**

-   List: type icon, title, body, time ago, read/unread state.

-   \"Mark all as read\" button.

-   Click notification → deep link to related entity (e.g., click
    blog_approved → goes to that post).

-   Real-time: subscribe to Supabase Realtime channel. New notifications
    appear at top without page refresh.

**4.12 Reports (/reports --- ANO/Admin only)**

-   Attendance Report: select company, wing, date range → table preview
    → \"Export PDF\" button (calls export-attendance-pdf Edge Function,
    downloads file).

-   Eligibility Report: table of all cadets with current eligibility %,
    status (Eligible/Warning/Ineligible), sortable.

-   Quiz Analytics: per quiz set --- question-level % correct bar chart
    (Recharts).

**5. Supabase Integration**

**5.1 Client Setup (App Router)**

+-----------------------------------------------------------------------+
| // lib/supabase/client.ts --- browser client (for Client Components)  |
|                                                                       |
| import { createBrowserClient } from \"@supabase/ssr\";                |
|                                                                       |
| export const createClient = () =\>                                    |
|                                                                       |
| createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,            |
|                                                                       |
| process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);                          |
|                                                                       |
| // lib/supabase/server.ts --- server client (for Server Components &  |
| Route Handlers)                                                       |
|                                                                       |
| import { createServerClient } from \"@supabase/ssr\";                 |
|                                                                       |
| import { cookies } from \"next/headers\";                             |
|                                                                       |
| export const createClient = () =\> {                                  |
|                                                                       |
| const cookieStore = cookies();                                        |
|                                                                       |
| return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,      |
|                                                                       |
| process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {                         |
|                                                                       |
| cookies: { get: (name) =\> cookieStore.get(name)?.value, \... }       |
|                                                                       |
| });                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| // middleware.ts --- refresh sessions on each request                 |
|                                                                       |
| import { createServerClient } from \"@supabase/ssr\";                 |
|                                                                       |
| export async function middleware(request: NextRequest) {              |
|                                                                       |
| // \... standard Supabase SSR middleware pattern                      |
|                                                                       |
| // Redirect unauthenticated users to /login                           |
|                                                                       |
| // Redirect authenticated users from /login to /                      |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**5.2 Type Generation**

+-----------------------------------------------------------------------+
| \# Generate TypeScript types from your Supabase schema                |
|                                                                       |
| \# Run this whenever backend dev changes the schema                   |
|                                                                       |
| npx supabase gen types typescript \\                                  |
|                                                                       |
| \--project-id \<project_id\> \\                                       |
|                                                                       |
| \--schema public \> src/types/database.types.ts                       |
|                                                                       |
| \# Use in components:                                                 |
|                                                                       |
| import type { Database } from \"@/types/database.types\";             |
|                                                                       |
| type User =                                                           |
| Database\[\"public\"\]\[\"Tables\"\]\[\"users\"\]\[\"Row\"\];         |
+-----------------------------------------------------------------------+

**5.3 Data Fetching Pattern (React Query + Supabase)**

+-----------------------------------------------------------------------+
| // hooks/useAttendanceSessions.ts                                     |
|                                                                       |
| import { useQuery } from \"@tanstack/react-query\";                   |
|                                                                       |
| import { createClient } from \"@/lib/supabase/client\";               |
|                                                                       |
| export function useAttendanceSessions(date?: string) {                |
|                                                                       |
| const supabase = createClient();                                      |
|                                                                       |
| return useQuery({                                                     |
|                                                                       |
| queryKey: \[\"attendance_sessions\", date\],                          |
|                                                                       |
| queryFn: async () =\> {                                               |
|                                                                       |
| let query =                                                           |
| supabase.from(\"attendance_sessions\").select(\"\*\").order(\"date\", |
| { ascending: false });                                                |
|                                                                       |
| if (date) query = query.eq(\"date\", date);                           |
|                                                                       |
| const { data, error } = await query;                                  |
|                                                                       |
| if (error) throw error;                                               |
|                                                                       |
| return data;                                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| staleTime: 5 \* 60 \* 1000, // 5 minutes                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // useMutation for writes                                             |
|                                                                       |
| export function useMarkAttendance() {                                 |
|                                                                       |
| const supabase = createClient();                                      |
|                                                                       |
| const queryClient = useQueryClient();                                 |
|                                                                       |
| return useMutation({                                                  |
|                                                                       |
| mutationFn: async (records: AttendanceInsert\[\]) =\> {               |
|                                                                       |
| const { error } = await                                               |
| supabase.from(\"attendance\").insert(records);                        |
|                                                                       |
| if (error) throw error;                                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| onSuccess: () =\> queryClient.invalidateQueries({ queryKey:           |
| \[\"attendance_sessions\"\] }),                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**5.4 Calling Edge Functions**

+-----------------------------------------------------------------------+
| // Calling Edge Functions via Supabase client                         |
|                                                                       |
| const supabase = createClient();                                      |
|                                                                       |
| // submit-feedback                                                    |
|                                                                       |
| const { data, error } = await                                         |
| supabase.functions.invoke(\"submit-feedback\", {                      |
|                                                                       |
| body: { category: \"training\", body: \"The drill schedule needs      |
| updating.\" }                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| // export-attendance-pdf (download file)                              |
|                                                                       |
| const { data: blob } = await                                          |
| supabase.functions.invoke(\"export-attendance-pdf\", {                |
|                                                                       |
| body: { company: \"A\", date_from: \"2024-06-01\", date_to:           |
| \"2024-12-31\" }                                                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| const url = URL.createObjectURL(blob);                                |
|                                                                       |
| const a = document.createElement(\"a\"); a.href = url; a.download =   |
| \"attendance.pdf\"; a.click();                                        |
+-----------------------------------------------------------------------+

**5.5 Realtime Subscriptions**

+-----------------------------------------------------------------------+
| // hooks/useNotifications.ts --- realtime new notifications           |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| const channel = supabase                                              |
|                                                                       |
| .channel(\"user_notifications\")                                      |
|                                                                       |
| .on(\"postgres_changes\", {                                           |
|                                                                       |
| event: \"INSERT\",                                                    |
|                                                                       |
| schema: \"public\",                                                   |
|                                                                       |
| table: \"notifications\",                                             |
|                                                                       |
| filter: \`recipient_id=eq.\${user.id}\`,                              |
|                                                                       |
| }, (payload) =\> {                                                    |
|                                                                       |
| queryClient.invalidateQueries({ queryKey: \[\"notifications\"\] });   |
|                                                                       |
| toast(payload.new.title); // show toast                               |
|                                                                       |
| })                                                                    |
|                                                                       |
| .subscribe();                                                         |
|                                                                       |
| return () =\> { supabase.removeChannel(channel); };                   |
|                                                                       |
| }, \[user.id\]);                                                      |
+-----------------------------------------------------------------------+

**6. Auth & Role-Based Routing**

**6.1 Middleware Route Protection**

+-----------------------------------------------------------------------+
| // middleware.ts                                                      |
|                                                                       |
| const PUBLIC_ROUTES = \[\"/login\", \"/set-password\"\];              |
|                                                                       |
| const ANO_ONLY = \[\"/attendance/mark\", \"/cadets\", \"/reports\",   |
| \"/feedback\"\];                                                      |
|                                                                       |
| const ADMIN_ONLY = \[\"/admin\"\];                                    |
|                                                                       |
| // Check user role from JWT claims, redirect appropriately            |
|                                                                       |
| // Store role in Zustand after login for client-side guard components |
+-----------------------------------------------------------------------+

**6.2 RoleGuard Component**

+-----------------------------------------------------------------------+
| // components/shared/RoleGuard.tsx                                    |
|                                                                       |
| export function RoleGuard({ roles, children, fallback = null }: {     |
|                                                                       |
| roles: (\"cadet\"\|\"suo\"\|\"ano\"\|\"admin\")\[\];                  |
|                                                                       |
| children: React.ReactNode;                                            |
|                                                                       |
| fallback?: React.ReactNode;                                           |
|                                                                       |
| }) {                                                                  |
|                                                                       |
| const { user } = useAuthStore();                                      |
|                                                                       |
| if (!roles.includes(user?.role)) return \<\>{fallback}\</\>;          |
|                                                                       |
| return \<\>{children}\</\>;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| \<RoleGuard roles={\[\"ano\", \"admin\"\]}\>\<CreateEventButton       |
| /\>\</RoleGuard\>                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **Important:** RoleGuard is a UI convenience only --- it hides buttons
  from the wrong roles. True access control is enforced by RLS on the
  backend. Never rely solely on RoleGuard for security.

  -----------------------------------------------------------------------

**7. Design System**

**7.1 Colour Tokens (tailwind.config.ts)**

+-----------------------------------------------------------------------+
| theme: { extend: { colors: {                                          |
|                                                                       |
| primary: { DEFAULT: \"#1A5C4A\", light: \"#2A8C6F\", dark:            |
| \"#0F3D30\" },                                                        |
|                                                                       |
| // NCC olive green for this web app (frontend accent)                 |
|                                                                       |
| olive: { DEFAULT: \"#4B5320\", light: \"#6B7530\", dark: \"#2B3010\"  |
| },                                                                    |
|                                                                       |
| gold: { DEFAULT: \"#B8860B\", light: \"#D4A017\" },                   |
|                                                                       |
| success: \"#1A5C1A\",                                                 |
|                                                                       |
| warning: \"#B8860B\",                                                 |
|                                                                       |
| danger: \"#C0392B\",                                                  |
|                                                                       |
| surface: \"#F8F9FA\",                                                 |
|                                                                       |
| muted: \"#6B7280\",                                                   |
|                                                                       |
| }}}                                                                   |
+-----------------------------------------------------------------------+

**7.2 Typography**

  -----------------------------------------------------------------------
  **Element**      **Class**              **Usage**
  ---------------- ---------------------- -------------------------------
  Page title       text-2xl font-bold     H1 on each page
                   text-gray-900          

  Section heading  text-lg font-semibold  H2 within pages
                   text-gray-800          

  Card title       text-base font-medium  
                   text-gray-900          

  Body text        text-sm text-gray-700  Default content

  Caption / label  text-xs text-gray-500  Metadata, timestamps

  Link             text-sm text-primary   
                   hover:underline        
  -----------------------------------------------------------------------

**7.3 Status Badge Colours**

  -----------------------------------------------------------------------
  **Status / Value**         **Tailwind Classes**
  -------------------------- --------------------------------------------
  Present / Eligible /       bg-green-100 text-green-800
  Approved / Published       

  Late / Warning (attendance bg-yellow-100 text-yellow-800
  65--80%)                   

  Absent / Ineligible /      bg-red-100 text-red-800
  Rejected                   

  Excused / Pending Approval bg-blue-100 text-blue-800
  / Draft                    

  Locked session / Archived  bg-gray-100 text-gray-600
  -----------------------------------------------------------------------

**7.4 Shared Component Rules**

-   Loading state: every data-fetching component shows a Skeleton
    (shimmer) while isLoading=true. No blank screens.

-   Empty state: every list component shows an EmptyState component
    with: icon, message, and actionable CTA button. E.g., \"No
    attendance sessions yet. Create one to get started.\"

-   Error state: show an ErrorCard with the error message and a
    \"Retry\" button (calls refetch()).

-   Confirmation dialogs: every destructive action (delete, reject,
    deactivate) uses the ConfirmDialog component with exact consequences
    stated.

-   All modals trap focus (shadcn/ui Dialog handles this). Add
    aria-label to all icon-only buttons.

**8. Form Validation Schemas (Zod)**

+-----------------------------------------------------------------------+
| // lib/validations/event.ts                                           |
|                                                                       |
| import { z } from \"zod\";                                            |
|                                                                       |
| export const eventSchema = z.object({                                 |
|                                                                       |
| title: z.string().min(3).max(100),                                    |
|                                                                       |
| event_type:                                                           |
| z.enum(\[\"camp\",\"parade\",\"rdc\",\"tsc\",                         |
| \"aic\",\"practice\",\"exam\",\"selection\",\"ncc_day\",\"other\"\]), |
|                                                                       |
| start_datetime: z.string().datetime(),                                |
|                                                                       |
| end_datetime: z.string().datetime().optional(),                       |
|                                                                       |
| location: z.string().max(200).optional(),                             |
|                                                                       |
| description: z.string().max(1000).optional(),                         |
|                                                                       |
| is_mandatory: z.boolean().default(false),                             |
|                                                                       |
| target_companies:                                                     |
| z.array(z.enum(\[\"A\",\"B\",\"C\",\"D\"\])).optional(),              |
|                                                                       |
| target_wing:                                                          |
| z.enum(\[\"army\",\"navy\",\"air_force\",\"all\"\]).default(\"all\"), |
|                                                                       |
| }).refine(d =\> !d.end_datetime \|\| d.end_datetime \>                |
| d.start_datetime,                                                     |
|                                                                       |
| { message: \"End time must be after start time\", path:               |
| \[\"end_datetime\"\] });                                              |
|                                                                       |
| // lib/validations/attendance.ts                                      |
|                                                                       |
| export const attendanceMarkSchema = z.array(z.object({                |
|                                                                       |
| cadet_id: z.string().uuid(),                                          |
|                                                                       |
| status: z.enum(\[\"present\",\"absent\",\"late\",\"excused\"\]),      |
|                                                                       |
| remarks: z.string().max(300).optional(),                              |
|                                                                       |
| })).min(1, \"No cadets in session\");                                 |
|                                                                       |
| // lib/validations/post.ts                                            |
|                                                                       |
| export const postSchema = z.object({                                  |
|                                                                       |
| title: z.string().min(5).max(200),                                    |
|                                                                       |
| post_type:                                                            |
| z.enum(\[\"blog\",\"achievement\",\"experience\",\"spotlight\"\]),    |
|                                                                       |
| body: z.string().min(50, \"Post must be at least 50 characters\"),    |
|                                                                       |
| camp_name: z.string().optional(),                                     |
|                                                                       |
| achievement_type: z.string().optional(),                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| // lib/validations/feedback.ts                                        |
|                                                                       |
| export const feedbackSchema = z.object({                              |
|                                                                       |
| category:                                                             |
| z.enum(\[\"trainin                                                    |
| g\",\"facility\",\"academic\",\"event\",\"general\",\"complaint\"\]), |
|                                                                       |
| body: z.string().min(10).max(1000),                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**9. Performance & Deployment**

**9.1 Performance Rules**

-   Use Next.js Server Components for all initial page data fetches (no
    loading spinner on first load).

-   Use React Query on Client Components only for data that changes in
    real-time or needs user interaction.

-   Images: always use next/image with explicit width and height.
    Profile photos from Supabase Storage: use unoptimized={false} with
    the Supabase URL added to next.config.js images.remotePatterns.

-   Lazy load heavy components (TipTap editor, react-big-calendar) with
    next/dynamic.

-   Pagination: all list pages use cursor-based pagination (load more
    button), not page numbers.

**9.2 Vercel Deployment**

+-----------------------------------------------------------------------+
| // next.config.ts                                                     |
|                                                                       |
| const nextConfig = {                                                  |
|                                                                       |
| images: {                                                             |
|                                                                       |
| remotePatterns: \[{ protocol: \"https\",                              |
|                                                                       |
| hostname: \"\<project\>.supabase.co\", pathname:                      |
| \"/storage/v1/object/\*\*\" }\],                                      |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Environment variables in Vercel Dashboard:                         |
|                                                                       |
| // NEXT_PUBLIC_SUPABASE_URL                                           |
|                                                                       |
| // NEXT_PUBLIC_SUPABASE_ANON_KEY                                      |
|                                                                       |
| // (These are public --- safe to expose to browser)                   |
+-----------------------------------------------------------------------+

**9.3 Pre-Launch Checklist**

  ----------------------------------------------------------------------------
  **\#**   **Check**
  -------- -------------------------------------------------------------------
  1        Run Lighthouse on all 5 key pages --- Performance \>85,
           Accessibility \>90

  2        Test on Chrome, Firefox, Safari, and mobile Chrome

  3        Verify all forms show inline validation errors (not just alert())

  4        Verify RoleGuard hides ANO-only buttons from cadet test account

  5        Verify Empty states show on all list pages (test with empty staging
           DB)

  6        Confirm \"Export PDF\" downloads a valid PDF from staging

  7        Test Realtime: open two browser tabs --- verify notification
           appears in real-time

  8        Confirm all file upload inputs reject wrong MIME types client-side
           (pre-upload validation)
  ----------------------------------------------------------------------------
