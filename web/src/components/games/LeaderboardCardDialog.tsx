"use client";

import { useEffect, useRef, useState } from "react";
import { ThemePicker } from "@/components/card/ThemePicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SegmentedControl } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import {
  canShareFiles,
  canvasToPng,
  downloadBlob,
  ensureCardFonts,
  exportName,
  loadImage,
  shareFile,
  type ThemeKey,
} from "@/lib/card";
import { gamePath } from "@/lib/games/challenge";
import {
  LEADERBOARD_CARD_SIZES,
  renderLeaderboardCard,
  type LeaderboardCardSize,
} from "@/lib/games/leaderboard-card";
import { useGameRecords } from "@/lib/games/records";
import { MAX_SCORE, type GameKey, type LeaderboardEntry } from "@/lib/games/types";

const SIZE_LABEL: Record<LeaderboardCardSize, MessageKey> = {
  square: "card.sizeSquare",
  post: "card.sizePost",
  story: "card.sizeStory",
};

/** The leaderboard card maker: theme, size, a live canvas preview, PNG download and share. */
export function LeaderboardCardDialog({
  open,
  onClose,
  game,
  entries,
  today,
}: {
  open: boolean;
  onClose: () => void;
  game: GameKey;
  entries: LeaderboardEntry[];
  today: string;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const toast = useToast();
  const records = useGameRecords();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("dusk");
  const [size, setSize] = useState<LeaderboardCardSize>("square");
  const [busy, setBusy] = useState(false);
  const [shareable, setShareable] = useState(false);
  const gameName = t(`games.names.${game}` as MessageKey);
  const latest = records[game]?.recent[0];
  const mine =
    latest && latest.date === today
      ? t("games.leaderboard.cardMine", { score: latest.score, total: MAX_SCORE })
      : undefined;

  useEffect(() => {
    if (!open) return;
    setShareable(canShareFiles());
    let cancelled = false;
    Promise.all([ensureCardFonts(), loadImage("/brand/logo-mark.svg")]).then(([fonts, logo]) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      renderLeaderboardCard(
        canvas,
        {
          theme,
          size,
          title: t("games.leaderboard.cardTitle"),
          subtitle: gameName,
          rows: entries.map((e) => ({
            rank: e.rank,
            name: e.name,
            score: e.score,
            total: e.total,
          })),
          mine,
          empty: t("games.leaderboard.cardEmpty"),
          url: `${window.location.host}${gamePath(locale, game)}`,
          lang,
        },
        { fonts, logo },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, theme, size, entries, mine, gameName, game, lang, locale, t]);

  async function blob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      return await canvasToPng(canvas);
    } catch {
      toast.show(t("common.somethingWrong"), { tone: "error" });
      return null;
    }
  }

  const filename = exportName(["leaderboard", game.replace(/_/g, "-"), size], "png");

  async function download() {
    setBusy(true);
    const b = await blob();
    if (b) downloadBlob(b, filename);
    setBusy(false);
  }

  async function share() {
    setBusy(true);
    const b = await blob();
    if (b) {
      const result = await shareFile(
        b,
        filename,
        t("games.leaderboard.shareTitle", { game: gameName }),
      );
      if (result === "failed" || result === "unsupported") {
        toast.show(t("common.somethingWrong"), { tone: "error" });
      }
    }
    setBusy(false);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("games.leaderboard.card")}
      footer={
        <>
          {shareable ? (
            <Button variant="secondary" icon="share" onClick={share} disabled={busy}>
              {t("games.leaderboard.shareImage")}
            </Button>
          ) : null}
          <Button icon="upload" onClick={download} loading={busy}>
            {t("games.leaderboard.download")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-center rounded-md bg-surface-2 p-3">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t("games.leaderboard.cardPreview")}
            className="h-auto max-h-[46vh] w-auto max-w-full rounded-sm shadow-2"
          />
        </div>
        <ThemePicker value={theme} onChange={setTheme} bn={lang === "bn"} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("games.leaderboard.size")}</span>
          <SegmentedControl<LeaderboardCardSize>
            label={t("games.leaderboard.size")}
            value={size}
            onChange={setSize}
            options={LEADERBOARD_CARD_SIZES.map((k) => ({ value: k, label: t(SIZE_LABEL[k]) }))}
          />
        </div>
      </div>
    </Dialog>
  );
}
