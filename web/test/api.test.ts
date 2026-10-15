// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as districtGET } from "@/app/api/districts/[slug]/route";
import { GET as famousGET } from "@/app/api/famous/route";
import { GET as placeListGET } from "@/app/api/place-list/route";
import { GET as placePointsGET } from "@/app/api/place-points/route";
import { GET as placeGET } from "@/app/api/places/[slug]/route";
import { GET as placesGET } from "@/app/api/places/route";
import { GET as popularGET } from "@/app/api/popular/route";
import { GET as routeGET } from "@/app/api/routes/[slug]/route";
import { GET as routesGET } from "@/app/api/routes/route";
import { GET as trainGET } from "@/app/api/trains/[slug]/route";
import { GET as trainsGET } from "@/app/api/trains/route";
import { GET as trendGET } from "@/app/api/trend/route";
import { GET as unseenGET } from "@/app/api/unseen/route";
import { STATIC_CACHE } from "@/server/api";

const req = (path: string) => new NextRequest(new URL(path, "http://localhost"));
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

async function ok(res: Response) {
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe(STATIC_CACHE);
  return res.json();
}

describe("GET /api/places", () => {
  it("filters, paginates and localises", async () => {
    const body = await ok(await placesGET(req("/api/places?kind=beach&lang=en")));
    expect(body.total).toBe(9);
    expect(body.items[0].kind.label).toBe("Beaches");

    const page2 = await ok(await placesGET(req("/api/places?page=2&pageSize=10")));
    expect(page2.page).toBe(2);
    expect(page2.items).toHaveLength(10);

    const winter = await ok(await placesGET(req("/api/places?month=december&unseen=1")));
    expect(winter.items.every((p: { unseen: boolean }) => p.unseen)).toBe(true);
  });

  it("rejects malformed parameters", async () => {
    expect((await placesGET(req("/api/places?page=0"))).status).toBe(400);
    expect((await placesGET(req("/api/places?page=abc"))).status).toBe(400);
    expect((await placesGET(req("/api/places?month=13"))).status).toBe(400);
    expect((await placesGET(req("/api/places?pageSize=1000"))).status).toBe(400);
  });
});

describe("place, district, route and train endpoints", () => {
  it("returns one place in the requested language, or 404", async () => {
    const bn = await ok(await placeGET(req("/api/places/nilgiri-hill"), ctx("nilgiri-hill")));
    expect(bn.name).toBe("নীলগিরি");
    const en = await ok(
      await placeGET(req("/api/places/nilgiri-hill?lang=en"), ctx("nilgiri-hill")),
    );
    expect(en.name).toBe("Nilgiri");
    const ja = await ok(
      await placeGET(req("/api/places/nilgiri-hill?lang=ja"), ctx("nilgiri-hill")),
    );
    expect(ja.name).toBe("Nilgiri");
    const missing = await placeGET(req("/api/places/nope"), ctx("nope"));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns a district", async () => {
    const body = await ok(await districtGET(req("/api/districts/sylhet?lang=en"), ctx("sylhet")));
    expect(body.name).toBe("Sylhet");
    expect((await districtGET(req("/api/districts/x"), ctx("x"))).status).toBe(404);
  });

  it("returns routes and the Dhaka summary", async () => {
    const list = await ok(await routesGET(req("/api/routes")));
    expect(list.routes).toHaveLength(150);
    expect(list.fromDhaka).toHaveLength(63);
    const route = await ok(
      await routeGET(req("/api/routes/dhaka-to-sylhet?lang=en"), ctx("dhaka-to-sylhet")),
    );
    expect(route.to.name).toBe("Sylhet");
    expect((await routeGET(req("/api/routes/x"), ctx("x"))).status).toBe(404);
  });

  it("returns trains", async () => {
    expect(await ok(await trainsGET(req("/api/trains")))).toHaveLength(120);
    const train = await ok(
      await trainGET(req("/api/trains/suborno-express-701?lang=en"), ctx("suborno-express-701")),
    );
    expect(train.no).toBe(701);
    expect(train.stops.length).toBeGreaterThan(1);
    expect((await trainGET(req("/api/trains/x"), ctx("x"))).status).toBe(404);
  });
});

describe("list endpoints", () => {
  it("serves place lists by kind or month", async () => {
    const byKind = await ok(await placeListGET(req("/api/place-list?kind=tea&lang=en")));
    expect(byKind.kind.label).toBe("Tea gardens");
    expect(byKind.places).toHaveLength(2);
    const byMonth = await ok(await placeListGET(req("/api/place-list?month=4")));
    expect(byMonth.month.name).toBe("এপ্রিল");
    expect(byMonth.places).toHaveLength(26);
    expect((await placeListGET(req("/api/place-list"))).status).toBe(400);
    expect((await placeListGET(req("/api/place-list?kind=volcano"))).status).toBe(404);
  });

  it("serves points, popular, unseen, trend and famous", async () => {
    expect(await ok(await placePointsGET(req("/api/place-points")))).toHaveLength(253);
    expect(await ok(await popularGET(req("/api/popular")))).toHaveLength(24);
    const sylhetPopular = await ok(await popularGET(req("/api/popular?division=sylhet")));
    expect(
      sylhetPopular.every((p: { division: { slug: string } }) => p.division.slug === "sylhet"),
    ).toBe(true);
    expect(await ok(await unseenGET(req("/api/unseen")))).toHaveLength(8);
    expect((await ok(await trendGET(req("/api/trend")))).items).toHaveLength(56);
    expect(await ok(await famousGET(req("/api/famous?lang=en")))).toHaveLength(64);
  });
});
