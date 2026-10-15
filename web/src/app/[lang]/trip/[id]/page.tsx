import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { PlanResults } from "@/components/planner/Planner";
import { ButtonLink } from "@/components/ui/Button";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatDate } from "@/lib/format";
import { buildPlan } from "@/lib/planner/plan";
import type { Plan, PlanCosts } from "@/lib/planner/types";
import { planQuery } from "@/lib/planner/url";
import { parsePlanInput, visibleTrip } from "@/server/account/trips";
import { idParam } from "@/server/auth/http";
import { currentSession } from "@/server/auth/current";
import { getUserById } from "@/server/auth/users";
import { getPlannerData } from "@/server/data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string; id: string }> };

async function load(lang: string, rawId: string) {
  if (!isLocale(lang)) return null;
  const id = idParam(rawId);
  if (!id) return null;
  const session = await currentSession();
  const trip = visibleTrip(id, session?.user.id ?? null);
  if (!trip) return null;
  return { trip, viewerId: session?.user.id ?? null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, id } = await params;
  const found = await load(lang, id);
  if (!found || !isLocale(lang)) return {};
  const t = getT(lang);
  const title = found.trip.title || t("trip.title");
  return {
    title,
    description: t("trip.metaDescription"),
    robots: { index: false, follow: true },
    openGraph: { title, description: t("trip.metaDescription") },
  };
}

const COST_KEYS: (keyof PlanCosts)[] = [
  "transport",
  "stay",
  "food",
  "local",
  "misc",
  "subtotal",
  "total",
  "perPerson",
];

/** The costs saved with the trip, when they are complete; else null. */
function savedCosts(plan: unknown): PlanCosts | null {
  const costs = (plan as { costs?: Record<string, unknown> } | null)?.costs;
  if (!costs || typeof costs !== "object") return null;
  return COST_KEYS.every((k) => typeof costs[k] === "number" && Number.isFinite(costs[k]))
    ? (costs as PlanCosts)
    : null;
}

/**
 * `/trip/:id`: a saved trip, read-only. Its owner always sees it; anyone else only once the owner
 * has switched its share link on. The days are rebuilt from the saved inputs; the costs are the
 * ones saved with the trip.
 */
export default async function TripPage({ params }: PageProps) {
  const { lang, id } = await params;
  const found = await load(lang, id);
  if (!found || !isLocale(lang)) notFound();
  const locale: Locale = lang;
  const t = getT(locale);
  const { trip, viewerId } = found;
  const input = parsePlanInput(trip.input);
  const data = await getPlannerData(contentLocale(locale));
  const rebuilt = input ? buildPlan(input, data) : null;
  if (!input || !rebuilt) notFound();
  const plan: Plan = { ...rebuilt, costs: savedCosts(trip.plan) ?? rebuilt.costs };
  const owner = getUserById(trip.userId);
  const isOwner = viewerId === trip.userId;
  const title = trip.title || t("trip.title");

  return (
    <PageContainer className="gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={title}
          intro={
            <>
              {owner ? (
                <>
                  {t("trip.by")}{" "}
                  <Link
                    href={localePath(locale, `/u/${owner.handle}`)}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {owner.name}
                  </Link>
                  <span aria-hidden> · </span>
                </>
              ) : null}
              {t("trip.savedOn", {
                date: formatDate(trip.createdAt.slice(0, 10), contentLocale(locale)),
              })}
            </>
          }
        />
        {isOwner ? (
          <p className="text-sm text-muted">
            {t(trip.isPublic ? "trip.shareOn" : "trip.private")}{" "}
            <Link
              href={`${localePath(locale, "/profile")}?tab=trips`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("trip.manage")}
            </Link>
          </p>
        ) : null}
        <div className="print:hidden">
          <ButtonLink
            href={`${localePath(locale, "/plan")}?${planQuery(input)}`}
            variant="secondary"
            icon="planner"
          >
            {t("trip.openInPlanner")}
          </ButtonLink>
        </div>
      </div>
      <PlanResults
        plan={plan}
        districts={data.districts}
        places={data.places}
        readOnly
        title={title}
      />
    </PageContainer>
  );
}
