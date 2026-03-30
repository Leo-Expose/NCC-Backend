# NCC-ERP Backend API

This is the secure, scalable Node.js/Express backend API for the NCC Digital Command & Management Platform, designed to run as Vercel Serverless Functions and backed by Supabase PostgreSQL.

## Features

- **40+ API Endpoints** across 11 modules (Auth, Users, Attendance, Events, Academics, Quizzes, Community, Resources, Feedback, Ranks, Settings).
- **Supabase PostgreSQL** 18-table database with strict Role-Based Access Control (RBAC) and Row Level Security (RLS) via `(select auth.uid())` optimized queries.
- **Audit Logging** tracking all write operations performed by privileged officers/admins.
- **Anonymous Feedback System** utilizing SHA-256 day-based IP/token hashing.
- **Google Sign-In "Application" Flow** with a dedicated self-registration entry point.
- **Hardcoded Super Admin Injection** for immediate, unbreakable system administration access via Google auth.
- **Vercel Serverless Optimized** via `api/index.ts` zero-setup configurations.

## Local Setup

### 1. Prerequisites
- Node.js v18+
- A Supabase Project
- Supabase CLI (optional)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FEEDBACK_SALT=random-string-here
```
*(Note: `SUPABASE_SERVICE_ROLE_KEY` must be populated properly for local testing to perform operations, since this backend operates as an authoritative server).*

### 4. Start Development Server
```bash
npm run dev
```

## Vercel Deployment

Deploying to Vercel requires zero complex configuration because this repo is fully optimized.

1. Create a new project in Vercel and import this GitHub repository.
2. In the Environment Variables section, add:
   - `FRONTEND_URL` (The deployed URL of your frontend app)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FEEDBACK_SALT`
3. Click **Deploy**. The preset `vercel.json` configures `@vercel/node` automatically.

## Frontend Integration & Testing

- For frontend developers integrating with this Google Sign-In backend flow, read the [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md).
- To test the API endpoints directly using Postman, import the `postman_collection.json` located in the root of this repository.

## Documentation Structure
- `api/index.ts`: The main entrypoint for Vercel functions.
- `src/controllers/`: Route handlers.
- `src/middlewares/`: Auth (`requireAuth`, SuperAdmin logic, `requireRole`), error, and audit handling.
- `src/routes/`: Route declarations.
- `FRONTEND_INTEGRATION_GUIDE.md`: Frontend instructions.
