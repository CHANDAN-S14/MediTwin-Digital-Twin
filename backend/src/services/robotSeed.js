import Robot from '../models/Robot.js';

export const seedDemoRobots = async () => {
  const demoRobots = [
    {
      robotId: 'MB-01',
      name: 'MediTwin Robot 01',
      status: 'IDLE',
      battery: 100,
      load: 0,
      currentLocation: 'Charging Station',
      targetLocation: null,
      targetBin: null,
      currentTaskId: null,
      lastActivity: 'Waiting for task',
      position: {
        x: -6,
        y: 0,
        z: 0,
      },
    },
    {
      robotId: 'MB-02',
      name: 'MediTwin Robot 02',
      status: 'IDLE',
      battery: 95,
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
    {
      robotId: 'MB-03',
      name: 'MediTwin Robot 03',
      status: 'IDLE',
      battery: 90,
      load: 0,
      currentLocation: 'Charging Station',
      targetLocation: null,
      targetBin: null,
      currentTaskId: null,
      lastActivity: 'Waiting for task',
      position: {
        x: 6,
        y: 0,
        z: 0,
      },
    },
  ];

  for (const robotData of demoRobots) {
    await Robot.findOneAndUpdate(
      { robotId: robotData.robotId },
      {
        $setOnInsert: robotData,
      },
      {
        upsert: true,
        new: true,
      }
    );
  }

  console.log('Demo robots ready: MB-01, MB-02, MB-03');
};