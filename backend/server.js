const express = require("express");
const cors = require("cors");
const { port, corsOrigin } = require("./config");
const { bootstrap } = require("./bootstrap");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "BatchWise Pro API",
    message: "This is the backend only. Open the frontend app on Vercel.",
    health: "/api/health",
    apiPrefix: "/api",
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

bootstrap()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`BatchWise Pro API listening on http://localhost:${port}`);
    });

    server.on("error", onListenError);
    return server;
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });

function onListenError(err) {

  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set PORT in .env.local.`,
    );
    process.exit(1);
  }
  throw err;
}
