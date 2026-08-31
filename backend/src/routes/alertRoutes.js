import { Router } from 'express';
import { listAlerts, acknowledgeAlert, acknowledgeAll } from '../controllers/alertController.js';
import { requireAuth, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

router.get('/', listAlerts);

// Anyone who can see an alert can acknowledge it — the record captures who did.
router.post('/:id/acknowledge', acknowledgeAlert);
router.post('/acknowledge-all', acknowledgeAll);

export default router;
