"use client";

/* Interactive demos for the /design gallery. Each keeps its own state. */

import { useId, useState } from "react";
import { BangladeshMap, MAP_DISTRICTS } from "@/components/maps/BangladeshMap";
import { WorldMap, type WorldStatus } from "@/components/maps/WorldMap";
import { Button } from "@/components/ui/Button";
import { ChipRow, DistrictChip, FilterChip, KINDS, type Kind } from "@/components/ui/Chip";
import { Dialog, Sheet } from "@/components/ui/Dialog";
import {
  Checkbox,
  DistrictSelect,
  Field,
  Radio,
  SearchInput,
  SegmentedControl,
  Select,
  Stepper,
  Switch,
  TextInput,
  type DivisionGroup,
} from "@/components/ui/Form";
import { ListingCard, type ListingCardData } from "@/components/ui/ListingCard";
import { Accordion, Pagination, PillTabs, TabPanel } from "@/components/ui/Navigation";
import { PostCard, type PostCardData } from "@/components/ui/PostCard";
import { useToast } from "@/components/ui/Toast";

type Copy = { bn: boolean };

export function FilterChipsDemo({
  kinds,
  allLabel,
  label,
}: {
  kinds: { key: string; label: string }[];
  allLabel: string;
  label: string;
}) {
  const [selected, setSelected] = useState<string[]>(["hill"]);
  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  return (
    <ChipRow label={label}>
      <FilterChip selected={selected.length === 0} onClick={() => setSelected([])}>
        {allLabel}
      </FilterChip>
      {kinds.map((k) => (
        <FilterChip
          key={k.key}
          icon={(KINDS as readonly string[]).includes(k.key) ? `kinds/${k.key as Kind}` : undefined}
          selected={selected.includes(k.key)}
          onClick={() => toggle(k.key)}
        >
          {k.label}
        </FilterChip>
      ))}
      <FilterChip disabled>—</FilterChip>
    </ChipRow>
  );
}

export function DistrictChipsDemo({ districts }: { districts: { slug: string; name: string }[] }) {
  const [visited, setVisited] = useState<string[]>(districts.slice(0, 2).map((d) => d.slug));
  return (
    <div className="flex flex-wrap gap-2">
      {districts.map((d) => (
        <DistrictChip
          key={d.slug}
          visited={visited.includes(d.slug)}
          onClick={() =>
            setVisited((v) => (v.includes(d.slug) ? v.filter((x) => x !== d.slug) : [...v, d.slug]))
          }
        >
          {d.name}
        </DistrictChip>
      ))}
    </div>
  );
}

export function FormsDemo({ divisions, bn }: { divisions: DivisionGroup[] } & Copy) {
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [shortest, setShortest] = useState(true);
  const [ret, setRet] = useState(false);
  const [district, setDistrict] = useState("sylhet");
  const toast = useToast();
  const radioName = useId();
  const L = bn
    ? {
        name: "আপনার নাম",
        nameHint: "লিডারবোর্ডে এই নাম দেখা যাবে।",
        email: "ইমেইল",
        emailError: "সঠিক ইমেইল ঠিকানা লিখুন।",
        start: "শুরুর জেলা",
        month: "মাস",
        travellers: "ভ্রমণকারী",
        budget: "বাজেট",
        low: "সাশ্রয়ী",
        mid: "মাঝারি",
        high: "আরামদায়ক",
        lowHint: "বাস, সাধারণ হোটেল, স্থানীয় খাবার।",
        midHint: "এসি বাস বা ট্রেন, ভালো হোটেল।",
        highHint: "ফ্লাইট বা ভাড়া গাড়ি, রিসোর্ট।",
        shortest: "সবচেয়ে ছোট পথে সাজান",
        ret: "শুরুর জায়গায় ফিরে আসুন",
        agree: "নিয়মগুলো পড়েছি",
        disabled: "বন্ধ করা অপশন",
        bus: "বাস",
        train: "ট্রেন",
        launch: "লঞ্চ",
      }
    : {
        name: "Your name",
        nameHint: "Shown on the leaderboard.",
        email: "Email",
        emailError: "Enter a valid email address.",
        start: "Start district",
        month: "Month",
        travellers: "Travellers",
        budget: "Budget",
        low: "Thrifty",
        mid: "Moderate",
        high: "Plush",
        lowHint: "Buses, simple hotels, local food.",
        midHint: "AC bus or train, good hotels.",
        highHint: "Flights or a hired car, resorts.",
        shortest: "Order by shortest path",
        ret: "Return to start",
        agree: "I have read the rules",
        disabled: "Disabled option",
        bus: "Bus",
        train: "Train",
        launch: "Launch",
      };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Field label={L.name} hint={L.nameHint} htmlFor="demo-name">
          <TextInput id="demo-name" defaultValue={bn ? "রুমানা" : "Rumana"} icon="user" />
        </Field>
        <Field label={L.email} error={L.emailError} htmlFor="demo-email">
          <TextInput
            id="demo-email"
            type="email"
            defaultValue="rumana@"
            invalid
            aria-describedby="demo-email-error"
          />
        </Field>
        <SearchInput
          defaultValue={bn ? "সাজেক" : "Sajek"}
          onSearch={(q) => toast.show(`${bn ? "খোঁজা হচ্ছে" : "Searching"}: ${q}`)}
        />
        <SearchInput />
        <Field label={L.start} htmlFor="demo-district">
          <DistrictSelect
            id="demo-district"
            divisions={divisions}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </Field>
        <Field label={L.month} htmlFor="demo-month">
          <Select
            id="demo-month"
            placeholder={bn ? "যেকোনো মাস" : "Any month"}
            options={[
              { value: "10", label: bn ? "অক্টোবর" : "October" },
              { value: "11", label: bn ? "নভেম্বর" : "November" },
            ]}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{L.travellers}</span>
          <Stepper
            label={L.travellers}
            value={travellers}
            onChange={setTravellers}
            min={1}
            max={20}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{L.budget}</span>
          <SegmentedControl
            label={L.budget}
            value={budget}
            onChange={setBudget}
            options={[
              { value: "low", label: L.low, hint: L.lowHint },
              { value: "mid", label: L.mid, hint: L.midHint },
              { value: "high", label: L.high, hint: L.highHint },
            ]}
          />
        </div>
        <div className="flex flex-col">
          <Switch checked={shortest} onChange={setShortest} label={L.shortest} />
          <Switch checked={ret} onChange={setRet} label={L.ret} />
          <Switch checked={false} onChange={() => {}} label={L.disabled} disabled />
        </div>
        <div className="flex flex-col">
          <Checkbox label={L.agree} defaultChecked />
          <Checkbox label={L.ret} />
          <Checkbox label={L.disabled} disabled />
        </div>
        <fieldset className="flex flex-col">
          <legend className="text-sm font-semibold">{bn ? "যাতায়াত" : "Transport"}</legend>
          <Radio name={radioName} label={L.bus} defaultChecked />
          <Radio name={radioName} label={L.train} />
          <Radio name={radioName} label={L.launch} disabled />
        </fieldset>
      </div>
    </div>
  );
}

export function PillTabsDemo({ bn }: Copy) {
  const tabs = bn
    ? [
        { id: "sprint", label: "🧠 দশ প্রশ্নের দৌড়" },
        { id: "clue", label: "📸 ছবির সূত্র" },
        { id: "memory", label: "🧩 জোড়া মেলান" },
        { id: "duel", label: "📏 দূরত্বের লড়াই" },
      ]
    : [
        { id: "sprint", label: "🧠 Ten-question sprint" },
        { id: "clue", label: "📸 Photo clue" },
        { id: "memory", label: "🧩 Memory pairs" },
        { id: "duel", label: "📏 Distance duel" },
      ];
  const [tab, setTab] = useState("sprint");
  const prefix = "demo-games";
  return (
    <div className="flex flex-col gap-3">
      <PillTabs
        label={bn ? "খেলা" : "Games"}
        tabs={tabs}
        value={tab}
        onChange={setTab}
        idPrefix={prefix}
      />
      {tabs.map((t) => (
        <TabPanel
          key={t.id}
          idPrefix={prefix}
          id={t.id}
          active={t.id === tab}
          className="rounded-md bg-sunken p-4 text-sm text-muted"
        >
          {t.label}
        </TabPanel>
      ))}
    </div>
  );
}

export function PaginationDemo() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} pageCount={6} onChange={setPage} />;
}

export function AccordionDemo({ bn }: Copy) {
  const items = bn
    ? [
        {
          id: "free",
          title: "Unseen BD কি বিনামূল্যে?",
          content: "হ্যাঁ। কোনো অ্যাকাউন্ট ছাড়াই সব কিছু ব্যবহার করা যায়, আর কোনো ট্র্যাকার নেই।",
        },
        {
          id: "data",
          title: "ভাড়ার তথ্য কতটা নির্ভরযোগ্য?",
          content: "প্রতিটি ভাড়ার পাশে তারিখ, নির্ভরযোগ্যতা আর উৎস দেওয়া থাকে।",
        },
        {
          id: "map",
          title: "আমার মানচিত্র কোথায় জমা থাকে?",
          content: "আপনার ব্রাউজারে। লগ ইন করলে অ্যাকাউন্টেও রাখা হয়।",
        },
      ]
    : [
        {
          id: "free",
          title: "Is Unseen BD free?",
          content: "Yes. Everything works without an account, and there are no trackers.",
        },
        {
          id: "data",
          title: "How reliable are the fares?",
          content: "Every fare shows the date it was checked, a confidence level and its sources.",
        },
        {
          id: "map",
          title: "Where is my map saved?",
          content: "In your browser. When you log in, it is also kept in your account.",
        },
      ];
  return <Accordion items={items} single defaultOpen={["free"]} />;
}

export function DialogDemo({ bn }: Copy) {
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setDialog(true)}>
        {bn ? "ডায়ালগ খুলুন" : "Open dialog"}
      </Button>
      <Button variant="secondary" onClick={() => setSheet(true)}>
        {bn ? "পাশের শিট খুলুন" : "Open side sheet"}
      </Button>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title={bn ? "ভুল বা পরামর্শ পাঠান" : "Send a tip or correction"}
        description={bn ? "ফোনে এটি নিচ থেকে ওঠা শিট।" : "On phones this is a bottom sheet."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(false)}>
              {bn ? "বাতিল" : "Cancel"}
            </Button>
            <Button onClick={() => setDialog(false)}>{bn ? "পাঠান" : "Send"}</Button>
          </>
        }
      >
        <Field label={bn ? "আপনার বার্তা" : "Your message"} htmlFor="demo-dialog-msg">
          <TextInput id="demo-dialog-msg" />
        </Field>
      </Dialog>
      <Sheet open={sheet} onClose={() => setSheet(false)} title={bn ? "ফিল্টার" : "Filters"}>
        <div className="flex flex-col gap-3 p-5">
          <Checkbox label={bn ? "শুধু কম-দেখা" : "Only lesser-known"} />
          <Button onClick={() => setSheet(false)}>{bn ? "দেখান" : "Show results"}</Button>
        </div>
      </Sheet>
    </div>
  );
}

export function ToastDemo({ bn }: Copy) {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() => toast.show(bn ? "লিংক কপি হয়েছে" : "Link copied")}
      >
        {bn ? "সাধারণ বার্তা" : "Neutral toast"}
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.show(bn ? "জেলাটি আপনার মানচিত্রে যোগ হয়েছে" : "District added to your map", {
            tone: "success",
          })
        }
      >
        {bn ? "সফল" : "Success toast"}
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.show(bn ? "সংযোগ নেই। আবার চেষ্টা করুন।" : "No connection. Try again.", {
            tone: "error",
          })
        }
      >
        {bn ? "ত্রুটি" : "Error toast"}
      </Button>
    </div>
  );
}

export function PostDemo({ post }: { post: PostCardData }) {
  const [liked, setLiked] = useState(false);
  const toast = useToast();
  return (
    <PostCard
      post={{ ...post, liked, likes: post.likes + (liked ? 1 : 0) }}
      onLike={() => setLiked((v) => !v)}
      onShare={() => toast.show("✓")}
      onComments={() => toast.show("💬")}
    />
  );
}

export function ListingDemo({ listing, bn }: { listing: ListingCardData } & Copy) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListingCard listing={listing} onDetails={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={listing.name}
        description={`${listing.category} · ${listing.area}`}
        footer={
          <Button icon="directions" onClick={() => setOpen(false)}>
            {bn ? "গুগল ম্যাপে খুলুন" : "Open in Google Maps"}
          </Button>
        }
      >
        <p className="text-muted">
          {bn
            ? "নমুনা তালিকা। আসল তথ্য পরের ধাপে যোগ হবে।"
            : "A sample listing. Real details arrive in a later phase."}
        </p>
      </Dialog>
    </>
  );
}

export function BangladeshMapDemo({
  placeCounts,
  mode,
}: {
  placeCounts: Record<string, number>;
  mode: "toggle" | "select" | "static";
}) {
  const [visited, setVisited] = useState<string[]>(["dhaka", "sylhet", "coxs-bazar", "rangamati"]);
  const [selected, setSelected] = useState<string | null>("sylhet");
  if (mode === "static") {
    return <BangladeshMap visited={visited} size="mini" />;
  }
  if (mode === "select") {
    return (
      <BangladeshMap
        selected={selected}
        onSelect={(slug) => setSelected((s) => (s === slug ? null : slug))}
        placeCounts={placeCounts}
        labels
        legend="divisions"
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <BangladeshMap
        visited={visited}
        onToggle={(slug, on) =>
          setVisited((v) => (on ? [...v, slug] : v.filter((x) => x !== slug)))
        }
        placeCounts={placeCounts}
        labelToggle
        legend
      />
      <p className="num text-sm text-muted">
        {visited.length} / {MAP_DISTRICTS.length}
      </p>
    </div>
  );
}

export function WorldMapDemo({ bn }: Copy) {
  const [value, setValue] = useState<Record<string, WorldStatus>>({
    BD: "visited",
    IN: "visited",
    NP: "wish",
    JP: "wish",
  });
  const [mark, setMark] = useState<WorldStatus>("visited");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label={bn ? "যা চিহ্নিত করবেন" : "Mark as"}
        value={mark}
        onChange={setMark}
        options={[
          { value: "visited", label: bn ? "গিয়েছি" : "Visited" },
          { value: "wish", label: bn ? "যেতে চাই" : "Want to go" },
        ]}
        className="max-w-sm"
      />
      <WorldMap
        value={value}
        mark={mark}
        onChange={(key, status) =>
          setValue((v) => {
            const next = { ...v };
            if (status) next[key] = status;
            else delete next[key];
            return next;
          })
        }
        legend
      />
    </div>
  );
}
