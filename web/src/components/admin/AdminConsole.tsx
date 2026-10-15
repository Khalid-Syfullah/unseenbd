"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, TextInput } from "@/components/ui/Form";
import { PillTabs } from "@/components/ui/Navigation";
import { StatusTag } from "@/components/ui/Chip";
import { getJson, sendJson } from "@/lib/community/client";

/*
 * The admin console. It is a back-office screen for the site's moderators and is written in
 * English only; everything it changes goes through /api/admin/* and is logged there.
 */

type QueueInfo = { name: string; label: string; pending: number };
type Item = {
  id: string;
  title: string;
  body: string | null;
  meta: string[];
  status: "pending" | "approved" | "rejected";
  image: string | null;
  href: string | null;
};
type QueuePage = {
  queue: string;
  actions: Record<string, string>;
  items: Item[];
  total: number;
  page: number;
  pageCount: number;
};

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const TONES = { pending: "info", approved: "good", rejected: "danger" } as const;

export function AdminConsole({ today, locale }: { today: string; locale: string }) {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [tab, setTab] = useState("photos");

  const loadQueues = useCallback(async () => {
    const res = await getJson<{ queues: QueueInfo[] }>("/api/admin/queues");
    if (res.ok) setQueues(res.data.queues);
  }, []);
  useEffect(() => {
    void loadQueues();
  }, [loadQueues]);

  const tabs = [
    ...queues.map((q) => ({
      id: q.name,
      label: q.pending ? `${q.label} (${q.pending})` : q.label,
    })),
    { id: "stars", label: "Editorial stars" },
    { id: "stats", label: "Daily stats" },
    { id: "log", label: "Admin log" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PillTabs label="Admin sections" tabs={tabs} value={tab} onChange={setTab} idPrefix="admin" />
      <div role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`}>
        {tab === "stars" ? (
          <Stars />
        ) : tab === "stats" ? (
          <Stats today={today} />
        ) : tab === "log" ? (
          <Log />
        ) : (
          <Queue key={tab} name={tab} locale={locale} onChanged={loadQueues} />
        )}
      </div>
    </div>
  );
}

function Queue({
  name,
  locale,
  onChanged,
}: {
  name: string;
  locale: string;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<Status>("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QueuePage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await getJson<QueuePage>(`/api/admin/${name}?status=${status}&page=${page}`);
    if (res.ok) {
      setData(res.data);
      setSelected(new Set());
    } else setMessage("Could not load this queue.");
  }, [name, status, page]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(ids: string[], action: string) {
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(`Delete ${ids.length} item(s) for good?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await sendJson<{ changed: number }>(`/api/admin/${name}`, { ids, action });
    setBusy(false);
    setMessage(res.ok ? `${res.data.changed} item(s) updated.` : "That did not work. Try again.");
    await load();
    onChanged();
  }

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col gap-4" aria-label={name}>
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "primary" : "secondary"}
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s}
          </Button>
        ))}
        <span className="num ml-auto text-sm text-muted">
          {data ? `${data.total} item(s)` : ""}
        </span>
      </div>

      {data && items.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-2 p-2">
          <Checkbox
            label="Select all"
            checked={allSelected}
            onChange={(e) =>
              setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())
            }
          />
          {Object.entries(data.actions).map(([action, label]) => (
            <Button
              key={action}
              size="sm"
              variant={action === "delete" ? "danger" : "secondary"}
              disabled={busy || !selected.size}
              onClick={() => act([...selected], action)}
            >
              {label} ({selected.size})
            </Button>
          ))}
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-lg border border-border bg-raised p-3">
            <Checkbox
              label={<span className="sr-only">Select {item.title}</span>}
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
            />
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- moderation preview of an upload
              <img src={item.image} alt="" className="size-24 shrink-0 rounded-md object-cover" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                <StatusTag tone={TONES[item.status]}>{item.status}</StatusTag>
                {item.href ? (
                  <Link
                    href={locale === "bn" ? item.href : `/${locale}${item.href}`}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </p>
              {item.body ? <p className="text-sm whitespace-pre-line">{item.body}</p> : null}
              <p className="text-xs text-muted">{item.meta.filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(data?.actions ?? {}).map(([action, label]) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === "delete" ? "danger" : "ghost"}
                    disabled={busy}
                    onClick={() => act([item.id], action)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {data && !items.length ? <p className="text-muted">Nothing here.</p> : null}

      {data && data.pageCount > 1 ? (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="num text-sm">
            {page} / {data.pageCount}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= data.pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}

type StarRow = { slug: string; name: string; district: string; score: number; edited: boolean };

function Stars() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StarRow[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getJson<{ items: StarRow[]; pageCount: number }>(
      `/api/admin/stars?q=${encodeURIComponent(q)}&page=${page}`,
    );
    if (res.ok) {
      setRows(res.data.items);
      setPageCount(res.data.pageCount);
    }
  }, [q, page]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(slug: string, score: number | null) {
    const res = await sendJson(`/api/admin/stars`, { slug, score });
    setMessage(res.ok ? "Saved." : "Could not save.");
    await load();
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Editorial stars">
      <p className="text-sm text-muted">
        The editorial score (0 to 10) of each place, shown on its page as ★ n/10 and used to order
        lists. A change survives a re-seed; reset goes back to the seeded score.
      </p>
      <TextInput
        aria-label="Search places"
        placeholder="Search places"
        value={q}
        icon="search"
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className="py-2">Place</th>
            <th>District</th>
            <th>Score</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-border">
              <th scope="row" className="py-2 pr-2 font-normal">
                {r.name} {r.edited ? <StatusTag tone="info">edited</StatusTag> : null}
              </th>
              <td className="pr-2">{r.district}</td>
              <td className="pr-2">
                <Select
                  aria-label={`Score for ${r.name}`}
                  value={String(r.score)}
                  onChange={(e) => void save(r.slug, Number(e.target.value))}
                  options={Array.from({ length: 11 }, (_, n) => ({
                    value: String(n),
                    label: `★ ${n}/10`,
                  }))}
                  className="h-10"
                />
              </td>
              <td>
                {r.edited ? (
                  <Button size="sm" variant="ghost" onClick={() => void save(r.slug, null)}>
                    Reset
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageCount > 1 ? (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="num text-sm">
            {page} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}

type Report = {
  from: string;
  to: string;
  days: { day: string; visits: number; uploads: number; signups: number }[];
  totals: { visits: number; uploads: number; signups: number };
  pages: { path: string; visits: number }[];
};

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function Stats({ today }: { today: string }) {
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    void getJson<Report>(`/api/admin/stats?from=${from}&to=${to}`).then((res) => {
      if (!live) return;
      setError(!res.ok);
      if (res.ok) setReport(res.data);
    });
    return () => {
      live = false;
    };
  }, [from, to]);

  const max = Math.max(1, ...(report?.days.map((d) => d.visits) ?? [1]));

  return (
    <section className="flex flex-col gap-4" aria-label="Daily stats">
      <p className="text-sm text-muted">
        Visits are daily counters per page: no cookies and no IP addresses are stored. Uploads count
        photos and posts; sign-ups count new accounts. Days are Bangladesh days.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          From
          <TextInput
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          To
          <TextInput
            type="date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => (setFrom(addDays(today, -6)), setTo(today))}
        >
          Last 7 days
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => (setFrom(addDays(today, -29)), setTo(today))}
        >
          Last 30 days
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-danger">
          Choose a range of at most a year.
        </p>
      ) : null}
      {report ? (
        <>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ["Visits", report.totals.visits],
                ["Uploads", report.totals.uploads],
                ["Sign-ups", report.totals.signups],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-raised p-3">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="num text-h2">{value}</dd>
              </div>
            ))}
          </dl>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="py-2">Day</th>
                <th>Visits</th>
                <th className="text-right">Uploads</th>
                <th className="text-right">Sign-ups</th>
              </tr>
            </thead>
            <tbody>
              {[...report.days].reverse().map((d) => (
                <tr key={d.day} className="border-b border-border">
                  <th scope="row" className="num py-1.5 pr-2 font-normal">
                    {d.day}
                  </th>
                  <td className="w-1/2 pr-2">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 rounded-pill bg-primary"
                        style={{ width: `${(d.visits / max) * 100}%`, minWidth: d.visits ? 4 : 0 }}
                      />
                      <span className="num">{d.visits}</span>
                    </span>
                  </td>
                  <td className="num text-right">{d.uploads}</td>
                  <td className="num text-right">{d.signups}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="text-h3">Top pages</h3>
          <ol className="flex flex-col gap-1 text-sm">
            {report.pages.map((p) => (
              <li key={p.path} className="flex justify-between gap-3 border-b border-border py-1">
                <span className="truncate">{p.path}</span>
                <span className="num">{p.visits}</span>
              </li>
            ))}
            {!report.pages.length ? <li className="text-muted">No visits in this range.</li> : null}
          </ol>
        </>
      ) : null}
    </section>
  );
}

type LogEntry = {
  id: number;
  adminId: number | null;
  action: string;
  target: string;
  ids: string[];
  detail: string | null;
  createdAt: string;
};

function Log() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  useEffect(() => {
    void getJson<{ entries: LogEntry[] }>("/api/admin/log").then((res) => {
      if (res.ok) setEntries(res.data.entries);
    });
  }, []);
  return (
    <section className="flex flex-col gap-3" aria-label="Admin log">
      <p className="text-sm text-muted">Every action taken here, newest first.</p>
      <ul className="flex flex-col gap-1 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="border-b border-border py-1.5">
            <span className="num text-muted">{e.createdAt}</span> · admin #{e.adminId ?? "?"} ·{" "}
            <strong>{e.action}</strong> {e.target} · {e.ids.slice(0, 10).join(", ")}
            {e.ids.length > 10 ? ` (+${e.ids.length - 10})` : ""}
            {e.detail ? ` · ${e.detail}` : ""}
          </li>
        ))}
        {!entries.length ? <li className="text-muted">Nothing yet.</li> : null}
      </ul>
    </section>
  );
}
