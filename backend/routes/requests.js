const express = require("express");
const path = require("path");
const requests = require("../models/requests");
const { authenticate } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const {
  productionAccess,
  qaqcAccess,
  bmrReadAccess,
} = require("../middleware/access");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(authenticate, requireActiveCompany);

router.get(
  "/",
  bmrReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const { status } = req.query;
    res.json(await requests.getAll(firmId, status));
  }),
);

router.get(
  "/:id/stamped-pdf",
  bmrReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const item = await requests.getById(req.params.id, firmId);
    if (!item || item.status !== "approved" || !item.approval) {
      return res.status(404).json({ error: "Stamped PDF not found" });
    }

    const hasFile = await requests.stampedPdfExists(item.id);
    if (!hasFile) {
      return res.status(404).json({ error: "Stamped PDF file not found" });
    }

    const safeName = `BMR_${String(item.productName || "document")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 60)}_${item.batchNumber}`;
    const download = req.query.download === "1";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${safeName}.pdf"`,
    );
    res.sendFile(path.resolve(requests.getStampedPdfPath(item.id)));
  }),
);

router.get(
  "/:id",
  bmrReadAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const item = await requests.getByIdPublic(req.params.id, firmId);
    if (!item) return res.status(404).json({ error: "Request not found" });
    res.json(item);
  }),
);

router.post(
  "/",
  productionAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const { productName, batchNumber, batchSize } = req.body;
    const requestedBy =
      req.body.requestedBy || req.user.name || req.user.email;
    if (!productName || !batchNumber || !batchSize) {
      return res.status(400).json({
        error: "productName, batchNumber, and batchSize are required",
      });
    }
    const created = await requests.create(
      {
        productName,
        department: req.body.department || "Production",
        batchNumber,
        batchSize,
        remarks: req.body.remarks,
        requestedBy,
        requestedAt: req.body.requestedAt,
      },
      firmId,
    );
    res.status(201).json(created);
  }),
);

router.patch(
  "/:id/approve",
  qaqcAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const approval = {
      ...req.body,
      approvedBy: req.body.approvedBy || req.user.name || req.user.email,
    };
    const updated = await requests.approve(req.params.id, approval, firmId);
    if (!updated) return res.status(404).json({ error: "Request not found" });
    res.json(updated);
  }),
);

router.patch(
  "/:id/reject",
  qaqcAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const rejection = {
      ...req.body,
      rejectedBy: req.body.rejectedBy || req.user.name || req.user.email,
    };
    if (!rejection.rejectedBy) {
      return res.status(400).json({ error: "rejectedBy is required" });
    }
    const updated = await requests.reject(req.params.id, rejection, firmId);
    if (!updated) return res.status(404).json({ error: "Request not found" });
    res.json(updated);
  }),
);

router.patch(
  "/:id/stamped-pdf",
  qaqcAccess,
  asyncHandler(async (req, res) => {
    const firmId = requireFirmId(req.user);
    const { stampedPdfDataUrl } = req.body;
    if (!stampedPdfDataUrl) {
      return res.status(400).json({ error: "stampedPdfDataUrl is required" });
    }
    const updated = await requests.updateStampedPdf(
      req.params.id,
      stampedPdfDataUrl,
      firmId,
    );
    res.json(updated);
  }),
);

module.exports = router;
