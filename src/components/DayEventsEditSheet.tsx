// Sheet for editing the collection events on a single calendar day.
// Opened from the Home screen when "edit mode" is active and the user taps
// a day cell. Shows what's already on that day with an X to remove, plus a
// chip row of all streams to add a new pickup.
//
// Zone for new events defaults to the calendar's zone (or "all"), which is
// usually right because most calendars cover a single zone.

import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { StreamGlyph } from "./icons/StreamGlyph";
import { XIcon, CheckIcon } from "./icons/Icons";
import type { CollectionEvent } from "../types/calendar";
import { useT } from "../context/LocaleContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** ISO date string (YYYY-MM-DD) the user is editing. */
  date: string | undefined;
  /** All events on that day from the active calendar. */
  events: CollectionEvent[];
  /** Default zone for newly added events. */
  defaultZone: string;
  onSave: (date: string, nextEvents: CollectionEvent[]) => void;
}


export function DayEventsEditSheet({ visible, onClose, date, events, defaultZone, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const { t, wasteLabel, weekdayLong, monthLong } = useT();
  const formatDayLabel = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return t("day_edit.date_long", {
      weekday: weekdayLong(d.getDay()),
      day: d.getDate(),
      month: monthLong(d.getMonth() + 1),
      year: d.getFullYear(),
    });
  };
  // Local working copy so the user can add/remove freely and only commit on Save.
  const [draft, setDraft] = useState<CollectionEvent[]>(events);

  useEffect(() => {
    if (visible) setDraft(events);
  }, [visible, events]);

  const removeAt = (index: number) => {
    setDraft((d) => d.filter((_, i) => i !== index));
  };

  const addStream = (stream: WasteStreamId) => {
    if (!date) return;
    // Avoid duplicates of the same stream+zone on the same day.
    if (draft.some((e) => e.type === stream && e.zone === defaultZone)) return;
    setDraft((d) => [...d, { date, type: stream, zone: defaultZone }]);
  };

  const handleSave = () => {
    if (!date) return;
    onSave(date, draft);
    onClose();
  };

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "600", color: S.ink, letterSpacing: -0.6 }}>
            {t("day_edit.title")}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel={t("day_edit.close")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XIcon color={S.sec} size={16} />
          </Pressable>
        </View>
        <Text style={{ fontSize: 14, color: S.sec, fontWeight: "600", marginBottom: 22 }}>
          {date ? formatDayLabel(date) : ""}
        </Text>

        {/* Existing events list */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          {t("day_edit.pickups_on_day")}
        </Text>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {draft.length === 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: S.line,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: S.sec, textAlign: "center" }}>
                {t("day_edit.empty")}
              </Text>
            </View>
          )}
          {draft.map((evt, i) => {
            const cc = ST[evt.type];
            if (!cc) return null;
            return (
              <View
                key={`${evt.type}-${evt.zone}-${i}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 12,
                  paddingRight: 10,
                  shadowColor: "rgb(150,118,96)",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: cc.c,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={evt.type} size={24} color={cc.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.3 }}>
                    {wasteLabel(evt.type)}
                  </Text>
                  {evt.zone !== "all" && (
                    <Text style={{ fontSize: 12, color: S.sec, fontWeight: "600", marginTop: 1 }}>
                      {t("day_edit.zone", { zone: evt.zone })}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => removeAt(i)}
                  accessibilityLabel={t("day_edit.remove_pickup", { stream: wasteLabel(evt.type) })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 99,
                    backgroundColor: "#F2ECE6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XIcon color={S.sec} size={14} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Add a pickup */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          {t("day_edit.add_pickup")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4, gap: 10 }}
          style={{ marginBottom: 24 }}
        >
          {STREAM_ORDER.map((id) => {
            const cc = ST[id];
            const alreadyAdded = draft.some((e) => e.type === id && e.zone === defaultZone);
            return (
              <Pressable
                key={id}
                onPress={() => addStream(id)}
                disabled={alreadyAdded}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 18,
                  backgroundColor: alreadyAdded ? "#F2ECE6" : "#fff",
                  borderWidth: 1.5,
                  borderColor: S.line,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingHorizontal: 6,
                  opacity: alreadyAdded ? 0.45 : 1,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: cc.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={id} size={20} color={cc.ink} />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: S.ink,
                    textAlign: "center",
                    lineHeight: 13,
                  }}
                  numberOfLines={2}
                >
                  {wasteLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: S.ink,
            borderRadius: 18,
            paddingVertical: 16,
            marginBottom: Math.max(insets.bottom, 8),
            shadowColor: S.ink,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <CheckIcon color="#fff" size={18} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>{t("day_edit.save_changes")}</Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
