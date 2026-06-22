import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDatabase } from "./connection.js";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export function runMigrations() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort();

  const applyMigration = db.transaction((file) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(file, Date.now());
  });

  const foreignKeysEnabled = db.pragma("foreign_keys", { simple: true });

  try {
    db.pragma("foreign_keys = OFF");
    for (const file of files) {
      if (!applied.has(file)) applyMigration(file);
    }
  } finally {
    db.pragma(`foreign_keys = ${foreignKeysEnabled ? "ON" : "OFF"}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations();
  console.log("Migrations applied.");
}
