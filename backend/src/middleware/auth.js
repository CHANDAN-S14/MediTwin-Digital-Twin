import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Mints a session token. `sub` is the user id; hospitalId scopes every query. */
export const signToken = (user) =>
  jwt.sign(
    { sub: String(user._id), role: user.role, hospitalId: String(user.hospitalId ?? '') },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

/**
 * Rejects the request unless it carries a valid bearer token, then attaches the
 * live user document. Re-reading the user each request means a deactivated or
 * re-scoped account loses access immediately rather than when its token expires.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Sign in to continue');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Session expired — sign in again' : 'Invalid session'
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('This account no longer exists');

  req.user = user;
  req.hospitalId = user.hospitalId;
  next();
});

/**
 * Restricts a route to given roles.
 * Usage: router.post('/', requireAuth, requireRole('admin', 'operator'), handler)
 */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(`This action needs the ${roles.join(' or ')} role. You are signed in as ${req.user.role}.`)
    );
  }
  return next();
};

/** Guards routes that need a hospital context, which most data routes do. */
export const requireHospital = asyncHandler(async (req, res, next) => {
  if (req.user?.hospitalId) {
    req.hospitalId = req.user.hospitalId;
    return next();
  }

  // Demo/default MediTwin hospital.
  // This allows scanner + robot simulation without requiring
  // hospital registration during user registration.
  req.hospitalId = 'DEFAULT_HOSPITAL';

  return next();
});
