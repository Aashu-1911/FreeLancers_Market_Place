const { verifyToken } = require("../utils/jwt");
const createHttpError = require("../utils/httpError");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next(createHttpError(401, "Unauthorized"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (_error) {
    return next(createHttpError(401, "Invalid or expired token"));
  }
}

module.exports = authMiddleware;
