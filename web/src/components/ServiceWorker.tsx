"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` (offline pages, cached pictures, "Keep offline"). Only in production builds,
 * so `next dev` never serves stale pages. Registration is best effort.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
