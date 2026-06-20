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
  "db",
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
  fs.cpSync(src, dest, { recursive: true, dereference: true });
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

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

function installBackendBundleDeps() {
  console.log("Installing backend production dependencies in bundle…");
  if (process.env.CI === "true") {
    run("npm install --omit=dev --no-bin-links --no-audit --no-fund", backendBundle);
    return;
  }
  run("npm ci --omit=dev", backendBundle);
}

function installUiRunner() {
  fs.mkdirSync(uiRunner, { recursive: true });
  fs.writeFileSync(
    path.join(uiRunner, "package.json"),
    JSON.stringify(
      {
        name: "batchwise-ui-runner",
        private: true,
        type: "module",
        dependencies: { srvx: "^0.11.15" },
      },
      null,
      2,
    ),
  );
  run("npm install --omit=dev --no-audit --no-fund", uiRunner);
}

console.log("Preparing desktop bundle…\n");

const skipUiBuild = process.env.SKIP_UI_BUILD === "1";

if (!skipUiBuild) {
  console.log("Building frontend for desktop (API → 127.0.0.1:39281)…");
  execSync("npm run build", {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_URL: "http://127.0.0.1:39281/api",
    },
  });
} else if (!hasPrebuiltUi()) {
  console.error(
    "Prebuilt UI missing at frontend/.vercel/output — run the build-ui job first.",
  );
  process.exit(1);
}

if (!hasPrebuiltUi()) {
  console.error("Missing frontend/.vercel/output — run frontend build first.");
  process.exit(1);
}

rm(bundleRoot);
fs.mkdirSync(bundleRoot, { recursive: true });

console.log("Copying backend…");
copyBackend();
installBackendBundleDeps();

console.log("Copying UI build…");
copyRecursive(uiOutput, uiBundle);

const controlApiUrl = (
  process.env.CONTROL_API_URL ||
  process.env.VITE_CONTROL_API_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

fs.writeFileSync(
  path.join(bundleRoot, "control-config.json"),
  JSON.stringify(
    {
      appMode: controlApiUrl ? "hybrid" : "full",
      controlApiUrl: controlApiUrl || null,
    },
    null,
    2,
  ),
);

if (controlApiUrl) {
  console.log("Hybrid desktop bundle — control API:", controlApiUrl);
} else {
  console.warn(
    "CONTROL_API_URL not set — desktop will run in local-only mode (pause will not sync across machines).",
  );
  console.warn(
    "Set CONTROL_API_URL when building installers, e.g. CONTROL_API_URL=https://api.yourdomain.com/api npm run dist:desktop:win",
  );
}

console.log("Installing UI server (srvx)…");
installUiRunner();

console.log(`\nDesktop bundle ready: ${bundleRoot}`);
