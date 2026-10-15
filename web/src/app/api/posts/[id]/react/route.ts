import { idParam } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { handleReact } from "@/server/community/react-route";

type Ctx = { params: Promise<{ id: string }> };

/** `POST /api/posts/:id/react {kind: "like", on} | {kind: "star", value}` → `{totals, mine}`. */
export const POST = community<Ctx>(async (visitor, request, { params }) =>
  handleReact("post", idParam((await params).id), visitor, request),
);
