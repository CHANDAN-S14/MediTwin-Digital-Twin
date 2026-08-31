/** An error carrying an HTTP status, so controllers can fail meaningfully. */
export default class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Sign in to continue') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have access to this') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg, details) { return new ApiError(409, msg, details); }
  static upstream(msg, details) { return new ApiError(502, msg, details); }
}
