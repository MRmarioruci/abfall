// The day picked in the week or month view: its bins, with the reminder
// set for each (or a quick way to add one), and the next few pickups
// after it as small tiles. Replaces a separate "coming up" list, so the
// calendar and the details are one thing.

import { View, Text, Pressable } from "react-native";
import { STREAM_ORDER, type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, NUMS, TYPE } from "../../theme/type";
import { HAIRLINE, RADIUS } from "../../theme/layout";
import { BellIcon, PlusIcon } from "../icons/Icons";
import { StreamGlyph } from "../icons/StreamGlyph";
import { SoftCard, StreamMark } from "../ui/sheet";
import { useT } from "../../context/LocaleContext";
import { parseISODate } from "../../lib/dates";
import { haptics } from "../../lib/haptics";
import { relativeDayLabel, daysFromToday } from "./relativeDay";
import type { CollectionEvent, ReminderRule } from "../../types/calendar";

export function DayDetail({
  date,
  events,
  reminders,
  onRemind,
  onSelect,
}: {
  /** The selected day, YYYY-MM-DD. */
  date: string;
  /** All of the calendar's events. */
  events: CollectionEvent[];
  reminders?: Partial<Record<WasteStreamId, ReminderRule[]>>;
  /** Open the reminder editor: for a bin on that day, or (no stream) a one-off. */
  onRemind: (stream: WasteStreamId | null, date: string) => void;
  /** Pick another day (the "later" tiles). */
  onSelect: (date: string) => void;
}) {
  const { S, ST } = useTheme();
  const { t, locale, wasteLabel, weekdayLong, weekdayShort, monthShort } = useT();
  const d = parseISODate(date);
  const past = daysFromToday(date) < 0;
  const dayEvents = events
    .filter((e) => e.date === date && ST[e.type])
    .sort((a, b) => STREAM_ORDER.indexOf(a.type) - STREAM_ORDER.indexOf(b.type));

  // The next three pickup days after this one (from today on).
  const later = (() => {
    const byDate = new Map<string, WasteStreamId[]>();
    for (const e of events) {
      if (e.date <= date || daysFromToday(e.date) < 0 || !ST[e.type]) continue;
      const list = byDate.get(e.date) ?? [];
      if (!list.includes(e.type)) list.push(e.type);
      byDate.set(e.date, list);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 3);
  })();

  const reminderFor = (id: WasteStreamId) => (reminders?.[id] || []).find((r) => r.on && r.when !== "specific date");

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 8 }}>
        <Text style={[TYPE.heading, { color: S.ink, fontSize: 18 }]}>
          {weekdayLong(d.getDay())} {d.getDate()}
        </Text>
        {!past && <Text style={[TYPE.cap, { color: S.sec }]}>{relativeDayLabel(date, { t, locale, weekdayLong, monthShort })}</Text>}
      </View>

      <SoftCard style={{ padding: 0 }}>
        {dayEvents.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <Text style={[TYPE.label, { flex: 1, color: S.sec, fontSize: 15 }]}>{t("home.no_pickups")}</Text>
            {!past && <RemindChip onPress={() => onRemind(null, date)} />}
          </View>
        ) : (
          dayEvents.map((e, i) => {
            const s = ST[e.type];
            const rule = reminderFor(e.type);
            const sub: string[] = [];
            if (e.time) sub.push(e.time);
            if (e.zone && e.zone !== "all") sub.push(t("day_edit.zone", { zone: e.zone }));
            return (
              <View
                key={`${e.type}-${i}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderTopWidth: i === 0 ? 0 : HAIRLINE,
                  borderTopColor: S.line,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: RADIUS.well,
                    backgroundColor: s.c,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <StreamGlyph stream={e.type} size={22} color={s.onC} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[TYPE.label, { color: past ? S.sec : S.ink }]} numberOfLines={1}>
                    {wasteLabel(e.type)}
                  </Text>
                  {sub.length > 0 && (
                    <Text style={[TYPE.caption, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                      {sub.join(" · ")}
                    </Text>
                  )}
                </View>
                {!past &&
                  (rule ? (
                    <Pressable
                      onPress={() => {
                        haptics.tap();
                        onRemind(e.type, date);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${wasteLabel(e.type)} · ${rule.time}`}
                      hitSlop={6}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: RADIUS.well - 2,
                        backgroundColor: S.chip,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <BellIcon color={S.ink} size={12} />
                      <Text style={[TYPE.micro, NUMS, { color: S.ink }]}>{rule.time}</Text>
                    </Pressable>
                  ) : (
                    <RemindChip onPress={() => onRemind(e.type, date)} />
                  ))}
              </View>
            );
          })
        )}
      </SoftCard>

      {later.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {later.map(([ld, ids]) => {
            const dd = parseISODate(ld);
            return (
              <Pressable
                key={ld}
                onPress={() => {
                  haptics.select();
                  onSelect(ld);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${ids.map((id) => wasteLabel(id)).join(", ")}, ${weekdayLong(dd.getDay())} ${dd.getDate()}`}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: 10,
                  borderRadius: RADIUS.control,
                  backgroundColor: S.card,
                  borderWidth: HAIRLINE,
                  borderColor: S.line,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {ids.slice(0, 3).map((id) => (
                    <StreamMark key={id} color={ST[id].c} size={8} />
                  ))}
                </View>
                <Text style={[TYPE.caption, { color: S.ink, fontFamily: FONT.w700, marginTop: 6 }]} numberOfLines={1}>
                  {ids.map((id) => wasteLabel(id)).join(", ")}
                </Text>
                <Text style={[TYPE.cap, NUMS, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                  {weekdayShort(dd.getDay())} {dd.getDate()} {monthShort(dd.getMonth() + 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function RemindChip({ onPress }: { onPress: () => void }) {
  const { S } = useTheme();
  const { t } = useT();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={t("home.remind")}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: RADIUS.well - 2,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: S.ter,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <PlusIcon color={S.sec} size={11} />
      <Text style={[TYPE.micro, { color: S.sec }]}>{t("home.remind")}</Text>
    </Pressable>
  );
}
