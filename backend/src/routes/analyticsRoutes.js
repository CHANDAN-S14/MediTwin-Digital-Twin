import { Router } from 'express';
import {
  getOverview, getWasteByCategory, getWasteByDepartment,
  getDailyCollection, getAiPerformance, getFleetStats,
} from '../controllers/analyticsController.js';
import { requireAuth, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

router.get('/overview', getOverview);
router.get('/waste-by-category', getWasteByCategory);
router.get('/waste-by-department', getWasteByDepartment);
router.get('/daily', getDailyCollection);
router.get('/ai-performance', getAiPerformance);
router.get('/fleet', getFleetStats);

export default router;
