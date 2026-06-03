const firms = require("../models/firms");
const { ROLES } = require("../config/roles");
const {
  COMPANY_PAUSED,
  ACCOUNT_INACTIVE,
} = require("../config/messages");

const FIRM_ADMIN_STATUSES = ["pending_signup", "active", "inactive", "paused"];

function accessBlockedResponse(user, firm) {
  if (firm?.status === "paused") {
    return {
      reason: "company_paused",
      message: COMPANY_PAUSED,
      firmId: firm.id,
      companyName: firm.companyName,
    };
  }
  if (firm?.status === "inactive") {
    return {
      reason: "company_inactive",
      message: "This company is inactive. Please contact the super admin.",
      firmId: firm.id,
      companyName: firm.companyName,
    };
  }
  if (user.role === ROLES.FIRM_ADMIN && user.status === "paused") {
    return {
      reason: "account_paused",
      message: COMPANY_PAUSED,
    };
  }
  if (user.role === ROLES.FIRM_ADMIN && user.status === "inactive") {
    return {
      reason: "account_inactive",
      message: ACCOUNT_INACTIVE,
    };
  }
  if (user.role === ROLES.TEAM_MEMBER && user.status !== "active") {
    return {
      reason: "account_inactive",
      message: ACCOUNT_INACTIVE,
    };
  }
  return null;
}

async function getFirmForUser(user) {
  if (!user.firmId) return null;
  return firms.getById(user.firmId);
}

async function checkUserCompanyAccess(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;
  const firm = await getFirmForUser(user);
  return accessBlockedResponse(user, firm);
}

function throwIfAccessBlocked(blocked) {
  if (!blocked) return;
  const error = new Error(blocked.message);
  error.status = 403;
  error.code = blocked.reason.toUpperCase();
  error.accessBlocked = blocked;
  throw error;
}

module.exports = {
  FIRM_ADMIN_STATUSES,
  checkUserCompanyAccess,
  throwIfAccessBlocked,
  accessBlockedResponse,
  getFirmForUser,
};
