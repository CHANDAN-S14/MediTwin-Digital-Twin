import mongoose from 'mongoose';
import { WASTE_CATEGORIES } from './constants.js';

const alternativeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: WASTE_CATEGORIES,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

const wasteSchema = new mongoose.Schema(
  {
    wasteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /*
     * Hospital is OPTIONAL.
     *
     * This allows a newly registered user to use the AI scanner
     * without first creating/joining a hospital.
     */
  hospitalId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Hospital',
  required: false,
  default: null,
  index: true,
},

    category: {
      type: String,
      enum: WASTE_CATEGORIES,
      required: true,
    },

    categoryLabel: {
      type: String,
    },

    itemType: {
      type: String,
      required: true,
      default: 'Classified item',
    },

    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    alternatives: {
      type: [alternativeSchema],
      default: [],
    },

    weight: {
      type: Number,
      default: 0,
      min: 0,
    },

    sourceLocation: {
      type: String,
      trim: true,
      default: 'Scanner Station',
    },

    compartmentSlot: {
      type: String,
    },

    modelVersion: {
      type: String,
      default: 'unknown',
    },

    needsReview: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        'classified',
        'pending',
        'collected',
        'segregated',
        'disposed',
        'cancelled',
      ],
      default: 'classified',
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Generate an easy-to-read waste record.
 */
wasteSchema.index({
  category: 1,
  createdAt: -1,
});

wasteSchema.index({
  hospitalId: 1,
  createdAt: -1,
});

const Waste =
  mongoose.models.Waste ||
  mongoose.model('Waste', wasteSchema);

export default Waste;