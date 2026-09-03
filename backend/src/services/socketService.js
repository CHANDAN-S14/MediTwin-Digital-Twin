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
 */
export const listRobots = asyncHandler(async (_req, res) => {
  const robots = await Robot.find({})
    .sort({ robotId: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: robots,
  });
});


/**
 * GET /api/v1/robots/:robotId
 */
export const getRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const robot = await Robot.findOne({
    robotId,
  }).lean();

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  res.status(200).json({
    success: true,
    data: robot,
  });
});


/**
 * GET /api/v1/robots/:robotId/telemetry
 */
export const getTelemetry = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const robot = await Robot.findOne({
    robotId,
  }).lean();

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  res.status(200).json({
    success: true,
    data: {
      robotId: robot.robotId,

      status: robot.status,

      battery: Number(robot.battery ?? 0),

      location: robot.currentLocation,

      targetLocation: robot.targetLocation,

      targetBin: robot.targetBin,

      load: Number(robot.load ?? 0),

      position: {
        x: Number(robot.position?.x ?? 0),
        y: Number(robot.position?.y ?? 0),
        z: Number(robot.position?.z ?? 0),
      },

      lastActivity: robot.lastActivity,
    },
  });
});


/**
 * POST /api/v1/robots/:robotId/dispatch
 *
 * Example:
 *
 * POST
 * /api/v1/robots/MEDI-001/dispatch
 *
 * Body:
 *
 * {
 *   "department": "OT",
 *   "expectedCategory": "yellow",
 *   "confidence": 0.94,
 *   "wasteId": "MW-0001"
 * }
 */
export const dispatchRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const {
    department = 'OT',
    expectedCategory = 'general',
    confidence = 1,
    wasteId = null,
  } = req.body || {};

  console.log('🚀 Dispatch request:', {
    robotId,
    department,
    expectedCategory,
    confidence,
    wasteId,
  });


  // --------------------------------------------------
  // FIND ROBOT
  // --------------------------------------------------

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }


  // --------------------------------------------------
  // CHECK ROBOT STATUS
  // --------------------------------------------------

  if (robot.status !== 'IDLE') {
    throw ApiError.conflict(
      `Robot ${robotId} is currently ${robot.status}`
    );
  }


  // --------------------------------------------------
  // CHECK BATTERY
  // --------------------------------------------------

  if (Number(robot.battery ?? 0) <= 15) {
    throw ApiError.conflict(
      `Robot ${robotId} does not have enough battery`
    );
  }


  // --------------------------------------------------
  // VALIDATE DEPARTMENT
  // --------------------------------------------------

  const validDepartments = [
    'OT',
    'ICU',
    'WARD',
    'GENERAL',
  ];

  const selectedDepartment =
    String(department || 'OT')
      .trim()
      .toUpperCase();

  const finalDepartment =
    validDepartments.includes(selectedDepartment)
      ? selectedDepartment
      : 'GENERAL';


  // --------------------------------------------------
  // VALIDATE WASTE CATEGORY
  // --------------------------------------------------

  const validCategories = [
    'yellow',
    'red',
    'blue',
    'general',
  ];

  const selectedCategory =
    String(expectedCategory || 'general')
      .trim()
      .toLowerCase();

  const finalCategory =
    validCategories.includes(selectedCategory)
      ? selectedCategory
      : 'general';


  // --------------------------------------------------
  // NORMALIZE CONFIDENCE
  // --------------------------------------------------

  const finalConfidence =
    Number.isFinite(Number(confidence))
      ? Number(confidence)
      : 1;


  console.log('🤖 Starting robot simulation:', {
    robotId,
    department: finalDepartment,
    category: finalCategory,
    confidence: finalConfidence,
  });


  // --------------------------------------------------
  // START COLLECTION
  // --------------------------------------------------

  const task = await startCollection({
    hospitalId: robot.hospitalId ?? null,

    robotId: robot.robotId,

    department: finalDepartment,

    expectedCategory: finalCategory,

    confidence: finalConfidence,

    wasteId,

    requestedBy: null,
  });


  // --------------------------------------------------
  // SEND INITIAL SOCKET STATUS
  // --------------------------------------------------

  emitRobotStatus(robot.robotId, {
    status: 'DISPATCHED',

    currentLocation:
      robot.currentLocation ||
      'Charging Station',

    targetLocation:
      finalDepartment,

    targetBin:
      finalCategory,

    lastActivity:
      `Dispatched to ${finalDepartment}`,
  });


  // --------------------------------------------------
  // RESPONSE
  // --------------------------------------------------

  res.status(201).json({
    success: true,

    message:
      `Robot ${robot.robotId} collection started`,

    data: {
      task,

      robotId:
        robot.robotId,

      department:
        finalDepartment,

      expectedCategory:
        finalCategory,

      confidence:
        finalConfidence,

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

  const result =
    await recallCollection(robotId);

  res.status(200).json({
    success: true,

    message:
      'Robot recalled',

    data:
      result,
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

  const result =
    await stopCollection(robotId);

  emitRobotStatus(robotId, {
    status: 'STOPPED',

    reason:
      'Manual emergency stop',

    lastActivity:
      'Emergency stop activated',
  });

  res.status(200).json({
    success: true,

    message:
      'Robot stopped',

    data:
      result,
  });
});


/**
 * POST /api/v1/robots/:robotId/clear-stop
 */
export const clearRobotStop = asyncHandler(
  async (req, res) => {
    const { robotId } = req.params;

    const robot = await Robot.findOne({
      robotId,
    });

    if (!robot) {
      throw ApiError.notFound(
        `Robot ${robotId} not found`
      );
    }

    const result =
      await clearStopCollection(robotId);

    emitRobotStatus(robotId, {
      status: 'IDLE',

      currentLocation:
        'Charging Station',

      targetLocation:
        null,

      targetBin:
        null,

      lastActivity:
        'Stop cleared',
    });

    res.status(200).json({
      success: true,

      message:
        'Robot stop cleared',

      data:
        result,
    });
  }
);
