import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { StreamGlyph } from "./icons/StreamGlyph";
import { CheckIcon } from "./icons/Icons";
import { PillButton, SheetHeader } from "./ui/sheet";
import type { CollectionEvent } from "../types/calendar";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Sheet uses up to 88% of screen — leaves a bit of backdrop visible at the top
// for the user to tap to dismiss.
const SHEET_HEIGHT = Math.min(720, SCREEN_HEIGHT * 0.88);
// Three colour tiles per row when the calendar has no zones.
const TILE_GAP = 10;
const TILE_W = Math.floor((Dimensions.get("window").width - 40 - TILE_GAP * 2) / 3);

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string | null;
  currentEvents: CollectionEvent[];
  zones: string[];
  onSave: (date: string, events: CollectionEvent[]) => void;
}

export function DayEditSheet({ visible, onClose, date, currentEvents, zones, onSave }: Props) {
  const { S, ST } = useTheme();
  const { t, wasteLabel, weekdayLong, monthLong } = useT();
  const [typeZones, setTypeZones] = useState<Map<WasteStreamId, Set<string>>>(new Map());

  const hasZones = zones.length > 0;

  useEffect(() => {
    if (!visible || !date) return;
    const map = new Map<WasteStreamId, Set<string>>();
    for (const evt of currentEvents) {
      if (!map.has(evt.type)) map.set(evt.type, new Set());
      map.get(evt.type)!.add(evt.zone || "all");
    }
    setTypeZones(map);
  }, [visible, date]);

  const heading = useMemo(() => {
    if (!date) return "";
    const d = new Date(date);
    return t("day_edit.date_medium", {
      weekday: weekdayLong(d.getDay()),
      day: d.getDate(),
      month: monthLong(d.getMonth() + 1),
    });
  }, [date, t, weekdayLong, monthLong]);

  const totalSelected = Array.from(typeZones.values()).reduce((sum, s) => sum + s.size, 0);

  const toggleZone = (type: WasteStreamId, zone: string) => {
    setTypeZones((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(type) || []);
      if (current.has(zone)) current.delete(zone);
      else current.add(zone);
      if (current.size === 0) next.delete(type);
      else next.set(type, current);
      return next;
    });
  };

  const toggleNoZone = (type: WasteStreamId) => {
    // For calendars with no zones, tap toggles a single "all" entry.
    setTypeZones((prev) => {
      const next = new Map(prev);
      if (next.has(type)) next.delete(type);
      else next.set(type, new Set(["all"]));
      return next;
    });
  };

  const clearAll = () => setTypeZones(new Map());

  const handleSave = () => {
    if (!date) return;
    const events: CollectionEvent[] = [];
    for (const [type, zoneSet] of typeZones) {
      for (const zone of zoneSet) {
        events.push({ date, type, zone });
      }
    }
    onSave(date, events);
    onClose();
  };

  const countLine =
    totalSelected === 0
      ? t("day_edit.none_set")
      : totalSelected === 1
        ? t("day_edit.count_set_one")
        : t("day_edit.count_set_other", { n: totalSelected });

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={SHEET_HEIGHT} scrollable={false}>
      <View style={{ height: SHEET_HEIGHT - 30, paddingHorizontal: 20, paddingTop: 4 }}>
        {/* Fixed header: the date is the title. */}
        <SheetHeader
          title={heading}
          subtitle={countLine}
          right={
            totalSelected > 0 ? (
              <Pressable
                onPress={clearAll}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => ({
                  marginTop: 2,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: RADIUS.well,
                  backgroundColor: S.card,
                  borderWidth: HAIRLINE,
                  borderColor: S.line,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: S.sec }}>{t("day_edit.clear")}</Text>
              </Pressable>
            ) : undefined
          }
        />

        {/* Scrollable middle */}
        <ScrollView
          style={{ flex: 1, marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {!hasZones ? (
            // One colour tile per waste type; tap to toggle.
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP }}>
              {STREAM_ORDER.map((type) => {
                const s = ST[type];
                const isActive = typeZones.has(type);
                return (
                  <Pressable
                    key={type}
                    onPress={() => toggleNoZone(type)}
                    accessibilityRole="button"
                    accessibilityLabel={wasteLabel(type)}
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => ({
                      width: TILE_W,
                      height: TILE_W,
                      borderRadius: RADIUS.control,
                      backgroundColor: isActive ? s.c : S.card,
                      borderWidth: isActive ? 1.5 : HAIRLINE,
                      borderColor: isActive ? S.ink : S.line,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      paddingHorizontal: 6,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    })}
                  >
                    {isActive && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: 99,
                          backgroundColor: S.ink,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckIcon color={S.onInk} size={11} />
                      </View>
                    )}
                    <StreamGlyph stream={type} size={Math.min(44, TILE_W * 0.42)} color={isActive ? s.onC : s.ink} />
                    <Text
                      style={{ fontSize: 13, fontFamily: FONT.w800, color: isActive ? s.onC : S.ink, textAlign: "center", lineHeight: 15 }}
                      numberOfLines={2}
                    >
                      {wasteLabel(type)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            // Multi-zone calendars: one soft row per type with its zone chips.
            <View style={{ gap: 10 }}>
              {STREAM_ORDER.map((type) => {
                const s = ST[type];
                const activeZones = typeZones.get(type) || new Set<string>();
                const isActive = activeZones.size > 0;
                return (
                  <View
                    key={type}
                    style={{
                      borderRadius: RADIUS.card,
                      padding: 12,
                      gap: 12,
                      backgroundColor: S.card,
                      borderWidth: isActive ? 1.5 : HAIRLINE,
                      borderColor: isActive ? S.ink : S.line,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: RADIUS.well,
                          backgroundColor: isActive ? s.c : s.soft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <StreamGlyph stream={type} size={26} color={isActive ? s.onC : s.ink} />
                      </View>
                      <Text
                        style={{ flex: 1, fontSize: 16, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.2 }}
                        numberOfLines={1}
                      >
                        {wasteLabel(type)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {zones.map((zone) => {
                        const on = activeZones.has(zone);
                        return (
                          <Pressable
                            key={zone}
                            onPress={() => toggleZone(type, zone)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              height: 36,
                              paddingHorizontal: 14,
                              borderRadius: RADIUS.well,
                              backgroundColor: on ? s.c : S.chip,
                              transform: [{ scale: pressed ? 0.95 : 1 }],
                            })}
                          >
                            {on && <CheckIcon color={s.onC} size={12} />}
                            <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: on ? s.onC : S.sec }}>{zone}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Fixed footer */}
        <View style={{ paddingTop: 12 }}>
          <PillButton
            onPress={handleSave}
            label={
              totalSelected === 0
                ? t("day_edit.save_none")
                : totalSelected === 1
                  ? t("day_edit.save_count_one")
                  : t("day_edit.save_count_other", { n: totalSelected })
            }
          />
        </View>
      </View>
    </SlideUpSheet>
  );
}
