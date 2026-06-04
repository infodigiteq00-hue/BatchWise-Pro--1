const users = require("../models/users");
const { ROLES, getDashboardForUser } = require("../config/roles");
const { ROLE_NOT_ASSIGNED, ACCOUNT_INACTIVE } = require("../config/messages");
const { MIN_PASSWORD_LENGTH } = require("../config/auth");
const {
  frontendUrl,
  passwordResetExpiresMinutes,
} = require("../config");
const { comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { toPublicUser } = require("../utils/userPublic");
const { generateResetToken, hashResetToken } = require("../utils/resetToken");
const { sendPasswordResetEmail } = require("./emailService");
const {
  checkUserCompanyAccess,
} = require("./companyAccess");

const PASSWORD_RESET_SENT_MESSAGE =
  "If an account exists for that email, password reset instructions have been sent.";

function rejectMissingTeamDepartment(user) {
  if (!users.teamMemberMissingDepartment(user)) return;
  const error = new Error(ROLE_NOT_ASSIGNED);
  error.status = 403;
  error.code = "ROLE_NOT_ASSIGNED";
  throw error;
}

function authResponse(user, accessBlocked = null) {
  const token = signToken({
    sub: user.id,
    role: user.role,
    department: user.department,
    firmId: user.firmId,
  });
  const response = {
    token,
    user: toPublicUser(user),
    dashboard: accessBlocked
      ? {
          role: user.role,
          department: user.department,
          firmId: user.firmId,
          tabs: [],
          defaultTab: null,
          homePath: "/company-paused",
        }
      : getDashboardForUser(user),
  };
  if (accessBlocked) {
    response.accessBlocked = accessBlocked;
  }
  return response;
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    const error = new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
    error.status = 400;
    throw error;
  }
}

function rejectInactiveAccount(user) {
  if (user.role === ROLES.SUPER_ADMIN) return;
  if (user.status === "inactive" || user.status === "paused") {
    const error = new Error(ACCOUNT_INACTIVE);
    error.status = 403;
    error.code = "ACCOUNT_INACTIVE";
    throw error;
  }
  if (user.status !== "active") {
    const error = new Error("Account is not active. Complete signup first.");
    error.status = 403;
    throw error;
  }
}

async function signup({ email, password, name }) {
  if (!email || !password || !name) {
    const error = new Error("name, email, and password are required");
    error.status = 400;
    throw error;
  }
  validatePassword(password);

  const pending = await users.findByEmail(email);
  if (!pending) {
    const error = new Error(
      "Email not found. Your organization must register you before you can sign up.",
    );
    error.status = 403;
    throw error;
  }
  if (pending.status === "active") {
    const error = new Error("Account already exists. Please log in.");
    error.status = 409;
    throw error;
  }
  if (pending.status !== "pending_signup") {
    const error = new Error("Account cannot be registered");
    error.status = 403;
    throw error;
  }

  if (pending.role === ROLES.FIRM_ADMIN) {
    const user = await users.activateFirmAdmin(email, password, null, name);
    const blocked = await checkUserCompanyAccess(user);
    return authResponse(user, blocked);
  }

  if (pending.role === ROLES.TEAM_MEMBER) {
    const user = await users.activateTeamMember(email, password, name);
    const blocked = await checkUserCompanyAccess(user);
    return authResponse(user, blocked);
  }

  const error = new Error(
    "This account cannot be completed via sign up. Please sign in or contact your administrator.",
  );
  error.status = 403;
  throw error;
}

async function login({ email, password }) {
  if (!email || !password) {
    const error = new Error("email and password are required");
    error.status = 400;
    throw error;
  }

  const user = await users.findByEmail(email);
  if (!user || !user.passwordHash) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  rejectInactiveAccount(user);

  if (user.role !== ROLES.SUPER_ADMIN) {
    rejectMissingTeamDepartment(user);
  }

  const blocked = await checkUserCompanyAccess(user);
  return authResponse(user, blocked);
}

function canSelfServePasswordReset(user) {
  if (!user?.passwordHash) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.status === "active";
}

async function requestPasswordReset({ email }) {
  if (!email) {
    const error = new Error("email is required");
    error.status = 400;
    throw error;
  }

  const user = await users.findByEmail(email);
  if (user && canSelfServePasswordReset(user)) {
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(
      Date.now() + passwordResetExpiresMinutes * 60 * 1000,
    ).toISOString();
    await users.setPasswordReset(user.email, tokenHash, expiresAt);

    const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  }

  return { message: PASSWORD_RESET_SENT_MESSAGE };
}

async function resetPassword({ token, password }) {
  if (!token || !password) {
    const error = new Error("token and password are required");
    error.status = 400;
    throw error;
  }
  validatePassword(password);

  const user = await users.findByPasswordResetToken(token);
  if (!user || !user.passwordResetExpires) {
    const error = new Error("Invalid or expired reset link");
    error.status = 400;
    throw error;
  }

  if (new Date(user.passwordResetExpires).getTime() < Date.now()) {
    users.clearPasswordResetFields(user);
    await users.saveUser(user);
    const error = new Error("Invalid or expired reset link");
    error.status = 400;
    throw error;
  }

  if (!canSelfServePasswordReset(user)) {
    const error = new Error("This account cannot reset its password");
    error.status = 403;
    throw error;
  }

  await users.updatePasswordAndClearReset(user.id, password);
  return {
    message: "Password updated. You can sign in with your new password.",
  };
}

async function getMe(userId) {
  const user = await users.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  rejectInactiveAccount(user);

  if (user.role !== ROLES.SUPER_ADMIN) {
    rejectMissingTeamDepartment(user);
  }

  const blocked = await checkUserCompanyAccess(user);
  return {
    user: toPublicUser(user),
    dashboard: blocked
      ? {
          role: user.role,
          department: user.department,
          firmId: user.firmId,
          tabs: [],
          defaultTab: null,
          homePath: "/company-paused",
        }
      : getDashboardForUser(user),
    accessBlocked: blocked ?? undefined,
  };
}

module.exports = {
  signup,
  login,
  getMe,
  authResponse,
  requestPasswordReset,
  resetPassword,
};
