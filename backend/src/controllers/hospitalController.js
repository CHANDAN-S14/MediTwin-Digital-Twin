import Hospital from '../models/Hospital.js';
import Waste from '../models/Waste.js';
import Robot from '../models/Robot.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';
import { buildObstacleSet, planDepartmentRoute } from '../services/routeService.js';

/**
 * The floor plan. Both the 2D map and the 3D digital twin render from this one
 * document, so a wall added here appears in both views and the route planner
 * starts avoiding it in the same request.
 */

/** GET /api/v1/hospital — layout, departments, grid, waste station */
export const getHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.hospitalId);
  if (!hospital) throw ApiError.notFound('No hospital is linked to your account');

  res.json({ success: true, data: hospital });
});

/**
 * GET /api/v1/hospital/layout
 * The same data shaped for rendering: departments carry their live waste counts
 * so the map can size or tint each node without a second round trip.
 */
export const getLayout = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.hospitalId);
  if (!hospital) throw ApiError.notFound('No hospital is linked to your account');

  const [counts, robots] = await Promise.all([
    Waste.aggregate([
      { $match: { hospitalId: hospital._id } },
      { $group: { _id: '$sourceLocation', count: { $sum: 1 }, weight: { $sum: '$weight' } } },
    ]),
    Robot.find({ hospitalId: hospital._id }).select('robotId status location currentDepartment battery load'),
  ]);

  const byDepartment = new Map(counts.map((c) => [c._id, c]));

  res.json({
    success: true,
    data: {
      grid: hospital.grid,
      wasteStation: hospital.wasteStation,
      departments: hospital.departments.map((d) => ({
        name: d.name,
        cell: d.cell,
        wasteVolumeHint: d.wasteVolumeHint,
        wasteCount: byDepartment.get(d.name)?.count ?? 0,
        wasteWeightKg: Number((byDepartment.get(d.name)?.weight ?? 0).toFixed(2)),
      })),
      robots: robots.map((r) => ({
        robotId: r.robotId,
        status: r.status,
        location: r.location,
        currentDepartment: r.currentDepartment,
        battery: Math.round(r.battery),
        load: r.load,
      })),
    },
  });
});

/**
 * POST /api/v1/hospital/route
 * Previews the path between two departments without moving anything. The map
 * uses it to draw a proposed route before an operator commits to dispatching.
 */
export const previewRoute = asyncHandler(async (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) throw ApiError.badRequest('Give both a "from" and a "to" department');

  const hospital = await Hospital.findById(req.hospitalId);
  if (!hospital) throw ApiError.notFound('No hospital is linked to your account');

  // planDepartmentRoute throws a descriptive ApiError for unknown or unreachable
  // departments, which is exactly what the caller should see.
  const plan = planDepartmentRoute(hospital, from, to);

  res.json({
    success: true,
    data: {
      from,
      to,
      /** Turn-to-turn waypoints, which is what the map draws. */
      route: plan.route,
      /** Every cell in order, for a robot that must be told each step. */
      fullPath: plan.fullPath,
      // Grid steps, not metres — the frontend labels the unit for that reason.
      steps: plan.length,
      cells: plan.cells,
      turns: Math.max(0, plan.route.length - 2),
    },
  });
});

/** PATCH /api/v1/hospital — admin edits to the floor plan */
export const updateHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.hospitalId);
  if (!hospital) throw ApiError.notFound('No hospital is linked to your account');

  const { name, location, complianceContact, departments, grid, wasteStation } = req.body;
  const changes = {};

  if (name && name !== hospital.name) {
    changes.name = [hospital.name, name];
    hospital.name = name;
  }
  if (location !== undefined && location !== hospital.location) {
    changes.location = [hospital.location, location];
    hospital.location = location;
  }
  if (complianceContact !== undefined) hospital.complianceContact = complianceContact;

  if (Array.isArray(departments)) {
    // Every department must sit on a free cell, or the planner will accept a
    // dispatch it can never complete.
    const obstacles = buildObstacleSet(grid?.obstacles ?? hospital.grid.obstacles);
    const width = grid?.width ?? hospital.grid.width;
    const height = grid?.height ?? hospital.grid.height;

    for (const d of departments) {
      if (!d?.name || !d.cell) throw ApiError.badRequest('Each department needs a name and a cell');
      const { x, y } = d.cell;
      if (x < 0 || y < 0 || x >= width || y >= height) {
        throw ApiError.badRequest(`${d.name} sits outside the ${width}×${height} grid`);
      }
      if (obstacles.has(`${x},${y}`)) {
        throw ApiError.badRequest(`${d.name} is placed on an obstacle at (${x}, ${y})`);
      }
    }

    changes.departments = [hospital.departments.length, departments.length];
    hospital.departments = departments;
  }

  if (grid) {
    hospital.grid = { ...hospital.grid.toObject(), ...grid };
    changes.grid = ['updated', `${hospital.grid.width}×${hospital.grid.height}, ${hospital.grid.obstacles.length} obstacles`];
  }
  if (wasteStation) hospital.wasteStation = wasteStation;

  await hospital.save();

  await recordAudit({
    hospitalId: hospital._id,
    actor: req.user,
    action: 'hospital.update',
    entityType: 'Hospital',
    entityId: hospital.name,
    changes,
    ip: req.ip,
  });

  res.json({ success: true, data: hospital });
});
