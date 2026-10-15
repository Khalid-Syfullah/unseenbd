"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import type { GameChallenge } from "@/lib/games/challenge";

/** "Rahim scored 14 / 20 on this set. Can you beat it?" above a challenged game. */
export function ChallengeBanner({ challenge }: { challenge: GameChallenge }) {
  const t = useT();
  return (
    <p className="flex items-start gap-3 rounded-lg bg-accent-wash p-4 font-semibold text-on-accent-wash">
      <Icon name="trophy" size={22} className="mt-0.5" />
      <span>
        {t("games.challenge.banner", {
          name: challenge.name || t("games.challenge.friend"),
          score: challenge.score,
        })}
      </span>
    </p>
  );
}
