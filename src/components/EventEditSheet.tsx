import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "./icons/StreamGlyph";
import { XIcon } from "./icons/Icons";
import type { CollectionEvent } from "../types/calendar";
import { parseISODate } from "../lib/dates";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={560}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: S.ink, letterSpacing: -0.5 }}>
            {event ? "Edit date" : "Add date"}
          </Text>
          {event && onDelete && (
            <Pressable
              onPress={() => { onDelete(); onClose(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: "#F6DDD2" }}
            >
              <XIcon color="#4A1B10" size={13} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#4A1B10" }}>Delete</Text>
            </Pressable>
          )}
        </View>

        {/* Waste type */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1, marginBottom: 10 }}>
          WASTE TYPE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {STREAM_ORDER.map((id) => {
            const s = ST[id];
            const active = type === id;
            return (
              <Pressable
                key={id}
                onPress={() => setType(id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  borderRadius: 99,
                  backgroundColor: active ? s.c : "#fff",
                  borderWidth: 1.5,
                  borderColor: active ? s.c : S.line,
                }}
              >
                <StreamGlyph stream={id} size={20} color={active ? s.ink : S.sec} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: active ? s.ink : S.sec }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Date */}
        <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1, marginTop: 22, marginBottom: 10 }}>
          DATE
        </Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            maxLength={2}
            style={{
              width: 64,
              height: 48,
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: S.line,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "800",
              color: S.ink,
            }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MONTHS_SHORT.map((m, i) => {
              const active = month === i + 1;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMonth(i + 1)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: active ? S.ink : "#fff",
                    borderWidth: 1.5,
                    borderColor: active ? S.ink : S.line,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : S.sec }}>{m}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Zone */}
        {zoneOptions.length > 1 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1, marginTop: 22, marginBottom: 10 }}>
              ZONE
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {zoneOptions.map((z) => {
                const active = zone === z;
                return (
                  <Pressable
                    key={z}
                    onPress={() => setZone(z)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 99,
                      backgroundColor: active ? S.ink : "#fff",
                      borderWidth: 1.5,
                      borderColor: active ? S.ink : S.line,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: active ? "#fff" : S.sec }}>
                      {z === "all" ? "All zones" : z}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={{
            marginTop: 28,
            height: 56,
            borderRadius: 99,
            backgroundColor: S.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
            {event ? "Save changes" : "Add date"}
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
