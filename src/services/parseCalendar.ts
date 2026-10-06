import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ParsedCalendarResult, CollectionEvent } from "../types/calendar";
import { type WasteStreamId } from "../theme/colors";
import { ApiError, runScanStep } from "./api";
import { t, monthLong, monthShort } from "../i18n";

// Two-step pipeline:
//   Step 1: LLM reads the image and returns a NATURAL JSON of the calendar:
//           for each visible month, for each day, free-text strings of what's
//           marked. The LLM doesn't have to know our internal types or zone
//           conventions — it just describes what it sees.
//   Step 2: Code walks that JSON and maps each free-text marker to our
//           CollectionEvent shape (canonical type + zone). No second LLM call.
//
// This decouples vision from normalization. The model is freed from following
// a rigid downstream schema, and we get full control over the mapping logic.
//
// The model calls themselves (prompts, schemas, key) live in abfall-api's
// POST /v1/scan; this module sends one request per step.


export interface ImageInput {
  uri: string;
  mimeType?: string | null;
  width?: number;
  height?: number;
}

// Internal display names used in prompts and logs. English is the universal
// lingua franca for the LLM — it understands which month is "March" whether
// the calendar is German, French, Italian, or anything else. Using English
// here also keeps prompts predictable for non-German calendars.
const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Map of month-name variants (German full, German abbreviated, English,
// French, Italian) → month number. Order matters: longer keys are checked
// first so a string like "Januar" matches "januar" before falling through
// to "jan". The list is intentionally generous because the model may return
// any form depending on what's printed.
const MONTH_NAME_TO_NUM: Record<string, number> = {
  // German full
  januar: 1, februar: 2, märz: 3, maerz: 3, marz: 3, april: 4, mai: 5,
  juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11,
  dezember: 12,
  // English
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10,
  december: 12,
  // French
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, juin: 6,
  juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11,
  décembre: 12, decembre: 12,
  // Italian (note: "novembre" already covered by the French entry above)
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, dicembre: 12,
  // Abbreviated (3-letter) — applies to German + English. Listed AFTER the
  // long forms so the long forms match first when both could fit.
  jan: 1, feb: 2, mär: 3, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12,
};

function normalizeMonthName(s: string): number | null {
  const cleaned = s
    .toLowerCase()
    .replace(/\d/g, "")
    .replace(/[.,;:]/g, "")
    .trim();
  // Sort keys by length descending so the longest possible match wins.
  // ("september" must beat "sep", "januar" must beat "jan", etc.)
  const keys = Object.keys(MONTH_NAME_TO_NUM).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key)) return MONTH_NAME_TO_NUM[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Image prep
// ---------------------------------------------------------------------------

async function prepareImage(uri: string) {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 2048 } }],
    { format: SaveFormat.JPEG, base64: true, compress: 0.9 },
  );
  return result;
}

// Higher-resolution variant used for the structure pass. Color fidelity on
// small zone-legend dots is the limiting factor for getting the color → zone
// map right, and the structure pass is one call — the extra bandwidth is
// well worth it. We also bump quality up so JPEG compression doesn't smear
// adjacent zone colors together.
//
// The scan API rejects bodies over ~4.5 MB, so if a busy photo encodes too
// large we step the quality down until it fits.
const MAX_BASE64_CHARS = 4_000_000;

async function prepareImageHiRes(uri: string) {
  let result = await manipulateAsync(
    uri,
    [{ resize: { width: 2800 } }],
    { format: SaveFormat.JPEG, base64: true, compress: 0.96 },
  );
  for (const compress of [0.88, 0.8]) {
    if ((result.base64?.length ?? 0) <= MAX_BASE64_CHARS) break;
    result = await manipulateAsync(
      uri,
      [{ resize: { width: 2800 } }],
      { format: SaveFormat.JPEG, base64: true, compress },
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// STEP 0: anchor months (strict OCR of headers; constrains step 1)
// ---------------------------------------------------------------------------

async function anchorMonths(base64Image: string): Promise<{ monthNames: string[]; year: number }> {
  return runScanStep({ step: "anchor", image: base64Image });
}

// ---------------------------------------------------------------------------
// STEP 1a — STRUCTURE PASS: before extracting any dates, get the model to
//          describe the calendar's layout, zones, color → zone map, and
//          waste-type icons. The output of this call is fed back as context
//          into Step 1b so the extraction call has nothing to figure out
//          beyond enumerating the actual dates.
//
//          This splits the cognitive load: one call to UNDERSTAND, one to
//          EXTRACT. It removes the "everything ends up as zone A" failure
//          mode by giving the color-mapping step its own focused attention.
// ---------------------------------------------------------------------------

interface ZoneColorEntry {
  zone: string;
  colorDescription: string;
}

interface WasteTypeEntry {
  label: string;
  /** What the icon LOOKS like in isolation (shape, lines, fill). */
  iconDescription: string;
  /** The SINGLE most distinctive feature that tells this icon apart from
   *  every other icon in the legend. Forces the model to commit to a
   *  feature it can verify per-day rather than relying on fuzzy matching. */
  distinguishingFeature: string;
}

interface CalendarStructure {
  language?: string;
  /** "grid", "rule-table", "mixed", or free-text description. */
  layoutDescription?: string;
  /** Names of zones the calendar uses (e.g. ["A", "B", "C", "D"]). Empty if
   *  no zones. */
  zones: string[];
  /** Mapping from each zone to a textual description of the color used to
   *  represent it (e.g. "orange-red", "muted teal"). Empty when zones are
   *  not color-coded. */
  zoneColors: ZoneColorEntry[];
  /** How each individual icon on a day's cell encodes its zone — e.g.
   *  "Each icon is drawn in the colour of its zone; one icon = one zone."
   *  vs. "Each icon has a zone letter printed inside." Helps the extraction
   *  pass count icons correctly and avoid assigning multiple zones to one
   *  icon. */
  iconZoneConvention?: string;
  /** How many collection events for the SAME waste type typically fall on
   *  the same day. For most rotating schedules this is 1 ("Karton serves
   *  one zone per Friday"). Some calendars do show multiple zones on the
   *  same day side-by-side. */
  sameDaySameTypeConvention?: string;
  /** Each waste type the calendar lists, with a short description of its
   *  icon — used by the extraction pass to identify icons on each day. */
  wasteTypes: WasteTypeEntry[];
  /** Anything else the model thinks the extraction pass should know. */
  notes?: string;
}

async function extractStructure(base64Image: string): Promise<CalendarStructure> {
  return runScanStep({ step: "structure", image: base64Image });
}

// ---------------------------------------------------------------------------
// STEP 1b: natural-format date extraction. The model is given the structure
//          manual from Step 1a and only needs to enumerate per-day events.
// ---------------------------------------------------------------------------

interface RawCalendar {
  title?: string;
  municipality?: string;
  canton?: string;
  postcode?: string;
  year?: number;
  zones?: string[];
  months: Array<{
    month: number;        // 1–12
    days: Array<{
      day: number;        // 1–31
      // Free-text label per event in whatever language the calendar uses,
      // e.g. "Refuse West" / "Kehricht West" / "Ordures West" / "Rifiuti Ovest".
      labels: string[];
    }>;
  }>;
}

async function extractRaw(
  base64Image: string,
  anchoredMonths: number[],
  anchorYear: number,
  structure?: CalendarStructure,
): Promise<RawCalendar> {
  return runScanStep({
    step: "extract",
    image: base64Image,
    months: anchoredMonths,
    year: anchorYear,
    structure,
  });
}

// ---------------------------------------------------------------------------
// STEP 2: map the raw JSON to CollectionEvent[]. Pure code, no LLM.
// ---------------------------------------------------------------------------

// Keyword → canonical type mapping. The LLM returns labels in whatever
// language the calendar is in — we accept the common words across German,
// English, French, Italian. Order matters: more specific terms first so
// "sonderabfall" / "hazardous" beats a fallthrough to "general waste".
const TYPE_KEYWORDS: Array<{ re: RegExp; type: WasteStreamId }> = [
  // Hazardous / special / chemical
  {
    re: /\b(sonderabfall|sonderabfallmobil|chemie|giftstoff|hazardous|toxic|chemical|dangereux|toxique|spéciaux|speciaux|pericolosi|tossici|speciali)\b/i,
    type: "sonderabfall",
  },
  // Bulky waste
  {
    re: /\b(sperr(gut|müll|mull)|sperrm|bulky|bulk|encombrant|monstre|ingombranti|ingombrant)\b/i,
    type: "sperrgut",
  },
  // Metal — scrap metal goes to altmetall; plain "tin"/"aluminum" too
  {
    re: /\b(alteisen|altmetall|scrap[\s-]?metal|ferraille)\b/i,
    type: "altmetall",
  },
  {
    re: /\b(metall|métal|metallo|metal|aluminium|aluminum|tin|cans?)\b/i,
    type: "metall",
  },
  // Textiles
  {
    re: /\b(textilien|textile|textiles|kleider|altkleider|clothes|clothing|vêtements|vetements|tessili|abiti|abbigliamento)\b/i,
    type: "textilien",
  },
  // Cardboard
  {
    re: /\b(karton|cardboard|carton|cartone|corrugated)\b/i,
    type: "karton",
  },
  // Paper
  {
    re: /\b((alt)?papier|paper|newspaper|news|journaux|carta)\b/i,
    type: "papier",
  },
  // Organic / bio / green
  {
    re: /\b(bio(abfall)?|grüngut|gruengut|gartenabfall|kompost|compost|organic|biodéchets|biodechets|déchets[\s-]?verts|dechets[\s-]?verts|déchets[\s-]?organiques|umido|verde|organico|scarti[\s-]?vegetali|green[\s-]?waste|yard[\s-]?waste|garden[\s-]?waste|food[\s-]?waste)\b/i,
    type: "bio",
  },
  // Refuse / general household waste (catch-all — comes last)
  {
    re: /\b(kehricht|hauskehricht|hausmüll|hausmull|haushaltsabfall|refuse|garbage|trash|residual|household[\s-]?waste|general[\s-]?waste|ordures|déchets[\s-]?ménagers|dechets[\s-]?menagers|rifiuti|spazzatura|indifferenziato|abfall)\b/i,
    type: "kehricht",
  },
];

// Direction / zone tokens recognized across languages. Extend as we see more.
const ZONE_TOKENS = [
  // German
  "west", "ost", "nord", "süd", "sued",
  // English
  "north", "south", "east",
  // French
  "ouest", "est",
  // Italian
  "ovest",
  // Generic labels
  "a", "b", "c", "d", "1", "2", "3", "4",
];

function classifyLabel(label: string, calendarZones: string[]): { type: WasteStreamId | null; zone: string; time?: string; note?: string } {
  const original = label.trim();
  const lower = original.toLowerCase();

  // Extract type from keyword match (first hit wins; order is most-specific-first)
  let type: WasteStreamId | null = null;
  for (const { re, type: t } of TYPE_KEYWORDS) {
    if (re.test(lower)) {
      type = t;
      break;
    }
  }

  // Extract zone — prefer calendar's known zone list, fall back to generic tokens
  let zone = "all";
  const knownZones = [...calendarZones.map((z) => z.toLowerCase()), ...ZONE_TOKENS];
  // Split on whitespace and punctuation
  const tokens = lower.split(/[\s,/+&]+/).filter(Boolean);
  for (const tok of tokens) {
    if (knownZones.includes(tok)) {
      zone = tok.toUpperCase().length <= 2 ? tok.toUpperCase() : tok.charAt(0).toUpperCase() + tok.slice(1);
      break;
    }
  }

  // Extract time. Accept the trailing-unit forms we see across languages:
  //   "13–17 Uhr" / "8.00–11.30 Uhr"  (German)
  //   "8h–11h" / "13h-17h" / "8 h 30"  (French)
  //   "8:00 am" / "13:00 - 17:00"      (English / generic)
  //   "h. 8.00 - 11.30"                (Italian)
  // The loose pattern grabs the timestamp portion; the unit (Uhr/h/am/pm)
  // is stripped on the way out.
  const timeMatch =
    original.match(/(\d{1,2}[.:]\d{2}\s*(?:–|-|bis|à|a)?\s*\d{0,2}[.:]?\d{0,2})\s*(?:uhr|h\.?|am|pm)\b/i) ||
    original.match(/(\d{1,2}[.:]\d{2})/);
  const time = timeMatch ? timeMatch[1].replace(/\s+/g, "") : undefined;

  return { type, zone, time };
}

function mapRawToEvents(raw: RawCalendar, anchoredMonths: number[], anchorYear: number): CollectionEvent[] {
  const events: CollectionEvent[] = [];
  const calendarZones = raw.zones || [];

  for (const monthBlock of raw.months || []) {
    const m = monthBlock.month;
    if (!anchoredMonths.includes(m)) {
      console.warn(`[parseCalendar] skipping month ${m}: not in anchored ${anchoredMonths.join(",")}`);
      continue;
    }
    for (const dayBlock of monthBlock.days || []) {
      const d = dayBlock.day;
      if (!d || d < 1 || d > 31) continue;
      for (const label of dayBlock.labels || []) {
        if (!label || !label.trim()) continue;
        const classified = classifyLabel(label, calendarZones);
        if (!classified.type) {
          console.warn(`[parseCalendar] could not classify label "${label}" — skipping`);
          continue;
        }
        const date = `${anchorYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        events.push({
          date,
          type: classified.type,
          zone: classified.zone,
          time: classified.time,
        });
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type ParseStage = "preparing" | "anchoring" | "understanding" | "extracting" | "mapping" | "done";

export interface ParseProgress {
  stage: ParseStage;
  detail?: string;
}

export type ProgressCallback = (update: ParseProgress) => void;

export async function parseCalendarImage(
  images: ImageInput[],
  onProgress?: ProgressCallback,
): Promise<ParsedCalendarResult> {
  try {
    return await parseImages(images, onProgress);
  } catch (e) {
    throw toUserFacingError(e);
  }
}

// The scan screen shows the error message as-is, so translate API and
// network failures into something a user can act on.
function toUserFacingError(e: unknown): Error {
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

async function parseImages(
  images: ImageInput[],
  onProgress?: ProgressCallback,
): Promise<ParsedCalendarResult> {
  let title = "";
  let municipality = "";
  let canton = "";
  let postcode = "";
  let year = new Date().getFullYear();
  const zonesSet = new Set<string>();
  const allEvents: CollectionEvent[] = [];
  const allowedMonthSet = new Set<number>();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const multi = images.length > 1;

    // Stage transitions only carry a `detail` when there's substantive new
    // info to share (e.g. the result of the step). The active step's label
    // is already shown by the UI — repeating it as a subtitle just looks
    // like the screen says the same thing twice.
    onProgress?.({ stage: "preparing", detail: multi ? t("scan.progress.image_of", { i: i + 1, n: images.length }) : undefined });
    const prepared = await prepareImage(img.uri);
    console.log("[parseCalendar] image:", { width: prepared.width, height: prepared.height, kb: Math.round((prepared.base64!.length * 0.75) / 1024) });

    // STEP 0
    onProgress?.({ stage: "anchoring" });
    console.log("[parseCalendar] === Step 0: anchor months ===");
    const anchor = await anchorMonths(prepared.base64!);
    const anchoredMonths = Array.from(new Set(
      (anchor.monthNames || []).map(normalizeMonthName).filter((m): m is number => m !== null)
    )).sort((a, b) => a - b);
    console.log("[parseCalendar] anchored:", anchoredMonths.map((m) => MONTH_NAMES[m]).join(", "), `year=${anchor.year || "?"}`);
    if (anchoredMonths.length === 0) {
      throw new Error(t("scan.error.no_months"));
    }
    anchoredMonths.forEach((m) => allowedMonthSet.add(m));
    const anchorYear = anchor.year && anchor.year > 2000 ? anchor.year : new Date().getFullYear();
    const monthsLabel = anchoredMonths.map((m) => monthLong(m)).join(", ");
    onProgress?.({
      stage: "anchoring",
      detail: anchoredMonths.length === 1
        ? t("scan.progress.found_months_one", { months: monthsLabel })
        : t("scan.progress.found_months_other", { n: anchoredMonths.length, months: monthsLabel }),
    });

    // STEP 1a — STRUCTURE PASS: get the model to describe the calendar's
    // layout, zones, color → zone map, and waste-type icons BEFORE asking it
    // to enumerate dates. Use a higher-resolution image so subtle zone
    // colors aren't smushed by JPEG compression.
    onProgress?.({ stage: "understanding", detail: multi
      ? t("scan.progress.understanding_image", { i: i + 1, n: images.length })
      : t("scan.progress.understanding") });
    console.log("[parseCalendar] === Step 1a: structure pass (hi-res) ===");
    let structure: CalendarStructure | undefined;
    try {
      const hiRes = await prepareImageHiRes(img.uri);
      console.log("[parseCalendar] hi-res image:", { width: hiRes.width, height: hiRes.height, kb: Math.round((hiRes.base64!.length * 0.75) / 1024) });
      structure = await extractStructure(hiRes.base64!);
      console.log("[parseCalendar] structure:", JSON.stringify({
        language: structure.language,
        zones: structure.zones,
        zoneColors: structure.zoneColors,
        iconZoneConvention: structure.iconZoneConvention,
        sameDaySameTypeConvention: structure.sameDaySameTypeConvention,
        wasteTypes: structure.wasteTypes.map((w) => w.label),
      }));
      const zoneCount = structure.zones.length;
      const wasteCount = structure.wasteTypes.length;
      onProgress?.({
        stage: "understanding",
        detail: t("scan.progress.found_items", {
          items: [
            wasteCount === 1
              ? t("scan.progress.waste_types_one")
              : t("scan.progress.waste_types_other", { n: wasteCount }),
            ...(zoneCount > 0
              ? [zoneCount === 1 ? t("scan.progress.zones_one") : t("scan.progress.zones_other", { n: zoneCount })]
              : []),
          ].join(", "),
        }),
      });
    } catch (e) {
      console.warn("[parseCalendar] structure pass failed, continuing without it:", e);
      // Non-fatal — the extraction pass falls back to its old behaviour.
    }

    // STEP 1b — per-month extraction. Instead of one mega-call asking the
    // model to enumerate all months at once, we call once per anchored month.
    // Each call:
    //   - gets the full structure manual as context (includes the contrastive
    //     icon descriptions so the model can identify icons reliably);
    //   - is told to focus on a SINGLE month, so it has at most ~31 day cells
    //     to track instead of the whole year;
    //   - is more accurate at color discrimination and zone assignment
    //     because the cognitive load per call is much lower.
    // Metadata (title/municipality/canton/postcode/year/zones) is taken from
    // the first successful call — it's the same across all months.
    onProgress?.({
      stage: "extracting",
      detail: anchoredMonths.length === 1
        ? t("scan.progress.reading_months_one")
        : t("scan.progress.reading_months_other", { n: anchoredMonths.length }),
    });
    console.log("[parseCalendar] === Step 1b: raw extraction (per-month) ===");

    const mergedMonths: RawCalendar["months"] = [];
    let runningLabelCount = 0;

    for (let mi = 0; mi < anchoredMonths.length; mi++) {
      const m = anchoredMonths[mi];
      onProgress?.({
        stage: "extracting",
        detail: t("scan.progress.reading_month", { month: monthLong(m), i: mi + 1, n: anchoredMonths.length }),
      });
      try {
        const monthRaw = await extractRaw(prepared.base64!, [m], anchorYear, structure);

        // First successful call provides the calendar-level metadata.
        if (!title && monthRaw.title) title = monthRaw.title;
        if (!municipality && monthRaw.municipality) municipality = monthRaw.municipality;
        if (!canton && monthRaw.canton) canton = monthRaw.canton;
        if (!postcode && monthRaw.postcode) postcode = monthRaw.postcode.trim();
        if (monthRaw.year && monthRaw.year > 2000) year = monthRaw.year;
        else year = anchorYear;
        (monthRaw.zones || []).forEach((z) => zonesSet.add(z));

        // Pull out the days for this specific month (model may include
        // others by mistake — we ignore those).
        const monthBlock = (monthRaw.months || []).find((mb) => mb.month === m);
        if (monthBlock) {
          mergedMonths.push(monthBlock);
          const monthLabelCount = (monthBlock.days || []).reduce(
            (sum, db) => sum + (db.labels?.length || 0),
            0,
          );
          runningLabelCount += monthLabelCount;
          console.log(`[parseCalendar]   ${MONTH_NAMES[m]}: ${monthBlock.days?.length || 0} days, ${monthLabelCount} labels`);
        } else {
          console.warn(`[parseCalendar]   ${MONTH_NAMES[m]}: no data returned`);
        }
      } catch (e) {
        // A model hiccup on one month is skipped — a partial calendar is
        // better than none. Being rate-limited or rejected will fail every
        // remaining month too, so stop there.
        if (e instanceof ApiError && e.status !== 502) throw e;
        console.warn(`[parseCalendar] ${MONTH_NAMES[m]} extraction failed:`, e);
      }
    }

    const raw: RawCalendar = {
      title,
      municipality,
      canton,
      postcode,
      year,
      zones: Array.from(zonesSet),
      months: mergedMonths,
    };
    console.log(`[parseCalendar] raw merged: ${mergedMonths.length} months, ${runningLabelCount} labels total`);
    onProgress?.({ stage: "extracting", detail: t("scan.progress.found_markers", { markers: runningLabelCount, months: mergedMonths.length }) });

    // STEP 2: code maps raw → CollectionEvent[]
    onProgress?.({ stage: "mapping", detail: t("scan.progress.organising") });
    console.log("[parseCalendar] === Step 2: mapping to events ===");
    const events = mapRawToEvents(raw, anchoredMonths, year);
    console.log(`[parseCalendar] mapped ${events.length} events`);
    allEvents.push(...events);
  }

  onProgress?.({ stage: "done" });

  // Final hard filter on month (belt + suspenders)
  const filteredByMonth = allEvents.filter((e) => {
    const m = parseInt(e.date.slice(5, 7), 10);
    return allowedMonthSet.has(m);
  });
  if (filteredByMonth.length !== allEvents.length) {
    console.warn(`[parseCalendar] FINAL FILTER removed ${allEvents.length - filteredByMonth.length} events outside anchored months`);
  }

  // De-duplicate (same date+type+zone)
  const seen = new Set<string>();
  const events = filteredByMonth
    .filter((e) => {
      const k = `${e.date}|${e.type}|${e.zone}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`[parseCalendar] === Done: ${events.length} events (allowed months: ${Array.from(allowedMonthSet).sort().map((m) => MONTH_NAMES[m]).join(", ")}) ===`);

  // Build a descriptive default title: "{Municipality}, {Year} · Jan–Jun"
  const sortedMonths = Array.from(allowedMonthSet).sort((a, b) => a - b);
  const rangePart = sortedMonths.length === 0
    ? ""
    : sortedMonths.length === 1
    ? monthShort(sortedMonths[0])
    : `${monthShort(sortedMonths[0])}–${monthShort(sortedMonths[sortedMonths.length - 1])}`;
  const namePart = municipality || title || t("scan.calendar_fallback");
  const computedTitle = rangePart
    ? `${namePart}, ${year} · ${rangePart}`
    : `${namePart}, ${year}`;

  return {
    title: computedTitle,
    municipality,
    canton,
    postcode: postcode || undefined,
    zones: Array.from(zonesSet),
    events,
  };
}
