import { Router } from 'express';
import { listSubjects, enrollCadets, getMarks, updateMarks } from '../controllers/academics.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/subjects', listSubjects);
router.post('/subjects/:id/enroll', requireRole('ano', 'admin'), enrollCadets);
router.get('/marks', requireRole('ano', 'admin'), getMarks);
router.put('/marks', requireRole('ano', 'admin'), updateMarks);

export default router;
