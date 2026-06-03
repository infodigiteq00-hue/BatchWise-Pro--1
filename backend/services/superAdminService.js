const firms = require("../models/firms");
const users = require("../models/users");
const { toPublicUser } = require("../utils/userPublic");
const { unifiedStatus } = require("./mappedStatus");

async function getDashboard() {
  const companies = await firms.listWithStats();
  const firmAdmins = await users.listFirmAdminsWithStats();
  const pendingAdmins = firmAdmins.filter((a) => a.status === "pending_signup");

  const adminForCompany = (company) =>
    firmAdmins.find(
      (a) =>
        a.firmId === company.id ||
        (a.companyName &&
          company.companyName &&
          a.companyName.trim().toLowerCase() ===
            company.companyName.trim().toLowerCase()),
    ) ?? null;

  return {
    totals: {
      companies: companies.length,
      firmAdmins: firmAdmins.length,
      pendingFirmAdmins: pendingAdmins.length,
      teamMembers: companies.reduce((n, c) => n + c.teamMemberCount, 0),
    },
    companies: companies.map((c) => {
      const admin = adminForCompany(c);
      return {
        ...c,
        status: unifiedStatus(c, admin),
      };
    }),
    firmAdmins: firmAdmins.map((a) => {
      const company =
        companies.find((c) => c.id === a.firmId) ??
        companies.find(
          (c) =>
            a.companyName &&
            c.companyName &&
            a.companyName.trim().toLowerCase() ===
              c.companyName.trim().toLowerCase(),
        );
      return {
        ...toPublicUser(a),
        memberCount: a.memberCount,
        status: unifiedStatus(company, a),
      };
    }),
  };
}

module.exports = { getDashboard };
