import { Response } from 'express';
import { z } from 'zod';
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
  if (!req.user) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json({ user: req.user });
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

/**
 * POST /api/auth/apply
 * Allows a user who signed in via Google (but has no public.users profile) to apply.
 */
export const applyForAccess = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Define schema for application
  const applySchema = z.object({
    full_name: z.string().min(2, 'Name is required'),
    company: z.string().min(2, 'Company is required'),
    wing: z.enum(['army', 'navy', 'airforce']),
    chest_number: z.string().min(2, 'Chest Number is required')
  });

  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  // Check if they already exist
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, is_active')
    .eq('id', authUser.id)
    .single();

  if (existing) {
    res.status(400).json({ error: 'You have already applied or have an active account.' });
    return;
  }

  // Create the unapproved cadet profile
  const { data: newProfile, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email!,
      full_name: parsed.data.full_name,
      role: 'cadet',
      company: parsed.data.company,
      wing: parsed.data.wing,
      chest_number: parsed.data.chest_number,
      is_active: false // Requires manual approval
    })
    .select()
    .single();

  if (insertError || !newProfile) {
    res.status(500).json({ error: 'Failed to submit application. Please try again.' });
    return;
  }

  res.status(201).json({ 
    message: 'Application submitted successfully. Waiting for ANO/Captain approval.',
    user: newProfile
  });
});
