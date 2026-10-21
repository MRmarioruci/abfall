// Sheet for editing the collection events on a single calendar day.
// Opened from the Home screen when "edit mode" is active and the user taps
// a day cell. Shows what's already on that day with an X to remove, plus a
// chip row of all streams to add a new pickup.
//
// Zone for new events defaults to the calendar's zone (or "all"), which is
// usually right because most calendars cover a single zone.

import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { StreamGlyph } from "./icons/StreamGlyph";
import { XIcon, CheckIcon, PlusIcon } from "./icons/Icons";
import { PillButton, SheetHeader, SoftCard } from "./ui/sheet";
import type { CollectionEvent } from "../types/calendar";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

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
        {/* The date is the title. */}
        <SheetHeader
          title={date ? formatDayLabel(date) : t("day_edit.title")}
          right={
            <Pressable
              onPress={onClose}
              accessibilityLabel={t("day_edit.close")}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 99,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <XIcon color={S.sec} size={16} />
            </Pressable>
          }
        />

        {/* What's on this day: one soft row per pickup. */}
        <View style={{ gap: 8, marginBottom: 20 }}>
          {draft.length === 0 && (
            <SoftCard bg="#fff" style={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 14, fontFamily: FONT.w700, color: S.sec, textAlign: "center" }}>
                {t("day_edit.empty")}
              </Text>
            </SoftCard>
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
                  backgroundColor: cc.soft,
                  borderRadius: 20,
                  padding: 10,
                  paddingRight: 10,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: cc.c,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={evt.type} size={26} color={cc.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: FONT.w800, color: cc.ink, letterSpacing: -0.3 }}>
                    {wasteLabel(evt.type)}
                  </Text>
                  {evt.zone !== "all" && (
                    <Text style={{ fontSize: 13, color: cc.ink, opacity: 0.7, fontFamily: FONT.w700, marginTop: 1 }}>
                      {t("day_edit.zone", { zone: evt.zone })}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => removeAt(i)}
                  accessibilityLabel={t("day_edit.remove_pickup", { stream: wasteLabel(evt.type) })}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    width: 32,
                    height: 32,
                    borderRadius: 99,
                    backgroundColor: "rgba(255,255,255,0.75)",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  })}
                >
                  <XIcon color={cc.ink} size={14} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Add a pickup: every type as a colour chip with a plus. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {STREAM_ORDER.map((id) => {
            const cc = ST[id];
            const alreadyAdded = draft.some((e) => e.type === id && e.zone === defaultZone);
            return (
              <Pressable
                key={id}
                onPress={() => addStream(id)}
                disabled={alreadyAdded}
                accessibilityRole="button"
                accessibilityLabel={wasteLabel(id)}
                accessibilityState={{ disabled: alreadyAdded }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  paddingLeft: 8,
                  paddingRight: 13,
                  borderRadius: 99,
                  backgroundColor: cc.soft,
                  opacity: alreadyAdded ? 0.4 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <StreamGlyph stream={id} size={24} color={cc.ink} />
                <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: cc.ink, letterSpacing: -0.2 }}>
                  {wasteLabel(id)}
                </Text>
                {alreadyAdded ? <CheckIcon color={cc.ink} size={12} /> : <PlusIcon color={cc.ink} size={14} />}
              </Pressable>
            );
          })}
        </View>

        <PillButton
          label={t("day_edit.save_changes")}
          icon={<CheckIcon color="#fff" size={18} />}
          onPress={handleSave}
          style={{ marginBottom: Math.max(insets.bottom, 8) }}
        />
      </View>
    </SlideUpSheet>
  );
}
