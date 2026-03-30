import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/attendance/sessions
 * List attendance sessions. Cadets see their company's; Officers see all.
 */
export const getSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = '20', status, type, company, date_from, date_to } = req.query;

  let query = supabaseAdmin
    .from('attendance_sessions')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .limit(Math.min(100, parseInt(limit as string)));

  if (status === 'locked') query = query.eq('is_locked', true);
  if (status === 'unlocked') query = query.eq('is_locked', false);
  if (type) query = query.eq('type', type as string);
  if (company) query = query.eq('company', company as string);
  if (date_from) query = query.gte('date', date_from as string);
  if (date_to) query = query.lte('date', date_to as string);

  const { data, error, count } = await query;
  if (error) throw new AppError('Failed to fetch sessions', 500);

  res.json({ sessions: data, total: count });
});

/**
 * POST /api/attendance/sessions
 * Create a new attendance session. Officer+ only.
 */
export const createSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    title: z.string().min(1).optional(),
    type: z.enum(['band', 'drill', 'practice', 'camp', 'parade', 'ncc_day']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string(),
    end_time: z.string().optional(),
    location: z.string().optional(),
    company: z.string().optional(),
    wing: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('attendance_sessions')
    .insert({
      ...parsed.data,
      created_by: req.user!.id,
      is_locked: false,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create session: ${error.message}`, 500);

  await logAudit(req.user!.id, 'attendance.session_create', 'attendance_sessions', data.id, parsed.data, getClientIp(req));

  res.status(201).json({ session: data });
});

/**
 * GET /api/attendance/sessions/:id
 * Get full session details with all attendance records.
 */
export const getSessionById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('attendance_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Fetch attendance records for this session
  const { data: records, error: recordsError } = await supabaseAdmin
    .from('attendance')
    .select('*, users!attendance_cadet_id_fkey(id, full_name, chest_number, company, wing)')
    .eq('session_id', id);

  if (recordsError) throw new AppError('Failed to fetch attendance records', 500);

  res.json({ session, records: records || [] });
});

/**
 * PUT /api/attendance/sessions/:id/lock
 * Submit attendance records and lock the session. Officer+ only.
 */
export const lockSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    cadets: z.array(z.object({
      cadetId: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      remarks: z.string().optional(),
    })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Check session exists and is not locked
  const { data: session } = await supabaseAdmin
    .from('attendance_sessions')
    .select('id, is_locked')
    .eq('id', id)
    .single();

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  if (session.is_locked) {
    res.status(400).json({ error: 'Session is already locked' });
    return;
  }

  // Delete existing records for this session (in case of re-submission before lock)
  await supabaseAdmin.from('attendance').delete().eq('session_id', id);

  // Insert all attendance records
  const records = parsed.data.cadets.map((c) => ({
    cadet_id: c.cadetId,
    session_id: id,
    marked_by: req.user!.id,
    acting_role: req.user!.role.toUpperCase(),
    status: c.status,
    remarks: c.remarks || null,
  }));

  const { error: insertError } = await supabaseAdmin.from('attendance').insert(records);
  if (insertError) throw new AppError(`Failed to save attendance: ${insertError.message}`, 500);

  // Lock the session
  const { error: lockError } = await supabaseAdmin
    .from('attendance_sessions')
    .update({ is_locked: true })
    .eq('id', id);

  if (lockError) throw new AppError('Failed to lock session', 500);

  await logAudit(req.user!.id, 'attendance.mark', 'attendance_sessions', id, { count: records.length }, getClientIp(req));

  res.json({ message: `Attendance recorded for ${records.length} cadets. Session locked.` });
});

/**
 * GET /api/attendance/disputes
 * List disputes. Cadets see their own; Officers see all pending.
 */
export const getDisputes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status: disputeStatus } = req.query;

  let query = supabaseAdmin
    .from('attendance')
    .select('*, users!attendance_cadet_id_fkey(full_name, chest_number), attendance_sessions(date, type)')
    .eq('is_disputed', true)
    .order('created_at', { ascending: false });

  // Cadets only see own disputes
  if (req.user!.role === 'cadet') {
    query = query.eq('cadet_id', req.user!.id);
  }

  // Filter by resolution status
  if (disputeStatus === 'pending') {
    query = query.is('dispute_resolved_at', null);
  } else if (disputeStatus === 'resolved') {
    query = query.not('dispute_resolved_at', 'is', null);
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch disputes', 500);

  res.json({ disputes: data });
});

/**
 * POST /api/attendance/disputes
 * Cadet raises a dispute over a specific session mark.
 */
export const createDispute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    sessionId: z.string().uuid(),
    reason: z.string().min(5).max(300),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Find the cadet's attendance record for this session
  const { data: record, error: findError } = await supabaseAdmin
    .from('attendance')
    .select('id, session_id, is_disputed')
    .eq('session_id', parsed.data.sessionId)
    .eq('cadet_id', req.user!.id)
    .single();

  if (findError || !record) {
    res.status(404).json({ error: 'No attendance record found for this session' });
    return;
  }

  if (record.is_disputed) {
    res.status(400).json({ error: 'A dispute has already been raised for this record' });
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('attendance')
    .update({
      is_disputed: true,
      dispute_reason: parsed.data.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  if (updateError) throw new AppError('Failed to create dispute', 500);

  // Create notification for officers
  await supabaseAdmin.from('notifications').insert({
    recipient_id: null, // broadcast to officers
    title: 'New Attendance Dispute',
    body: `A cadet has disputed their attendance for session ${parsed.data.sessionId}`,
    type: 'system',
    related_entity_type: 'attendance',
    related_entity_id: record.id,
  });

  res.status(201).json({ message: 'Dispute raised successfully' });
});

/**
 * PUT /api/attendance/disputes/:id
 * Officer resolves (Accept/Reject) a dispute.
 */
export const resolveDispute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    status: z.enum(['accepted', 'rejected']),
    note: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Status must be "accepted" or "rejected"' });
    return;
  }

  const updatePayload: Record<string, any> = {
    dispute_resolved_at: new Date().toISOString(),
    dispute_resolved_by: req.user!.id,
    updated_at: new Date().toISOString(),
  };

  // If accepted, change status to present
  if (parsed.data.status === 'accepted') {
    updatePayload.status = 'present';
  }

  const { data: record, error } = await supabaseAdmin
    .from('attendance')
    .update(updatePayload)
    .eq('id', id)
    .eq('is_disputed', true)
    .select('cadet_id')
    .single();

  if (error || !record) {
    res.status(404).json({ error: 'Dispute not found or already resolved' });
    return;
  }

  // Notify the cadet
  await supabaseAdmin.from('notifications').insert({
    recipient_id: record.cadet_id,
    title: `Attendance Dispute ${parsed.data.status === 'accepted' ? 'Accepted' : 'Rejected'}`,
    body: parsed.data.note || `Your attendance dispute has been ${parsed.data.status}.`,
    type: 'system',
    related_entity_type: 'attendance',
    related_entity_id: id,
  });

  await logAudit(req.user!.id, `attendance.dispute_${parsed.data.status}`, 'attendance', id, parsed.data, getClientIp(req));

  res.json({ message: `Dispute ${parsed.data.status} successfully` });
});
