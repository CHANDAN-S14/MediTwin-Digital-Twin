import Robot from '../models/Robot.js';

export const resetRobots = async () => {
  const result = await Robot.updateMany(
    {},
    {
      $set: {
        status: 'IDLE',
        battery: 100,
        load: 0,
        currentLocation: 'Charging Station',
        targetLocation: null,
        targetBin: null,
        currentTaskId: null,
        lastActivity: 'Waiting for task',
        position: {
          x: 0,
          y: 0,
          z: 0,
        },
      },
    }
  );

  console.log(`Reset ${result.modifiedCount} robots`);
};