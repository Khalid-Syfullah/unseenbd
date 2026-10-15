import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databasePath, migrationsDir } from "../paths";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** Open (creating if needed) a SQLite database with the app's pragmas. */
export function openDatabase(path: string = databasePath()): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  if (path !== ":memory:") sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

/** Apply pending migrations from `drizzle/`. */
export function migrateDatabase(db: Db): void {
  migrate(db, { migrationsFolder: migrationsDir() });
}

/** True when the content tables exist and hold data. */
export function isSeeded(db: Db): boolean {
  const row = db.$client
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'places'")
    .get();
  if (!row) return false;
  const count = db.$client.prepare("SELECT count(*) AS n FROM places").get() as { n: number };
  return count.n > 0;
}

const globalForDb = globalThis as unknown as { __unseenbdDb?: Db };

/**
 * The shared database connection used by the data layer and API routes.
 *
 * `npm run db:seed` (also run before `dev` and `build`) normally prepares the file. Pending
 * migrations are applied on first use, and an empty or missing database is seeded, so tests
 * (`DATABASE_PATH=:memory:`) and fresh checkouts work without a separate step.
 */
export function getDb(): Db {
  if (globalForDb.__unseenbdDb) return globalForDb.__unseenbdDb;
  const db = openDatabase();
  // Cheap when up to date; picks up migrations added since the file was last seeded.
  migrateDatabase(db);
  if (!isSeeded(db)) seedDatabase(db);
  globalForDb.__unseenbdDb = db;
  return db;
}
