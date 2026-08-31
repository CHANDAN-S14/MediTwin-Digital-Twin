import Robot from '../models/Robot.js';

import {
  emitRobotStatus,
  emitRobotPosition,
  emitDigitalTwinUpdate,
  emitWasteCollected,
  emitWasteDeposited,
  emitTaskUpdated,
} from './socketService.js';

const activeCollections = new Map();

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

const getDepartmentPosition = (department = 'OT') => {
  return (
    ROBOT_PATHS[String(department).toUpperCase()] ??
    ROBOT_PATHS.GENERAL
  );
};

const getBinPosition = (category = 'general') => {
  return BIN_POSITIONS[category] ?? BIN_POSITIONS.general;
};

const moveRobot = async ({
  robotId,
  from,
  to,
  status,
  activity,
  duration = 4000,
}) => {
  const steps = 30;
  const stepDelay = Math.max(50, Math.floor(duration / steps));

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

  for (let i = 1; i <= steps; i += 1) {
    const progress = i / steps;

    const x = from.x + (to.x - from.x) * progress;
    const z = from.z + (to.z - from.z) * progress;

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          'position.x': x,
          'position.y': 0,
          'position.z': z,
        },
      }
    );

    emitRobotPosition(robotId, {
      x,
      y: 0,
      z,
    });

    emitDigitalTwinUpdate(robotId, {
      status,
      position: {
        x,
        y: 0,
        z,
      },
      currentLocation: activity,
      targetLocation: activity,
    });

    await sleep(stepDelay);
  }
};

export const startCollection = async ({
  hospitalId = null,
  robotId,
  department = 'OT',
  expectedCategory = 'general',
  confidence = 1,
  wasteId = null,
  requestedBy = null,
}) => {
  if (!robotId) {
    throw new Error('Robot ID is required');
  }

  if (activeCollections.has(robotId)) {
    throw new Error(
      `Robot ${robotId} already has an active collection`
    );
  }

  const robot = await Robot.findOne({ robotId });

  if (!robot) {
    throw new Error(`Robot ${robotId} not found`);
  }

  if (robot.status !== 'IDLE') {
    throw new Error(
      `Robot ${robotId} is currently ${robot.status}`
    );
  }

  if (Number(robot.battery ?? 0) <= 15) {
    throw new Error(
      `Robot ${robotId} does not have enough battery`
    );
  }

  const taskId = `TASK-${Date.now()}`;

  const task = {
    _id: taskId,
    taskId,
    robotId,
    hospitalId,
    department,
    expectedCategory,
    confidence,
    wasteId,
    status: 'ACTIVE',
    createdAt: new Date(),
    requestedBy,
  };

  activeCollections.set(robotId, {
    taskId,
    cancelled: false,
  });

  runCollection({
    robotId,
    department,
    expectedCategory,
    wasteId,
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
          status: 'IDLE',
          currentTaskId: null,
          targetLocation: null,
          targetBin: null,
          load: 0,
          lastActivity: 'Simulation error - returned to idle',
        },
      }
    );

    emitRobotStatus(robotId, {
      status: 'IDLE',
      lastActivity: 'Simulation error - returned to idle',
    });
  });

  return task;
};

const runCollection = async ({
  robotId,
  department,
  expectedCategory,
  wasteId,
  task,
}) => {
  const simulation = activeCollections.get(robotId);

  if (!simulation) return;

  try {
    const robot = await Robot.findOne({ robotId });

    const start = {
      x: robot?.position?.x ?? 0,
      z: robot?.position?.z ?? 0,
    };

    const pickup = getDepartmentPosition(department);
    const bin = getBinPosition(expectedCategory);

    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: 'DISPATCHED',
          currentTaskId: null,
          targetLocation: department,
          targetBin: expectedCategory,
          lastActivity: `Dispatched to ${department}`,
        },
      }
    );

    emitTaskUpdated({
      ...task,
      status: 'ACTIVE',
    });

    emitRobotStatus(robotId, {
      status: 'DISPATCHED',
      targetLocation: department,
      targetBin: expectedCategory,
      lastActivity: `Dispatched to ${department}`,
    });

    await sleep(1000);

    if (simulation.cancelled) return;

    // 1. Move to waste
    await moveRobot({
      robotId,
      from: start,
      to: pickup,
      status: 'MOVING_TO_PICKUP',
      activity: `Moving to ${department}`,
      duration: 5000,
    });

    if (simulation.cancelled) return;

    // 2. Arrive
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: 'ARRIVED_AT_PICKUP',
          currentLocation: department,
          lastActivity: `Arrived at ${department}`,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: 'ARRIVED_AT_PICKUP',
      currentLocation: department,
      lastActivity: `Arrived at ${department}`,
    });

    await sleep(1500);

    if (simulation.cancelled) return;

    // 3. Collect
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: 'COLLECTING',
          load: 1,
          lastActivity: 'Collecting biomedical waste',
        },
      }
    );

    emitRobotStatus(robotId, {
      status: 'COLLECTING',
      load: 1,
      lastActivity: 'Collecting biomedical waste',
    });

    await sleep(2500);

    emitWasteCollected({
      robotId,
      wasteId,
      category: expectedCategory,
      department,
    });

    if (simulation.cancelled) return;

    // 4. Move to bin
    const afterPickup = {
      x: pickup.x,
      z: pickup.z,
    };

    await moveRobot({
      robotId,
      from: afterPickup,
      to: bin,
      status: 'MOVING_TO_BIN',
      activity: `Moving to ${expectedCategory} bin`,
      duration: 5000,
    });

    if (simulation.cancelled) return;

    // 5. Deposit
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: 'DEPOSITING',
          currentLocation: `${expectedCategory} bin`,
          targetBin: expectedCategory,
          lastActivity: `Depositing waste into ${expectedCategory} bin`,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: 'DEPOSITING',
      currentLocation: `${expectedCategory} bin`,
      targetBin: expectedCategory,
      lastActivity: `Depositing waste into ${expectedCategory} bin`,
    });

    await sleep(2500);

    emitWasteDeposited({
      robotId,
      wasteId,
      category: expectedCategory,
      bin: expectedCategory,
    });

    // 6. Empty robot
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          load: 0,
          lastActivity: 'Waste deposited successfully',
        },
      }
    );

    if (simulation.cancelled) return;

    // 7. Return
    await moveRobot({
      robotId,
      from: bin,
      to: {
        x: 0,
        z: 0,
      },
      status: 'RETURNING',
      activity: 'Returning to charging station',
      duration: 5000,
    });

    if (simulation.cancelled) return;

    // 8. Finished
    await Robot.findOneAndUpdate(
      { robotId },
      {
        $set: {
          status: 'IDLE',
          currentLocation: 'Charging Station',
          targetLocation: null,
          targetBin: null,
          currentTaskId: null,
          load: 0,
          lastActivity: 'Collection completed',
          'position.x': 0,
          'position.y': 0,
          'position.z': 0,
        },
      }
    );

    emitRobotStatus(robotId, {
      status: 'IDLE',
      currentLocation: 'Charging Station',
      targetLocation: null,
      targetBin: null,
      load: 0,
      lastActivity: 'Collection completed',
    });

    emitDigitalTwinUpdate(robotId, {
      status: 'IDLE',
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      lastActivity: 'Collection completed',
    });

    emitTaskUpdated({
      ...task,
      status: 'COMPLETED',
    });
  } finally {
    activeCollections.delete(robotId);
  }
};

export const stopCollection = async (robotId) => {
  const simulation = activeCollections.get(robotId);

  if (!simulation) {
    throw new Error(`Robot ${robotId} has no active collection`);
  }

  simulation.cancelled = true;

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        status: 'STOPPED',
        lastActivity: 'Emergency stop activated',
      },
    }
  );

  emitRobotStatus(robotId, {
    status: 'STOPPED',
    lastActivity: 'Emergency stop activated',
  });

  return {
    robotId,
    status: 'STOPPED',
  };
};

export const clearStopCollection = async (robotId) => {
  activeCollections.delete(robotId);

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        status: 'IDLE',
        currentTaskId: null,
        targetLocation: null,
        targetBin: null,
        load: 0,
        currentLocation: 'Charging Station',
        lastActivity: 'Stop cleared',
        'position.x': 0,
        'position.y': 0,
        'position.z': 0,
      },
    }
  );

  emitRobotStatus(robotId, {
    status: 'IDLE',
    currentLocation: 'Charging Station',
    lastActivity: 'Stop cleared',
  });

  return {
    robotId,
    status: 'IDLE',
  };
};

export const recallCollection = async (robotId) => {
  const simulation = activeCollections.get(robotId);

  if (simulation) {
    simulation.cancelled = true;
  }

  await Robot.findOneAndUpdate(
    { robotId },
    {
      $set: {
        status: 'RETURNING',
        targetLocation: 'Charging Station',
        lastActivity: 'Returning to charging station',
      },
    }
  );

  emitRobotStatus(robotId, {
    status: 'RETURNING',
    targetLocation: 'Charging Station',
    lastActivity: 'Returning to charging station',
  });

  return {
    robotId,
    status: 'RETURNING',
  };
};

export const runningCount = () => {
  return activeCollections.size;
};

export const stopAll = async () => {
  for (const simulation of activeCollections.values()) {
    simulation.cancelled = true;
  }

  activeCollections.clear();

  await Robot.updateMany(
    {
      status: {
        $in: [
          'DISPATCHED',
          'MOVING_TO_PICKUP',
          'ARRIVED_AT_PICKUP',
          'COLLECTING',
          'MOVING_TO_BIN',
          'DEPOSITING',
          'RETURNING',
        ],
      },
    },
    {
      $set: {
        status: 'IDLE',
        currentTaskId: null,
        targetLocation: null,
        targetBin: null,
        load: 0,
        currentLocation: 'Charging Station',
        lastActivity: 'Simulator stopped',
        'position.x': 0,
        'position.y': 0,
        'position.z': 0,
      },
    }
  );
};

export default {
  startCollection,
  stopCollection,
  clearStopCollection,
  recallCollection,
  runningCount,
  stopAll,
};