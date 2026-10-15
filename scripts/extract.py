#!/usr/bin/env python3
"""Turn a crawl of unseenbd.com into structured, factual JSON/CSV datasets.

Usage:
    python3 -I scripts/extract.py <pages_dir> <districts_chunk.js> <out_dir>

<pages_dir>   one HTML file per sitemap URL (path with "/" -> "__", "_root.html" for "/").
              Every page embeds its react-query cache in <script id="ob-data">.
<districts_chunk.js>  the site's public districts-*.js asset (district master table).
<out_dir>     where data/*.json and data/*.csv are written.

Only structured facts are kept (names, ids, coordinates, months, fares, timetables,
counts). The site's written prose (place descriptions, "how to get there", district
intros, route notes, warnings), its photos and anything identifying individual users
are deliberately left out.
"""
import csv
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict

PAGES, DIST_JS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
BASE = "https://unseenbd.com"

KINDS = ["beach", "island", "hill", "waterfall", "forest", "river", "tea",
         "heritage", "spiritual", "city", "village"]
MONTHS = ["january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december"]
DIVISIONS = ["rangpur", "rajshahi", "mymensingh", "sylhet", "dhaka", "khulna",
             "barishal", "chattogram"]


def read(name):
    p = os.path.join(PAGES, name + ".html")
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def ob(h):
    m = re.search(r'<script id="ob-data" type="application/json">(.*?)</script>', h, re.S)
    return json.loads(m.group(1)) if m else {"queries": []}


def query(h, name):
    for key, val in ob(h)["queries"]:
        if key[0] == name:
            return val
    return None


def tag(h, t):
    m = re.search(rf"<{t}[^>]*>(.*?)</{t}>", h, re.S)
    return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else None


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")


def page_files(prefix):
    return sorted(f[:-5] for f in os.listdir(PAGES) if f.startswith(prefix) and f.endswith(".html"))


# ---------- divisions & districts ----------
js = open(DIST_JS, encoding="utf-8").read()
rows = re.findall(r"\{id:(\d+),slug:`([^`]+)`,en:`([^`]+)`,bn:`([^`]+)`,div:`([^`]+)`,lat:([\d.]+),lng:([\d.]+)", js)
districts = {int(i): {"id": int(i), "slug": s, "name_en": en, "name_bn": bn, "division": d,
                      "lat": float(la), "lng": float(lo)} for i, s, en, bn, d, la, lo in rows}
assert len(districts) == 64, len(districts)
by_slug = {d["slug"]: d for d in districts.values()}

home_bn, home_en = read("_root"), read("en")
div_bn = re.findall(r'<h3 class="font-semibold">([^<]+) বিভাগ</h3>', home_bn)
div_en = re.findall(r'<h3 class="font-semibold">([^<]+) Division</h3>', home_en)
divisions = [{"slug": s, "name_bn": div_bn[i] if i < len(div_bn) else None,
              "name_en": div_en[i] if i < len(div_en) else s.title(),
              "district_ids": sorted(d["id"] for d in districts.values() if d["division"] == s)}
             for i, s in enumerate(DIVISIONS)]

# ---------- route summary from Dhaka ----------
routes_summary = query(read("routes"), "routes") or []
dhaka = {r["to"]: r for r in routes_summary}

# ---------- places ----------
unseen = {p["slug"] for p in (query(read("unseen"), "unseen") or [])}
popular = [p["slug"] for p in (query(home_bn, "popular") or [])]
places = []
for f in page_files("place__"):
    slug = f[len("place__"):]
    bn = query(read(f), "place")
    en = query(read("en__" + f) or "", "place") or {}
    if not bn:
        continue
    d = districts[bn["districtId"]]
    best = bn.get("best") or [None, None]
    r = dhaka.get(d["id"]) if d["id"] != 1 else None
    places.append({
        "id": bn["id"], "slug": slug,
        "name_bn": bn["name"], "name_en": en.get("name"),
        "district_id": d["id"], "district": d["slug"], "division": d["division"],
        "kind": bn["kind"], "popular": bool(bn.get("popular")), "unseen": slug in unseen,
        "best_from_month": best[0], "best_to_month": best[1],
        "visit_hours": bn.get("hours"),
        "lat": (bn.get("at") or [None, None])[0], "lng": (bn.get("at") or [None, None])[1],
        "stars": bn.get("stars"),
        "image_credit": {"by": bn.get("imgBy"), "license": bn.get("imgLicense"),
                         "source": bn.get("imgSource")} if bn.get("imgSource") else None,
        "nearby": [n["slug"] for n in bn.get("nearby", [])],
        "from_dhaka": {"road_km": r["km"], "bus_hours": r["hours"], "bus_fare_from_bdt": r["fareFrom"],
                       "direct_trains": r["trains"]} if r else None,
        "url": f"{BASE}/place/{slug}",
    })
places.sort(key=lambda p: p["id"])
dump("places.json", places)
with open(os.path.join(OUT, "places.csv"), "w", encoding="utf-8", newline="") as fh:
    cols = ["id", "slug", "name_en", "name_bn", "district", "division", "kind", "popular", "unseen",
            "best_from_month", "best_to_month", "visit_hours", "lat", "lng", "stars", "url"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    w.writerows(places)

# ---------- districts (with famous foods/products and place lists) ----------
place_by_district = defaultdict(list)
for p in places:
    place_by_district[p["district_id"]].append(p["slug"])
for d in districts.values():
    bn = query(read("district__" + d["slug"]) or "", "district") or {}
    en = query(read("en__district__" + d["slug"]) or "", "district") or {}
    d["famous_for_bn"] = bn.get("famous", [])
    d["famous_for_en"] = en.get("famous", [])
    d["places"] = place_by_district[d["id"]]
    d["place_count"] = len(d["places"])
    d["community_photo_count"] = len(bn.get("photos", []))
    r = dhaka.get(d["id"])
    d["from_dhaka"] = {"road_km": r["km"], "bus_hours": r["hours"], "bus_fare_from_bdt": r["fareFrom"],
                       "direct_trains": r["trains"]} if r else None
    d["url"] = f"{BASE}/district/{d['slug']}"
dump("districts.json", sorted(districts.values(), key=lambda d: d["id"]))
dump("divisions.json", divisions)

# ---------- kinds & months ----------
kinds = []
for k in KINDS:
    hb, he = read("kind__" + k), read("en__kind__" + k)
    lst = query(hb, "list") or []
    kinds.append({"key": k,
                  "label_bn": (tag(hb, "h1") or "").replace("বাংলাদেশের ", ""),
                  "label_en": (tag(he, "h1") or "").replace(" in Bangladesh", ""),
                  "count": len(lst), "places": [p["slug"] for p in lst]})
dump("kinds.json", kinds)

months = []
for i, m in enumerate(MONTHS, 1):
    lst = query(read("month__" + m), "list") or []
    months.append({"month": i, "slug": m, "count": len(lst), "places": [p["slug"] for p in lst]})
dump("months.json", months)

# ---------- routes ----------
dump("routes_from_dhaka.json", [
    {"to_district_id": r["to"], "to": districts[r["to"]]["slug"], "road_km": r["km"],
     "bus_hours": r["hours"], "bus_fare_from_bdt": r["fareFrom"], "direct_trains": r["trains"]}
    for r in routes_summary])

PROSE = {"notes", "advisory"}


def strip(o):
    if isinstance(o, dict):
        return {k: strip(v) for k, v in o.items() if k not in PROSE}
    if isinstance(o, list):
        return [strip(x) for x in o]
    return o


routes = []
for f in page_files("route__"):
    slug = f[len("route__"):]
    bn = query(read(f), "route")
    en = query(read("en__" + f) or "", "route") or {}
    if not bn:
        continue
    bus_bn, bus_en = bn.get("bus") or {}, en.get("bus") or {}
    bus = strip(bus_bn) if bus_bn else None
    if bus:
        bus["terminals_en"] = bus_en.get("terminals")
        bus["arrives_en"] = bus_en.get("arrives")
        bus["operators_en"] = [o["name"] for o in bus_en.get("operators", [])]
    routes.append({
        "slug": slug, "from": districts[bn["from"]]["slug"], "to": districts[bn["to"]]["slug"],
        "road_km": (bn.get("road") or {}).get("km"),
        "bus": bus,
        "trains": [t.get("slug", t) if isinstance(t, dict) else t for t in bn.get("trains", [])],
        "trains_back": [t.get("slug", t) if isinstance(t, dict) else t for t in bn.get("trainsBack", [])],
        "water": strip(bn.get("water", [])), "water_en": strip(en.get("water", [])),
        "flight": strip(bn.get("flight")), "flight_en": strip(en.get("flight")),
        "places_at_destination": [p["slug"] for p in bn.get("places", [])],
        "url": f"{BASE}/route/{slug}",
    })
dump("routes.json", routes)

# ---------- trains ----------
trains = []
for f in page_files("train__"):
    bn = query(read(f), "train")
    en = query(read("en__" + f) or "", "train") or {}
    if not bn:
        continue
    stops_en = en.get("stops") or []
    trains.append({
        "no": bn["no"], "slug": bn["slug"], "name_bn": bn["name"], "name_en": en.get("name"),
        "off_day": bn.get("offDay"),
        "from_bn": bn["from"], "from_en": en.get("from"), "from_district_id": bn.get("fromDistrictId"),
        "to_bn": bn["to"], "to_en": en.get("to"), "to_district_id": bn.get("toDistrictId"),
        "dep": bn["dep"], "arr": bn["arr"], "minutes": bn["minutes"],
        "stops": [{**s, "station_en": stops_en[i]["station"] if i < len(stops_en) else None}
                  for i, s in enumerate(bn.get("stops", []))],
        "fares": bn.get("fares", []), "classes": bn.get("classes"),
        "timetable": bn.get("timetable"), "confidence": bn.get("confidence"), "as_of": bn.get("asOf"),
        "sources": bn.get("sources", []),
        "return_train": (bn.get("back") or {}).get("slug"),
        "url": f"{BASE}/train/{bn['slug']}",
    })
trains.sort(key=lambda t: t["no"])
dump("trains.json", trains)

# ---------- curated lists & community aggregates (no user identities) ----------
trend = query(home_bn, "trend") or {}
dump("curation.json", {
    "popular_24": popular,
    "unseen": sorted(unseen),
    "trending_snapshot": {"month": trend.get("month"), "items": [
        {"slug": t.get("slug"), "votes": t.get("votes"), "likes": t.get("likes"),
         "comments": t.get("comments"), "stars": t.get("stars")}
        for t in trend.get("items", []) if t.get("slug")]},
})

photos_total = (query(read("gallery"), "photos") or {}).get("total")
dump("community_summary.json", {
    "note": "Aggregate counts only; names, handles and photos of users are intentionally not stored.",
    "gallery_photos_total": photos_total,
    "photo_pages_in_sitemap": len(page_files("photo__")),
})

# ---------- page inventory ----------
pages = []
for f in sorted(os.listdir(PAGES)):
    h = open(os.path.join(PAGES, f), encoding="utf-8").read()
    path = "/" + f[:-5].replace("__", "/") if f != "_root.html" else "/"
    if path.startswith("/_root"):
        path = "/"
    lang = "en" if path == "/en" or path.startswith("/en/") else "bn"
    section = path.strip("/").split("/")[1 if lang == "en" and path != "/en" else 0] if path not in ("/", "/en") else "home"
    section = section or "home"
    # community photo pages carry the uploader's name and caption: keep the path only
    private = section == "photo"
    pages.append({"path": path, "lang": lang, "section": section,
                  "title": None if private else tag(h, "title"),
                  "h1": None if private else tag(h, "h1")})
dump("site_pages.json", pages)

stats = {
    "pages_crawled": len(pages),
    "sections": Counter(p["section"] for p in pages if p["lang"] == "bn"),
    "places": len(places), "popular": sum(p["popular"] for p in places),
    "unseen": sum(p["unseen"] for p in places), "districts": len(districts),
    "divisions": len(divisions), "kinds": {k["key"]: k["count"] for k in kinds},
    "routes_detailed": len(routes), "routes_from_dhaka": len(routes_summary), "trains": len(trains),
    "places_with_coordinates": sum(1 for p in places if p["lat"] is not None),
    "places_with_image_credit": sum(1 for p in places if p["image_credit"]),
}
dump("stats.json", stats)
print(json.dumps(stats, ensure_ascii=False, indent=1))
