import mongoose from 'mongoose';

import Waste from '../models/Waste.js';
import Compartment from '../models/Compartment.js';

import { WASTE_CATEGORIES } from '../models/constants.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import { formatWasteId } from '../utils/ids.js';

import { recordAudit } from '../services/auditService.js';

import {
  emitToHospital,
  EVENTS,
} from '../services/socketService.js';

/*
|--------------------------------------------------------------------------
| DEMO HOSPITAL
|--------------------------------------------------------------------------
|
| Your SIH demo does not require login.
|
| Therefore req.user and req.hospitalId may not exist.
|
| We use null when there is no authenticated hospital.
|
*/

const getHospitalId = (req) => {
  return req.hospitalId || null;
};


/*
|--------------------------------------------------------------------------
| FIND WASTE BY MONGO ID OR WASTE ID
|--------------------------------------------------------------------------
|
| Supports:
|
|   6a980e1c76c6bed8d3fc5e28
|
| or:
|
|   MW-0001
|
*/

const byAnyId = (id, hospitalId = null) => {
  const cleanId = String(id).trim();

  const query = {};

  if (
    mongoose.Types.ObjectId.isValid(cleanId) &&
    cleanId.length === 24
  ) {
    query._id = cleanId;
  } else {
    query.wasteId = cleanId.toUpperCase();
  }

  /*
   * Only add hospital filtering when a real
   * hospital ID is available.
   */
  if (
    hospitalId &&
    mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    query.hospitalId = hospitalId;
  }

  return query;
};


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste
|--------------------------------------------------------------------------
|
| Returns all waste records.
|
| Login NOT required for SIH demo.
|
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


  /*
   * Hospital filter.
   *
   * If a valid hospitalId is explicitly provided,
   * filter by it.
   *
   * Otherwise show demo records.
   */

  if (
    hospitalId &&
    hospitalId !== 'DEFAULT_HOSPITAL' &&
    mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    filter.hospitalId = hospitalId;
  }


  /*
   * Status filter
   */

  if (status) {
    filter.status = status;
  }


  /*
   * Category filter
   */

  if (category) {
    filter.category = category;
  }


  /*
   * Department filter
   */

  if (department) {
    filter.department = department;
  }


  /*
   * Search
   */

  if (search) {

    filter.$or = [
      {
        category: {
          $regex: search,
          $options: 'i',
        },
      },

      {
        department: {
          $regex: search,
          $options: 'i',
        },
      },

      {
        wasteId: {
          $regex: search,
          $options: 'i',
        },
      },

      {
        itemType: {
          $regex: search,
          $options: 'i',
        },
      },

      {
        sourceLocation: {
          $regex: search,
          $options: 'i',
        },
      },
    ];
  }


  const pageNumber = Math.max(
    1,
    Number(page) || 1
  );

  const limitNumber = Math.min(
    100,
    Math.max(1, Number(limit) || 50)
  );


  const skip =
    (pageNumber - 1) * limitNumber;


  const [records, total] =
    await Promise.all([

      Waste.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Waste.countDocuments(filter),

    ]);


  res.json({

    success: true,

    data: records,

    meta: {

      page: pageNumber,

      limit: limitNumber,

      total,

      pages: Math.ceil(
        total / limitNumber
      ),

    },

  });

});


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste/:id
|--------------------------------------------------------------------------
|
| Get one waste record.
|
*/

export const getWaste = asyncHandler(async (req, res) => {

  const hospitalId =
    getHospitalId(req);


  const item =
    await Waste.findOne(
      byAnyId(
        req.params.id,
        hospitalId
      )
    )
      .populate(
        'taskId',
        'taskId route transitions status'
      );


  if (!item) {

    throw ApiError.notFound(
      `No waste record ${req.params.id}`
    );

  }


  res.json({

    success: true,

    data: item,

  });

});


/*
|--------------------------------------------------------------------------
| POST /api/v1/waste
|--------------------------------------------------------------------------
|
| Create waste record.
|
| Login NOT required.
|
| Example:
|
| {
|   "category": "yellow",
|   "itemType": "Biomedical Waste",
|   "weight": 1.5,
|   "sourceLocation": "OT",
|   "robotId": "MEDI-001",
|   "confidence": 0.94
| }
|
*/

export const createWaste = asyncHandler(async (req, res) => {

  const {
    category,
    itemType,
    weight,
    sourceLocation,
    robotId,
    compartmentId,
    confidence,
    department,
  } = req.body || {};


  /*
   * Validate category
   */

  if (
    !WASTE_CATEGORIES.includes(category)
  ) {

    throw ApiError.badRequest(
      `Category must be one of: ${WASTE_CATEGORIES.join(', ')}`
    );

  }


  /*
   * Validate source location
   */

  if (!sourceLocation && !department) {

    throw ApiError.badRequest(
      'Source location or department is required'
    );

  }


  /*
   * Use department when sourceLocation
   * is not provided.
   */

  const finalSourceLocation =
    sourceLocation ||
    department ||
    'Unknown';


  /*
   * Hospital is optional in demo mode.
   */

  const hospitalId =
    getHospitalId(req);


  /*
   * Generate waste ID.
   *
   * Using count + 1 for your SIH demo.
   */

  const sequence =
    (await Waste.countDocuments({
      hospitalId,
    })) + 1;


  const wasteId =
    formatWasteId(sequence);


  /*
   * Create record.
   */

  const item =
    await Waste.create({

      wasteId,

      hospitalId,

      category,

      originalCategory:
        category,

      itemType:
        itemType ||
        'AI Classified Waste',

      weight:
        Number(weight) || 0,

      sourceLocation:
        finalSourceLocation,

      department:
        department ||
        finalSourceLocation,

      robotId:
        robotId
          ? String(robotId).toUpperCase()
          : null,

      compartmentId:
        compartmentId
          ? String(compartmentId).toUpperCase()
          : null,

      confidence:
        Number(confidence) || 0,

      status:
        'collected',

      collectedAt:
        new Date(),

      reviewedByHuman:
        false,

      /*
       * User is optional.
       */

      reviewedBy:
        req.user?._id || null,

    });


  /*
   * Audit only when user exists.
   *
   * This prevents the demo endpoint from
   * crashing because req.user is undefined.
   */

  if (req.user) {

    await recordAudit({

      hospitalId,

      actor: req.user,

      action:
        'waste.create',

      entityType:
        'Waste',

      entityId:
        item.wasteId,

      ip:
        req.ip,

    });

  }


  /*
   * Send socket event only when
   * there is a hospital room.
   */

  if (hospitalId) {

    emitToHospital(

      hospitalId,

      EVENTS.WASTE_COLLECTED,

      item.toJSON()

    );

  }


  res.status(201).json({

    success: true,

    message:
      'Waste record created successfully',

    data:
      item,

  });

});


/*
|--------------------------------------------------------------------------
| PATCH /api/v1/waste/:id/category
|--------------------------------------------------------------------------
|
| Human correction of AI classification.
|
| Login NOT required for SIH demo.
|
*/

export const reclassifyWaste =
  asyncHandler(async (req, res) => {

    const {
      category,
      reason,
    } = req.body || {};


    /*
     * Validate category.
     */

    if (
      !WASTE_CATEGORIES.includes(category)
    ) {

      throw ApiError.badRequest(
        `Category must be one of: ${WASTE_CATEGORIES.join(', ')}`
      );

    }


    const hospitalId =
      getHospitalId(req);


    const item =
      await Waste.findOne(
        byAnyId(
          req.params.id,
          hospitalId
        )
      );


    if (!item) {

      throw ApiError.notFound(
        `No waste record ${req.params.id}`
      );

    }


    /*
     * Same category?
     */

    if (
      item.category === category
    ) {

      throw ApiError.badRequest(
        `${item.wasteId} is already logged as ${category}`
      );

    }


    /*
     * Preserve original AI prediction.
     */

    const previous =
      item.category;


    if (!item.originalCategory) {

      item.originalCategory =
        previous;

    }


    /*
     * Update category.
     */

    item.category =
      category;


    item.reviewedByHuman =
      true;


    /*
     * User is optional.
     */

    item.reviewedBy =
      req.user?._id || null;


    await item.save();


    /*
     * Audit only when authenticated.
     */

    if (req.user) {

      await recordAudit({

        hospitalId,

        actor:
          req.user,

        action:
          'waste.reclassify',

        entityType:
          'Waste',

        entityId:
          item.wasteId,

        changes: {

          category: [
            previous,
            category,
          ],

          reason: [
            null,
            reason ?? '',
          ],

        },

        ip:
          req.ip,

      });

    }


    /*
     * Socket event.
     */

    if (hospitalId) {

      emitToHospital(

        hospitalId,

        EVENTS.WASTE_CLASSIFIED,

        {

          wasteId:
            item.wasteId,

          category,

          correctedByHuman:
            true,

        }

      );

    }


    res.json({

      success: true,

      message:
        'Waste category updated successfully',

      data:
        item,

    });

  });


/*
|--------------------------------------------------------------------------
| DELETE /api/v1/waste/:id
|--------------------------------------------------------------------------
|
| Keep this protected by requireRole('admin')
| in wasteRoutes.js.
|
*/

export const deleteWaste =
  asyncHandler(async (req, res) => {

    const hospitalId =
      getHospitalId(req);


    const item =
      await Waste.findOne(
        byAnyId(
          req.params.id,
          hospitalId
        )
      );


    if (!item) {

      throw ApiError.notFound(
        `No waste record ${req.params.id}`
      );

    }


    /*
     * Update compartment load.
     */

    if (
      item.status === 'collected' &&
      item.compartmentId
    ) {

      const compartment =
        await Compartment.findOne({

          compartmentId:
            item.compartmentId,

        });


      if (compartment) {

        compartment.currentLoad =
          Math.max(

            0,

            Number(

              (
                compartment.currentLoad -
                item.weight

              ).toFixed(3)

            )

          );


        await compartment.save();


        if (hospitalId) {

          emitToHospital(

            hospitalId,

            EVENTS.COMPARTMENT_UPDATED,

            compartment.toJSON()

          );

        }

      }

    }


    /*
     * Delete record.
     */

    await item.deleteOne();


    /*
     * Audit if authenticated.
     */

    if (req.user) {

      await recordAudit({

        hospitalId,

        actor:
          req.user,

        action:
          'waste.delete',

        entityType:
          'Waste',

        entityId:
          item.wasteId,

        changes: {

          category: [
            item.category,
            null,
          ],

          weight: [
            item.weight,
            null,
          ],

        },

        ip:
          req.ip,

      });

    }


    res.json({

      success: true,

      message:
        `${item.wasteId} removed`,

      data: {

        message:
          `${item.wasteId} removed`,

      },

    });

  });


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste/export
|--------------------------------------------------------------------------
|
| Export waste records as CSV.
|
*/

export const exportWaste =
  asyncHandler(async (req, res) => {

    const {
      from,
      to,
      hospitalId,
    } = req.query;


    const filter = {};


    /*
     * Optional hospital filter.
     */

    if (
      hospitalId &&
      hospitalId !== 'DEFAULT_HOSPITAL' &&
      mongoose.Types.ObjectId.isValid(hospitalId)
    ) {

      filter.hospitalId =
        hospitalId;

    }


    /*
     * Date filter.
     */

    if (from || to) {

      filter.createdAt = {};


      if (from) {

        const fromDate =
          new Date(from);

        if (
          !Number.isNaN(
            fromDate.getTime()
          )
        ) {

          filter.createdAt.$gte =
            fromDate;

        }

      }


      if (to) {

        const toDate =
          new Date(to);

        if (
          !Number.isNaN(
            toDate.getTime()
          )
        ) {

          filter.createdAt.$lte =
            toDate;

        }

      }

    }


    /*
     * Get records.
     */

    const rows =
      await Waste.find(filter)
        .sort({ createdAt: 1 })
        .lean();


    /*
     * CSV header.
     */

    const header = [

      'waste_id',

      'created_at',

      'category',

      'item_type',

      'weight_kg',

      'source_location',

      'robot_id',

      'compartment_id',

      'status',

      'ai_confidence',

      'human_reviewed',

      'original_category',

      'collected_at',

    ];


    /*
     * CSV escaping.
     */

    const escape = (value) => {

      return `"${String(
        value ?? ''
      ).replace(
        /"/g,
        '""'
      )}"`;

    };


    /*
     * Build CSV.
     */

    const csv = [

      header.join(','),

      ...rows.map((r) => [

        r.wasteId,

        r.createdAt
          ? r.createdAt.toISOString()
          : '',

        r.category,

        r.itemType,

        r.weight,

        r.sourceLocation,

        r.robotId,

        r.compartmentId,

        r.status,

        r.confidence,

        r.reviewedByHuman,

        r.originalCategory,

        r.collectedAt
          ? r.collectedAt.toISOString()
          : '',

      ]
        .map(escape)
        .join(',')),

    ].join('\n');


    /*
     * Audit only if logged in.
     */

    if (req.user) {

      await recordAudit({

        hospitalId:
          req.hospitalId || null,

        actor:
          req.user,

        action:
          'waste.export',

        entityType:
          'Waste',

        entityId:
          `${rows.length} records`,

        ip:
          req.ip,

      });

    }


    /*
     * Response headers.
     */

    const stamp =
      new Date()
        .toISOString()
        .slice(0, 10);


    res.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8'
    );


    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meditwin-waste-${stamp}.csv"`
    );


    res.send(csv);

  });
