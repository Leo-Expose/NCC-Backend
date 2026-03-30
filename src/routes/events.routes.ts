import { Router } from 'express';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../controllers/events.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', listEvents);
router.post('/', requireRole('ano', 'suo', 'admin'), createEvent);
router.put('/:id', requireRole('ano', 'suo', 'admin'), updateEvent);
router.delete('/:id', requireRole('ano', 'suo', 'admin'), deleteEvent);

export default router;
