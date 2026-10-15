/** Joins class names, skipping falsy values: `cn("a", on && "b", undefined)` → `"a b"`. */
export function cn(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(" ");
}
