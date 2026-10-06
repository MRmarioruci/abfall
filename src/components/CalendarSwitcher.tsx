import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { CheckIcon, XIcon, ShareIcon } from "./icons/Icons";
import { useCalendars } from "../context/CalendarContext";
import { ShareSheet } from "./ShareSheet";
import type { SavedCalendar } from "../types/calendar";

const SOURCE_LABELS: Record<string, string> = {
  scan: "Scanned",
  manual: "Manual",
  community: "Community",
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CalendarSwitcher({ visible, onClose }: Props) {
  const { calendars, switchCalendar, removeCalendar } = useCalendars();
  const [shareTarget, setShareTarget] = useState<SavedCalendar | null>(null);

  const handleSwitch = async (id: string) => {
    await switchCalendar(id);
    onClose();
  };

  const sheetHeight = Math.min(140 + calendars.length * 100, 540);

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={sheetHeight}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: S.ink,
            letterSpacing: -0.5,
          }}
        >
          My calendars
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: S.sec,
            fontWeight: "500",
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          {calendars.length > 0
            ? "Tap to switch your active calendar"
            : "No calendars yet — scan one to get started"}
        </Text>

        <View style={{ gap: 10 }}>
          {calendars.map((cal) => {
            const zone = cal.zones?.[0] || cal.zone;
            const period = `${cal.year}`;
            return (
              <Pressable
                key={cal.id}
                onPress={() => handleSwitch(cal.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 20,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: cal.active ? 2 : 0,
                  borderColor: cal.active ? S.ink : "transparent",
                  shadowColor: "rgb(150,118,96)",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: cal.active ? S.ink : "#F0EAE4",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cal.active && <CheckIcon color="#fff" size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }} numberOfLines={1}>
                      {cal.title || cal.municipality}
                    </Text>
                    {zone && (
                      <View
                        style={{
                          backgroundColor: "#F0EAE4",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", color: S.sec }}>
                          {zone}
                        </Text>
                      </View>
                    )}
                  </View>
                  {cal.location && (
                    <Text style={{ fontSize: 12, color: S.sec, fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
                      {cal.location}
                    </Text>
                  )}
                  <Text style={{ fontSize: 12, color: S.ter, fontWeight: "500", marginTop: 2 }}>
                    {period} · {SOURCE_LABELS[cal.source]} · {cal.events.length} dates
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setShareTarget(cal)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 99,
                      backgroundColor: "#F0EAE4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShareIcon color={S.sec} size={14} />
                  </Pressable>
                  {!cal.active && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeCalendar(cal.id)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 99,
                        backgroundColor: "#F0EAE4",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <XIcon color={S.sec} size={14} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      
      <ShareSheet
        visible={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        calendar={shareTarget}
      />
    </SlideUpSheet>
  );
}
