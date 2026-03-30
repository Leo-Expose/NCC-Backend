import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/users
 * List all users. Filterable by role, company, wing, year, status.
 * Restricted to ANO/Admin.
 */
export const listUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { role, company, wing, year, status, search, page = '1', limit = '25' } = req.query;

  let query = supabaseAdmin
    .from('users')
    .select('*', { count: 'exact' })
    .order('full_name', { ascending: true });

  if (role) query = query.eq('role', role as string);
  if (company) query = query.eq('company', company as string);
  if (wing) query = query.eq('wing', wing as string);
  if (year) query = query.eq('year_of_study', parseInt(year as string));
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new AppError('Failed to fetch users', 500);

  res.json({
    users: data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limitNum),
    },
  });
});

/**
 * GET /api/users/:id
 * Get detailed profile for a specific user.
 */
export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // If cadet requesting another user's profile, limit visible fields
  if (req.user!.role === 'cadet' && req.user!.id !== id) {
    const { email, last_login_at, invited_by, ...publicProfile } = profile;
    res.json({ user: publicProfile });
    return;
  }

  res.json({ user: profile });
});

/**
 * PUT /api/users/:id/status
 * Activate or deactivate a user account. Admin only.
 */
export const updateUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const schema = z.object({
    status: z.enum(['Active', 'Inactive']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status. Must be "Active" or "Inactive".' });
    return;
  }

  const isActive = parsed.data.status === 'Active';

  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('Failed to update user status', 500);

  await logAudit(
    req.user!.id,
    `user.${isActive ? 'activate' : 'deactivate'}`,
    'users',
    id,
    { status: parsed.data.status },
    getClientIp(req)
  );

  res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
});

/**
 * POST /api/users/invite
 * Send an invitation to a new user. Admin only.
 * Creates a Supabase Auth user and a public.users profile.
 */
export const inviteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    full_name: z.string().min(2),
    role: z.enum(['cadet', 'suo', 'ano', 'admin']).default('cadet'),
    company: z.string().optional(),
    wing: z.enum(['army', 'navy', 'air_force']).optional(),
    chest_number: z.string().optional(),
    year_of_study: z.number().min(1).max(4).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { email, full_name, role, company, wing, chest_number, year_of_study } = parsed.data;

  // Check for existing email
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  // Create auth user with invite (sends magic link email)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (authError) {
    throw new AppError(`Failed to send invite: ${authError.message}`, 500);
  }

  // Create public profile
  const { error: profileError } = await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email,
    full_name,
    role,
    company: company || null,
    wing: wing || null,
    chest_number: chest_number || null,
    year_of_study: year_of_study || null,
    is_active: true,
    invited_by: req.user!.id,
  });

  if (profileError) {
    throw new AppError(`Failed to create user profile: ${profileError.message}`, 500);
  }

  await logAudit(req.user!.id, 'user.invite', 'users', authUser.user.id, { email, role }, getClientIp(req));

  res.status(201).json({ message: 'Invitation sent successfully', userId: authUser.user.id });
});

/**
 * POST /api/users/import
 * Bulk import users via parsed CSV JSON array. Admin only.
 */
export const importUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const usersArray = req.body;

  if (!Array.isArray(usersArray) || usersArray.length === 0) {
    res.status(400).json({ error: 'Request body must be a non-empty array of user objects' });
    return;
  }

  if (usersArray.length > 200) {
    res.status(400).json({ error: 'Maximum 200 users can be imported at once' });
    return;
  }

  const rowSchema = z.object({
    email: z.string().email(),
    full_name: z.string().min(2),
    role: z.enum(['cadet', 'suo', 'ano', 'admin']).default('cadet'),
    company: z.string().optional(),
    wing: z.enum(['army', 'navy', 'air_force']).optional(),
    chest_number: z.string().optional(),
    year_of_study: z.number().optional(),
  });

  const results: { success: string[]; errors: { email: string; reason: string }[] } = {
    success: [],
    errors: [],
  };

  for (const row of usersArray) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      results.errors.push({ email: row.email || 'unknown', reason: 'Validation failed' });
      continue;
    }

    try {
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        parsed.data.email
      );

      if (authErr) {
        results.errors.push({ email: parsed.data.email, reason: authErr.message });
        continue;
      }

      await supabaseAdmin.from('users').insert({
        id: authUser.user.id,
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        role: parsed.data.role,
        company: parsed.data.company || null,
        wing: parsed.data.wing || null,
        chest_number: parsed.data.chest_number || null,
        year_of_study: parsed.data.year_of_study || null,
        is_active: true,
        invited_by: req.user!.id,
      });

      results.success.push(parsed.data.email);
    } catch (err: any) {
      results.errors.push({ email: parsed.data.email, reason: err.message });
    }
  }

  await logAudit(
    req.user!.id,
    'user.bulk_import',
    'users',
    null,
    { imported: results.success.length, failed: results.errors.length },
    getClientIp(req)
  );

  res.status(201).json({
    message: `Imported ${results.success.length} users. ${results.errors.length} failed.`,
    results,
  });
});
