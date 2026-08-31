import { Router } from 'express';
import rateLimit from 'express-rate-limit';


import {
  register,
  login,
  me,
  updateProfile,
} from '../controllers/authController.js';

import {
  requireAuth,
} from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register',
  authLimiter,
  register
);

router.post(
  '/login',
  authLimiter,
  login
);

router.get(
  '/me',
  requireAuth,
  me
);

router.patch(
  '/me',
  requireAuth,
  updateProfile
);

export default router;