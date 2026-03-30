import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/ranks/hierarchy
 * View organization charts: rank holders grouped by company & academic year.
 */
export const getRankHierarchy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { company, academic_year } = req.query;

  let query = supabaseAdmin
    .from('rank_holders')
    .select('*, users!rank_holders_cadet_id_fkey(full_name, chest_number, profile_photo_url, company, wing)')
    .is('effective_to', null) // Only currently active
    .order('rank', { ascending: true });

  if (company) query = query.eq('company', company as string);
  if (academic_year) query = query.eq('academic_year', academic_year as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch rank hierarchy', 500);

  // Group by rank for hierarchy display
  const hierarchy: Record<string, any[]> = {
    suo: [],
    uo: [],
    sergeant: [],
    corporal: [],
    lance_corporal: [],
  };

  for (const rh of data || []) {
    if (hierarchy[rh.rank]) {
      hierarchy[rh.rank].push(rh);
    }
  }

  res.json({ hierarchy, total: (data || []).length });
});

/**
 * POST /api/ranks/assign
 * Promote or assign a rank to a cadet. Officer+ only.
 */
export const assignRank = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    cadetId: z.string().uuid(),
    rank: z.enum(['suo', 'uo', 'sergeant', 'corporal', 'lance_corporal']),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remarks: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Fetch cadet details
  const { data: cadet } = await supabaseAdmin
    .from('users')
    .select('id, full_name, company, wing')
    .eq('id', parsed.data.cadetId)
    .single();

  if (!cadet) {
    res.status(404).json({ error: 'Cadet not found' });
    return;
  }

  // End any current rank for this cadet
  await supabaseAdmin
    .from('rank_holders')
    .update({ effective_to: parsed.data.effectiveDate })
    .eq('cadet_id', parsed.data.cadetId)
    .is('effective_to', null);

  // Get current academic year
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const academicYear = `${year}-${(year + 1).toString().slice(2)}`;

  // Create the new rank assignment
  const { data, error } = await supabaseAdmin
    .from('rank_holders')
    .insert({
      cadet_id: parsed.data.cadetId,
      rank: parsed.data.rank,
      company: cadet.company,
      academic_year: academicYear,
      effective_from: parsed.data.effectiveDate,
      effective_to: null,
      promoted_by: req.user!.id,
      notes: parsed.data.remarks || null,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to assign rank: ${error.message}`, 500);

  // Update the user's rank in the users table
  await supabaseAdmin
    .from('users')
    .update({ rank: parsed.data.rank, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.cadetId);

  // Notify the cadet
  await supabaseAdmin.from('notifications').insert({
    recipient_id: parsed.data.cadetId,
    title: `Rank Promotion: ${parsed.data.rank.toUpperCase()}`,
    body: `Congratulations! You have been promoted to ${parsed.data.rank.replace('_', ' ').toUpperCase()}.`,
    type: 'system',
    related_entity_type: 'rank_holders',
    related_entity_id: data.id,
  });

  await logAudit(req.user!.id, 'rank.assign', 'rank_holders', data.id, { cadetId: parsed.data.cadetId, rank: parsed.data.rank }, getClientIp(req));

  res.status(201).json({ message: `${cadet.full_name} promoted to ${parsed.data.rank}`, rankHolder: data });
});
