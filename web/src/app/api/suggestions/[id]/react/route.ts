import { idParam } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { handleReact } from "@/server/community/react-route";

type Ctx = { params: Promise<{ id: string }> };

/** `POST /api/suggestions/:id/react {kind: like|vote, on} | {kind: star, value}`. */
export const POST = community<Ctx>(async (visitor, request, { params }) =>
  handleReact("suggestion", idParam((await params).id), visitor, request),
);
