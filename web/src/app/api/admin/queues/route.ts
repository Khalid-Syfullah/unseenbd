import { admin } from "@/server/admin/guard";
import { pendingCounts, QUEUES } from "@/server/admin/queues";
import { ok } from "@/server/auth/http";

/** `GET /api/admin/queues` (admins only) → each queue's label and how many items are waiting. */
export const GET = admin(() =>
  ok({
    queues: Object.entries(pendingCounts()).map(([name, pending]) => ({
      name,
      label: QUEUES[name as keyof typeof QUEUES].label,
      pending,
    })),
  }),
);
