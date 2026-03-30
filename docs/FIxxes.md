# Wire Entire NCC Dashboard — Unresponsive Button Audit & Fix

## Overview

After auditing all 15 dashboard pages + login + shell, I identified **28 buttons/interactions** that are either fully unresponsive (no handler), partially wired (just show a toast instead of real UI), or missing functional UI behind them. This plan maps every dead button to a proper interactive flow.

## Button Audit Results

### 🔴 CATEGORY 1: Buttons with NO handler at all (dead clicks)

| # | Page | Button | Issue |
|---|------|--------|-------|
| 1 | Events | `Month` / `List` toggle buttons | No onClick → completely dead |
| 2 | Ranks | `Manage Ranks` button | No onClick → completely dead |
| 3 | Quiz | `+ Create Quiz` button (officer) | No onClick → completely dead |

### 🟡 CATEGORY 2: Buttons that show only a toast (no real action)

| # | Page | Button | Current Behavior |
|---|------|--------|-----------------|
| 4 | Cadets | `View` button per cadet row | Shows toast "Viewing {name}" — no actual detail view |
| 5 | Study | Resource cards (entire card) | No download/open action at all |
| 6 | Blog (Cadet) | `Read More` button | Shows toast "Reading full post..." |
| 7 | Blog (Cadet) | `Comment` button | Shows toast "Comment submitted!" |
| 8 | News | `View` button per article | Shows toast "Opening article..." |
| 9 | Feedback (Officer) | `Reply` button | Shows toast "Reply sent" — no reply form |
| 10 | Reports | `Export PDF Report` button | Shows toast "Generating PDF report..." |
| 11 | Subjects | `Manage Cadets` button per row | Shows toast "Managing {name}" |
| 12 | Marks | `Edit Marks` button | Shows toast "Entering edit mode..." — no edit UI |
| 13 | Settings | `Change Photo` button | Shows toast "Upload triggered" |
| 14 | Admin | CSV Import dropzone | Shows toast "CSV import initiated" |
| 15 | Cadet Attendance | `Raise Dispute` button | Shows toast "Dispute form opening..." — no form |

### 🟢 CATEGORY 3: Buttons that work correctly (no action needed)

All modals (New Session, Create Event, Invite Cadet, Add Subject, Upload Resource, Publish News, Write Post), attendance marking system, quiz attempt flow, role switcher, sign out, sidebar navigation, notification marking, settings toggles, dispute accept/reject, blog approve/reject — these are all properly wired.

---

## Proposed Changes

### Phase 1: Fix Dead Buttons (Category 1)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/events/page.tsx)
- Wire `Month` / `List` toggle buttons with active state tracking (view mode toggle)
- `Month` shows the calendar grid (current), `List` shows events in chronological list format

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/ranks/page.tsx)
- Wire `Manage Ranks` button to open a modal with rank assignment form (select cadet → assign rank + effective date)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/quiz/page.tsx)
- Wire `+ Create Quiz` button to open a modal with quiz creation form (title, subject, difficulty, questions)

---

### Phase 2: Build Real UI for Toast-Only Buttons (Category 2)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/cadets/page.tsx)
- `View` button → open a detail modal showing full cadet profile (name, chest no, rank, company, wing, year, attendance %, status, attendance chart)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/study/page.tsx)
- Resource cards → add a `Download` button per card that triggers a simulated file download toast with progress feedback

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/blog/page.tsx)
- `Read More` → open a full-post modal with complete article content
- `Comment` → open a comment form modal (textarea + submit)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/news/page.tsx)
- `View` button → open a full-article modal with expanded content

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/feedback/page.tsx)
- `Reply` button → open inline or modal reply form (textarea + submit)

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/reports/page.tsx)
- `Export PDF Report` → show generating state → success confirmation with visual feedback

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/subjects/page.tsx)
- `Manage Cadets` → open a modal showing enrolled cadets in that subject with add/remove capability

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/marks/page.tsx)
- `Edit Marks` → toggle table cells into editable inputs, show save/cancel bar

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/settings/page.tsx)
- `Change Photo` → trigger a file input with preview

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/admin/page.tsx)
- CSV Import → wire to actual file input with validation feedback

#### [MODIFY] [page.tsx](file:///Users/jit/Documents/NCC/ncc-web/src/app/dashboard/attendance/page.tsx)
- Cadet `Raise Dispute` button → open a dispute submission modal (select session, reason, file attach)

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure all TypeScript compiles
- Run dev server and test every page visually

### Manual Verification
- Click every button across all 15 pages in both officer and cadet roles
- Verify all modals open/close correctly
- Verify all form submissions show proper feedback
- Verify all toggles and state changes work

