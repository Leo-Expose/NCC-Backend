import { Router } from 'express';
import { listResources, uploadResource, logDownload } from '../controllers/resources.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', listResources);
router.post('/upload', requireRole('ano', 'admin'), uploadResource);
router.post('/:id/download-log', logDownload);

export default router;
