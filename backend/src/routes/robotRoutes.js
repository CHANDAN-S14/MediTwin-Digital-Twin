import { Router } from 'express';
import {
  listRobots,
  getRobot,
  getTelemetry,
  dispatchRobot,
  recallRobot,
  stopRobot,
  clearRobotStop,
} from '../controllers/robotController.js';

import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Authentication is still required.
// Hospital registration is NOT required for the demo.
router.get('/', requireAuth, listRobots);

router.get('/:robotId', requireAuth, getRobot);

router.get('/:robotId/telemetry', requireAuth, getTelemetry);

router.post('/:robotId/dispatch', requireAuth, dispatchRobot);

router.post('/:robotId/recall', requireAuth, recallRobot);

router.post('/:robotId/stop', requireAuth, stopRobot);

router.post('/:robotId/clear-stop', requireAuth, clearRobotStop);

export default router;