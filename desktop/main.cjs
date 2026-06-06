const { app, BrowserWindow, shell, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const crypto = require("crypto");
const Store = require("electron-store");

const API_PORT = 39281;
const UI_PORT = 39280;
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;
const UI_ORIGIN = `http://127.0.0.1:${UI_PORT}`;

const store = new Store({ name: "batchwise-config" });
let backendProc = null;
let uiProc = null;
let mainWindow = null;
let starting = false;

function log(...args) {
  const line = `[BatchWise Pro] ${args.join(" ")}\n`;
  console.log(line.trimEnd());
  try {
    const logFile = path.join(app.getPath("userData"), "app.log");
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}`);
  } catch {
    /* ignore */
  }
}

function bundleRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bundle");
  }
  return path.join(__dirname, "bundle");
}

function srvxCliPath(root) {
  const candidates = [
    path.join(root, "ui-runner", "node_modules", "srvx", "bin", "srvx.mjs"),
    path.join(root, "ui-runner", "node_modules", "srvx", "dist", "cli.mjs"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

function readControlConfig() {
  const configPath = path.join(bundleRoot(), "control-config.json");
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    log("Could not read control-config.json:", err?.message ?? err);
  }
  return { appMode: "full", controlApiUrl: null };
}

function ensureJwtSecret() {
  let secret = store.get("jwtSecret");
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    store.set("jwtSecret", secret);
  }
  return secret;
}

function spawnNode(scriptPath, cwd, env, label) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ...env,
    },
    stdio: "pipe",
    windowsHide: true,
  });

  child.stdout?.on("data", (chunk) => log(`[${label}]`, chunk.toString().trimEnd()));
  child.stderr?.on("data", (chunk) => log(`[${label} err]`, chunk.toString().trimEnd()));
  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      log(`[${label}] exited`, code, signal ?? "");
      failStartup(
        `${label} stopped unexpectedly (code ${code}). See app.log in user data.`,
      );
    }
  });

  return child;
}

function failStartup(message) {
  if (!starting) return;
  starting = false;
  log("Startup failed:", message);
  dialog.showErrorBox(
    "BatchWise Pro could not start",
    `${message}\n\nLog file:\n${path.join(app.getPath("userData"), "app.log")}`,
  );
  stopChild(uiProc);
  stopChild(backendProc);
  app.quit();
}

function waitForHealth(url, attempts = 90) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = async () => {
      n += 1;
      try {
        const res = await fetch(`${url}/api/health`);
        if (res.ok) return resolve();
      } catch {
        /* retry */
      }
      if (n >= attempts) {
        return reject(new Error(`Timed out waiting for ${url}`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function startBackend() {
  const root = bundleRoot();
  const backendDir = path.join(root, "backend");
  const serverJs = path.join(backendDir, "server.js");
  if (!fs.existsSync(serverJs)) {
    throw new Error(`Backend not found: ${serverJs}`);
  }

  const userData = app.getPath("userData");
  const dataDir = path.join(userData, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const control = readControlConfig();
  const backendEnv = {
    PORT: String(API_PORT),
    HOST: "127.0.0.1",
    DATA_DIR: dataDir,
    CORS_ORIGIN: UI_ORIGIN,
    FRONTEND_URL: UI_ORIGIN,
    JWT_SECRET: ensureJwtSecret(),
  };

  if (control.controlApiUrl) {
    backendEnv.APP_MODE = "hybrid";
    backendEnv.CONTROL_API_URL = control.controlApiUrl;
    log("Hybrid mode — control API:", control.controlApiUrl);
  } else {
    log("Local-only mode — CONTROL_API_URL not configured in bundle");
  }

  backendProc = spawnNode(serverJs, backendDir, backendEnv, "api");

  await waitForHealth(API_ORIGIN);
}

async function startUiServer() {
  const root = bundleRoot();
  const uiDir = path.join(root, "ui");
  const serverEntry = path.join(uiDir, "functions", "__server.func", "index.mjs");
  const staticDir = path.join(uiDir, "static");
  const srvxCli = srvxCliPath(root);

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`UI server entry not found: ${serverEntry}`);
  }
  if (!fs.existsSync(srvxCli)) {
    throw new Error(`srvx CLI not found: ${srvxCli}`);
  }

  uiProc = spawn(
    process.execPath,
    [srvxCli, "--static", staticDir, serverEntry],
    {
      cwd: uiDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PORT: String(UI_PORT),
        HOST: "127.0.0.1",
      },
      stdio: "pipe",
      windowsHide: true,
    },
  );

  uiProc.stdout?.on("data", (chunk) => log("[ui]", chunk.toString().trimEnd()));
  uiProc.stderr?.on("data", (chunk) => log("[ui err]", chunk.toString().trimEnd()));
  uiProc.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      log("[ui] exited", code, signal ?? "");
      failStartup(`UI server stopped (code ${code}).`);
    }
  });

  let ready = false;
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`${UI_ORIGIN}/login`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) {
    throw new Error(`UI server did not start on ${UI_ORIGIN}`);
  }
}

function stopChild(proc) {
  if (proc && !proc.killed) {
    proc.kill();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "BatchWise Pro",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`${UI_ORIGIN}/login`);

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      log("Window load failed", errorCode, errorDescription, validatedURL);
      dialog.showErrorBox(
        "BatchWise Pro",
        `Could not load the app UI (${errorDescription}).`,
      );
    },
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

async function boot() {
  if (starting) return;
  starting = true;

  const root = bundleRoot();
  if (!fs.existsSync(root)) {
    throw new Error(
      "Application bundle missing. Please reinstall BatchWise Pro.",
    );
  }

  log("Starting… bundle:", root);
  await startBackend();
  log("API ready on", API_ORIGIN);
  await startUiServer();
  log("UI ready on", UI_ORIGIN);
  createWindow();
  starting = false;
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    await boot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failStartup(message);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopChild(uiProc);
  stopChild(backendProc);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendProc && uiProc) {
    createWindow();
  }
});
