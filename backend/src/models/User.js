import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from './constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'staff' },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    department: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

/** Accepts a virtual `password` and hashes it on save. */
userSchema.virtual('password').set(function (plain) {
  this._plainPassword = plain;
});

userSchema.pre('save', async function (next) {
  if (!this._plainPassword) return next();
  this.passwordHash = await bcrypt.hash(this._plainPassword, 12);
  this._plainPassword = undefined;
  next();
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    hospitalId: this.hospitalId,
    department: this.department,
    lastLoginAt: this.lastLoginAt,
  };
};

export default mongoose.model('User', userSchema);
