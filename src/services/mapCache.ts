// In-memory cache for the collection-centres map. The map screen is
// unmounted whenever its tab loses focus (to free the native map's memory),
// so without this every visit would re-geocode and re-query Overpass.
// Nothing here is persisted: it lives for the JS session only and every
// entry expires after TTL_MS.

import type { Region } from "react-native-maps";
import type { CollectionCenter } from "../types/collectionCenters";

const TTL_MS = 10 * 60 * 1000;
const MAX_AREAS = 12;

type LatLon = { lat: number; lon: number };

interface Stamped<T> {
  value: T;
  at: number;
}

export interface CachedView {
  /** Where the map was centred to begin with (geocoded place or device). */
  origin: LatLon;
  /** The region the user was last looking at. */
  region: Region;
  /** The region the current centres were fetched for. */
  fetchedRegion: Region | null;
  centers: CollectionCenter[];
}

const fresh = <T>(e: Stamped<T> | undefined): T | null =>
  e && Date.now() - e.at < TTL_MS ? e.value : null;

const origins = new Map<string, Stamped<LatLon>>();
const views = new Map<string, Stamped<CachedView>>();
const areas = new Map<string, Stamped<CollectionCenter[]>>();

/** Cache key for a location query; "" stands for "device / default". */
export const placeKey = (query: string | null | undefined) => (query ?? "").trim().toLowerCase();

export function getOrigin(key: string): LatLon | null {
  return fresh(origins.get(key));
}

export function setOrigin(key: string, value: LatLon) {
  origins.set(key, { value, at: Date.now() });
}

export function getView(key: string): CachedView | null {
  return fresh(views.get(key));
}

/** Merge into the cached view. Only the centres refresh the TTL, so a
 *  view whose data is stale still expires even if the user keeps panning. */
export function saveView(key: string, patch: Partial<CachedView> & { origin: LatLon }) {
  const prev = views.get(key);
  const base = fresh(prev);
  const value: CachedView = {
    region: patch.region ?? base?.region ?? regionAround(patch.origin),
    fetchedRegion: patch.fetchedRegion !== undefined ? patch.fetchedRegion : (base?.fetchedRegion ?? null),
    centers: patch.centers ?? base?.centers ?? [],
    origin: patch.origin,
  };
  const at = patch.centers || !base ? Date.now() : prev!.at;
  views.set(key, { value, at });
}

function regionAround(o: LatLon): Region {
  return { latitude: o.lat, longitude: o.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 };
}

// Overpass results per bbox, rounded so a restored region hits the same key.
const areaKey = (r: Region) =>
  [r.latitude, r.longitude, r.latitudeDelta, r.longitudeDelta].map((n) => n.toFixed(3)).join(",");

export function getArea(region: Region): CollectionCenter[] | null {
  return fresh(areas.get(areaKey(region)));
}

export function setArea(region: Region, centers: CollectionCenter[]) {
  const key = areaKey(region);
  areas.delete(key);
  areas.set(key, { value: centers, at: Date.now() });
  // Map keeps insertion order: drop the oldest beyond the cap.
  while (areas.size > MAX_AREAS) {
    const oldest = areas.keys().next().value;
    if (oldest === undefined) break;
    areas.delete(oldest);
  }
}
