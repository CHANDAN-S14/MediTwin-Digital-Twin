import { Router } from 'express';

import {
  classify,
  aiHealth,
  getCategories,
} from '../controllers/aiController.js';

import {
  requireAuth,
} from '../middleware/auth.js';

import {
  handleUpload,
} from '../middleware/upload.js';


const router =
  Router();


router.get(
  '/categories',
  requireAuth,
  getCategories
);


router.get(
  '/health',
  requireAuth,
  aiHealth
);


/*
 * IMPORTANT:
 *
 * No requireHospital here.
 *
 * This is why scanner works without
 * hospital registration.
 */

router.post(
  '/classify',
  requireAuth,
  handleUpload,
  classify
);


export default router;