import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

// ────────────────── BLOG ──────────────────

/**
 * GET /api/community/blog
 * List blog posts. Shows published by default; authors see their own drafts.
 */
export const listBlogPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status = 'published', post_type } = req.query;

  let query = supabaseAdmin
    .from('posts')
    .select('*, users!posts_author_id_fkey(full_name, profile_photo_url)')
    .order('created_at', { ascending: false });

  // Officers see all statuses if they want; cadets only see published + their own
  if (req.user!.role === 'cadet') {
    if (status === 'published') {
      query = query.eq('status', 'published');
    } else {
      // Cadets can also see their own drafts/pending
      query = query.or(`status.eq.published,author_id.eq.${req.user!.id}`);
    }
  } else {
    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }
  }

  if (post_type) query = query.eq('post_type', post_type as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch blog posts', 500);

  res.json({ posts: data });
});

/**
 * POST /api/community/blog
 * Submit a blog post. Cadets go to pending_approval; ANO auto-approved.
 */
export const createBlogPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(10),
    post_type: z.enum(['blog', 'achievement', 'spotlight', 'experience']).default('blog'),
    excerpt: z.string().max(300).optional(),
    cover_image_url: z.string().url().optional(),
    camp_name: z.string().optional(),
    achievement_type: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const postStatus = ['ano', 'admin'].includes(req.user!.role) ? 'published' : 'pending_approval';

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      post_type: parsed.data.post_type,
      cover_image_url: parsed.data.cover_image_url || null,
      camp_name: parsed.data.camp_name || null,
      achievement_type: parsed.data.achievement_type || null,
      author_id: req.user!.id,
      status: postStatus,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create post: ${error.message}`, 500);

  res.status(201).json({ post: data });
});

/**
 * PUT /api/community/blog/:id/status
 * Officer approves or rejects a blog post.
 */
export const moderateBlogPost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    status: z.enum(['published', 'rejected']),
    rejection_reason: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Status must be "published" or "rejected"' });
    return;
  }

  if (parsed.data.status === 'rejected' && !parsed.data.rejection_reason) {
    res.status(400).json({ error: 'Rejection reason is required when rejecting a post' });
    return;
  }

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .update({
      status: parsed.data.status,
      rejection_reason: parsed.data.rejection_reason || null,
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('author_id, title')
    .single();

  if (error || !post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  // Notify the author
  const notifType = parsed.data.status === 'published' ? 'blog_approved' : 'blog_rejected';
  await supabaseAdmin.from('notifications').insert({
    recipient_id: post.author_id,
    title: `Post ${parsed.data.status === 'published' ? 'Approved' : 'Rejected'}: ${post.title}`,
    body: parsed.data.rejection_reason || 'Your post has been approved and is now published!',
    type: notifType,
    related_entity_type: 'post',
    related_entity_id: id,
  });

  await logAudit(req.user!.id, `post.${parsed.data.status === 'published' ? 'approve' : 'reject'}`, 'posts', id, parsed.data, getClientIp(req));

  res.json({ message: `Post ${parsed.data.status} successfully` });
});

/**
 * POST /api/community/blog/:id/comments
 * Add a comment to a blog post. (Stored as a simple jsonb field or separate table)
 * For now, we use a separate approach with notifications.
 */
export const addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({ body: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Comment body is required (max 500 chars)' });
    return;
  }

  // Verify post exists
  const { data: post } = await supabaseAdmin.from('posts').select('id, author_id').eq('id', id).single();
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  // Insert comment into post_comments table
  const { data, error } = await supabaseAdmin
    .from('post_comments')
    .insert({
      post_id: id,
      author_id: req.user!.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to add comment: ${error.message}`, 500);

  res.status(201).json({ comment: data });
});

// ────────────────── NEWS ──────────────────

/**
 * GET /api/community/news
 * List official news/announcements.
 */
export const listNews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { category } = req.query;

  let query = supabaseAdmin
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (category) query = query.eq('category', category as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch news', 500);

  res.json({ news: data });
});

/**
 * POST /api/community/news
 * Publish a new official announcement. Officer+ only.
 */
export const createNews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(10),
    category: z.enum(['ncc_update', 'armed_forces', 'current_affairs', 'unit_news']),
    cover_image_url: z.string().url().optional(),
    source_url: z.string().url().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('news')
    .insert({
      ...parsed.data,
      published_by: req.user!.id,
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to publish news: ${error.message}`, 500);

  await logAudit(req.user!.id, 'news.publish', 'news', data.id, { title: parsed.data.title }, getClientIp(req));

  res.status(201).json({ news: data });
});
