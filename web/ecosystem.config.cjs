/**
 * pm2 process file for the production server (see DEPLOY.md):
 *
 *   pm2 start ecosystem.config.cjs     first time
 *   pm2 reload unseenbd                after a deploy
 *
 * One process: SQLite and the in-memory rate limits belong to a single Node process. Secrets and
 * paths live in web/.env.production.local, which server.mjs loads; only non-secret settings are
 * here.
 */
module.exports = {
  apps: [
    {
      name: "unseenbd",
      // With release folders, point this at the `current` symlink (APP_DIR=/srv/unseenbd/current/web)
      // so `pm2 startOrReload` starts the new release; Node resolves __dirname to the real folder.
      cwd: process.env.APP_DIR || __dirname,
      script: "server.mjs",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        LISTEN_HOST: "127.0.0.1",
        LOG_LEVEL: "info",
        SHUTDOWN_TIMEOUT_MS: "10000",
      },
      // server.mjs sends "ready" once it listens, and finishes requests in flight on SIGTERM.
      wait_ready: true,
      listen_timeout: 30000,
      kill_timeout: 12000,
      max_memory_restart: "700M",
      // Back off instead of crash-looping when something is badly wrong (e.g. a missing build).
      exp_backoff_restart_delay: 200,
      max_restarts: 20,
      // Logs are JSON lines already; pm2 adds no prefix.
      time: false,
      merge_logs: true,
    },
  ],
};
