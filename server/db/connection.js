import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

let database;

export function getDatabase() {
  if (database) return database;

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  database = new Database(config.databasePath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");

  return database;
}

export function closeDatabase() {
  if (!database) return;
  database.close();
  database = undefined;
}
