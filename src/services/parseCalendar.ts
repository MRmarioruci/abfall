import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ParsedCalendarResult, CollectionEvent } from "../types/calendar";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { ApiError, ScanCancelledError, ScanTimeoutError, readCalendar } from "./api";
import { t, monthShort } from "../i18n";

// One request reads the whole calendar: every page goes to abfall-api's
// POST /v1/scan ("read" step) together, so a legend on one page can
// explain the grid on another. The server returns finished events —
// printed dates as read, written rules ("every Tuesday", "every 2nd
// Wednesday") already expanded in code.

export interface ImageInput {
  uri: string;
  mimeType?: string | null;
  width?: number;
  height?: number;
}

export type ParseStage = "preparing" | "reading" | "mapping" | "done";

export interface ParseProgress {
  stage: ParseStage;
  detail?: string;
}

export type ProgressCallback = (update: ParseProgress) => void;

/**
 * Scan `images` into a calendar. Aborting `signal` stops the scan and
 * rejects with ScanCancelledError; a scan that takes too long rejects
 * with a user-facing timeout message.
 */
export async function parseCalendarImage(
  images: ImageInput[],
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<ParsedCalendarResult> {
  try {
    return await parseImages(images, onProgress, signal);
  } catch (e) {
    throw toUserFacingError(e);
  }
}

// The scan screen shows the error message as-is, so translate API and
// network failures into something a user can act on.
function toUserFacingError(e: unknown): Error {
  if (e instanceof ScanCancelledError) return e;
  if (e instanceof ScanTimeoutError) return new Error(t("scan.error.timeout"));
  if (e instanceof ApiError) {
    if (e.status === 429) return new Error(t("scan.error.limit"));
    if (e.status === 413 || e.status === 400) return new Error(t("scan.error.unprocessable"));
    return new Error(t("scan.error.unavailable"));
  }
  if (e instanceof TypeError) {
    // fetch() rejects with a TypeError when there's no connection.
    return new Error(t("scan.error.offline"));
  }
  return e instanceof Error ? e : new Error(String(e));
}

// ---------------------------------------------------------------------------
// Image prep
// ---------------------------------------------------------------------------

// The API rejects bodies over 4.5 MB, and all pages travel in one request.
// Start sharp enough for small grid icons and step down until they fit.
const MAX_TOTAL_BASE64 = 4_000_000;
const QUALITY_STEPS: Array<{ width: number; compress: number }> = [
  { width: 2048, compress: 0.85 },
  { width: 2048, compress: 0.72 },
  { width: 1700, compress: 0.7 },
  { width: 1400, compress: 0.65 },
  { width: 1200, compress: 0.6 },
];

async function encodePage(uri: string, width: number, compress: number): Promise<string> {
  const r = await manipulateAsync(uri, [{ resize: { width } }], {
    format: SaveFormat.JPEG,
    base64: true,
    compress,
  });
  return r.base64!;
}

async function preparePages(images: ImageInput[], signal?: AbortSignal): Promise<string[]> {
  let pages: string[] = [];
  for (const step of QUALITY_STEPS) {
    pages = [];
    for (const img of images) {
      if (signal?.aborted) throw new ScanCancelledError();
      pages.push(await encodePage(img.uri, step.width, step.compress));
    }
    const total = pages.reduce((n, p) => n + p.length, 0);
    console.log(`[parseCalendar] ${images.length} page(s) at ${step.width}px q${step.compress}: ${Math.round((total * 0.75) / 1024)} KB`);
    if (total <= MAX_TOTAL_BASE64) return pages;
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const KNOWN_TYPES = new Set<string>(STREAM_ORDER);

async function parseImages(
  images: ImageInput[],
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<ParsedCalendarResult> {
  onProgress?.({
    stage: "preparing",
    detail: images.length > 1 ? t("add.camera.ready_other", { n: images.length }) : undefined,
  });
  const pages = await preparePages(images, signal);

  onProgress?.({ stage: "reading" });
  const read = await readCalendar(pages, signal);
  console.log(`[parseCalendar] read: ${read.events.length} events${read.notes ? ` · notes: ${read.notes}` : ""}`);

  // "sonstiges" (Christmas trees, electronics, …) keeps its printed name
  // as the note so the calendar can say what it is.
  const events: CollectionEvent[] = read.events
    .filter((e) => KNOWN_TYPES.has(e.type))
    .map((e) => ({
      date: e.date,
      type: e.type as WasteStreamId,
      zone: e.zone || "all",
      time: e.time,
      note: e.type === "sonstiges" ? e.label : undefined,
    }));
  if (events.length === 0) throw new Error(t("scan.error.no_dates"));

  const months = new Set(events.map((e) => parseInt(e.date.slice(5, 7), 10)));
  onProgress?.({
    stage: "mapping",
    detail: t("scan.progress.found_markers", { markers: events.length, months: months.size }),
  });

  // "{Municipality}, {Year} · Jan–Jun", from the months that have events.
  const year = parseInt(events[0].date.slice(0, 4), 10);
  const sorted = [...months].sort((a, b) => a - b);
  const range =
    sorted.length === 1
      ? monthShort(sorted[0])
      : `${monthShort(sorted[0])}–${monthShort(sorted[sorted.length - 1])}`;
  const name = read.municipality || read.title || t("scan.calendar_fallback");

  onProgress?.({ stage: "done" });
  return {
    title: `${name}, ${year} · ${range}`,
    municipality: read.municipality,
    canton: read.region || undefined,
    postcode: read.postcode || undefined,
    zones: read.zones,
    events,
  };
}
