const { superAdmin } = require("../config");
const { ROLES, DEPARTMENTS } = require("../config/roles");
const firms = require("./firms");
const { createId } = require("./jsonStore");
const controlStore = require("./controlStore");
const { hashPassword } = require("../utils/password");
const { hashResetToken } = require("../utils/resetToken");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

const {
  normalizeCompanyName,
  companyNamesMatch,
  findByCompanyName,
} = firms;

async function getAll() {
  return controlStore.readUsers();
}

async function findByEmail(email) {
  const normalized = normalizeEmail(email);
  const users = await getAll();
  return users.find((u) => u.email === normalized) ?? null;
}

async function findById(id) {
  const users = await getAll();
  return users.find((u) => u.id === id) ?? null;
}

async function saveUser(user) {
  const users = await getAll();
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) {
    users.push(user);
  } else {
    users[index] = user;
  }
  await controlStore.writeUsers(users);
  return user;
}

const TEAM_DEPARTMENTS = [DEPARTMENTS.PRODUCTION, DEPARTMENTS.QAQC];

function assertTeamDepartment(department) {
  if (!department || !TEAM_DEPARTMENTS.includes(department)) {
    const error = new Error(
      "department is required and must be production or qaqc",
    );
    error.status = 400;
    throw error;
  }
}

async function syncSuperAdminFromEnv() {
  const users = await getAll();
  const email = normalizeEmail(superAdmin.email);
  const passwordHash = await hashPassword(superAdmin.password);
  const idx = users.findIndex((u) => u.role === ROLES.SUPER_ADMIN);

  if (idx === -1) {
    users.push({
      id: createId(),
      email,
      name: superAdmin.name,
      contactNumber: "",
      role: ROLES.SUPER_ADMIN,
      department: null,
      firmId: null,
      companyName: superAdmin.companyName || superAdmin.name,
      status: "active",
      passwordHash,
      createdAt: new Date().toISOString(),
    });
  } else {
    users[idx].email = email;
    users[idx].name = superAdmin.name;
    users[idx].companyName = superAdmin.companyName || superAdmin.name;
    users[idx].passwordHash = passwordHash;
    users[idx].status = "active";
  }

  await controlStore.writeUsers(users);
  return users.find((u) => u.role === ROLES.SUPER_ADMIN);
}

async function syncFirmAdminFirmLinks() {
  const all = await getAll();
  let changed = false;

  for (const admin of all) {
    if (admin.role !== ROLES.FIRM_ADMIN) continue;
    const companyName = normalizeCompanyName(admin.companyName);
    if (!companyName) continue;

    let firm =
      (admin.firmId ? await firms.getById(admin.firmId) : null) ||
      (await findByCompanyName(companyName));

    if (!firm) {
      firm = await firms.create(companyName, "active");
      changed = true;
    }

    if (admin.firmId !== firm.id) {
      admin.firmId = firm.id;
      changed = true;
    }
    if (admin.companyName !== firm.companyName) {
      admin.companyName = firm.companyName;
      changed = true;
    }
  }

  if (changed) await controlStore.writeUsers(all);
}

async function syncTeamMemberCompanyNames() {
  const all = await getAll();
  let changed = false;
  for (const user of all) {
    if (user.role !== ROLES.TEAM_MEMBER || !user.firmId) continue;
    const companyName = await resolveCompanyNameForFirm(
      user.firmId,
      user.companyName,
    );
    if (companyName && user.companyName !== companyName) {
      user.companyName = companyName;
      changed = true;
    }
  }
  if (changed) await controlStore.writeUsers(all);
}

async function sanitizeTeamMemberDepartments() {
  const users = await getAll();
  let changed = false;
  for (const user of users) {
    if (user.role !== ROLES.TEAM_MEMBER) continue;
    if (user.department && TEAM_DEPARTMENTS.includes(user.department)) continue;
    if (user.department === "") {
      user.department = null;
      changed = true;
    }
  }
  if (changed) await controlStore.writeUsers(users);
}

async function resolveCompanyNameForFirm(firmId, preferred) {
  if (preferred) return preferred;
  const firm = await firms.getById(firmId);
  if (firm?.companyName) return firm.companyName;
  const admin = (await getAll()).find(
    (u) => u.firmId === firmId && u.role === ROLES.FIRM_ADMIN,
  );
  return admin?.companyName ?? null;
}

const FIRM_ADMIN_ACCOUNT_STATUSES = [
  "pending_signup",
  "active",
  "inactive",
  "paused",
];

async function findFirmAdminForCompany(companyName, excludeId = null) {
  const all = await getAll();
  const firm = await findByCompanyName(companyName);
  return (
    all.find((u) => {
      if (u.role !== ROLES.FIRM_ADMIN) return false;
      if (excludeId && u.id === excludeId) return false;
      if (firm && u.firmId === firm.id) return true;
      return companyNamesMatch(u.companyName, companyName);
    }) ?? null
  );
}

async function createPendingFirmAdmin(payload, createdBy) {
  const email = normalizeEmail(payload.email);
  const companyName = normalizeCompanyName(payload.companyName);
  if (!companyName) {
    const error = new Error("companyName is required");
    error.status = 400;
    throw error;
  }
  const existing = await findByEmail(email);
  if (existing) {
    const error = new Error("A user with this email already exists");
    error.status = 409;
    throw error;
  }

  const existingAdmin = await findFirmAdminForCompany(companyName);
  if (existingAdmin) {
    const error = new Error(
      "This company already has a firm admin. Use another company name or edit the existing admin.",
    );
    error.status = 409;
    throw error;
  }

  const firm = await firms.create(companyName, "inactive");

  const entry = {
    id: createId(),
    email,
    name: payload.name || companyName || email.split("@")[0],
    contactNumber: payload.contactNumber || "",
    companyName: firm.companyName,
    role: ROLES.FIRM_ADMIN,
    department: null,
    firmId: firm.id,
    status: "pending_signup",
    passwordHash: null,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  return saveUser(entry);
}

async function updateFirmAdmin(id, patch) {
  const user = await findById(id);
  if (!user || user.role !== ROLES.FIRM_ADMIN) return null;

  if (patch.email) {
    const normalized = normalizeEmail(patch.email);
    const clash = await findByEmail(normalized);
    if (clash && clash.id !== id) {
      const error = new Error("A user with this email already exists");
      error.status = 409;
      throw error;
    }
    user.email = normalized;
  }
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.contactNumber !== undefined) user.contactNumber = patch.contactNumber;
  if (patch.companyName !== undefined) {
    const nextCompany = normalizeCompanyName(patch.companyName);
    if (!nextCompany) {
      const error = new Error("companyName is required");
      error.status = 400;
      throw error;
    }
    const clash = await findFirmAdminForCompany(nextCompany, id);
    if (clash) {
      const error = new Error("This company already has a firm admin");
      error.status = 409;
      throw error;
    }
    let firm = await findByCompanyName(nextCompany);
    if (!firm) {
      firm = await firms.create(nextCompany, "active");
    }
    user.companyName = firm.companyName;
    user.firmId = firm.id;
  }
  if (
    patch.status &&
    FIRM_ADMIN_ACCOUNT_STATUSES.includes(patch.status)
  ) {
    user.status = patch.status;
    if (user.firmId && patch.status !== "pending_signup") {
      await firms.setStatus(user.firmId, patch.status);
    }
  }

  return saveUser(user);
}

async function setFirmAdminStatus(id, status) {
  if (!FIRM_ADMIN_ACCOUNT_STATUSES.includes(status)) {
    const error = new Error("Invalid firm admin status");
    error.status = 400;
    throw error;
  }
  return updateFirmAdmin(id, { status });
}

async function removeFirmAdmin(id) {
  const user = await findById(id);
  if (!user || user.role !== ROLES.FIRM_ADMIN) return false;
  const firmId = user.firmId;
  const all = await getAll();
  const next = all.filter((u) => u.id !== id);
  await controlStore.writeUsers(next);

  if (firmId) {
    const remaining = next.filter((u) => u.firmId === firmId);
    const hasTeam = remaining.some((u) => u.role === ROLES.TEAM_MEMBER);
    const hasOtherAdmin = remaining.some((u) => u.role === ROLES.FIRM_ADMIN);
    if (!hasTeam && !hasOtherAdmin) {
      await firms.remove(firmId);
    }
  }
  return true;
}

async function listFirmAdminsWithStats() {
  const admins = await listFirmAdmins();
  const all = await getAll();
  return admins.map((admin) => {
    const memberCount = admin.firmId
      ? all.filter(
          (u) => u.firmId === admin.firmId && u.role === ROLES.TEAM_MEMBER,
        ).length
      : 0;
    return {
      ...admin,
      memberCount,
      roleLabel: ROLES.FIRM_ADMIN,
    };
  });
}

async function writeAll(users) {
  await controlStore.writeUsers(users);
}

async function activateFirmAdmin(email, password, firmId, name) {
  const user = await findByEmail(email);
  if (!user) {
    const error = new Error("Email is not registered by a super admin");
    error.status = 403;
    throw error;
  }
  if (user.role !== ROLES.FIRM_ADMIN) {
    const error = new Error("This email is not designated as a firm admin");
    error.status = 403;
    throw error;
  }
  if (user.status === "active") {
    const error = new Error("Account already registered. Please log in.");
    error.status = 409;
    throw error;
  }
  if (user.status !== "pending_signup") {
    const error = new Error("Account cannot be registered");
    error.status = 403;
    throw error;
  }

  let firm = user.firmId ? await firms.getById(user.firmId) : null;
  if (!firm && user.companyName) {
    firm = await findByCompanyName(user.companyName);
  }
  if (!firm && user.companyName) {
    const clash = await findFirmAdminForCompany(user.companyName, user.id);
    if (clash) {
      const error = new Error("This company already has a firm admin");
      error.status = 409;
      throw error;
    }
    firm = await firms.create(user.companyName);
  }

  user.passwordHash = await hashPassword(password);
  user.status = "active";
  user.firmId = firm.id;
  await firms.setStatus(firm.id, "active");
  if (name && String(name).trim()) {
    user.name = String(name).trim();
  }
  user.registeredAt = new Date().toISOString();
  return saveUser(user);
}

async function createTeamMember(payload, firmId, createdBy) {
  assertTeamDepartment(payload.department);

  const email = normalizeEmail(payload.email);
  const existing = await findByEmail(email);
  if (existing) {
    const error = new Error("A user with this email already exists");
    error.status = 409;
    throw error;
  }

  const companyName = await resolveCompanyNameForFirm(
    firmId,
    payload.companyName,
  );

  const entry = {
    id: createId(),
    email,
    name: payload.name,
    contactNumber: payload.contactNumber || "",
    role: ROLES.TEAM_MEMBER,
    department: payload.department,
    firmId,
    companyName,
    status: "pending_signup",
    passwordHash: null,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  return saveUser(entry);
}

async function activateTeamMember(email, password, name) {
  const user = await findByEmail(email);
  if (!user) {
    const error = new Error("Email is not registered by your firm admin");
    error.status = 403;
    throw error;
  }
  if (user.role !== ROLES.TEAM_MEMBER) {
    const error = new Error("This email is not designated as a team member");
    error.status = 403;
    throw error;
  }
  if (user.status === "active") {
    const error = new Error("Account already registered. Please log in.");
    error.status = 409;
    throw error;
  }
  if (user.status !== "pending_signup") {
    const error = new Error("Account cannot be registered");
    error.status = 403;
    throw error;
  }

  user.passwordHash = await hashPassword(password);
  user.status = "active";
  if (name && String(name).trim()) {
    user.name = String(name).trim();
  }
  user.registeredAt = new Date().toISOString();
  return saveUser(user);
}

async function listFirmAdmins() {
  const users = await getAll();
  return users.filter((u) => u.role === ROLES.FIRM_ADMIN);
}

async function listTeamByFirm(firmId) {
  const users = await getAll();
  return users.filter(
    (u) => u.firmId === firmId && u.role === ROLES.TEAM_MEMBER,
  );
}

async function removeTeamMember(id, firmId) {
  const user = await findById(id);
  if (!user || user.firmId !== firmId || user.role !== ROLES.TEAM_MEMBER) {
    return false;
  }
  const users = await getAll();
  const next = users.filter((u) => u.id !== id);
  await controlStore.writeUsers(next);
  return true;
}

function teamMemberMissingDepartment(user) {
  return user.role === ROLES.TEAM_MEMBER && !user.department;
}

async function setPasswordReset(email, tokenHash, expiresAt) {
  const user = await findByEmail(email);
  if (!user) return null;
  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = expiresAt;
  return saveUser(user);
}

async function findByPasswordResetToken(token) {
  const tokenHash = hashResetToken(token);
  const all = await getAll();
  return all.find((u) => u.passwordResetToken === tokenHash) ?? null;
}

async function updatePasswordAndClearReset(userId, password) {
  const user = await findById(userId);
  if (!user) return null;
  user.passwordHash = await hashPassword(password);
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return saveUser(user);
}

function clearPasswordResetFields(user) {
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
}

module.exports = {
  normalizeEmail,
  getAll,
  findByEmail,
  findById,
  saveUser,
  writeAll,
  syncSuperAdminFromEnv,
  sanitizeTeamMemberDepartments,
  syncFirmAdminFirmLinks,
  syncTeamMemberCompanyNames,
  assertTeamDepartment,
  teamMemberMissingDepartment,
  FIRM_ADMIN_ACCOUNT_STATUSES,
  createPendingFirmAdmin,
  updateFirmAdmin,
  setFirmAdminStatus,
  removeFirmAdmin,
  listFirmAdminsWithStats,
  activateFirmAdmin,
  activateTeamMember,
  createTeamMember,
  listFirmAdmins,
  listTeamByFirm,
  removeTeamMember,
  setPasswordReset,
  findByPasswordResetToken,
  updatePasswordAndClearReset,
  clearPasswordResetFields,
};
