import express from "express";
import path from "node:path";
import { config, ROOT_DIR } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { attachAuth } from "./middleware/auth.js";
import { apiRouter } from "./routes/api.js";

runMigrations();

const app = express();
const distDir = path.join(ROOT_DIR, "dist");
const useViteDevServer = process.env.USE_VITE_DEV_SERVER === "true" && !config.isProduction;
const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function setSecurityHeaders(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (config.isProduction) {
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self'"
      ].join("; ")
    );
  }

  next();
}

function requireSameOriginRequest(request, _response, next) {
  if (!stateChangingMethods.has(request.method)) {
    next();
    return;
  }

  if (request.get("x-kaeru-request") === "same-origin") {
    next();
    return;
  }

  const error = new Error("Same-origin request header required.");
  error.statusCode = 403;
  next(error);
}

app.disable("x-powered-by");
app.use(setSecurityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(attachAuth);
app.use("/api", requireSameOriginRequest);
app.use("/api", apiRouter);

if (useViteDevServer) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    appType: "spa",
    server: {
      middlewareMode: true
    }
  });

  app.use(vite.middlewares);
} else {
  app.use(express.static(distDir));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      message: statusCode >= 500 ? "Something went wrong." : error.message
    }
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Kaeru listening on http://${config.host}:${config.port}`);
});

server.ref?.();
const keepAliveTimer = setInterval(() => {}, 60 * 60 * 1000);
keepAliveTimer.ref?.();
