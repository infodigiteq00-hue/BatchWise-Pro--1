const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const dataDir = path.resolve(
  __dirname,
  "..",
  process.env.DATA_DIR || "./data",
);

module.exports = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || "info.digiteq00@gmail.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "147852",
    name: process.env.SUPER_ADMIN_NAME || "Digiteq",
    companyName: process.env.SUPER_ADMIN_COMPANY || "Digiteq",
  },
  dataDir,
  templatesPdfDir: path.join(
    dataDir,
    process.env.TEMPLATES_PDF_DIR || "template-pdfs",
  ),
  stampedPdfDir: path.join(
    dataDir,
    process.env.STAMPED_PDF_DIR || "stamped-pdfs",
  ),
  files: {
    users: path.join(dataDir, "users.json"),
    firms: path.join(dataDir, "firms.json"),
    templates: path.join(dataDir, "templates.json"),
    signatures: path.join(dataDir, "signatures.json"),
    requests: path.join(dataDir, "requests.json"),
    settings: path.join(dataDir, "settings.json"),
  },
};
