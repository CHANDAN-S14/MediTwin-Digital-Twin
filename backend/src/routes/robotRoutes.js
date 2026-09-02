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

/*
 * DEMO MODE
 * No authentication required.
 */

// Get all robots
router.get('/', listRobots);

// Automatically select an available robot
router.post('/dispatch', dispatchRobot);

// Get individual robot
router.get('/:robotId', getRobot);

// Get telemetry
router.get('/:robotId/telemetry', getTelemetry);

// Dispatch specific robot
router.post('/:robotId/dispatch', dispatchRobot);

// Recall
router.post('/:robotId/recall', recallRobot);

// Emergency stop
router.post('/:robotId/stop', stopRobot);

// Clear stop
router.post('/:robotId/clear-stop', clearRobotStop);

export default router;
