import Compartment from '../models/Compartment.js';
import Robot from '../models/Robot.js';
import Alert from '../models/Alert.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';
import { emitToHospital, EVENTS } from '../services/socketService.js';
import { CATEGORY_LABELS } from '../models/constants.js';

/** GET /api/v1/compartments */
export const listCompartments = asyncHandler(async (req, res) => {
  const filter = { hospitalId: req.hospitalId };
  if (req.query.robotId) filter.robotId = String(req.query.robotId).toUpperCase();

  const items = await Compartment.find(filter).sort({ category: 1, compartmentId: 1 });

  // The segregation page groups by category across the whole fleet, so the
  // rollup is computed once here rather than in the browser.
  const byCategory = items.reduce((acc, c) => {
    const bucket = (acc[c.category] ||= {
      category: c.category,
      label: CATEGORY_LABELS[c.category],
      capacity: 0,
      currentLoad: 0,
      compartments: [],
    });
    bucket.capacity += c.capacity;
    bucket.currentLoad += c.currentLoad;
    bucket.compartments.push(c.toJSON());
    return acc;
  }, {});

  for (const bucket of Object.values(byCategory)) {
    bucket.currentLoad = Number(bucket.currentLoad.toFixed(2));
    bucket.fillPercent = bucket.capacity
      ? Math.round((bucket.currentLoad / bucket.capacity) * 100)
      : 0;
  }

  res.json({ success: true, data: items, meta: { byCategory: Object.values(byCategory) } });
});

/** GET /api/v1/compartments/:compartmentId */
export const getCompartment = asyncHandler(async (req, res) => {
  const compartment = await Compartment.findOne({
    compartmentId: String(req.params.compartmentId).toUpperCase(),
    hospitalId: req.hospitalId,
  });
  if (!compartment) throw ApiError.notFound(`No compartment ${req.params.compartmentId}`);
  res.json({ success: true, data: compartment });
});

/** POST /api/v1/compartments/:compartmentId/schedule-disposal */
export const scheduleDisposal = asyncHandler(async (req, res) => {
  const { scheduledFor } = req.body;
  const compartment = await Compartment.findOne({
    compartmentId: String(req.params.compartmentId).toUpperCase(),
    hospitalId: req.hospitalId,
  });
  if (!compartment) throw ApiError.notFound(`No compartment ${req.params.compartmentId}`);

  const when = scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  if (Number.isNaN(when.getTime())) throw ApiError.badRequest('That is not a valid date');
  if (when < new Date()) throw ApiError.badRequest('Pick a time in the future');

  compartment.disposalScheduledAt = when;
  await compartment.save();

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'compartment.schedule_disposal',
    entityType: 'Compartment',
    entityId: compartment.compartmentId,
    changes: { disposalScheduledAt: [null, when.toISOString()] },
    ip: req.ip,
  });

  emitToHospital(req.hospitalId, EVENTS.COMPARTMENT_UPDATED, compartment.toJSON());
  res.json({ success: true, data: compartment });
});

/**
 * POST /api/v1/compartments/:compartmentId/empty
 * Records that the bin was handed to the disposal vendor and is now empty.
 */
export const emptyCompartment = asyncHandler(async (req, res) => {
  const compartment = await Compartment.findOne({
    compartmentId: String(req.params.compartmentId).toUpperCase(),
    hospitalId: req.hospitalId,
  });
  if (!compartment) throw ApiError.notFound(`No compartment ${req.params.compartmentId}`);
  if (compartment.currentLoad === 0) {
    throw ApiError.badRequest(`${compartment.compartmentId} is already empty`);
  }

  const emptied = compartment.currentLoad;
  compartment.currentLoad = 0;
  compartment.lastEmptiedAt = new Date();
  compartment.disposalScheduledAt = null;
  await compartment.save();

  // The robot's overall load reading has to come down with it.
  const siblings = await Compartment.find({ robotId: compartment.robotId });
  const totalCapacity = siblings.reduce((s, c) => s + c.capacity, 0);
  const totalLoad = siblings.reduce((s, c) => s + c.currentLoad, 0);
  await Robot.updateOne(
    { robotId: compartment.robotId },
    { $set: { load: totalCapacity ? Math.round((totalLoad / totalCapacity) * 100) : 0 } }
  );

  // Any open warning about this bin is now untrue.
  await Alert.updateMany(
    {
      hospitalId: req.hospitalId,
      compartmentId: compartment.compartmentId,
      kind: { $in: ['compartment_nearly_full', 'compartment_full'] },
      resolvedAt: null,
    },
    { $set: { resolvedAt: new Date(), acknowledged: true, acknowledgedBy: req.user._id } }
  );

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'compartment.empty',
    entityType: 'Compartment',
    entityId: compartment.compartmentId,
    changes: { currentLoad: [emptied, 0] },
    ip: req.ip,
  });

  emitToHospital(req.hospitalId, EVENTS.COMPARTMENT_UPDATED, compartment.toJSON());
  res.json({
    success: true,
    data: compartment,
    meta: { message: `${emptied.toFixed(2)} kg logged as handed over` },
  });
});
