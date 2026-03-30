import { Router } from 'express';
import { listQuizzes, createQuiz, getQuizById, submitQuiz } from '../controllers/quizzes.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', listQuizzes);
router.post('/', requireRole('ano', 'admin'), createQuiz);
router.get('/:id', getQuizById);
router.post('/:id/submit', requireRole('cadet', 'suo'), submitQuiz);

export default router;
