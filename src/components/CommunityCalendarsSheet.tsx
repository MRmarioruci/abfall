// Sheet for browsing community-shared calendars.
//
// UX: when the user opens this sheet we already know where they are
// (the active calendar carries their municipality + canton). So we
// show "Calendars near [city]" as a header chip and fire the search
// immediately. They can tap the chip to edit the location and re-search.
//
// All network calls live in src/services/api.ts. Until the backend has
// data, the sheet surfaces an empty-results message.

import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader, SoftCard } from "./ui/sheet";
import { BrowseArt } from "./art/Art";
import { StreamGlyph } from "./icons/StreamGlyph";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import {
  BackIcon,
  SearchIcon,
  PinIcon,
  ScanIcon,
  UserIcon,
} from "./icons/Icons";
import {
  searchCommunityCalendars,
  getCommunityCalendar,
  markCommunityCalendarUsed,
  type CommunityCalendarDetail,
  reportCommunityCalendar,
  ApiError,
  type CommunityCalendarSummary,
} from "../services/api";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { communityToSaved } from "../services/communityImport";
import { ConfirmSheet } from "./ConfirmSheet";
import { addReportedId, getReportedIds } from "../services/reported";
import type { SavedCalendar } from "../types/calendar";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";
import { FONT } from "../theme/type";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fired when the user wants to scan their own calendar instead.
   *  Parent should close this sheet and open the scan flow. */
  onScanCalendar?: () => void;
}

const DEFAULT_COUNTRY = "CH";

/**
 * Pull a (city, region) pair out of whatever the active calendar has
 * available. Order of preference:
 *   1. structured `municipality` + `canton` fields (set during scan/import)
 *   2. parsed `location` free-text ("Schlieren, ZH" → city + region)
 *
 * Reason: the location pill on the home screen only writes the free-text
 * `location` field; the structured fields stay at whatever scan/import
 * set them to. Either alone misses one of the user flows.
 */
function deriveSearchLocation(
  active: SavedCalendar | undefined,
  homeLocation: string | undefined,
): {
  city: string;
  region: string;
} {
  let city = active?.municipality?.trim() ?? "";
  let region = active?.canton?.trim() ?? "";
  // No calendar yet: fall back to the location set on the empty Home screen.
  const location = active ? active.location : homeLocation;
  if ((!city || !region) && location) {
    const parts = location
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!city && parts[0]) city = parts[0];
    if (!region && parts[1]) region = parts[1];
  }
  return { city, region };
}

export function CommunityCalendarsSheet({ visible, onClose, onScanCalendar }: Props) {
  const insets = useSafeAreaInsets();
  const { active, addCalendar, homeLocation } = useCalendars();
  const toast = useToast();
  const { t } = useT();

  // ONE search box. Seeded from the active calendar's location so the
  // first thing the user sees is "what's near me", but they can clear
  // it and type anything (title fragment, region, neighboring city).
  // The server does fuzzy ilike across title/city/region, and we always
  // fall back to country-wide on zero hits so the sheet never feels empty.
  const [query, setQuery] = useState("");

  const [results, setResults] = useState<CommunityCalendarSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  // Stored as a key / raw query so the text re-renders on a language switch.
  const [searchError, setSearchError] = useState<StringKey | null>(null);
  const [fallbackQuery, setFallbackQuery] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Tracks whether the current results came from a free-text q or from
  // the country-wide fallback, so pagination keeps paginating the same set.
  const lastQuery = useRef<{ q?: string }>({});
  // Each search bumps this; responses from an older search are dropped so
  // a slow request can't overwrite the results of a newer one.
  const searchSeq = useRef(0);
  // The query the last search ran with, so the debounce doesn't repeat
  // the initial auto-search when it fills the box.
  const lastSearched = useRef<string | null>(null);

  // Preview screen state.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);

  // Calendars this device reported stay out of its results.
  const [reported, setReported] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (visible) getReportedIds().then(setReported);
  }, [visible]);
  const visibleResults = results?.filter((r) => !reported.has(r.id)) ?? null;

  const handleReport = async (id: string) => {
    try {
      await reportCommunityCalendar(id, "user_report");
    } catch (err) {
      console.warn("[community] report failed:", err);
      toast.show(t("community.toast.report_failed"), { variant: "error" });
      return;
    }
    await addReportedId(id).catch(() => {});
    setReported((prev) => new Set(prev).add(id));
    setPreviewId(null);
    toast.show(t("community.toast.reported"));
  };

  // Auto-fill the search box from the active calendar's location on open
  // and fire the initial search. searchGuard prevents double-firing on
  // re-renders of `active`.
  const searchGuard = useRef(false);
  useEffect(() => {
    if (!visible) {
      searchGuard.current = false;
      searchSeq.current++;
      lastSearched.current = null;
      setResults(null);
      setSearchError(null);
      setFallbackQuery(null);
      setNextCursor(null);
      setPreviewId(null);
      return;
    }
    if (searchGuard.current) return;
    const { city: initCity } = deriveSearchLocation(active, homeLocation);
    setQuery(initCity);
    searchGuard.current = true;
    runSearch(initCity);
  }, [visible, active?.municipality, active?.canton, active?.location, homeLocation]);

  // Debounced live search — runs ~350ms after the user stops typing.
  // Doesn't fire on the initial mount (auto-search already handled).
  useEffect(() => {
    if (!visible || !searchGuard.current) return;
    if (query.trim() === lastSearched.current) return;
    const timer = setTimeout(() => {
      runSearch(query);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, visible]);

  const runSearch = async (queryValue: string) => {
    // Server caps q at 80 chars and rejects longer queries outright.
    const trimmed = queryValue.trim().slice(0, 80);
    const seq = ++searchSeq.current;
    const stale = () => seq !== searchSeq.current;
    lastSearched.current = queryValue.trim();
    setSearching(true);
    setSearchError(null);
    setResults(null);
    setFallbackQuery(null);
    setNextCursor(null);
    try {
      // Pass 1: fuzzy match on the single query string. Server ilike-ORs
      // across title, city, and region — so any one of those substrings
      // hits.
      if (trimmed) {
        const matched = await searchCommunityCalendars({
          country: DEFAULT_COUNTRY,
          q: trimmed,
        });
        if (stale()) return;
        if (matched.results.length > 0) {
          setResults(matched.results);
          setNextCursor(matched.nextCursor);
          lastQuery.current = { q: trimmed };
          return;
        }
      }

      // Pass 2: country-wide. Always falls back so the sheet never feels
      // empty — better to show "here's everything in CH" than a brick
      // wall. Banner is shown only when the user typed a non-matching query.
      const countryWide = await searchCommunityCalendars({
        country: DEFAULT_COUNTRY,
      });
      if (stale()) return;
      if (countryWide.results.length > 0) {
        setResults(countryWide.results);
        setNextCursor(countryWide.nextCursor);
        lastQuery.current = {};
        if (trimmed) {
          setFallbackQuery(trimmed);
        }
        return;
      }

      // Truly empty database — nothing shared anywhere yet.
      setSearchError("community.empty");
    } catch (err) {
      if (stale()) return;
      // Details go to the log; users get something they can act on.
      console.warn("[community] search failed:", err);
      if (err instanceof ApiError) {
        setSearchError(
          err.status === 429
            ? "community.error.rate_limited"
            : "community.error.unavailable",
        );
      } else {
        setSearchError("community.error.offline");
      }
    } finally {
      if (!stale()) setSearching(false);
    }
  };

  // Pagination — appends the next 20 results without resetting the list.
  // Reuses whichever filter set produced the current results (city,
  // region, or country-wide) so we keep paginating the same slice.
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const seq = searchSeq.current;
    setLoadingMore(true);
    try {
      const page = await searchCommunityCalendars({
        country: DEFAULT_COUNTRY,
        q: lastQuery.current.q,
        after: nextCursor,
      });
      // A new search started meanwhile; this page belongs to the old list.
      if (seq !== searchSeq.current) return;
      setResults((prev) => [...(prev ?? []), ...page.results]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      console.warn("[community] load more failed:", err);
      toast.show(t("community.toast.load_more_failed"), { variant: "error" });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenPreview = (id: string) => setPreviewId(id);

  const handleImport = async (community: CommunityCalendarSummary) => {
    setImporting(true);
    try {
      const detail = await getCommunityCalendar(community.id);
      if (!detail) {
        toast.show(t("community.toast.unavailable"));
        return;
      }
      const local = communityToSaved(detail);
      await addCalendar(local);
      markCommunityCalendarUsed(detail.id);
      toast.show(t("community.toast.imported"));
      onClose();
    } catch {
      toast.show(t("community.toast.import_failed"), { variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  // ── Preview screen ───────────────────────────────────────────────────
  // A new search can refresh the previewed row away; bounce back to the list.
  const previewSummary = previewId ? results?.find((r) => r.id === previewId) : undefined;
  useEffect(() => {
    if (previewId && !previewSummary) setPreviewId(null);
  }, [previewId, previewSummary]);

  if (previewSummary) {
    const summary = previewSummary;
    return (
      <>
        <SlideUpSheet visible={visible} onClose={onClose}>
          <PreviewBody
            summary={summary}
            insetsBottom={insets.bottom}
            onBack={() => setPreviewId(null)}
            onImport={() => handleImport(summary)}
            onReport={() => setConfirmReport(true)}
            importing={importing}
          />
        </SlideUpSheet>
        <ConfirmSheet
          visible={confirmReport}
          onClose={() => setConfirmReport(false)}
          title={t("community.report.title")}
          body={t("community.report.body")}
          confirmLabel={t("community.report.label")}
          variant="danger"
          onConfirm={() => handleReport(summary.id)}
        />
      </>
    );
  }

  // ── Search screen ────────────────────────────────────────────────────

  const scanInstead = onScanCalendar
    ? () => {
        onClose();
        onScanCalendar();
      }
    : undefined;

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        <SheetHeader title={t("community.title")} subtitle={t("community.subtitle")} />

        {/* Single search field — searches title, city, AND region with
            fuzzy ilike. Auto-filled from the active calendar so the
            first thing the user sees is local results; they can edit or
            clear to find anything. Debounced live search re-runs as
            they type. */}
        <View style={{ marginBottom: 14 }}>
          <SearchField
            placeholder={t("community.search_placeholder")}
            value={query}
            onChange={setQuery}
            onSubmit={() => runSearch(query)}
          />
        </View>

        {/* Search status / results */}
        <View style={{ marginBottom: Math.max(insets.bottom, 8) }}>
          {searching && !results && (
            <View style={{ paddingVertical: 36, alignItems: "center", justifyContent: "center", gap: 10 }}>
              <ActivityIndicator size="small" color={ST.papier.ink} />
              <Text style={{ fontSize: 14, color: S.sec, fontFamily: FONT.w700 }}>{t("community.searching")}</Text>
            </View>
          )}

          {/* Empty / error: one picture, one line, one button. */}
          {searchError && !searching && (
            <SoftCard bg={ST.papier.soft} style={{ alignItems: "center", paddingVertical: 22 }}>
              <BrowseArt />
              <Text
                style={{
                  fontSize: 15,
                  color: ST.papier.ink,
                  fontFamily: FONT.w700,
                  lineHeight: 21,
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 6,
                }}
              >
                {t(searchError)}
              </Text>
              {scanInstead && (
                <PillButton
                  label={t("community.scan_instead")}
                  icon={<ScanIcon color="#fff" size={17} />}
                  onPress={scanInstead}
                  style={{ alignSelf: "stretch", marginTop: 18 }}
                />
              )}
            </SoftCard>
          )}

          {visibleResults && visibleResults.length > 0 && (
            <>
              {fallbackQuery && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    borderRadius: 18,
                    backgroundColor: ST.karton.soft,
                    marginBottom: 12,
                  }}
                >
                  <PinIcon color={ST.karton.ink} size={14} />
                  <Text style={{ flex: 1, fontSize: 13, color: ST.karton.ink, fontFamily: FONT.w700, lineHeight: 18 }}>
                    {t("community.no_match", { q: fallbackQuery, country: DEFAULT_COUNTRY })}
                  </Text>
                </View>
              )}
              <ScrollView
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ gap: 10, paddingBottom: 2 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {visibleResults.map((r) => (
                  <ResultRow key={r.id} item={r} onPress={() => handleOpenPreview(r.id)} />
                ))}

                {/* Show-more — only when the server gave us a cursor for
                    more rows. Tap loads the next 20 and appends. */}
                {nextCursor && (
                  <PillButton
                    label={loadingMore ? t("community.loading") : t("community.show_more")}
                    variant="secondary"
                    onPress={handleLoadMore}
                    loading={loadingMore}
                    style={{ marginTop: 4, height: 48 }}
                  />
                )}
              </ScrollView>

              {/* Gentle escape hatch when the results don't have theirs. */}
              {scanInstead && <QuietButton label={t("community.scan_own")} onPress={scanInstead} />}
            </>
          )}
        </View>
      </View>
    </SlideUpSheet>
  );
}

// ─── colour per calendar ───────────────────────────────────────────────

// Rows show the calendar's waste types as dots when the server sends them;
// otherwise (older servers) each place gets a stable palette colour and
// its initial, so the list still reads as distinct cards at a glance.
const ROW_TINTS: WasteStreamId[] = ["papier", "gruengut", "karton", "kehricht", "glas", "textilien", "metall", "verpackung"];

function tintFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ST[ROW_TINTS[Math.abs(h) % ROW_TINTS.length]];
}

const MAX_ROW_DOTS = 6;

/** Known stream ids from a summary's `types`, in app order; null when absent. */
function rowTypes(item: CommunityCalendarSummary): WasteStreamId[] | null {
  if (!item.types?.length) return null;
  const ids = STREAM_ORDER.filter((id) => item.types!.includes(id));
  return ids.length > 0 ? ids.slice(0, MAX_ROW_DOTS) : null;
}

function placeLine(item: CommunityCalendarSummary) {
  const place = item.region ? `${item.city}, ${item.region}` : item.city;
  return `${place} · ${item.year}`;
}

// ─── result row ────────────────────────────────────────────────────────

function ResultRow({
  item,
  onPress,
}: {
  item: CommunityCalendarSummary;
  onPress: () => void;
}) {
  const { t } = useT();
  const tint = tintFor(item.city || item.id);
  const initial = item.city?.trim().charAt(0).toUpperCase() || "·";
  const dots = rowTypes(item);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${placeLine(item)}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 68,
        backgroundColor: "#fff",
        borderRadius: 22,
        paddingVertical: 12,
        paddingHorizontal: 14,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 15,
          backgroundColor: dots ? S.bg : tint.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dots ? (
          <View
            style={{
              width: dots.length > 4 ? 35 : 22, // 3 or 2 dots per row
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {dots.map((id) => (
              <View key={id} style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: ST[id].c }} />
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 18, fontFamily: FONT.w800, color: tint.ink }}>{initial}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.2 }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, color: S.sec, fontFamily: FONT.w600, marginTop: 2 }} numberOfLines={1}>
          {placeLine(item)}
        </Text>
      </View>
      {item.usesCount > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 99,
            backgroundColor: ST.gruengut.soft,
          }}
        >
          <UserIcon color={ST.gruengut.ink} size={12} />
          <Text style={{ fontSize: 12.5, fontFamily: FONT.w800, color: ST.gruengut.ink }}>
            {t(item.usesCount === 1 ? "community.uses_one" : "community.uses_other", { n: item.usesCount })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── preview ───────────────────────────────────────────────────────────

function PreviewBody({
  summary,
  insetsBottom,
  onBack,
  onImport,
  onReport,
  importing,
}: {
  summary: CommunityCalendarSummary;
  insetsBottom: number;
  onBack: () => void;
  onImport: () => void;
  onReport: () => void;
  importing: boolean;
}) {
  const { t, wasteLabel } = useT();
  const tint = tintFor(summary.city || summary.id);

  // Display only: read the calendar's events to show which waste types it
  // covers. Import still fetches its own copy; a failure here just leaves
  // the chips out.
  const [types, setTypes] = useState<WasteStreamId[] | null>(null);
  useEffect(() => {
    let alive = true;
    setTypes(null);
    getCommunityCalendar(summary.id)
      .then((detail: CommunityCalendarDetail | null) => {
        if (!alive || !detail) return;
        const present = new Set(detail.events.map((e) => e.type));
        setTypes(STREAM_ORDER.filter((id) => present.has(id)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [summary.id]);

  const subtitle = [
    placeLine(summary),
    summary.half ? t("community.preview.half", { n: summary.half }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const facts: { key: string; icon?: React.ReactNode; label: string }[] = [];
  if (summary.zones.length > 0) {
    facts.push({ key: "zones", icon: <PinIcon color={tint.ink} size={12} />, label: summary.zones.join(", ") });
  }
  if (summary.usesCount > 0) {
    facts.push({
      key: "uses",
      icon: <UserIcon color={tint.ink} size={12} />,
      label: t(summary.usesCount === 1 ? "community.uses_one" : "community.uses_other", { n: summary.usesCount }),
    });
  }
  if (summary.sharedByName) {
    facts.push({ key: "by", label: t("community.by", { name: summary.sharedByName }) });
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("community.back")}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 99,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <BackIcon color={S.ink} size={18} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <SheetHeader title={summary.title} subtitle={subtitle} />
        </View>
      </View>

      {/* What it collects, as colour: one chip per waste type. */}
      <SoftCard bg={tint.soft} style={{ marginBottom: 16, minHeight: 112, justifyContent: "center" }}>
        {types === null ? (
          <ActivityIndicator size="small" color={tint.ink} />
        ) : types.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {types.map((id) => (
              <View
                key={id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  paddingLeft: 5,
                  paddingRight: 12,
                  paddingVertical: 5,
                  borderRadius: 99,
                  backgroundColor: "#fff",
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    backgroundColor: ST[id].c,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={id} size={16} />
                </View>
                <Text style={{ fontSize: 13.5, fontFamily: FONT.w800, color: S.ink }}>{wasteLabel(id)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {facts.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: types && types.length > 0 ? 14 : 0 }}>
            {facts.map((f) => (
              <View
                key={f.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 99,
                  backgroundColor: "rgba(255,255,255,0.55)",
                  maxWidth: "100%",
                }}
              >
                {f.icon}
                <Text style={{ fontSize: 12.5, fontFamily: FONT.w700, color: tint.ink }} numberOfLines={1}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SoftCard>

      <PillButton
        label={importing ? t("community.importing") : t("community.use")}
        onPress={onImport}
        loading={importing}
      />

      <View style={{ marginBottom: Math.max(insetsBottom, 8) }}>
        <QuietButton label={t("community.report_link")} onPress={onReport} />
      </View>
    </View>
  );
}

// ─── small input ───────────────────────────────────────────────────────

function SearchField({
  placeholder,
  value,
  onChange,
  onSubmit,
  autoFocus,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 52,
        backgroundColor: "#fff",
        borderRadius: 99,
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      <SearchIcon color={S.sec} size={17} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={S.ter}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={{
          flex: 1,
          paddingVertical: 12,
          fontSize: 16,
          color: S.ink,
          fontFamily: FONT.w700,
        }}
      />
    </View>
  );
}
