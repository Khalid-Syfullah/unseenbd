import { ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { quotaStatus } from "@/server/community/quota";

/** `GET /api/guide-suggestions/quota` → `{limit, used, remaining}` for this IP today. */
export const GET = community((visitor) => ok(quotaStatus("guide", visitor.ipHash)));
