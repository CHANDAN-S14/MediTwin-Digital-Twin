import mongoose from 'mongoose';
import Robot from './src/models/Robot.js';
import dotenv from 'dotenv';

dotenv.config();

const seedRobots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const robots = [
      {
        robotId: 'MEDI-001',
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
        robotId: 'MEDI-002',
        name: 'MediTwin Robot 02',
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
      {
        robotId: 'MEDI-003',
        name: 'MediTwin Robot 03',
        status: 'IDLE',
        battery: 80,
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

    for (const robot of robots) {
      await Robot.findOneAndUpdate(
        { robotId: robot.robotId },
        robot,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log('Robots seeded successfully');

    const allRobots = await Robot.find({}).lean();

    console.log(
      allRobots.map((robot) => ({
        robotId: robot.robotId,
        status: robot.status,
        battery: robot.battery,
      }))
    );

    await mongoose.disconnect();

    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Seed error:', error);

    await mongoose.disconnect();

    process.exit(1);
  }
};

seedRobots();
