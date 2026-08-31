import mongoose from 'mongoose';
import { TASK_STATUSES, ROBOT_STATES } from './constants.js';

/** A single entry in the robot's state history — the audit trail of one run. */
const transitionSchema = new mongoose.Schema(
  {
    state: { type: String, enum: ROBOT_STATES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    hospitalId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Hospital',
  required: false,
  default: null,
  index: true,
},
    robotId: { type: String, required: true, uppercase: true, trim: true, index: true },
    source: { type: String, required: true, trim: true },
    destination: { type: String, default: 'Waste Station', trim: true },
    priority: { type: String, enum: ['normal', 'high', 'critical'], default: 'normal' },
    status: { type: String, enum: TASK_STATUSES, default: 'queued', index: true },
    /** Grid cells produced by the A* planner, walked in order. */
    route: { type: [[Number]], default: [] },
    /** Index of the cell the robot is currently heading toward. */
    routeCursor: { type: Number, default: 0 },
    expectedCategory: { type: String, default: null },
    wasteIds: { type: [String], default: [] },
    transitions: { type: [transitionSchema], default: [] },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ hospitalId: 1, createdAt: -1 });

taskSchema.virtual('durationSeconds').get(function () {
  if (!this.startedAt) return null;
  const end = this.completedAt || new Date();
  return Math.round((end - this.startedAt) / 1000);
});

taskSchema.methods.recordTransition = function (state, note) {
  this.transitions.push({ state, at: new Date(), note });
  return this;
};

taskSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Task', taskSchema);
