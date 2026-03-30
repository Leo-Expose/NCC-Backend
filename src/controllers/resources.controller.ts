import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/resources
 * List study materials, filterable by category, wing, subject.
 */
export const listResources = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { category, wing, subject, search } = req.query;

  let query = supabaseAdmin
    .from('resources')
    .select('*, users!resources_uploaded_by_fkey(full_name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category as string);
  if (wing) query = query.eq('wing', wing as string);
  if (subject) query = query.ilike('subject', `%${subject}%`);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch resources', 500);

  res.json({ resources: data });
});

/**
 * POST /api/resources/upload
 * Upload a new resource (record its metadata). Officer+ only.
 * Actual file upload should go to Supabase Storage directly from the frontend.
 * This endpoint tracks the record.
 */
export const uploadResource = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.enum(['notes', 'question_bank', 'previous_paper', 'reference', 'drill_manual']),
    subject: z.string().min(1),
    wing: z.enum(['army', 'navy', 'air_force', 'all']).default('all'),
    file_url: z.string().url(),
    file_size_kb: z.number().optional(),
    file_type: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('resources')
    .insert({
      ...parsed.data,
      uploaded_by: req.user!.id,
      is_published: true,
      version: 1,
      download_count: 0,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create resource: ${error.message}`, 500);

  await logAudit(req.user!.id, 'resource.upload', 'resources', data.id, { title: parsed.data.title }, getClientIp(req));

  res.status(201).json({ resource: data });
});

/**
 * POST /api/resources/:id/download-log
 * Track that a cadet downloaded a specific document.
 */
export const logDownload = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Increment download count
  const { data: resource, error: fetchErr } = await supabaseAdmin
    .from('resources')
    .select('download_count, file_url')
    .eq('id', id)
    .single();

  if (fetchErr || !resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  await supabaseAdmin
    .from('resources')
    .update({ download_count: (resource.download_count || 0) + 1 })
    .eq('id', id);

  res.json({ message: 'Download logged', file_url: resource.file_url });
});
