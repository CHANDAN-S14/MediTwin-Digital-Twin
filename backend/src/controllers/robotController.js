import Robot from "../models/Robot.js";

import {
  emitRobotStatus,
  emitRobotPosition,
  emitDigitalTwinUpdate,
  emitWasteCollected,
  emitWasteDeposited,
  emitTaskUpdated,
} from "./socketService.js";

const activeCollections = new Map();

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/*
|--------------------------------------------------------------------------
| Department positions
|--------------------------------------------------------------------------
*/

const ROBOT_PATHS = {
  OT: {
    x: -7,
    z: 3,
  },

  ICU: {
    x: -6,
    z: -4,
  },

  WARD: {
    x: 7,
    z: -3,
  },

  GENERAL: {
    x: 0,
    z: 7,
  },
};

/*
|--------------------------------------------------------------------------
| Waste bin positions
|--------------------------------------------------------------------------
*/

const BIN_POSITIONS = {
  yellow: {
    x: -7,
    z: -7,
  },

  red: {
    x: 0,
    z: -7,
  },

  blue: {
    x: 7,
    z: -7,
  },

  general: {
    x: 7,
    z: 7,
  },
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getDepartmentPosition = (department = "OT") => {
  return (
    ROBOT_PATHS[String(department).toUpperCase()] ??
    ROBOT_PATHS.GENERAL
  );
};

const getBinPosition = (category = "general") => {
  return (
    BIN_POSITIONS[String(category).toLowerCase()] ??
    BIN_POSITIONS.general
  );
};

/*
|--------------------------------------------------------------------------
| Move robot
|--------------------------------------------------------------------------
|
| This is the actual digital-twin movement loop.
| Every step:
|
| 1. Updates MongoDB
| 2. Emits robot:position
| 3. Emits digitalTwin:update
|
*/

const moveRobot = async ({
  robotId,
  from,
  to,
  status,
  activity,
  duration = 5000,
}) => {
  const steps = 30;

  const stepDelay = Math.max(
    50,
    Math.floor(duration / steps)
  );

  /*
  |----------------------------------------------------------------------
  | Update initial movement state
  |----------------------------------------------------------------------
  */

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        status,
        currentLocation: activity,
        targetLocation: activity,
        lastActivity: activity,
      },
    }
  );

  emitRobotStatus(robotId, {
    status,
    currentLocation: activity,
    targetLocation: activity,
    lastActivity: activity,
  });

  /*
  |----------------------------------------------------------------------
  | Move
  |----------------------------------------------------------------------
  */

  for (let i = 1; i <= steps; i += 1) {
    const simulation = activeCollections.get(robotId);

    /*
     * Stop movement immediately when cancelled.
     */
    if (!simulation || simulation.cancelled) {
      return false;
    }

    const progress = i / steps;

    const x =
      from.x +
      (to.x - from.x) * progress;

    const z =
      from.z +
      (to.z - from.z) * progress;

    /*
     * Save position to MongoDB
     */
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          "position.x": x,
          "position.y": 0,
          "position.z": z,
        },
      }
    );

    /*
     * Send position to frontend
     */
    emitRobotPosition(robotId, {
      x,
      y: 0,
      z,
    });

    /*
     * Send complete digital twin update
     */
    emitDigitalTwinUpdate(robotId, {
      status,
      position: {
        x,
        y: 0,
        z,
      },
      currentLocation: activity,
      targetLocation: activity,
      lastActivity: activity,
    });

    await sleep(stepDelay);
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| START COLLECTION
|--------------------------------------------------------------------------
*/

export const startCollection = async ({
  hospitalId = null,
  robotId,
  department = "OT",
  expectedCategory = "general",
  confidence = 1,
  wasteId = null,
  requestedBy = null,
}) => {
  if (!robotId) {
    throw new Error("Robot ID is required");
  }

  /*
   * Prevent duplicate tasks.
   */

  if (activeCollections.has(robotId)) {
    throw new Error(
      `Robot ${robotId} already has an active collection`
    );
  }

  /*
   * Find robot
   */

  const robot = await Robot.findOne({
    robotId,
  });

  if (!robot) {
    throw new Error(
      `Robot ${robotId} not found`
    );
  }

  /*
   * Robot must be idle
   */

  if (robot.status !== "IDLE") {
    throw new Error(
      `Robot ${robotId} is currently ${robot.status}`
    );
  }

  /*
   * Battery check
   */

  if (Number(robot.battery ?? 0) <= 15) {
    throw new Error(
      `Robot ${robotId} does not have enough battery`
    );
  }

  /*
   * Valid categories
   */

  const validCategories = [
    "yellow",
    "red",
    "blue",
    "general",
  ];

  const category =
    validCategories.includes(
      String(expectedCategory).toLowerCase()
    )
      ? String(expectedCategory).toLowerCase()
      : "general";

  /*
   * Create task
   */

  const taskId = `TASK-${Date.now()}`;

  const task = {
    _id: taskId,
    taskId,
    robotId,
    hospitalId,
    department:
      department || "OT",
    expectedCategory: category,
    confidence,
    wasteId,
    status: "ACTIVE",
    createdAt: new Date(),
    requestedBy,
  };

  /*
   * Register active simulation
   */

  activeCollections.set(robotId, {
    taskId,
    cancelled: false,
  });

  /*
   * Run simulation asynchronously.
   *
   * IMPORTANT:
   * We don't await this here.
   * The API can immediately return 201.
   */

  runCollection({
    robotId,
    department: department || "OT",
    expectedCategory: category,
    wasteId,
    hospitalId,
    task,
  }).catch(async (error) => {
    console.error(
      `Robot simulation error for ${robotId}:`,
      error
    );

    activeCollections.delete(robotId);

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "IDLE",
          currentTaskId: null,
          targetLocation: null,
          targetBin: null,
          load: 0,
          lastActivity:
            "Simulation error - returned to idle",
        },
      }
    );

    emitRobotStatus(robotId, {
      status: "IDLE",
      currentLocation: "Charging Station",
      targetLocation: null,
      targetBin: null,
      load: 0,
      lastActivity:
        "Simulation error - returned to idle",
    });
  });

  return task;
};

/*
|--------------------------------------------------------------------------
| RUN COLLECTION
|--------------------------------------------------------------------------
*/

const runCollection = async ({
  robotId,
  department,
  expectedCategory,
  wasteId,
  hospitalId,
  task,
}) => {
  const simulation =
    activeCollections.get(robotId);

  if (!simulation) {
    return;
  }

  try {
    /*
     * Get robot's current position
     */

    const robot = await Robot.findOne({
      robotId,
    });

    if (!robot) {
      throw new Error(
        `Robot ${robotId} not found`
      );
    }

    const start = {
      x: Number(robot.position?.x) || 0,
      z: Number(robot.position?.z) || 0,
    };

    /*
     * Get target positions
     */

    const pickup =
      getDepartmentPosition(department);

    const bin =
      getBinPosition(expectedCategory);

    /*
     * Mark robot dispatched
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "DISPATCHED",
          currentTaskId: task.taskId,
          targetLocation: department,
          targetBin: expectedCategory,
          lastActivity:
            `Dispatched to ${department}`,
        },
      }
    );

    emitTaskUpdated({
      ...task,
      status: "ACTIVE",
    });

    emitRobotStatus(robotId, {
      status: "DISPATCHED",
      currentLocation:
        "Charging Station",
      targetLocation: department,
      targetBin: expectedCategory,
      lastActivity:
        `Dispatched to ${department}`,
    });

    emitDigitalTwinUpdate(robotId, {
      status: "DISPATCHED",
      position: {
        x: start.x,
        y: 0,
        z: start.z,
      },
      currentLocation:
        "Charging Station",
      targetLocation: department,
      targetBin: expectedCategory,
    });

    await sleep(1000);

    /*
     * Check cancellation
     */

    if (
      activeCollections.get(robotId)?.cancelled
    ) {
      return;
    }

    /*
     * ============================================================
     * 1. MOVE TO PICKUP
     * ============================================================
     */

    const movedToPickup =
      await moveRobot({
        robotId,

        from: start,

        to: pickup,

        status: "MOVING_TO_PICKUP",

        activity:
          `Moving to ${department}`,

        duration: 5000,
      });

    if (!movedToPickup) {
      return;
    }

    /*
     * ============================================================
     * 2. ARRIVE AT PICKUP
     * ============================================================
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "ARRIVED_AT_PICKUP",
          currentLocation: department,
          targetLocation: department,
          lastActivity:
            `Arrived at ${department}`,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: "ARRIVED_AT_PICKUP",
      currentLocation: department,
      targetLocation: department,
      targetBin: expectedCategory,
      lastActivity:
        `Arrived at ${department}`,
    });

    emitDigitalTwinUpdate(robotId, {
      status: "ARRIVED_AT_PICKUP",
      position: {
        x: pickup.x,
        y: 0,
        z: pickup.z,
      },
      currentLocation: department,
      targetLocation: department,
      targetBin: expectedCategory,
    });

    await sleep(1500);

    if (
      activeCollections.get(robotId)?.cancelled
    ) {
      return;
    }

    /*
     * ============================================================
     * 3. COLLECT WASTE
     * ============================================================
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "COLLECTING",
          load: 1,
          currentLocation: department,
          lastActivity:
            "Collecting biomedical waste",
        },
      }
    );

    emitRobotStatus(robotId, {
      status: "COLLECTING",
      currentLocation: department,
      load: 1,
      targetBin: expectedCategory,
      lastActivity:
        "Collecting biomedical waste",
    });

    emitDigitalTwinUpdate(robotId, {
      status: "COLLECTING",
      position: {
        x: pickup.x,
        y: 0,
        z: pickup.z,
      },
      currentLocation: department,
      targetLocation:
        `${expectedCategory} bin`,
      targetBin: expectedCategory,
      load: 1,
    });

    await sleep(2500);

    if (
      activeCollections.get(robotId)?.cancelled
    ) {
      return;
    }

    /*
     * Notify frontend
     */

    emitWasteCollected({
      robotId,
      hospitalId,
      wasteId,
      category: expectedCategory,
      department,
    });

    /*
     * ============================================================
     * 4. MOVE TO BIN
     * ============================================================
     */

    const movedToBin =
      await moveRobot({
        robotId,

        from: {
          x: pickup.x,
          z: pickup.z,
        },

        to: bin,

        status: "MOVING_TO_BIN",

        activity:
          `Moving to ${expectedCategory} bin`,

        duration: 5000,
      });

    if (!movedToBin) {
      return;
    }

    /*
     * ============================================================
     * 5. DEPOSIT
     * ============================================================
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "DEPOSITING",

          currentLocation:
            `${expectedCategory} bin`,

          targetLocation:
            `${expectedCategory} bin`,

          targetBin:
            expectedCategory,

          lastActivity:
            `Depositing waste into ${expectedCategory} bin`,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: "DEPOSITING",

      currentLocation:
        `${expectedCategory} bin`,

      targetLocation:
        `${expectedCategory} bin`,

      targetBin:
        expectedCategory,

      load: 1,

      lastActivity:
        `Depositing waste into ${expectedCategory} bin`,
    });

    emitDigitalTwinUpdate(robotId, {
      status: "DEPOSITING",

      position: {
        x: bin.x,
        y: 0,
        z: bin.z,
      },

      currentLocation:
        `${expectedCategory} bin`,

      targetLocation:
        `${expectedCategory} bin`,

      targetBin:
        expectedCategory,

      load: 1,
    });

    await sleep(2500);

    if (
      activeCollections.get(robotId)?.cancelled
    ) {
      return;
    }

    /*
     * Notify frontend
     */

    emitWasteDeposited({
      robotId,
      hospitalId,
      wasteId,
      category: expectedCategory,
      bin: expectedCategory,
    });

    /*
     * ============================================================
     * 6. EMPTY ROBOT
     * ============================================================
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          load: 0,
          lastActivity:
            "Waste deposited successfully",
        },
      }
    );

    /*
     * ============================================================
     * 7. RETURN TO CHARGING STATION
     * ============================================================
     */

    const returned =
      await moveRobot({
        robotId,

        from: {
          x: bin.x,
          z: bin.z,
        },

        to: {
          x: 0,
          z: 0,
        },

        status: "RETURNING",

        activity:
          "Returning to charging station",

        duration: 5000,
      });

    if (!returned) {
      return;
    }

    /*
     * ============================================================
     * 8. COMPLETE
     * ============================================================
     */

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: "IDLE",

          currentLocation:
            "Charging Station",

          targetLocation: null,

          targetBin: null,

          currentTaskId: null,

          load: 0,

          lastActivity:
            "Collection completed",

          "position.x": 0,
          "position.y": 0,
          "position.z": 0,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: "IDLE",

      currentLocation:
        "Charging Station",

      targetLocation: null,

      targetBin: null,

      load: 0,

      lastActivity:
        "Collection completed",
    });

    emitDigitalTwinUpdate(robotId, {
      status: "IDLE",

      position: {
        x: 0,
        y: 0,
        z: 0,
      },

      currentLocation:
        "Charging Station",

      targetLocation: null,

      targetBin: null,

      load: 0,

      lastActivity:
        "Collection completed",
    });

    emitTaskUpdated({
      ...task,
      status: "COMPLETED",
    });
  } finally {
    activeCollections.delete(robotId);
  }
};

/*
|--------------------------------------------------------------------------
| STOP COLLECTION
|--------------------------------------------------------------------------
*/

export const stopCollection = async (
  robotId
) => {
  const simulation =
    activeCollections.get(robotId);

  if (!simulation) {
    throw new Error(
      `Robot ${robotId} has no active collection`
    );
  }

  /*
   * Tell movement loop to stop.
   */

  simulation.cancelled = true;

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        status: "STOPPED",
        lastActivity:
          "Emergency stop activated",
      },
    }
  );

  emitRobotStatus(robotId, {
    status: "STOPPED",
    lastActivity:
      "Emergency stop activated",
  });

  emitDigitalTwinUpdate(robotId, {
    status: "STOPPED",
    lastActivity:
      "Emergency stop activated",
  });

  return {
    robotId,
    status: "STOPPED",
  };
};

/*
|--------------------------------------------------------------------------
| CLEAR STOP
|--------------------------------------------------------------------------
*/

export const clearStopCollection = async (
  robotId
) => {
  /*
   * Remove old simulation.
   */

  activeCollections.delete(robotId);

  const robot =
    await Robot.findOneAndUpdate(
      { robotId },

      {
        $set: {
          status: "IDLE",

          currentTaskId: null,

          targetLocation: null,

          targetBin: null,

          load: 0,

          currentLocation:
            "Charging Station",

          lastActivity:
            "Stop cleared",

          "position.x": 0,
          "position.y": 0,
          "position.z": 0,
        },
      },

      {
        new: true,
      }
    );

  if (!robot) {
    throw new Error(
      `Robot ${robotId} not found`
    );
  }

  emitRobotStatus(robotId, {
    status: "IDLE",

    currentLocation:
      "Charging Station",

    targetLocation: null,

    targetBin: null,

    load: 0,

    lastActivity:
      "Stop cleared",
  });

  emitDigitalTwinUpdate(robotId, {
    status: "IDLE",

    position: {
      x: 0,
      y: 0,
      z: 0,
    },

    currentLocation:
      "Charging Station",

    targetLocation: null,

    targetBin: null,

    load: 0,

    lastActivity:
      "Stop cleared",
  });

  return {
    robotId,
    status: "IDLE",
  };
};

/*
|--------------------------------------------------------------------------
| RECALL
|--------------------------------------------------------------------------
*/

export const recallCollection = async (
  robotId
) => {
  const simulation =
    activeCollections.get(robotId);

  if (simulation) {
    simulation.cancelled = true;
  }

  const robot =
    await Robot.findOne({
      robotId,
    });

  if (!robot) {
    throw new Error(
      `Robot ${robotId} not found`
    );
  }

  /*
   * IMPORTANT:
   * This immediately changes the state.
   *
   * A separate return simulation can be
   * implemented later if required.
   */

  await Robot.findOneAndUpdate(
    { robotId },

    {
      $set: {
        status: "RETURNING",

        targetLocation:
          "Charging Station",

        lastActivity:
          "Returning to charging station",
      },
    }
  );

  emitRobotStatus(robotId, {
    status: "RETURNING",

    targetLocation:
      "Charging Station",

    lastActivity:
      "Returning to charging station",
  });

  emitDigitalTwinUpdate(robotId, {
    status: "RETURNING",

    targetLocation:
      "Charging Station",

    lastActivity:
      "Returning to charging station",
  });

  return {
    robotId,
    status: "RETURNING",
  };
};

/*
|--------------------------------------------------------------------------
| RUNNING COUNT
|--------------------------------------------------------------------------
*/

export const runningCount = () => {
  return activeCollections.size;
};

/*
|--------------------------------------------------------------------------
| STOP ALL
|--------------------------------------------------------------------------
*/

export const stopAll = async () => {
  /*
   * Cancel simulations.
   */

  for (
    const simulation
    of activeCollections.values()
  ) {
    simulation.cancelled = true;
  }

  activeCollections.clear();

  /*
   * Reset all active robots.
   */

  await Robot.updateMany(
    {
      status: {
        $in: [
          "DISPATCHED",
          "MOVING_TO_PICKUP",
          "ARRIVED_AT_PICKUP",
          "COLLECTING",
          "MOVING_TO_BIN",
          "DEPOSITING",
          "RETURNING",
        ],
      },
    },

    {
      $set: {
        status: "IDLE",

        currentTaskId: null,

        targetLocation: null,

        targetBin: null,

        load: 0,

        currentLocation:
          "Charging Station",

        lastActivity:
          "Simulator stopped",

        "position.x": 0,
        "position.y": 0,
        "position.z": 0,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  startCollection,
  stopCollection,
  clearStopCollection,
  recallCollection,
  runningCount,
  stopAll,
};
