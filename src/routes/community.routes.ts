import { Router } from 'express';
import {
  listBlogPosts, createBlogPost, moderateBlogPost, addComment,
  listNews, createNews,
} from '../controllers/community.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

// Blog
router.get('/blog', listBlogPosts);
router.post('/blog', createBlogPost);
router.put('/blog/:id/status', requireRole('ano', 'admin'), moderateBlogPost);
router.post('/blog/:id/comments', addComment);

// News
router.get('/news', listNews);
router.post('/news', requireRole('ano', 'admin'), createNews);

export default router;
