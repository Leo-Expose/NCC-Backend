import { Router } from 'express';
import { listFeedback, submitFeedback, replyToFeedback } from '../controllers/feedback.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('ano', 'admin'), listFeedback);
router.post('/', requireRole('cadet', 'suo'), submitFeedback);
router.post('/:id/reply', requireRole('ano', 'admin'), replyToFeedback);

export default router;
