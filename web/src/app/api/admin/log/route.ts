import { admin } from "@/server/admin/guard";
import { recentAdminLog } from "@/server/admin/log";
import { ok } from "@/server/auth/http";

/** `GET /api/admin/log` (admins only) → the 50 latest admin actions, newest first. */
export const GET = admin(() => ok({ entries: recentAdminLog(50) }));
