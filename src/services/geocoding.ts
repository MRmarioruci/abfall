// Forward geocoding on OpenStreetMap data.
//
//   searchPlaces()    — search-as-you-type suggestions via Photon (komoot),
//                       which is built for autocomplete. Nominatim's usage
//                       policy forbids autocomplete, so it isn't used here.
//   geocodeLocation() — a single lookup via Nominatim (allowed: one request
//                       per user action, with an identifying User-Agent).
//
// Suggestions are places (cities, towns, villages, districts, regions,
// countries — NOT streets/addresses). Each carries a `formatted` string
// that's what we drop into the input on select.

import { getLocale } from "../i18n";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";
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
  // French names, as Photon returns them with lang=fr
  "Argovie": "AG", "Appenzell Rhodes-Extérieures": "AR", "Appenzell Rhodes-Intérieures": "AI",
  "Bâle-Campagne": "BL", "Bâle-Ville": "BS", "Glaris": "GL", "Nidwald": "NW", "Obwald": "OW",
  "Schaffhouse": "SH", "Soleure": "SO", "Saint-Gall": "SG", "Thurgovie": "TG",
  "Tessin": "TI", "Zoug": "ZG",
};

const SWITZERLAND: Record<string, string> = {
  en: "Switzerland", de: "Schweiz", fr: "Suisse", it: "Svizzera",
};

interface PhotonFeature {
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    type?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
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

function abbreviateSwiss(region: string | undefined, countryCode: string | undefined): string | null {
  if (countryCode?.toLowerCase() !== "ch") return null;
  if (!region) return null;
  // Local-name results can list every official language: "Bern/Berne".
  for (const part of region.split("/")) {
    const code = SWISS_CANTONS[part.trim()];
    if (code) return code;
  }
  return null;
}

function formatFeature(f: PhotonFeature): PlaceSuggestion | null {
  const p = f.properties;
  const primary = p.name?.trim();
  if (!primary) return null;

  const region = (p.state || p.county)?.split("/")[0];
  // Local-name results give "Schweiz/Suisse/Svizzera/Svizra"; show the
  // app's language instead, and the first form for other countries.
  const country =
    p.countrycode === "CH" ? SWITZERLAND[getLocale()] : p.country?.split("/")[0];
  // A canton itself has no `state`; its own name gives the code, so
  // "Genève" the canton formats like (and dedupes with) the city.
  const cantonCode =
    abbreviateSwiss(p.state, p.countrycode) ??
    (p.type === "state" ? abbreviateSwiss(primary, p.countrycode) : null);

  // Build the formatted insert string
  const formatted = cantonCode
    ? `${primary}, ${cantonCode}`
    : region && region !== primary
    ? `${primary}, ${region}`
    : country && primary !== country
    ? `${primary}, ${country}`
    : primary;

  // Context line, e.g. "Bezirk Dietikon, Zürich, Schweiz"
  const ctxParts: string[] = [];
  if (p.county && p.county !== primary && p.county !== region) ctxParts.push(p.county);
  if (region && region !== primary) ctxParts.push(region);
  if (country && country !== region) ctxParts.push(country);

  return {
    id: `${p.osm_type ?? ""}${p.osm_id ?? primary}`,
    primary,
    secondary: ctxParts.join(", "),
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

// Centre of Switzerland: results nearby rank higher, without excluding
// other countries.
const BIAS = { lat: "46.8", lon: "8.2", location_bias_scale: "0.4" };
const PLACE_LAYERS = ["city", "district", "locality", "county", "state", "country"];

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Photon supports de/en/fr; for Italian, "default" returns local names
  // (Lugano, Ticino, Genève), which is what Swiss users expect anyway.
  const locale = getLocale();
  const lang = locale === "it" ? "default" : locale;
  const params = new URLSearchParams({ q: trimmed, limit: "10", lang, ...BIAS });
  for (const layer of PLACE_LAYERS) params.append("layer", layer);

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };

  // Swiss places first, towns before districts/regions (people search for
  // their municipality), otherwise Photon's relevance order — the sort is
  // stable. Then dedupe on what we'd insert.
  const rank = (f: PhotonFeature) =>
    (f.properties.countrycode === "CH" ? 0 : 100) +
    Math.max(PLACE_LAYERS.indexOf(f.properties.type ?? ""), 0);
  const features = [...(data.features ?? [])].sort((a, b) => rank(a) - rank(b));
  const seen = new Set<string>();
  const suggestions: PlaceSuggestion[] = [];
  for (const f of features) {
    const s = formatFeature(f);
    if (!s || seen.has(s.formatted)) continue;
    seen.add(s.formatted);
    suggestions.push(s);
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}
