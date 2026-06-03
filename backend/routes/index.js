const express = require("express");
const auth = require("./auth");
const superAdmin = require("./superAdmin");
const teams = require("./teams");
const templates = require("./templates");
const signatures = require("./signatures");
const requests = require("./requests");
const settings = require("./settings");
const templatesModel = require("../models/templates");
const signaturesModel = require("../models/signatures");
const requestsModel = require("../models/requests");
const settingsModel = require("../models/settings");
const { authenticate } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const { ROLES, DEPARTMENTS } = require("../config/roles");
const asyncHandler = require("../middleware/asyncHandler");

function canReadBmr(user) {
  return (
    user.role === ROLES.FIRM_ADMIN ||
    (user.role === ROLES.TEAM_MEMBER &&
      [DEPARTMENTS.PRODUCTION, DEPARTMENTS.QAQC].includes(user.department))
  );
}

function canReadTemplatesAndSignatures(user) {
  return (
    user.role === ROLES.FIRM_ADMIN ||
    (user.role === ROLES.TEAM_MEMBER &&
      [DEPARTMENTS.PRODUCTION, DEPARTMENTS.ADMIN, DEPARTMENTS.QAQC].includes(
        user.department,
      ))
  );
}

function canReadSettings(user) {
  return (
    user.role === ROLES.FIRM_ADMIN ||
    (user.role === ROLES.TEAM_MEMBER && user.department === DEPARTMENTS.ADMIN)
  );
}

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", auth);
router.use("/super-admin", superAdmin);
router.use("/teams", teams);

router.get(
  "/state",
  authenticate,
  requireActiveCompany,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const payload = { firmId };

    if (canReadTemplatesAndSignatures(req.user)) {
      const [templatesList, signaturesList] = await Promise.all([
        templatesModel.getAll(firmId),
        signaturesModel.getAll(firmId),
      ]);
      Object.assign(payload, {
        templates: templatesList,
        signatures: signaturesList,
      });
    }

    if (canReadSettings(req.user)) {
      Object.assign(payload, await settingsModel.get(firmId));
    }

    if (canReadBmr(req.user)) {
      payload.requests = await requestsModel.getAll(firmId);
    }

    res.json(payload);
  }),
);

router.use("/templates", templates);
router.use("/signatures", signatures);
router.use("/requests", requests);
router.use("/settings", settings);

module.exports = router;
