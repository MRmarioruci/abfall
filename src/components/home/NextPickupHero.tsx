// The main fact on Home: what goes out next, and when. One soft card in the
// stream's tint, a big glyph, the waste type, and a countdown.

import { View, Text, Pressable } from "react-native";
import { S, ST, type WasteStreamId } from "../../theme/colors";
import { TYPE } from "../../theme/type";
import { StreamGlyph } from "../icons/StreamGlyph";
import { BellIcon } from "../icons/Icons";
import { useT } from "../../context/LocaleContext";
import { parseISODate } from "../../lib/dates";
import { haptics } from "../../lib/haptics";
import { relativeDayLabel } from "./relativeDay";
import type { CollectionEvent } from "../../types/calendar";

export function NextPickupHero({
  events,
  onPress,
}: {
  /** All events on the next pickup day (at least one). */
  events: CollectionEvent[];
  /** Opens the reminder flow for a stream on that day. */
  onPress: (stream: WasteStreamId, date: string) => void;
}) {
  const { t, locale, wasteLabel, weekdayLong, weekdayShort, monthShort } = useT();
  const first = events[0]!;
  const s = ST[first.type] ?? ST.sonstiges;
  const d = parseISODate(first.date);
  const countdown = relativeDayLabel(first.date, { t, locale, weekdayLong, monthShort });

  // Streams on that day, de-duped, in the order the calendar lists them.
  const streams: WasteStreamId[] = [];
  for (const e of events) if (ST[e.type] && !streams.includes(e.type)) streams.push(e.type);

  const meta: string[] = [`${weekdayShort(d.getDay())} ${d.getDate()} ${monthShort(d.getMonth() + 1)}`];
  if (first.time) meta.push(first.time);
  if (first.zone && first.zone !== "all") meta.push(t("day_edit.zone", { zone: first.zone }));

  const label = streams.map((id) => wasteLabel(id)).join(", ");

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress(first.type, first.date);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${countdown}, ${meta.join(", ")}`}
      style={({ pressed }) => ({
        borderRadius: 28,
        backgroundColor: s.soft,
        padding: 20,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TYPE.display, { color: s.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {countdown}
          </Text>
          <Text style={[TYPE.title, { color: S.ink, marginTop: 4 }]} numberOfLines={2}>
            {wasteLabel(first.type)}
          </Text>
          <Text style={[TYPE.caption, { color: s.ink, opacity: 0.7, marginTop: 6 }]} numberOfLines={1}>
            {meta.join(" · ")}
          </Text>
        </View>
        <View
          style={{
            width: 104,
            height: 104,
            borderRadius: 99,
            backgroundColor: s.c,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StreamGlyph stream={first.type} size={80} color={s.ink} />
          <View
            style={{
              position: "absolute",
              right: -2,
              top: -2,
              width: 32,
              height: 32,
              borderRadius: 99,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BellIcon color={s.ink} size={15} />
          </View>
        </View>
      </View>

      {streams.length > 1 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {streams.map((id) => (
            <Pressable
              key={id}
              onPress={() => {
                haptics.tap();
                onPress(id, first.date);
              }}
              accessibilityRole="button"
              accessibilityLabel={wasteLabel(id)}
              hitSlop={6}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 5,
                paddingLeft: 5,
                paddingRight: 12,
                borderRadius: 99,
                backgroundColor: "rgba(255,255,255,0.7)",
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  backgroundColor: ST[id].c,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StreamGlyph stream={id} size={18} color={ST[id].ink} />
              </View>
              <Text style={[TYPE.micro, { color: S.ink }]}>{wasteLabel(id)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Pressable>
  );
}
