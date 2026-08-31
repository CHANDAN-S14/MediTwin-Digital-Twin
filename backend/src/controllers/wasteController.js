import Waste from '../models/Waste.js';
import Compartment from '../models/Compartment.js';
import { WASTE_CATEGORIES } from '../models/constants.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { formatWasteId } from '../utils/ids.js';
import { recordAudit } from '../services/auditService.js';
import { emitToHospital, EVENTS } from '../services/socketService.js';

/**
 * Resolves either a Mongo ObjectId or a manifest id like MW-0042 to a query.
 * Operators paste manifest ids off a printed label, so both must work.
 */
const byAnyId = (id, hospitalId) =>
  /^[0-9a-fA-F]{24}$/.test(id)
    ? { _id: id, hospitalId }
    : { wasteId: String(id).toUpperCase(), hospitalId };

/**
 * GET /api/v1/waste
 * Filters: category, status, department, robotId, from, to, q, page, limit
 */
export const listWaste = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status,
    category,
    department,
    search,
    hospitalId,
  } = req.query;

  const filter = {};

  // Only filter by hospital when a REAL hospitalId is provided.
  if (
    hospitalId &&
    hospitalId !== 'DEFAULT_HOSPITAL' &&
    mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    filter.hospitalId = hospitalId;
  }

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (department) {
    filter.department = department;
  }

  if (search) {
    filter.$or = [
      { category: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
      { wasteId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    Waste.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),

    Waste.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: records,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/** GET /api/v1/waste/:id — accepts a Mongo id or a manifest id like MW-0042 */
export const getWaste = asyncHandler(async (req, res) => {
  const item = await Waste.findOne(byAnyId(req.params.id, req.hospitalId))
    .populate('taskId', 'taskId route transitions status');
  if (!item) throw ApiError.notFound(`No waste record ${req.params.id}`);
  res.json({ success: true, data: item });
});

/** POST /api/v1/waste — logs an item by hand, for when the robot was not involved */
export const createWaste = asyncHandler(async (req, res) => {
  const { category, itemType, weight, sourceLocation, robotId, compartmentId } = req.body;

  if (!WASTE_CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Category must be one of: ${WASTE_CATEGORIES.join(', ')}`);
  }
  if (!sourceLocation) throw ApiError.badRequest('Say which department this came from');

  const sequence = (await Waste.countDocuments({ hospitalId: req.hospitalId })) + 1;

  const item = await Waste.create({
    wasteId: formatWasteId(sequence),
    hospitalId: req.hospitalId,
    category,
    itemType: itemType || 'Manually logged',
    weight: Number(weight) || 0,
    sourceLocation,
    robotId: robotId ? String(robotId).toUpperCase() : null,
    compartmentId: compartmentId ? String(compartmentId).toUpperCase() : null,
    status: 'collected',
    collectedAt: new Date(),
    reviewedByHuman: true,
    reviewedBy: req.user._id,
  });

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'waste.create_manual',
    entityType: 'Waste',
    entityId: item.wasteId,
    ip: req.ip,
  });

  emitToHospital(req.hospitalId, EVENTS.WASTE_COLLECTED, item.toJSON());
  res.status(201).json({ success: true, data: item });
});

/**
 * PATCH /api/v1/waste/:id/category
 * A human correcting the model. The original prediction is preserved, because
 * the disagreement is the useful signal for retraining.
 */
export const reclassifyWaste = asyncHandler(async (req, res) => {
  const { category, reason } = req.body;
  if (!WASTE_CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Category must be one of: ${WASTE_CATEGORIES.join(', ')}`);
  }

  const item = await Waste.findOne(byAnyId(req.params.id, req.hospitalId));
  if (!item) throw ApiError.notFound(`No waste record ${req.params.id}`);
  if (item.category === category) {
    throw ApiError.badRequest(`${item.wasteId} is already logged as ${category}`);
  }

  const previous = item.category;
  if (!item.originalCategory) item.originalCategory = previous;
  item.category = category;
  item.reviewedByHuman = true;
  item.reviewedBy = req.user._id;
  await item.save();

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'waste.reclassify',
    entityType: 'Waste',
    entityId: item.wasteId,
    changes: { category: [previous, category], reason: [null, reason ?? ''] },
    ip: req.ip,
  });

  emitToHospital(req.hospitalId, EVENTS.WASTE_CLASSIFIED, {
    wasteId: item.wasteId,
    category,
    correctedByHuman: true,
  });

  res.json({ success: true, data: item });
});

/** DELETE /api/v1/waste/:id — admin only; a deletion is itself an audited event */
export const deleteWaste = asyncHandler(async (req, res) => {
  const item = await Waste.findOne(byAnyId(req.params.id, req.hospitalId));
  if (!item) throw ApiError.notFound(`No waste record ${req.params.id}`);

  if (item.status === 'collected' && item.compartmentId) {
    // Removing the record must not leave the compartment reading heavy.
    const compartment = await Compartment.findOne({ compartmentId: item.compartmentId });
    if (compartment) {
      compartment.currentLoad = Math.max(0, Number((compartment.currentLoad - item.weight).toFixed(3)));
      await compartment.save();
      emitToHospital(req.hospitalId, EVENTS.COMPARTMENT_UPDATED, compartment.toJSON());
    }
  }

  await item.deleteOne();

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'waste.delete',
    entityType: 'Waste',
    entityId: item.wasteId,
    changes: { category: [item.category, null], weight: [item.weight, null] },
    ip: req.ip,
  });

  res.json({ success: true, data: { message: `${item.wasteId} removed` } });
});

/** GET /api/v1/waste/export — CSV for the regulator's monthly return */
export const exportWaste = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { hospitalId: req.hospitalId };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const rows = await Waste.find(filter).sort({ createdAt: 1 }).lean();

  const header = [
    'waste_id', 'created_at', 'category', 'item_type', 'weight_kg',
    'source_location', 'robot_id', 'compartment_id', 'status',
    'ai_confidence', 'human_reviewed', 'original_category', 'collected_at',
  ];

  // Quote every field and double internal quotes, so a comma in a free-text
  // field cannot shift the columns.
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const csv = [
    header.join(','),
    ...rows.map((r) => [
      r.wasteId, r.createdAt?.toISOString(), r.category, r.itemType, r.weight,
      r.sourceLocation, r.robotId, r.compartmentId, r.status,
      r.confidence, r.reviewedByHuman, r.originalCategory, r.collectedAt?.toISOString(),
    ].map(escape).join(',')),
  ].join('\n');

  await recordAudit({
    hospitalId: req.hospitalId,
    actor: req.user,
    action: 'waste.export',
    entityType: 'Waste',
    entityId: `${rows.length} records`,
    ip: req.ip,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="meditwin-waste-${stamp}.csv"`);
  res.send(csv);
});
