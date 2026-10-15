"use client";

import { useId, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Radio, TextArea } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { failureMessage, sendJson } from "@/lib/community/client";
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/lib/community/rules";

/** "Report" and its dialog: a reason, an optional note, sent to the moderators' queue. */
export function ReportButton({
  type,
  id,
  compact = false,
}: {
  type: "photo" | "post" | "photo_comment" | "post_comment";
  id: number;
  /** An icon-only button (for comments). */
  compact?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const noteId = useId();
  const groupId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!reason) {
      setError(t("report.needReason"));
      return;
    }
    setBusy(true);
    const res = await sendJson("/api/reports", { type, id, reason, note: note.trim() });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setReason(null);
      setNote("");
      setError(null);
      toast.show(t("report.sent"), { tone: "success" });
    } else {
      setError(failureMessage(t, res.failure));
    }
  }

  return (
    <>
      {compact ? (
        <IconButton
          icon="flag"
          label={t("report.button")}
          iconSize={16}
          className="size-8 text-muted"
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button variant="ghost" size="sm" icon="flag" onClick={() => setOpen(true)}>
          {t("report.button")}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("report.title")}
        description={t("report.intro")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" icon="flag" loading={busy} onClick={send}>
              {t("report.send")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col" aria-describedby={error ? `${groupId}-e` : undefined}>
            <legend className="mb-1 text-sm font-semibold">{t("report.reason")}</legend>
            {REPORT_REASONS.map((r) => (
              <Radio
                key={r}
                name={groupId}
                value={r}
                checked={reason === r}
                onChange={() => {
                  setReason(r);
                  setError(null);
                }}
                label={t(`report.reasons.${r === "other" ? "somethingElse" : r}`)}
              />
            ))}
          </fieldset>
          <Field
            label={t("report.note")}
            hint={t("report.noteHint", { max: REPORT_NOTE_MAX })}
            htmlFor={noteId}
          >
            <TextArea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={REPORT_NOTE_MAX}
              rows={3}
              counter
              aria-describedby={`${noteId}-hint`}
            />
          </Field>
          {error ? (
            <p id={`${groupId}-e`} role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
