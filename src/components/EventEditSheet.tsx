import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "./icons/StreamGlyph";
import { CheckIcon } from "./icons/Icons";
import { PillButton, QuietButton, SheetHeader } from "./ui/sheet";
import type { CollectionEvent } from "../types/calendar";
import { parseISODate } from "../lib/dates";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface Props {
  visible: boolean;
  onClose: () => void;
  event: CollectionEvent | null; // null = adding new
  year: number;
  zones: string[];
  onSave: (event: CollectionEvent) => void;
  onDelete?: () => void;
}

export function EventEditSheet({ visible, onClose, event, year, zones, onSave, onDelete }: Props) {
  const { t, wasteLabel, monthShort } = useT();
  const [type, setType] = useState<WasteStreamId>("kehricht");
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState("1");
  const [zone, setZone] = useState("all");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (event) {
      const d = parseISODate(event.date);
      setType(event.type);
      setMonth(d.getMonth() + 1);
      setDay(String(d.getDate()));
      setZone(event.zone || "all");
      setTime(event.time || "");
    } else {
      setType("kehricht");
      setMonth(1);
      setDay("1");
      setZone(zones[0] || "all");
      setTime("");
    }
  }, [visible, event]);

  const zoneOptions = ["all", ...zones];

  const handleSave = () => {
    const dayNum = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
    const date = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    onSave({
      date,
      type,
      zone,
      time: time.trim() || undefined,
    });
    onClose();
  };

  const tint = ST[type];

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={560}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader title={event ? t("event_edit.title_edit") : t("event_edit.title_add")} />

        {/* Waste type: each in its own colour. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {STREAM_ORDER.map((id) => {
            const s = ST[id];
            const active = type === id;
            return (
              <Pressable
                key={id}
                onPress={() => setType(id)}
                accessibilityRole="button"
                accessibilityLabel={wasteLabel(id)}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  width: 84,
                  height: 88,
                  borderRadius: 22,
                  backgroundColor: active ? s.c : s.soft,
                  borderWidth: 2,
                  borderColor: active ? S.ink : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  paddingHorizontal: 6,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <StreamGlyph stream={id} size={34} color={s.ink} />
                <Text
                  style={{ fontSize: 12, fontFamily: FONT.w800, color: s.ink, textAlign: "center", lineHeight: 14 }}
                  numberOfLines={2}
                >
                  {wasteLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Date: day number, then the month. */}
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: 18 }}>
          <TextInput
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel={t("event_edit.day_label")}
            selectionColor={tint.ink}
            style={{
              width: 64,
              height: 52,
              borderRadius: 18,
              backgroundColor: tint.soft,
              textAlign: "center",
              fontSize: 22,
              fontFamily: FONT.w800,
              color: tint.ink,
            }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginRight: -20 }} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
            {MONTH_NUMBERS.map((m) => {
              const active = month === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMonth(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    height: 52,
                    minWidth: 52,
                    paddingHorizontal: 12,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? S.ink : "#fff",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: active ? "#fff" : S.sec }}>{monthShort(m)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Zone */}
        {zoneOptions.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {zoneOptions.map((z) => {
              const active = zone === z;
              return (
                <Pressable
                  key={z}
                  onPress={() => setZone(z)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    height: 40,
                    paddingHorizontal: 16,
                    borderRadius: 99,
                    backgroundColor: active ? S.ink : "#fff",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  {active && <CheckIcon color="#fff" size={12} />}
                  <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: active ? "#fff" : S.sec }}>
                    {z === "all" ? t("event_edit.all_zones") : z}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <PillButton
          label={event ? t("event_edit.save_changes") : t("event_edit.title_add")}
          onPress={handleSave}
          style={{ marginTop: 24 }}
        />
        {event && onDelete && (
          <QuietButton
            label={t("common.delete")}
            danger
            onPress={() => {
              onDelete();
              onClose();
            }}
          />
        )}
      </View>
    </SlideUpSheet>
  );
}
