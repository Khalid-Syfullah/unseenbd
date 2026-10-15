"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DistrictSelect, Field, type DivisionGroup } from "@/components/ui/Form";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";

/** From / To district selects and "Show ways": opens the route page (or the computed one). */
export function RouteFinder({ divisions }: { divisions: DivisionGroup[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [from, setFrom] = useState("dhaka");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) {
      setError(t("routes.choose"));
      return;
    }
    if (from === to) {
      setError(t("routes.samePair"));
      return;
    }
    setError(null);
    router.push(localePath(locale, `/route/${from}-to-${to}`));
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t("routes.finderTitle")}
      className="grid items-end gap-3 rounded-lg border border-border bg-raised p-4 shadow-1 md:grid-cols-[1fr_1fr_auto]"
    >
      <Field label={t("routes.from")} htmlFor={`${id}-from`}>
        <DistrictSelect
          id={`${id}-from`}
          divisions={divisions}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Field>
      <Field label={t("routes.to")} htmlFor={`${id}-to`} error={error}>
        <DistrictSelect
          id={`${id}-to`}
          divisions={divisions}
          placeholder={t("routes.choose")}
          value={to}
          aria-describedby={error ? `${id}-to-error` : undefined}
          onChange={(e) => setTo(e.target.value)}
        />
      </Field>
      <Button type="submit" icon="arrow-right" size="lg">
        {t("routes.show")}
      </Button>
    </form>
  );
}
