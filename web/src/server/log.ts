/**
 * Structured logs: one JSON object per line on stdout (errors and warnings on stderr), the same
 * shape `server.mjs` writes for requests, so pm2 / journald / any log shipper can parse them.
 *
 *   {"time":"2026-10-16T08:00:00.000Z","level":"error","msg":"request failed","path":"/api/x",...}
 *
 * `LOG_LEVEL` (debug | info | warn | error, default info) filters what is written. No visitor IPs,
 * emails or request bodies are ever logged.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return ORDER[env] ?? ORDER.info;
}

/** Errors become `{name, message, stack}` so they survive JSON.stringify. */
function plain(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

/** One log line as text (exported for tests). */
export function formatLine(
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown> = {},
  now: Date = new Date(),
): string {
  const entry: Record<string, unknown> = { time: now.toISOString(), level, msg };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) entry[key] = plain(value);
  }
  return JSON.stringify(entry);
}

export function log(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  if (ORDER[level] < threshold()) return;
  const line = formatLine(level, msg, fields);
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => log("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => log("error", msg, fields),
};
