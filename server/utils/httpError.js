function createHttpError(statusCode, message, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

module.exports = createHttpError;
