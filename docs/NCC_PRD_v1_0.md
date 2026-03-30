**NCC DIGITAL COMMAND &**

**MANAGEMENT PLATFORM**

Product Requirements Document

Version 1.0 \| Confidential

Platform: Web (React/Next.js) + Android (Flutter)

Backend: Supabase (PostgreSQL + Auth + Storage)

Target Users: 150--500+ NCC Cadets & Officers

**Table of Contents**

**1. Project Overview**

The NCC Digital Command & Management Platform is a unified, full-stack
web and Android application designed to digitize and streamline all
administrative, academic, and operational activities of a university NCC
unit. It replaces fragmented, unreliable communication channels
(WhatsApp groups, physical registers, verbal announcements) with a
secure, role-aware, and data-driven digital ecosystem.

**The platform addresses six core pain points of the current operational
model:**

-   No centralized attendance record --- registers are prone to loss and
    manipulation.

-   Study materials scattered across personal devices with no official
    repository.

-   Event communication is informal, leading to missed parades and
    camps.

-   Cadet achievements and hierarchy have no official digital record.

-   Feedback to ANO is inhibited by lack of anonymity.

-   Defence current affairs preparation has no structured support.

  -----------------------------------------------------------------------
  **Scope Note:** This PRD covers the web platform (React/Next.js) and
  Android application (Flutter) sharing a single Supabase backend. iOS is
  out of scope for v1.0 but the architecture must remain iOS-ready.

  -----------------------------------------------------------------------

**2. Objectives & Success Metrics**

**2.1 Primary Objectives**

-   Digitize 100% of attendance tracking within 60 days of launch.

-   Provide a structured study repository for B & C Certificate exam
    preparation.

-   Enable the ANO to broadcast event and parade information in real
    time.

-   Create a transparent, visible rank hierarchy and achievement board.

-   Provide cadets a safe channel for anonymous feedback.

-   Improve average cadet attendance rate by 15% within one academic
    year.

**2.2 Key Performance Indicators (KPIs)**

  ----------------------------------------------------------------------------
  **KPI**                  **Baseline**   **Target (6        **Measurement
                                          months)**          Method**
  ------------------------ -------------- ------------------ -----------------
  Daily Active Users (DAU) 0              \>60% of enrolled  Supabase
                                          cadets             analytics

  Attendance entry rate    \~40% (paper)  \>95%              System records

  Study resource downloads 0              \>200/month        Storage access
                                                             logs

  Event no-show rate       Unknown        \<10%              Attendance vs
                           (\~20%)                           events

  Feedback                 0              \>10               Suggestion table
  submissions/month                                          count

  Quiz completion rate     0              \>50% of           Quiz attempt logs
                                          cadets/week        
  ----------------------------------------------------------------------------

**3. Stakeholders & User Roles**

**3.1 Role Definitions**

**3.1.1 Cadet (Default Role)**

All enrolled NCC cadets. Self-registers via invite link or approval
workflow. Can view own data, access study materials, submit feedback,
view events, and participate in quizzes.

**3.1.2 Associate NCC Officer (ANO)**

The supervising officer. Has elevated write access: marks attendance,
creates events, publishes news, approves blog posts, manages rank
holders, and views all cadet data.

**3.1.3 Admin**

System administrator (may be a senior cadet or IT staff). Manages user
accounts, performs bulk imports, views audit logs, configures system
settings. Cannot create content (separation of duties).

**3.1.4 Senior Under Officer (SUO) --- Optional Elevated Cadet**

Can be granted limited ANO-like permissions: mark attendance for their
company, post announcements. All SUO actions are flagged with the
\"acting_role: SUO\" field for audit.

**3.2 Permission Matrix**

  ----------------------------------------------------------------------------------
  **Feature / Action**         **Cadet**   **SUO**     **ANO**           **Admin**
  ---------------------------- ----------- ----------- ----------------- -----------
  View own attendance          ✓           ✓           ✓                 ✓

  View all cadet attendance    ✗           Own company ✓                 ✓

  Mark attendance              ✗           Own company ✓                 ✗

  Dispute own attendance       ✓           ✓           ✗                 ✗

  Resolve attendance dispute   ✗           ✗           ✓                 ✗

  Upload study resources       ✗           ✗           ✓                 ✗

  Create / edit events         ✗           ✗           ✓                 ✗

  View events                  ✓           ✓           ✓                 ✓

  Post blog / achievement      ✓ (pending  ✓ (pending) ✓ (auto-approved) ✗
                               approval)                                 

  Approve blog posts           ✗           ✗           ✓                 ✗

  Publish defence news         ✗           ✗           ✓                 ✗

  Manage rank holders          ✗           ✗           ✓                 ✗

  Submit anonymous feedback    ✓           ✓           ✗                 ✗

  Read feedback                ✗           ✗           ✓                 ✗

  Manage user accounts         ✗           ✗           ✗                 ✓

  View audit logs              ✗           ✗           ✗                 ✓

  Take quizzes                 ✓           ✓           ✓                 ✗

  Create quizzes               ✗           ✗           ✓                 ✗

  Export attendance report     ✗           ✗           ✓                 ✓
  (PDF)                                                                  
  ----------------------------------------------------------------------------------

**4. System Architecture**

**4.1 High-Level Architecture**

The system uses a Backend-as-a-Service (BaaS) model with Supabase as the
single backend, exposing REST and real-time WebSocket APIs consumed by
both the web client and Android app.

  ------------------------------------------------------------------------
  **Layer**          **Technology**      **Purpose**
  ------------------ ------------------- ---------------------------------
  Web Frontend       Next.js 14 (App     Primary management interface ---
                     Router)             ANO, Admin dashboard

  Mobile Frontend    Flutter 3.x         Cadet-facing mobile app (Android,
                                         iOS-ready)

  API / BaaS         Supabase            Auth, Database, Storage,
                                         Realtime, Edge Functions

  Database           PostgreSQL 15 (via  Relational data store with Row
                     Supabase)           Level Security

  Auth               Supabase Auth (JWT) Email/password, invite-only
                                         registration

  File Storage       Supabase Storage    PDFs, images, media ---
                                         bucket-level access control

  Push Notifications Firebase Cloud      Android push; web via service
                     Messaging (FCM)     workers

  Email              Resend (via         Invite emails, OTP, digest
                     Supabase Edge       notifications
                     Function)           

  Analytics          PostHog             User behaviour, feature adoption
  (optional)         (self-hosted or     
                     cloud)              
  ------------------------------------------------------------------------

**4.2 Offline Strategy (Critical for Android App)**

NCC parades and camps frequently occur in areas with unreliable
connectivity. The Flutter app must support offline-first operation for
the following features:

  -----------------------------------------------------------------------
  **Feature**        **Offline Behaviour**     **Sync Strategy**
  ------------------ ------------------------- --------------------------
  Attendance marking Stored locally in SQLite  Auto-sync when network
  (ANO/SUO)          via Drift                 restored; conflict: server
                                               wins

  Study materials    Downloaded PDFs cached    Manual refresh; version
                     locally                   hash comparison

  Event schedule     Cached in local DB on     Background sync on app
                     last fetch                open

  Notifications      Queued locally            Delivered on reconnect

  Feedback           Queued locally            Auto-submit on reconnect
  submission                                   

  News feed          Last 20 articles cached   Refresh on app open with
                                               network
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Implementation Note:** Use the connectivity_plus Flutter package to
  detect network state. All write operations go through a SyncQueue that
  auto-retries with exponential backoff. Sync status must be visible to
  the user (e.g., \"3 attendance records pending sync\").

  -----------------------------------------------------------------------

**5. Database Schema**

All tables include created_at (timestamptz DEFAULT now()) and updated_at
(timestamptz) columns unless otherwise noted. Row Level Security (RLS)
is enabled on all tables. Each table section includes its RLS policy
summary.

**5.1 users**

  -------------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- ---------------------------------------
  id                  uuid          PK, DEFAULT gen_random_uuid(),
                                    references auth.users(id)

  full_name           text          NOT NULL

  email               text          UNIQUE NOT NULL

  phone               text          NULLABLE

  role                enum          NOT NULL ---
                                    (\'cadet\',\'suo\',\'ano\',\'admin\')

  rank                text          e.g., Lance Corporal, Corporal,
                                    Sergeant, UO, SUO

  company             text          e.g., \'A\',\'B\',\'C\',\'D\'; NULL for
                                    ANO/Admin

  chest_number        text          UNIQUE NULLABLE --- official NCC chest
                                    number

  wing                enum          (\'army\',\'navy\',\'air_force\')

  year_of_study       int           1--4; NULL for ANO/Admin

  academic_year       text          e.g., \'2024-25\'

  profile_photo_url   text          Supabase Storage URL

  is_active           bool          DEFAULT true --- soft delete flag

  invited_by          uuid          FK → users(id) NULLABLE --- audit trail
                                    for registration

  last_login_at       timestamptz   NULLABLE
  -------------------------------------------------------------------------

RLS: Cadets can SELECT own row, UPDATE own non-sensitive fields.
ANO/Admin can SELECT all. Only Admin can INSERT/DELETE.

**5.2 attendance**

  -----------------------------------------------------------------------------------
  **Column**            **Type**      **Constraints / Notes**
  --------------------- ------------- -----------------------------------------------
  id                    uuid          PK

  cadet_id              uuid          FK → users(id) NOT NULL

  marked_by             uuid          FK → users(id) NOT NULL --- ANO or SUO who
                                      marked

  acting_role           text          e.g., \'ANO\', \'SUO\' --- for audit

  session_id            uuid          FK → attendance_sessions(id) NOT NULL

  status                enum          (\'present\',\'absent\',\'late\',\'excused\')
                                      NOT NULL

  remarks               text          Optional note e.g., medical leave

  is_disputed           bool          DEFAULT false

  dispute_reason        text          NULLABLE --- cadet-submitted dispute text

  dispute_resolved_at   timestamptz   NULLABLE

  dispute_resolved_by   uuid          FK → users(id) NULLABLE
  -----------------------------------------------------------------------------------

**5.3 attendance_sessions**

Each session represents one parade/drill/band/practice event. Attendance
records link to a session, not a raw date --- this prevents orphaned
records.

  ------------------------------------------------------------------------------------------------------------
  **Column**                 **Type**      **Constraints / Notes**
  -------------------------- ------------- -------------------------------------------------------------------
  id                         uuid          PK

  type                       enum          (\'band\',\'drill\',\'practice\',\'camp\',\'parade\',\'ncc_day\')
                                           NOT NULL

  date                       date          NOT NULL

  start_time                 timetz        NOT NULL

  end_time                   timetz        NULLABLE

  location                   text          NULLABLE

  min_attendance_threshold   decimal       DEFAULT 0.75 --- used for eligibility checks

  created_by                 uuid          FK → users(id) --- ANO who created session

  is_locked                  bool          DEFAULT false --- locked after 48 hours; no edits post-lock
  ------------------------------------------------------------------------------------------------------------

**5.4 events**

  -------------------------------------------------------------------------------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- ---------------------------------------------------------------------------------------------------------
  id                  uuid          PK

  title               text          NOT NULL

  description         text          NULLABLE

  event_type          enum          (\'camp\',\'parade\',\'rdc\',\'tsc\',\'aic\',\'practice\',\'exam\',\'selection\',\'ncc_day\',\'other\')

  location            text          NULLABLE

  start_datetime      timestamptz   NOT NULL

  end_datetime        timestamptz   NULLABLE

  is_mandatory        bool          DEFAULT false --- mandatory events auto-trigger attendance session

  target_companies    text\[\]      e.g., \[\'{A}\',\'{B}\'\] --- NULL means all companies

  target_wing         enum          (\'army\',\'navy\',\'air_force\',\'all\') DEFAULT \'all\'

  attachment_url      text          NULLABLE --- e.g., camp notification PDF

  created_by          uuid          FK → users(id)
  -------------------------------------------------------------------------------------------------------------------------------------------

**5.5 resources (Study Materials)**

  -------------------------------------------------------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- ---------------------------------------------------------------------------------
  id                  uuid          PK

  title               text          NOT NULL

  description         text          NULLABLE

  category            enum          (\'notes\',\'question_bank\',\'previous_paper\',\'reference\',\'drill_manual\')

  subject             text          e.g., \'NCC \'B\' Certificate\', \'Drill\', \'Weapons Training\'

  wing                enum          (\'army\',\'navy\',\'air_force\',\'all\') DEFAULT \'all\'

  file_url            text          Supabase Storage path NOT NULL

  file_size_kb        int           NULLABLE --- for display

  file_type           text          e.g., \'pdf\',\'jpg\',\'mp4\'

  version             int           DEFAULT 1 --- increment on re-upload

  download_count      int           DEFAULT 0

  uploaded_by         uuid          FK → users(id)

  is_published        bool          DEFAULT false --- ANO must explicitly publish
  -------------------------------------------------------------------------------------------------------------------

**5.6 suggestions (Feedback)**

True anonymity design: no user_id stored. A salted hash of (user_id +
week_number) is stored as anonymous_token. This allows the system to
enforce rate-limiting (1 submission/day) without revealing identity.

  ------------------------------------------------------------------------------------------------------------------
  **Column**            **Type**      **Constraints / Notes**
  --------------------- ------------- ------------------------------------------------------------------------------
  id                    uuid          PK

  anonymous_token       text          SHA-256(user_id + salt + day_bucket) --- rate limiting only

  category              enum          (\'training\',\'facility\',\'academic\',\'event\',\'general\',\'complaint\')

  body                  text          NOT NULL --- sanitized on write

  is_read               bool          DEFAULT false

  ano_response          text          NULLABLE --- ANO can write a reply (shown publicly on feedback wall)

  responded_at          timestamptz   NULLABLE
  ------------------------------------------------------------------------------------------------------------------

RLS: INSERT is allowed for authenticated users (token generated
client-side). SELECT is restricted to ANO/Admin. No UPDATE or DELETE by
cadets.

**5.7 news**

  -------------------------------------------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- ---------------------------------------------------------------------
  id                  uuid          PK

  title               text          NOT NULL

  body                text          NOT NULL --- rich text (Markdown)

  category            enum          (\'ncc_update\',\'armed_forces\',\'current_affairs\',\'unit_news\')

  source_url          text          NULLABLE --- link to original article

  cover_image_url     text          NULLABLE

  published_by        uuid          FK → users(id)

  is_published        bool          DEFAULT false

  published_at        timestamptz   NULLABLE
  -------------------------------------------------------------------------------------------------------

Content Source Policy: ANO manually publishes news. Phase 2 may add
auto-fetch from PIB RSS feed via a Supabase Edge Function running on a
daily cron.

**5.8 posts (Blogs & Achievements)**

  -----------------------------------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- -------------------------------------------------------------
  id                  uuid          PK

  post_type           enum          (\'blog\',\'achievement\',\'spotlight\',\'experience\') NOT
                                    NULL

  title               text          NOT NULL

  body                text          NOT NULL --- Markdown

  author_id           uuid          FK → users(id) NOT NULL

  status              enum          (\'draft\',\'pending_approval\',\'published\',\'rejected\')
                                    DEFAULT \'draft\'

  rejection_reason    text          NULLABLE --- ANO fills this on reject

  reviewed_by         uuid          FK → users(id) NULLABLE

  reviewed_at         timestamptz   NULLABLE

  cover_image_url     text          NULLABLE

  media_urls          text\[\]      Array of Supabase Storage URLs for gallery

  camp_name           text          NULLABLE --- for experience posts

  achievement_type    text          NULLABLE --- e.g., RDC Selected, Best Cadet

  is_featured         bool          DEFAULT false --- for Cadet of the Month spotlight
  -----------------------------------------------------------------------------------------------

**5.9 rank_holders**

  ------------------------------------------------------------------------------------------------
  **Column**         **Type**      **Constraints / Notes**
  ------------------ ------------- ---------------------------------------------------------------
  id                 uuid          PK

  cadet_id           uuid          FK → users(id) NOT NULL

  rank               enum          (\'suo\',\'uo\',\'sergeant\',\'corporal\',\'lance_corporal\')
                                   NOT NULL

  company            text          NOT NULL

  academic_year      text          e.g., \'2024-25\' NOT NULL

  effective_from     date          NOT NULL

  effective_to       date          NULLABLE --- NULL means currently active

  promoted_by        uuid          FK → users(id)

  notes              text          NULLABLE
  ------------------------------------------------------------------------------------------------

**5.10 quiz_sets**

  ------------------------------------------------------------------------------
  **Column**           **Type**      **Constraints / Notes**
  -------------------- ------------- -------------------------------------------
  id                   uuid          PK

  title                text          NOT NULL

  subject              text          NOT NULL

  wing                 enum          (\'army\',\'navy\',\'air_force\',\'all\')

  difficulty           enum          (\'easy\',\'medium\',\'hard\')

  time_limit_minutes   int           NULLABLE --- NULL = untimed

  is_published         bool          DEFAULT false

  created_by           uuid          FK → users(id)
  ------------------------------------------------------------------------------

**5.11 quiz_questions**

  -----------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- -------------------------------------
  id                  uuid          PK

  quiz_set_id         uuid          FK → quiz_sets(id) NOT NULL

  question_text       text          NOT NULL

  option_a            text          NOT NULL

  option_b            text          NOT NULL

  option_c            text          NULLABLE

  option_d            text          NULLABLE

  correct_option      char(1)       (\'a\',\'b\',\'c\',\'d\') NOT NULL

  explanation         text          NULLABLE --- shown after answering

  image_url           text          NULLABLE --- for image-based
                                    questions

  order_index         int           NOT NULL --- display order within set
  -----------------------------------------------------------------------

**5.12 quiz_attempts**

  -----------------------------------------------------------------------
  **Column**          **Type**      **Constraints / Notes**
  ------------------- ------------- -------------------------------------
  id                  uuid          PK

  quiz_set_id         uuid          FK → quiz_sets(id)

  cadet_id            uuid          FK → users(id)

  score               int           NOT NULL

  total_questions     int           NOT NULL

  answers             jsonb         e.g., \[{question_id, selected,
                                    correct}\]

  started_at          timestamptz   NOT NULL

  completed_at        timestamptz   NULLABLE --- NULL if abandoned
  -----------------------------------------------------------------------

**5.13 notifications**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Column**            **Type**      **Constraints / Notes**
  --------------------- ------------- ----------------------------------------------------------------------------------------------------------------------------
  id                    uuid          PK

  recipient_id          uuid          FK → users(id) NOT NULL --- NULL means broadcast

  title                 text          NOT NULL

  body                  text          NOT NULL

  type                  enum          (\'parade_reminder\',\'exam_alert\',\'event_update\',\'blog_approved\',\'blog_rejected\',\'feedback_response\',\'system\')

  related_entity_type   text          e.g., \'event\', \'post\' --- for deep linking

  related_entity_id     uuid          NULLABLE --- ID of linked entity

  is_read               bool          DEFAULT false

  delivered_at          timestamptz   NULLABLE --- null until FCM confirms
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------

**5.14 audit_logs**

Every write operation by ANO or Admin is recorded here. Immutable --- no
UPDATE or DELETE via RLS.

  ------------------------------------------------------------------------
  **Column**      **Type**    **Notes**
  --------------- ----------- --------------------------------------------
  id              uuid        PK

  actor_id        uuid        FK → users(id)

  action          text        e.g., \'attendance.mark\',
                              \'user.deactivate\', \'post.reject\'

  target_table    text        Table name affected

  target_id       uuid        Row affected

  payload         jsonb       Diff or relevant context

  ip_address      text        Client IP
  ------------------------------------------------------------------------

**6. Core Modules --- Detailed Specifications**

**6.1 Authentication & Onboarding Module**

**6.1.1 Registration Flow**

Self-registration is NOT allowed. All cadets are added through one of
two flows to prevent unauthorized access by non-NCC members:

1.  ANO Bulk Import: ANO uploads a CSV (name, email, chest_no, company,
    year, wing) via the Admin panel. The system creates user accounts
    and sends invite emails with a one-time password setup link (24-hour
    expiry).

2.  ANO Individual Invite: ANO enters a single cadet\'s details and
    clicks \"Send Invite.\" Same email flow.

3.  Cadet Self-Register with Approval: Cadet fills a registration form
    with their chest number. Account is created in is_active = false
    state and pending ANO approval. ANO receives a notification. This is
    the fallback if the ANO cannot do bulk import.

**6.1.2 Session Management**

-   JWT access tokens: 15-minute expiry.

-   Refresh tokens: 7-day expiry, stored in HttpOnly cookies (web) and
    Flutter Secure Storage (Android).

-   Refresh tokens are rotated on every use (Supabase Auth default).

-   Force logout: Admin can invalidate all sessions for a user (security
    incident response).

**6.1.3 Password Policy**

-   Minimum 8 characters, at least one uppercase, one number.

-   Password reset via email OTP only (no security questions).

-   Bcrypt hashing handled by Supabase Auth --- not stored in the users
    table.

  -----------------------------------------------------------------------
  **Security Note:** Never store raw passwords. Never return
  password_hash in any API response. The users table in public schema
  contains no auth credentials --- those remain in auth.users managed
  entirely by Supabase.

  -----------------------------------------------------------------------

**6.2 Attendance Management Module**

**6.2.1 Session Types & Rules**

  -------------------------------------------------------------------------
  **Type**         **Typical          **Mandatory?**   **Min Threshold**
                   Frequency**                         
  ---------------- ------------------ ---------------- --------------------
  Drill            2x per week        Yes              75%

  Band             1x per week        Wing-specific    75%

  Practice (NCC    As scheduled       Yes              80%
  Day / RDC)                                           

  Camp (TSC, ATC,  Annually           Conditional      N/A
  etc.)                                                

  Parade (Republic Annually           Selected cadets  N/A
  Day, etc.)                                           
  -------------------------------------------------------------------------

**6.2.2 Marking Flow (ANO / SUO)**

4.  ANO/SUO opens \"Mark Attendance\" screen.

5.  Selects or creates an attendance session (type, date, time).

6.  System shows a roster of all active cadets for the relevant
    company/wing.

7.  Default status for all cadets is \"Absent.\" ANO taps to mark
    Present/Late/Excused.

8.  ANO submits. System locks the session after 48 hours (is_locked =
    true). No edits after lock without Admin intervention.

9.  All operations cached locally if offline; sync on reconnect with a
    sync badge visible to user.

**6.2.3 Dispute Mechanism**

10. Cadet views their attendance record and identifies an error.

11. Cadet taps \"Dispute\" on a specific record, fills a reason (max 300
    chars).

12. ANO receives a notification. Dispute is visible in a dedicated
    \"Disputes\" tab.

13. ANO can Accept dispute (changes status, logs resolution) or Reject
    (with reason).

14. Cadet notified of outcome. Full dispute history preserved in
    audit_log.

**6.2.4 Eligibility Computation**

The system auto-computes attendance eligibility for B/C Certificate
exams based on session type weights:

-   Drill sessions: 40% weight

-   Practice sessions: 40% weight

-   Camp participation: 20% weight (binary --- attended camp or not)

> A cadet is \"Eligible\" if weighted attendance \>= 75%. A warning
> banner appears on the cadet\'s dashboard if they drop below 80% (early
> warning). Eligibility status is shown on the cadet profile and
> exportable as PDF by ANO.

**6.3 Study & Preparation Module**

**6.3.1 Resource Repository**

-   Organized by: Category (Notes / Question Bank / Previous Papers) →
    Wing → Subject.

-   ANO uploads PDF/image/video to Supabase Storage. Files served via
    signed URLs with 1-hour expiry (anti-hotlinking).

-   Version control: re-uploading a file increments version number;
    older versions remain accessible.

-   Download tracking: download_count incremented on each access (for
    ANO analytics).

**6.3.2 Quiz System**

-   ANO creates quiz sets with MCQs. Each question has 2--4 options,
    correct answer, and optional explanation.

-   Timed or untimed modes. On completion, cadet sees score, correct
    answers, and explanations.

-   Quiz leaderboard visible to all cadets in the same wing (ranked by
    score, then by time taken).

-   Cadets can retake quizzes; all attempts are stored. Best score shown
    on profile.

-   ANO can view per-question analytics (% correct answers) to identify
    weak areas.

**6.4 Events & Parade Management Module**

**6.4.1 Event Creation**

-   ANO creates an event with: title, type, datetime, location, target
    companies/wings, mandatory flag, attachment (PDF).

-   Mandatory events auto-create an attendance_session record at the
    scheduled time.

-   Events are visible on a calendar view and in a list view (filterable
    by type/date/company).

**6.4.2 RSVP & Confirmation**

-   For optional/selection events, cadets can tap \"I\'m Available\" to
    express interest. ANO sees RSVP list.

-   For mandatory events, no RSVP --- attendance is simply tracked as
    present/absent.

-   Reminder push notifications sent 24 hours and 2 hours before
    mandatory events.

**6.5 Suggestion & Feedback Module**

**6.5.1 Anonymity Architecture**

True anonymity in a small unit requires technical enforcement, not just
a UI promise. The following design ensures the ANO cannot identify the
submitter even with database access:

15. The client generates: token = SHA-256(user_id + server_salt +
    floor(unix_timestamp / 86400)).

16. The server_salt is an environment variable never exposed to clients.

17. Only the token (not user_id) is stored in the suggestions table.

18. The token changes daily, so even comparing across days cannot link
    submissions.

19. Rate limit: 2 submissions per day per token (prevents spam without
    revealing identity).

  -----------------------------------------------------------------------
  **Privacy Note:** Admin can technically brute-force the token if they
  know the salt and enumerate all user IDs. Document this limitation and
  ensure the Admin role is not held by cadets from the same unit.

  -----------------------------------------------------------------------

**6.5.2 Feedback Workflow**

-   Cadet submits feedback with category and body text.

-   ANO sees all feedback in a categorized inbox (sorted by recency).
    Cannot see submitter.

-   ANO can write a response. If a response is written, it appears on a
    public \"Feedback Wall\" (body + response, no identity).

-   This creates accountability: the ANO\'s response is visible to all
    cadets, incentivizing constructive replies.

**6.6 Defence News Module**

**6.6.1 Content Pipeline**

-   Manual: ANO writes or pastes a news item with title, body, category,
    optional source URL, and cover image.

-   Phase 2 --- Auto-fetch: A Supabase Edge Function (cron: daily 8:00
    AM IST) fetches RSS feeds from PIB (press.india.gov.in), Indian Army
    website, and NCC Directorate. Parsed articles are staged as drafts
    for ANO review before publishing.

**6.6.2 Categories**

-   NCC Update --- official NCC circulars, camp results, selections

-   Armed Forces --- Indian Army, Navy, Air Force news

-   Current Affairs --- defence-related current affairs for B/C cert
    exams

-   Unit News --- college NCC unit announcements

**6.7 Blog & Achievement Module**

**6.7.1 Post Types**

  -----------------------------------------------------------------------
  **Type**         **Who Can Post**   **Content**
  ---------------- ------------------ -----------------------------------
  Blog             Any cadet          Opinion, tips, preparation
                                      strategies

  Achievement      Any cadet          Awards, selections, medals received

  Experience       Any cadet          Camp diaries, event reports, travel

  Cadet Spotlight  ANO only           \"Cadet of the Month\" --- featured
                                      on home dashboard
  -----------------------------------------------------------------------

**6.7.2 Moderation Workflow**

20. Cadet submits a post (status: pending_approval). Cannot see it
    publicly until approved.

21. ANO receives an in-app notification with post preview.

22. ANO approves (post goes live) or rejects (rejection_reason
    mandatory). Cadet notified either way.

23. Once published, post is editable by the author; edits re-trigger
    moderation.

24. ANO can un-publish any post at any time (soft delete --- post moved
    to archived state).

**6.8 Rank Holders Module**

**6.8.1 Hierarchy Display**

Displays the official command hierarchy of the NCC unit. Not a free-text
field --- ranks are assigned via the rank_holders table linked to actual
user profiles. This means clicking on a rank holder takes you to their
profile.

  -----------------------------------------------------------------------
  **Rank**                   **Max per          **Notes**
                             Company**          
  -------------------------- ------------------ -------------------------
  Senior Under Officer (SUO) 1 (unit-wide)      Highest cadet rank

  Under Officer (UO)         1 per company      

  Sergeant                   2 per company      

  Corporal                   3 per company      

  Lance Corporal             4 per company      
  -----------------------------------------------------------------------

**6.8.2 Historical Records**

-   Past rank holders are preserved with effective_to date. Filterable
    by academic year.

-   A cadet\'s profile automatically shows their rank history over
    years.

**6.9 Notification System**

**6.9.1 Delivery Channels**

  -----------------------------------------------------------------------
  **Channel**        **Use Case**           **Implementation**
  ------------------ ---------------------- -----------------------------
  FCM Push (Android) Parade reminders,      Firebase Cloud Messaging via
                     event alerts, blog     Supabase Edge Function
                     approved               

  Web Push           Same events on web     Service Worker + Web Push API
                     browser                

  In-App             All notification types Real-time via Supabase
  notification                              Realtime (WebSockets)
  centre                                    

  Email (optional)   Weekly digest, invite, Resend API via Edge Function
                     password reset         
  -----------------------------------------------------------------------

**6.9.2 Notification Preferences**

-   Cadets can toggle notification types on/off (e.g., disable quiz
    reminders but keep parade alerts).

-   ANO can mark certain notifications as non-dismissible (mandatory
    parade alerts).

-   All notifications stored in notifications table for 90 days then
    auto-deleted via a scheduled Edge Function.

**7. API Design**

The primary API is Supabase\'s auto-generated REST API (PostgREST) with
Row Level Security enforcing access control at the database level.
Custom business logic is handled by Supabase Edge Functions
(Deno/TypeScript). The mobile and web apps use the Supabase client SDK.

**7.1 Key Edge Functions**

  -----------------------------------------------------------------------------------
  **Function Name**                **Trigger**         **Responsibility**
  -------------------------------- ------------------- ------------------------------
  send-invite-email                HTTP POST (admin)   Generates invite token, sends
                                                       email via Resend

  bulk-import-cadets               HTTP POST (admin)   Parses CSV, validates, creates
                                                       user accounts

  send-fcm-notification            Database webhook    Dispatches FCM push to device
                                   (notifications      tokens
                                   INSERT)             

  compute-attendance-eligibility   Scheduled (daily,   Recomputes eligibility flags
                                   11 PM IST)          for all cadets

  lock-old-sessions                Scheduled (every    Sets is_locked=true on
                                   hour)               sessions older than 48 hours

  anonymize-feedback-token         HTTP POST (client)  Returns daily token without
                                                       logging user_id

  export-attendance-pdf            HTTP POST (ANO)     Generates PDF attendance
                                                       report using PDF-lib

  sync-queue-flush                 HTTP POST (mobile   Applies queued offline
                                   app on reconnect)   attendance records
  -----------------------------------------------------------------------------------

**7.2 Critical API Patterns**

**Pagination**

All list endpoints use cursor-based pagination (keyset pagination) via
Supabase\'s range() method. Limit defaults to 20, max 100. This is
required for the news, blog, and notification feeds which will grow
unbounded.

**Optimistic Updates**

The Flutter and Next.js apps should implement optimistic UI for
attendance marking and quiz submissions --- update local state
immediately, revert on error. This significantly improves perceived
performance, especially on slow connections.

**Realtime Subscriptions**

-   Notifications table: cadets subscribe to their own new rows.

-   Attendance sessions: ANO subscribes during marking to see live
    roster.

-   Events: All users subscribe for real-time event updates on the
    calendar.

**8. UI/UX Specifications**

**8.1 Design System**

  -----------------------------------------------------------------------
  **Element**            **Specification**
  ---------------------- ------------------------------------------------
  Primary Color          #4B5320 (NCC Olive Green)

  Accent Color           #B8860B (Gold --- ranks, highlights)

  Background             #F8F9FA (Light grey) / #1A1A1A (Dark mode)

  Typography (Web)       Inter (body), Poppins (headings)

  Typography (Mobile)    System font (Roboto on Android)

  Min Touch Target       48x48dp (Google Material Guidelines)

  Accessibility          WCAG 2.1 AA --- contrast ratio ≥ 4.5:1 for body
                         text
  -----------------------------------------------------------------------

**8.2 Home Dashboard**

**Cadet View**

-   Today\'s schedule card (next parade/event with countdown timer)

-   Attendance ring (circular progress --- current % with colour: green
    \> 80%, amber 65-80%, red \< 65%)

-   Quick notification badge (unread count)

-   Featured Cadet Spotlight card (if active)

-   Latest news preview (2 cards)

-   Recent quiz score or \"Start a Quiz\" CTA

**ANO View**

-   Today\'s attendance session card with \"Start Marking\" CTA

-   Pending items count: blog approvals, disputes, feedback

-   Unit stats: total present today, attendance percentage unit-wide

-   Upcoming events (next 7 days)

-   Recent activity feed (last 10 actions across the platform)

**8.3 Navigation Structure**

**Cadet Navigation (Bottom Tab Bar --- Mobile)**

  ------------------------------------------------------------------------
  **Tab**       **Icon**     **Screens / Sub-sections**
  ------------- ------------ ---------------------------------------------
  Home          House icon   Dashboard, Cadet Spotlight, News preview

  Study         Book icon    Resources (by category), Quizzes, Leaderboard

  Events        Calendar     Calendar view, List view, Event detail
                icon         

  Attendance    Check icon   Own attendance, Dispute submission

  Community     Users icon   Blog feed, Post blog, Rank Holders,
                             Achievements

  Profile       Person icon  My profile, Settings, Notification prefs,
                             Logout
  ------------------------------------------------------------------------

**ANO Navigation (Sidebar --- Web)**

-   Dashboard \| Attendance (Mark / Sessions / Disputes) \| Events \|
    Cadets \| Study Resources \| Blog & Achievements \| News \| Feedback
    \| Notifications \| Reports \| Settings

**8.4 Key UX Rules**

-   Every destructive action (delete, reject, deactivate) must show a
    confirmation dialog with the exact consequences stated.

-   Attendance marking must work in portrait and landscape orientation
    on mobile.

-   All forms have inline validation --- no \"submit then discover
    errors\" flows.

-   Empty states must have actionable CTAs (e.g., \"No resources yet ---
    ask your ANO to upload materials\").

-   Offline mode must show a persistent banner: \"You\'re offline.
    Changes will sync when connected.\"

-   A loading skeleton (shimmer effect) must replace all lists during
    fetch --- no blank screens.

**9. Phased Implementation Plan**

With a team of 2--4 developers, a phase-based approach is critical.
Feature scope creep is the primary risk for small teams. Each phase
ships a usable product; the next phase adds to it.

**Phase 1 --- Foundation & MVP (Weeks 1--8)**

Goal: Replace WhatsApp for attendance and event communication. The
minimum that makes the platform worth switching to.

  -----------------------------------------------------------------------
  **Module**         **Features Included in Phase 1**
  ------------------ ----------------------------------------------------
  Auth               Email invite, login, role-based access, profile
                     setup

  Attendance         Session creation, mark attendance (online), view own
                     attendance, eligibility %

  Events             Create event, list view, mandatory event flag, push
                     notification

  Notifications      FCM push (Android), in-app notification centre

  User Profiles      Basic profile: name, rank, company, photo,
                     attendance summary
  -----------------------------------------------------------------------

Phase 1 Definition of Done: ANO can mark attendance for a full unit
parade on the app. Cadets can see their attendance on their phone.
Events are announced via push notification.

**Phase 2 --- Study & Community (Weeks 9--16)**

  -----------------------------------------------------------------------
  **Module**         **Features Included in Phase 2**
  ------------------ ----------------------------------------------------
  Study Resources    Upload, categorize, download PDFs; version control

  Quizzes            Create quiz, take quiz, score, explanations,
                     leaderboard

  Blog &             Post blog, moderation workflow, Cadet Spotlight
  Achievements       

  Rank Holders       Assign ranks, display hierarchy, academic year
                     filter

  Attendance         Offline sync (Flutter), dispute mechanism
  -----------------------------------------------------------------------

**Phase 3 --- Feedback, News & Reports (Weeks 17--22)**

  -----------------------------------------------------------------------
  **Module**         **Features Included in Phase 3**
  ------------------ ----------------------------------------------------
  Feedback           Anonymous submission, ANO inbox, Feedback Wall,
                     response

  News               Manual publishing, category filter, source linking

  Reports            PDF attendance export, eligibility report,
                     company-wise stats

  Audit Logs         Admin log viewer with filter and export

  Notifications      Web push, notification preferences, email digest
  -----------------------------------------------------------------------

**Phase 4 --- Polish & Scale (Weeks 23--28)**

-   Performance optimization: query indexes, CDN for static assets,
    image lazy loading.

-   Web platform refinement: ANO dashboard with full analytics.

-   News auto-fetch: PIB/Indian Army RSS feed via Edge Function cron.

-   Bulk import CSV tool for Admin.

-   Dark mode (web and mobile).

-   Accessibility audit (WCAG 2.1 AA compliance check).

**Future Scope (Post v1.0)**

-   AI NCC Assistant: Chatbot powered by Claude API to answer B/C
    Certificate exam questions, drill commands, and NCC rules.
    Context-aware (knows the cadet\'s wing and company).

-   GPS-based attendance: Flutter app uses geofencing (geolocator
    package) to auto-mark present when cadet enters the parade ground
    within the time window. Requires biometric confirmation to prevent
    proxy.

-   iOS app: No additional backend work required --- Flutter codebase
    targets iOS with minor adjustments.

-   Integration with NCC national portal: If Directorate provides an
    API, sync cadet records bi-directionally.

-   Multi-unit support: Architecture already supports multiple colleges
    (add college_id to users and all tables). Superadmin role for
    Directorate oversight.

**10. Non-Functional Requirements**

**10.1 Performance**

  -----------------------------------------------------------------------
  **Metric**             **Target**             **Measurement Method**
  ---------------------- ---------------------- -------------------------
  Page load time (web)   \<2 seconds on 4G      Lighthouse CI in GitHub
                                                Actions

  App startup time       \<3 seconds on         Flutter DevTools
  (cold)                 mid-range Android      

  Attendance marking     \<500ms round trip     Supabase query timing
  (online)                                      

  Push notification      \<30 seconds from      FCM delivery reports
  delivery               trigger                

  API response time      \<400ms                Supabase dashboard
  (p95)                                         

  File upload (10MB PDF) \<15 seconds on 4G     Manual QA
  -----------------------------------------------------------------------

**10.2 Scalability**

-   Supabase free tier supports up to 500 MB database and 1 GB storage.
    For 500 cadets with 2 years of data, estimated database size is \~50
    MB. Free tier is sufficient for Phase 1--2.

-   Supabase Pro tier (\$25/month) recommended before launch: 8 GB DB,
    100 GB storage, daily backups, email support.

-   Database indexes required on: attendance(cadet_id, date),
    attendance(session_id), users(role), users(company), posts(status),
    notifications(recipient_id, is_read).

**10.3 Availability**

-   Supabase Pro: 99.9% uptime SLA. No additional infrastructure
    required for v1.0.

-   The offline-first Flutter app means downtime is transparent to
    cadets during field operations.

-   Incident communication: ANO can fall back to WhatsApp broadcast list
    for critical notices during downtime.

**10.4 Compatibility**

  -----------------------------------------------------------------------
  **Platform**           **Minimum Supported Version**
  ---------------------- ------------------------------------------------
  Android                Android 8.0 (API 26) --- covers \~95% of active
                         Android devices in India

  Web (Chrome)           Chrome 90+

  Web (Firefox)          Firefox 88+

  Web (Safari)           Safari 14+ (iOS web)
  -----------------------------------------------------------------------

**11. Security & Privacy**

**11.1 Authentication Security**

-   Supabase Auth with RLS: every database query runs with the caller\'s
    JWT, enforcing access at the DB level --- not just the API layer.

-   No admin backdoor: even the application server cannot bypass RLS
    without service_role key, which is stored only in Edge Functions and
    never shipped to clients.

-   Rate limiting: Supabase Auth has built-in rate limiting on login
    attempts (5 failed attempts triggers 60-second lockout).

-   HTTPS enforced everywhere. Flutter app uses certificate pinning for
    production builds.

**11.2 Data Protection (DPDP Act 2023 Compliance)**

India\'s Digital Personal Data Protection Act 2023 applies to this
platform. Key obligations:

  -----------------------------------------------------------------------
  **Obligation**           **How We Comply**
  ------------------------ ----------------------------------------------
  Consent for data         Shown during cadet onboarding flow; stored as
  collection               consent_given_at in users table

  Right to access personal Cadets can download their full profile and
  data                     attendance history from the profile screen

  Right to correction      Cadets can edit non-sensitive profile fields;
                           sensitive edits go via ANO

  Data retention           Cadet data retained for 3 years
                           post-graduation; then anonymized (name, email
                           replaced with hash, phone deleted)

  Data deletion on request Admin can process deletion requests;
                           audit_logs retain anonymized action records

  Data breach notification Supabase Pro provides breach detection; must
                           notify affected users within 72 hours
  -----------------------------------------------------------------------

**11.3 Storage Security**

-   All Supabase Storage buckets are private by default. Files served
    via signed URLs with 1-hour expiry.

-   Profile photos: public bucket (acceptable --- not sensitive).

-   Study materials: private bucket with role-based access
    (authenticated users only).

-   Feedback: never stored with any file attachments.

**11.4 Input Validation & Sanitization**

-   All text inputs (blog posts, feedback, remarks) are sanitized
    server-side using DOMPurify equivalents in the Edge Functions to
    prevent XSS.

-   File uploads restricted to pdf, jpg, jpeg, png, mp4. MIME type
    validated server-side, not just by file extension.

-   All database inputs parameterized through Supabase SDK (no raw SQL
    string concatenation).

**12. Testing Strategy**

**12.1 Testing Pyramid**

  --------------------------------------------------------------------------
  **Level**       **Tool**           **Coverage       **What to Test**
                                     Target**         
  --------------- ------------------ ---------------- ----------------------
  Unit Tests      Jest (web),        70%+ on business Eligibility calc,
                  Flutter test       logic            token gen, validation
                  (mobile)                            functions

  Integration     Supabase local     All API          RLS policies, Edge
  Tests           dev + Jest         endpoints        Function responses, DB
                                                      triggers

  E2E Tests (web) Playwright         Critical user    Login, mark
                                     flows            attendance, submit
                                                      feedback, view
                                                      dashboard

  E2E Tests       Flutter            Core flows       Login, attendance,
  (mobile)        integration_test                    notifications, offline
                                                      sync

  Load Testing    k6                 Before launch    200 concurrent users
                                                      marking attendance

  Security        Manual + OWASP ZAP Before launch    Auth bypass, SQL
  Testing                                             injection, XSS, RLS
                                                      bypass attempts
  --------------------------------------------------------------------------

**12.2 Critical Test Scenarios**

25. Cadet A cannot view Cadet B\'s attendance (RLS enforcement).

26. ANO marks attendance offline; goes online; verify sync happens
    correctly with no duplicates.

27. Cadet submits feedback; ANO cannot identify submitter even with
    direct DB access.

28. Session locks after 48 hours; ANO cannot edit locked session.

29. Ineligible cadet sees correct warning on dashboard.

30. Blog post submitted by cadet is NOT visible publicly until ANO
    approves.

31. Admin deactivates a cadet account; cadet cannot log in.

32. Burst: 300 attendance records submitted in 30 seconds (end of parade
    marking); no data loss.

**13. Deployment Architecture**

**13.1 Infrastructure**

  --------------------------------------------------------------------------
  **Component**            **Service**               **Cost (approx.)**
  ------------------------ ------------------------- -----------------------
  Backend + DB + Auth +    Supabase Pro              \$25/month
  Storage                                            

  Web frontend hosting     Vercel (Hobby → Pro)      Free for dev,
                                                     \$20/month for prod

  Android app distribution Google Play Store         \$25 one-time developer
                                                     fee

  Push notifications       Firebase Cloud Messaging  Free (up to 1M
                                                     messages/month)

  Email service            Resend                    Free up to 3,000
                                                     emails/month

  Domain                   Any registrar (.in        \~₹800/year
                           preferred)                

  Total estimated monthly                            \~₹4,000--5,000/month
                                                     in production
  --------------------------------------------------------------------------

**13.2 CI/CD Pipeline**

33. Developer pushes to feature branch.

34. GitHub Actions runs: lint, unit tests, integration tests against
    Supabase local emulator.

35. PR merged to main → Vercel auto-deploys web preview. Flutter build
    CI runs.

36. Release tag → Vercel promotes to production. Flutter build generates
    APK/AAB for Play Store upload.

37. Database migrations run via Supabase CLI as part of deployment
    workflow.

**13.3 Environment Strategy**

  -----------------------------------------------------------------------
  **Environment**    **Purpose**                **Data**
  ------------------ -------------------------- -------------------------
  Local (Supabase    Individual developer       Seed data only
  CLI)               testing                    

  Staging (Supabase  Integration testing, UAT   Anonymized copy of
  project)           with ANO                   production data

  Production         Live system                Real cadet data; daily
  (Supabase project)                            automated backups
  -----------------------------------------------------------------------

**14. Open Questions & Decisions Required**

The following items require input from the ANO or institution before
development begins:

  -----------------------------------------------------------------------------
  **\#**   **Question**                   **Impact If           **Owner**
                                          Unresolved**          
  -------- ------------------------------ --------------------- ---------------
  1        What is the official company   Cannot seed database  ANO
           structure and wing             or test               
           distribution of the unit?      company-filtered      
                                          attendance            

  2        What is the minimum attendance Eligibility           ANO
           % for B/C cert eligibility at  calculation uses      
           this college?                  wrong threshold       

  3        Can the SUO mark attendance in SUO role design       ANO
           the ANO\'s absence?                                  

  4        Should cadet profiles be       Privacy vs. community ANO
           visible to other cadets (e.g., --- affects RLS       
           rank holders page)?                                  

  5        Who holds the Admin role ---   Conflict of interest  Institution
           IT staff, a trusted senior     in feedback anonymity 
           cadet, or the ANO themselves?                        

  6        What is the data retention     DPDP Act compliance,  ANO /
           preference when a cadet        storage cost          Institution
           graduates?                                           

  7        Will this platform eventually  Affects multi-tenant  ANO
           expand to other NCC units in   architecture decision 
           the college / district?        in Phase 4            
  -----------------------------------------------------------------------------

**15. Appendices**

**Appendix A --- Glossary**

  -----------------------------------------------------------------------
  **Term**         **Definition**
  ---------------- ------------------------------------------------------
  ANO              Associate NCC Officer --- the supervising officer for
                   the college NCC unit

  SUO              Senior Under Officer --- the highest-ranked cadet in
                   the unit

  UO               Under Officer --- senior cadet rank, one per company

  RDC              Republic Day Camp --- premier NCC camp held at New
                   Delhi

  TSC              Thal Sainik Camp --- Army wing camp

  ATC              Annual Training Camp

  AIC              Army Integration Camp

  B Certificate    NCC proficiency exam for Junior Division/Wing cadets

  C Certificate    NCC proficiency exam for Senior Division/Wing cadets
                   (higher standard)

  BaaS             Backend as a Service --- Supabase hosts
                   infrastructure; we write logic only

  RLS              Row Level Security --- PostgreSQL feature that
                   enforces access control at the row level

  FCM              Firebase Cloud Messaging --- Google\'s push
                   notification service for Android

  DPDP             Digital Personal Data Protection Act 2023 --- India\'s
                   data protection legislation

  JWT              JSON Web Token --- compact, signed token used for
                   authentication

  Edge Function    Serverless function running at Supabase\'s edge nodes
                   (Deno runtime)
  -----------------------------------------------------------------------

**Appendix B --- Recommended Tech Stack (Final Choices)**

  ------------------------------------------------------------------------
  **Concern**      **Choice**            **Rationale**
  ---------------- --------------------- ---------------------------------
  Web framework    Next.js 14 (App       SSR for SEO, server actions
                   Router)               simplify API calls, Vercel
                                         deploys easily

  Web state        Zustand + React Query Lightweight, built-in caching and
  management       (TanStack)            sync with Supabase

  Mobile framework Flutter 3.x           Single codebase for Android;
                                         iOS-ready; strong offline support
                                         via Drift

  Mobile local DB  Drift (SQLite wrapper Type-safe, supports migrations,
                   for Flutter)          works perfectly for offline queue

  Rich text editor TipTap (web),         Both support Markdown output;
                   flutter_quill         open source
                   (mobile)              

  PDF generation   pdf-lib in Edge       No external service required;
                   Function              generates attendance reports
                                         server-side

  Forms validation Zod (web), form       Runtime type safety, great error
                   validators (Flutter)  messages

  Icons            Lucide React (web),   Consistent, free, extensive
                   Material Icons        
                   (Flutter)             
  ------------------------------------------------------------------------

**Appendix C --- Supabase RLS Policy Examples**

Reference SQL for key tables:

> \-- Cadets can only view their own attendance
>
> CREATE POLICY \"cadet_view_own_attendance\" ON attendance
>
> FOR SELECT USING (cadet_id = auth.uid())
>
> OR EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role IN
> (\'ano\',\'admin\'));
>
> \-- Suggestions are insert-only for cadets; select for ANO/admin only
>
> CREATE POLICY \"cadet_insert_suggestion\" ON suggestions
>
> FOR INSERT WITH CHECK (auth.role() = \'authenticated\');

**Appendix D --- CSV Import Format for Bulk Cadet Registration**

  --------------------------------------------------------------------------
  **Column**         **Required**   **Format / Example**
  ------------------ -------------- ----------------------------------------
  full_name          Yes            Arjun Kumar Singh

  email              Yes            arjun.kumar@college.edu.in

  chest_number       Yes            KT-SW-01-2024

  company            Yes            A / B / C / D

  wing               Yes            army / navy / air_force

  year_of_study      Yes            1 / 2 / 3 / 4

  rank               No             Lance Corporal (default if blank)

  phone              No             9876543210
  --------------------------------------------------------------------------
