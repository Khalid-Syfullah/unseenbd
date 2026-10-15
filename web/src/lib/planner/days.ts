import {
  DAY_HOURS,
  DEFAULT_SIGHT_MAX_HOURS,
  DEFAULT_SIGHTS,
  FALLBACK_SIGHT_MAX_HOURS,
  SIGHT_EXTRA_HOURS,
} from "./constants";
import type { PlanDay, PlanItem, PlannerPlace } from "./types";

const EPS = 1e-9;

const byStars = (a: PlannerPlace, b: PlannerPlace) => b.stars - a.stars || a.id - b.id;
const byHours = (a: PlannerPlace, b: PlannerPlace) => a.visitHours - b.visitHours || byStars(a, b);

/**
 * The sights picked for a destination when the traveller chooses none: up to 3 popular places
 * that take at most 8 hours (best rated first), or — when there are none — up to 3 places of at
 * most 3 hours. Visited shortest first.
 */
export function defaultSights(places: readonly PlannerPlace[], districtId: number): PlannerPlace[] {
  const here = places.filter((p) => p.districtId === districtId);
  let picks = here
    .filter((p) => p.popular && p.visitHours <= DEFAULT_SIGHT_MAX_HOURS)
    .sort(byStars)
    .slice(0, DEFAULT_SIGHTS);
  if (!picks.length) {
    picks = here
      .filter((p) => p.visitHours <= FALLBACK_SIGHT_MAX_HOURS)
      .sort(byStars)
      .slice(0, DEFAULT_SIGHTS);
  }
  return picks.sort(byHours);
}

/** Hours an item takes out of a day: a leg at most a whole day, a sight its time + 0.5. */
export function itemHours(item: PlanItem, dayHours = DAY_HOURS): number {
  return item.type === "leg" ? Math.min(item.hours, dayHours) : item.hours + SIGHT_EXTRA_HOURS;
}

/**
 * Pack the trip's legs and sights into days of 9 usable hours. When the next item does not fit
 * and the day already has something in it, the day ends with a night in the current district and
 * a new day starts. An item longer than a day spills into the following days (the same district).
 */
export function packDays(
  items: readonly PlanItem[],
  start: number,
  dayHours = DAY_HOURS,
): PlanDay[] {
  const days: PlanDay[] = [];
  let at = start;
  let day: PlanDay = { day: 1, items: [], hours: 0, sleepIn: null, endsIn: start };

  const nextDay = () => {
    day.sleepIn = at;
    day.endsIn = at;
    days.push(day);
    day = { day: days.length + 1, items: [], hours: 0, sleepIn: null, endsIn: at };
  };

  for (const item of items) {
    const need = itemHours(item, dayHours);
    if (day.items.length && day.hours + need > dayHours + EPS) nextDay();
    day.items.push(item);
    day.hours += need;
    if (item.type === "leg") at = item.to;
    // A sight longer than what is left of the day carries on into the next ones.
    while (day.hours > dayHours + EPS && item.type === "sight") {
      const rest = day.hours - dayHours;
      day.hours = dayHours;
      nextDay();
      day.items.push({ ...item, continued: true });
      day.hours = rest;
    }
  }
  day.endsIn = at;
  days.push(day);
  return days;
}
