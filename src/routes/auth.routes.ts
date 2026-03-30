import { Router } from 'express';
import { login, getMe, logout, applyForAccess } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public / Semi-Public (handles own JWT verification to allow users without profiles)
router.post('/login', login);
router.post('/apply', applyForAccess);

// Protected (requires a fully active profile in DB)
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
