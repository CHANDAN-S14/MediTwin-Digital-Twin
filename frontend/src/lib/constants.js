/**
 * Domain constants, mirrored from the backend's models/constants.js.
 *
 * Duplicated rather than fetched. These are the regulatory colour code and a
 * state machine — they change when the law or the robot changes, not at runtime —
 * and the sidebar legend should render correctly before the first API call
 * returns. `GET /api/v1/ai/categories` remains the authority if the two ever
 * disagree; this file is what lets the UI draw itself immediately.
 */

export const CATEGORIES = ['yellow', 'red', 'blue', 'general'];

/**
 * Everything the UI needs to render a category, in one place.
 *
 * `treatment` is the legally required disposal route, not a description. It is
 * shown verbatim in the scanner and on the manifest because getting it wrong is
 * the failure this product exists to prevent.
 */
export const CATEGORY_META = {
  yellow: {
    label: 'Yellow',
    treatment: 'Incineration or deep burial',
    examples: 'Soiled dressings, anatomical waste, expired medicine, culture media',
    dot: 'bg-waste-yellow',
    badge: 'bg-waste-yellow-tint text-waste-yellow-ink',
    ring: 'ring-waste-yellow/30',
    bar: '#EAB308',
    hex: '#EAB308',
  },
  red: {
    label: 'Red',
    treatment: 'Autoclave, microwave or chemical treatment, then shredding',
    examples: 'Contaminated tubing, IV sets, catheters, syringe bodies',
    dot: 'bg-waste-red',
    badge: 'bg-waste-red-tint text-waste-red-ink',
    ring: 'ring-waste-red/30',
    bar: '#EF4444',
    hex: '#EF4444',
  },
  blue: {
    label: 'Blue',
    treatment: 'Disinfection, then autoclave or shredding',
    examples: 'Glass vials, broken ampoules, metal sharps, needles',
    dot: 'bg-waste-blue',
    badge: 'bg-waste-blue-tint text-waste-blue-ink',
    ring: 'ring-waste-blue/30',
    bar: '#3B82F6',
    hex: '#3B82F6',
  },
  general: {
    label: 'General',
    treatment: 'Ordinary municipal waste stream',
    examples: 'Packaging, paper, food wrappers, uncontaminated PPE',
    dot: 'bg-waste-general',
    badge: 'bg-waste-general-tint text-waste-general-ink',
    ring: 'ring-waste-general/30',
    bar: '#64748B',
    hex: '#64748B',
  },
};

export const categoryMeta = (category) => CATEGORY_META[category] ?? CATEGORY_META.general;

/** The nine states of one collection run, in order. */
export const ROBOT_STATES = [
  'IDLE',
  'NAVIGATING',
  'ARRIVED',
  'SCANNING',
  'CLASSIFYING',
  'SEGREGATING',
  'COLLECTED',
  'RETURNING',
  'EMERGENCY_STOP',
];

/** The eight-step happy path, used to draw the lifecycle progress rail. */
export const RUN_SEQUENCE = [
  'NAVIGATING',
  'ARRIVED',
  'SCANNING',
  'CLASSIFYING',
  'SEGREGATING',
  'COLLECTED',
  'RETURNING',
  'IDLE',
];

export const STATE_META = {
  IDLE: { label: 'Idle', tone: 'neutral', blurb: 'Docked at the waste station, ready to dispatch' },
  NAVIGATING: { label: 'Navigating', tone: 'info', blurb: 'Driving a planned route to the collection point' },
  ARRIVED: { label: 'Arrived', tone: 'info', blurb: 'At the collection point, about to scan' },
  SCANNING: { label: 'Scanning', tone: 'info', blurb: 'Camera sweep of the collection point' },
  CLASSIFYING: { label: 'Classifying', tone: 'brand', blurb: 'Running the item through the classifier' },
  SEGREGATING: { label: 'Segregating', tone: 'brand', blurb: 'Rotating the chute to the correct compartment' },
  COLLECTED: { label: 'Collected', tone: 'ok', blurb: 'Item secured and logged to the manifest' },
  RETURNING: { label: 'Returning', tone: 'info', blurb: 'Driving back to the waste station' },
  EMERGENCY_STOP: { label: 'Emergency stop', tone: 'danger', blurb: 'Drive power cut — needs a human to clear it' },
};

export const stateMeta = (state) =>
  STATE_META[state] ?? { label: state ?? 'Unknown', tone: 'neutral', blurb: '' };

export const TASK_STATUS_TONE = {
  queued: 'neutral',
  active: 'info',
  completed: 'ok',
  failed: 'danger',
  cancelled: 'warn',
};

export const SEVERITY_TONE = {
  info: 'info',
  warning: 'warn',
  critical: 'danger',
};

/** Compartment fill thresholds, matching the backend's model hooks. */
export const NEARLY_FULL_THRESHOLD = 0.8;
export const FULL_THRESHOLD = 0.95;

/**
 * Below this the scanner asks a human to confirm before anything is dispatched.
 * Kept identical to REVIEW_THRESHOLD in the backend's aiController, so the badge
 * the operator sees and the decision the API makes never disagree.
 */
export const REVIEW_THRESHOLD = 0.75;

export const ROLE_META = {
  admin: { label: 'Administrator', blurb: 'Full access, including the audit trail and floor plan' },
  operator: { label: 'Operator', blurb: 'Can dispatch, recall and stop robots' },
  staff: { label: 'Clinical staff', blurb: 'Can log waste and correct a classification' },
};
