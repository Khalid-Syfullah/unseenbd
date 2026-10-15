/** Query-string helpers for pages (`searchParams` values are a string, a list, or missing). */
export type SearchParams = Record<string, string | string[] | undefined>;

/** The first value of a query parameter, or "". */
export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** A positive whole number from a query parameter; 1 when missing or malformed. */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(firstParam(value));
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

/** A switch parameter: `1`, `true` or `on`. */
export function flagParam(value: string | string[] | undefined): boolean {
  return ["1", "true", "on"].includes(firstParam(value).toLowerCase());
}
