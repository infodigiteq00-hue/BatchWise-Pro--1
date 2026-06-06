const express = require("express");
const authService = require("../services/authService");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const {
  isHybridMode,
  proxyAuthRequest,
  resolveControlSession,
  clearSessionCache,
} = require("../services/controlApiClient");

const router = express.Router();

function sendControlResult(res, result) {
  return res.status(result.status).json(result.data);
}

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyAuthRequest("/signup", {
        method: "POST",
        body: req.body,
      });
      return sendControlResult(res, result);
    }
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyAuthRequest("/login", {
        method: "POST",
        body: req.body,
      });
      if (result.ok && result.data?.token) {
        clearSessionCache(result.data.token);
        await resolveControlSession(result.data.token, { forceRefresh: true });
      }
      return sendControlResult(res, result);
    }
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyAuthRequest("/forgot-password", {
        method: "POST",
        body: req.body,
      });
      return sendControlResult(res, result);
    }
    const result = await authService.requestPasswordReset(req.body);
    res.json(result);
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const result = await proxyAuthRequest("/reset-password", {
        method: "POST",
        body: req.body,
      });
      return sendControlResult(res, result);
    }
    const result = await authService.resetPassword(req.body);
    res.json(result);
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (isHybridMode()) {
      const token =
        req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null;
      const result = await proxyAuthRequest("/me", {
        method: "GET",
        token,
      });
      if (result.ok && token) {
        clearSessionCache(token);
        await resolveControlSession(token, { forceRefresh: true });
      }
      return sendControlResult(res, result);
    }
    const result = await authService.getMe(req.user.id);
    res.json(result);
  }),
);

module.exports = router;
