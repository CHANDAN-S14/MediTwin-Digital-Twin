import { Router } from 'express';
import {
  listWaste, getWaste, createWaste, reclassifyWaste, deleteWaste, exportWaste,
} from '../controllers/wasteController.js';
import { requireAuth, requireRole, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

// Declared before /:id so "export" is not swallowed as a waste identifier.
router.get('/export', exportWaste);

router.get('/', listWaste);
router.post('/', createWaste);
router.get('/:id', getWaste);

/**
 * Correcting a category is the whole point of human oversight, so any signed-in
 * user may do it. The previous value is preserved on the record either way.
 */
router.patch('/:id/category', reclassifyWaste);

/**
 * Deletion is admin-only. These records are a regulated register — removing one
 * is closer to amending a legal document than to tidying a list.
 */
router.delete('/:id', requireRole('admin'), deleteWaste);

export default router;
