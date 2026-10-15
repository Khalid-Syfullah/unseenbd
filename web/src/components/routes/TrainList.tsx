"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/Feedback";
import { Field, Select, SegmentedControl, TextInput } from "@/components/ui/Form";
import { TrainRow, type TrainRowData } from "@/components/ui/RouteCard";
import { useT } from "@/i18n/client";

export type TrainListItem = TrainRowData & { stations: string[]; districtIds: number[] };
export type TrainDistrict = { id: number; name: string };

type Sort = "number" | "departure";

/** The train timetable: filter by station or district, sort by number or departure. */
export function TrainList({
  trains,
  districts,
}: {
  trains: TrainListItem[];
  districts: TrainDistrict[];
}) {
  const t = useT();
  const [station, setStation] = useState("");
  const [district, setDistrict] = useState("");
  const [sort, setSort] = useState<Sort>("number");

  const shown = useMemo(() => {
    const q = station.trim().toLowerCase();
    const d = district ? Number(district) : null;
    const rows = trains.filter(
      (tr) =>
        (!q || tr.stations.some((s) => s.toLowerCase().includes(q))) &&
        (d === null || tr.districtIds.includes(d)),
    );
    return [...rows].sort((a, b) =>
      sort === "departure" ? a.dep.localeCompare(b.dep) || a.no - b.no : a.no - b.no,
    );
  }, [trains, station, district, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div role="search" className="grid items-end gap-3 md:grid-cols-3">
        <Field label={t("trains.stationLabel")} htmlFor="train-station">
          <TextInput
            id="train-station"
            icon="search"
            type="search"
            value={station}
            placeholder={t("trains.stationPlaceholder")}
            onChange={(e) => setStation(e.target.value)}
          />
        </Field>
        <Field label={t("trains.districtLabel")} htmlFor="train-district">
          <Select
            id="train-district"
            placeholder={t("trains.allDistricts")}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            options={districts.map((d) => ({ value: String(d.id), label: d.name }))}
          />
        </Field>
        <SegmentedControl<Sort>
          label={t("trains.sortLabel")}
          value={sort}
          onChange={setSort}
          options={[
            { value: "number", label: t("trains.sortNumber") },
            { value: "departure", label: t("trains.sortDeparture") },
          ]}
        />
      </div>
      <p className="num text-muted" aria-live="polite">
        {t("trains.count", { count: shown.length })}
      </p>
      {shown.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((tr) => (
            <li key={tr.slug} className="flex">
              <TrainRow train={tr} headingLevel={2} className="w-full" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState illustration={null} body={t("trains.empty")} />
      )}
    </div>
  );
}
