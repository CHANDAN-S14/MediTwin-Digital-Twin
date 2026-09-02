import mongoose from 'mongoose';
import Robot from './models/Robot.js';
import env from './config/env.js';

const robots = [
  {
    robotId: 'MT-ROBOT-001',
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
      x: 0,
      y: 0,
      z: 0,
    },
  },

  {
    robotId: 'MT-ROBOT-002',
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
    robotId: 'MT-ROBOT-003',
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
      x: 0,
      y: 0,
      z: 0,
    },
  },
];

async function seedRobots() {
  try {
    await mongoose.connect(env.mongoUri);

    console.log('MongoDB connected');

    for (const robot of robots) {
      await Robot.findOneAndUpdate(
        {
          robotId: robot.robotId,
        },
        {
          $set: robot,
        },
        {
          upsert: true,
          new: true,
        }
      );
    }

    console.log('Robots seeded successfully');

    const allRobots = await Robot.find({}).lean();

    console.log(allRobots);

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Robot seed failed:', error);

    await mongoose.disconnect();

    process.exit(1);
  }
}

seedRobots();
