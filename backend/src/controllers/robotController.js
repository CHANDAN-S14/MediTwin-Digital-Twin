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

/*
|--------------------------------------------------------------------------
| GET /api/v1/robots
|--------------------------------------------------------------------------
*/

export const listRobots = asyncHandler(
  async (_req, res) => {
    const robots = await Robot.find({})
      .sort({
        robotId: 1,
      })
      .lean();

    res.json({
      success: true,

      data: robots,
    });
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/v1/robots/:robotId
|--------------------------------------------------------------------------
*/

export const getRobot = asyncHandler(
  async (req, res) => {
    const { robotId } = req.params;

    const robot =
      await Robot.findOne({
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
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/v1/robots/:robotId/telemetry
|--------------------------------------------------------------------------
*/

export const getTelemetry =
  asyncHandler(
    async (req, res) => {
      const { robotId } = req.params;

      const robot =
        await Robot.findOne({
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
          robotId:
            robot.robotId,

          status:
            robot.status,

          battery:
            robot.battery,

          location:
            robot.currentLocation,

          targetLocation:
            robot.targetLocation,

          targetBin:
            robot.targetBin,

          load:
            robot.load ?? 0,

          position:
            robot.position,

          lastActivity:
            robot.lastActivity,

          currentTaskId:
            robot.currentTaskId,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| POST /api/v1/robots/:robotId/dispatch
|--------------------------------------------------------------------------
|
| Example:
|
| POST
| /api/v1/robots/MEDI-001/dispatch
|
| Body:
|
| {
|   "department": "OT",
|   "expectedCategory": "yellow",
|   "confidence": 0.94,
|   "wasteId": "MW-0001"
| }
|
|--------------------------------------------------------------------------
*/

export const dispatchRobot =
  asyncHandler(
    async (req, res) => {
      const { robotId } =
        req.params;

      const {
        department = "OT",

        expectedCategory =
          "general",

        confidence = 1,

        wasteId = null,
      } = req.body || {};

      console.log(
        "🚀 Dispatch request:",
        {
          robotId,
          department,
          expectedCategory,
          confidence,
          wasteId,
        }
      );

      /*
       * Find robot
       */

      const robot =
        await Robot.findOne({
          robotId,
        });

      if (!robot) {
        throw ApiError.notFound(
          `Robot ${robotId} not found`
        );
      }

      /*
       * Robot must be IDLE
       */

      if (
        robot.status !== "IDLE"
      ) {
        throw ApiError.conflict(
          `Robot ${robotId} is currently ${robot.status}`
        );
      }

      /*
       * Battery check
       */

      if (
        Number(
          robot.battery ?? 0
        ) <= 15
      ) {
        throw ApiError.conflict(
          `Robot ${robotId} does not have enough battery`
        );
      }

      /*
       * Validate category
       */

      const validCategories = [
        "yellow",
        "red",
        "blue",
        "general",
      ];

      const normalizedCategory =
        String(
          expectedCategory
        ).toLowerCase();

      const category =
        validCategories.includes(
          normalizedCategory
        )
          ? normalizedCategory
          : "general";

      /*
       * Validate department
       */

      const normalizedDepartment =
        String(
          department || "OT"
        ).toUpperCase();

      const validDepartments = [
        "OT",
        "ICU",
        "WARD",
        "GENERAL",
      ];

      const finalDepartment =
        validDepartments.includes(
          normalizedDepartment
        )
          ? normalizedDepartment
          : "GENERAL";

      /*
       * Start simulation
       */

      const task =
        await startCollection({
          hospitalId:
            robot.hospitalId ??
            null,

          robotId:
            robot.robotId,

          department:
            finalDepartment,

          expectedCategory:
            category,

          confidence:
            Number(confidence) || 0,

          wasteId,

          requestedBy:
            null,
        });

      /*
       * Immediately notify frontend.
       *
       * The simulator will subsequently
       * send MOVING_TO_PICKUP and
       * position updates.
       */

      emitRobotStatus(
        robot.robotId,
        {
          status:
            "DISPATCHED",

          currentLocation:
            robot.currentLocation ||
            "Charging Station",

          targetLocation:
            finalDepartment,

          targetBin:
            category,

          lastActivity:
            `Dispatched to ${finalDepartment}`,
        }
      );

      /*
       * Response
       */

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
            category,

          wasteId,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| POST /api/v1/robots/:robotId/recall
|--------------------------------------------------------------------------
*/

export const recallRobot =
  asyncHandler(
    async (req, res) => {
      const { robotId } =
        req.params;

      const robot =
        await Robot.findOne({
          robotId,
        });

      if (!robot) {
        throw ApiError.notFound(
          `Robot ${robotId} not found`
        );
      }

      const result =
        await recallCollection(
          robotId
        );

      res.json({
        success: true,

        message:
          "Robot recalled",

        data: result,
      });
    }
  );

/*
|--------------------------------------------------------------------------
| POST /api/v1/robots/:robotId/stop
|--------------------------------------------------------------------------
*/

export const stopRobot =
  asyncHandler(
    async (req, res) => {
      const { robotId } =
        req.params;

      const robot =
        await Robot.findOne({
          robotId,
        });

      if (!robot) {
        throw ApiError.notFound(
          `Robot ${robotId} not found`
        );
      }

      const result =
        await stopCollection(
          robotId
        );

      /*
       * Socket notification
       */

      emitRobotStatus(
        robotId,
        {
          status:
            "STOPPED",

          reason:
            "Manual emergency stop",

          lastActivity:
            "Emergency stop activated",
        }
      );

      res.json({
        success: true,

        message:
          "Robot stopped",

        data: result,
      });
    }
  );

/*
|--------------------------------------------------------------------------
| POST /api/v1/robots/:robotId/clear-stop
|--------------------------------------------------------------------------
*/

export const clearRobotStop =
  asyncHandler(
    async (req, res) => {
      const { robotId } =
        req.params;

      const robot =
        await Robot.findOne({
          robotId,
        });

      if (!robot) {
        throw ApiError.notFound(
          `Robot ${robotId} not found`
        );
      }

      const result =
        await clearStopCollection(
          robotId
        );

      /*
       * Socket notification
       */

      emitRobotStatus(
        robotId,
        {
          status:
            "IDLE",

          currentLocation:
            "Charging Station",

          targetLocation:
            null,

          targetBin:
            null,

          lastActivity:
            "Stop cleared",
        }
      );

      res.json({
        success: true,

        message:
          "Robot stop cleared",

        data: result,
      });
    }
  );
