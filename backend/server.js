const express = require("express");
const cors = require("cors");
const { port, corsOrigin, appMode, controlApiUrl } = require("./config");
const host = process.env.HOST || "0.0.0.0";
const { bootstrap } = require("./bootstrap");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

function parseCorsOrigins(value) {
  if (!value || value === "*") return true;
  const origins = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : true;
}

app.use(
  cors({
    origin: parseCorsOrigins(corsOrigin),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors({ origin: parseCorsOrigins(corsOrigin) }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (_req, res) => {
  const hybrid = appMode === "hybrid" && !!controlApiUrl;
  res.json({
    ok: true,
    service: "BatchWise Pro API",
    mode: appMode,
    message: hybrid
      ? "Hybrid API — BMR data is stored locally; login and account status are checked with the control server."
      : "Local API — run the web UI with npm run dev (http://localhost:8080) or open your built frontend.",
    storage: "local-files",
    controlApiUrl: hybrid ? controlApiUrl : null,
    health: "/api/health",
    apiPrefix: "/api",
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  if (appMode === "hybrid" && !controlApiUrl) {
    console.error(
      "APP_MODE=hybrid requires CONTROL_API_URL (Digiteq control server API base, e.g. https://api.example.com/api).",
    );
    process.exit(1);
  }
  await bootstrap();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const label = host === "0.0.0.0" ? "localhost" : host;
      const modeLabel =
        appMode === "hybrid" && controlApiUrl
          ? `hybrid → control ${controlApiUrl}`
          : appMode;
      console.log(
        `BatchWise Pro API listening on http://${label}:${port} (${modeLabel})`,
      );
      resolve(server);
    });
    server.on("error", (err) => {
      onListenError(err);
      reject(err);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer };

function onListenError(err) {

  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set PORT in .env.local.`,
    );
    process.exit(1);
  }
  throw err;
}
