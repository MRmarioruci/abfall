// This week at a glance, Monday to Sunday: today filled in ink, and a short
// bar per bin under each pickup day. Tapping a day does what tapping it in
// the month calendar does.

import { View, Text, Pressable } from "react-native";
import { STREAM_ORDER, type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, NUMS, TYPE } from "../../theme/type";
import { RADIUS } from "../../theme/layout";
import { useT } from "../../context/LocaleContext";
import { haptics } from "../../lib/haptics";
import type { CollectionEvent } from "../../types/calendar";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeekStrip({
  events,
  selected,
  onDayPress,
}: {
  events: CollectionEvent[];
  /** The day shown in the details below (YYYY-MM-DD): ringed. */
  selected?: string;
  /** Same signature as CalendarMonth's: day of month, 0-based month, year. */
  onDayPress: (day: number, month: number, year: number) => void;
}) {
  const { S, ST } = useTheme();
  const { weekdayMin, weekdayLong, wasteLabel } = useT();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const byDate = new Map<string, WasteStreamId[]>();
  for (const e of events) {
    if (!ST[e.type]) continue;
    const list = byDate.get(e.date) ?? [];
    if (!list.includes(e.type)) list.push(e.type);
    byDate.set(e.date, list);
  }

  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {days.map((d) => {
        const marks = (byDate.get(iso(d)) ?? []).sort((a, b) => STREAM_ORDER.indexOf(a) - STREAM_ORDER.indexOf(b));
        const isToday = d.getTime() === today.getTime();
        const isPast = d < today;
        const isSel = iso(d) === selected && !isToday;
        const label = [weekdayLong(d.getDay()), d.getDate(), ...marks.map((id) => wasteLabel(id))].join(", ");
        return (
          <Pressable
            key={d.getTime()}
            onPress={() => {
              haptics.select();
              onDayPress(d.getDate(), d.getMonth(), d.getFullYear());
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: iso(d) === selected }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 9,
              borderRadius: RADIUS.control,
              backgroundColor: isToday ? S.ink : "transparent",
              borderWidth: 1.5,
              borderColor: isSel ? S.ink : "transparent",
              opacity: isPast && !isToday && !isSel ? 0.45 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Text style={[TYPE.cap, { color: isToday ? S.onInk : S.sec, opacity: isToday ? 0.7 : 1 }]}>
              {weekdayMin(d.getDay())}
            </Text>
            <Text
              style={[
                NUMS,
                { fontSize: 18, lineHeight: 22, fontFamily: FONT.w700, color: isToday ? S.onInk : S.ink, marginTop: 2 },
              ]}
            >
              {d.getDate()}
            </Text>
            <View style={{ flexDirection: "row", gap: 2, height: 3, marginTop: 5 }}>
              {marks.slice(0, 3).map((id) => (
                <View
                  key={id}
                  style={{ width: marks.length > 1 ? 7 : 14, height: 3, borderRadius: 2, backgroundColor: ST[id].c }}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
