const { ROLES, canAccessFirm } = require("../config/roles");

function getActorFirmId(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;
  return user.firmId;
}

function assertFirmResource(user, resource) {
  if (!resource) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (!resource.firmId) return false;
  return canAccessFirm(user, resource.firmId);
}

function requireFirmId(user) {
  const firmId = getActorFirmId(user);
  if (!firmId) {
    const error = new Error("Firm context required");
    error.status = 403;
    throw error;
  }
  return firmId;
}

module.exports = { getActorFirmId, assertFirmResource, requireFirmId };
