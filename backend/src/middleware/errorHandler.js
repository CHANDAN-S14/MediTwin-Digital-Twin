import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};

/**
 * Turns anything thrown anywhere into one consistent JSON shape, and translates
 * database-level failures into messages an operator can act on.
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    message = 'Some fields need attention';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `"${err.value}" is not a valid ${err.path}`;
  }

  // Duplicate key — report which field collided, not the raw index name.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    message = `That ${field} is already in use`;
    details = err.keyValue;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} →`, err.stack || err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: { message, details, ...(env.isProd ? {} : { stack: err.stack }) },
  });
};
