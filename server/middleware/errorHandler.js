function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.errors = [];
  next(error);
}

function errorHandler(err, _req, res, _next) {
  const statusCode = Number(err.statusCode || err.status || 500);
  const message = err.message || "Internal server error";
  const errors = Array.isArray(err.errors) ? err.errors : [];

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
