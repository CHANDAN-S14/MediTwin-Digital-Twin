import { Router } from 'express';
import { listTasks, getTask, createTask, updateTaskStatus } from '../controllers/taskController.js';
import { requireAuth, requireRole, requireHospital } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireHospital);

router.get('/', listTasks);
router.get('/:taskId', getTask);

// Creating a task dispatches a robot, so it carries the same restriction.
router.post('/', requireRole('admin', 'operator'), createTask);
router.patch('/:taskId/status', requireRole('admin', 'operator'), updateTaskStatus);

export default router;
