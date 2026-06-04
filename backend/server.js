const express = require("express");
const cors = require("cors");
const { port, corsOrigin } = require("./config");
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
  res.json({
    ok: true,
    service: "BatchWise Pro API",
    message:
      "Local API — run the web UI with npm run dev (http://localhost:8080) or open your built frontend.",
    storage: "local-files",
    health: "/api/health",
    apiPrefix: "/api",
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  await bootstrap();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const label = host === "0.0.0.0" ? "localhost" : host;
      console.log(`BatchWise Pro API listening on http://${label}:${port}`);
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
