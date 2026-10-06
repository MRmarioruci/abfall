import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ParsedCalendarResult, CollectionEvent } from "../types/calendar";
import { ST, type WasteStreamId } from "../theme/colors";

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

const PROVIDER: "openai" | "gemini" =
  (process.env.EXPO_PUBLIC_SCAN_PROVIDER as any) === "openai" ? "openai" : "gemini";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

// Latest Gemini at time of writing is 2.5 (Pro/Flash). If a newer one
// (e.g. 3.x) ships, just bump this constant.
const GEMINI_MODEL_REASONING = "gemini-2.5-pro";
const GEMINI_MODEL_FAST = "gemini-2.5-flash";
const geminiUrl = (key: string, model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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

const VALID_TYPES = Object.keys(ST) as WasteStreamId[];

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

function geminiSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue;
    if (k === "type" && Array.isArray(v)) {
      const nonNull = v.filter((t) => t !== "null");
      out.type = nonNull[0] || "string";
      if (v.includes("null")) out.nullable = true;
      continue;
    }
    out[k] = geminiSchema(v);
  }
  return out;
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
async function prepareImageHiRes(uri: string) {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 2800 } }],
    { format: SaveFormat.JPEG, base64: true, compress: 0.96 },
  );
  return result;
}

// ---------------------------------------------------------------------------
// Provider call helpers
// ---------------------------------------------------------------------------

async function callOpenAI(
  apiKey: string,
  base64Image: string,
  systemPrompt: string,
  userPrompt: string,
  schemaName: string,
  schema: object,
): Promise<any> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 16384,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "high" },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error("[parseCalendar] OpenAI error:", response.status, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  console.log("[parseCalendar] OpenAI tokens:", data.usage);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return JSON.parse(text);
}

async function callGemini(
  apiKey: string,
  model: string,
  base64Image: string,
  systemPrompt: string,
  userPrompt: string,
  schema: object,
  maxTokens = 32768,
  thinkingBudget?: number,
): Promise<any> {
  const generationConfig: any = {
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: geminiSchema(schema),
    maxOutputTokens: maxTokens,
  };
  if (thinkingBudget !== undefined && !model.includes("pro")) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }
  const response = await fetch(geminiUrl(apiKey, model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          { text: userPrompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } },
        ],
      }],
      generationConfig,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error(`[parseCalendar] ${model} error:`, response.status, error);
    throw new Error(`Gemini error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  console.log(`[parseCalendar] ${model} usage:`, data.usageMetadata);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data.candidates?.[0]?.finishReason;
  if (!text) throw new Error(`Empty response (finishReason: ${finishReason})`);
  try {
    return JSON.parse(text);
  } catch (e: any) {
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Gemini hit the output token limit. Try a smaller image or fewer months.");
    }
    console.error("[parseCalendar] Gemini JSON parse failed:", text.slice(0, 300));
    throw new Error(`Failed to parse Gemini response: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// STEP 0: anchor months (strict OCR of headers; constrains step 1)
// ---------------------------------------------------------------------------

const ANCHOR_SYSTEM = `You are a strict OCR tool. Look at the image of a waste collection calendar and list every month name you can literally see printed as a header or row label.

Rules:
- Include EVERY month name visible — even the ones written in shortened form like "Jan.", "Feb.", "Sept.", "Okt.", "Nov.", "Dez." (the trailing dot is fine, include it as-is).
- A calendar may print the months in different forms in the same image (e.g. full names for some, abbreviations for others). List ALL of them.
- Accept any language: German (Januar, Februar, März…), English (January, February…), French (janvier, février…), Italian (gennaio, febbraio…), and their common short forms.
- Do NOT guess. Do NOT extrapolate. If only March through July are shown, list only those.

Also identify the document's year. If a single year is printed (e.g. "2026"), return it. If multiple, return the primary one. If none visible, return 0.

Return strict JSON: { "monthNames": [...], "year": <int> }.`;

const ANCHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    monthNames: { type: "array", items: { type: "string" } },
    year: { type: "integer" },
  },
  required: ["monthNames", "year"],
};

async function anchorMonths(base64Image: string): Promise<{ monthNames: string[]; year: number }> {
  if (PROVIDER === "openai") {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error("EXPO_PUBLIC_OPENAI_API_KEY is not set.");
    return callOpenAI(apiKey, base64Image, ANCHOR_SYSTEM,
      "List the literal German month names you see as headers. Do not extrapolate.",
      "month_anchor", ANCHOR_SCHEMA);
  }
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set.");
  return callGemini(apiKey, GEMINI_MODEL_FAST, base64Image, ANCHOR_SYSTEM,
    "List the literal German month names you see as headers. Do not extrapolate.",
    ANCHOR_SCHEMA, 1024, 0);
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

const STRUCTURE_SYSTEM = `You are looking at a municipal waste-collection calendar. DO NOT extract any dates yet. Your only job is to PRODUCE A MANUAL that describes how to read the calendar.

Output strict JSON describing:

{
  "language": "<the primary language of the calendar (e.g. 'de', 'fr', 'it', 'en')>",
  "layoutDescription": "<2–4 sentence description of how the calendar is structured. Is it a per-day grid? A rule-based table? Where are months arranged? Where do icons sit? Where are zone indicators?>",
  "zones": [ "<each zone label as printed, in the order shown in the legend>" ],
  "zoneColors": [
    { "zone": "<zone label>", "colorDescription": "<short description of the color used to represent that zone, e.g. 'bright orange', 'muted teal', 'navy blue with white inside'>" }
  ],
  "iconZoneConvention": "<how each individual icon on a day cell tells you which zone it belongs to. Be SPECIFIC. Examples: 'Each icon is drawn entirely in the zone's colour; one icon = one zone.' / 'Each icon has its zone letter printed inside it.' / 'Each icon is solid grey with a small colored corner badge indicating the zone.' / 'Zones are shown as separate columns; the icon's position tells you the zone.'>",
  "sameDaySameTypeConvention": "<for the SAME waste type, how many icons typically appear on the same day, and what it means. Examples: 'One icon per day — Karton serves a single zone each Friday on a rotating schedule.' / 'Multiple icons side-by-side when several zones share the same pickup day; count each icon separately.'>",
  "wasteTypes": [
    { "label": "<the waste type name as printed, e.g. 'Karton', 'Bioabfall', 'Hauskehricht'>",
      "iconDescription": "<short description of how the icon looks in isolation: shape, lines, fill style, any letter inside>",
      "distinguishingFeature": "<the SINGLE most distinctive visual feature that tells THIS icon apart from EVERY OTHER icon in this calendar's legend. Be concrete and contrastive. Compare against the most visually similar other icon in this calendar and state the difference. Examples: 'Has a small handle/tie at the top — looks like a tied trash bag, unlike Karton which is a square box.' / 'Three or four stacked horizontal lines without any outer border — unlike Karton, which has a 3D box outline with corrugated edges.' / 'Contains a stylised leaf shape — no other icon in this calendar has plant imagery.'>" }
  ],
  "notes": "<free-text observations that would help someone read this calendar correctly — e.g. 'colors are subtle, look carefully', 'one zone uses a striped pattern instead of a solid color', 'zone letters are printed inside each icon'>"
}

GUIDELINES:
- Read the LEGEND very carefully. The legend usually sits at the top, bottom, or beside the calendar. It maps zone labels to colors and lists waste types.
- For zoneColors, describe each color in plain English — not hex codes. Use enough adjectives to disambiguate (e.g. "deep red, almost burgundy" not just "red" if the calendar uses two reds).
- For iconZoneConvention: pick A FEW representative days from the calendar (e.g. a Friday with a Karton icon) and check what tells you the zone. Is it the icon's fill colour? A letter inside? Its column position? Be precise — the extraction pass will rely on this.
- For sameDaySameTypeConvention: look at a few days. If you see only ONE Karton icon per Friday throughout the calendar, say so. If you sometimes see multiple icons side-by-side for the same waste type on the same day, say so. Be honest — most calendars use ONE icon per day per waste type, rotating zones across weeks.
- For wasteTypes[].distinguishingFeature: this is CRITICAL. For each icon, look at every OTHER icon in this calendar's legend and identify what makes THIS icon different. Examples of waste-types that are easily confused on small icons: Paper vs Karton (both rectangular/stacked), Bio vs Garden Waste (both green/organic), Metal vs Aluminum (both metallic). For each pair, find the single most reliable visual cue that tells them apart in THIS calendar specifically. The extraction pass will scan many small icons fast — it needs a single yes/no check it can apply per icon, not a fuzzy "looks like a box" hint.
- If zones are NOT color-coded (they're labeled by column or by text instead), set zoneColors to an empty array and put a note about how zones are distinguished.
- If the calendar has no zones at all, set zones and zoneColors to empty arrays and write "Not applicable — no zones" in iconZoneConvention.
- Do NOT enumerate any collection dates. That happens in a separate later step. Focus only on STRUCTURE.

If something is unclear, say so in "notes" rather than guessing.`;

const STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    language: { type: "string" },
    layoutDescription: { type: "string" },
    zones: { type: "array", items: { type: "string" } },
    zoneColors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          zone: { type: "string" },
          colorDescription: { type: "string" },
        },
        required: ["zone", "colorDescription"],
      },
    },
    iconZoneConvention: { type: "string" },
    sameDaySameTypeConvention: { type: "string" },
    wasteTypes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          iconDescription: { type: "string" },
          distinguishingFeature: { type: "string" },
        },
        required: ["label", "iconDescription", "distinguishingFeature"],
      },
    },
    notes: { type: "string" },
  },
  required: [
    "language",
    "layoutDescription",
    "zones",
    "zoneColors",
    "iconZoneConvention",
    "sameDaySameTypeConvention",
    "wasteTypes",
    "notes",
  ],
};

async function extractStructure(base64Image: string): Promise<CalendarStructure> {
  const user = "Describe the calendar's structure. Focus on the legend, zone definitions, waste-type icons, and layout. Do not list any dates.";
  if (PROVIDER === "openai") {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error("EXPO_PUBLIC_OPENAI_API_KEY is not set.");
    return callOpenAI(apiKey, base64Image, STRUCTURE_SYSTEM, user, "calendar_structure", STRUCTURE_SCHEMA);
  }
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set.");
  return callGemini(apiKey, GEMINI_MODEL_REASONING, base64Image, STRUCTURE_SYSTEM, user, STRUCTURE_SCHEMA, 8192);
}

function structureToContextString(s: CalendarStructure): string {
  const parts: string[] = [];
  if (s.language) parts.push(`Language: ${s.language}`);
  if (s.layoutDescription) parts.push(`Layout: ${s.layoutDescription}`);
  if (s.zones.length > 0) {
    parts.push(`Zones: ${s.zones.join(", ")}`);
    if (s.zoneColors.length > 0) {
      const map = s.zoneColors.map((z) => `${z.zone} = ${z.colorDescription}`).join("; ");
      parts.push(`Zone colors: ${map}`);
    } else {
      parts.push(`(Zones are not color-coded — see notes for how to tell them apart.)`);
    }
    if (s.iconZoneConvention) parts.push(`How icons indicate their zone: ${s.iconZoneConvention}`);
    if (s.sameDaySameTypeConvention) parts.push(`Same-day icon count: ${s.sameDaySameTypeConvention}`);
  } else {
    parts.push(`No zones — this calendar covers the whole municipality.`);
  }
  if (s.wasteTypes.length > 0) {
    // Each waste type gets a multi-line block — the distinguishing feature
    // is the key fact the extraction pass needs for per-icon classification,
    // so it gets its own line.
    const blocks = s.wasteTypes.map((w) => {
      const lines = [`  • ${w.label}`];
      if (w.iconDescription) lines.push(`    Icon: ${w.iconDescription}`);
      if (w.distinguishingFeature) lines.push(`    To tell it apart: ${w.distinguishingFeature}`);
      return lines.join("\n");
    });
    parts.push(`Waste types:\n${blocks.join("\n")}`);
  }
  if (s.notes) parts.push(`Notes: ${s.notes}`);
  return parts.join("\n");
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

function makeRawSystem(anchoredMonths: number[], anchorYear: number): string {
  const monthList = anchoredMonths.map((m) => `${m} (${MONTH_NAMES[m]})`).join(", ");
  return `You are reading a municipal waste-collection calendar. It can be in any language (German, French, Italian, English…) and any layout (per-day grid with icons, a table of months × waste-type columns, a list of rules with exceptions, or any combination). Your job is to UNDERSTAND it, MENTALLY EXPAND any rules or shorthand into concrete dates, and produce a per-day JSON.

CONFIRMED VISIBLE MONTHS: ${monthList}. The document year is ${anchorYear}. ONLY include events in these months.

OUTPUT FORMAT (strict — populate every field you can):
{
  "title": "<document title or empty>",
  "municipality": "<municipality / town / city name as printed, or empty>",
  "canton": "<2-letter canton/region/state code if visible, else empty>",
  "postcode": "<postal/ZIP code if printed (e.g. 8001 for Zürich), else empty>",
  "year": <int>,
  "zones": ["<zone / district names if the calendar splits the area, else empty list>"],
  "months": [
    {
      "month": <int 1-12>,
      "days": [
        { "day": <int 1-31>, "labels": ["<short description of one collection event on this day>", …] },
        …
      ]
    }
  ]
}

THE GOLDEN RULES:
1. Each "label" is ONE collection event on that day, described in the source language (or English — your choice). Use the waste-type name as printed, plus the zone if zones apply (e.g. "Refuse West", "Bio Ost", "Karton A", "Bulky 8:00–11:30").
2. A single day can have multiple labels (one per collection event).
3. Skip days with no real collection event — empty days are NOT needed.
4. Skip facility opening hours, school-holiday highlighting alone, holiday name labels by themselves, and footer / margin text. Only collection events go in labels.

═══════════════════════════════════════════════════════════
HANDLING ZONES (do this BEFORE reading day cells)
═══════════════════════════════════════════════════════════
Many municipal calendars split the area into sub-zones (neighbourhoods, districts, route letters). The same waste type can be collected on DIFFERENT days for different zones, so every event MUST carry its zone if zones exist.

STEP 1 — Identify the zones:
  Look at the top of the table, the header row above each month, or a legend / color key. Zones can appear as:
    • Letter or word labels: "A", "B", "C", "D" / "Zone 1, Zone 2" / "West", "Ost" / "Nord", "Süd" / district names.
    • Multiple columns per waste type, one per zone (e.g. two "Karton" columns labeled "West" and "Ost").
    • A color key or legend mapping colored dots / circles / badges to zone names.
    • Sub-rows in a day's cell, each zone-tagged.
  Put the printed zone names in the top-level "zones" array, in the order they appear (e.g. ["A", "B", "C", "D"] or ["West", "Ost"]).

STEP 2 — Build the COLOR → ZONE map (CRITICAL for color-coded calendars):
  Many calendars don't print the zone letter next to each day's icon — they encode the zone in the icon's COLOR. The legend / header shows each zone letter or name next to a colored dot or sample icon (e.g. "A" in orange, "B" in dark blue, "C" in teal, "D" in red).
  Read the legend carefully and remember which color belongs to which zone. You will use this for EVERY icon on every day.

STEP 3 — For each day's icon, determine its zone using the FIRST rule that applies:
  (a) If a column or row header labels the zone explicitly (column "B", row "Ost"), use that.
  (b) If the icon has a letter or number printed inside or beside it ("B"), use that.
  (c) Otherwise, look at the icon's COLOR and match it against the legend's color → zone map.

  ⚠️ Two icons of the SAME shape on different days but in DIFFERENT colors are DIFFERENT zones. Do NOT label them all as the same zone — that is the single most common mistake.

STEP 3.5 — When in doubt, DO NOT GUESS the zone:
  If you cannot confidently identify which zone an icon belongs to (the color is ambiguous, the legend is unclear, or the icon is too small to read), leave the zone OFF the label — just write the bare waste-type name (e.g. "Karton"). This is correct behaviour for icons that aren't actually zone-specific (town-wide pickups), AND a safer default than picking the wrong zone.
  Defaulting every icon of a given waste type to the SAME zone (e.g. all "Karton A") is almost always wrong when the calendar uses multiple zones. If your output has every collection of one waste type going to a single zone, that's a red flag — re-examine the colors carefully, and if you still can't tell them apart, drop the zone suffix instead of inventing one.

  Two helpful sanity checks:
   • Over a full year, A/B/C/D-zoned collections of the same waste type usually distribute roughly evenly across the zones (~25 % each). If you find yourself writing 50 events all as "X A", something is wrong.
   • If a waste type genuinely is town-wide (no zone split), all its icons should look identical (same color, same shape). In that case, omit the zone — don't pick one.

STEP 3.6 — ONE ICON = ONE LABEL = ONE ZONE (CRITICAL):
  Each visible icon drawn in a day's cell represents EXACTLY ONE collection event for EXACTLY ONE zone (or for the whole municipality, if it's a town-wide pickup with no zone). Apply these rules strictly:

  • COUNT the actual icons drawn for each waste type on a given day. Output exactly that many labels for that waste type — no more, no less.
  • If a day shows ONE Karton icon, output ONE label. That icon has ONE zone (look at its colour) or no zone (town-wide).
  • If a day shows THREE Karton icons side-by-side (each in a different colour), output THREE labels — one per icon, each with its own zone (e.g. "Karton B", "Karton C", "Karton D").
  • NEVER assign multiple zones to a SINGLE icon. There is no such thing as "this one icon represents three zones".

  ⚠️ HALLUCINATION ALARM: if you find yourself drafting "Karton B" + "Karton C" + "Karton D" all on the same day for a waste type that ONLY has ONE icon visible on that day, you are inventing zones. STOP and look again at the image. Either:
    (a) That icon belongs to ONE specific zone — pick the right one from its colour.
    (b) That icon is a town-wide pickup — omit the zone, just write "Karton".
    (c) You actually do see multiple distinct icons (count them carefully) — in which case the label count must match the icon count.

  For most calendars with rotating zone schedules (zone A this week, B next week, C the week after…), a single waste type has ONE pickup per day. Multi-zone-same-day pickups for the same waste type are RARE — be suspicious whenever you're about to write more than one.

STEP 4 — Build the label:
  Append the zone to every label: "Karton A", "Refuse West", "Bio Ost".
  If the same marker covers MULTIPLE zones on the same day, output ONE label per zone — e.g. don't write "Bio B+D", write two separate labels: "Bio B" and "Bio D".
  If different waste types use different zoning schemes within the same calendar (rare), preserve each scheme's labels as-is.

If a marker covers the WHOLE municipality (no zone split), do NOT add a zone suffix — just write the waste-type name (e.g. "Sonderabfall 8:00–11:30" for a town-wide hazardous waste pickup).

If the calendar has NO zones at all, leave "zones" as an empty array and don't append zones to labels.

WORKED EXAMPLE — color-coded zones (colors below are illustrative — use the ACTUAL colors in the image):
  Imagine the legend at the top of the calendar shows four zone letters next to four colored dots — for example A in colour-1, B in colour-2, C in colour-3, D in colour-4. (The actual hues may be anything: oranges, blues, greens, reds, purples, browns…)
  Day 5 has a Karton icon drawn in colour-1   → label "Karton A".
  Day 12 has a Karton icon drawn in colour-2  → label "Karton B".
  Day 19 has a Karton icon drawn in colour-3  → label "Karton C".
  Day 26 has a Karton icon drawn in colour-4  → label "Karton D".
  All four icons are the SAME SHAPE; the FILL COLOUR is what tells you the zone. Look at each icon's dominant fill colour individually — don't assume they're all the same just because they share a shape.
  If you wrote "Karton A" for all four because you didn't check the colour, the user will miss the correct dates for zones B, C, and D — that's a critical failure. When uncertain, omit the zone (just write "Karton") rather than picking the wrong one.

EXPAND RULES INTO DATES YOURSELF:
The calendar may describe schedules with text rules instead of marking each day. Examples in different languages:
  - "every Tuesday and Friday" / "immer dienstags und freitags" / "tous les mardis et vendredis"
  - "every Monday" / "immer montags" / "tutti i lunedì"
  - "every other Wednesday" / "alle zwei Wochen mittwochs" / "tous les quinze jours"
  - "first Wednesday of the month" / "1. Mittwoch im Monat"
  - "last Friday of the month"
  - Explicit dates per month, like "7. / 21." or "Wed 7, Wed 21"
  - Exceptions like "except Fri 2 January" / "ausser Fr, 2. Januar" / "sauf le 2 janvier"
  - Substitutes like "moved to Tue 7 April" / "Ersatz Di, 7. April"
  - "no replacement" / "kein Ersatz" / "pas de rattrapage"

For each rule + month combination:
  • Work out which concrete calendar dates in year ${anchorYear} match the rule.
  • If the cell for that month lists explicit dates (numbers), use ONLY those for that month — they override the rule.
  • Remove any explicit exceptions ("except …", "ausser …", "sauf …").
  • Add any substitutes ("replaced by …", "Ersatz …", "remplacé par …").
  • Treat "no replacement" / "kein Ersatz" / "pas de rattrapage" as just removing the cancelled date.

Then write every resulting date into the days[] array with the waste-type name as the label.

WORKED EXAMPLE (year ${anchorYear}):
Column header: "Refuse — every Tuesday and Friday". January cell: "except Fri 2 January".
  Calendar dates that match in January ${anchorYear}: figure out Tuesdays and Fridays, then drop Jan 2.
  Output for January would include {"day": 6, "labels": ["Refuse"]}, {"day": 9, "labels": ["Refuse"]}, … etc.

If the image contains MULTIPLE separate calendars (per-day grid AND a rule table side by side), handle each in its own way and combine the results in one months[] array.

If you cannot clearly read something, OMIT it. Wrong data is worse than missing data — the user can add gaps manually, but they can't easily fix invented dates.`;
}

const RAW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    municipality: { type: "string" },
    canton: { type: "string" },
    postcode: { type: "string" },
    year: { type: "integer" },
    zones: { type: "array", items: { type: "string" } },
    months: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          month: { type: "integer" },
          days: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                day: { type: "integer" },
                labels: { type: "array", items: { type: "string" } },
              },
              required: ["day", "labels"],
            },
          },
        },
        required: ["month", "days"],
      },
    },
  },
  required: ["title", "municipality", "canton", "postcode", "year", "zones", "months"],
};

async function extractRaw(
  base64Image: string,
  anchoredMonths: number[],
  anchorYear: number,
  structure?: CalendarStructure,
): Promise<RawCalendar> {
  const baseSystem = makeRawSystem(anchoredMonths, anchorYear);
  // Prepend the structure manual (from Step 1a) so the extraction call has
  // the layout + zones + color map already laid out for it, instead of
  // re-deriving them from the image alongside the date extraction.
  const system = structure
    ? `═══════════════════════════════════════════════════════════
CALENDAR MANUAL (derived in a previous pass — TRUST these facts):
═══════════════════════════════════════════════════════════
${structureToContextString(structure)}
═══════════════════════════════════════════════════════════

You don't need to re-derive the layout, zones, or color → zone map — they are stated above. Your job is to enumerate the per-day collection events using that manual. If you ever disagree with the manual after looking at the image, prefer the manual's zone mapping (it was produced with focused attention on the legend).

`
    + baseSystem
    : baseSystem;
  const user = `Read this waste-collection calendar and return the JSON. Confirmed visible months: ${anchoredMonths.map((m) => MONTH_NAMES[m]).join(", ")}. Only include those.`;

  if (PROVIDER === "openai") {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error("EXPO_PUBLIC_OPENAI_API_KEY is not set.");
    return callOpenAI(apiKey, base64Image, system, user, "calendar_raw", RAW_SCHEMA);
  }
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set.");
  return callGemini(apiKey, GEMINI_MODEL_REASONING, base64Image, system, user, RAW_SCHEMA, 32768);
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
  let title = "";
  let municipality = "";
  let canton = "";
  let postcode = "";
  let year = new Date().getFullYear();
  const zonesSet = new Set<string>();
  const allEvents: CollectionEvent[] = [];
  const allowedMonthSet = new Set<number>();

  console.log(`[parseCalendar] provider: ${PROVIDER}`);

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imgLabel = images.length > 1 ? ` (image ${i + 1}/${images.length})` : "";

    // Stage transitions only carry a `detail` when there's substantive new
    // info to share (e.g. the result of the step). The active step's label
    // is already shown by the UI — repeating it as a subtitle just looks
    // like the screen says the same thing twice.
    onProgress?.({ stage: "preparing", detail: images.length > 1 ? `Image ${i + 1} of ${images.length}` : undefined });
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
      throw new Error("Could not detect any month headers in the image. Try a clearer photo.");
    }
    anchoredMonths.forEach((m) => allowedMonthSet.add(m));
    const anchorYear = anchor.year && anchor.year > 2000 ? anchor.year : new Date().getFullYear();
    const monthsLabel = anchoredMonths.map((m) => MONTH_NAMES[m]).join(", ");
    onProgress?.({ stage: "anchoring", detail: `Found ${anchoredMonths.length} month${anchoredMonths.length === 1 ? "" : "s"}: ${monthsLabel}` });

    // STEP 1a — STRUCTURE PASS: get the model to describe the calendar's
    // layout, zones, color → zone map, and waste-type icons BEFORE asking it
    // to enumerate dates. Use a higher-resolution image so subtle zone
    // colors aren't smushed by JPEG compression.
    onProgress?.({ stage: "understanding", detail: `Understanding the layout${imgLabel}` });
    console.log(`[parseCalendar] === Step 1a: structure pass (${PROVIDER}, hi-res) ===`);
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
        detail: `${wasteCount} waste type${wasteCount === 1 ? "" : "s"}${zoneCount > 0 ? `, ${zoneCount} zone${zoneCount === 1 ? "" : "s"}` : ""} found`,
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
      detail: `Reading ${anchoredMonths.length} month${anchoredMonths.length === 1 ? "" : "s"}…`,
    });
    console.log(`[parseCalendar] === Step 1b: raw extraction (per-month, ${PROVIDER}) ===`);

    const mergedMonths: RawCalendar["months"] = [];
    let runningLabelCount = 0;

    for (let mi = 0; mi < anchoredMonths.length; mi++) {
      const m = anchoredMonths[mi];
      onProgress?.({
        stage: "extracting",
        detail: `Reading ${MONTH_NAMES[m]} (${mi + 1}/${anchoredMonths.length})…`,
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
        console.warn(`[parseCalendar] ${MONTH_NAMES[m]} extraction failed:`, e);
        // Skip this month and continue — partial calendar is better than none.
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
    onProgress?.({ stage: "extracting", detail: `Found ${runningLabelCount} markers across ${mergedMonths.length} months` });

    // STEP 2: code maps raw → CollectionEvent[]
    onProgress?.({ stage: "mapping", detail: "Organising into your calendar" });
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
  const SHORT_EN = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sortedMonths = Array.from(allowedMonthSet).sort((a, b) => a - b);
  const rangePart = sortedMonths.length === 0
    ? ""
    : sortedMonths.length === 1
    ? SHORT_EN[sortedMonths[0]]
    : `${SHORT_EN[sortedMonths[0]]}–${SHORT_EN[sortedMonths[sortedMonths.length - 1]]}`;
  const namePart = municipality || title || "Calendar";
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
