const express = require("express");
const signatures = require("../models/signatures");
const { authenticate } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const { adminAccess, firmAdminOrDepartments } = require("../middleware/access");
const { DEPARTMENTS } = require("../config/roles");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const signatureReadAccess = firmAdminOrDepartments(
  DEPARTMENTS.ADMIN,
  DEPARTMENTS.QAQC,
);

router.use(authenticate, requireActiveCompany);

router.get(
  "/",
  signatureReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    res.json(await signatures.getAll(firmId));
  }),
);

router.post(
  "/",
  adminAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const { name, imageDataUrl } = req.body;
    if (!name || !imageDataUrl) {
      return res
        .status(400)
        .json({ error: "name and imageDataUrl are required" });
    }
    const created = await signatures.create(req.body, firmId);
    res.status(201).json(created);
  }),
);

router.delete(
  "/:id",
  adminAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const removed = await signatures.remove(req.params.id, firmId);
    if (!removed) return res.status(404).json({ error: "Signature not found" });
    res.status(204).send();
  }),
);

module.exports = router;
