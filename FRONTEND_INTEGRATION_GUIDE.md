# NCC-ERP Frontend Integration Guide

This document outlines the updates required on the NCC-ERP Frontend application to integrate with the new Google Sign-In self-registration flow and updated backend configurations.

## 1. Authentication Updates (Google Sign-In)

The backend now supports a self-registration flow where students can sign in with Google and "apply" to join the NCC platform.

### Step-by-Step Flow:
1. **Trigger Google OAuth:**
   When the user clicks "Sign In With Google", use the Supabase JS client to trigger the OAuth flow:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`
     }
   });
   ```

2. **Check Profile Status upon Callback:**
   After successful login, you will receive an `access_token`. Call `GET /api/auth/me`:
   - If it returns `200 OK`, the user has an active profile. Redirect them to the Dashboard.
   - If it returns `401 Unauthorized` with the message *"User profile not found. Account may not be fully set up. Please apply."*, this is a **new user**. Redirect them to a new `/apply` route on your frontend.
   - If it returns `403 Forbidden`, the user has applied but is still waiting for approval, or they have been deactivated. Show them a "Pending Approval" screen.

3. **The Application Form (`/apply`):**
   Create a form on the frontend collecting:
   - `full_name` (string)
   - `company` (string, e.g., "Alpha")
   - `wing` (dropdown: `army`, `navy`, `airforce`)
   - `chest_number` (string)

4. **Submit Application:**
   When they submit the form, call `POST /api/auth/apply` and pass the Bearer token:
   ```json
   {
     "full_name": "John Doe",
     "company": "Alpha",
     "wing": "army",
     "chest_number": "CDT789"
   }
   ```
   If successful (`201 Created`), show a "Success! Waiting for ANO approval" screen.

## 2. Hardcoded Super Admins (God Mode)

The backend hardcodes two email addresses to always bypass database inactive states and directly grant them unrestricted Admin access:
- `25bcyc34@kristujayanti.com`
- `guynamedleo@gmail.com`

**Frontend Impact:**
If you sign in with Google using either of these emails, you will *bypass* the `/apply` phase entirely. The backend will automatically generate your profile as an active, God-mode Admin. You should be routed directly to the Dashboard.

## 3. Vercel Deployment Requirements

Since the Vercel configuration has been explicitly fixed to serve Serverless API functions:
- The backend API URL for the frontend must be formatted as `https://<YOUR-VERCEL-DOMAIN>/api`.
- Ensure your frontend sets the `credentials: 'include'` fetch option or passing the `Authorization: Bearer <token>` in the headers for all protected routes.
- The `FRONTEND_URL` environment variable must be set on Vercel to allow CORS from your deployed frontend domain.

## Summary of New Endpoints to Consume

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/apply` | `POST` | Create a new pending cadet profile for Google-auth'd users | Yes (Token only, Profile not required) |
