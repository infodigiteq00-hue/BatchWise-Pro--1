import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function copyIfMissing(src, dest) {
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const backendEnv = path.join(root, "backend", ".env");
const backendExample = path.join(root, "backend", ".env.example");
const frontendEnv = path.join(root, "frontend", ".env.local");
const frontendExample = path.join(root, "frontend", ".env.example");
const dataDir = path.join(root, "backend", "data");

console.log("BatchWise Pro — local setup\n");

if (copyIfMissing(backendExample, backendEnv)) {
  console.log("Created backend/.env from .env.example");
} else {
  console.log("backend/.env already exists (unchanged)");
}

if (copyIfMissing(frontendExample, frontendEnv)) {
  console.log("Created frontend/.env.local from .env.example");
} else {
  const local = fs.readFileSync(frontendEnv, "utf8");
  if (/onrender\.com|vercel\.app/i.test(local)) {
    console.log(
      "Warning: frontend/.env.local points at a hosted API. For local-only use, set:",
    );
    console.log("  VITE_API_URL=http://localhost:3001/api");
  } else {
    console.log("frontend/.env.local already exists (unchanged)");
  }
}

ensureDir(dataDir);
ensureDir(path.join(dataDir, "template-pdfs"));
ensureDir(path.join(dataDir, "stamped-pdfs"));
console.log(`Data folder ready: ${dataDir}`);

console.log(`
Next steps:
  1. Edit backend/.env — set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, JWT_SECRET
  2. npm run install:all   (if you have not installed dependencies yet)
  3. npm run dev           (API on :3001, web UI on :8080)
  4. Open http://localhost:8080 and sign in with your super admin credentials

All application data (users, firms, templates, PDFs) is stored under backend/data/
unless you set DATA_DIR in backend/.env to another folder on your PC.
`);
