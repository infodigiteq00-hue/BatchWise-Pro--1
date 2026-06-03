const users = require("./models/users");
const firms = require("./models/firms");
const templates = require("./models/templates");
const requests = require("./models/requests");

async function bootstrap() {
  await users.syncSuperAdminFromEnv();
  await templates.migrateDataUrlsToFiles();
  await requests.migrateStampedPdfsToFiles();
  await users.sanitizeTeamMemberDepartments();
  await users.syncFirmAdminFirmLinks();
  await users.syncTeamMemberCompanyNames();
  const allFirms = await firms.getAll();
  for (const firm of allFirms) {
    if (!firm.status) {
      await firms.update(firm.id, { status: "active" });
    }
  }
}

module.exports = { bootstrap };
