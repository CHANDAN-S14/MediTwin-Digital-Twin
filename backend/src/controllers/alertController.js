import Alert from '../models/Alert.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';

/** GET /api/v1/alerts */
export const listAlerts = asyncHandler(async (req, res) => {
  const { severity, acknowledged, kind } = req.query;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  const filter = { hospitalId: req.hospitalId };
  if (severity) filter.severity = { $in: String(severity).split(',') };
  if (kind) filter.kind = { $in: String(kind).split(',') };
  if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

  const items = await Alert.find(filter).sort({ createdAt: -1 }).limit(limit);

  const open = await Alert.aggregate([
    { $match: { hospitalId: req.hospitalId, acknowledged: false } },
    { $group: { _id: '$severity', n: { $sum: 1 } } },
  ]);

  const bySeverity = Object.fromEntries(open.map((o) => [o._id, o.n]));

  res.json({
    success: true,
    data: items,
    meta: {
      openTotal: Object.values(bySeverity).reduce((a, b) => a + b, 0),
      bySeverity,
    },
  });
});

/** POST /api/v1/alerts/:id/acknowledge */
export const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
  if (!alert) throw ApiError.notFound('No such alert');
  if (alert.acknowledged) throw ApiError.badRequest('That alert is already acknowledged');

  alert.acknowledged = true;
  alert.acknowledgedBy = req.user._id;
  alert.acknowledgedAt = new Date();
  await alert.save();

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'alert.acknowledge',
    entityType: 'Alert',
    entityId: String(alert._id),
    changes: { kind: [alert.kind, alert.kind] },
    ip: req.ip,
  });

  res.json({ success: true, data: alert });
});

/** POST /api/v1/alerts/acknowledge-all */
export const acknowledgeAll = asyncHandler(async (req, res) => {
  const result = await Alert.updateMany(
    { hospitalId: req.hospitalId, acknowledged: false },
    { $set: { acknowledged: true, acknowledgedBy: req.user._id, acknowledgedAt: new Date() } }
  );

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'alert.acknowledge_all',
    entityType: 'Alert',
    entityId: `${result.modifiedCount} alerts`,
    ip: req.ip,
  });

  res.json({
    success: true,
    data: { acknowledged: result.modifiedCount },
    meta: { message: `${result.modifiedCount} alert${result.modifiedCount === 1 ? '' : 's'} acknowledged` },
  });
});
