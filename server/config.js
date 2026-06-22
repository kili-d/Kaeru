import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveDatabasePath(databaseUrl) {
  const value = databaseUrl || "file:./data/kaeru.sqlite";
  const filePath = value.startsWith("file:") ? value.slice("file:".length) : value;
  return path.isAbsolute(filePath) ? filePath : path.resolve(ROOT_DIR, filePath);
}

loadLocalEnv();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const setupToken = process.env.KAERU_SETUP_TOKEN || process.env.SETUP_TOKEN || "";

export const config = {
  allowRegistration: process.env.ALLOW_REGISTRATION === "true",
  appUrl: process.env.APP_URL || "http://127.0.0.1:5173",
  databasePath: resolveDatabasePath(process.env.DATABASE_URL),
  databaseUrl: process.env.DATABASE_URL || "file:./data/kaeru.sqlite",
  enableTotp: process.env.ENABLE_TOTP !== "false",
  host: process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1"),
  isProduction,
  logLevel: process.env.LOG_LEVEL || "info",
  nodeEnv,
  port: Number(process.env.PORT) || 5173,
  sessionCookieName: "kaeru_session",
  sessionDays: 7,
  setupToken,
  setupTokenRequired: isProduction
};
