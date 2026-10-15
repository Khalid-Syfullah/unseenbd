import { idParam } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { handleReact } from "@/server/community/react-route";

type Ctx = { params: Promise<{ id: string }> };

/** `POST /api/photos/:id/react {kind: "like", on}` → `{totals, mine}`. */
export const POST = community<Ctx>(async (visitor, request, { params }) =>
  handleReact("photo", idParam((await params).id), visitor, request),
);
