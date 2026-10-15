import { resolve } from "node:path";

/*
 * Filesystem locations. Every entry point (Next, Vitest, the db scripts) runs with `web/` as the
 * working directory, so paths resolve from there. Each can be overridden with an env var.
 */

const webRoot = () => process.cwd();

/** The SQLite file. `:memory:` gives a throwaway database (seeded on first use). */
export function databasePath(): string {
  const env = process.env.DATABASE_PATH;
  if (env) return env === ":memory:" ? env : resolve(webRoot(), env);
  return resolve(webRoot(), "data/unseenbd.sqlite");
}

/** Drizzle migrations (`web/drizzle/`). */
export function migrationsDir(): string {
  return resolve(webRoot(), process.env.MIGRATIONS_DIR ?? "drizzle");
}

/** The seed data (`data/` at the repository root). */
export function seedDataDir(): string {
  return resolve(webRoot(), process.env.SEED_DATA_DIR ?? "../data");
}

/** Shared assets (`assets/` at the repository root). */
export function assetsDir(): string {
  return resolve(webRoot(), process.env.ASSETS_DIR ?? "../assets");
}

/**
 * Real place photos fetched from Wikimedia Commons by `npm run photos`: `web/storage/photos/`
 * (`w640/{slug}.webp`, `w1200/{slug}.webp`), or `PHOTOS_DIR`. Served by `GET /photos/…`.
 */
export function photosDir(): string {
  return resolve(webRoot(), process.env.PHOTOS_DIR ?? "storage/photos");
}

/**
 * Uploaded media (community photos, post photos): `web/storage/media/` by default, or
 * `MEDIA_DIR`. Files are served by `GET /media/…` (`src/app/media/[...path]/route.ts`).
 */
export function mediaDir(): string {
  return resolve(webRoot(), process.env.MEDIA_DIR ?? "storage/media");
}
