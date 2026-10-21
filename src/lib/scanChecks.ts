// Plausibility checks for a freshly scanned calendar. The scanner sometimes
// misreads dense icon grids (a weekly bin read as every other week, a whole
// month dropped). These heuristics are deliberately conservative: a false
// alarm on a correct scan costs more trust than a missed hint.
//
// Pure and dependency-free (type imports only) so it can be run directly
// with `node --experimental-strip-types` in tests.

import type { CollectionEvent } from "../types/calendar";
import type { WasteStreamId } from "../theme/colors";

export type SuspicionReason = "gap" | "half_rhythm";

export interface Suspicion {
  type: WasteStreamId;
  zone: string;
  reason: SuspicionReason;
}

/** Fewer events than this and we don't judge the rhythm at all. */
const MIN_EVENTS = 6;
/** Share of gaps that must sit near the median for a rhythm to count as regular. */
const REGULAR_SHARE = 0.7;
/** Share of events that must fall on the dominant weekday. */
const WEEKDAY_SHARE = 0.8;
/** Streams that legitimately pause in winter. */
const SEASONAL: ReadonlySet<WasteStreamId> = new Set<WasteStreamId>(["gruengut", "bio"]);
const WINTER_MONTHS: ReadonlySet<number> = new Set([12, 1, 2]);
/** Streams that are usually weekly, so a fortnightly reading is worth a second look. */
const USUALLY_WEEKLY: ReadonlySet<WasteStreamId> = new Set<WasteStreamId>(["kehricht", "bio", "gruengut"]);

const DAY_MS = 86_400_000;

/** Day number (UTC-based, so DST can't skew differences) for "YYYY-MM-DD". */
function dayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type Rhythm = "weekly" | "fortnightly" | null;

interface Series {
  type: WasteStreamId;
  zone: string;
  days: number[]; // unique, sorted
  gaps: number[];
  medianGap: number;
  rhythm: Rhythm;
  /** Whether most gaps sit within ±2 days of the median. */
  regular: boolean;
  /** Dominant weekday (0=Sun) if at least WEEKDAY_SHARE of events fall on it. */
  weekday: number | null;
}

function buildSeries(type: WasteStreamId, zone: string, isoDates: string[]): Series | null {
  const days = [...new Set(isoDates.map(dayNumber).filter((d): d is number => d !== null))].sort((a, b) => a - b);
  if (days.length < MIN_EVENTS) return null;
  const gaps = days.slice(1).map((d, i) => d - days[i]);
  const medianGap = median(gaps);
  const rhythm: Rhythm =
    medianGap >= 6 && medianGap <= 8 ? "weekly" : medianGap >= 13 && medianGap <= 15 ? "fortnightly" : null;
  const nearMedian = gaps.filter((g) => Math.abs(g - medianGap) <= 2).length;
  const regular = nearMedian / gaps.length >= REGULAR_SHARE;

  const wd = new Array(7).fill(0);
  // Day 0 (1970-01-01) was a Thursday.
  for (const d of days) wd[(((d + 4) % 7) + 7) % 7]++;
  const top = wd.indexOf(Math.max(...wd));
  const weekday = wd[top] / days.length >= WEEKDAY_SHARE ? top : null;

  return { type, zone, days, gaps, medianGap, rhythm, regular, weekday };
}

/** Year*12 + month0 for a day number. */
function monthKey(day: number): number {
  const d = new Date(day * DAY_MS);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function hasInteriorGap(s: Series): boolean {
  if (!s.rhythm || !s.regular) return false;
  const months = new Set(s.days.map(monthKey));
  const first = monthKey(s.days[0]);
  const last = monthKey(s.days[s.days.length - 1]);
  // Only months strictly inside the covered range: both neighbours of an
  // empty run are then guaranteed to have pickups.
  for (let k = first + 1; k < last; k++) {
    if (months.has(k)) continue;
    const month1to12 = (k % 12) + 1;
    if (SEASONAL.has(s.type) && WINTER_MONTHS.has(month1to12)) continue;
    return true;
  }
  return false;
}

/** Overlap of two series' date ranges, in days. */
function overlapDays(a: Series, b: Series): number {
  const lo = Math.max(a.days[0], b.days[0]);
  const hi = Math.min(a.days[a.days.length - 1], b.days[b.days.length - 1]);
  return Math.max(0, hi - lo);
}

function isHalfRhythm(f: Series, w: Series): boolean {
  if (f.rhythm !== "fortnightly" || !f.regular) return false;
  if (w.rhythm !== "weekly" || !w.regular) return false;
  if (!USUALLY_WEEKLY.has(f.type)) return false;
  if (f.weekday === null || f.weekday !== w.weekday) return false;
  // The two must actually run side by side for most of the calendar…
  const span = (s: Series) => s.days[s.days.length - 1] - s.days[0];
  const ov = overlapDays(f, w);
  if (ov < 0.6 * Math.min(span(f), span(w)) || ov < 8 * 7) return false;
  // …and within that overlap, the suspect has roughly half as many pickups.
  const lo = Math.max(f.days[0], w.days[0]);
  const hi = Math.min(f.days[f.days.length - 1], w.days[w.days.length - 1]);
  const inRange = (s: Series) => s.days.filter((d) => d >= lo && d <= hi).length;
  const ratio = inRange(f) / inRange(w);
  return ratio >= 0.4 && ratio <= 0.6;
}

export function findSuspicious(events: CollectionEvent[]): Suspicion[] {
  const groups = new Map<string, { type: WasteStreamId; zone: string; dates: string[] }>();
  for (const e of events) {
    const zone = e.zone ?? "";
    const key = `${zone}\u0000${e.type}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { type: e.type, zone, dates: [] }));
    g.dates.push(e.date);
  }

  const series: Series[] = [];
  for (const g of groups.values()) {
    const s = buildSeries(g.type, g.zone, g.dates);
    if (s) series.push(s);
  }

  const out: Suspicion[] = [];
  for (const s of series) {
    if (hasInteriorGap(s)) out.push({ type: s.type, zone: s.zone, reason: "gap" });
  }
  for (const f of series) {
    const partner = series.find((w) => w !== f && w.zone === f.zone && isHalfRhythm(f, w));
    if (partner) out.push({ type: f.type, zone: f.zone, reason: "half_rhythm" });
  }
  return out;
}
