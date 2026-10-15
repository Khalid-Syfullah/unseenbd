"use client";

import { useEffect } from "react";
import { startAccount } from "@/lib/account/auth";

/**
 * Mounted once in the root layout: finds out whether the visitor is signed in and, if so, keeps
 * their visited districts, bucket list, world map and story in sync with the account.
 */
export function AccountProvider() {
  useEffect(() => startAccount(), []);
  return null;
}
