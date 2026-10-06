import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S } from "../theme/colors";
import { CircBtn } from "../components/ui/CircBtn";
import { CalendarMonth } from "../components/CalendarMonth";
import { BackIcon, CalIcon } from "../components/icons/Icons";
import { DayEditSheet } from "../components/DayEditSheet";
import { ScanProgress } from "../components/ScanProgress";
import { PostScanShareDialog } from "../components/PostScanShareDialog";
import { LocationSearchInput } from "../components/LocationSearchInput";
import { parseCalendarImage, type ImageInput, type ParseProgress } from "../services/parseCalendar";
import { generateCalendarId } from "../services/storage";
import { useCalendars } from "../context/CalendarContext";
import type { ParsedCalendarResult, SavedCalendar, CollectionEvent } from "../types/calendar";

type Phase = "parsing" | "review" | "error";

interface Props {
  images: ImageInput[];
  onComplete: () => void;
  onBack: () => void;
}

export function ScanReviewScreen({ images, onComplete, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { addCalendar, patchCalendar, active: previouslyActive } = useCalendars();
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


  useEffect(() => {
    let cancelled = false;
    parseCalendarImage(images, (update) => {
      if (!cancelled) setProgress(update);
    })
      .then((parsed: ParsedCalendarResult) => {
        if (cancelled) return;
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
        const defaultLocation = parsedDefault || previouslyActive?.location || "";
        setLocation(defaultLocation);
        const y = parsed.events[0] ? new Date(parsed.events[0].date).getFullYear() : new Date().getFullYear();
        setYear(y);
        setEvents(parsed.events);
        setPhase("review");
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e.message || "Failed to parse calendar");
        setPhase("error");
      });
    return () => { cancelled = true; };
  }, [images]);

  const handleSave = async () => {
    setSaving(true);
    // Default action when adding a calendar: PUBLISH. The user can opt out
    // in the post-save dialog ("Keep private") which patches shared back to
    // false. The backend isn't connected yet, so this is a queued flag.
    const calendar: SavedCalendar = {
      id: generateCalendarId(),
      title: title.trim() || `${municipality || "Calendar"} ${year}`,
      location: location.trim() || undefined,
      municipality,
      canton,
      zones,
      year,
      events,
      source: "scan",
      active: true,
      shared: true,
      createdAt: new Date().toISOString(),
    };
    await addCalendar(calendar);
    setSaving(false);
    setSavedCalendar(calendar);
    setPostShareVisible(true);
  };

  // User accepts the default — calendar stays marked as shared and queued
  // for community publish when the backend goes live.
  const handlePostShareYes = () => {
    setPostShareVisible(false);
    onComplete();
  };

  // User opts out of publishing — patch the calendar to keep it private.
  const handlePostShareSkip = async () => {
    setPostShareVisible(false);
    if (savedCalendar) {
      await patchCalendar(savedCalendar.id, { shared: false });
    }
    onComplete();
  };

  const calendarMarks = useMemo(
    () =>
      events.map((e) => {
        const d = new Date(e.date);
        return {
          day: d.getDate(),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          stream: e.type,
        };
      }),
    [events],
  );

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
      <View style={{ flex: 1, backgroundColor: "#F5F2F7", paddingTop: insets.top }}>
        <ScanProgress stage={progress.stage} detail={progress.detail} />
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F2F7", justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: S.ink, textAlign: "center" }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: S.sec, fontWeight: "500", marginTop: 10, textAlign: "center" }}>
          {error}
        </Text>
        <Pressable
          onPress={onBack}
          style={{ marginTop: 24, height: 50, paddingHorizontal: 32, borderRadius: 99, backgroundColor: S.ink, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2F7" }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, shadowColor: "rgb(150,118,96)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: "#5BA86B" }} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: S.ink, letterSpacing: 0.3 }}>REVIEW & EDIT</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Editable title + location */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1, marginBottom: 6 }}>
            CALENDAR NAME
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Calendar name"
            placeholderTextColor={S.ter}
            multiline
            scrollEnabled={false}
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: S.ink,
              letterSpacing: -0.4,
              lineHeight: 26,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: S.line,
              textAlignVertical: "top",
            }}
          />

          <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1, marginTop: 16, marginBottom: 6 }}>
            LOCATION
          </Text>
          <LocationSearchInput value={location} onChange={setLocation} />

          <Text style={{ fontSize: 14, color: S.sec, lineHeight: 20, fontWeight: "500", marginTop: 14 }}>
            <Text style={{ color: S.ink, fontWeight: "800" }}>{events.length} dates</Text> read from your photo. Tap any day in the calendar to edit.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
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
          backgroundColor: "rgba(245,242,247,0.95)",
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
            shadowColor: S.ink,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.28,
            shadowRadius: 26,
            elevation: 8,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CalIcon color="#fff" size={20} />
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
                Save calendar
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
    </View>
  );
}
