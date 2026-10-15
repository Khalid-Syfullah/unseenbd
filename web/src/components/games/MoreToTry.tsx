import { TextLink } from "@/components/ui/Button";
import { CardGrid, FeatureCard } from "@/components/ui/Card";
import type { IconName } from "@/components/ui/Icon";
import { localePath, type Locale } from "@/i18n/locales";
import { getT, type MessageKey } from "@/i18n/messages";

type Item = { key: string; path: string; icon: IconName; title: MessageKey; body: MessageKey };

const ITEMS: Record<string, Item> = {
  play: { key: "play", path: "/play", icon: "quiz", title: "games.title", body: "games.kicker" },
  famous: {
    key: "famous",
    path: "/quiz/famous",
    icon: "food",
    title: "games.more.famous",
    body: "games.more.famousBody",
  },
  districts: {
    key: "districts",
    path: "/quiz/bangladesh",
    icon: "pin",
    title: "games.more.districts",
    body: "games.more.districtsBody",
  },
  personality: {
    key: "personality",
    path: "/quiz/personality",
    icon: "heart",
    title: "games.more.personality",
    body: "games.more.personalityBody",
  },
  myMap: {
    key: "myMap",
    path: "/my-bangladesh",
    icon: "my-map",
    title: "games.more.myMap",
    body: "games.more.myMapBody",
  },
  bucket: {
    key: "bucket",
    path: "/bucket-list",
    icon: "bookmark",
    title: "games.more.bucket",
    body: "games.more.bucketBody",
  },
};

export type MorePage = "play" | "districts" | "famous" | "personality";

/**
 * "More to try" at the foot of the game pages: three feature cards (DESIGN.md §5.7: Famous foods
 * quiz, My map, Bucket list on the hub) and plain links to the remaining quizzes.
 */
export function MoreToTry({ locale, exclude }: { locale: Locale; exclude: MorePage }) {
  const t = getT(locale);
  const cards =
    exclude === "play"
      ? [ITEMS.famous!, ITEMS.myMap!, ITEMS.bucket!]
      : [
          ITEMS.play!,
          ...(["districts", "famous", "personality"] as const)
            .filter((k) => k !== exclude)
            .map((k) => ITEMS[k]!),
        ];
  const links = exclude === "play" ? [ITEMS.districts!, ITEMS.personality!] : [];

  return (
    <section aria-labelledby="more-to-try" className="flex flex-col gap-4">
      <h2 id="more-to-try" className="text-h2">
        {t("games.more.title")}
      </h2>
      <CardGrid max={3}>
        {cards.map((item) => (
          <FeatureCard
            key={item.key}
            icon={item.icon}
            title={t(item.title)}
            body={t(item.body)}
            href={localePath(locale, item.path)}
          />
        ))}
      </CardGrid>
      {links.length ? (
        <ul className="flex flex-wrap gap-x-6">
          {links.map((item) => (
            <li key={item.key}>
              <TextLink href={localePath(locale, item.path)} trailingIcon="arrow-right">
                {t(item.title)}
              </TextLink>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
