import mongoose from "mongoose";

import Robot from "../models/Robot.js";
import Waste from "../models/Waste.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import {
  startCollection,
  recallCollection,
  stopCollection,
  clearStopCollection,
} from "../services/robotSimulator.js";

import {
  emitRobotStatus,
  emitToHospital,
  EVENTS,
} from "../services/socketService.js";


/*
|--------------------------------------------------------------------------
| DEFAULT DEMO HOSPITAL
|--------------------------------------------------------------------------
*/

const DEFAULT_HOSPITAL_ID =
  "DEFAULT_HOSPITAL";


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const normalizeCategory = (
  category
) => {
  const value = String(
    category || "general"
  )
    .trim()
    .toLowerCase();

  if (
    value.includes("yellow")
  ) {
    return "yellow";
  }

  if (
    value.includes("red")
  ) {
    return "red";
  }

  if (
    value.includes("blue")
  ) {
    return "blue";
  }

  return "general";
};


const normalizeDepartment = (
  department
) => {
  const value = String(
    department || "GENERAL"
  )
    .trim()
    .toUpperCase();

  const validDepartments = [
    "OT",
    "ICU",
    "WARD",
    "GENERAL",
    "EMERGENCY",
    "PHARMACY",
    "LABORATORY",
  ];

  return validDepartments.includes(
    value
  )
    ? value
    : "GENERAL";
};


/*
|--------------------------------------------------------------------------
| GET ROBOTS
|--------------------------------------------------------------------------
*/

export const listRobots =
  asyncHandler(
    async (_req, res) => {
      const robots =
        await Robot.find({})
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
| GET SINGLE ROBOT
|--------------------------------------------------------------------------
*/

export const getRobot =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

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
| GET ROBOT TELEMETRY
|--------------------------------------------------------------------------
*/

export const getTelemetry =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

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
| DISPATCH ROBOT
|--------------------------------------------------------------------------
|
| POST
| /api/v1/robots/:robotId/dispatch
|
|--------------------------------------------------------------------------
*/

export const dispatchRobot =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

      const {
        department = "OT",

        expectedCategory =
          "general",

        confidence = 1,

        wasteId = null,

        weight = 0,

        itemType =
          "Biomedical Waste",
      } = req.body || {};


      console.log(
        "🚀 Dispatch request:",
        {
          robotId,
          department,
          expectedCategory,
          confidence,
          wasteId,
          weight,
        }
      );


      /*
      |--------------------------------------------------------------------------
      | FIND ROBOT
      |--------------------------------------------------------------------------
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
      |--------------------------------------------------------------------------
      | ROBOT MUST BE IDLE
      |--------------------------------------------------------------------------
      */

      if (
        robot.status !==
        "IDLE"
      ) {
        throw ApiError.conflict(
          `Robot ${robotId} is currently ${robot.status}`
        );
      }


      /*
      |--------------------------------------------------------------------------
      | BATTERY
      |--------------------------------------------------------------------------
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
      |--------------------------------------------------------------------------
      | NORMALIZE DATA
      |--------------------------------------------------------------------------
      */

      const category =
        normalizeCategory(
          expectedCategory
        );

      const finalDepartment =
        normalizeDepartment(
          department
        );

      const numericConfidence =
        Math.min(
          1,
          Math.max(
            0,
            Number(
              confidence
            ) || 0
          )
        );

      const numericWeight =
        Math.max(
          0,
          Number(weight) || 0
        );


      /*
      |--------------------------------------------------------------------------
      | START ROBOT COLLECTION
      |--------------------------------------------------------------------------
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
            numericConfidence,

          wasteId,

          requestedBy:
            null,
        });


      /*
      |--------------------------------------------------------------------------
      | GET TASK OBJECT ID
      |--------------------------------------------------------------------------
      |
      | startCollection may return:
      |
      | task._id
      | task.task._id
      | task.data._id
      |
      */

      const taskObjectId =
        task?._id ||
        task?.task?._id ||
        task?.data?._id ||
        null;


      /*
      |--------------------------------------------------------------------------
      | FIND WASTE RECORD
      |--------------------------------------------------------------------------
      */

      let waste = null;

      if (wasteId) {
        const wasteFilter = {
          $or: [
            {
              wasteId:
                String(
                  wasteId
                ).toUpperCase(),
            },
          ],
        };

        if (
          mongoose.Types.ObjectId.isValid(
            wasteId
          )
        ) {
          wasteFilter.$or.push({
            _id: wasteId,
          });
        }

        waste =
          await Waste.findOne(
            wasteFilter
          );
      }


      /*
      |--------------------------------------------------------------------------
      | CREATE WASTE RECORD IF NOT FOUND
      |--------------------------------------------------------------------------
      |
      | This makes the demo robust even when
      | Scanner sends no persisted waste record.
      |
      */

      if (!waste) {
        const count =
          await Waste.countDocuments();

        const generatedWasteId =
          wasteId
            ? String(
                wasteId
              ).toUpperCase()
            : `MW-${String(
                count + 1
              ).padStart(
                4,
                "0"
              )}`;

        const wasteData = {
          wasteId:
            generatedWasteId,

          category,

          originalCategory:
            category,

          itemType,

          weight:
            numericWeight,

          sourceLocation:
            finalDepartment,

          robotId:
            String(
              robot.robotId
            ).toUpperCase(),

          status:
            "dispatched",

          confidence:
            numericConfidence,

          reviewedByHuman:
            true,
        };

        if (
          taskObjectId &&
          mongoose.Types.ObjectId.isValid(
            taskObjectId
          )
        ) {
          wasteData.taskId =
            taskObjectId;
        }

        if (
          mongoose.Types.ObjectId.isValid(
            robot.hospitalId
          )
        ) {
          wasteData.hospitalId =
            robot.hospitalId;
        }

        waste =
          await Waste.create(
            wasteData
          );

        console.log(
          "🆕 Waste record created during dispatch:",
          waste.wasteId
        );
      }


      /*
      |--------------------------------------------------------------------------
      | UPDATE EXISTING WASTE RECORD
      |--------------------------------------------------------------------------
      */

      else {
        waste.robotId =
          String(
            robot.robotId
          ).toUpperCase();

        waste.sourceLocation =
          finalDepartment;

        waste.category =
          category;

        waste.confidence =
          numericConfidence;

        waste.status =
          "dispatched";

        if (
          taskObjectId &&
          mongoose.Types.ObjectId.isValid(
            taskObjectId
          )
        ) {
          waste.taskId =
            taskObjectId;
        }

        /*
         * The human already confirmed
         * the classification before dispatch.
         */

        waste.reviewedByHuman =
          true;

        await waste.save();

        console.log(
          "♻️ Waste record updated:",
          {
            wasteId:
              waste.wasteId,

            robotId:
              waste.robotId,

            department:
              waste.sourceLocation,

            taskId:
              waste.taskId,

            status:
              waste.status,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | ROBOT STATUS SOCKET
      |--------------------------------------------------------------------------
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

          currentTaskId:
            taskObjectId,

          wasteId:
            waste.wasteId,

          lastActivity:
            `Dispatched to ${finalDepartment}`,
        }
      );


      /*
      |--------------------------------------------------------------------------
      | WASTE SOCKET
      |--------------------------------------------------------------------------
      */

      try {
        const hospitalId =
          robot.hospitalId ||
          DEFAULT_HOSPITAL_ID;

        emitToHospital(
          hospitalId,
          EVENTS.WASTE_COLLECTED,
          waste.toJSON()
        );
      } catch (socketError) {
        console.warn(
          "Waste dispatch socket skipped:",
          socketError?.message ||
            socketError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.status(201).json({
        success: true,

        message:
          `Robot ${robot.robotId} collection started`,

        data: {
          task,

          waste,

          wasteId:
            waste.wasteId,

          robotId:
            robot.robotId,

          department:
            finalDepartment,

          expectedCategory:
            category,

          confidence:
            numericConfidence,
        },
      });
    }
  );


/*
|--------------------------------------------------------------------------
| RECALL ROBOT
|--------------------------------------------------------------------------
*/

export const recallRobot =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

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
| STOP ROBOT
|--------------------------------------------------------------------------
*/

export const stopRobot =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

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
| CLEAR ROBOT STOP
|--------------------------------------------------------------------------
*/

export const clearRobotStop =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
      } = req.params;

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
