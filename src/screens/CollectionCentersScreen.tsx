import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, UrlTile, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { S } from "../theme/colors";
import { PinIcon, ArrowURIcon } from "../components/icons/Icons";
import { CircBtn } from "../components/ui/CircBtn";
import {
  CollectionCenterMarker,
  CATEGORY_COLORS,
} from "../components/CollectionCenterMarker";
import { useCalendars } from "../context/CalendarContext";
import { geocodeLocation } from "../services/geocoding";
import { fetchCollectionCentersInBounds, type Bbox } from "../services/collectionCenters";
import type { CenterCategory, CollectionCenter } from "../types/collectionCenters";

const ALL_CATEGORIES: CenterCategory[] = [
  "centre",
  "glass",
  "clothes",
  "plastic",
  "paper",
  "generic",
];

const CATEGORY_LABELS: Record<CenterCategory, string> = {
  centre: "Centres",
  glass: "Glass",
  clothes: "Clothes",
  plastic: "Plastic",
  paper: "Paper",
  generic: "Other",
};

// Fallback center: Zürich HB.
const DEFAULT_CENTER = { lat: 47.3769, lon: 8.5417 };

// Do not fetch data when zoomed out further than this — too many markers and
// the Overpass query takes much longer. ~0.10° lat at Swiss latitudes is
// roughly an 11 km box, which still covers a town comfortably.
const MAX_LATITUDE_DELTA = 0.10;

// Render at most this many markers at once to keep the UI fluid.
const MAX_VISIBLE_MARKERS = 200;

// Debounce map pan/zoom fetches so we don't hammer Overpass.
const FETCH_DEBOUNCE_MS = 800;

// Only re-fetch when the viewport center has moved at least this fraction of
// the current latitude delta. Prevents a fetch on every tiny pan.
const FETCH_MOVE_THRESHOLD = 0.35;

function regionToBbox(region: Region): Bbox {
  return {
    north: region.latitude + region.latitudeDelta / 2,
    south: region.latitude - region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
  };
}

function isZoomedInEnough(region: Region): boolean {
  return region.latitudeDelta <= MAX_LATITUDE_DELTA;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          color: S.ter,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 13.5,
          color: S.ink,
          fontWeight: "600",
          lineHeight: 18,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function regionChangedEnough(prev: Region | null, next: Region): boolean {
  if (!prev) return true;
  const latDiff = Math.abs(prev.latitude - next.latitude);
  const lonDiff = Math.abs(prev.longitude - next.longitude);
  const latThreshold = next.latitudeDelta * FETCH_MOVE_THRESHOLD;
  const lonThreshold = next.longitudeDelta * FETCH_MOVE_THRESHOLD;
  const zoomChanged =
    Math.abs(prev.latitudeDelta - next.latitudeDelta) > next.latitudeDelta * 0.3;
  return latDiff > latThreshold || lonDiff > lonThreshold || zoomChanged;
}

function centerInRegion(center: CollectionCenter, region: Region): boolean {
  const { north, south, east, west } = regionToBbox(region);
  return (
    center.lat <= north &&
    center.lat >= south &&
    center.lon <= east &&
    center.lon >= west
  );
}

// Filter chip — colored dot + label, white pill when inactive, ink-filled
// when active. Used for both "All" and per-category filters.
const CategoryChip = memo(function CategoryChip({
  active,
  label,
  dotColor,
  onPress,
}: {
  active: boolean;
  label: string;
  dotColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 99,
        backgroundColor: active ? S.ink : "rgba(255,255,255,0.95)",
        borderWidth: 1.5,
        borderColor: active ? S.ink : "rgba(40,28,18,0.10)",
        shadowColor: "rgb(150,118,96)",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {dotColor && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            backgroundColor: dotColor,
            borderWidth: active ? 1.5 : 0,
            borderColor: "#fff",
          }}
        />
      )}
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: "800",
          color: active ? "#fff" : S.ink,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// CenterMarker is memoized so that selection/loading state changes in the
// parent screen don't force every marker to re-render. The custom equality
// only checks center.id + onSelect — if both are stable the marker re-uses
// its current snapshot.
//
// tracksViewChanges is true on mount so the map captures the rendered view,
// then flipped to false a beat after onLayout settles. Always-on tracking
// rerenders the bitmap on every frame which utterly kills map perf with 50+
// markers.
const CenterMarker = memo(
  function CenterMarker({
    center,
    onSelect,
  }: {
    center: CollectionCenter;
    onSelect: (c: CollectionCenter) => void;
  }) {
    const [tracksChanges, setTracksChanges] = useState(true);
    const settledRef = useRef(false);

    const handleLayout = useCallback(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      // Two animation frames + small delay so SVG actually rasterizes before
      // we freeze the snapshot.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => setTracksChanges(false), 80);
        });
      });
    }, []);

    const handlePress = useCallback(() => onSelect(center), [center, onSelect]);

    return (
      <Marker
        coordinate={{ latitude: center.lat, longitude: center.lon }}
        onPress={handlePress}
        anchor={{ x: 0.5, y: 0.5 }}
        centerOffset={{ x: 0, y: 0 }}
        tracksViewChanges={tracksChanges}
      >
        <View onLayout={handleLayout} collapsable={false}>
          <CollectionCenterMarker category={center.category} size={32} />
        </View>
      </Marker>
    );
  },
  (prev, next) =>
    prev.center.id === next.center.id && prev.onSelect === next.onSelect,
);

export function CollectionCentersScreen() {
  const insets = useSafeAreaInsets();
  const { active } = useCalendars();
  const mapRef = useRef<MapView>(null);

  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);
  const [loadedCenters, setLoadedCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CollectionCenter | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last region we actually fetched for, so we can skip refetches
  // when the user only nudges the map slightly.
  const lastFetchedRegionRef = useRef<Region | null>(null);

  // Active category filter — defaults to all 6 categories visible.
  const [activeCategories, setActiveCategories] = useState<Set<CenterCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const allSelected = activeCategories.size === ALL_CATEGORIES.length;

  const toggleCategory = useCallback((cat: CenterCategory) => {
    setActiveCategories((prev) => {
      // Tap-to-isolate: clicking a chip shows ONLY that category.
      // If the chip is already the only one active, tapping again resets
      // to all so the user always has a one-tap way back.
      if (prev.size === 1 && prev.has(cat)) {
        return new Set(ALL_CATEGORIES);
      }
      return new Set([cat]);
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    setActiveCategories(new Set(ALL_CATEGORIES));
  }, []);

  const locationLabel = active?.location || active?.municipality || "Current location";

  // Initial load: resolve location, set region, and fetch the first viewport.
  useEffect(() => {
    let cancelled = false;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    async function init() {
      setLoading(true);
      setError(null);
      setSelected(null);
      setLoadedCenters([]);

      try {
        let center: { lat: number; lon: number } | null = null;

        const locationQuery = active?.location || active?.municipality;
        if (locationQuery) {
          center = await geocodeLocation(locationQuery, signal);
        }

        if (!center) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            center = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          }
        }

        if (!center) {
          center = DEFAULT_CENTER;
        }

        if (cancelled) return;

        const region: Region = {
          latitude: center.lat,
          longitude: center.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setInitialRegion(region);
        setVisibleRegion(region);

        const bbox = regionToBbox(region);
        const data = await fetchCollectionCentersInBounds(bbox, signal);
        if (!cancelled) {
          setLoadedCenters(data);
          lastFetchedRegionRef.current = region;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collection centers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [active?.location, active?.municipality]);

  // Fetch new centers when the user pans/zooms, debounced and only when zoomed
  // in. The selected info card is intentionally NOT cleared here — small map
  // movements (or stray gesture cleanup) shouldn't dismiss what the user is
  // reading. The map's onPress handler still clears selection when the user
  // taps blank map.
  const handleRegionChangeComplete = (region: Region) => {
    setVisibleRegion(region);

    if (!isZoomedInEnough(region)) return;
    // Skip fetches for tiny pans / no-op zoom changes.
    if (!regionChangedEnough(lastFetchedRegionRef.current, region)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setLoading(true);
      try {
        const bbox = regionToBbox(region);
        const data = await fetchCollectionCentersInBounds(bbox, signal);
        if (!signal.aborted) {
          // Replace, don't merge. Keeping markers from old viewports just
          // bloats the map and forces Android to keep snapshotting unused
          // ones. The user sees what's in the current area; panning back
          // re-fetches (cheap, debounced).
          setLoadedCenters(data);
          lastFetchedRegionRef.current = region;
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load collection centers");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }, FETCH_DEBOUNCE_MS);
  };

  // Stable callbacks so memoized markers don't see new prop references on
  // every parent re-render.
  const handleMarkerSelect = useCallback((center: CollectionCenter) => {
    setSelected(center);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Location access is required to center the map on you.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    } catch {
      Alert.alert("Error", "Could not get your current location.");
    }
  };

  const openDirections = (center: CollectionCenter) => {
    const encoded = encodeURIComponent(`${center.lat},${center.lon}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open directions.");
    });
  };

  const visibleCenters = useMemo(() => {
    if (!visibleRegion) return [];
    const inViewport = loadedCenters.filter(
      (c) => centerInRegion(c, visibleRegion) && activeCategories.has(c.category),
    );
    return inViewport.slice(0, MAX_VISIBLE_MARKERS);
  }, [loadedCenters, visibleRegion, activeCategories]);

  const tooZoomedOut = visibleRegion ? !isZoomedInEnough(visibleRegion) : false;
  const hiddenCount = useMemo(() => {
    if (!visibleRegion) return 0;
    const inViewport = loadedCenters.filter(
      (c) => centerInRegion(c, visibleRegion) && activeCategories.has(c.category),
    );
    return Math.max(0, inViewport.length - MAX_VISIBLE_MARKERS);
  }, [loadedCenters, visibleRegion, activeCategories]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2F7" }}>
      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
        pointerEvents="box-none"
      >
        <View pointerEvents="none">
          <Text
            style={{
              fontSize: 34,
              fontWeight: "500",
              color: S.ink,
              letterSpacing: -0.8,
            }}
          >
            Collection{" "}
            <Text style={{ fontWeight: "800" }}>points</Text>
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: "700",
              color: S.sec,
              letterSpacing: 0.3,
              marginTop: 5,
            }}
          >
            {locationLabel.toUpperCase()}
          </Text>
        </View>
        <CircBtn size={44} onPress={handleRecenter}>
          <PinIcon color={S.ink} size={19} />
        </CircBtn>
      </View>

      {/* Category filter row */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 90,
          left: 0,
          right: 0,
          zIndex: 9,
        }}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingVertical: 4,
            gap: 8,
          }}
        >
          <CategoryChip
            active={allSelected}
            label="All"
            onPress={selectAllCategories}
          />
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              active={activeCategories.has(cat)}
              label={CATEGORY_LABELS[cat]}
              dotColor={CATEGORY_COLORS[cat]}
              onPress={() => toggleCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      {initialRegion && (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={handleMapPress}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          <UrlTile
            urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            maximumZ={19}
            tileSize={256}
            shouldReplaceMapContent
          />
          {visibleCenters.map((center) => (
            <CenterMarker
              key={center.id}
              center={center}
              onSelect={handleMarkerSelect}
            />
          ))}
        </MapView>
      )}

      {/* CARTO attribution */}
      <View
        style={{
          position: "absolute",
          bottom: Math.max(insets.bottom, 18) + 74,
          right: 14,
          backgroundColor: "rgba(255,255,255,0.85)",
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 6,
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 9, color: S.sec, fontWeight: "600" }}>
          © OpenStreetMap, © CARTO
        </Text>
      </View>

      {/* Loading overlay (only full-screen on first load) */}
      {loading && loadedCenters.length === 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(245,242,247,0.85)",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <ActivityIndicator size="large" color={S.ink} />
          <Text
            style={{
              marginTop: 12,
              fontSize: 14,
              fontWeight: "700",
              color: S.sec,
            }}
          >
            Loading collection centers…
          </Text>
        </View>
      )}

      {/* Error overlay */}
      {!loading && error && loadedCenters.length === 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(245,242,247,0.92)",
              alignItems: "center",
              justifyContent: "center",
              padding: 30,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: S.ink,
              textAlign: "center",
            }}
          >
            Couldn't load collection centers
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: S.sec,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Zoom hint */}
      {tooZoomedOut && !loading && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 140,
            alignSelf: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: "rgba(33,31,28,0.85)",
            borderRadius: 99,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }}>
            Zoom in to load collection centers
          </Text>
        </View>
      )}

      {/* Loading indicator for subsequent fetches */}
      {loading && loadedCenters.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 140,
            alignSelf: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 99,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <ActivityIndicator size="small" color={S.ink} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: S.ink }}>
            Updating map…
          </Text>
        </View>
      )}

      {/* Nearby count */}
      {visibleCenters.length > 0 && !tooZoomedOut && !loading && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 140,
            alignSelf: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 99,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: S.ink }}>
            {visibleCenters.length} place{visibleCenters.length === 1 ? "" : "s"} nearby
            {loadedCenters.length > visibleCenters.length
              ? ` · ${loadedCenters.length} loaded`
              : ""}
          </Text>
        </View>
      )}

      {/* Hidden count hint */}
      {hiddenCount > 0 && !tooZoomedOut && !loading && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 140,
            alignSelf: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 99,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: S.ink }}>
            {hiddenCount} more nearby — zoom in to see all
          </Text>
        </View>
      )}

      {/* Selected center card — stays visible during background fetches so
          the user doesn't lose their place when the map updates. */}
      {!error && selected && (
        <View
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 18) + 80,
            left: 18,
            right: 18,
            maxHeight: 320,
            padding: 18,
            backgroundColor: "#fff",
            borderRadius: 22,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 18,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CollectionCenterMarker category={selected.category} size={36} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: S.ink,
                  letterSpacing: -0.3,
                }}
              >
                {selected.name || "Collection point"}
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: S.sec,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {selected.recyclingType
                  ? selected.recyclingType.replace(/_/g, " ")
                  : selected.category.replace("centre", "recycling centre")}
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 12, maxHeight: 160 }}
          >
            {selected.operator && (
              <InfoRow label="Operator" value={selected.operator} />
            )}
            {selected.address && (
              <InfoRow label="Address" value={selected.address} />
            )}
            {selected.openingHours && (
              <InfoRow label="Opening hours" value={selected.openingHours} />
            )}
            {selected.description && (
              <InfoRow label="Details" value={selected.description} />
            )}
            <InfoRow label="Accepts" value={selected.materialsLabel} />
          </ScrollView>

          <Pressable
            onPress={() => openDirections(selected)}
            style={{
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 99,
              backgroundColor: S.ink,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: "#fff",
              }}
            >
              Directions
            </Text>
            <ArrowURIcon color="#fff" size={14} />
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && visibleCenters.length === 0 && !tooZoomedOut && !selected && (
        <View
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 18) + 80,
            left: 18,
            right: 18,
            padding: 18,
            backgroundColor: "#fff",
            borderRadius: 22,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 18,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: S.ink,
            }}
          >
            No collection centers in this area
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 13,
              color: S.sec,
            }}
          >
            Pan or zoom to explore another part of the map.
          </Text>
        </View>
      )}
    </View>
  );
}
