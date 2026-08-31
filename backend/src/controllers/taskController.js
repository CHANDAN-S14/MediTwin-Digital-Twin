import Task from '../models/Task.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';
import { emitToHospital, EVENTS } from '../services/socketService.js';
import * as simulator from '../services/robotSimulator.js';

/** GET /api/v1/tasks */
export const listTasks = asyncHandler(async (req, res) => {
  const { status, robotId, from, to } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));

  const filter = { hospitalId: req.hospitalId };
  if (status) filter.status = { $in: String(status).split(',') };
  if (robotId) filter.robotId = String(robotId).toUpperCase();
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Task.countDocuments(filter),
  ]);

  const counts = await Task.aggregate([
    { $match: { hospitalId: req.hospitalId } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page, limit, total, pages: Math.ceil(total / limit) || 1,
      byStatus: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    },
  });
});

/** GET /api/v1/tasks/:taskId */
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    taskId: String(req.params.taskId).toUpperCase(),
    hospitalId: req.hospitalId,
  });
  if (!task) throw ApiError.notFound(`No task ${req.params.taskId}`);
  res.json({ success: true, data: task });
});

/**
 * POST /api/v1/tasks
 * Creating a task is the same act as dispatching a robot, so this delegates
 * rather than maintaining a second path into the simulator.
 */
export const createTask = asyncHandler(async (req, res) => {
  const { robotId, source, expectedCategory, priority } = req.body;
  if (!robotId || !source) throw ApiError.badRequest('A task needs a robot and a source department');

  const task = await simulator.startCollection({
    hospitalId: req.hospitalId,
    robotId,
    department: source,
    expectedCategory: expectedCategory ?? null,
    priority: priority ?? 'normal',
    requestedBy: req.user._id,
    actor: req.user,
  });

  res.status(202).json({ success: true, data: task });
});

/** PATCH /api/v1/tasks/:taskId/status — for cancelling a queued task by hand */
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const allowed = ['cancelled', 'failed'];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(`You can only set a task to ${allowed.join(' or ')} by hand — the rest are driven by the robot`);
  }

  const task = await Task.findOne({
    taskId: String(req.params.taskId).toUpperCase(),
    hospitalId: req.hospitalId,
  });
  if (!task) throw ApiError.notFound(`No task ${req.params.taskId}`);
  if (['completed', 'cancelled'].includes(task.status)) {
    throw ApiError.badRequest(`${task.taskId} is already ${task.status}`);
  }

  const previous = task.status;
  task.status = status;
  task.failureReason = reason ?? null;
  task.completedAt = new Date();
  await task.save();

  // A task cannot be cancelled while its robot keeps driving.
  if (simulator.isRunning(task.robotId)) {
    await simulator.emergencyStop({
      hospitalId: req.hospitalId,
      robotId: task.robotId,
      actor: req.user,
    });
  }

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'task.status_change',
    entityType: 'Task',
    entityId: task.taskId,
    changes: { status: [previous, status] },
    ip: req.ip,
  });

  emitToHospital(req.hospitalId, EVENTS.TASK_UPDATED, task.toJSON());
  res.json({ success: true, data: task });
});
