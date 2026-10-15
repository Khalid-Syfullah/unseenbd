"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { copyText, shareOrCopy } from "@/lib/share";
import {
  challengePath,
  cleanName,
  myBangladeshSharePath,
  requestShortLink,
  useShareName,
} from "@/lib/visited";
import { absolute, ShareButtons, ShareNameField, SharePanelCard } from "./ShareTools";

/**
 * "Share your Bangladesh" (name, Share / WhatsApp / Facebook / Copy link / Short link, privacy
 * note) and "Challenge a friend". Links carry only the district ids and the name.
 */
export function SharePanel({ ids }: { ids: readonly number[] }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const name = cleanName(useShareName());
  const [shortUrl, setShortUrl] = useState<{ key: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const empty = ids.length === 0;
  const key = `${ids.join(",")}|${name}`;
  const currentShort = shortUrl?.key === key ? shortUrl.url : null;

  async function makeShortLink() {
    setBusy(true);
    const result = await requestShortLink(ids, name);
    setBusy(false);
    if (!result.ok) {
      toast.show(
        result.reason === "limited" ? t("myBd.shortLinkLimited") : t("myBd.shortLinkFailed"),
        { tone: "error" },
      );
      return;
    }
    const url = absolute(localePath(locale, `/s/${result.code}`));
    setShortUrl({ key, url });
    const copied = await copyText(url);
    toast.show(copied ? t("myBd.shortLinkCopied") : url, { tone: copied ? "success" : "neutral" });
  }

  async function challenge() {
    const result = await shareOrCopy({
      title: t("myBd.challengeTitle"),
      url: absolute(challengePath(locale, ids, name)),
    });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <SharePanelCard id="share" title={t("myBd.shareTitle")}>
        <ShareNameField />
        <ShareButtons
          title={t("myBd.title")}
          text={t("myBd.shareText", { count: ids.length })}
          link={() => myBangladeshSharePath(locale, ids, name)}
          disabled={empty}
        >
          <Button
            variant="secondary"
            icon="external"
            loading={busy}
            disabled={empty}
            onClick={makeShortLink}
          >
            {t("myBd.shortLink")}
          </Button>
        </ShareButtons>
        {currentShort ? (
          <TextInput
            readOnly
            value={currentShort}
            aria-label={t("myBd.shortLink")}
            onFocus={(e) => e.currentTarget.select()}
            className="max-w-[360px]"
          />
        ) : null}
        {empty ? <p className="text-sm font-semibold">{t("myBd.shareEmpty")}</p> : null}
        <p className="text-sm text-muted">{t("myBd.privacy")}</p>
      </SharePanelCard>

      <SharePanelCard id="challenge" title={t("myBd.challengeTitle")}>
        <p className="text-muted">{t("myBd.challengeBody")}</p>
        <Button
          variant="accent"
          icon="trophy"
          className="w-fit"
          disabled={empty}
          onClick={challenge}
        >
          {t("myBd.challengeCopy")}
        </Button>
      </SharePanelCard>
    </div>
  );
}
