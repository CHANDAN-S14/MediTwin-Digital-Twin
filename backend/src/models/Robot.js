import mongoose from 'mongoose';

const robotSchema = new mongoose.Schema(
  {
    robotId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: false,
      default: null,
      index: true,
    },

    name: {
      type: String,
      default: 'MediTwin Robot',
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'IDLE',
        'DISPATCHED',
        'MOVING_TO_PICKUP',
        'ARRIVED_AT_PICKUP',
        'COLLECTING',
        'MOVING_TO_BIN',
        'DEPOSITING',
        'RETURNING',
        'CHARGING',
        'STOPPED',
      ],
      default: 'IDLE',
      index: true,
    },

    battery: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    load: {
      type: Number,
      min: 0,
      default: 0,
    },

    currentLocation: {
      type: String,
      default: 'Charging Station',
    },

    targetLocation: {
      type: String,
      default: null,
    },

    targetBin: {
      type: String,
      enum: ['yellow', 'red', 'blue', 'general', null],
      default: null,
    },

    // IMPORTANT:
    // Simulator uses TASK-xxxx IDs, so this must be String.
    currentTaskId: {
      type: String,
      default: null,
    },

    lastActivity: {
      type: String,
      default: 'Waiting for task',
    },

    position: {
      x: {
        type: Number,
        default: 0,
      },

      y: {
        type: Number,
        default: 0,
      },

      z: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Robot', robotSchema);
