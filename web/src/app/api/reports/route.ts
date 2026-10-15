import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { fail, idParam, ok, readJson } from "@/server/auth/http";
import {
  community,
  deviceActor,
  invalid,
  quotaExceeded,
  rememberDevice,
} from "@/server/community/http";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import {
  createReport,
  REPORT_TARGETS,
  reportable,
  type ReportTarget,
} from "@/server/community/submissions";

/**
 * `POST /api/reports {type: photo|post|photo_comment|post_comment, id, reason, note?}` →
 * `201 {id}`. Reports go to the moderators' queue.
 */
export const POST = community(async (visitor, request) => {
  const read = await readJson(request, 4096);
  if (!read.ok) return read.response;
  const type = read.body.type as ReportTarget;
  if (!REPORT_TARGETS.includes(type)) return invalid("type");
  const id = idParam(String(read.body.id ?? ""));
  if (!id || !reportable(type, id)) return fail(404, "not_found");
  const reason = read.body.reason as ReportReason;
  if (!REPORT_REASONS.includes(reason)) return invalid("reason");
  const note = checkText(read.body.note, REPORT_NOTE_MAX, { multiline: true });
  if (!note.ok) return invalid("note", note.reason);
  const { actor, newDevice } = deviceActor(visitor);
  if (!consumeQuota("reports", actor)) return quotaExceeded(quotaStatus("reports", actor).limit);
  const reportId = createReport({
    targetType: type,
    targetId: id,
    reason,
    note: note.value || null,
    reporter: actor,
  });
  return rememberDevice(ok({ id: reportId }, 201), newDevice);
});
