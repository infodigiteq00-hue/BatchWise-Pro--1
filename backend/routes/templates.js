const express = require("express");
const templates = require("../models/templates");
const { authenticate } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const { adminAccess, firmAdminOrDepartments } = require("../middleware/access");
const { DEPARTMENTS } = require("../config/roles");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const templateReadAccess = firmAdminOrDepartments(
  DEPARTMENTS.PRODUCTION,
  DEPARTMENTS.ADMIN,
  DEPARTMENTS.QAQC,
);

router.use(authenticate, requireActiveCompany);

router.get(
  "/",
  templateReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    res.json(await templates.getAll(firmId));
  }),
);

router.get(
  "/:id/pdf",
  templateReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const item = await templates.getById(req.params.id, firmId);
    if (!item) return res.status(404).json({ error: "Template not found" });

    const hasFile = await templates.pdfExists(item.id);
    if (!hasFile) {
      return res.status(404).json({ error: "Template PDF file not found" });
    }

    const safeName = String(item.productName || "template")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 80);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}.pdf"`);
    const buf = await templates.readPdfBuffer(item.id);
    res.send(buf);
  }),
);

router.get(
  "/:id",
  templateReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const item = await templates.getByIdPublic(req.params.id, firmId);
    if (!item) return res.status(404).json({ error: "Template not found" });
    res.json(item);
  }),
);

router.post(
  "/",
  adminAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const { productName, pdfDataUrl } = req.body;
    if (!productName || !pdfDataUrl) {
      return res
        .status(400)
        .json({ error: "productName and pdfDataUrl are required" });
    }
    const created = await templates.create(req.body, firmId);
    res.status(201).json(created);
  }),
);

router.delete(
  "/:id",
  adminAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const removed = await templates.remove(req.params.id, firmId);
    if (!removed) return res.status(404).json({ error: "Template not found" });
    res.status(204).send();
  }),
);

module.exports = router;
