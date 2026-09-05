import mongoose from "mongoose";

const WasteSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Waste ID
    |--------------------------------------------------------------------------
    */

    wasteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Hospital
    |--------------------------------------------------------------------------
    */

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: false,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Waste Category
    |--------------------------------------------------------------------------
    */

    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: [
        "yellow",
        "red",
        "blue",
        "general",
      ],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Original AI Category
    |--------------------------------------------------------------------------
    */

    originalCategory: {
      type: String,
      lowercase: true,
      trim: true,
      enum: [
        "yellow",
        "red",
        "blue",
        "general",
      ],
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Item Type
    |--------------------------------------------------------------------------
    */

    itemType: {
      type: String,
      trim: true,
      default: "Biomedical Waste",
    },

    /*
    |--------------------------------------------------------------------------
    | Weight
    |--------------------------------------------------------------------------
    */

    weight: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Source Department
    |--------------------------------------------------------------------------
    |
    | Examples:
    | OT
    | ICU
    | WARD
    | GENERAL
    |
    */

    sourceLocation: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Assigned Robot
    |--------------------------------------------------------------------------
    */

    robotId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Robot Compartment
    |--------------------------------------------------------------------------
    */

    compartmentId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Robot Task
    |--------------------------------------------------------------------------
    */

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      lowercase: true,
      trim: true,
      default: "pending",

      enum: [
        "pending",
        "confirmed",
        "dispatched",
        "moving_to_pickup",
        "arrived_at_pickup",
        "collecting",
        "moving_to_bin",
        "depositing",
        "collected",
        "disposed",
        "returning",
        "completed",
        "cancelled",
        "failed",
      ],

      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | AI Confidence
    |--------------------------------------------------------------------------
    */

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Human Review
    |--------------------------------------------------------------------------
    */

    reviewedByHuman: {
      type: Boolean,
      default: false,
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Collection Timestamp
    |--------------------------------------------------------------------------
    */

    collectedAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Disposal Timestamp
    |--------------------------------------------------------------------------
    */

    disposedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);


/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

WasteSchema.index({
  category: 1,
  status: 1,
});

WasteSchema.index({
  robotId: 1,
  status: 1,
});

WasteSchema.index({
  sourceLocation: 1,
  createdAt: -1,
});

WasteSchema.index({
  taskId: 1,
});

WasteSchema.index({
  createdAt: -1,
});


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

const Waste =
  mongoose.models.Waste ||
  mongoose.model(
    "Waste",
    WasteSchema
  );

export default Waste;
