import mongoose from 'mongoose';

/**
 * Anything the platform needs a human to know about. Severity drives whether
 * it merely appears in the list or interrupts the operator.
 */
const alertSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    /** What kind of thing went wrong, used to pick an icon and a fix action. */
    kind: {
      type: String,
      enum: [
        'compartment_nearly_full',
        'compartment_full',
        'battery_low',
        'robot_offline',
        'emergency_stop',
        'low_confidence_classification',
        'route_blocked',
        'disposal_overdue',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    /** What the operator should do about it. Empty means informational only. */
    recommendedAction: { type: String, trim: true, default: '' },
    robotId: { type: String, default: null },
    compartmentId: { type: String, default: null },
    wasteId: { type: String, default: null },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ hospitalId: 1, acknowledged: 1, createdAt: -1 });

export default mongoose.model('Alert', alertSchema);
