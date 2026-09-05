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
*/

const DEFAULT_HOSPITAL_ID =
  "DEFAULT_HOSPITAL";


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
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
| SAFE AUDIT
|--------------------------------------------------------------------------
*/

const safeAudit = async (payload) => {
  try {
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
| FIND WASTE BY MONGO ID OR MW ID
|--------------------------------------------------------------------------
*/

const byAnyId = (
  id,
  hospitalId
) => {
  const value = String(
    id || ""
  ).trim();

  if (
    mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    const filter = {
      _id: value,
    };

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

    return filter;
  }

  const filter = {
    wasteId:
      value.toUpperCase(),
  };

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

  return filter;
};


/*
|--------------------------------------------------------------------------
| NORMALIZE CATEGORY
|--------------------------------------------------------------------------
*/

const normalizeCategory = (
  category
) => {
  const value = String(
    category || ""
  )
    .trim()
    .toLowerCase();

  if (
    value.includes("yellow")
  ) {
    return "yellow";
  }

  if (
    value.includes("red")
  ) {
    return "red";
  }

  if (
    value.includes("blue")
  ) {
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
| NORMALIZE DEPARTMENT
|--------------------------------------------------------------------------
*/

const normalizeDepartment = (
  department
) => {
  const value = String(
    department || "GENERAL"
  )
    .trim()
    .toUpperCase();

  const validDepartments = [
    "OT",
    "ICU",
    "WARD",
    "GENERAL",
    "EMERGENCY",
    "PHARMACY",
    "LABORATORY",
  ];

  return validDepartments.includes(
    value
  )
    ? value
    : "GENERAL";
};


/*
|--------------------------------------------------------------------------
| GET WASTE
|--------------------------------------------------------------------------
*/

export const listWaste =
  asyncHandler(
    async (req, res) => {
      const {
        page = 1,
        limit = 50,
        status,
        category,
        department,
        search,
        hospitalId,
      } = req.query;

      let activeHospitalId =
        getHospitalId(req);

      if (
        hospitalId &&
        hospitalId !==
          DEFAULT_HOSPITAL_ID &&
        mongoose.Types.ObjectId.isValid(
          hospitalId
        )
      ) {
        activeHospitalId =
          hospitalId;
      }

      const filter = {};

      if (
        activeHospitalId &&
        activeHospitalId !==
          DEFAULT_HOSPITAL_ID &&
        mongoose.Types.ObjectId.isValid(
          activeHospitalId
        )
      ) {
        filter.hospitalId =
          activeHospitalId;
      }

      if (status) {
        filter.status =
          String(status)
            .toLowerCase();
      }

      if (
        category &&
        category !== "ALL"
      ) {
        filter.category =
          normalizeCategory(
            category
          );
      }

      if (department) {
        filter.sourceLocation = {
          $regex:
            String(department),
          $options: "i",
        };
      }

      if (search) {
        const searchValue =
          String(search);

        filter.$or = [
          {
            category: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            sourceLocation: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            wasteId: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            robotId: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            itemType: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
        ];
      }

      const pageNumber =
        Math.max(
          1,
          Number(page) || 1
        );

      const limitNumber =
        Math.min(
          100,
          Math.max(
            1,
            Number(limit) || 50
          )
        );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const [
        records,
        total,
      ] = await Promise.all([
        Waste.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Waste.countDocuments(
          filter
        ),
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
                  total /
                    limitNumber
                ),
        },
      });
    }
  );


/*
|--------------------------------------------------------------------------
| GET SINGLE WASTE
|--------------------------------------------------------------------------
*/

export const getWaste =
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
| CREATE WASTE
|--------------------------------------------------------------------------
*/

export const createWaste =
  asyncHandler(
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
        reviewedByHuman,
      } = req.body;

      const hospitalId =
        getHospitalId(req);

      const normalizedCategory =
        normalizeCategory(
          category
        );

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

      const source =
        sourceLocation ||
        department;

      if (!source) {
        throw ApiError.badRequest(
          "Please provide the source department."
        );
      }

      const normalizedSource =
        normalizeDepartment(
          source
        );

      const numericWeight =
        Number(weight) || 0;

      if (
        numericWeight < 0
      ) {
        throw ApiError.badRequest(
          "Weight cannot be negative."
        );
      }

      /*
       * Generate next waste ID.
       */

      const count =
        await Waste.countDocuments();

      const wasteId =
        formatWasteId(
          count + 1
        );

      /*
       * Create waste.
       */

      const item =
        await Waste.create({
          wasteId,

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
            normalizedSource,

          robotId:
            robotId
              ? String(
                  robotId
                ).toUpperCase()
              : null,

          compartmentId:
            compartmentId
              ? String(
                  compartmentId
                ).toUpperCase()
              : null,

          status:
            String(
              status ||
                "pending"
            ).toLowerCase(),

          confidence:
            Math.min(
              1,
              Math.max(
                0,
                Number(
                  confidence
                ) || 0
              )
            ),

          collectedAt:
            collectedAt
              ? new Date(
                  collectedAt
                )
              : null,

          reviewedByHuman:
            Boolean(
              reviewedByHuman
            ),

          ...(taskId &&
          mongoose.Types.ObjectId.isValid(
            taskId
          )
            ? {
                taskId,
              }
            : {}),
        });

      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user ||
          null,

        action:
          "waste.create",

        entityType:
          "Waste",

        entityId:
          item.wasteId,

        ip: req?.ip,
      });

      try {
        emitToHospital(
          hospitalId,
          EVENTS.WASTE_COLLECTED,
          item.toJSON()
        );
      } catch (socketError) {
        console.warn(
          "Waste socket skipped:",
          socketError?.message ||
            socketError
        );
      }

      res.status(201).json({
        success: true,
        data: item,
      });
    }
  );


/*
|--------------------------------------------------------------------------
| UPDATE WASTE ROBOT ASSIGNMENT
|--------------------------------------------------------------------------
|
| Used internally when a robot is dispatched.
|
|--------------------------------------------------------------------------
*/

export const assignRobotToWaste =
  asyncHandler(
    async (req, res) => {
      const {
        robotId,
        department,
        taskId,
        category,
        confidence,
      } = req.body || {};

      if (!robotId) {
        throw ApiError.badRequest(
          "robotId is required."
        );
      }

      const hospitalId =
        getHospitalId(req);

      const waste =
        await Waste.findOne(
          byAnyId(
            req.params.id,
            hospitalId
          )
        );

      if (!waste) {
        throw ApiError.notFound(
          `No waste record ${req.params.id}`
        );
      }

      waste.robotId =
        String(
          robotId
        ).toUpperCase();

      if (department) {
        waste.sourceLocation =
          normalizeDepartment(
            department
          );
      }

      if (category) {
        waste.category =
          normalizeCategory(
            category
          );
      }

      if (
        confidence !==
          undefined &&
        confidence !== null
      ) {
        waste.confidence =
          Math.min(
            1,
            Math.max(
              0,
              Number(
                confidence
              ) || 0
            )
          );
      }

      if (
        taskId &&
        mongoose.Types.ObjectId.isValid(
          taskId
        )
      ) {
        waste.taskId =
          taskId;
      }

      waste.status =
        "dispatched";

      await waste.save();

      try {
        emitToHospital(
          hospitalId,
          EVENTS.WASTE_COLLECTED,
          waste.toJSON()
        );
      } catch (socketError) {
        console.warn(
          "Waste assignment socket skipped:",
          socketError?.message ||
            socketError
        );
      }

      res.json({
        success: true,
        data: waste,
      });
    }
  );


/*
|--------------------------------------------------------------------------
| RECLASSIFY WASTE
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
        normalizeCategory(
          category
        );

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

      if (req?.user?._id) {
        item.reviewedBy =
          req.user._id;
      }

      await item.save();

      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user ||
          null,

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

        ip: req?.ip,
      });

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
          "Classification socket skipped:",
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
| DELETE WASTE
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
                      item.weight ||
                        0
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
        } catch (error) {
          console.warn(
            "Unable to update compartment:",
            error?.message ||
              error
          );
        }
      }

      await item.deleteOne();

      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user ||
          null,

        action:
          "waste.delete",

        entityType:
          "Waste",

        entityId:
          item.wasteId,

        ip: req?.ip,
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
| EXPORT WASTE
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

        if (
          Object.keys(
            filter.createdAt
          ).length === 0
        ) {
          delete filter.createdAt;
        }
      }

      const rows =
        await Waste.find(
          filter
        )
          .sort({
            createdAt: 1,
          })
          .lean();

      const header = [
        "waste_id",
        "created_at",
        "category",
        "item_type",
        "weight_kg",
        "source_location",
        "robot_id",
        "compartment_id",
        "task_id",
        "status",
        "ai_confidence",
        "human_reviewed",
        "original_category",
        "collected_at",
        "disposed_at",
      ];

      const escape = (
        value
      ) => {
        return `"${String(
          value ?? ""
        ).replace(
          /"/g,
          '""'
        )}"`;
      };

      const csv = [
        header.join(","),

        ...rows.map(
          (row) =>
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

              row.taskId,

              row.status,

              row.confidence,

              row.reviewedByHuman,

              row.originalCategory,

              row.collectedAt
                ? new Date(
                    row.collectedAt
                  ).toISOString()
                : "",

              row.disposedAt
                ? new Date(
                    row.disposedAt
                  ).toISOString()
                : "",
            ]
              .map(escape)
              .join(",")
        ),
      ].join("\n");

      await safeAudit({
        hospitalId:
          mongoose.Types.ObjectId.isValid(
            hospitalId
          )
            ? hospitalId
            : null,

        actor:
          req?.user ||
          null,

        action:
          "waste.export",

        entityType:
          "Waste",

        entityId:
          `${rows.length} records`,

        ip: req?.ip,
      });

      const stamp =
        new Date()
          .toISOString()
          .slice(0, 10);

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
