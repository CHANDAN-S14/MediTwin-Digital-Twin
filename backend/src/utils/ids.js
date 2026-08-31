/**
 * Human-readable identifiers. Staff read these off a screen and say them out
 * loud during a handover, so they need to stay short and unambiguous.
 */

/** Waste manifest id, e.g. MW-1024. Sequence is per-hospital, zero-padded to 4. */
export const formatWasteId = (sequence) =>
  `MW-${String(sequence).padStart(4, '0')}`;

/** Robot id, e.g. MB-01 ("MediTwin Bot"). */
export const formatRobotId = (index) =>
  `MB-${String(index).padStart(2, '0')}`;

/** Compartment slot label, e.g. RED-02 — category prefix plus slot number. */
export const formatCompartmentSlot = (category, slot) =>
  `${String(category).toUpperCase()}-${String(slot).padStart(2, '0')}`;

/**
 * Full compartment id, e.g. MB-01-RED-02. The robot prefix is part of the id
 * because compartment ids are unique across the whole fleet — three robots each
 * carry a red bin, and a disposal record has to say which one.
 */
export const formatCompartmentId = (robotId, category, slot) =>
  `${String(robotId).toUpperCase()}-${formatCompartmentSlot(category, slot)}`;

/** Fixed-length hex string. Avoids the short-string case of Math.random().toString(16). */
const randomHex = (chars) =>
  Array.from({ length: chars }, () => Math.floor(Math.random() * 16).toString(16))
    .join('')
    .toUpperCase();

/**
 * Task id, e.g. TSK-8F3A19.
 *
 * Six hex digits, not four. Tasks are not read in sequence so a random suffix is
 * fine, but taskId is a unique index: at four digits (65 536 values) a few
 * hundred tasks collide often enough to fail an insert, which is a confusing way
 * to discover a birthday problem. Six digits puts that beyond practical reach.
 *
 * Pass an explicit sequence when generating many at once — the seed does — to
 * remove the possibility entirely.
 */
export const formatTaskId = (sequence = null) =>
  sequence === null
    ? `TSK-${randomHex(6)}`
    : `TSK-${String(sequence).padStart(6, '0')}`;
