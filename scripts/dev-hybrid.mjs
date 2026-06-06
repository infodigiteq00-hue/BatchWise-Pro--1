import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(root, "backend");
const hybridDataDir = path.join(backendDir, "data-hybrid");

fs.mkdirSync(hybridDataDir, { recursive: true });

const env = {
  ...process.env,
  APP_MODE: "hybrid",
  CONTROL_API_URL: process.env.CONTROL_API_URL || "http://localhost:3001/api",
  PORT: process.env.HYBRID_PORT || "3002",
  DATA_DIR: hybridDataDir,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173",
};

console.log("Hybrid API (desktop simulation)");
console.log("  CONTROL_API_URL:", env.CONTROL_API_URL);
console.log("  PORT:", env.PORT);
console.log("  DATA_DIR:", env.DATA_DIR);
console.log("Point frontend at http://localhost:" + env.PORT + "/api to test pause sync.\n");

const child = spawn("node", ["--watch", "server.js"], {
  cwd: backendDir,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
