const { files } = require("../config");
const { readCollection, writeCollection, createId } = require("./jsonStore");

async function getAllUsers() {
  return readCollection(files.users, []);
}

async function writeAllUsers(users) {
  await writeCollection(files.users, users);
}

const VALID_STATUSES = ["active", "inactive", "paused"];

function normalizeCompanyName(companyName) {
  return String(companyName || "").trim();
}

function companyNamesMatch(a, b) {
  return (
    normalizeCompanyName(a).toLowerCase() === normalizeCompanyName(b).toLowerCase()
  );
}

async function findByCompanyName(companyName) {
  const firms = await getAll();
  return (
    firms.find((f) => companyNamesMatch(f.companyName, companyName)) ?? null
  );
}

async function getAll() {
  const firms = await readCollection(files.firms, []);
  return firms.map((f) => ({
    status: "active",
    ...f,
  }));
}

async function getById(id) {
  const firms = await getAll();
  return firms.find((f) => f.id === id) ?? null;
}

async function create(companyName, status = "active") {
  const name = normalizeCompanyName(companyName);
  const existing = await findByCompanyName(name);
  if (existing) return existing;

  const firms = await readCollection(files.firms, []);
  const entry = {
    id: createId(),
    companyName: name,
    status: VALID_STATUSES.includes(status) ? status : "active",
    createdAt: new Date().toISOString(),
  };
  firms.push(entry);
  await writeCollection(files.firms, firms);
  return entry;
}

async function update(id, patch) {
  const firms = await readCollection(files.firms, []);
  const index = firms.findIndex((f) => f.id === id);
  if (index === -1) return null;
  if (patch.companyName !== undefined) {
    firms[index].companyName = patch.companyName;
  }
  if (patch.status !== undefined && VALID_STATUSES.includes(patch.status)) {
    firms[index].status = patch.status;
  }
  await writeCollection(files.firms, firms);
  return firms[index];
}

async function remove(id) {
  const firms = await readCollection(files.firms, []);
  const next = firms.filter((f) => f.id !== id);
  if (next.length === firms.length) return false;
  await writeCollection(files.firms, next);

  const allUsers = await getAllUsers();
  const remaining = allUsers.filter((u) => u.firmId !== id);
  if (remaining.length !== allUsers.length) {
    await writeAllUsers(remaining);
  }
  return true;
}

async function countMembers(firmId) {
  const all = await getAllUsers();
  return all.filter(
    (u) =>
      u.firmId === firmId &&
      (u.role === "team_member" || u.role === "firm_admin"),
  ).length;
}

async function listWithStats() {
  const firms = await getAll();
  const allUsers = await getAllUsers();

  return firms.map((firm) => {
    const firmAdmins = allUsers.filter(
      (u) =>
        u.role === "firm_admin" &&
        (u.firmId === firm.id ||
          (!u.firmId && companyNamesMatch(u.companyName, firm.companyName))),
    );
    const memberCount = allUsers.filter(
      (u) => u.firmId === firm.id && u.role === "team_member",
    ).length;

    return {
      ...firm,
      memberCount,
      teamMemberCount: memberCount,
      firmAdminCount: firmAdmins.length,
      firmAdmins: firmAdmins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        contactNumber: a.contactNumber,
        status: a.status,
      })),
    };
  });
}

async function setStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error("status must be active, inactive, or paused");
    error.status = 400;
    throw error;
  }
  return update(id, { status });
}

module.exports = {
  VALID_STATUSES,
  normalizeCompanyName,
  companyNamesMatch,
  findByCompanyName,
  getAll,
  getById,
  create,
  update,
  remove,
  countMembers,
  listWithStats,
  setStatus,
};
