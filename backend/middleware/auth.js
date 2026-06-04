const { verifyToken } = require("../utils/jwt");
const users = require("../models/users");
const { toPublicUser } = require("../utils/userPublic");
const asyncHandler = require("./asyncHandler");

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  if (typeof req.query.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return null;
}

async function authenticate(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = verifyToken(token);
    const user = await users.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        error: "Invalid or expired session",
        code: "SESSION_INVALID",
      });
    }
    if (user.role !== "super_admin" && user.status !== "active") {
      return res.status(401).json({
        error: "Invalid or expired session",
        code: "SESSION_INVALID",
      });
    }
    req.user = user;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

function requireFirmAccess(req, res, next) {
  const firmId = req.params.firmId || req.body.firmId || req.query.firmId;
  if (req.user.role === "super_admin") return next();
  if (firmId && firmId !== req.user.firmId) {
    return res.status(403).json({ error: "Access denied for this firm" });
  }
  next();
}

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = verifyToken(header.slice(7));
    const user = await users.findById(payload.sub);
    if (user?.status === "active") {
      req.user = user;
      req.auth = payload;
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

module.exports = {
  authenticate,
  requireRoles,
  requireFirmAccess,
  optionalAuth,
  toPublicUser,
};
