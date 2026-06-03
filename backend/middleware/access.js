const { ROLES, DEPARTMENTS } = require("../config/roles");

function firmAdminOrDepartments(...departments) {
  return (req, res, next) => {
    if (req.user.role === ROLES.FIRM_ADMIN) return next();
    if (
      req.user.role === ROLES.TEAM_MEMBER &&
      departments.includes(req.user.department)
    ) {
      return next();
    }
    return res.status(403).json({ error: "You do not have access to this resource" });
  };
}

const productionAccess = firmAdminOrDepartments(DEPARTMENTS.PRODUCTION);
const qaqcAccess = firmAdminOrDepartments(DEPARTMENTS.QAQC);
const adminAccess = firmAdminOrDepartments(DEPARTMENTS.ADMIN);
const bmrReadAccess = firmAdminOrDepartments(
  DEPARTMENTS.PRODUCTION,
  DEPARTMENTS.QAQC,
);

module.exports = {
  firmAdminOrDepartments,
  productionAccess,
  qaqcAccess,
  adminAccess,
  bmrReadAccess,
};
