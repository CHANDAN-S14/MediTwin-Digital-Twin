import { Router } from 'express';
import { getHospital, getLayout, previewRoute, updateHospital } from '../controllers/hospitalController.js';
import { requireAuth, requireRole, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

router.get('/', getHospital);
router.get('/layout', getLayout);

/**
 * POST rather than GET because the two department names travel in a body, and
 * this is a read: it plans a path without moving anything.
 */
router.post('/route', previewRoute);

// Editing the floor plan changes where every robot will drive.
router.patch('/', requireRole('admin'), updateHospital);

export default router;
