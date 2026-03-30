import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/academics/subjects
 * List all subjects (distinct from resources table).
 */
export const listSubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('subject, wing')
    .eq('is_published', true);

  if (error) throw new AppError('Failed to fetch subjects', 500);

  // Derive unique subjects with counts
  const subjectMap: Record<string, { subject: string; wing: string; count: number }> = {};
  for (const row of data || []) {
    const key = `${row.subject}-${row.wing}`;
    if (!subjectMap[key]) {
      subjectMap[key] = { subject: row.subject, wing: row.wing, count: 0 };
    }
    subjectMap[key].count++;
  }

  res.json({ subjects: Object.values(subjectMap) });
});

/**
 * POST /api/academics/subjects/:id/enroll
 * Update enrolled cadets for a subject (future use with a subjects table).
 */
export const enrollCadets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    cadetIds: z.array(z.string().uuid()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'cadetIds array required', details: parsed.error.flatten() });
    return;
  }

  // For now, store enrollment in a subject_enrollments table
  const { id } = req.params;
  const records = parsed.data.cadetIds.map((cadetId) => ({
    subject_id: id,
    cadet_id: cadetId,
  }));

  // Clear existing enrollments for this subject
  await supabaseAdmin.from('subject_enrollments').delete().eq('subject_id', id);

  if (records.length > 0) {
    const { error } = await supabaseAdmin.from('subject_enrollments').insert(records);
    if (error) throw new AppError(`Failed to enroll cadets: ${error.message}`, 500);
  }

  await logAudit(req.user!.id, 'academics.enroll', 'subject_enrollments', id, { count: records.length }, getClientIp(req));

  res.json({ message: `${records.length} cadets enrolled successfully` });
});

/**
 * GET /api/academics/marks
 * Get marks for cadets. Officer+ only. Filterable by subject.
 */
export const getMarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { subject } = req.query;

  let query = supabaseAdmin
    .from('cadet_marks')
    .select('*, users!cadet_marks_cadet_id_fkey(full_name, chest_number, company)')
    .order('created_at', { ascending: false });

  if (subject) query = query.eq('subject', subject as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch marks', 500);

  res.json({ marks: data });
});

/**
 * PUT /api/academics/marks
 * Bulk edit/save marks. Officer+ only.
 */
export const updateMarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const markSchema = z.object({
    cadetId: z.string().uuid(),
    drill: z.number().min(0).max(100).optional(),
    weapons: z.number().min(0).max(100).optional(),
    map_reading: z.number().min(0).max(100).optional(),
    fieldcraft: z.number().min(0).max(100).optional(),
    national_integration: z.number().min(0).max(100).optional(),
  });

  const schema = z.array(markSchema);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  let updated = 0;
  for (const mark of parsed.data) {
    const { cadetId, ...scores } = mark;
    const { error } = await supabaseAdmin
      .from('cadet_marks')
      .upsert({
        cadet_id: cadetId,
        ...scores,
        updated_by: req.user!.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cadet_id' });

    if (!error) updated++;
  }

  await logAudit(req.user!.id, 'academics.marks_update', 'cadet_marks', null, { updated }, getClientIp(req));

  res.json({ message: `${updated} mark records updated successfully` });
});
