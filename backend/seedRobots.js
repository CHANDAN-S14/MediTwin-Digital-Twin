import mongoose from "mongoose";
import Robot from "./models/Robot.js";
import env from "./config/env.js";

const robots = [
  {
    robotId: "ROBOT-001",
    name: "MediTwin Robot 01",
    status: "IDLE",
    battery: 95,
    load: 0,
    currentLocation: "Charging Station",
    targetLocation: null,
    targetBin: null,
    currentTaskId: null,
    lastActivity: "Waiting for task",
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  {
    robotId: "ROBOT-002",
    name: "MediTwin Robot 02",
    status: "IDLE",
    battery: 85,
    load: 0,
    currentLocation: "Charging Station",
    targetLocation: null,
    targetBin: null,
    currentTaskId: null,
    lastActivity: "Waiting for task",
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  {
    robotId: "ROBOT-003",
    name: "MediTwin Robot 03",
    status: "IDLE",
    battery: 72,
    load: 0,
    currentLocation: "Charging Station",
    targetLocation: null,
    targetBin: null,
    currentTaskId: null,
    lastActivity: "Waiting for task",
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
];

const seedRobots = async () => {
  try {
    await mongoose.connect(env.mongoUri);

    console.log("MongoDB connected");

    await Robot.deleteMany({});

    await Robot.insertMany(robots);

    console.log("Robots created successfully");

    const saved = await Robot.find({}).lean();

    console.log(saved);

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("Robot seed failed:", error);

    await mongoose.disconnect();

    process.exit(1);
  }
};

seedRobots();
