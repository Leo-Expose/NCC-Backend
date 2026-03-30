import { Router } from 'express';
import { getRankHierarchy, assignRank } from '../controllers/ranks.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/hierarchy', getRankHierarchy);
router.post('/assign', requireRole('ano', 'admin'), assignRank);

export default router;
