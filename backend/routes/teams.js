const express = require("express");
const users = require("../models/users");
const { DEPARTMENTS, ROLES } = require("../config/roles");
const { authenticate, requireRoles } = require("../middleware/auth");
const { requireActiveCompany } = require("../middleware/companyAccess");
const { requireFirmId } = require("../middleware/firmScope");
const { toPublicUser } = require("../utils/userPublic");
const asyncHandler = require("../middleware/asyncHandler");
const {
  isHybridMode,
  proxyTeamsRequest,
  ensureLocalUserMirror,
} = require("../services/controlApiClient");

const router = express.Router();

router.use(authenticate, requireRoles(ROLES.FIRM_ADMIN), requireActiveCompany);

function bearerToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

function sendControlResult(res, result) {
  return res.status(result.status).json(result.data);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyTeamsRequest("/", {
        token: bearerToken(req),
      });
      if (result.ok && Array.isArray(result.data)) {
        await Promise.all(result.data.map((member) => ensureLocalUserMirror(member)));
      }
      return sendControlResult(res, result);
    }

    const firmId = requireFirmId(req.user);
    const members = await users.listTeamByFirm(firmId);
    res.json(members.map(toPublicUser));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyTeamsRequest("/", {
        method: "POST",
        body: req.body,
        token: bearerToken(req),
      });
      if (result.ok && result.data) {
        await ensureLocalUserMirror(result.data);
      }
      return res.status(result.status).json(result.data);
    }

    const firmId = requireFirmId(req.user);
    const { name, email, contactNumber, department } = req.body;
    if (!name || !email || !department) {
      return res.status(400).json({
        error: "name, email, and department are required",
      });
    }
    const allowed = [DEPARTMENTS.PRODUCTION, DEPARTMENTS.QAQC];
    if (!department || !allowed.includes(department)) {
      return res.status(400).json({
        error: "department is required and must be production or qaqc",
      });
    }

    const created = await users.createTeamMember(
      {
        name,
        email,
        contactNumber,
        department,
        companyName: req.user.companyName,
      },
      firmId,
      req.user.id,
    );
    res.status(201).json(toPublicUser(created));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyTeamsRequest(`/${req.params.id}`, {
        method: "DELETE",
        token: bearerToken(req),
      });
      if (result.status === 204) {
        return res.status(204).send();
      }
      return sendControlResult(res, result);
    }

    const firmId = requireFirmId(req.user);
    const removed = await users.removeTeamMember(req.params.id, firmId);
    if (!removed) return res.status(404).json({ error: "Team member not found" });
    res.status(204).send();
  }),
);

module.exports = router;
