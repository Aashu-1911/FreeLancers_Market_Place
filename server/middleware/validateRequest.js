const { validationResult } = require("express-validator");

function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((entry) => ({
    field: entry.path,
    message: entry.msg,
  }));

  const error = new Error("Validation failed");
  error.statusCode = 400;
  error.errors = errors;
  return next(error);
}

module.exports = validateRequest;
