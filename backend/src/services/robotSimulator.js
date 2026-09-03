import Robot from "../models/Robot.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import {
  startCollection,
  recallCollection,
  stopCollection,
  clearStopCollection,
} from "../services/robotSimulator.js";

import { emitRobotStatus } from "../services/socketService.js";

/* ============================================================
   GET ALL ROBOTS
   GET /api/v1/robots
============================================================ */

export const listRobots = asyncHandler(async (_req, res) => {
  const robots = await Robot.find({})
    .sort({ robotId: 1 })
    .lean();

  res.json({
    success: true,
    data: robots,
  });
});

/* ============================================================
   GET SINGLE ROBOT
   GET /api/v1/robots/:robotId
============================================================ */

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

  res.json({
    success: true,
    data: robot,
  });
});

/* ============================================================
   GET ROBOT TELEMETRY
   GET /api/v1/robots/:robotId/telemetry
============================================================ */

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

      position: {
        x: Number(robot.position?.x) || 0,
        y: Number(robot.position?.y) || 0,
        z: Number(robot.position?.z) || 0,
      },

      lastActivity:
        robot.lastActivity ||
        "Waiting for task",
    },
  });
});

/* ============================================================
   DISPATCH ROBOT
   POST /api/v1/robots/:robotId/dispatch
============================================================ */

export const dispatchRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const {
    department = "OT",
    expectedCategory = "general",
    confidence = 1,
    wasteId = null,
  } = req.body || {};

  console.log(
    "================================================"
  );

  console.log("🚀 ROBOT DISPATCH REQUEST");

  console.log({
    robotId,
    department,
    expectedCategory,
    confidence,
    wasteId,
  });

  console.log(
    "================================================"
  );

  /* ----------------------------------------------------------
     FIND ROBOT
  ---------------------------------------------------------- */

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw ApiError.notFound(
      `Robot ${robotId} not found`
    );
  }

  /* ----------------------------------------------------------
     CHECK ROBOT STATUS
  ---------------------------------------------------------- */

  if (robot.status !== "IDLE") {
    throw ApiError.conflict(
      `Robot ${robot.robotId} is currently ${robot.status}`
    );
  }

  /* ----------------------------------------------------------
     CHECK BATTERY
  ---------------------------------------------------------- */

  const battery = Number(robot.battery ?? 0);

  if (battery <= 15) {
    throw ApiError.conflict(
      `Robot ${robot.robotId} does not have enough battery`
    );
  }

  /* ----------------------------------------------------------
     VALIDATE DEPARTMENT
  ---------------------------------------------------------- */

  const validDepartments = [
    "OT",
    "ICU",
    "WARD",
    "GENERAL",
  ];

  const normalizedDepartment =
    String(department || "OT")
      .trim()
      .toUpperCase();

  const finalDepartment =
    validDepartments.includes(
      normalizedDepartment
    )
      ? normalizedDepartment
      : "GENERAL";

  /* ----------------------------------------------------------
     VALIDATE CATEGORY
  ---------------------------------------------------------- */

  const validCategories = [
    "yellow",
    "red",
    "blue",
    "general",
  ];

  const normalizedCategory =
    String(expectedCategory || "general")
      .trim()
      .toLowerCase();

  const finalCategory =
    validCategories.includes(
      normalizedCategory
    )
      ? normalizedCategory
      : "general";

  /* ----------------------------------------------------------
     CONFIDENCE
  ---------------------------------------------------------- */

  const finalConfidence =
    Number(confidence) || 0;

  /* ----------------------------------------------------------
     START SIMULATION
  ---------------------------------------------------------- */

  const task = await startCollection({
    hospitalId: robot.hospitalId ?? null,

    robotId: robot.robotId,

    department: finalDepartment,

    expectedCategory: finalCategory,

    confidence: finalConfidence,

    wasteId,

    requestedBy: null,
  });

  /* ----------------------------------------------------------
     IMPORTANT:
     The simulator is now responsible for the complete
     movement lifecycle.

     We only tell connected Digital Twin clients that the
     robot has been dispatched.

     DO NOT send COLLECTING here.
  ---------------------------------------------------------- */

  emitRobotStatus(robot.robotId, {
    status: "DISPATCHED",

    currentLocation:
      robot.currentLocation ||
      "Charging Station",

    targetLocation:
      finalDepartment,

    targetBin:
      finalCategory,

    lastActivity:
      `Dispatched to ${finalDepartment}`,
  });

  /* ----------------------------------------------------------
     RESPONSE
  ---------------------------------------------------------- */

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

/* ============================================================
   RECALL ROBOT
   POST /api/v1/robots/:robotId/recall
============================================================ */

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

  res.json({
    success: true,

    message:
      "Robot recalled",

    data: result,
  });
});

/* ============================================================
   STOP ROBOT
   POST /api/v1/robots/:robotId/stop
============================================================ */

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
    status: "STOPPED",

    currentLocation:
      robot.currentLocation,

    targetLocation:
      robot.targetLocation,

    targetBin:
      robot.targetBin,

    lastActivity:
      "Emergency stop activated",

    reason:
      "Manual emergency stop",
  });

  res.json({
    success: true,

    message:
      "Robot stopped",

    data: result,
  });
});

/* ============================================================
   CLEAR STOP
   POST /api/v1/robots/:robotId/clear-stop
============================================================ */

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

  const result =
    await clearStopCollection(robotId);

  emitRobotStatus(robotId, {
    status: "IDLE",

    currentLocation:
      "Charging Station",

    targetLocation:
      null,

    targetBin:
      null,

    lastActivity:
      "Stop cleared",
  });

  res.json({
    success: true,

    message:
      "Robot stop cleared",

    data: result,
  });
});
