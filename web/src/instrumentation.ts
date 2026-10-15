import type { Instrumentation } from "next";

/**
 * Next.js instrumentation: unhandled errors while rendering a page or running a route handler
 * become one structured log line (src/server/log.ts) with the path and route, never the query
 * string, headers or body.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("./server/log");
  const err = error as Error & { digest?: string };
  logger.error("request failed", {
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    routeType: context.routeType,
    digest: err.digest,
    error: err,
  });
};
