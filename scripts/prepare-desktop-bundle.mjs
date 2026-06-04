import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "desktop", "bundle");
const backendSrc = path.join(root, "backend");
const backendBundle = path.join(bundleRoot, "backend");
const uiBundle = path.join(bundleRoot, "ui");
const uiRunner = path.join(bundleRoot, "ui-runner");
const uiOutput = path.join(root, "frontend", ".vercel", "output");
const uiServerEntry = path.join(
  uiOutput,
  "functions",
  "__server.func",
  "index.mjs",
);

const BACKEND_COPY = [
  "server.js",
  "bootstrap.js",
  "config",
  "middleware",
  "models",
  "routes",
  "services",
  "utils",
  "package.json",
  "package-lock.json",
  ".env.example",
];

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function copyBackend() {
  fs.mkdirSync(backendBundle, { recursive: true });
  for (const item of BACKEND_COPY) {
    const src = path.join(backendSrc, item);
    if (!fs.existsSync(src)) continue;
    copyRecursive(src, path.join(backendBundle, item));
  }
}

function hasPrebuiltUi() {
  return fs.existsSync(uiServerEntry);
}

console.log("Preparing desktop bundle…\n");

if (!hasPrebuiltUi()) {
  if (process.env.SKIP_UI_BUILD === "1") {
    console.error(
      "Prebuilt UI missing at frontend/.vercel/output — run the build-ui job first.",
    );
    process.exit(1);
  }
  console.log("Building frontend for desktop (API → 127.0.0.1:39281)…");
  execSync("npm run build", {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_URL: "http://127.0.0.1:39281/api",
    },
  });
}

if (!hasPrebuiltUi()) {
  console.error("Missing frontend/.vercel/output — run frontend build first.");
  process.exit(1);
}

rm(bundleRoot);
fs.mkdirSync(bundleRoot, { recursive: true });

console.log("Copying backend…");
copyBackend();

console.log("Installing backend production dependencies…");
execSync("npm ci --omit=dev", {
  cwd: backendBundle,
  stdio: "inherit",
});

console.log("Copying UI build…");
copyRecursive(uiOutput, uiBundle);

console.log("Installing UI server (srvx)…");
fs.mkdirSync(uiRunner, { recursive: true });
fs.writeFileSync(
  path.join(uiRunner, "package.json"),
  JSON.stringify(
    {
      name: "batchwise-ui-runner",
      private: true,
      type: "module",
      dependencies: {
        srvx: "^0.11.15",
      },
    },
    null,
    2,
  ),
);
execSync("npm install --omit=dev", { cwd: uiRunner, stdio: "inherit" });

console.log(`\nDesktop bundle ready: ${bundleRoot}`);
