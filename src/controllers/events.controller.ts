import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/events
 * List events, optionally filtered by date range, type, and company.
 */
export const listEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { start_date, end_date, type, company, is_mandatory } = req.query;

  let query = supabaseAdmin
    .from('events')
    .select('*')
    .order('start_datetime', { ascending: true });

  if (start_date) query = query.gte('start_datetime', start_date as string);
  if (end_date) query = query.lte('start_datetime', end_date as string);
  if (type) query = query.eq('event_type', type as string);
  if (is_mandatory === 'true') query = query.eq('is_mandatory', true);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch events', 500);

  res.json({ events: data });
});

/**
 * POST /api/events
 * Create a new event. Officer+ only.
 */
export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    event_type: z.enum(['camp', 'parade', 'rdc', 'tsc', 'aic', 'practice', 'exam', 'selection', 'ncc_day', 'other']),
    location: z.string().optional(),
    start_datetime: z.string(),
    end_datetime: z.string().optional(),
    is_mandatory: z.boolean().default(false),
    target_companies: z.array(z.string()).optional(),
    target_wing: z.enum(['army', 'navy', 'air_force', 'all']).default('all'),
    attachment_url: z.string().url().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Validate end_datetime > start_datetime
  if (parsed.data.end_datetime && new Date(parsed.data.end_datetime) <= new Date(parsed.data.start_datetime)) {
    res.status(400).json({ error: 'End date must be after start date' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      ...parsed.data,
      created_by: req.user!.id,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create event: ${error.message}`, 500);

  // If mandatory, broadcast notification
  if (parsed.data.is_mandatory) {
    await supabaseAdmin.from('notifications').insert({
      recipient_id: null,
      title: `Mandatory Event: ${parsed.data.title}`,
      body: `A mandatory ${parsed.data.event_type} has been scheduled for ${parsed.data.start_datetime}`,
      type: 'parade_reminder',
      related_entity_type: 'event',
      related_entity_id: data.id,
    });
  }

  await logAudit(req.user!.id, 'event.create', 'events', data.id, { title: parsed.data.title }, getClientIp(req));

  res.status(201).json({ event: data });
});

/**
 * PUT /api/events/:id
 * Edit an existing event. Officer+ only.
 */
export const updateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Event not found or update failed' });
    return;
  }

  await logAudit(req.user!.id, 'event.update', 'events', id, req.body, getClientIp(req));

  res.json({ event: data });
});

/**
 * DELETE /api/events/:id
 * Remove an event. Officer+ only.
 */
export const deleteEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);

  if (error) throw new AppError('Failed to delete event', 500);

  await logAudit(req.user!.id, 'event.delete', 'events', id, null, getClientIp(req));

  res.json({ message: 'Event deleted successfully' });
});
