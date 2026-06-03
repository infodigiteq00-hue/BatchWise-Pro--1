const {
  checkUserCompanyAccess,
  throwIfAccessBlocked,
} = require("../services/companyAccess");
const { ROLES } = require("../config/roles");

async function requireActiveCompany(req, res, next) {
  if (!req.user) return next();
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

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
