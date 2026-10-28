// Mobile-side HTTP client for the abfall-api backend (Vercel + Supabase).
//
// All requests carry two anonymous identity headers:
//   X-App-Key:   bundled build-time public key, gates casual scrapers
//   X-Device-Id: per-install UUID v4 from `getDeviceId()`
//
// The backend HMACs the device id before storing it, so even though we
// hand the raw value over the wire, the DB only sees the hash. See the
// abfall-api repo for the full server-side contract.

import { getDeviceId } from "./deviceId";
import type { CollectionEvent, SavedCalendar } from "../types/calendar";
import type { WasteStreamId } from "../theme/colors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.abfall.example";
const APP_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "PLACEHOLDER_APP_KEY";

// ─── public types — mirror the server zod schemas ──────────────────────

export interface CommunityCalendarSummary {
  id: string;
  title: string;
  country: string;
  region: string | null;
  city: string;
  zones: string[];
  year: number;
  half: number | null;
  sourceLanguage: string | null;
  sharedByName: string | null;
  usesCount: number;
  createdAt: string;
  /** Distinct waste types in the calendar (search results; absent on older servers). */
  types?: string[];
}

export interface CommunityCalendarDetail extends CommunityCalendarSummary {
  events: CollectionEvent[];
}

export interface SearchResult {
  results: CommunityCalendarSummary[];
  nextCursor: string | null;
}

export interface SearchFilters {
  country: string;
  region?: string;
  city?: string;
  year?: number;
  /** Free-text search across title, city, and region. ilike + wildcards. */
  q?: string;
  after?: string;
}

// ─── core request helper ───────────────────────────────────────────────

class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export { ApiError };

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const deviceId = await getDeviceId();
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Key": APP_KEY,
    "X-Device-Id": deviceId,
    ...((init.headers as Record<string, string>) ?? {}),
  };

  // Verbose request log — sees the URL, method, and body size so we
  // can tell at a glance whether the call left the device intact.
  const bodyLen = typeof init.body === "string" ? init.body.length : 0;
  console.log(`[api] → ${method} ${url}${bodyLen ? ` body=${bodyLen}b` : ""}`);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    // Aborted on purpose (cancel / timeout) — the caller reports it.
    if (init.signal?.aborted) throw err;
    // Network-layer failure (DNS, offline, TLS, etc). The error usually
    // says "Network request failed" on RN — log the full shape so we
    // can distinguish hosts unreachable from CORS preflight from etc.
    console.warn(`[api] ✗ ${method} ${url} threw before response`, err);
    throw err;
  }

  // Try to parse JSON regardless of status — server error responses
  // always carry a JSON body with `error` + optional `detail`.
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON body (CDN-level error or proxy noise) — leave as text.
      body = text;
    }
  }

  console.log(
    `[api] ← ${method} ${url} ${res.status} ${text.length}b`,
    // Stringify on error so React Native's console actually prints the
    // nested zod fieldErrors instead of truncating them as `[Array]`.
    res.status >= 400 ? JSON.stringify(body, null, 2) : "",
  );

  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(res.status, body, msg);
  }

  return body as T;
}

// ─── endpoint functions ────────────────────────────────────────────────

/**
 * Search community-shared calendars near a location. `country` is
 * required; everything else narrows the result set. Returns up to 20
 * summaries plus a `nextCursor` to fetch the next page.
 */
export function searchCommunityCalendars(
  filters: SearchFilters,
): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set("country", filters.country);
  if (filters.region) params.set("region", filters.region);
  if (filters.city) params.set("city", filters.city);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.q) params.set("q", filters.q);
  if (filters.after) params.set("after", filters.after);
  return request(`/v1/calendars?${params.toString()}`);
}

/**
 * Fetch one community calendar with its full events payload. Returns
 * null if the row doesn't exist or has been hidden by moderation.
 */
export async function getCommunityCalendar(
  id: string,
): Promise<CommunityCalendarDetail | null> {
  try {
    const body = await request<{ calendar: CommunityCalendarDetail }>(
      `/v1/calendars/${id}`,
    );
    return body.calendar;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Share the active calendar publicly. Maps the local `SavedCalendar`
 * shape (which still uses Swiss-flavored field names) to the server's
 * generic country/region/city payload.
 *
 * Returns the inserted (or pre-existing, deduped) community record.
 */
export async function shareCalendar(args: {
  calendar: SavedCalendar;
  country: string;
  sharedByName?: string;
  sourceLanguage?: string;
}): Promise<CommunityCalendarDetail> {
  const { calendar, country, sharedByName, sourceLanguage } = args;

  // Trim, cut to the server's max length, and omit empty strings — the
  // server zod schema treats "" as a present-but-invalid value (fails
  // min(1)), and one over-long field would reject the whole publish.
  const cleanStr = (s: string | undefined | null, max: number): string | undefined => {
    if (typeof s !== "string") return undefined;
    const t = s.trim().slice(0, max).trim();
    return t.length > 0 ? t : undefined;
  };

  // City is required server-side. Fall back to the free-text location
  // (e.g. "Schlieren, ZH" → "Schlieren") if municipality is missing.
  const cityFromLocation = calendar.location
    ? calendar.location.split(",")[0]
    : undefined;
  const city = cleanStr(calendar.municipality, 120) ?? cleanStr(cityFromLocation, 120);
  if (!city) {
    throw new Error("Set your city on the home screen before publishing.");
  }

  const rawZones =
    calendar.zones && calendar.zones.length > 0
      ? calendar.zones.map((z) => cleanStr(z, 40) ?? "all")
      : calendar.zone
      ? [cleanStr(calendar.zone, 40) ?? "all"]
      : ["all"];
  const zones = [...new Set(rawZones)].slice(0, 20);

  // Coerce each event into the shape the server expects: valid date,
  // trimmed type, non-empty zone, and time/note dropped if invalid.
  // Filters out events that can't be repaired (bad date format).
  const events = calendar.events
    .map((e) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return null;
      const type = cleanStr(e.type, 40);
      if (!type) return null;
      const time =
        e.time && /^\d{2}:\d{2}$/.test(e.time) ? e.time : undefined;
      const cleaned: Record<string, unknown> = {
        date: e.date,
        type,
        zone: cleanStr(e.zone, 40) ?? "all",
      };
      if (time) cleaned.time = time;
      const note = cleanStr(e.note, 200);
      if (note) cleaned.note = note;
      return cleaned;
    })
    .filter((e): e is Record<string, unknown> => e !== null)
    .slice(0, 1000);

  if (events.length === 0) {
    throw new Error("No valid events to publish.");
  }

  const payload = {
    title: cleanStr(calendar.title, 120) ?? "Untitled calendar",
    country,
    region: cleanStr(calendar.canton, 80),
    city,
    zones,
    year: calendar.year,
    half: calendar.half,
    events,
    sourceLanguage: cleanStr(sourceLanguage, 5),
    sharedByName: cleanStr(sharedByName, 40),
  };

  // Diagnostic so we can see what the local calendar actually contains
  // when something goes wrong server-side. Logged at debug volume only.
  console.log(
    `[share] payload city=${payload.city} region=${payload.region ?? "-"} events=${events.length} dropped=${calendar.events.length - events.length}`,
  );

  const body = await request<{ calendar: CommunityCalendarDetail }>(
    "/v1/calendars",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return body.calendar;
}

/**
 * Fire-and-forget signal that this device just imported a community
 * calendar. Increments the `usesCount` users see in browse listings.
 * Failures are swallowed — this is engagement telemetry, not critical.
 */
export async function markCommunityCalendarUsed(id: string): Promise<void> {
  try {
    await request(`/v1/calendars/${id}/use`, { method: "POST" });
  } catch (err) {
    console.warn("[api] markCommunityCalendarUsed failed:", err);
  }
}

/**
 * Unpublish a calendar this device shared. The server only allows the
 * uploading device; a 404 means it's already gone (or was never ours),
 * which leaves the same end state, so it isn't treated as an error.
 */
export async function deleteCommunityCalendar(id: string): Promise<void> {
  try {
    await request(`/v1/calendars/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

/**
 * Flag a community calendar as bad content. The server auto-hides rows
 * above a report threshold; idempotent per-device.
 */
export async function reportCommunityCalendar(
  id: string,
  reason?: string,
): Promise<{ reportsCount: number; hidden: boolean }> {
  return request(`/v1/calendars/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ─── calendar scanning ─────────────────────────────────────────────────

/** One collection event as the scan returns it (rules already expanded). */
export interface ScanEvent {
  date: string;
  /** A WasteStreamId ("sonstiges" for anything else). */
  type: string;
  /** The service's name as printed, e.g. "Christbaumabfuhr". */
  label?: string;
  /** Zone name, or "all" when town-wide. */
  zone: string;
  time?: string;
}

export interface CalendarReadResult {
  title: string;
  municipality: string;
  region: string;
  postcode: string;
  zones: string[];
  events: ScanEvent[];
  notes: string;
}

// The server allows a scan up to 300 s (vercel.json maxDuration); a little
// more here covers the upload before we give up.
const SCAN_TIMEOUT_MS = 310_000;

/** The scan took longer than SCAN_TIMEOUT_MS. */
export class ScanTimeoutError extends Error {
  constructor() {
    super("scan timed out");
  }
}

/** The caller aborted the scan (e.g. the user tapped Cancel). */
export class ScanCancelledError extends Error {
  constructor() {
    super("scan cancelled");
  }
}

/**
 * Read a photographed waste calendar on the server, which holds the
 * prompt and model key. `pages` are base64 JPEGs in page order; they go
 * in one request so the model sees the whole calendar at once.
 *
 * Rejects with ScanCancelledError when `signal` aborts and with
 * ScanTimeoutError when it runs past SCAN_TIMEOUT_MS.
 */
export async function readCalendar(
  pages: string[],
  signal?: AbortSignal,
): Promise<CalendarReadResult> {
  if (signal?.aborted) throw new ScanCancelledError();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SCAN_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await request<{ result: CalendarReadResult }>("/v1/scan", {
      method: "POST",
      body: JSON.stringify({ step: "read", images: pages }),
      signal: controller.signal,
    });
    return res.result;
  } catch (err) {
    if (signal?.aborted) throw new ScanCancelledError();
    if (timedOut) throw new ScanTimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// ─── where does this go? ───────────────────────────────────────────────

export type SortWhere = "bin" | "dropoff" | "shop" | "special";
export type DropoffKind = "centre" | "glass" | "clothes" | "plastic" | "paper" | "generic";

export interface SortAnswer {
  item: string;
  where: SortWhere;
  stream: WasteStreamId | null;
  dropoff: DropoffKind | null;
  tip: string;
}

/**
 * Ask the server where an item goes: typed (`query`) or photographed
 * (`image`, a base64 JPEG). `streams` are the bins the user's calendar
 * collects, so the answer fits their household.
 */
export async function sortItem(args: {
  query?: string;
  image?: string;
  locale: string;
  streams: WasteStreamId[];
  municipality?: string;
  canton?: string;
}): Promise<SortAnswer> {
  const res = await request<{ result: SortAnswer }>("/v1/sort", {
    method: "POST",
    body: JSON.stringify(args),
  });
  return res.result;
}
