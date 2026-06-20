/**
 * One-time import of local JSON + PDF files into Supabase.
 * Run after applying both SQL migrations in supabase/migrations/.
 *
 * Usage:
 *   npm run migrate:supabase --prefix backend
 */
const fs = require("fs");
const path = require("path");

const envLocal = path.join(__dirname, "..", ".env.local");
const envFile = path.join(__dirname, "..", ".env");
require("dotenv").config({
  path: fs.existsSync(envLocal) ? envLocal : envFile,
});

const { files, dataDir, templatesPdfDir, stampedPdfDir } = require("../config");
const controlStore = require("../models/controlStore");
const operationalStore = require("../models/operationalStore");
const { isSupabaseEnabled } = require("../db/supabase");
const cloudPdfs = require("../utils/supabasePdfStorage");

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function uploadLocalPdfs(dir, uploadFn) {
  if (!fs.existsSync(dir)) return 0;
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".pdf"));
  let count = 0;
  for (const name of names) {
    const id = name.replace(/\.pdf$/, "");
    const buf = fs.readFileSync(path.join(dir, name));
    const dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;
    await uploadFn(id, dataUrl);
    count += 1;
  }
  return count;
}

async function main() {
  if (!isSupabaseEnabled()) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.",
    );
    process.exit(1);
  }

  const firms = readJson(files.firms).map((f) => ({ status: "active", ...f }));
  const users = readJson(files.users);
  const templates = readJson(files.templates);
  const signatures = readJson(files.signatures);
  const requests = readJson(files.requests);
  const settings = readJson(files.settings);

  console.log("Importing control plane…");
  await controlStore.writeFirms(firms);
  await controlStore.writeUsers(users);

  console.log("Importing BMR metadata…");
  await operationalStore.writeTemplates(templates);
  await operationalStore.writeSignatures(signatures);
  await operationalStore.writeRequests(requests);
  await operationalStore.writeSettingsRows(
    Array.isArray(settings) ? settings : [],
  );

  console.log("Uploading template PDFs…");
  const templatePdfCount = await uploadLocalPdfs(
    templatesPdfDir,
    cloudPdfs.saveTemplateFromDataUrl,
  );
  console.log("Uploading stamped PDFs…");
  const stampedPdfCount = await uploadLocalPdfs(
    stampedPdfDir,
    cloudPdfs.saveStampedFromDataUrl,
  );

  console.log(`
Done (${dataDir}):
  firms: ${firms.length}
  users: ${users.length}
  templates: ${templates.length} (+ ${templatePdfCount} PDFs)
  signatures: ${signatures.length}
  requests: ${requests.length} (+ ${stampedPdfCount} stamped PDFs)
  settings rows: ${Array.isArray(settings) ? settings.length : 0}
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
