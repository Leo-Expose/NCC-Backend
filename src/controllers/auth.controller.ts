import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * POST /api/auth/login
 * Authenticates user credentials via Supabase and returns session + profile.
 */
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Fetch full user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  if (!profile.is_active) {
    res.status(403).json({ error: 'Account deactivated. Contact your ANO.' });
    return;
  }

  // Update last_login_at
  await supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', authData.user.id);

  res.json({
    session: {
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      expires_at: authData.session?.expires_at,
    },
    user: profile,
  });
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 */
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error || !profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json({ user: profile });
});

/**
 * POST /api/auth/logout
 * Signs the user out of Supabase (invalidates refresh token).
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Admin signOut to invalidate the session server-side
  const { error } = await supabaseAdmin.auth.admin.signOut(req.user!.id);

  if (error) {
    console.error('[AUTH] Logout error:', error.message);
  }

  res.json({ message: 'Logged out successfully' });
});
