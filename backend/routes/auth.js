const express = require("express");
const authService = require("../services/authService");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body);
    res.json(result);
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.getMe(req.user.id);
    res.json(result);
  }),
);

module.exports = router;
