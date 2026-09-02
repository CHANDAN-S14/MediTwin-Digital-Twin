import mongoose from "mongoose";

const WasteSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Waste ID
    |--------------------------------------------------------------------------
    | Example:
    | MW-0001
    | MW-0002
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
    |
    | Optional in demo mode.
    |
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
    |
    | yellow
    | red
    | blue
    | general
    |
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
    |
    | Preserves the first AI prediction even if a human changes it.
    |
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
    | Example:
    | OT
    | ICU
    | Ward
    | General
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
    | Robot
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
    | Compartment
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
    | Robot task
    |--------------------------------------------------------------------------
    */
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    |
    | The system can move through these states:
    |
    | pending
    | confirmed
    | dispatched
    | moving_to_pickup
    | arrived_at_pickup
    | collecting
    | moving_to_bin
    | depositing
    | collected
    | disposed
    | returning
    | completed
    | cancelled
    | failed
    |
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
    |
    | Normally 0-1.
    |
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

    /*
    |--------------------------------------------------------------------------
    | User who reviewed it
    |--------------------------------------------------------------------------
    |
    | Optional because demo mode does not require authentication.
    |
    */
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Collection timestamp
    |--------------------------------------------------------------------------
    */
    collectedAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Disposal timestamp
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
