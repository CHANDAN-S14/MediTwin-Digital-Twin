import mongoose from 'mongoose';
import {
  WASTE_CATEGORIES,
  COMPARTMENT_STATUSES,
  NEARLY_FULL_THRESHOLD,
  FULL_THRESHOLD,
} from './constants.js';

const compartmentSchema = new mongoose.Schema(
  {
    compartmentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    robotId: { type: String, required: true, uppercase: true, trim: true, index: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    category: { type: String, enum: WASTE_CATEGORIES, required: true },
    /** Kilograms the compartment is rated for. */
    capacity: { type: Number, required: true, min: 0.1 },
    currentLoad: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: COMPARTMENT_STATUSES, default: 'available' },
    lastEmptiedAt: { type: Date, default: Date.now },
    /** Set when a disposal pickup has been booked for this compartment. */
    disposalScheduledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

compartmentSchema.virtual('fillRatio').get(function () {
  if (!this.capacity) return 0;
  return Math.min(this.currentLoad / this.capacity, 1);
});

compartmentSchema.virtual('fillPercent').get(function () {
  return Math.round(this.fillRatio * 100);
});

/** Derives status from load so the two can never drift apart. */
compartmentSchema.methods.refreshStatus = function () {
  if (this.status === 'servicing') return this.status;
  const ratio = this.fillRatio;
  if (ratio >= FULL_THRESHOLD) this.status = 'full';
  else if (ratio >= NEARLY_FULL_THRESHOLD) this.status = 'nearly_full';
  else if (ratio > 0) this.status = 'filling';
  else this.status = 'available';
  return this.status;
};

compartmentSchema.methods.canAccept = function (weightKg) {
  return this.status !== 'servicing' && this.currentLoad + weightKg <= this.capacity;
};

compartmentSchema.pre('save', function (next) {
  this.refreshStatus();
  next();
});

compartmentSchema.set('toJSON', { virtuals: true });
compartmentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Compartment', compartmentSchema);
