import Robot from '../models/Robot.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import {
  startCollection,
  recallCollection,
  stopCollection,
  clearStopCollection,
} from '../services/robotSimulator.js';

import { emitRobotStatus } from '../services/socketService.js';

/**
 * GET /api/v1/robots
 *
 * Global/demo fleet.
 *
 * Hospital registration is NOT required.
 */
export const listRobots = asyncHandler(async (_req, res) => {
  const robots = await Robot.find({})
    .sort({ robotId: 1 })
    .lean();

  res.json({
    success: true,
    data: robots,
  });
});

/**
 * GET /api/v1/robots/:robotId
 */
export const getRobot = asyncHandler(async (req, res) => {
  const robot = await Robot.findOne({
    robotId: req.params.robotId,
  }).lean();

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${req.params.robotId} not found`
    );
  }

  res.json({
    success: true,
    data: robot,
  });
});

/**
 * GET /api/v1/robots/:robotId/telemetry
 */
export const getTelemetry = asyncHandler(async (req, res) => {
  const robot = await Robot.findOne({
    robotId: req.params.robotId,
  }).lean();

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${req.params.robotId} not found`
    );
  }

res.json({
  success: true,
  data: {
    robotId: robot.robotId,
    status: robot.status,
    battery: robot.battery,
    location: robot.currentLocation,
    targetLocation: robot.targetLocation,
    targetBin: robot.targetBin,
    load: robot.load ?? 0,
    position: robot.position,
    lastActivity: robot.lastActivity,
  },
});
});

/**
 * POST /api/v1/robots/:robotId/dispatch
 *
 * Example body:
 *
 * {
 *   "department": "OT",
 *   "expectedCategory": "yellow",
 *   "confidence": 0.94,
 *   "wasteId": "MW-0001"
 * }
 *
 * Hospital is NOT required.
 */
export const dispatchRobot = asyncHandler(async (req, res) => {
  const {
    robotId: requestedRobotId,
    department = 'OT',
    expectedCategory = 'general',
    confidence = 1,
    wasteId = null,
  } = req.body || {};

  let robot;

  // If frontend specifies a robot, use it.
  if (requestedRobotId) {
    robot = await Robot.findOne({
      robotId: requestedRobotId,
    });
  } else {
    // Otherwise automatically find an available robot.
    robot = await Robot.findOne({
      status: 'IDLE',
      battery: { $gt: 15 },
    }).sort({
      battery: -1,
    });
  }

  if (!robot) {
    throw ApiError.conflict(
      'No available robot was found. Make sure at least one robot is IDLE and has enough battery.'
    );
  }

  if (robot.status !== 'IDLE') {
    throw ApiError.conflict(
      `Robot ${robot.robotId} is currently ${robot.status}`
    );
  }

  if (Number(robot.battery ?? 0) <= 15) {
    throw ApiError.conflict(
      `Robot ${robot.robotId} does not have enough battery`
    );
  }

  const validCategories = [
    'yellow',
    'red',
    'blue',
    'general',
  ];

  const category = validCategories.includes(
    expectedCategory
  )
    ? expectedCategory
    : 'general';

  const task = await startCollection({
    hospitalId: robot.hospitalId ?? null,

    robotId: robot.robotId,

    department: department || 'OT',

    expectedCategory: category,

    confidence: Number(confidence) || 0,

    wasteId,

    requestedBy: req.user?._id ?? null,
  });

  res.status(201).json({
    success: true,

    message: 'Robot collection started',

    data: {
      task,

      robotId: robot.robotId,

      department: department || 'OT',

      expectedCategory: category,

      wasteId,
    },
  });
});

/**
 * POST /api/v1/robots/:robotId/recall
 */
export const recallRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  const result = await recallCollection(robotId);

  res.json({
    success: true,
    message: 'Robot recalled',
    data: result,
  });
});

/**
 * POST /api/v1/robots/:robotId/stop
 */
export const stopRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  const result = await stopCollection(robotId);

  emitRobotStatus(robotId, {
    status: 'STOPPED',
    reason: 'Manual emergency stop',
  });

  res.json({
    success: true,
    message: 'Robot stopped',
    data: result,
  });
});

/**
 * POST /api/v1/robots/:robotId/clear-stop
 */
export const clearRobotStop = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  const result = await clearStopCollection(robotId);

  emitRobotStatus(robotId, {
    status: 'IDLE',
    reason: 'Stop cleared',
  });

  res.json({
    success: true,
    message: 'Robot stop cleared',
    data: result,
  });
});
