import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/db.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Robot from '../models/Robot.js';
import Compartment from '../models/Compartment.js';
import Waste from '../models/Waste.js';
import Task from '../models/Task.js';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
import {
  formatWasteId, formatRobotId, formatCompartmentId, formatCompartmentSlot, formatTaskId,
} from '../utils/ids.js';
import { findPath, simplifyPath } from '../services/routeService.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Seeds a working hospital so the dashboard has something real to show on first run.
 *
 * The data is fabricated but internally consistent: every waste record points at
 * a department that exists, compartment loads equal the sum of what was put in
 * them, every route was produced by the same A* planner the robots use, and every
 * alert is derived from the state that was just written. A demo that contradicts
 * itself is worse than an empty one, because it teaches you to distrust the
 * numbers.
 */

/**
 * A 20×14 floor. Obstacles are walls and fixed plant; the gaps between runs are
 * doorways, so every department stays reachable from the waste station. The seed
 * verifies that claim rather than trusting it.
 */
const GRID = { width: 20, height: 14 };

const OBSTACLES = [
  // Northern ward wall, with a doorway at x = 8
  ...[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13].map((x) => [x, 5]),
  // Central spine dividing the east and west corridors, doorway at y = 9
  ...[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12].map((y) => [15, y]),
  // Theatre block, entered from the west
  [17, 2], [18, 2], [17, 3],
  // Fixed equipment: imaging plant and the linen store
  [10, 8], [11, 8], [10, 9],
  [4, 11], [5, 11],
];

const DEPARTMENTS = [
  { name: 'ICU', cell: { x: 6, y: 3 }, wasteVolumeHint: 'high' },
  { name: 'Operation Theatre 1', cell: { x: 18, y: 4 }, wasteVolumeHint: 'high' },
  { name: 'Emergency', cell: { x: 2, y: 2 }, wasteVolumeHint: 'high' },
  { name: 'General Ward A', cell: { x: 11, y: 2 }, wasteVolumeHint: 'medium' },
  { name: 'General Ward B', cell: { x: 13, y: 3 }, wasteVolumeHint: 'medium' },
  { name: 'Pathology Lab', cell: { x: 17, y: 8 }, wasteVolumeHint: 'high' },
  { name: 'Radiology', cell: { x: 8, y: 8 }, wasteVolumeHint: 'low' },
  { name: 'Pharmacy', cell: { x: 12, y: 11 }, wasteVolumeHint: 'low' },
  { name: 'Dialysis Unit', cell: { x: 18, y: 11 }, wasteVolumeHint: 'high' },
  { name: 'Maternity', cell: { x: 6, y: 8 }, wasteVolumeHint: 'medium' },
];

const WASTE_STATION = { x: 2, y: 12 };

/** Per-category compartment sizing, in kg. Sharps bins are smaller by design. */
const COMPARTMENT_PLAN = [
  { category: 'yellow', slot: 1, capacity: 8 },
  { category: 'red', slot: 2, capacity: 6 },
  { category: 'blue', slot: 1, capacity: 4 },
  { category: 'general', slot: 1, capacity: 10 },
];

const slotFor = (category) =>
  COMPARTMENT_PLAN.find((c) => c.category === category).slot;

const ITEMS = {
  yellow: [
    ['Soiled dressings', 0.55], ['Anatomical waste', 0.9], ['Culture media', 0.35],
    ['Expired medicine', 0.28], ['Cotton swabs', 0.18],
  ],
  red: [
    ['Contaminated tubing', 0.4], ['IV set', 0.32], ['Used catheter', 0.25],
    ['Blood-soaked gauze', 0.2], ['Disposable syringe body', 0.15],
  ],
  blue: [
    ['Glass vial', 0.12], ['Broken ampoule', 0.08], ['Metal scalpel blade', 0.05],
    ['Glass syringe barrel', 0.22], ['Used needle', 0.03],
  ],
  general: [
    ['Packaging', 0.6], ['Paper towel', 0.15], ['Food wrapper', 0.1],
    ['Non-contaminated PPE', 0.45], ['Cardboard box', 1.1],
  ],
};

/**
 * Deterministic pseudo-random source (mulberry32), seeded so two people running
 * the seed get the same demo and can compare notes about the same numbers.
 *
 * Written with Math.imul and 32-bit operators throughout. The obvious
 * `state * 1103515245 + 12345` LCG overflows a double's 53-bit mantissa within a
 * few iterations, at which point the low bits are rounding noise and the sequence
 * stops being reproducible — the one property this needs to have.
 */
let rngState = 1337;
const rand = () => {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = (list) => list[Math.floor(rand() * list.length)];
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

/** Category mix weighted the way a real hospital's stream actually looks. */
const weightedCategory = () => {
  const r = rand();
  if (r < 0.38) return 'yellow';
  if (r < 0.63) return 'red';
  if (r < 0.75) return 'blue';
  return 'general';
};

const HOURS_OF_ACTIVITY = [8, 9, 10, 11, 12, 14, 15, 16, 17, 20];

/**
 * Plausible runner-up predictions. A softmax never returns one category at 0.94
 * with nothing behind it, and a reviewer reading the alternatives should see
 * numbers that sum to 1 with the winner.
 */
const buildAlternatives = (category, confidence) => {
  const others = ['yellow', 'red', 'blue', 'general'].filter((c) => c !== category);
  const remaining = 1 - confidence;
  // Decaying split of the leftover probability mass.
  const shares = [0.6, 0.3, 0.1];
  return others
    .map((c, i) => ({ category: c, confidence: Number((remaining * shares[i]).toFixed(4)) }))
    .sort((a, b) => b.confidence - a.confidence);
};

const wipe = async () => {
  await Promise.all([
    Hospital.deleteMany({}), User.deleteMany({}), Robot.deleteMany({}),
    Compartment.deleteMany({}), Waste.deleteMany({}), Task.deleteMany({}),
    Alert.deleteMany({}), AuditLog.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');
};

const seed = async () => {
  /**
   * This script deletes every collection. That is fine for a demo database and
   * catastrophic for a real waste register, so production needs an explicit
   * override rather than a confirmation prompt nobody reads.
   */
  if (env.isProd && process.env.SEED_FORCE !== 'true') {
    throw new Error(
      'Refusing to wipe a production database. Set SEED_FORCE=true if that is genuinely what you want.'
    );
  }

  await connectDB();
  await wipe();

  // ---- Hospital ------------------------------------------------------------
  const hospital = await Hospital.create({
    name: 'Sri Venkateswara General Hospital',
    location: 'Bengaluru, Karnataka',
    departments: DEPARTMENTS,
    grid: { ...GRID, obstacles: OBSTACLES },
    wasteStation: WASTE_STATION,
    complianceContact: 'biomedical.compliance@svgh.example.in',
  });

  // A department the planner cannot reach would fail at dispatch time with no
  // obvious cause, so refuse to seed a floor plan that walls one off.
  const unreachable = DEPARTMENTS.filter(
    (d) => findPath([WASTE_STATION.x, WASTE_STATION.y], [d.cell.x, d.cell.y], hospital.grid).length === 0
  );
  if (unreachable.length) {
    throw new Error(
      `Floor plan walls off: ${unreachable.map((d) => d.name).join(', ')}. Fix OBSTACLES before seeding.`
    );
  }
  logger.info(`Hospital created — all ${DEPARTMENTS.length} departments reachable from the waste station`);

  // ---- Users ---------------------------------------------------------------
  // Created one at a time: User hashes its password in a pre-save hook, and
  // insertMany would bypass it and store the plaintext.
  const admin = await User.create({
    name: 'Dr. Anjali Rao', email: 'admin@meditwin.health', password: 'meditwin2026',
    role: 'admin', hospitalId: hospital._id, department: 'Administration',
  });
  const operator = await User.create({
    name: 'Ravi Kumar', email: 'operator@meditwin.health', password: 'meditwin2026',
    role: 'operator', hospitalId: hospital._id, department: 'Facilities',
  });
  const staff = await User.create({
    name: 'Sister Meera Nair', email: 'staff@meditwin.health', password: 'meditwin2026',
    role: 'staff', hospitalId: hospital._id, department: 'ICU',
  });
  logger.info('Seeded 3 users (admin / operator / staff)');

  // ---- Robots and compartments --------------------------------------------
  const robotSpecs = [
    { index: 1, battery: 87, temperature: 32.4 },
    { index: 2, battery: 64, temperature: 33.1 },
    { index: 3, battery: 41, temperature: 31.8 },
  ];

  const robots = [];
  for (const spec of robotSpecs) {
    const robot = await Robot.create({
      robotId: formatRobotId(spec.index),
      hospitalId: hospital._id,
      status: 'IDLE',
      battery: spec.battery,
      temperature: spec.temperature,
      location: { ...WASTE_STATION },
      currentDepartment: 'Waste Station',
      lastHeartbeat: new Date(),
    });
    robots.push(robot);

    for (const plan of COMPARTMENT_PLAN) {
      await Compartment.create({
        compartmentId: formatCompartmentId(robot.robotId, plan.category, plan.slot),
        robotId: robot.robotId,
        hospitalId: hospital._id,
        category: plan.category,
        capacity: plan.capacity,
        currentLoad: 0,
      });
    }
  }
  logger.info(`Seeded ${robots.length} robots with ${robots.length * COMPARTMENT_PLAN.length} compartments`);

  // ---- History -------------------------------------------------------------
  /**
   * Fourteen days of collections. Loads accumulate per compartment as the records
   * are written, so the fill levels the dashboard shows are the actual sum of the
   * items in the register rather than a decorative number.
   */
  const DAYS = 14;
  const loadByCompartment = new Map();
  const wasteDocs = [];
  const taskDocs = [];
  let sequence = 0;

  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const isToday = dayOffset === 0;
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    // Weekends are quieter, which makes the trend line look like a real one.
    const isWeekend = [0, 6].includes(day.getDay());
    const collections = isWeekend ? randInt(3, 6) : randInt(7, 13);

    for (let i = 0; i < collections; i += 1) {
      const department = pick(DEPARTMENTS);
      const robot = robots[randInt(0, robots.length - 1)];
      const category = weightedCategory();
      const [itemType, baseWeight] = pick(ITEMS[category]);
      const weight = Number((baseWeight * (0.75 + rand() * 0.5)).toFixed(2));

      const at = new Date(day);
      at.setHours(pick(HOURS_OF_ACTIVITY), randInt(0, 59), randInt(0, 59), 0);

      // Confidence: high most of the time, occasionally uncertain. Blue is the
      // hardest class — clear glass on a steel tray is genuinely hard to see.
      const uncertain = rand() < (category === 'blue' ? 0.22 : 0.1);
      const confidence = uncertain
        ? Number((0.58 + rand() * 0.16).toFixed(4))
        : Number((0.88 + rand() * 0.11).toFixed(4));
      // Drawn once and reused, so the record and its audit entry agree.
      const confirmed = uncertain && rand() < 0.6;

      const compartmentId = formatCompartmentId(robot.robotId, category, slotFor(category));

      // The route the planner would really produce for this trip.
      const outbound = simplifyPath(
        findPath([WASTE_STATION.x, WASTE_STATION.y], [department.cell.x, department.cell.y], hospital.grid)
      );

      sequence += 1;
      const wasteId = formatWasteId(sequence);
      const startedAt = new Date(at.getTime() - randInt(90, 240) * 1000);
      const offset = (seconds) => new Date(startedAt.getTime() + seconds * 1000);

      taskDocs.push({
        // Sequential, not random: a unique index plus a few hundred random
        // four-hex ids is a birthday problem waiting to fail an insert.
        taskId: formatTaskId(sequence),
        hospitalId: hospital._id,
        robotId: robot.robotId,
        source: department.name,
        destination: 'Waste Station',
        priority: department.wasteVolumeHint === 'high' && rand() < 0.25 ? 'high' : 'normal',
        status: 'completed',
        route: outbound,
        routeCursor: Math.max(0, outbound.length - 1),
        expectedCategory: category,
        wasteIds: [wasteId],
        requestedBy: rand() < 0.5 ? staff._id : operator._id,
        startedAt,
        completedAt: at,
        createdAt: startedAt,
        updatedAt: at,
        transitions: [
          { state: 'NAVIGATING', at: startedAt, note: `Heading to ${department.name}` },
          { state: 'ARRIVED', at: offset(45), note: `At ${department.name}` },
          { state: 'SCANNING', at: offset(58), note: 'Camera sweep of the collection point' },
          { state: 'CLASSIFYING', at: offset(66), note: `Identified as ${category}` },
          { state: 'SEGREGATING', at: offset(74), note: `Chute rotating to ${compartmentId}` },
          { state: 'COLLECTED', at: offset(82), note: `${wasteId} secured` },
          { state: 'RETURNING', at: offset(90), note: 'Heading back to the waste station' },
          { state: 'IDLE', at, note: 'Run complete' },
        ],
      });

      // Only today's items are still aboard; earlier days went to the disposal
      // vendor, which is why the bins are not overflowing after two weeks.
      if (isToday) {
        loadByCompartment.set(
          compartmentId,
          Number(((loadByCompartment.get(compartmentId) ?? 0) + weight).toFixed(3))
        );
      }

      wasteDocs.push({
        wasteId,
        hospitalId: hospital._id,
        category,
        itemType,
        confidence,
        alternatives: buildAlternatives(category, confidence),
        weight,
        sourceLocation: department.name,
        robotId: robot.robotId,
        compartmentId,
        status: isToday ? 'collected' : 'disposed',
        // An uncertain prediction a nurse then confirmed is the audit story worth
        // showing, so those are marked reviewed.
        reviewedByHuman: confirmed,
        reviewedBy: confirmed ? staff._id : null,
        collectedAt: at,
        disposedAt: isToday ? null : new Date(at.getTime() + 6 * 3600 * 1000),
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  /**
   * timestamps: false so the createdAt values above survive. Left on, Mongoose
   * would stamp every record with the moment the seed ran and the fourteen-day
   * trend the dashboard is meant to show would collapse into a single spike.
   */
  await Waste.insertMany(wasteDocs, { timestamps: false });
  await Task.insertMany(taskDocs, { timestamps: false });
  logger.info(`Seeded ${wasteDocs.length} waste records across ${DAYS} days and ${taskDocs.length} tasks`);

  // ---- Reconcile compartment loads and robot counters ----------------------
  for (const [compartmentId, load] of loadByCompartment) {
    const compartment = await Compartment.findOne({ compartmentId });
    if (!compartment) continue;
    // Capped at capacity: the seed should not produce a state the runtime would
    // have refused to create.
    compartment.currentLoad = Math.min(load, compartment.capacity);
    compartment.lastEmptiedAt = new Date(Date.now() - 26 * 3600 * 1000);
    await compartment.save(); // pre-save hook derives status from the load
  }

  for (const robot of robots) {
    const mine = wasteDocs.filter((w) => w.robotId === robot.robotId);
    robot.totalCollections = mine.length;
    // Rough odometer: each run is an out-and-back trip of similar length.
    robot.distanceTravelled = mine.length * randInt(24, 34);

    const compartments = await Compartment.find({ robotId: robot.robotId });
    const capacity = compartments.reduce((s, c) => s + c.capacity, 0);
    const loaded = compartments.reduce((s, c) => s + c.currentLoad, 0);
    robot.load = capacity ? Math.round((loaded / capacity) * 100) : 0;
    await robot.save();
  }
  logger.info('Reconciled compartment loads and robot counters against the register');

  // ---- Alerts --------------------------------------------------------------
  /**
   * Every alert is derived from the state just written. If a compartment ended up
   * above the warning threshold it gets one; if not, it does not. That is what
   * keeps the alert list honest.
   */
  const alerts = [];

  const fullish = await Compartment.find({
    hospitalId: hospital._id,
    status: { $in: ['nearly_full', 'full'] },
  });
  for (const c of fullish) {
    alerts.push({
      hospitalId: hospital._id,
      severity: c.status === 'full' ? 'critical' : 'warning',
      kind: c.status === 'full' ? 'compartment_full' : 'compartment_nearly_full',
      title: `${c.category.toUpperCase()} compartment at ${c.fillPercent}%`,
      message: `${c.compartmentId} holds ${c.currentLoad.toFixed(2)} kg of ${c.capacity} kg.`,
      recommendedAction: 'Schedule a disposal pickup before the next collection round.',
      robotId: c.robotId,
      compartmentId: c.compartmentId,
    });
  }

  for (const r of robots.filter((r) => r.battery < 45)) {
    alerts.push({
      hospitalId: hospital._id,
      severity: 'warning',
      kind: 'battery_low',
      title: `${r.robotId} battery at ${Math.round(r.battery)}%`,
      message: 'Below the comfortable dispatch threshold for a full collection round.',
      recommendedAction: 'Leave it docked until it charges above 60%.',
      robotId: r.robotId,
    });
  }

  const unreviewed = wasteDocs.filter((w) => w.confidence < 0.75 && !w.reviewedByHuman).slice(0, 3);
  for (const w of unreviewed) {
    alerts.push({
      hospitalId: hospital._id,
      severity: 'warning',
      kind: 'low_confidence_classification',
      title: `${w.wasteId} classified at ${Math.round(w.confidence * 100)}% confidence`,
      message: `The model suggested ${w.category} for "${w.itemType}" but is not certain.`,
      recommendedAction: 'Confirm the category by eye and correct it if needed.',
      wasteId: w.wasteId,
    });
  }

  alerts.push({
    hospitalId: hospital._id,
    severity: 'info',
    kind: 'system',
    title: 'Digital twin synchronised',
    message: `Floor plan loaded: ${DEPARTMENTS.length} departments and ${OBSTACLES.length} mapped obstacles on a ${GRID.width}×${GRID.height} grid.`,
    recommendedAction: '',
    acknowledged: true,
    acknowledgedBy: admin._id,
    acknowledgedAt: new Date(),
  });

  await Alert.insertMany(alerts);
  logger.info(`Seeded ${alerts.length} alerts, all derived from the seeded state`);

  // ---- Audit trail ---------------------------------------------------------
  const now = new Date();
  await AuditLog.insertMany(
    [
      {
        hospitalId: hospital._id, actorId: admin._id, actorName: admin.name, actorRole: 'admin',
        action: 'hospital.create', entityType: 'Hospital', entityId: hospital.name,
        changes: { departments: [0, DEPARTMENTS.length] },
        createdAt: now,
      },
      ...robots.map((r) => ({
        hospitalId: hospital._id, actorId: admin._id, actorName: admin.name, actorRole: 'admin',
        action: 'robot.commission', entityType: 'Robot', entityId: r.robotId,
        changes: { status: [null, 'IDLE'] },
        createdAt: now,
      })),
      ...wasteDocs
        .filter((w) => w.reviewedByHuman)
        .slice(0, 8)
        .map((w) => ({
          hospitalId: hospital._id, actorId: staff._id, actorName: staff.name, actorRole: 'staff',
          action: 'waste.confirm_category', entityType: 'Waste', entityId: w.wasteId,
          changes: { confirmed: [false, true], confidence: [w.confidence, w.confidence] },
          createdAt: w.collectedAt,
        })),
    ],
    { timestamps: false }
  );
  logger.info('Seeded audit trail');

  // ---- Summary -------------------------------------------------------------
  const totalWeight = wasteDocs.reduce((s, w) => s + w.weight, 0);
  const openAlerts = alerts.filter((a) => !a.acknowledged).length;

  logger.info('');
  logger.info('  Seed complete');
  logger.info(`  Hospital        ${hospital.name}`);
  logger.info(`  Waste records   ${wasteDocs.length} (${totalWeight.toFixed(1)} kg over ${DAYS} days)`);
  logger.info(`  Robots          ${robots.map((r) => r.robotId).join(', ')}`);
  logger.info(`  Compartments    ${robots.length * COMPARTMENT_PLAN.length} (${formatCompartmentSlot('red', 2)} etc.)`);
  logger.info(`  Alerts open     ${openAlerts} of ${alerts.length}`);
  logger.info('');
  logger.info('  Sign in with any of:');
  logger.info('    admin@meditwin.health     / meditwin2026   (full access)');
  logger.info('    operator@meditwin.health  / meditwin2026   (can dispatch robots)');
  logger.info('    staff@meditwin.health     / meditwin2026   (read and reclassify)');
  logger.info('');
  logger.info('  These are demo credentials. Change them before this touches a real network.');
  logger.info('');
};

seed()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error('Seed failed:', err.message);
    if (err.stack) logger.error(err.stack);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
