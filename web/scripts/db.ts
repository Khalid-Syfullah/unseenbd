/**
 * Database tasks (run with tsx from web/):
 *
 *   npm run db:migrate   apply migrations in drizzle/
 *   npm run db:seed      migrate, then (re)load the content tables from ../data
 *   npm run db:reset     delete the database file, migrate and seed
 */
import { existsSync, rmSync } from "node:fs";
import { relative } from "node:path";
import { migrateDatabase, openDatabase } from "@/server/db/client";
import { seedDatabase } from "@/server/db/seed";
import { databasePath } from "@/server/paths";

const command = process.argv[2];
const file = databasePath();
const shown = file === ":memory:" ? file : relative(process.cwd(), file);

function removeDatabase() {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    if (existsSync(file + suffix)) rmSync(file + suffix);
  }
}

function run() {
  const started = performance.now();
  if (command === "reset") {
    if (file !== ":memory:") removeDatabase();
    console.log(`db: dropped ${shown}`);
  } else if (command !== "migrate" && command !== "seed") {
    console.error("usage: tsx scripts/db.ts migrate|seed|reset");
    process.exit(2);
  }

  const db = openDatabase(file);
  try {
    migrateDatabase(db);
    console.log(`db: migrated ${shown}`);
    if (command === "seed" || command === "reset") {
      const counts = seedDatabase(db);
      const summary = Object.entries(counts)
        .map(([table, n]) => `${table} ${n}`)
        .join(", ");
      console.log(`db: seeded ${summary}`);
    }
  } finally {
    db.$client.close();
  }
  console.log(`db: done in ${Math.round(performance.now() - started)} ms`);
}

run();
