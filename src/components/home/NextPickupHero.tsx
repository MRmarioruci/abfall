// The main fact on Home: what goes out next, and when. Type does the work:
// a small label, the countdown as the screen's one headline, then the bins
// as colour squares and the date on a quiet line. Recyclops lives on the
// right, so he's on screen as soon as Home opens, and the whole block is
// his stage: he strolls across it, moonwalks, trips, and leaves on the
// right to come back in from the left.

const MASCOT = 78;

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, TYPE } from "../../theme/type";
import { BellIcon } from "../icons/Icons";
import { Recyclops } from "../Recyclops";
import { StreamMark } from "../ui/sheet";
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
  const { S, ST } = useTheme();
  const { t, locale, wasteLabel, weekdayLong, weekdayShort, monthShort } = useT();
  const first = events[0]!;
  const d = parseISODate(first.date);
  const countdown = relativeDayLabel(first.date, { t, locale, weekdayLong, monthShort });

  // Streams on that day, de-duped, in the order the calendar lists them.
  const streams: WasteStreamId[] = [];
  for (const e of events) if (ST[e.type] && !streams.includes(e.type)) streams.push(e.type);

  const meta: string[] = [`${weekdayShort(d.getDay())} ${d.getDate()} ${monthShort(d.getMonth() + 1)}`];
  if (first.time) meta.push(first.time);
  if (first.zone && first.zone !== "all") meta.push(t("day_edit.zone", { zone: first.zone }));

  const label = streams.map((id) => wasteLabel(id)).join(", ");
  const [width, setWidth] = useState(0);
  const open = (id: WasteStreamId) => {
    haptics.tap();
    onPress(id, first.date);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.cap, { color: S.sec }]}>{t("home.next_pickup")}</Text>
        <Pressable
          onPress={() => open(first.type)}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${countdown}, ${meta.join(", ")}`}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text
            style={[TYPE.display, { color: S.ink, marginTop: 4 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {countdown}
          </Text>
        </Pressable>

        {/* The bins, as colour squares; each opens its own reminder. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6, marginTop: 10 }}>
          {streams.map((id) => (
            <Pressable
              key={id}
              onPress={() => open(id)}
              accessibilityRole="button"
              accessibilityLabel={wasteLabel(id)}
              hitSlop={8}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.6 : 1 })}
            >
              <StreamMark color={ST[id].c} size={10} />
              <Text style={[TYPE.label, { color: S.ink }]}>{wasteLabel(id)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
          <Text style={[TYPE.caption, { color: S.sec, flexShrink: 1 }]} numberOfLines={1}>
            {meta.join(" · ")}
          </Text>
          <Pressable
            onPress={() => open(first.type)}
            accessibilityRole="button"
            accessibilityLabel={t("home.remind_me")}
            hitSlop={10}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <BellIcon color={S.ink} size={13} />
            <Text style={[TYPE.caption, { color: S.ink, fontFamily: FONT.w700 }]}>{t("home.remind_me")}</Text>
          </Pressable>
        </View>
      </View>

      {/* Drawn after the text so he walks in front of it. */}
      <View style={{ marginBottom: -4, zIndex: 2 }}>
        <Recyclops size={MASCOT} walkRange={Math.max(0, width - MASCOT)} antics />
      </View>
    </View>
  );
}
