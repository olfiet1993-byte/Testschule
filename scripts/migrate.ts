import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbDir = path.join(process.cwd(), "data");
fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, "testschule.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

console.log("→ Applying migrations from ./drizzle");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ Migrations applied:", dbPath);
sqlite.close();
