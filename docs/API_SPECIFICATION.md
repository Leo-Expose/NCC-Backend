# NCC-ERP Backend API Specification

This document provides a comprehensive RESTful API blueprint required to support the recently implemented NCC-ERP frontend. Since this will be deployed on Vercel as an independent API (e.g., via Next.js API Routes, Express, or a similar framework), it uses standard HTTP methods and JSON payloads. 

> [!IMPORTANT]
> **Authentication & Authorization**
> All endpoints (unless specified otherwise) require a valid authentication token (e.g., JWT) sent in the `Authorization: Bearer <token>` header.
> Specific endpoints require strict Role-Based Access Control (RBAC). Roles include: `Cadet`, `SUO` (Senior Under Officer), `UO` (Under Officer), `ANO` (Associate NCC Officer), and `Admin`. 

---

## 1. Authentication & Users
**Base Path:** `/api/auth` & `/api/users`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `POST` | `/api/auth/login` | Authenticate user and return JWT + user profile. | `Public` | `{ email, password }` |
| `POST` | `/api/auth/logout` | Invalidate token / end session. | `Any` | - |
| `GET` | `/api/auth/me` | Return the current customized user profile. | `Any` | - |
| `GET` | `/api/users` | List all users (cadets & officers) for the directory. | `ANO/Admin`| `?role=Cadet&company=Alpha` |
| `GET` | `/api/users/:id` | Get full detailed profile for a specific cadet. | `Any` | - |
| `PUT` | `/api/users/:id/status` | Activate or deactivate a user account. | `Admin` | `{ status: "Active" \| "Inactive" }` |
| `POST` | `/api/users/invite` | Send an invitation to a new user. | `Admin` | `{ email, role, company, wing, year }` |
| `POST` | `/api/users/import` | Bulk import users via parsed CSV JSON array. | `Admin` | `[{ name, chest, email, role, ... }]` |

---

## 2. Attendance System
**Base Path:** `/api/attendance`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/attendance/sessions` | Get list of sessions. Cadets get their own history; Officers get all. | `Any` | `?limit=20&status=locked` |
| `POST` | `/api/attendance/sessions` | Create a new active attendance session. | `Officer+`| `{ title, type, date, company, wing }` |
| `GET` | `/api/attendance/sessions/:id` | Get full session details & marked cadet array. | `Any` | - |
| `PUT` | `/api/attendance/sessions/:id/lock` | Finalize & lock a session, recording all statuses. | `Officer+`| `{ cadets: [{ cadetId, status }] }` |
| `GET` | `/api/attendance/disputes` | List disputes. Cadets see their own; Officers see all pending. | `Any` | `?status=pending` |
| `POST` | `/api/attendance/disputes` | Cadet raises a dispute over a specific session mark. | `Cadet` | `{ sessionId, reason }` |
| `PUT` | `/api/attendance/disputes/:id`| Officer resolves (Acc/Rej) a dispute. | `Officer+`| `{ status: "accepted" \| "rejected" }` |

---

## 3. Events & Calendar
**Base Path:** `/api/events`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/events` | List events within a date range mapping to Month/List views. | `Any` | `?start_date=YYYY-MM-DD&end_date=...` |
| `POST` | `/api/events` | Create a new event. | `Officer+`| `{ title, date, time, type, location, audience }` |
| `PUT` | `/api/events/:id` | Edit an existing event. | `Officer+`| Event Object |
| `DELETE`| `/api/events/:id` | Remove an event. | `Officer+`| - |

---

## 4. Academics (Subjects & Marks)
**Base Path:** `/api/academics`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/academics/subjects` | List all subjects and cadet enrollment numbers. | `Any` | - |
| `POST` | `/api/academics/subjects/:id/enroll`| Update the list of cadets enrolled in a subject. | `Officer+`| `{ cadetIds: ["id1", "id2"] }` |
| `GET` | `/api/academics/marks` | Get marks for all cadets across specific subjects. | `Officer+`| `?subject=drill` |
| `PUT` | `/api/academics/marks` | Bulk edit/save marks submitted from the Edit toggle mode. | `Officer+`| `[{ cadetId, drill, weapons, mapReading, ... }]` |

---

## 5. Quizzes & Tests
**Base Path:** `/api/quizzes`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/quizzes` | List all active/past quizzes. | `Any` | `?status=active` |
| `POST` | `/api/quizzes` | Create a new mock test or standard quiz. | `Officer+`| `{ title, description, subject, timeLimit, questions: [...] }` |
| `GET` | `/api/quizzes/:id` | Fetch full quiz structure and questions. | `Any` | - |
| `POST` | `/api/quizzes/:id/submit`| Submit cadet answers and calculate standard score. | `Cadet` | `{ answers: [{ id, answer }] }` |

---

## 6. Community (Blog & News)
**Base Path:** `/api/community`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/community/blog` | List all approved blog posts. | `Any` | `?status=published` |
| `POST` | `/api/community/blog` | Cadet submits a blog post (goes into pending). | `Cadet` | `{ title, excerpt, content, tags }` |
| `PUT` | `/api/community/blog/:id/status`| Officer approves or rejects a blog post. | `Officer+`| `{ status: "published" \| "rejected" }` |
| `POST` | `/api/community/blog/:id/comments`| Add a new comment to a post. | `Any` | `{ body }` |
| `GET` | `/api/community/news` | List official news/announcements. | `Any` | - |
| `POST` | `/api/community/news` | Publish a new official announcement. | `Officer+`| `{ title, content, type }` |

---

## 7. Resources (Study Materials)
**Base Path:** `/api/resources`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/resources` | List uploaded studying materials. | `Any` | `?category=Drill` |
| `POST` | `/api/resources/upload` | Upload a new resource file tracking its S3/bucket URL. | `Officer+`| FormData: `file`, `title`, `category`, `desc` |
| `POST` | `/api/resources/:id/download-log`| Track that a cadet downloaded a specific document. | `Cadet` | - |

---

## 8. Feedback (Anonymous)
**Base Path:** `/api/feedback`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/feedback` | List feedback inbox. | `ANO/Admin`| - |
| `POST` | `/api/feedback` | Submit anonymous cadet feedback. | `Cadet` | `{ message, category }` |
| `POST` | `/api/feedback/:id/reply`| Reply to a feedback item (modifies the thread). | `ANO/Admin`| `{ replyBody }` |

---

## 9. Ranks
**Base Path:** `/api/ranks`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `GET` | `/api/ranks/hierarchy` | View organization charts and occupancy. | `Any` | - |
| `POST` | `/api/ranks/assign` | Promote or assign a rank to a cadet, logging the promotion. | `Officer+`| `{ cadetId, rank, effectiveDate, remarks }` |

---

## 10. Settings & System
**Base Path:** `/api/settings` & `/api/system`

| Method | Endpoint | Description | Role Req. | Payload / Params |
|--------|----------|-------------|-----------|------------------|
| `POST` | `/api/settings/avatar` | Upload and replace profile picture. | `Any` | FormData: `file` |
| `PUT` | `/api/settings/password` | Update current password. | `Any` | `{ currentPassword, newPassword }` |
| `PUT` | `/api/settings/preferences`| Save notification toggles. | `Any` | `{ emailAlerts, ... }` |
| `GET` | `/api/system/audit` | Fetch system audit logs (event/admin tracker). | `Admin` | `?limit=50` |
| `POST` | `/api/system/export` | Core simulated export triggering for PDF/Data downloads. | `Any` | `{ type: "attendance" \| "marks" }` |
