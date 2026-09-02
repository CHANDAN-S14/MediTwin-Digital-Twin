import mongoose from "mongoose";

import Waste from "../models/Waste.js";
import Compartment from "../models/Compartment.js";

import { WASTE_CATEGORIES } from "../models/constants.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { formatWasteId } from "../utils/ids.js";

import { recordAudit } from "../services/auditService.js";
import {
  emitToHospital,
  EVENTS,
} from "../services/socketService.js";

/*
|--------------------------------------------------------------------------
| DEMO HOSPITAL
|--------------------------------------------------------------------------
|
| Because authentication is disabled for the demo workflow, we use one
| fixed hospital identifier.
|
| IMPORTANT:
| This must match the hospitalId expected by your Waste model.
|
|--------------------------------------------------------------------------
*/

const DEFAULT_HOSPITAL_ID = "DEFAULT_HOSPITAL";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/*
 * Get hospital ID.
 *
 * If authentication is enabled later and req.hospitalId exists,
 * use that value.
 *
 * Otherwise use DEFAULT_HOSPITAL.
 */
const getHospitalId = (req) => {
  return (
    req?.hospitalId ||
    req?.user?.hospitalId ||
    DEFAULT_HOSPITAL_ID
  );
};


/*
|--------------------------------------------------------------------------
| Safe audit helper
|--------------------------------------------------------------------------
|
| Audit logging should never break the actual waste operation.
|
| This is especially useful in demo mode because there may be no
| authenticated req.user.
|--------------------------------------------------------------------------
*/

const safeAudit = async (payload) => {
  try {
    /*
     * If there is no actor, create a simple demo actor.
     */
    const actor =
      payload.actor || {
        _id: null,
        role: "demo",
        name: "Demo User",
      };

    await recordAudit({
      ...payload,
      actor,
    });
  } catch (error) {
    console.warn(
      "Audit logging skipped:",
      error?.message || error
    );
  }
};


/*
|--------------------------------------------------------------------------
| Find waste using either Mongo ObjectId or MW-xxxx wasteId
|--------------------------------------------------------------------------
*/

const byAnyId = (id, hospitalId) => {
  const value = String(id || "").trim();

  /*
   * Mongo ObjectId
   */
  if (mongoose.Types.ObjectId.isValid(value)) {
    return {
      _id: value,
      hospitalId,
    };
  }

  /*
   * Custom waste ID
   *
   * Example:
   * MW-0001
   * MW-0042
   */
  return {
    wasteId: value.toUpperCase(),
    hospitalId,
  };
};


/*
|--------------------------------------------------------------------------
| Normalize category
|--------------------------------------------------------------------------
*/

const normalizeCategory = (category) => {
  const value = String(category || "")
    .trim()
    .toLowerCase();

  if (value.includes("yellow")) {
    return "yellow";
  }

  if (value.includes("red")) {
    return "red";
  }

  if (value.includes("blue")) {
    return "blue";
  }

  if (
    value.includes("general") ||
    value.includes("non") ||
    value.includes("municipal")
  ) {
    return "general";
  }

  return value;
};


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste
|--------------------------------------------------------------------------
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

  /*
   * Use query hospitalId only if it is a valid Mongo ObjectId.
   *
   * Otherwise use the demo hospital.
   */
  let activeHospitalId = getHospitalId(req);

  if (
    hospitalId &&
    hospitalId !== DEFAULT_HOSPITAL_ID &&
    mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    activeHospitalId = hospitalId;
  }

  /*
   * Build filter.
   */
  const filter = {};

  /*
   * Only add hospital filter if the value is a valid Mongo ObjectId.
   *
   * This is important because:
   *
   * DEFAULT_HOSPITAL
   *
   * is not a Mongo ObjectId.
   */
  if (
    activeHospitalId &&
    activeHospitalId !== DEFAULT_HOSPITAL_ID &&
    mongoose.Types.ObjectId.isValid(activeHospitalId)
  ) {
    filter.hospitalId = activeHospitalId;
  }

  /*
   * Status filter.
   */
  if (status) {
    filter.status = String(status).toLowerCase();
  }

  /*
   * Category filter.
   */
  if (category && category !== "ALL") {
    filter.category = normalizeCategory(category);
  }

  /*
   * Department filter.
   */
  if (department) {
    filter.sourceLocation = {
      $regex: String(department),
      $options: "i",
    };
  }

  /*
   * Search.
   */
  if (search) {
    const searchValue = String(search);

    filter.$or = [
      {
        category: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        sourceLocation: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        wasteId: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        robotId: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        itemType: {
          $regex: searchValue,
          $options: "i",
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

  /*
   * Get records.
   */
  const [records, total] =
    await Promise.all([
      Waste.find(filter)
        .sort({
          createdAt: -1,
        })
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
      pages:
        total === 0
          ? 0
          : Math.ceil(
              total / limitNumber
            ),
    },
  });
});


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste/:id
|--------------------------------------------------------------------------
*/

export const getWaste = asyncHandler(
  async (req, res) => {
    const hospitalId =
      getHospitalId(req);

    const item =
      await Waste.findOne(
        byAnyId(
          req.params.id,
          hospitalId
        )
      ).populate(
        "taskId",
        "taskId route transitions status"
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
  }
);


/*
|--------------------------------------------------------------------------
| POST /api/v1/waste
|--------------------------------------------------------------------------
|
| Used when creating a waste record manually or from Scanner.
|--------------------------------------------------------------------------
*/

export const createWaste = asyncHandler(
  async (req, res) => {
    const {
      category,
      itemType,
      weight,
      sourceLocation,
      department,
      robotId,
      compartmentId,
      confidence,
      originalCategory,
      status,
      collectedAt,
      taskId,
    } = req.body;

    /*
     * Hospital.
     */
    const hospitalId =
      getHospitalId(req);

    /*
     * Normalize category.
     */
    const normalizedCategory =
      normalizeCategory(category);

    /*
     * Validate category.
     */
    if (
      !WASTE_CATEGORIES.includes(
        normalizedCategory
      )
    ) {
      throw ApiError.badRequest(
        `Category must be one of: ${WASTE_CATEGORIES.join(
          ", "
        )}`
      );
    }

    /*
     * Department/source location.
     */
    const source =
      sourceLocation ||
      department;

    if (!source) {
      throw ApiError.badRequest(
        "Please provide the source department."
      );
    }

    /*
     * Weight.
     */
    const numericWeight =
      Number(weight) || 0;

    if (numericWeight < 0) {
      throw ApiError.badRequest(
        "Weight cannot be negative."
      );
    }

    /*
     * Generate waste ID.
     *
     * Count records and create the next number.
     */
    const count =
      await Waste.countDocuments(
        hospitalId !== DEFAULT_HOSPITAL_ID
          ? { hospitalId }
          : {}
      );

    const wasteId =
      formatWasteId(count + 1);

    /*
     * Create record.
     */
    const item = await Waste.create({
      wasteId,

      /*
       * Only store hospitalId if it is a valid ObjectId.
       *
       * This prevents Mongo CastError when using demo mode.
       */
      ...(mongoose.Types.ObjectId.isValid(
        hospitalId
      )
        ? {
            hospitalId,
          }
        : {}),

      category:
        normalizedCategory,

      originalCategory:
        originalCategory
          ? normalizeCategory(
              originalCategory
            )
          : normalizedCategory,

      itemType:
        itemType ||
        "Biomedical Waste",

      weight:
        numericWeight,

      sourceLocation:
        String(source),

      robotId:
        robotId
          ? String(robotId).toUpperCase()
          : null,

      compartmentId:
        compartmentId
          ? String(
              compartmentId
            ).toUpperCase()
          : null,

      /*
       * Scanner normally creates the record
       * before the robot starts.
       */
      status:
        status ||
        "pending",

      confidence:
        Number(confidence) || 0,

      collectedAt:
        collectedAt
          ? new Date(collectedAt)
          : null,

      reviewedByHuman:
        false,

      /*
       * Only set taskId if provided.
       */
      ...(taskId
        ? {
            taskId,
          }
        : {}),
    });

    /*
     * Audit.
     */
    await safeAudit({
      hospitalId:
        mongoose.Types.ObjectId.isValid(
          hospitalId
        )
          ? hospitalId
          : null,

      actor:
        req?.user || null,

      action:
        "waste.create",

      entityType:
        "Waste",

      entityId:
        item.wasteId,

      ip:
        req?.ip,

    });

    /*
     * Socket event.
     */
    try {
      emitToHospital(
        hospitalId,
        EVENTS.WASTE_COLLECTED,
        item.toJSON()
      );
    } catch (socketError) {
      console.warn(
        "Waste socket event skipped:",
        socketError?.message ||
          socketError
      );
    }

    /*
     * Response.
     */
    res.status(201).json({
      success: true,
      data: item,
    });
  }
);


/*
|--------------------------------------------------------------------------
| PATCH /api/v1/waste/:id/category
|--------------------------------------------------------------------------
*/

export const reclassifyWaste =
  asyncHandler(
    async (req, res) => {
      const {
        category,
        reason,
      } = req.body;

      const hospitalId =
        getHospitalId(req);

      const normalizedCategory =
        normalizeCategory(category);

      /*
       * Validate category.
       */
      if (
        !WASTE_CATEGORIES.includes(
          normalizedCategory
        )
      ) {
        throw ApiError.badRequest(
          `Category must be one of: ${WASTE_CATEGORIES.join(
            ", "
          )}`
        );
      }

      /*
       * Find record.
       */
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
       * No change.
       */
      if (
        item.category ===
        normalizedCategory
      ) {
        throw ApiError.badRequest(
          `${item.wasteId} is already logged as ${normalizedCategory}`
        );
      }

      const previous =
        item.category;

      /*
       * Preserve original AI category.
       */
      if (
        !item.originalCategory
      ) {
        item.originalCategory =
          previous;
      }

      item.category =
        normalizedCategory;

      item.reviewedByHuman =
        true;

      /*
       * Only save reviewedBy if
       * authenticated user exists.
       */
      if (req?.user?._id) {
        item.reviewedBy =
          req.user._id;
      }

      await item.save();

      /*
       * Audit.
       */
      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user || null,

        action:
          "waste.reclassify",

        entityType:
          "Waste",

        entityId:
          item.wasteId,

        changes: {
          category: [
            previous,
            normalizedCategory,
          ],

          reason: [
            null,
            reason ?? "",
          ],
        },

        ip:
          req?.ip,
      });

      /*
       * Socket.
       */
      try {
        emitToHospital(
          hospitalId,
          EVENTS.WASTE_CLASSIFIED,
          {
            wasteId:
              item.wasteId,

            category:
              normalizedCategory,

            correctedByHuman:
              true,
          }
        );
      } catch (socketError) {
        console.warn(
          "Waste classification socket skipped:",
          socketError?.message ||
            socketError
        );
      }

      res.json({
        success: true,
        data: item,
      });
    }
  );


/*
|--------------------------------------------------------------------------
| DELETE /api/v1/waste/:id
|--------------------------------------------------------------------------
*/

export const deleteWaste =
  asyncHandler(
    async (req, res) => {
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
        item.compartmentId
      ) {
        try {
          const compartment =
            await Compartment.findOne(
              {
                compartmentId:
                  item.compartmentId,
              }
            );

          if (compartment) {
            compartment.currentLoad =
              Math.max(
                0,
                Number(
                  (
                    Number(
                      compartment.currentLoad ||
                        0
                    ) -
                    Number(
                      item.weight || 0
                    )
                  ).toFixed(3)
                )
              );

            await compartment.save();

            try {
              emitToHospital(
                hospitalId,
                EVENTS.COMPARTMENT_UPDATED,
                compartment.toJSON()
              );
            } catch (socketError) {
              console.warn(
                "Compartment socket skipped:",
                socketError?.message ||
                  socketError
              );
            }
          }
        } catch (compartmentError) {
          console.warn(
            "Unable to update compartment:",
            compartmentError?.message ||
              compartmentError
          );
        }
      }

      /*
       * Delete.
       */
      await item.deleteOne();

      /*
       * Audit.
       */
      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user || null,

        action:
          "waste.delete",

        entityType:
          "Waste",

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
          req?.ip,
      });

      res.json({
        success: true,
        data: {
          message:
            `${item.wasteId} removed`,
        },
      });
    }
  );


/*
|--------------------------------------------------------------------------
| GET /api/v1/waste/export
|--------------------------------------------------------------------------
*/

export const exportWaste =
  asyncHandler(
    async (req, res) => {
      const {
        from,
        to,
      } = req.query;

      const hospitalId =
        getHospitalId(req);

      const filter = {};

      /*
       * Only add hospital filter for
       * real Mongo hospital IDs.
       */
      if (
        hospitalId &&
        hospitalId !==
          DEFAULT_HOSPITAL_ID &&
        mongoose.Types.ObjectId.isValid(
          hospitalId
        )
      ) {
        filter.hospitalId =
          hospitalId;
      }

      /*
       * Date filtering.
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

        /*
         * If invalid date filter becomes empty,
         * remove it.
         */
        if (
          Object.keys(
            filter.createdAt
          ).length === 0
        ) {
          delete filter.createdAt;
        }
      }

      /*
       * Get records.
       */
      const rows =
        await Waste.find(filter)
          .sort({
            createdAt: 1,
          })
          .lean();

      /*
       * CSV header.
       */
      const header = [
        "waste_id",
        "created_at",
        "category",
        "item_type",
        "weight_kg",
        "source_location",
        "robot_id",
        "compartment_id",
        "status",
        "ai_confidence",
        "human_reviewed",
        "original_category",
        "collected_at",
      ];

      /*
       * Escape CSV values.
       */
      const escape = (value) => {
        return `"${String(
          value ?? ""
        ).replace(
          /"/g,
          '""'
        )}"`;
      };

      /*
       * Build CSV.
       */
      const csv = [
        header.join(","),
        ...rows.map((row) =>
          [
            row.wasteId,

            row.createdAt
              ? new Date(
                  row.createdAt
                ).toISOString()
              : "",

            row.category,

            row.itemType,

            row.weight,

            row.sourceLocation,

            row.robotId,

            row.compartmentId,

            row.status,

            row.confidence,

            row.reviewedByHuman,

            row.originalCategory,

            row.collectedAt
              ? new Date(
                  row.collectedAt
                ).toISOString()
              : "",
          ]
            .map(escape)
            .join(",")
        ),
      ].join("\n");

      /*
       * Audit.
       */
      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user || null,

        action:
          "waste.export",

        entityType:
          "Waste",

        entityId:
          `${rows.length} records`,

        ip:
          req?.ip,
      });

      /*
       * Filename.
       */
      const stamp =
        new Date()
          .toISOString()
          .slice(0, 10);

      /*
       * Headers.
       */
      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="meditwin-waste-${stamp}.csv"`
      );

      res.send(csv);
    }
  );
