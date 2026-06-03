const firms = require("../models/firms");
const users = require("../models/users");
const { ROLES } = require("../config/roles");

const COMPANY_STATUSES = ["active", "inactive", "paused"];

function unifiedStatus(firm, admin) {
  if (admin?.status === "pending_signup") return "pending_signup";
  return firm?.status || "active";
}

async function findAdminForFirm(firmId) {
  const all = await users.getAll();
  return (
    all.find((u) => u.firmId === firmId && u.role === ROLES.FIRM_ADMIN) ?? null
  );
}

async function applyUnifiedStatus(firmId, status) {
  if (!COMPANY_STATUSES.includes(status)) {
    const error = new Error("status must be active, inactive, or paused");
    error.status = 400;
    throw error;
  }

  const firm = await firms.getById(firmId);
  if (!firm) return null;

  const admin = await findAdminForFirm(firmId);
  if (admin?.status === "pending_signup") {
    const error = new Error(
      "Cannot change status until the firm admin completes signup",
    );
    error.status = 400;
    throw error;
  }

  await firms.setStatus(firmId, status);
  if (admin) {
    await users.updateFirmAdmin(admin.id, { status });
  }

  return firms.getById(firmId);
}

module.exports = {
  unifiedStatus,
  findAdminForFirm,
  applyUnifiedStatus,
  COMPANY_STATUSES,
};
