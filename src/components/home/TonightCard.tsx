// "Tonight": on the evening before a pickup (and the morning of it), a
// small checklist of the bins to put out. Ticking them is its own little
// reward; the ticks are kept per calendar and day on the device.

import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STREAM_ORDER, type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { TYPE } from "../../theme/type";
import { CheckIcon } from "../icons/Icons";
import { SoftCard, StreamMark } from "../ui/sheet";
import { useT } from "../../context/LocaleContext";
import { haptics } from "../../lib/haptics";
import type { CollectionEvent } from "../../types/calendar";

/** From this hour the evening before, the card shows. */
const EVENING_FROM = 15;
/** Until this hour on the pickup morning, it still shows. */
const MORNING_UNTIL = 10;

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The pickup this card is about right now, if any. */
function currentPickup(events: CollectionEvent[], now = new Date()) {
  const today = iso(now);
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  const tomorrow = iso(tmr);
  const on = (date: string) => events.filter((e) => e.date === date).map((e) => e.type);
  if (now.getHours() >= EVENING_FROM && on(tomorrow).length) return { date: tomorrow, evening: true, streams: on(tomorrow) };
  if (now.getHours() < MORNING_UNTIL && on(today).length) return { date: today, evening: false, streams: on(today) };
  return null;
}

export function TonightCard({ calendarId, events }: { calendarId: string; events: CollectionEvent[] }) {
  const { S, ST } = useTheme();
  const { t, wasteLabel } = useT();
  const pickup = currentPickup(events);
  const key = pickup ? `abfall_putout:${calendarId}:${pickup.date}` : null;
  const [done, setDone] = useState<WasteStreamId[]>([]);

  useEffect(() => {
    setDone([]);
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((v) => v && setDone(JSON.parse(v)))
      .catch(() => {});
  }, [key]);

  if (!pickup || !key) return null;
  const streams = STREAM_ORDER.filter((id) => pickup.streams.includes(id) && ST[id]);
  const count = streams.filter((id) => done.includes(id)).length;
  const allOut = count === streams.length;

  const toggle = (id: WasteStreamId) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    if (!done.includes(id) && next.filter((x) => streams.includes(x)).length === streams.length) haptics.success();
    else haptics.select();
    setDone(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  };

  return (
    <SoftCard style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={[TYPE.label, { color: S.ink, fontSize: 17 }]}>
          {pickup.evening ? t("home.tonight") : t("home.this_morning")}
        </Text>
        <Text style={[TYPE.cap, { color: allOut ? S.success : S.sec }]}>
          {allOut ? t("home.all_out") : t("home.out_count", { n: count, total: streams.length })}
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: S.chip, marginTop: 10, marginBottom: 4, overflow: "hidden" }}>
        <View
          style={{
            width: `${(count / Math.max(1, streams.length)) * 100}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: allOut ? S.success : S.ink,
          }}
        />
      </View>
      {streams.map((id) => {
        const on = done.includes(id);
        return (
          <Pressable
            key={id}
            onPress={() => toggle(id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={wasteLabel(id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 9,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: on ? S.ink : "transparent",
                borderWidth: on ? 0 : 1.5,
                borderColor: S.ter,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {on && <CheckIcon color={S.onInk} size={13} />}
            </View>
            <Text
              style={[
                TYPE.label,
                { flex: 1, color: on ? S.sec : S.ink, fontSize: 15, textDecorationLine: on ? "line-through" : "none" },
              ]}
            >
              {wasteLabel(id)}
            </Text>
            <StreamMark color={ST[id].c} size={10} />
          </Pressable>
        );
      })}
    </SoftCard>
  );
}
