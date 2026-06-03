const express = require("express");
const users = require("../models/users");
const firms = require("../models/firms");
const superAdminService = require("../services/superAdminService");
const { applyUnifiedStatus } = require("../services/mappedStatus");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES } = require("../config/roles");
const { toPublicUser } = require("../utils/userPublic");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(authenticate, requireRoles(ROLES.SUPER_ADMIN));

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    res.json(await superAdminService.getDashboard());
  }),
);

router.get(
  "/companies",
  asyncHandler(async (_req, res) => {
    res.json(await firms.listWithStats());
  }),
);

router.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const { companyName, status } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }
    const created = await firms.create(companyName, status || "active");
    res.status(201).json({
      ...created,
      memberCount: 0,
      teamMemberCount: 0,
      firmAdminCount: 0,
      firmAdmins: [],
    });
  }),
);

router.patch(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const { companyName, status } = req.body;
    if (status) {
      await applyUnifiedStatus(req.params.id, status);
    }
    const updated = await firms.update(req.params.id, { companyName });
    if (!updated) return res.status(404).json({ error: "Company not found" });
    const memberCount = await firms.countMembers(req.params.id);
    res.json({ ...updated, memberCount });
  }),
);

router.patch(
  "/companies/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const updated = await applyUnifiedStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Company not found" });
    res.json(updated);
  }),
);

router.delete(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const removed = await firms.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: "Company not found" });
    res.status(204).send();
  }),
);

router.get(
  "/firm-admins",
  asyncHandler(async (_req, res) => {
    const list = await users.listFirmAdminsWithStats();
    res.json(list.map((a) => ({ ...toPublicUser(a), memberCount: a.memberCount })));
  }),
);

router.post(
  "/firm-admins",
  asyncHandler(async (req, res) => {
    const { email, contactNumber, companyName } = req.body;
    if (!email || !contactNumber || !companyName) {
      return res.status(400).json({
        error: "email, contactNumber, and companyName are required",
      });
    }
    const created = await users.createPendingFirmAdmin(
      {
        name: req.body.name || companyName,
        email,
        contactNumber,
        companyName,
      },
      req.user.id,
    );
    res.status(201).json({
      ...toPublicUser(created),
      role: ROLES.FIRM_ADMIN,
      memberCount: 0,
    });
  }),
);

router.patch(
  "/firm-admins/:id",
  asyncHandler(async (req, res) => {
    const updated = await users.updateFirmAdmin(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Firm admin not found" });
    const all = await users.getAll();
    const memberCount = updated.firmId
      ? all.filter(
          (u) => u.firmId === updated.firmId && u.role === ROLES.TEAM_MEMBER,
        ).length
      : 0;
    res.json({ ...toPublicUser(updated), memberCount });
  }),
);

router.patch(
  "/firm-admins/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const admin = await users.findById(req.params.id);
    if (!admin || admin.role !== ROLES.FIRM_ADMIN) {
      return res.status(404).json({ error: "Firm admin not found" });
    }
    if (status === "pending_signup") {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (admin.firmId) {
      await applyUnifiedStatus(admin.firmId, status);
    } else {
      await users.setFirmAdminStatus(req.params.id, status);
    }
    const updated = await users.findById(req.params.id);
    res.json(toPublicUser(updated));
  }),
);

router.delete(
  "/firm-admins/:id",
  asyncHandler(async (req, res) => {
    const removed = await users.removeFirmAdmin(req.params.id);
    if (!removed) return res.status(404).json({ error: "Firm admin not found" });
    res.status(204).send();
  }),
);

module.exports = router;
