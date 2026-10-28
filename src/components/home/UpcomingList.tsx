// The pickups after the hero: a plain list, one row per collection, the
// date shown once per day, hairlines between days.

import { View, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, NUMS, TYPE } from "../../theme/type";
import { HAIRLINE, RADIUS } from "../../theme/layout";
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
    <View>
      {events.map((evt, i) => {
        const s = ST[evt.type];
        if (!s) return null;
        const d = parseISODate(evt.date);
        const isFirstOfDay = i === 0 || events[i - 1]!.date !== evt.date;
        const isLastOfDay = i === events.length - 1 || events[i + 1]!.date !== evt.date;
        const isLast = i === events.length - 1;
        const rel = relativeDayLabel(evt.date, { t, locale, weekdayLong, monthShort });

        const sub: string[] = [];
        if (evt.time) sub.push(evt.time);
        if (evt.zone && evt.zone !== "all") sub.push(t("day_edit.zone", { zone: evt.zone }));

        return (
          <View
            key={`${evt.date}-${evt.type}-${i}`}
            accessible
            accessibilityLabel={`${wasteLabel(evt.type)}, ${weekdayLong(d.getDay())} ${d.getDate()} ${monthShort(d.getMonth() + 1)}, ${rel}${sub.length ? `, ${sub.join(", ")}` : ""}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingTop: isFirstOfDay ? 13 : 4,
              paddingBottom: isLastOfDay ? 13 : 4,
              borderBottomWidth: isLastOfDay && !isLast ? HAIRLINE : 0,
              borderBottomColor: S.line,
            }}
          >
            {/* Date, once per day */}
            <View style={{ width: 32, alignItems: "center" }}>
              {isFirstOfDay && (
                <>
                  <Text style={[NUMS, { fontSize: 19, lineHeight: 21, fontFamily: FONT.w700, color: S.ink }]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[TYPE.cap, { color: S.sec, marginTop: 1 }]}>{weekdayShort(d.getDay())}</Text>
                </>
              )}
            </View>

            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: RADIUS.well,
                backgroundColor: s.c,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StreamGlyph stream={evt.type} size={22} color={s.onC} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[TYPE.label, { color: S.ink }]} numberOfLines={1}>
                {wasteLabel(evt.type)}
              </Text>
              {sub.length > 0 && (
                <Text style={[TYPE.caption, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                  {sub.join(" · ")}
                </Text>
              )}
            </View>

            {isFirstOfDay && <Text style={[TYPE.caption, { color: S.sec }]}>{rel}</Text>}
          </View>
        );
      })}
    </View>
  );
}
