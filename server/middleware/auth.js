const { verifyToken } = require("../utils/jwt");
const createHttpError = require("../utils/httpError");
const prisma = require("../lib/prisma");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next(createHttpError(401, "Unauthorized"));
  }

  const token = authHeader.split(" ")[1];
  let decoded;

  try {
    decoded = verifyToken(token);
  } catch (_error) {
    return next(createHttpError(401, "Invalid or expired token"));
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        user_id: decoded.user_id,
      },
      select: {
        user_id: true,
        account_status: true,
      },
    });

    if (!user) {
      return next(createHttpError(401, "Invalid or expired token"));
    }

    if (user.account_status === "suspended") {
      return next(createHttpError(403, "Account suspended. Please contact support."));
    }

    req.user = decoded;
    return next();
  } catch (_error) {
    return next(createHttpError(500, "Authentication check failed"));
  }
}

module.exports = authMiddleware;
