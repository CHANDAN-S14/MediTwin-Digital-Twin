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

const router = Router();

router.get('/', listRobots);

router.get('/:robotId', getRobot);

router.get('/:robotId/telemetry', getTelemetry);

router.post('/:robotId/dispatch', dispatchRobot);

router.post('/:robotId/recall', recallRobot);

router.post('/:robotId/stop', stopRobot);

router.post('/:robotId/clear-stop', clearRobotStop);

export default router;
