import mongoose from 'mongoose';

/**
 * Append-only record of who did what. Biomedical waste handling is a regulated
 * chain of custody, so every state change that a person caused is written here
 * and never updated afterwards.
 */
const auditLogSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'system' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true, trim: true },
    /** Collection plus id of whatever was touched, e.g. "Waste MW-1024". */
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    /** Only the fields that changed, as { field: [before, after] }. */
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ hospitalId: 1, createdAt: -1 });

/** Blocks edits, so the log stays trustworthy. */
auditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Audit log entries cannot be modified'));
});

export default mongoose.model('AuditLog', auditLogSchema);
