const {
  checkUserCompanyAccess,
  throwIfAccessBlocked,
} = require("../services/companyAccess");
const { ROLES } = require("../config/roles");
const { isHybridMode } = require("../services/controlApiClient");

async function requireActiveCompany(req, res, next) {
  if (!req.user) return next();
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

  if (req.accessBlocked) {
    const blocked = req.accessBlocked;
    return res.status(403).json({
      error: blocked.message,
      code: blocked.reason.toUpperCase(),
      accessBlocked: blocked,
    });
  }

  // Hybrid desktop trusts pause/active from the control server only.
  if (isHybridMode()) return next();

  const blocked = await checkUserCompanyAccess(req.user);
  if (blocked) {
    return res.status(403).json({
      error: blocked.message,
      code: blocked.reason.toUpperCase(),
      accessBlocked: blocked,
    });
  }
  next();
}

module.exports = { requireActiveCompany };
