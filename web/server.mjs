/**
 * Production server for Unseen BD: `npm start` (or pm2) runs this file after `npm run build`.
 *
 * It is `next start` plus three things a single EC2 instance behind nginx needs:
 *
 *  - Listens on `PORT` (default 3000) and `LISTEN_HOST` (default: every interface; set
 *    127.0.0.1 behind nginx so the app is not reachable from outside).
 *  - Structured logs: one JSON line per request (method, path without the query string, status,
 *    duration, nginx's request id) and for start-up, shutdown and crashes. No IPs, no bodies.
 *    `LOG_LEVEL` = debug | info | warn | error (default info); static files are logged at debug.
 *  - Graceful shutdown on SIGTERM / SIGINT (pm2 reload, systemd stop): stop accepting
 *    connections, let requests in flight finish (up to `SHUTDOWN_TIMEOUT_MS`, default 10 s), close
 *    the SQLite database cleanly, then exit.
 *
 * Environment files (.env, .env.production, .env.local, …) are loaded the same way as by
 * `next start`; see .env.example for every variable.
 */
import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import next from "next";

const dir = dirname(fileURLToPath(import.meta.url));
// Paths in the app (database, media, seed data) resolve from web/.
process.chdir(dir);
nextEnv.loadEnvConfig(dir, false, { info: () => {}, error: (...a) => console.error(...a) });

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL ?? "info").toLowerCase()] ?? LEVELS.info;

function log(level, msg, fields = {}) {
  if (LEVELS[level] < threshold) return;
  const entry = { time: new Date().toISOString(), level, msg };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    entry[key] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value;
  }
  const line = JSON.stringify(entry) + "\n";
  if (level === "error" || level === "warn") process.stderr.write(line);
  else process.stdout.write(line);
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  log("error", "invalid PORT", { port: process.env.PORT });
  process.exit(1);
}
const host = process.env.LISTEN_HOST || undefined;
const shutdownTimeout = Number.parseInt(process.env.SHUTDOWN_TIMEOUT_MS ?? "10000", 10) || 10000;

/** Built files and copied assets: logged at debug level only, so the log stays readable. */
const QUIET =
  /^\/(?:_next\/|places\/|photos\/|media\/|brand\/|icons\/|illustrations\/|maps\/|stamps\/|badges\/|card-themes\/|social\/|favicon|apple-touch-icon|manifest\.webmanifest|sw\.js)/;

const app = next({ dev: false, dir, hostname: host ?? "localhost", port });
const handle = app.getRequestHandler();

let shuttingDown = false;
let inFlight = 0;

const server = createServer((req, res) => {
  const started = process.hrtime.bigint();
  inFlight += 1;
  if (shuttingDown) res.setHeader("Connection", "close");
  res.on("close", () => {
    inFlight -= 1;
    const path = (req.url ?? "/").split("?")[0];
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const status = res.writableFinished ? res.statusCode : 499;
    const level = status >= 500 ? "error" : QUIET.test(path) ? "debug" : "info";
    log(level, "request", {
      method: req.method,
      path,
      status,
      ms: Math.round(ms * 10) / 10,
      id: req.headers["x-request-id"] || undefined,
    });
  });
  handle(req, res).catch((error) => {
    log("error", "unhandled request error", { path: (req.url ?? "/").split("?")[0], error });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
});

// Longer than nginx's upstream keepalive, so nginx (not Node) closes idle connections.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function closeDatabase() {
  const db = globalThis.__unseenbdDb;
  if (!db) return;
  try {
    db.$client.close();
    globalThis.__unseenbdDb = undefined;
    log("info", "database closed");
  } catch (error) {
    log("warn", "database close failed", { error });
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", "shutting down", { signal, inFlight });
  const force = setTimeout(() => {
    log("warn", "shutdown timed out; closing open connections", { inFlight });
    server.closeAllConnections();
    closeDatabase();
    process.exit(1);
  }, shutdownTimeout);
  force.unref();
  server.close(() => {
    closeDatabase();
    log("info", "stopped");
    process.exit(0);
  });
  // Idle keep-alive sockets would otherwise hold server.close() open.
  server.closeIdleConnections();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) =>
  log("error", "unhandled rejection", { error: reason }),
);
process.on("uncaughtException", (error) => {
  log("error", "uncaught exception", { error });
  closeDatabase();
  process.exit(1);
});

try {
  await app.prepare();
} catch (error) {
  log("error", "could not start; run `npm run build` first", { error });
  process.exit(1);
}

server.on("error", (error) => {
  log("error", "server error", { error });
  process.exit(1);
});

server.listen(port, host, () => {
  log("info", "listening", {
    url: `http://${host ?? "localhost"}:${port}`,
    node: process.version,
    env: process.env.NODE_ENV,
  });
  // pm2 `wait_ready: true` waits for this before it sends traffic to a reloaded process.
  if (typeof process.send === "function") process.send("ready");
});
