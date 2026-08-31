import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/audit
 * Read-only by design — there is no write endpoint, because entries are only
 * ever created as a side effect of the action they describe.
 */
export const listAuditLog = asyncHandler(async (req, res) => {
  const { action, entityType, actorId, outcome, from, to, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  const filter = { hospitalId: req.hospitalId };
  if (action) filter.action = { $in: String(action).split(',') };
  if (entityType) filter.entityType = entityType;
  if (actorId) filter.actorId = actorId;
  if (outcome) filter.outcome = outcome;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ entityId: rx }, { actorName: rx }, { action: rx }];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  // Distinct action names populate the filter dropdown without a second request.
  const actions = await AuditLog.distinct('action', { hospitalId: req.hospitalId });

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, actions: actions.sort() },
  });
});
