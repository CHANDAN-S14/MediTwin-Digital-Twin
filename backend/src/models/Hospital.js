import mongoose from 'mongoose';

/**
 * A department is also a node on the hospital grid, so it carries the grid
 * cell the robot drives to. Keeping them together means the map and the route
 * planner never disagree about where "ICU" is.
 */
const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cell: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    wasteVolumeHint: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    departments: { type: [departmentSchema], default: [] },
    /** Grid the route planner searches. 1 = obstacle (wall, fixed equipment). */
    grid: {
      width: { type: Number, default: 20 },
      height: { type: Number, default: 14 },
      obstacles: { type: [[Number]], default: [] },
    },
    wasteStation: {
      x: { type: Number, default: 2 },
      y: { type: Number, default: 12 },
    },
    complianceContact: { type: String, trim: true },
  },
  { timestamps: true }
);

hospitalSchema.methods.findDepartment = function (name) {
  const needle = String(name).toLowerCase();
  return this.departments.find((d) => d.name.toLowerCase() === needle);
};

export default mongoose.model('Hospital', hospitalSchema);
