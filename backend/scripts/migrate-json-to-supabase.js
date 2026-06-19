/**
 * One-time import of users.json + firms.json into Supabase.
 * Run after applying supabase/migrations/20250619000000_control_plane.sql
 *
 * Usage (from repo root):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:supabase --prefix backend
 */
const fs = require("fs");
const path = require("path");

const envLocal = path.join(__dirname, "..", ".env.local");
const envFile = path.join(__dirname, "..", ".env");
require("dotenv").config({
  path: fs.existsSync(envLocal) ? envLocal : envFile,
});

const { files, dataDir } = require("../config");
const controlStore = require("../models/controlStore");
const { isSupabaseEnabled } = require("../db/supabase");

async function main() {
  if (!isSupabaseEnabled()) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.",
    );
    process.exit(1);
  }

  const firmsPath = files.firms;
  const usersPath = files.users;

  if (!fs.existsSync(firmsPath) && !fs.existsSync(usersPath)) {
    console.error(`No JSON data found under ${dataDir}`);
    process.exit(1);
  }

  const firms = fs.existsSync(firmsPath)
    ? JSON.parse(fs.readFileSync(firmsPath, "utf8"))
    : [];
  const users = fs.existsSync(usersPath)
    ? JSON.parse(fs.readFileSync(usersPath, "utf8"))
    : [];

  console.log(`Importing ${firms.length} firms and ${users.length} users…`);
  await controlStore.writeFirms(
    firms.map((f) => ({ status: "active", ...f })),
  );
  await controlStore.writeUsers(users);

  const verifyFirms = await controlStore.readFirms();
  const verifyUsers = await controlStore.readUsers();
  console.log(
    `Done. Supabase now has ${verifyFirms.length} firms and ${verifyUsers.length} users.`,
  );
  console.log(
    "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on your control server (Render) and restart the API.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
