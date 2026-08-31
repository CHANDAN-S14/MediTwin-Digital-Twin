import { Router } from 'express';
import {
  listCompartments, getCompartment, scheduleDisposal, emptyCompartment,
} from '../controllers/compartmentController.js';
import { requireAuth, requireRole, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

router.get('/', listCompartments);
router.get('/:compartmentId', getCompartment);

router.post('/:compartmentId/schedule-disposal', requireRole('admin', 'operator'), scheduleDisposal);

/**
 * Marking a compartment empty asserts that its contents were handed to the
 * disposal vendor. That is a chain-of-custody claim, so it is restricted and
 * audited rather than being a convenience button.
 */
router.post('/:compartmentId/empty', requireRole('admin', 'operator'), emptyCompartment);

export default router;
