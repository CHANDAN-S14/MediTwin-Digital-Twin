import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/**
 * Writes one entry to the chain-of-custody log.
 *
 * Audit writes must never break the operation they describe — a failed log is
 * worth a warning, not a failed request — so this swallows its own errors.
 */
export const recordAudit = async ({
  hospitalId,
  actor = null,
  action,
  entityType,
  entityId,
  changes = {},
  ip = null,
  outcome = 'success',
}) => {
  try {
    return await AuditLog.create({
      hospitalId,
      actorId: actor?.id ?? actor?._id ?? null,
      actorName: actor?.name ?? 'system',
      actorRole: actor?.role ?? 'system',
      action,
      entityType,
      entityId: String(entityId),
      changes,
      ip,
      outcome,
    });
  } catch (err) {
    logger.warn(`Audit write failed for ${action} on ${entityType} ${entityId}: ${err.message}`);
    return null;
  }
};

/** Builds a { field: [before, after] } map, keeping only fields that changed. */
export const diff = (before, after, fields) => {
  const changes = {};
  for (const field of fields) {
    if (before?.[field] !== after?.[field]) changes[field] = [before?.[field], after?.[field]];
  }
  return changes;
};

export default { recordAudit, diff };
