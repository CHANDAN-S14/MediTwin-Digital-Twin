import Waste from '../models/Waste.js';
import Robot from '../models/Robot.js';
import Task from '../models/Task.js';
import Alert from '../models/Alert.js';
import Compartment from '../models/Compartment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { WASTE_CATEGORIES } from '../models/constants.js';

/**
 * Every figure on the dashboard is aggregated in MongoDB rather than by pulling
 * documents into Node and reducing them. Waste records accumulate quickly —
 * a busy hospital produces thousands a month — and shipping those over the wire
 * to count them would get slow within weeks of going live.
 */

/** Start of the local day, so "today" matches what staff mean by it. */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n) => {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
};

/** GET /api/v1/analytics/overview — the six stat cards */
export const getOverview = asyncHandler(async (req, res) => {
  const hospitalId = req.hospitalId;
  const today = startOfToday();
  const yesterday = daysAgo(1);

  const [
    todayAgg,
    yesterdayAgg,
    allTimeAgg,
    robots,
    taskCounts,
    openAlerts,
    criticalAlerts,
    aiAgg,
  ] = await Promise.all([
    Waste.aggregate([
      { $match: { hospitalId, createdAt: { $gte: today } } },
      { $group: { _id: null, count: { $sum: 1 }, weight: { $sum: '$weight' } } },
    ]),
    Waste.aggregate([
      { $match: { hospitalId, createdAt: { $gte: yesterday, $lt: today } } },
      { $group: { _id: null, count: { $sum: 1 }, weight: { $sum: '$weight' } } },
    ]),
    Waste.aggregate([
      { $match: { hospitalId } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          weight: { $sum: '$weight' },
          collected: { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['detected', 'classified', 'processing']] }, 1, 0] } },
        },
      },
    ]),
    Robot.find({ hospitalId }).select('status battery'),
    Task.aggregate([
      { $match: { hospitalId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Alert.countDocuments({ hospitalId, acknowledged: false }),
    Alert.countDocuments({ hospitalId, acknowledged: false, severity: 'critical' }),
    // Mean confidence over classifications the model actually produced.
    Waste.aggregate([
      { $match: { hospitalId, confidence: { $ne: null, $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' },
          total: { $sum: 1 },
          corrected: { $sum: { $cond: ['$reviewedByHuman', 1, 0] } },
        },
      },
    ]),
  ]);

  const t = todayAgg[0] ?? { count: 0, weight: 0 };
  const y = yesterdayAgg[0] ?? { count: 0, weight: 0 };
  const all = allTimeAgg[0] ?? { count: 0, weight: 0, collected: 0, pending: 0 };
  const ai = aiAgg[0] ?? { avgConfidence: null, total: 0, corrected: 0 };

  const tasksByStatus = Object.fromEntries(taskCounts.map((c) => [c._id, c.n]));

  // Guard the division: on day one there is no yesterday to compare against.
  const deltaPercent = y.count > 0 ? Math.round(((t.count - y.count) / y.count) * 100) : null;

  res.json({
    success: true,
    data: {
      wasteToday: { count: t.count, weightKg: Number((t.weight ?? 0).toFixed(2)), deltaPercent },
      wasteAllTime: { count: all.count, weightKg: Number((all.weight ?? 0).toFixed(1)) },
      collected: all.collected,
      pending: all.pending,
      robots: {
        total: robots.length,
        active: robots.filter((r) => !['IDLE', 'EMERGENCY_STOP'].includes(r.status)).length,
        standby: robots.filter((r) => r.status === 'IDLE').length,
        stopped: robots.filter((r) => r.status === 'EMERGENCY_STOP').length,
      },
      tasks: {
        active: tasksByStatus.active ?? 0,
        queued: tasksByStatus.queued ?? 0,
        completed: tasksByStatus.completed ?? 0,
        failed: tasksByStatus.failed ?? 0,
      },
      alerts: { open: openAlerts, critical: criticalAlerts },
      ai: {
        // Null rather than a fabricated number when nothing has been classified.
        avgConfidence: ai.avgConfidence !== null ? Number(ai.avgConfidence.toFixed(4)) : null,
        classified: ai.total,
        humanCorrected: ai.corrected,
        agreementRate: ai.total ? Number((1 - ai.corrected / ai.total).toFixed(4)) : null,
      },
    },
  });
});

/** GET /api/v1/analytics/waste-by-category */
export const getWasteByCategory = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));

  const rows = await Waste.aggregate([
    { $match: { hospitalId: req.hospitalId, createdAt: { $gte: daysAgo(days) } } },
    { $group: { _id: '$category', count: { $sum: 1 }, weight: { $sum: '$weight' } } },
  ]);

  const found = new Map(rows.map((r) => [r._id, r]));
  const total = rows.reduce((s, r) => s + r.count, 0);

  // Always return all four categories. A chart that changes shape because a
  // category happened to be idle is harder to read week to week.
  const data = WASTE_CATEGORIES.map((category) => {
    const row = found.get(category);
    return {
      category,
      count: row?.count ?? 0,
      weightKg: Number((row?.weight ?? 0).toFixed(2)),
      sharePercent: total ? Math.round(((row?.count ?? 0) / total) * 100) : 0,
    };
  });

  res.json({ success: true, data, meta: { days, total } });
});

/** GET /api/v1/analytics/waste-by-department */
export const getWasteByDepartment = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));

  const rows = await Waste.aggregate([
    { $match: { hospitalId: req.hospitalId, createdAt: { $gte: daysAgo(days) } } },
    {
      $group: {
        _id: '$sourceLocation',
        count: { $sum: 1 },
        weight: { $sum: '$weight' },
        // Per-category split, so the stacked bars need only this one query.
        yellow: { $sum: { $cond: [{ $eq: ['$category', 'yellow'] }, 1, 0] } },
        red: { $sum: { $cond: [{ $eq: ['$category', 'red'] }, 1, 0] } },
        blue: { $sum: { $cond: [{ $eq: ['$category', 'blue'] }, 1, 0] } },
        general: { $sum: { $cond: [{ $eq: ['$category', 'general'] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json({
    success: true,
    data: rows.map((r) => ({
      department: r._id,
      count: r.count,
      weightKg: Number(r.weight.toFixed(2)),
      yellow: r.yellow,
      red: r.red,
      blue: r.blue,
      general: r.general,
    })),
    meta: { days },
  });
});

/** GET /api/v1/analytics/daily — line chart of the last N days */
export const getDailyCollection = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = daysAgo(days - 1);

  const rows = await Waste.aggregate([
    { $match: { hospitalId: req.hospitalId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        weight: { $sum: '$weight' },
      },
    },
  ]);

  const found = new Map(rows.map((r) => [r._id, r]));

  // Fill gaps so a quiet day plots as zero instead of vanishing and making the
  // line jump between non-adjacent dates.
  const data = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    const row = found.get(key);
    data.push({
      date: key,
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: row?.count ?? 0,
      weightKg: Number((row?.weight ?? 0).toFixed(2)),
    });
  }

  res.json({ success: true, data, meta: { days } });
});

/** GET /api/v1/analytics/ai-performance — the scanner page's side panel */
export const getAiPerformance = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));

  const [summary, perCategory, todayCount] = await Promise.all([
    Waste.aggregate([
      { $match: { hospitalId: req.hospitalId, confidence: { $ne: null, $gt: 0 }, createdAt: { $gte: daysAgo(days) } } },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' },
          minConfidence: { $min: '$confidence' },
          total: { $sum: 1 },
          corrected: { $sum: { $cond: ['$reviewedByHuman', 1, 0] } },
          lowConfidence: { $sum: { $cond: [{ $lt: ['$confidence', 0.75] }, 1, 0] } },
        },
      },
    ]),
    Waste.aggregate([
      { $match: { hospitalId: req.hospitalId, confidence: { $ne: null, $gt: 0 }, createdAt: { $gte: daysAgo(days) } } },
      { $group: { _id: '$category', avgConfidence: { $avg: '$confidence' }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Waste.countDocuments({ hospitalId: req.hospitalId, confidence: { $ne: null, $gt: 0 }, createdAt: { $gte: startOfToday() } }),
  ]);

  const s = summary[0] ?? null;

  res.json({
    success: true,
    data: {
      // These are all null until real classifications exist. The UI shows a
      // "no data yet" state rather than an invented accuracy figure.
      avgConfidence: s ? Number(s.avgConfidence.toFixed(4)) : null,
      minConfidence: s ? Number(s.minConfidence.toFixed(4)) : null,
      classified: s?.total ?? 0,
      humanCorrected: s?.corrected ?? 0,
      /**
       * How often a human left the model's category alone. This is agreement,
       * not accuracy — accuracy needs a labelled test set, which lives with the
       * training code in ai-service, not in production traffic.
       */
      agreementRate: s?.total ? Number((1 - s.corrected / s.total).toFixed(4)) : null,
      lowConfidenceCount: s?.lowConfidence ?? 0,
      scansToday: todayCount,
      perCategory: perCategory.map((c) => ({
        category: c._id,
        avgConfidence: Number(c.avgConfidence.toFixed(4)),
        count: c.n,
      })),
    },
    meta: { days },
  });
});

/** GET /api/v1/analytics/fleet — utilisation figures for the fleet page */
export const getFleetStats = asyncHandler(async (req, res) => {
  const [robots, compartments, taskDurations] = await Promise.all([
    Robot.find({ hospitalId: req.hospitalId }).select('robotId totalCollections distanceTravelled battery status'),
    Compartment.find({ hospitalId: req.hospitalId }).select('category capacity currentLoad'),
    Task.aggregate([
      { $match: { hospitalId: req.hospitalId, status: 'completed', startedAt: { $ne: null }, completedAt: { $ne: null } } },
      { $project: { seconds: { $divide: [{ $subtract: ['$completedAt', '$startedAt'] }, 1000] } } },
      { $group: { _id: null, avgSeconds: { $avg: '$seconds' }, runs: { $sum: 1 } } },
    ]),
  ]);

  const totalCapacity = compartments.reduce((s, c) => s + c.capacity, 0);
  const totalLoad = compartments.reduce((s, c) => s + c.currentLoad, 0);

  res.json({
    success: true,
    data: {
      robots: robots.map((r) => ({
        robotId: r.robotId,
        collections: r.totalCollections,
        distance: Math.round(r.distanceTravelled),
        battery: Math.round(r.battery),
        status: r.status,
      })),
      capacity: {
        totalKg: Number(totalCapacity.toFixed(1)),
        usedKg: Number(totalLoad.toFixed(2)),
        usedPercent: totalCapacity ? Math.round((totalLoad / totalCapacity) * 100) : 0,
      },
      avgRunSeconds: taskDurations[0] ? Math.round(taskDurations[0].avgSeconds) : null,
      completedRuns: taskDurations[0]?.runs ?? 0,
    },
  });
});
