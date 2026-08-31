import { Router } from 'express';
import authRoutes from './authRoutes.js';
import robotRoutes from './robotRoutes.js';
import wasteRoutes from './wasteRoutes.js';
import taskRoutes from './taskRoutes.js';
import compartmentRoutes from './compartmentRoutes.js';
import aiRoutes from './aiRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import alertRoutes from './alertRoutes.js';
import auditRoutes from './auditRoutes.js';
import hospitalRoutes from './hospitalRoutes.js';
import systemRoutes from './systemRoutes.js';

/**
 * Everything is mounted under /api/v1. The version is in the path from the first
 * commit because the hard part of adding it later is not the routing — it is that
 * a deployed frontend is already calling the unversioned paths.
 */
const router = Router();

router.use('/auth', authRoutes);
router.use('/robots', robotRoutes);
router.use('/waste', wasteRoutes);
router.use('/tasks', taskRoutes);
router.use('/compartments', compartmentRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/alerts', alertRoutes);
router.use('/audit', auditRoutes);
router.use('/hospital', hospitalRoutes);
router.use('/system', systemRoutes);

/** A directory of what this API offers, useful when exploring it by hand. */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'MediTwin API',
      version: 'v1',
      resources: [
        'auth', 'robots', 'waste', 'tasks', 'compartments',
        'ai', 'analytics', 'alerts', 'audit', 'hospital', 'system',
      ],
    },
  });
});

export default router;
