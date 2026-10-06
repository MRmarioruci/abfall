// Forward geocoding via OpenStreetMap Nominatim.
//   Free, no API key needed. Rate-limited to ~1 req/sec — fine because we
//   debounce typing. The User-Agent header is required by Nominatim's policy.
//
// Returns place suggestions (cities, towns, villages, municipalities, regions,
// countries — NOT streets/addresses). Each suggestion carries a `formatted`
// string that's what we drop into the input on select.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Abfall/1.0 (Swiss waste-calendar app)";

// Swiss canton full-name → 2-letter-code lookup. Mirrors the table in
// LocationEditSheet so reverse-geocoded and forward-geocoded names format
// identically.
const SWISS_CANTONS: Record<string, string> = {
  "Aargau": "AG", "Appenzell Ausserrhoden": "AR", "Appenzell Innerrhoden": "AI",
  "Basel-Landschaft": "BL", "Basel-Stadt": "BS", "Bern": "BE", "Berne": "BE",
  "Fribourg": "FR", "Freiburg": "FR", "Genève": "GE", "Geneva": "GE",
  "Glarus": "GL", "Graubünden": "GR", "Grisons": "GR", "Jura": "JU",
  "Luzern": "LU", "Lucerne": "LU", "Neuchâtel": "NE", "Nidwalden": "NW",
  "Obwalden": "OW", "Schaffhausen": "SH", "Schwyz": "SZ", "Solothurn": "SO",
  "St. Gallen": "SG", "Saint Gallen": "SG", "Thurgau": "TG", "Ticino": "TI",
  "Uri": "UR", "Valais": "VS", "Wallis": "VS", "Vaud": "VD", "Zug": "ZG",
  "Zürich": "ZH", "Zurich": "ZH",
};

// Nominatim "type" values we treat as actual places. Excludes streets,
// buildings, amenities, etc.
const PLACE_TYPES = new Set([
  "city", "town", "village", "hamlet", "municipality",
  "suburb", "neighbourhood", "quarter", "borough",
  "administrative", "county", "state", "region", "country", "province",
]);

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  state?: string;
  county?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  class: string;
  type: string;
  address?: NominatimAddress;
}

export interface PlaceSuggestion {
  id: string;
  /** Main name to show, e.g. "Schlieren" */
  primary: string;
  /** Context line, e.g. "Zürich, Switzerland · town" */
  secondary: string;
  /** Final string to drop into the input, e.g. "Schlieren, ZH" */
  formatted: string;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function abbreviateSwiss(region: string | undefined, countryCode: string | undefined): string | null {
  if (countryCode?.toLowerCase() !== "ch") return null;
  if (!region) return null;
  return SWISS_CANTONS[region] || null;
}

function formatResult(r: NominatimResult): PlaceSuggestion | null {
  const addr = r.address || {};
  const primary =
    r.name ||
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    r.display_name.split(",")[0].trim();

  if (!primary) return null;

  const country = addr.country;
  const region = addr.state || addr.county;
  const cantonCode = abbreviateSwiss(addr.state, addr.country_code);

  // Build the formatted insert string
  const formatted = cantonCode
    ? `${primary}, ${cantonCode}`
    : region && region !== primary
    ? `${primary}, ${region}`
    : country && primary !== country
    ? `${primary}, ${country}`
    : primary;

  // Build the secondary context line
  const ctxParts: string[] = [];
  if (region && region !== primary) ctxParts.push(region);
  if (country && country !== region) ctxParts.push(country);
  let secondary = ctxParts.join(", ");
  if (r.type) secondary += `${secondary ? " · " : ""}${titleCase(r.type.replace(/_/g, " "))}`;

  return {
    id: String(r.place_id),
    primary,
    secondary,
    formatted,
  };
}

export async function geocodeLocation(
  query: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    "accept-language": "en",
  }).toString()}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    addressdetails: "1",
    limit: "10",
    "accept-language": "en",
  }).toString()}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];

  const seen = new Set<string>();
  const suggestions: PlaceSuggestion[] = [];
  for (const r of data) {
    if (!PLACE_TYPES.has(r.type)) continue;
    const s = formatResult(r);
    if (!s) continue;
    // Dedup by formatted string
    if (seen.has(s.formatted)) continue;
    seen.add(s.formatted);
    suggestions.push(s);
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}
