// The pickups after the hero: a quiet timeline, one row per collection,
// date shown once per day.

import { View, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { TYPE } from "../../theme/type";
import { StreamGlyph } from "../icons/StreamGlyph";
import { useT } from "../../context/LocaleContext";
import { parseISODate } from "../../lib/dates";
import { relativeDayLabel } from "./relativeDay";
import type { CollectionEvent } from "../../types/calendar";

export function UpcomingList({ events }: { events: CollectionEvent[] }) {
  const { S, ST } = useTheme();
  const { t, locale, wasteLabel, weekdayShort, weekdayLong, monthShort } = useT();
  if (events.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {events.map((evt, i) => {
        const s = ST[evt.type];
        if (!s) return null;
        const d = parseISODate(evt.date);
        const isFirst = i === 0;
        const isLast = i === events.length - 1;
        const isFirstOfDay = i === 0 || events[i - 1]!.date !== evt.date;

        const sub: string[] = [];
        if (isFirstOfDay) sub.push(relativeDayLabel(evt.date, { t, locale, weekdayLong, monthShort }));
        if (evt.time) sub.push(evt.time);
        if (evt.zone && evt.zone !== "all") sub.push(t("day_edit.zone", { zone: evt.zone }));

        return (
          <View
            key={`${evt.date}-${evt.type}-${i}`}
            accessible
            accessibilityLabel={`${wasteLabel(evt.type)}, ${d.getDate()} ${monthShort(d.getMonth() + 1)}${sub.length ? `, ${sub.join(", ")}` : ""}`}
            style={{ flexDirection: "row", alignItems: "center", minHeight: 68 }}
          >
            {/* Date, once per day */}
            <View style={{ width: 52, alignItems: "center" }}>
              {isFirstOfDay && (
                <>
                  <Text style={[TYPE.heading, { color: S.ink }]}>{d.getDate()}</Text>
                  <Text style={[TYPE.micro, { color: S.sec }]}>
                    {weekdayShort(d.getDay())} {monthShort(d.getMonth() + 1)}
                  </Text>
                </>
              )}
            </View>

            {/* Timeline with the stream's glyph */}
            <View style={{ width: 50, alignSelf: "stretch", alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  position: "absolute",
                  width: 2,
                  top: isFirst ? "50%" : 0,
                  bottom: isLast ? "50%" : 0,
                  backgroundColor: S.line,
                }}
              />
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 99,
                  backgroundColor: s.soft,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: S.bg,
                }}
              >
                <StreamGlyph stream={evt.type} size={24} color={s.ink} />
              </View>
            </View>

            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={[TYPE.label, { color: S.ink }]} numberOfLines={1}>
                {wasteLabel(evt.type)}
              </Text>
              {sub.length > 0 && (
                <Text style={[TYPE.caption, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                  {sub.join(" · ")}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
