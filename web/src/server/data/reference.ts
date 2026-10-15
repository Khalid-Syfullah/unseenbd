import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { reference } from "../db/schema";

export type EmergencyNumber = { number: string; en: string };
export type ForeignCountry = {
  no: number;
  region: string;
  country: string;
  countryBn: string;
  cities: string[];
};

function value(key: string): unknown[] {
  const row = getDb().select().from(reference).where(eq(reference.key, key)).get();
  return Array.isArray(row?.value) ? row.value : [];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** The emergency numbers (`reference.json` → `emergency_numbers`), in the order given. */
export async function listEmergencyNumbers(): Promise<EmergencyNumber[]> {
  return (value("emergency_numbers") as Record<string, unknown>[])
    .map((r) => ({ number: str(r.number), en: str(r.en) }))
    .filter((r) => r.number);
}

/** The countries of the foreign tour guide (`reference.json` → `foreign_tour`), by number. */
export async function listForeignTour(): Promise<ForeignCountry[]> {
  return (value("foreign_tour") as Record<string, unknown>[])
    .map((r) => ({
      no: Number(r.no),
      region: str(r.region),
      country: str(r.country),
      countryBn: str(r.country_bn),
      cities: Array.isArray(r.cities) ? r.cities.map(str) : [],
    }))
    .filter((r) => r.country)
    .sort((a, b) => a.no - b.no);
}
