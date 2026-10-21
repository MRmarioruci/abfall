import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, UrlTile, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { useTheme } from "../theme/ThemeContext";
import { PinIcon } from "../components/icons/Icons";
import { CircBtn } from "../components/ui/CircBtn";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { PlaceCard } from "../components/map/PlaceCard";
import {
  CollectionCenterMarker,
  CATEGORY_COLORS,
} from "../components/CollectionCenterMarker";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";
import { geocodeLocation } from "../services/geocoding";
import { fetchCollectionCentersInBounds, type Bbox } from "../services/collectionCenters";
import * as mapCache from "../services/mapCache";
import type { CenterCategory, CollectionCenter } from "../types/collectionCenters";
import { FONT, TYPE } from "../theme/type";
import { haptics } from "../lib/haptics";

const ALL_CATEGORIES: CenterCategory[] = [
  "centre",
  "glass",
  "clothes",
  "plastic",
  "paper",
  "generic",
];

const CATEGORY_LABELS: Record<CenterCategory, StringKey> = {
  centre: "map.category.centre",
  glass: "map.category.glass",
  clothes: "map.category.clothes",
  plastic: "map.category.plastic",
  paper: "map.category.paper",
  generic: "map.category.generic",
};

// Known OSM recycling_type values → localized label. Anything else falls
// back to the raw tag value, prettified.
const RECYCLING_TYPE_LABELS: Record<string, StringKey> = {
  centre: "map.type.centre",
  container: "map.type.container",
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isZoomedInEnough(region: Region): boolean {
  return region.latitudeDelta <= MAX_LATITUDE_DELTA;
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
  const { S } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 99,
        backgroundColor: active ? S.ink : S.float,
        borderWidth: 1.5,
        borderColor: active ? S.ink : S.line,
        shadowColor: S.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {dotColor && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            backgroundColor: dotColor,
            borderWidth: active ? 1.5 : 0,
            borderColor: S.onInk,
          }}
        />
      )}
      <Text style={[TYPE.caption, { fontFamily: FONT.w800, color: active ? S.onInk : S.ink }]}>
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
    label,
    onSelect,
  }: {
    center: CollectionCenter;
    /** Read out by screen readers: name and kind of place. */
    label: string;
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
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View onLayout={handleLayout} collapsable={false}>
          <CollectionCenterMarker category={center.category} size={32} />
        </View>
      </Marker>
    );
  },
  (prev, next) =>
    prev.center.id === next.center.id &&
    prev.label === next.label &&
    prev.onSelect === next.onSelect,
);

type LatLon = { lat: number; lon: number };

// Straight-line distance, for the card's one line ("Container · 850 m").
function distanceLabel(from: LatLon, to: LatLon): string {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLon = rad(to.lon - from.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLon / 2) ** 2;
  const m = 2 * R * Math.asin(Math.sqrt(h));
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

const SHADOW = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 2,
} as const;

export function CollectionCentersScreen() {
  const { S, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, homeLocation } = useCalendars();
  const { t } = useT();
  const mapRef = useRef<MapView>(null);

  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);
  const [loadedCenters, setLoadedCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CollectionCenter | null>(null);
  // Bumped by "Try again" when the very first load failed, to re-run it.
  const [reloadNonce, setReloadNonce] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last region we actually fetched for, so we can skip refetches
  // when the user only nudges the map slightly.
  const lastFetchedRegionRef = useRef<Region | null>(null);
  // Which place the map is showing (cache key) and where it started.
  const cacheKeyRef = useRef("");
  const originRef = useRef<LatLon | null>(null);

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

  const locationQuery = active?.location || active?.municipality || homeLocation || "";
  const locationLabel = locationQuery || t("map.current_location");

  // Load the centres for one region: from the area cache when fresh, else
  // from Overpass. Any request still in flight is cancelled first.
  const fetchRegion = useCallback(
    async (region: Region) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      const apply = (data: CollectionCenter[]) => {
        // Replace, don't merge. Keeping markers from old viewports just
        // bloats the map and forces Android to keep snapshotting unused
        // ones. The user sees what's in the current area; panning back
        // re-fetches (cheap, debounced, and usually cached).
        setLoadedCenters(data);
        setError(null);
        lastFetchedRegionRef.current = region;
        if (originRef.current) {
          mapCache.saveView(cacheKeyRef.current, {
            origin: originRef.current,
            fetchedRegion: region,
            centers: data,
          });
        }
      };

      const cached = mapCache.getArea(region);
      if (cached) {
        apply(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchCollectionCentersInBounds(regionToBbox(region), signal);
        if (!signal.aborted) {
          mapCache.setArea(region, data);
          apply(data);
        }
      } catch (err) {
        if (!signal.aborted) {
          console.warn("[CollectionCenters] load failed:", err instanceof Error ? err.message : err);
          setError(t("map.error_body"));
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [t],
  );

  // Initial load: resolve location, set region, and fetch the first viewport.
  // A fresh cached view for the same place restores instantly instead.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    const key = mapCache.placeKey(locationQuery);
    cacheKeyRef.current = key;

    setError(null);
    setSelected(null);

    const show = (region: Region) => {
      setInitialRegion(region);
      setVisibleRegion(region);
      // initialRegion only applies on mount; move an already-mounted map.
      mapRef.current?.animateToRegion(region, 0);
    };

    const view = mapCache.getView(key);
    if (view) {
      originRef.current = view.origin;
      lastFetchedRegionRef.current = view.fetchedRegion;
      setLoadedCenters(view.centers);
      show(view.region);
      if (!view.fetchedRegion && isZoomedInEnough(view.region)) {
        fetchRegion(view.region);
      } else {
        setLoading(false);
      }
    } else {
      (async () => {
        setLoading(true);
        setLoadedCenters([]);
        lastFetchedRegionRef.current = null;
        originRef.current = null;
        try {
          let center: LatLon | null = mapCache.getOrigin(key);
          let cacheable = true;

          if (!center && locationQuery) {
            const found = await geocodeLocation(locationQuery, signal);
            if (found) center = { lat: found.lat, lon: found.lon };
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
            // Don't remember the fallback; try for a real place next time.
            cacheable = false;
          }

          if (cancelled) return;
          if (cacheable) mapCache.setOrigin(key, center);
          originRef.current = center;

          const region: Region = {
            latitude: center.lat,
            longitude: center.lon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          show(region);
          await fetchRegion(region);
        } catch (err) {
          if (!cancelled) {
            console.warn("[CollectionCenters] load failed:", err instanceof Error ? err.message : err);
            setError(t("map.error_body"));
            setLoading(false);
          }
        }
      })();
    }

    return () => {
      cancelled = true;
      controller.abort();
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationQuery, reloadNonce]);

  // Fetch new centers when the user pans/zooms, debounced and only when zoomed
  // in. The selected info card is intentionally NOT cleared here — small map
  // movements (or stray gesture cleanup) shouldn't dismiss what the user is
  // reading. The map's onPress handler still clears selection when the user
  // taps blank map.
  const handleRegionChangeComplete = (region: Region) => {
    setVisibleRegion(region);
    // Remember where the user is looking, so coming back restores it.
    if (originRef.current) {
      mapCache.saveView(cacheKeyRef.current, { origin: originRef.current, region });
    }

    if (!isZoomedInEnough(region)) return;
    // Skip fetches for tiny pans / no-op zoom changes.
    if (!regionChangedEnough(lastFetchedRegionRef.current, region)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRegion(region), FETCH_DEBOUNCE_MS);
  };

  // "Try again" re-runs whichever load failed: the first one (no map yet)
  // or the current viewport.
  const retry = () => {
    setError(null);
    const region = visibleRegion ?? initialRegion;
    if (!region || !originRef.current) {
      setReloadNonce((n) => n + 1);
    } else if (isZoomedInEnough(region)) {
      fetchRegion(region);
    }
  };

  // Stable callbacks so memoized markers don't see new prop references on
  // every parent re-render.
  const handleMarkerSelect = useCallback((center: CollectionCenter) => {
    haptics.select();
    setSelected(center);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.permission_needed"), t("map.alert.location_required"));
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
      Alert.alert(t("map.alert.error_title"), t("map.alert.location_failed"));
    }
  };

  const openDirections = useCallback(
    (center: CollectionCenter) => {
      const encoded = encodeURIComponent(`${center.lat},${center.lon}`);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(t("map.alert.error_title"), t("map.alert.directions_failed"));
      });
    },
    [t],
  );

  const typeLabel = useCallback(
    (c: CollectionCenter) =>
      c.recyclingType
        ? RECYCLING_TYPE_LABELS[c.recyclingType]
          ? t(RECYCLING_TYPE_LABELS[c.recyclingType])
          : capitalize(c.recyclingType.replace(/_/g, " "))
        : c.category === "centre"
          ? t("map.type.centre")
          : t(CATEGORY_LABELS[c.category]),
    [t],
  );

  const { visibleCenters, hiddenCount } = useMemo(() => {
    if (!visibleRegion) return { visibleCenters: [], hiddenCount: 0 };
    const inViewport = loadedCenters.filter(
      (c) => centerInRegion(c, visibleRegion) && activeCategories.has(c.category),
    );
    return {
      visibleCenters: inViewport.slice(0, MAX_VISIBLE_MARKERS),
      hiddenCount: Math.max(0, inViewport.length - MAX_VISIBLE_MARKERS),
    };
  }, [loadedCenters, visibleRegion, activeCategories]);

  const tooZoomedOut = visibleRegion ? !isZoomedInEnough(visibleRegion) : false;

  // One status pill at the top, showing whichever message matters most.
  const status: { text: string; busy?: boolean } | null = loading
    ? { text: loadedCenters.length > 0 ? t("map.updating") : t("map.loading"), busy: true }
    : error
      ? null
      : tooZoomedOut
        ? { text: t("map.zoom_hint") }
        : hiddenCount > 0
          ? { text: t("map.hidden_more", { n: hiddenCount }) }
          : visibleCenters.length > 0
            ? {
                text:
                  (visibleCenters.length === 1
                    ? t("map.nearby_one")
                    : t("map.nearby_other", { n: visibleCenters.length })) +
                  (loadedCenters.length > visibleCenters.length
                    ? ` · ${t("map.loaded", { n: loadedCenters.length })}`
                    : ""),
              }
            : null;

  const showError = !loading && !!error && visibleCenters.length === 0;
  const showEmpty = !loading && !error && !!initialRegion && visibleCenters.length === 0 && !tooZoomedOut && !selected;
  const cardBottom = Math.max(insets.bottom, 18) + 80;

  const selectedSubtitle = selected
    ? [typeLabel(selected), originRef.current && distanceLabel(originRef.current, selected)]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: S.sheet }}>
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
        <View pointerEvents="none" style={{ flex: 1, marginRight: 12 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 34,
              fontFamily: FONT.w500,
              color: S.ink,
              letterSpacing: -0.8,
            }}
          >
            {t("map.title_lead")}{" "}
            <Text style={{ fontFamily: FONT.w800 }}>{t("map.title_bold")}</Text>
          </Text>
          <Text style={[TYPE.caption, { color: S.sec, marginTop: 4 }]} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
        <CircBtn size={44} onPress={handleRecenter} accessibilityLabel={t("map.current_location")}>
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
            label={t("map.category.all")}
            onPress={selectAllCategories}
          />
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              active={activeCategories.has(cat)}
              label={t(CATEGORY_LABELS[cat])}
              dotColor={CATEGORY_COLORS[cat]}
              onPress={() => toggleCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Map, or a calm placeholder while we work out where to centre it */}
      {initialRegion ? (
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
            // CARTO Voyager by day, Dark Matter in dark mode.
            key={isDark ? "dark" : "light"}
            urlTemplate={
              isDark
                ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                : "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            }
            maximumZ={19}
            tileSize={256}
            shouldReplaceMapContent
          />
          {visibleCenters.map((center) => (
            <CenterMarker
              key={center.id}
              center={center}
              label={`${center.name || t("map.default_name")}, ${typeLabel(center)}`}
              onSelect={handleMarkerSelect}
            />
          ))}
        </MapView>
      ) : (
        loading && (
          <Skeleton
            style={{
              position: "absolute",
              top: insets.top + 140,
              left: 14,
              right: 14,
              bottom: cardBottom,
              borderRadius: 28,
            }}
          />
        )
      )}

      {/* CARTO attribution */}
      <View
        style={{
          position: "absolute",
          bottom: Math.max(insets.bottom, 18) + 74,
          right: 14,
          backgroundColor: S.float,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 6,
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 9, color: S.sec, fontFamily: FONT.w600 }}>
          © OpenStreetMap, © CARTO
        </Text>
      </View>

      {/* Status: loading, zoom hint, hidden count or nearby count */}
      {status && (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            top: insets.top + 140,
            alignSelf: "center",
            maxWidth: "88%",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: S.float,
            borderRadius: 99,
            shadowColor: S.shadow,
            ...SHADOW,
          }}
        >
          {status.busy && <ActivityIndicator size="small" color={S.ink} />}
          <Text style={[TYPE.caption, { color: S.ink }]} numberOfLines={1}>
            {status.text}
          </Text>
        </View>
      )}

      {/* Error: one line and a way to try again */}
      {showError && (
        <View style={{ position: "absolute", left: 14, right: 14, bottom: cardBottom }}>
          <EmptyState
            title={t("map.error_title")}
            subtitle={error ?? undefined}
            bg={S.card}
            action={{ label: t("common.try_again"), onPress: retry }}
          />
        </View>
      )}

      {/* Selected place — stays visible during background fetches so the
          user doesn't lose their place when the map updates. */}
      <PlaceCard
        center={showError ? null : selected}
        subtitle={selectedSubtitle}
        bottom={cardBottom}
        t={t}
        closeLabel={t("map.close")}
        onClose={handleMapPress}
        onDirections={openDirections}
      />

      {/* Empty state */}
      {showEmpty && (
        <View
          style={{
            position: "absolute",
            bottom: cardBottom,
            left: 14,
            right: 14,
            padding: 18,
            backgroundColor: S.card,
            borderRadius: 24,
            shadowColor: S.shadow,
            ...SHADOW,
          }}
        >
          <Text style={[TYPE.label, { color: S.ink }]}>{t("map.empty_title")}</Text>
          <Text style={[TYPE.caption, { color: S.sec, marginTop: 4 }]}>{t("map.empty_body")}</Text>
        </View>
      )}
    </View>
  );
}
