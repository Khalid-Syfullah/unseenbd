/**
 * Loads web/.env* the way `next build` / `npm start` do (production order: .env.production.local,
 * .env.local, .env.production, .env), so the database scripts use the same DATABASE_PATH,
 * MEDIA_DIR, … as the server. Variables already set in the environment win. Import it first.
 */
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development", {
  info: () => {},
  error: (...args: unknown[]) => console.error(...args),
});
