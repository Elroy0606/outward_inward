import type { Shipment } from "@/lib/types";

export type TransitAgingLevel = "fresh" | "moving" | "approaching" | "warning" | "critical";

export interface TransitAgingStep {
  level: TransitAgingLevel;
  /** The step applies from this many calendar days in transit. */
  fromDay: number;
  pillClass: string;
  rowClass: string;
}

/**
 * Tweak transit-aging behavior here. Everything else reads from this object.
 *
 * - `steps`: the color scale, in ascending `fromDay` order, matched on the calendar days shown
 *   in the badge. Orange text is near-black because white fails contrast on orange-500.
 * - `weekendDays`: days skipped by the business-day count in the badge tooltip
 *   (0 = Sunday ... 6 = Saturday). For a six-day working week, use `[0]`.
 * - `timeZone`: decides when "today" rolls over, so every user sees the same age.
 */
export const TRANSIT_AGING_CONFIG = {
  steps: [
    {
      level: "fresh",
      fromDay: 0,
      pillClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
      rowClass: "hover:bg-yellow-100/50 [&>td:first-child]:shadow-[inset_5px_0_0_var(--color-yellow-300)]",
    },
    {
      level: "moving",
      fromDay: 2,
      pillClass: "bg-yellow-200 text-yellow-900 border-yellow-400",
      rowClass:
        "bg-yellow-100/30 hover:bg-yellow-100/60 [&>td:first-child]:shadow-[inset_5px_0_0_var(--color-yellow-400)]",
    },
    {
      level: "approaching",
      fromDay: 3,
      pillClass: "bg-amber-300 text-amber-950 border-amber-500",
      rowClass:
        "bg-amber-100/40 hover:bg-amber-100/70 [&>td:first-child]:shadow-[inset_5px_0_0_var(--color-amber-500)]",
    },
    {
      level: "warning",
      fromDay: 4,
      pillClass: "bg-orange-500 text-zinc-950 border-orange-600",
      rowClass:
        "bg-orange-200/40 hover:bg-orange-200/70 [&>td:first-child]:shadow-[inset_5px_0_0_var(--color-orange-600)]",
    },
    {
      level: "critical",
      fromDay: 7,
      pillClass: "bg-red-600 text-white border-red-700",
      rowClass:
        "bg-red-200/40 hover:bg-red-200/70 [&>td:first-child]:shadow-[inset_5px_0_0_var(--color-red-700)]",
    },
  ] as readonly TransitAgingStep[],
  weekendDays: [0, 6] as readonly number[],
  timeZone: "Asia/Kolkata",
};

export interface TransitAging {
  calendarDays: number;
  businessDays: number;
  level: TransitAgingLevel;
  pillClass: string;
  rowClass: string;
}

const MS_PER_DAY = 86_400_000;

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TRANSIT_AGING_CONFIG.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date as `YYYY-MM-DD` in the configured business time zone. */
export function getTodayKey(now: Date = new Date()): string {
  return todayFormatter.format(now);
}

/** Parses the date part of `YYYY-MM-DD` to UTC midnight, or null if it isn't a real date. */
function parseDateKey(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? time : null;
}

/**
 * Counts working days after `startMs` up to and including `endMs`. The ship date itself is
 * day 0, so a Friday shipment is 1 business day old on Monday.
 */
function countBusinessDays(startMs: number, endMs: number): number {
  let count = 0;
  for (let time = startMs + MS_PER_DAY; time <= endMs; time += MS_PER_DAY) {
    if (!TRANSIT_AGING_CONFIG.weekendDays.includes(new Date(time).getUTCDay())) count += 1;
  }
  return count;
}

type TransitFields = Pick<Shipment, "status" | "shipment_date"> &
  Partial<Pick<Shipment, "in_transit_at">>;

/**
 * The `YYYY-MM-DD` day transit began, or null if the shipment isn't In Transit.
 * Uses `in_transit_at`, falling back to `shipment_date` for rows without a stamp.
 */
export function getTransitStartKey(shipment: TransitFields): string | null {
  if (shipment.status !== "IN_TRANSIT") return null;
  if (shipment.in_transit_at) {
    const stamped = new Date(shipment.in_transit_at);
    if (!Number.isNaN(stamped.getTime())) return getTodayKey(stamped);
  }
  return shipment.shipment_date;
}

/**
 * Returns transit age for In Transit shipments and null for every other status.
 * A future start date counts as 0 days.
 */
export function getTransitAging(shipment: TransitFields, todayKey: string): TransitAging | null {
  const startKey = getTransitStartKey(shipment);
  if (startKey === null) return null;

  const start = parseDateKey(startKey);
  const today = parseDateKey(todayKey);
  if (start === null || today === null) return null;

  const calendarDays = Math.max(0, Math.round((today - start) / MS_PER_DAY));
  const businessDays = countBusinessDays(start, today);

  let step = TRANSIT_AGING_CONFIG.steps[0];
  for (const candidate of TRANSIT_AGING_CONFIG.steps) {
    if (calendarDays >= candidate.fromDay) step = candidate;
  }

  return {
    calendarDays,
    businessDays,
    level: step.level,
    pillClass: step.pillClass,
    rowClass: step.rowClass,
  };
}
