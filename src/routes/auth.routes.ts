import { Router } from 'express';
import { login, getMe, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public
router.post('/login', login);

// Protected
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
