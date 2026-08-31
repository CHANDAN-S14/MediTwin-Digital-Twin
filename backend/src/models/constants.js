/**
 * Waste categories follow the colour coding in India's Bio-Medical Waste
 * Management Rules, 2016 (Schedule I). The colours are not a design choice —
 * they are the regulatory categories staff are already trained on.
 */
export const WASTE_CATEGORIES = ['yellow', 'red', 'blue', 'general'];

export const CATEGORY_LABELS = {
  yellow: 'Yellow — incineration',
  red: 'Red — autoclave and shred',
  blue: 'Blue — glass and metal sharps',
  general: 'General — non-hazardous',
};

/** The nine states the robot moves through in one collection run. */
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

export const WASTE_STATUSES = ['detected', 'classified', 'processing', 'collected', 'disposed'];
export const TASK_STATUSES = ['queued', 'active', 'completed', 'cancelled', 'failed'];
export const COMPARTMENT_STATUSES = ['available', 'filling', 'nearly_full', 'full', 'servicing'];
export const USER_ROLES = ['admin', 'staff', 'operator'];

/** A compartment past this fraction of capacity raises a warning. */
export const NEARLY_FULL_THRESHOLD = 0.8;
export const FULL_THRESHOLD = 0.97;
