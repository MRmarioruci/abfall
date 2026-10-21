import { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STREAM_ORDER } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { CircBtn } from "../components/ui/CircBtn";
import { CalendarMonth } from "../components/CalendarMonth";
import { BackIcon, CalIcon, PencilIcon } from "../components/icons/Icons";
import { DayEditSheet } from "../components/DayEditSheet";
import { ScanProgress } from "../components/ScanProgress";
import { PostScanShareDialog } from "../components/PostScanShareDialog";
import { PublishDialog } from "../components/PublishDialog";
import { LocationSearchInput } from "../components/LocationSearchInput";
import { parseCalendarImage, type ImageInput, type ParseProgress } from "../services/parseCalendar";
import { ScanCancelledError } from "../services/api";
import { generateCalendarId } from "../services/storage";
import { useCalendars } from "../context/CalendarContext";
import type { ParsedCalendarResult, SavedCalendar, CollectionEvent } from "../types/calendar";
import { parseISODate } from "../lib/dates";
import { placeFromLocation } from "../lib/location";
import { useT } from "../context/LocaleContext";
import { FONT, TYPE } from "../theme/type";
import { SoftCard } from "../components/ui/sheet";
import { findSuspicious } from "../lib/scanChecks";

type Phase = "parsing" | "review" | "error";

interface Props {
  images: ImageInput[];
  onComplete: () => void;
  onBack: () => void;
}

export function ScanReviewScreen({ images, onComplete, onBack }: Props) {
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, wasteLabel } = useT();
  const { addCalendar, active: previouslyActive, homeLocation } = useCalendars();
  const [phase, setPhase] = useState<Phase>("parsing");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<ParseProgress>({ stage: "preparing" });

  // Editable working copy of the parsed result
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [canton, setCanton] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CollectionEvent[]>([]);

  // Day-edit sheet state
  const [editDate, setEditDate] = useState<string | null>(null);

  // Post-save share flow — only the community-publish prompt. Full sharing
  // (link copy / native share) is reachable from the home screen later.
  const [savedCalendar, setSavedCalendar] = useState<SavedCalendar | null>(null);
  const [postShareVisible, setPostShareVisible] = useState(false);
  const [publishVisible, setPublishVisible] = useState(false);


  // Aborted by the Cancel button or when the screen unmounts, so a scan
  // the user walked away from stops making model calls.
  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    const cancelled = () => controller.signal.aborted;
    parseCalendarImage(images, (update) => {
      if (!cancelled()) setProgress(update);
    }, controller.signal)
      .then((parsed: ParsedCalendarResult) => {
        if (cancelled()) return;
        setTitle(parsed.title);
        setMunicipality(parsed.municipality);
        setCanton(parsed.canton || "");
        setZones(parsed.zones || []);
        // Default location: prefer what's printed ON the calendar itself
        // — that's the most accurate location for the schedule it describes.
        // Compose "<postcode> <municipality>, <canton>" so e.g. a calendar
        // with "8001 Zürich" + "ZH" becomes "8001 Zürich, ZH".
        // Fall back to the previously active calendar's location ONLY if
        // the parser couldn't read a municipality.
        const cityPart = [parsed.postcode, parsed.municipality]
          .filter(Boolean)
          .join(" ")
          .trim();
        const parsedDefault = cityPart
          ? parsed.canton
            ? `${cityPart}, ${parsed.canton}`
            : cityPart
          : "";
        const defaultLocation = parsedDefault || previouslyActive?.location || homeLocation || "";
        setLocation(defaultLocation);
        const y = parsed.events[0] ? parseISODate(parsed.events[0].date).getFullYear() : new Date().getFullYear();
        setYear(y);
        setEvents(parsed.events);
        setPhase("review");
      })
      .catch((e: any) => {
        if (cancelled() || e instanceof ScanCancelledError) return;
        setError(e.message || t("scan.review.parse_failed"));
        setPhase("error");
      });
    return () => controller.abort();
  }, [images]);

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
    onBack();
  };

  const handleSave = async () => {
    setSaving(true);
    // Saved as private. The post-save dialog offers publishing, which goes
    // through PublishDialog and only marks it shared once the server has it.
    // The location field may have been changed from what the scan read;
    // when it has, its city/region win over the scanned ones.
    const place = placeFromLocation(location.trim());
    const finalMunicipality = place?.municipality ?? municipality;
    const calendar: SavedCalendar = {
      id: generateCalendarId(),
      title: title.trim() || `${finalMunicipality || t("scan.calendar_fallback")} ${year}`,
      location: location.trim() || undefined,
      municipality: finalMunicipality,
      canton: place ? place.canton : canton,
      zones,
      year,
      events,
      source: "scan",
      active: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await addCalendar(calendar);
    } catch (err) {
      console.warn("[scan] save failed", err);
      Alert.alert(t("scan.review.save_failed_title"), t("scan.review.save_failed_body"));
      return;
    } finally {
      setSaving(false);
    }
    setSavedCalendar(calendar);
    setPostShareVisible(true);
  };

  const handlePostShareYes = () => {
    setPostShareVisible(false);
    setPublishVisible(true);
  };

  const handlePostShareSkip = () => {
    setPostShareVisible(false);
    onComplete();
  };

  const calendarMarks = useMemo(
    () =>
      events.map((e) => {
        const d = parseISODate(e.date);
        return {
          day: d.getDate(),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          stream: e.type,
        };
      }),
    [events],
  );

  // Pickups per waste type, for the summary chips under the title.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    return STREAM_ORDER.filter((id) => counts.has(id)).map((id) => ({ id, n: counts.get(id)! }));
  }, [events]);

  // Waste types whose pickup rhythm looks like a misread (see lib/scanChecks).
  // Recomputed on every edit, so fixing the days makes the hint go away.
  const suspiciousTypes = useMemo(() => {
    const ids = new Set(findSuspicious(events).map((s) => s.type));
    return STREAM_ORDER.filter((id) => ids.has(id));
  }, [events]);

  // Events for the day currently being edited
  const eventsOnEditDate = useMemo(
    () => (editDate ? events.filter((e) => e.date === editDate) : []),
    [events, editDate],
  );

  const handleDayPress = (day: number, monthIdx: number, yr: number) => {
    const date = `${yr}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setEditDate(date);
  };

  const handleDaySave = (date: string, newDayEvents: CollectionEvent[]) => {
    setEvents((prev) => {
      // Remove all events for that date, then add the new ones
      const others = prev.filter((e) => e.date !== date);
      return [...others, ...newDayEvents].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  if (phase === "parsing") {
    return (
      <View style={{ flex: 1, backgroundColor: S.sheet, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ScanProgress
          stage={progress.stage}
          detail={progress.detail}
          imageUri={images[0]?.uri}
          pageCount={images.length}
          onCancel={handleCancelScan}
        />
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: S.sheet, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 22, fontFamily: FONT.w800, color: S.ink, textAlign: "center" }}>
          {t("scan.review.error_title")}
        </Text>
        <Text style={{ fontSize: 14, color: S.sec, fontFamily: FONT.w500, marginTop: 10, textAlign: "center" }}>
          {error}
        </Text>
        <Pressable
          onPress={onBack}
          style={{ marginTop: 24, height: 50, paddingHorizontal: 32, borderRadius: 99, backgroundColor: S.ink, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 16, fontFamily: FONT.w700, color: S.onInk }}>{t("scan.review.try_again")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: S.sheet }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <CircBtn size={44} onPress={onBack}>
            <BackIcon color={S.ink} size={20} />
          </CircBtn>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: S.card, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, shadowColor: S.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: S.success }} />
            <Text style={{ fontSize: 12, fontFamily: FONT.w800, color: S.ink, letterSpacing: 0.3 }}>
              {events.length === 1 ? t("scan.review.dates_one") : t("scan.review.dates_other", { n: events.length })}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Name (edit in place) + location */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("scan.review.name_placeholder")}
              placeholderTextColor={S.ter}
              accessibilityLabel={t("scan.review.name_placeholder")}
              multiline
              scrollEnabled={false}
              style={{
                flex: 1,
                fontSize: 28,
                fontFamily: FONT.w800,
                color: S.ink,
                letterSpacing: -0.8,
                lineHeight: 33,
                padding: 0,
                textAlignVertical: "top",
              }}
            />
            <View style={{ marginTop: 6 }}>
              <PencilIcon color={S.ter} size={18} />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <LocationSearchInput value={location} onChange={setLocation} />
          </View>

          {/* What was found, by waste type */}
          {typeCounts.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {typeCounts.map(({ id, n }) => (
                <View
                  key={id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    paddingVertical: 7,
                    paddingLeft: 10,
                    paddingRight: 12,
                    borderRadius: 99,
                    backgroundColor: ST[id].soft,
                  }}
                >
                  <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: ST[id].c }} />
                  <Text style={{ fontSize: 13, fontFamily: FONT.w800, color: ST[id].ink }}>
                    {wasteLabel(id)} {n}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={{ fontSize: 13, color: S.ter, fontFamily: FONT.w700, textAlign: "center", marginTop: 20 }}>
          {t("scan.review.tap_to_edit")}
        </Text>

        {suspiciousTypes.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }} accessibilityRole="alert">
            <SoftCard bg={ST.karton.soft} style={{ paddingVertical: 14, paddingHorizontal: 16, gap: 10 }}>
              <Text style={[TYPE.caption, { color: ST.karton.ink }]}>{t("scan.review.check_title")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {suspiciousTypes.map((id) => (
                  <View
                    key={id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 5,
                      paddingLeft: 8,
                      paddingRight: 10,
                      borderRadius: 99,
                      backgroundColor: S.onTint,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: ST[id].c }} />
                    <Text style={[TYPE.micro, { color: ST[id].ink }]}>{wasteLabel(id)}</Text>
                  </View>
                ))}
              </View>
            </SoftCard>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <CalendarMonth
            marks={calendarMarks}
            municipality={municipality}
            onDayPress={handleDayPress}
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 30,
          paddingTop: 14,
          backgroundColor: S.sheetFloat,
        }}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            height: 58,
            borderRadius: 99,
            backgroundColor: S.ink,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 9,
            shadowColor: S.inkShadow,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.28,
            shadowRadius: 26,
            elevation: 8,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color={S.onInk} />
          ) : (
            <>
              <CalIcon color={S.onInk} size={20} />
              <Text style={{ fontSize: 17, fontFamily: FONT.w700, color: S.onInk }}>
                {t("scan.review.save")}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <DayEditSheet
        visible={editDate !== null}
        onClose={() => setEditDate(null)}
        date={editDate}
        currentEvents={eventsOnEditDate}
        zones={zones}
        onSave={handleDaySave}
      />

      <PostScanShareDialog
        visible={postShareVisible}
        calendar={savedCalendar}
        onShare={handlePostShareYes}
        onSkip={handlePostShareSkip}
      />

      <PublishDialog
        visible={publishVisible}
        calendar={savedCalendar}
        onClose={() => {
          setPublishVisible(false);
          onComplete();
        }}
      />
    </View>
  );
}
