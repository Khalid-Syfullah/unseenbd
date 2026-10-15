"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Counts a page view: one small POST with the path, so the server can add one to that page's
 * counter for the day. It sends no cookie-based id and nothing about the visitor, and it stays
 * quiet when the browser says Do Not Track. The admin screens are not counted.
 */
export function VisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || /^\/(?:[a-z]{2}\/)?admin(?:\/|$)/.test(pathname)) return;
    if (typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
    try {
      const body = new Blob([JSON.stringify({ path: pathname })], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/visit", body)) {
        void fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
          credentials: "omit",
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // counting is best effort
    }
  }, [pathname]);
  return null;
}
