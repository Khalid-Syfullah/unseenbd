import { ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { quotaStatus } from "@/server/community/quota";

/** `GET /api/photos/quota` → `{limit, used, remaining}`: upload batches left today for this IP. */
export const GET = community((visitor) => ok(quotaStatus("photos", visitor.ipHash)));
