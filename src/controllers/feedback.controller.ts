import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { z } from 'zod';
import crypto from 'crypto';

// Salt for anonymous token hashing
const FEEDBACK_SALT = process.env.FEEDBACK_SALT || 'ncc-feedback-salt-v1';

/**
 * Helper to generate anonymous token for rate limiting.
 * SHA-256(user_id + salt + day_bucket) — allows 1 submission/day without revealing identity.
 */
const generateAnonymousToken = (userId: string): string => {
  const dayBucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return crypto.createHash('sha256').update(`${userId}${FEEDBACK_SALT}${dayBucket}`).digest('hex');
};

/**
 * GET /api/feedback
 * List feedback inbox. ANO/Admin only.
 */
export const listFeedback = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { is_read } = req.query;

  let query = supabaseAdmin
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (is_read === 'true') query = query.eq('is_read', true);
  if (is_read === 'false') query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch feedback', 500);

  res.json({ feedback: data });
});

/**
 * POST /api/feedback
 * Submit anonymous cadet feedback. Rate limited to 1/day via anonymous_token.
 */
export const submitFeedback = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    message: z.string().min(5).max(1000),
    category: z.enum(['training', 'facility', 'academic', 'event', 'general', 'complaint']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const anonymousToken = generateAnonymousToken(req.user!.id);

  // Check rate limit — 1 submission per day
  const { data: existing } = await supabaseAdmin
    .from('suggestions')
    .select('id')
    .eq('anonymous_token', anonymousToken)
    .single();

  if (existing) {
    res.status(429).json({ error: 'You have already submitted feedback today. Please try again tomorrow.' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('suggestions')
    .insert({
      anonymous_token: anonymousToken,
      category: parsed.data.category,
      body: parsed.data.message,
      is_read: false,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to submit feedback: ${error.message}`, 500);

  res.status(201).json({ message: 'Feedback submitted anonymously. Thank you!' });
});

/**
 * POST /api/feedback/:id/reply
 * Reply to a feedback item. ANO/Admin only.
 */
export const replyToFeedback = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    replyBody: z.string().min(1).max(1000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Reply body is required' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('suggestions')
    .update({
      ano_response: parsed.data.replyBody,
      responded_at: new Date().toISOString(),
      is_read: true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Feedback not found' });
    return;
  }

  res.json({ message: 'Reply posted to feedback wall', feedback: data });
});
