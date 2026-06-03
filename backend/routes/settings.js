const express = require("express");
const settings = require("../models/settings");
const { authenticate } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const { adminAccess } = require("../middleware/access");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(authenticate, requireActiveCompany, adminAccess);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    res.json(await settings.get(firmId));
  }),
);

router.patch(
  "/",
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const updated = await settings.update(firmId, req.body);
    res.json(updated);
  }),
);

module.exports = router;
