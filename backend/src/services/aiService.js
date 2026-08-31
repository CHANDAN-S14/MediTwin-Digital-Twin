import env from '../config/env.js';
import logger from '../utils/logger.js';
import { WASTE_CATEGORIES } from '../models/constants.js';

/**
 * Client for the FastAPI classification service.
 *
 * The Node API deliberately owns no model weights. Keeping inference in a
 * separate Python process means the model can be retrained and redeployed
 * without touching the API, and a slow or crashed model cannot take the
 * dashboard down with it.
 */

/**
 * Which bin a category belongs in, as a slot label like RED-02.
 *
 * This is a *slot*, not a compartment id — the actual compartment carries its
 * robot's prefix (MB-01-RED-02) because ids are unique across the fleet. The
 * slot is what the scanner UI shows an operator before any robot is chosen.
 */
const PRIMARY_SLOT = { yellow: 'YELLOW-01', red: 'RED-02', blue: 'BLUE-01', general: 'GENERAL-01' };

export const slotForCategory = (category) =>
  PRIMARY_SLOT[category] ?? PRIMARY_SLOT.general;

/**
 * Sends an image to the classifier.
 *
 * @param {Buffer} buffer raw image bytes
 * @param {string} filename original filename, used only for the multipart part
 * @param {string} mimetype e.g. image/jpeg
 * @returns {Promise<{prediction:string,confidence:number,alternatives:Array,compartmentSlot:string,degraded:boolean,modelVersion:string}>}
 */
export const classifyImage = async (buffer, filename = 'waste.jpg', mimetype = 'image/jpeg') => {
  const url = `${env.aiServiceUrl}/api/v1/predict`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs);

  try {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype }), filename);

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`classifier returned ${res.status} ${body.slice(0, 200)}`);
    }

    const data = await res.json();

    if (!WASTE_CATEGORIES.includes(data.prediction)) {
      throw new Error(`classifier returned unknown category "${data.prediction}"`);
    }

    return {
      prediction: data.prediction,
      confidence: Number(data.confidence) || 0,
      alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
      compartmentSlot: data.compartment || slotForCategory(data.prediction),
      modelVersion: data.model_version || 'unknown',
      degraded: Boolean(data.untrained),
    };
  } catch (err) {
    const reason = err.name === 'AbortError'
      ? `no response within ${env.aiServiceTimeoutMs}ms`
      : err.message;
    logger.warn(`Classifier unavailable (${reason}) — returning a flagged placeholder result`);
    return degradedResult(reason);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * What to return when the classifier cannot be reached.
 *
 * This never guesses a category. Returning a confident-looking prediction from
 * a service that did not run would be the single most dangerous thing this file
 * could do, so it reports `general` at zero confidence and sets `degraded`.
 * Callers surface that to the operator and require a manual category.
 */
const degradedResult = (reason) => ({
  prediction: 'general',
  confidence: 0,
  alternatives: [],
  compartmentSlot: slotForCategory('general'),
  modelVersion: 'unavailable',
  degraded: true,
  degradedReason: reason,
});

/**
 * Liveness probe used by the dashboard's service-status row.
 *
 * Reports two different things on purpose. `online` means the process answered;
 * `ready` means it answered *and* has trained weights loaded. Those come apart in
 * the normal case of a fresh clone: the service is up, /health returns 200, and
 * every prediction is still refused because the model is a random head. Collapsing
 * them into one boolean would put a green light next to a classifier that cannot
 * classify anything, which is the most misleading thing this row could do.
 */
export const checkHealth = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${env.aiServiceUrl}/health`, { signal: controller.signal });
    if (!res.ok) return { online: false, ready: false, detail: `HTTP ${res.status}` };

    const body = await res.json();
    const trained = Boolean(body.model_trained);

    return {
      online: true,
      ready: trained,
      modelLoaded: Boolean(body.model_loaded),
      modelTrained: trained,
      modelVersion: body.model_version ?? 'unknown',
      architecture: body.architecture ?? 'unknown',
      device: body.device ?? 'unknown',
      classes: body.classes ?? [],
      metrics: body.metrics ?? null,
      // The service reports its own load failure — a checkpoint rejected for a
      // class-order mismatch, say. Passing it through means the operator sees the
      // actual reason instead of an unexplained amber light.
      loadError: body.load_error ?? null,
      detail: trained
        ? `${body.model_version ?? 'unknown'} on ${body.device ?? 'unknown'}`
        : body.load_error
          ? `no usable checkpoint: ${body.load_error}`
          : 'reachable, but no trained checkpoint is loaded — predictions will be refused',
    };
  } catch (err) {
    return {
      online: false,
      ready: false,
      detail: err.name === 'AbortError' ? 'no response within 3000ms' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
};

export default { classifyImage, checkHealth, slotForCategory };
