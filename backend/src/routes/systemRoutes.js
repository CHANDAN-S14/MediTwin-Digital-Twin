// backend/src/routes/systemRoutes.js

import { Router } from 'express';

import {
  getSystemStatus,
  health,
} from '../controllers/systemController.js';

import {
  requireAuth,
} from '../middleware/auth.js';

const router = Router();

/**
 * Public API health check.
 */
router.get(
  '/health',
  health
);

/**
 * Authenticated system status.
 */
router.get(
  '/status',
  requireAuth,
  getSystemStatus
);

export default router;