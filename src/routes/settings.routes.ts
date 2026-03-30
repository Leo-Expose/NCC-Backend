import { Router } from 'express';
import { updateAvatar, updatePassword, updatePreferences, getAuditLogs, exportData } from '../controllers/settings.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

// Settings
router.post('/avatar', updateAvatar);
router.put('/password', updatePassword);
router.put('/preferences', updatePreferences);

// System
router.get('/audit', requireRole('admin'), getAuditLogs);
router.post('/export', exportData);

export default router;
