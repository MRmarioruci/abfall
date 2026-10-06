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
import { S, ST } from "../theme/colors";
import {
  BackIcon,
  SearchIcon,
  ChevRIcon,
  GlobeIcon,
  CheckIcon,
  PinIcon,
  ScanIcon,
} from "./icons/Icons";
import {
  searchCommunityCalendars,
  getCommunityCalendar,
  markCommunityCalendarUsed,
  reportCommunityCalendar,
  ApiError,
  type CommunityCalendarSummary,
} from "../services/api";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { communityToSaved } from "../services/communityImport";
import { Recyclops } from "./Recyclops";
import { ConfirmSheet } from "./ConfirmSheet";
import { addReportedId, getReportedIds } from "../services/reported";
import type { SavedCalendar } from "../types/calendar";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";

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
function deriveSearchLocation(active: SavedCalendar | undefined): {
  city: string;
  region: string;
} {
  if (!active) return { city: "", region: "" };
  let city = active.municipality?.trim() ?? "";
  let region = active.canton?.trim() ?? "";
  if ((!city || !region) && active.location) {
    const parts = active.location
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
  const { active, addCalendar } = useCalendars();
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
      toast.show(t("community.toast.report_failed"));
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
    const { city: initCity } = deriveSearchLocation(active);
    setQuery(initCity);
    searchGuard.current = true;
    runSearch(initCity);
  }, [visible, active?.municipality, active?.canton, active?.location]);

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
      toast.show(t("community.toast.load_more_failed"));
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
      toast.show(t("community.toast.import_failed"));
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

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: ST.papier.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GlobeIcon color={ST.papier.ink} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: S.ink, letterSpacing: -0.5 }}>
              {t("community.title")}
            </Text>
            <Text style={{ fontSize: 12.5, color: S.sec, fontWeight: "600", marginTop: 1 }}>
              {t("community.subtitle")}
            </Text>
          </View>
        </View>

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
            <View
              style={{
                paddingVertical: 32,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <ActivityIndicator size="small" color={S.sec} />
              <Text style={{ fontSize: 13, color: S.sec, fontWeight: "600" }}>
                {t("community.searching")}
              </Text>
            </View>
          )}

          {searchError && !searching && (
            <View
              style={{
                padding: 18,
                paddingTop: 22,
                borderRadius: 18,
                backgroundColor: "#F4EFEA",
                gap: 14,
                alignItems: "center",
              }}
            >
              <Recyclops size={96} />
              <Text
                style={{
                  fontSize: 13.5,
                  color: S.sec,
                  fontWeight: "600",
                  lineHeight: 19,
                  textAlign: "center",
                }}
              >
                {t(searchError)}
              </Text>
              {onScanCalendar && (
                <Pressable
                  onPress={() => {
                    onClose();
                    onScanCalendar();
                  }}
                  style={{
                    alignSelf: "stretch",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 13,
                    borderRadius: 99,
                    backgroundColor: S.ink,
                    shadowColor: S.ink,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 14,
                    elevation: 4,
                  }}
                >
                  <ScanIcon color="#fff" size={15} />
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: -0.2 }}>
                    {t("community.scan_instead")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {visibleResults && visibleResults.length > 0 && (
            <>
              {fallbackQuery && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: ST.papier.soft,
                    marginBottom: 10,
                  }}
                >
                  <PinIcon color={ST.papier.ink} size={13} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: ST.papier.ink,
                      fontWeight: "700",
                      lineHeight: 17,
                    }}
                  >
                    {t("community.no_match", { q: fallbackQuery, country: DEFAULT_COUNTRY })}
                  </Text>
                </View>
              )}
              <ScrollView
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ gap: 10 }}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                {visibleResults.map((r) => (
                  <ResultRow key={r.id} item={r} onPress={() => handleOpenPreview(r.id)} />
                ))}

                {/* Show-more button — only when the server gave us a
                    cursor for more rows. Tap loads the next 20 and
                    appends. */}
                {nextCursor && (
                  <Pressable
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 12,
                      borderRadius: 99,
                      backgroundColor: "#fff",
                      borderWidth: 1.5,
                      borderColor: S.line,
                      marginTop: 4,
                      opacity: loadingMore ? 0.7 : 1,
                    }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={S.sec} />
                    ) : (
                      <ChevRIcon color={S.sec} size={12} />
                    )}
                    <Text style={{ fontSize: 13, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }}>
                      {loadingMore ? t("community.loading") : t("community.show_more")}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>

              {/* Soft footer — gentle escape hatch when the user
                  doesn't see what they want in the results. */}
              {onScanCalendar && (
                <Pressable
                  onPress={() => {
                    onClose();
                    onScanCalendar();
                  }}
                  hitSlop={6}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 14,
                    marginTop: 4,
                  }}
                >
                  <ScanIcon color={S.sec} size={13} />
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "700",
                      color: S.sec,
                      letterSpacing: -0.1,
                    }}
                  >
                    {t("community.scan_own")}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </SlideUpSheet>
  );
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
  const initial = item.sharedByName?.charAt(0).toUpperCase() ?? "·";
  const meta = [
    item.region ? `${item.year} · ${item.region}` : String(item.year),
    item.usesCount > 0
      ? t(item.usesCount === 1 ? "community.uses_one" : "community.uses_other", { n: item.usesCount })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        paddingRight: 12,
        shadowColor: "rgb(150,118,96)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 99,
          backgroundColor: ST.gruengut.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "800", color: ST.gruengut.ink }}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={{ fontSize: 11.5, color: S.sec, fontWeight: "600", marginTop: 1 }}>
          {meta}
          {item.sharedByName ? ` · ${t("community.by", { name: item.sharedByName })}` : ""}
        </Text>
      </View>
      <ChevRIcon color={S.ter} size={12} />
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
  const { t } = useT();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityLabel={t("community.back")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 99,
            backgroundColor: "#F4EFEA",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BackIcon color={S.ink} size={18} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: "800", color: S.ink, letterSpacing: -0.5 }}>
          {summary.city}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 22,
          padding: 18,
          marginBottom: 18,
          shadowColor: "rgb(150,118,96)",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 3,
        }}
      >
        <PreviewRow label={t("community.preview.title")} value={summary.title} />
        <PreviewRow
          label={t("community.preview.year")}
          value={
            String(summary.year) +
            (summary.half ? ` · ${t("community.preview.half", { n: summary.half })}` : "")
          }
        />
        <PreviewRow label={t("community.preview.region")} value={summary.region ?? "—"} />
        <PreviewRow
          label={t("community.preview.zones")}
          value={summary.zones.join(", ") || t("community.preview.zones_all")}
        />
        <PreviewRow label={t("community.preview.language")} value={summary.sourceLanguage ?? "—"} />
        <PreviewRow
          label={t("community.preview.shared_by")}
          value={summary.sharedByName ?? t("community.preview.anonymous")}
        />
        <PreviewRow label={t("community.preview.uses")} value={String(summary.usesCount)} last />
      </View>

      <Pressable
        onPress={onImport}
        disabled={importing}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: S.ink,
          borderRadius: 99,
          paddingVertical: 15,
          opacity: importing ? 0.7 : 1,
          shadowColor: S.ink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        {importing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <CheckIcon color="#fff" size={16} />
        )}
        <Text style={{ fontSize: 15.5, fontWeight: "800", color: "#fff", letterSpacing: -0.2 }}>
          {importing ? t("community.importing") : t("community.use")}
        </Text>
      </Pressable>

      <Pressable
        onPress={onReport}
        hitSlop={8}
        style={{ alignSelf: "center", paddingVertical: 14, marginBottom: Math.max(insetsBottom, 8) }}
      >
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: S.sec }}>
          {t("community.report_link")}
        </Text>
      </Pressable>
    </View>
  );
}

function PreviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 9,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: S.line,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ flex: 1, marginLeft: 12, textAlign: "right", fontSize: 14, fontWeight: "700", color: S.ink }} numberOfLines={1}>
        {value}
      </Text>
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
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: S.line,
      }}
    >
      <SearchIcon color={S.ter} size={15} />
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
          fontSize: 14.5,
          color: S.ink,
          fontWeight: "700",
        }}
      />
    </View>
  );
}
