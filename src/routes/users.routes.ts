import { Router } from 'express';
import { listUsers, getUserById, updateUserStatus, inviteUser, importUsers } from '../controllers/users.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All users routes are protected
router.use(requireAuth);

router.get('/', requireRole('ano', 'admin'), listUsers);
router.get('/:id', getUserById);
router.put('/:id/status', requireRole('admin'), updateUserStatus);
router.post('/invite', requireRole('admin'), inviteUser);
router.post('/import', requireRole('admin'), importUsers);

export default router;
