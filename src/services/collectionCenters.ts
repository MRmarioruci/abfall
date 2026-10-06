import type { CollectionCenter, CenterCategory } from "../types/collectionCenters";
import { t, type StringKey } from "../i18n";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "Abfall/1.0 (Swiss waste-calendar app)";

const MATERIAL_KEYS = [
  "recycling:glass",
  "recycling:glass_bottles",
  "recycling:clothes",
  "recycling:PET",
  "recycling:cans",
  "recycling:paper",
  "recycling:cardboard",
  "recycling:plastic",
  "recycling:scrap_metal",
  "recycling:electrical_appliances",
  "recycling:batteries",
  "recycling:oil",
  "recycling:green_waste",
  "recycling:wood",
  "recycling:cooking_oil",
];

// Built when the data is fetched (it isn't cached), so it's in the
// language the app is using at that moment.
function buildMaterialsLabel(tags: Record<string, string>): string {
  const parts: string[] = [];
  for (const key of MATERIAL_KEYS) {
    if (tags[key] === "yes" || tags[key] === "true") {
      const label = t(`material.${key.replace("recycling:", "")}` as StringKey);
      if (!parts.includes(label)) parts.push(label);
    }
  }
  if (!parts.length) {
    if (tags.amenity === "recycling_centre") return t("material.fallback.centre");
    if (tags.amenity === "recycling") return t("material.fallback.point");
    return t("material.fallback.collection");
  }
  return parts.join(", ");
}

function determineCategory(tags: Record<string, string>): CenterCategory {
  // A "big" recycling centre is tagged either as amenity=recycling_centre,
  // or as amenity=recycling + recycling_type=centre, or as a waste-transfer
  // station. Catch all three so the category chip filter actually works.
  if (
    tags.amenity === "recycling_centre" ||
    tags.amenity === "waste_transfer_station" ||
    tags.amenity === "waste_disposal" ||
    tags.recycling_type === "centre"
  ) {
    return "centre";
  }
  if (tags["recycling:glass"] === "yes" || tags["recycling:glass_bottles"] === "yes") return "glass";
  if (tags["recycling:clothes"] === "yes") return "clothes";
  if (tags["recycling:PET"] === "yes" || tags["recycling:plastic"] === "yes") return "plastic";
  if (tags["recycling:paper"] === "yes" || tags["recycling:cardboard"] === "yes") return "paper";
  return "generic";
}

function sanitizeAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (tags["addr:street"]) {
    const house = tags["addr:housenumber"];
    parts.push(house ? `${tags["addr:street"]} ${house}` : tags["addr:street"]);
  }
  if (tags["addr:postcode"] && tags["addr:city"]) {
    parts.push(`${tags["addr:postcode"]} ${tags["addr:city"]}`);
  } else if (tags["addr:city"]) {
    parts.push(tags["addr:city"]);
  }
  return parts.length ? parts.join(", ") : undefined;
}

function parseOverpassElements(
  elements: Array<{
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>,
): CollectionCenter[] {
  const centers: CollectionCenter[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const coords = el.type === "node" ? { lat: el.lat!, lon: el.lon! } : el.center;
    if (!coords) continue;

    const tags = el.tags || {};
    const key = `${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    centers.push({
      id: `${el.type}/${el.id}`,
      lat: coords.lat,
      lon: coords.lon,
      name: tags.name,
      operator: tags.operator,
      address: sanitizeAddress(tags),
      type: tags.amenity || "collection_point",
      materialsLabel: buildMaterialsLabel(tags),
      category: determineCategory(tags),
      openingHours: tags.opening_hours,
      description: tags.description,
      recyclingType: tags.recycling_type,
      tags,
    });
  }

  return centers;
}

async function queryOverpass(query: string, signal?: AbortSignal): Promise<CollectionCenter[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const data = (await res.json()) as {
    elements: Array<{
      type: "node" | "way" | "relation";
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  return parseOverpassElements(data.elements);
}

function recyclingQuery(predicate: string): string {
  return `
    node["amenity"="recycling_centre"]${predicate};
    way["amenity"="recycling_centre"]${predicate};
    relation["amenity"="recycling_centre"]${predicate};
    node["amenity"="recycling"]${predicate};
    way["amenity"="recycling"]${predicate};
    relation["amenity"="recycling"]${predicate};
  `;
}

// Bigger facilities (recycling centres, waste-transfer stations) are sparse
// and people travel further to reach them, so we query them in a wider area
// regardless of viewport. Small containers stay viewport-bound.
function bigCentreQuery(predicate: string): string {
  return `
    node["amenity"="recycling_centre"]${predicate};
    way["amenity"="recycling_centre"]${predicate};
    relation["amenity"="recycling_centre"]${predicate};
    node["amenity"="waste_transfer_station"]${predicate};
    way["amenity"="waste_transfer_station"]${predicate};
    relation["amenity"="waste_transfer_station"]${predicate};
    node["amenity"="recycling"]["recycling_type"="centre"]${predicate};
    way["amenity"="recycling"]["recycling_type"="centre"]${predicate};
    relation["amenity"="recycling"]["recycling_type"="centre"]${predicate};
  `;
}

export async function fetchCollectionCenters(
  lat: number,
  lon: number,
  radiusMeters: number = 15000,
  signal?: AbortSignal,
): Promise<CollectionCenter[]> {
  const query = `
    [out:json][timeout:25];
    (
      ${recyclingQuery(`(around:${radiusMeters},${lat},${lon})`)}
    );
    out center tags;
  `;
  return queryOverpass(query, signal);
}

export interface Bbox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export async function fetchCollectionCentersInBounds(
  bbox: Bbox,
  signal?: AbortSignal,
): Promise<CollectionCenter[]> {
  const centerLat = (bbox.north + bbox.south) / 2;
  const centerLon = (bbox.east + bbox.west) / 2;
  // Big centres get a 30 km radius around the viewport center so users
  // can see (and filter for) the nearest large recycling facilities even
  // when they're zoomed into a single town.
  const BIG_CENTRE_RADIUS_M = 30000;
  const bboxPredicate = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  const radiusPredicate = `(around:${BIG_CENTRE_RADIUS_M},${centerLat},${centerLon})`;
  const query = `
    [out:json][timeout:25];
    (
      ${recyclingQuery(bboxPredicate)}
      ${bigCentreQuery(radiusPredicate)}
    );
    out center tags;
  `;
  return queryOverpass(query, signal);
}
