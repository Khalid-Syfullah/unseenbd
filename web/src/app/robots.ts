import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Everything is open to crawlers except the API and the sign-in, account and admin pages. */
const PRIVATE = [
  "/api/",
  "/login",
  "/register",
  "/logout",
  "/profile",
  "/my-listings",
  "/add-listing",
  "/admin",
  "/offline",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Each path in both URL forms: Bengali at the root, English under /en.
        disallow: PRIVATE.flatMap((p) => [p, `/en${p}`]),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
