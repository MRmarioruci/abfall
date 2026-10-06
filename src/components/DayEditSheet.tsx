import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "./icons/StreamGlyph";
import { CheckIcon } from "./icons/Icons";
import type { CollectionEvent } from "../types/calendar";
import { useT } from "../context/LocaleContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Sheet uses up to 88% of screen — leaves a bit of backdrop visible at the top
// for the user to tap to dismiss.
const SHEET_HEIGHT = Math.min(720, SCREEN_HEIGHT * 0.88);

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string | null;
  currentEvents: CollectionEvent[];
  zones: string[];
  onSave: (date: string, events: CollectionEvent[]) => void;
}

export function DayEditSheet({ visible, onClose, date, currentEvents, zones, onSave }: Props) {
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

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={SHEET_HEIGHT} scrollable={false}>
      <View style={{ height: SHEET_HEIGHT - 30, paddingHorizontal: 20 }}>
        {/* Fixed header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
              {t("day_edit.eyebrow")}
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: S.ink,
                letterSpacing: -0.5,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {heading}
            </Text>
            <Text style={{ fontSize: 13, color: S.sec, fontWeight: "600", marginTop: 4 }}>
              {totalSelected === 0
                ? t("day_edit.none_set")
                : totalSelected === 1
                  ? t("day_edit.count_set_one")
                  : t("day_edit.count_set_other", { n: totalSelected })}
            </Text>
          </View>
          {totalSelected > 0 && (
            <Pressable
              onPress={clearAll}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 13,
                borderRadius: 99,
                backgroundColor: "#F0EAE4",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: S.sec, letterSpacing: 0.3 }}>
                {t("day_edit.clear")}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Scrollable middle */}
        <ScrollView
          style={{ flex: 1, marginTop: 14 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {STREAM_ORDER.map((type) => {
            const s = ST[type];
            const activeZones = typeZones.get(type) || new Set();
            const isActive = activeZones.size > 0;

            return (
              <View
                key={type}
                style={{
                  borderRadius: 18,
                  marginBottom: 10,
                  backgroundColor: isActive ? s.soft : "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: isActive ? s.c : "rgba(40,28,18,0.07)",
                  overflow: "hidden",
                }}
              >
                {/* Top row: icon + label + (no-zone toggle / status) */}
                <Pressable
                  onPress={hasZones ? undefined : () => toggleNoZone(type)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    paddingRight: 14,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isActive ? s.c : "#F0EAE4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <StreamGlyph stream={type} size={26} color={isActive ? s.ink : S.ter} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }}>
                      {wasteLabel(type)}
                    </Text>
                    {isActive && hasZones && (
                      <Text style={{ fontSize: 12, color: s.ink, fontWeight: "700", marginTop: 2 }}>
                        {Array.from(activeZones).join(" · ")}
                      </Text>
                    )}
                    {!isActive && (
                      <Text style={{ fontSize: 12, color: S.ter, fontWeight: "600", marginTop: 2 }}>
                        {hasZones ? t("day_edit.pick_zones") : t("day_edit.tap_to_add")}
                      </Text>
                    )}
                  </View>
                  {!hasZones && (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 99,
                        backgroundColor: isActive ? s.ink : "transparent",
                        borderWidth: isActive ? 0 : 1.5,
                        borderColor: "rgba(40,28,18,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isActive && <CheckIcon color="#fff" size={14} />}
                    </View>
                  )}
                </Pressable>

                {/* Zone chips (only for multi-zone calendars) — wraps for any number of zones */}
                {hasZones && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      padding: 12,
                      paddingTop: 0,
                    }}
                  >
                    {zones.map((zone) => {
                      const on = activeZones.has(zone);
                      return (
                        <Pressable
                          key={zone}
                          onPress={() => toggleZone(type, zone)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 99,
                            backgroundColor: on ? s.c : "#FFFFFF",
                            borderWidth: 1.5,
                            borderColor: on ? s.c : "rgba(40,28,18,0.10)",
                          }}
                        >
                          {on && <CheckIcon color={s.ink} size={12} />}
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "800",
                              color: on ? s.ink : S.sec,
                              letterSpacing: 0.2,
                            }}
                          >
                            {zone}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Fixed footer */}
        <View style={{ paddingTop: 12 }}>
          <Pressable
            onPress={handleSave}
            style={{
              height: 54,
              borderRadius: 99,
              backgroundColor: S.ink,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: S.ink,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
              {totalSelected === 0
                ? t("day_edit.save_none")
                : totalSelected === 1
                  ? t("day_edit.save_count_one")
                  : t("day_edit.save_count_other", { n: totalSelected })}
            </Text>
          </Pressable>
        </View>
      </View>
    </SlideUpSheet>
  );
}
