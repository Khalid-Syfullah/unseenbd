import { ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { quotaStatus } from "@/server/community/quota";

/** `GET /api/listings/quota` → `{limit, used, remaining}`: submissions left today. */
export const GET = community((visitor) =>
  ok(quotaStatus("listings", visitor.userId ? `u:${visitor.userId}` : visitor.ipHash)),
);
