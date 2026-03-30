import { Router } from 'express';
import {
  getSessions, createSession, getSessionById, lockSession,
  getDisputes, createDispute, resolveDispute,
} from '../controllers/attendance.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

// Sessions
router.get('/sessions', getSessions);
router.post('/sessions', requireRole('ano', 'suo', 'admin'), createSession);
router.get('/sessions/:id', getSessionById);
router.put('/sessions/:id/lock', requireRole('ano', 'suo', 'admin'), lockSession);

// Disputes
router.get('/disputes', getDisputes);
router.post('/disputes', requireRole('cadet'), createDispute);
router.put('/disputes/:id', requireRole('ano', 'admin'), resolveDispute);

export default router;
