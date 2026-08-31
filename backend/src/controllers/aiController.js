import Waste from '../models/Waste.js';
import Robot from '../models/Robot.js';
import Alert from '../models/Alert.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import { formatWasteId } from '../utils/ids.js';

import {
  classifyImage,
  checkHealth,
  slotForCategory,
} from '../services/aiService.js';

import { startCollection } from '../services/robotSimulator.js';
import { recordAudit } from '../services/auditService.js';

import {
  emitToHospital,
  EVENTS,
} from '../services/socketService.js';

import { CATEGORY_LABELS } from '../models/constants.js';


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const REVIEW_THRESHOLD = 0.75;


/*
|--------------------------------------------------------------------------
| POST /api/v1/ai/classify
|--------------------------------------------------------------------------
|
| Authentication is required.
|
| Hospital is NOT required.
|
| This means:
|
| User registers
|      ↓
| User logs in
|      ↓
| User opens scanner
|      ↓
| Uploads image
|      ↓
| AI classifies image
|      ↓
| Waste record is saved
|
*/

export const classify = asyncHandler(async (req, res) => {

  /*
   * ---------------------------------------------------------------
   * Check image
   * ---------------------------------------------------------------
   */

  if (!req.file) {
    throw ApiError.badRequest(
      'Attach an image in the "image" field'
    );
  }


  /*
   * ---------------------------------------------------------------
   * Request fields
   * ---------------------------------------------------------------
   */

  const {
    department,
    weight,
    persist = 'true',
    dispatch = 'false',
    robotId,
  } = req.body;


  /*
   * ---------------------------------------------------------------
   * Run AI classifier
   * ---------------------------------------------------------------
   */

  const result = await classifyImage(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );


  /*
   * ---------------------------------------------------------------
   * AI unavailable
   * ---------------------------------------------------------------
   */

  if (result.degraded) {

    res.status(503).json({
      success: false,

      error: {
        message:
          'The classification service is not answering, so this image was not classified.',

        details: {
          reason:
            result.degradedReason ??
            'AI service unavailable',

          action:
            'Make sure the Python AI service is running and try again.',
        },
      },
    });

    return;
  }


  /*
   * ---------------------------------------------------------------
   * Determine review status
   * ---------------------------------------------------------------
   */

  const confidence = Number(result.confidence) || 0;

  const needsReview =
    confidence < REVIEW_THRESHOLD;


  /*
   * ---------------------------------------------------------------
   * Classification response
   * ---------------------------------------------------------------
   */

  const categoryLabel =
    CATEGORY_LABELS[result.prediction] ??
    result.prediction;


  const payload = {

    category: result.prediction,

    categoryLabel,

    confidence: Number(
      confidence.toFixed(4)
    ),

    alternatives:
      Array.isArray(result.alternatives)
        ? result.alternatives
        : [],

    compartmentSlot:
      result.compartmentSlot ??
      slotForCategory(result.prediction),

    modelVersion:
      result.modelVersion ??
      'unknown',

    needsReview,

    reviewThreshold:
      REVIEW_THRESHOLD,
  };


  /*
   * ---------------------------------------------------------------
   * Waste record
   * ---------------------------------------------------------------
   */

  let waste = null;


  if (
    persist !== 'false' &&
    persist !== false
  ) {

    /*
     * IMPORTANT:
     *
     * hospitalId is optional.
     *
     * If the user has a hospital, we use it.
     *
     * If the user doesn't have a hospital,
     * we simply don't include hospitalId.
     */

    const hospitalId =
      req.hospitalId ??
      req.user?.hospitalId ??
      null;


    /*
     * Generate waste ID.
     *
     * Hospital-specific numbering is used when a hospital exists.
     *
     * Otherwise we count all standalone scanner records.
     */

    let sequence;

    if (hospitalId) {

      sequence =
        (
          await Waste.countDocuments({
            hospitalId,
          })
        ) + 1;

    } else {

      sequence =
        (
          await Waste.countDocuments({
            hospitalId: null,
          })
        ) + 1;
    }


    /*
     * Build waste object.
     */

    const wasteData = {

      wasteId:
        formatWasteId(sequence),

      category:
        result.prediction,

      categoryLabel,

      itemType:
        categoryLabel
          .split(' — ')[1] ??
        'Classified item',

      confidence,

      alternatives:
        Array.isArray(result.alternatives)
          ? result.alternatives
          : [],

      weight:
        Number(weight) || 0,

      sourceLocation:
        department ||
        req.user?.department ||
        'Scanner Station',

      compartmentSlot:
        result.compartmentSlot ??
        slotForCategory(result.prediction),

      modelVersion:
        result.modelVersion ??
        'unknown',

      needsReview,

      status:
        'classified',
    };


    /*
     * Only add hospitalId when one actually exists.
     */

    if (hospitalId) {
      wasteData.hospitalId = hospitalId;
    }


    /*
     * Save waste.
     */

    waste =
      await Waste.create(wasteData);


    /*
     * -------------------------------------------------------------
     * Hospital-specific real-time events
     * -------------------------------------------------------------
     *
     * No hospital = no hospital socket event.
     */

    if (hospitalId) {

      emitToHospital(
        hospitalId,
        EVENTS.WASTE_CLASSIFIED,
        {
          wasteId:
            waste.wasteId,

          category:
            waste.category,

          confidence:
            waste.confidence,

          itemType:
            waste.itemType,

          needsReview,
        }
      );


      /*
       * Audit record
       */

      try {

        await recordAudit({
          hospitalId,

          actor:
            req.user,

          action:
            'ai.classify',

          entityType:
            'Waste',

          entityId:
            waste.wasteId,

          changes: {
            category: [
              null,
              result.prediction,
            ],

            confidence: [
              null,
              confidence,
            ],
          },

          ip:
            req.ip,
        });

      } catch (auditError) {

        /*
         * Audit failure should NOT destroy
         * a successful AI scan.
         */

        console.warn(
          'Audit recording failed:',
          auditError.message
        );
      }


      /*
       * -----------------------------------------------------------
       * Low-confidence alert
       * -----------------------------------------------------------
       */

      if (needsReview) {

        const alert =
          await Alert.create({

            hospitalId,

            severity:
              'warning',

            kind:
              'low_confidence_classification',

            title:
              `${waste.wasteId} classified at ${Math.round(
                confidence * 100
              )}% confidence`,

            message:
              `The model suggested ${result.prediction} but is not certain. Runner-up: ${
                result.alternatives?.[0]?.category ??
                'none'
              }.`,

            recommendedAction:
              'Confirm the category before disposal.',

            wasteId:
              waste.wasteId,
          });


        emitToHospital(
          hospitalId,
          EVENTS.ALERT_RAISED,
          alert.toJSON()
        );
      }
    }


    /*
     * -------------------------------------------------------------
     * Dispatch robot
     * -------------------------------------------------------------
     *
     * Robot dispatch REQUIRES hospital.
     *
     * Scanning does NOT.
     */

    let task = null;

    const wantsDispatch =
      dispatch === 'true' ||
      dispatch === true;


    if (wantsDispatch) {

      if (needsReview) {

        res.status(201).json({

          success: true,

          data: {

            ...payload,

            waste,

            task: null,

            dispatchRefused:
              'Confidence is below the review threshold. Confirm the category before dispatching.',

          },

        });

        return;
      }


      if (!hospitalId) {

        res.status(201).json({

          success: true,

          data: {

            ...payload,

            waste,

            task: null,

            dispatchRefused:
              'Robot dispatch requires a hospital assignment. The AI scan itself does not.',

          },

        });

        return;
      }


      if (!department) {

        throw ApiError.badRequest(
          'Dispatching needs a department to collect from'
        );
      }


  task = await startCollection({
  hospitalId: req.hospitalId,
  robotId:
    robotId ||
    (await firstAvailableRobotId(
      req.hospitalId
    )),
  department,
  expectedCategory:
    result.prediction,
  confidence:
    result.confidence,
  requestedBy: req.user._id,
  actor: req.user,
  wasteId: waste?.wasteId ?? null,
});

    }


    /*
     * -------------------------------------------------------------
     * Final response
     * -------------------------------------------------------------
     */

    res.status(201).json({

      success: true,

      data: {

        ...payload,

        waste,

        task,

        dispatchRefused:
          wantsDispatch &&
          needsReview
            ? 'Confidence is below the review threshold — confirm the category, then dispatch manually.'
            : null,

      },

    });

  } else {

    /*
     * persist=false
     *
     * Don't create database record.
     */

    res.status(200).json({

      success: true,

      data: {

        ...payload,

        waste: null,

        task: null,

        dispatchRefused: null,

      },

    });
  }
});


/*
|--------------------------------------------------------------------------
| Find available robot
|--------------------------------------------------------------------------
*/

const firstAvailableRobotId =
  async (hospitalId) => {

    const robot =
      await Robot.findOne({

        hospitalId,

        status:
          'IDLE',

        battery: {
          $gt: 15,
        },

      }).sort({
        load: 1,
      });


    if (!robot) {

      throw ApiError.conflict(
        'No idle robot is available right now'
      );
    }


    return robot.robotId;
  };


/*
|--------------------------------------------------------------------------
| GET /api/v1/ai/health
|--------------------------------------------------------------------------
*/

export const aiHealth =
  asyncHandler(async (_req, res) => {

    const health =
      await checkHealth();

    const usable =
      health.online &&
      health.ready !== false;


    res
      .status(
        usable
          ? 200
          : 503
      )
      .json({

        success:
          usable,

        data:
          health,

      });

  });


/*
|--------------------------------------------------------------------------
| GET /api/v1/ai/categories
|--------------------------------------------------------------------------
*/

export const getCategories =
  asyncHandler(async (_req, res) => {

    res.json({

      success: true,

      data:
        Object.entries(
          CATEGORY_LABELS
        ).map(
          ([category, label]) => ({

            category,

            label,

            treatment:
              label.split(
                ' — '
              )[1],

            compartmentSlot:
              slotForCategory(
                category
              ),

          })
        ),

      meta: {

        source:
          'Bio-Medical Waste Management Rules, 2016 (India) — Schedule I colour coding',

      },

    });

  });