// "Tonight": on the evening before a pickup (and the morning of it), a
// small checklist of the bins to put out. Ticking them is its own little
// reward; the ticks are kept per calendar and day on the device. For
// leaderboard players, putting everything out claims the day's points
// (or they claim for what they ticked); others get an invitation to join.

import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STREAM_ORDER, type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, TYPE } from "../../theme/type";
import { CheckIcon } from "../icons/Icons";
import { PillButton, SoftCard, StreamMark } from "../ui/sheet";
import { useToast } from "../ui/Toast";
import { usePlayer } from "../../context/PlayerContext";
import { checkIn, ApiError } from "../../services/api";
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

export function TonightCard({
  calendarId,
  events,
  onJoin,
}: {
  calendarId: string;
  events: CollectionEvent[];
  /** Opens the leaderboard sign-up (nickname + avatar). */
  onJoin?: () => void;
}) {
  const { S, ST } = useTheme();
  const { t, wasteLabel } = useT();
  const toast = useToast();
  const { player, applyCheckin } = usePlayer();
  const pickup = currentPickup(events);
  const key = pickup ? `abfall_putout:${calendarId}:${pickup.date}` : null;
  // Points claimed for this day (one check-in per day), kept on the device.
  const claimKey = pickup ? `abfall_checkin:${pickup.date}` : null;
  const [done, setDone] = useState<WasteStreamId[]>([]);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    setDone([]);
    setClaimed(null);
    if (!key || !claimKey) return;
    AsyncStorage.multiGet([key, claimKey])
      .then(([[, d], [, c]]) => {
        if (d) setDone(JSON.parse(d));
        if (c) setClaimed(Number(c));
      })
      .catch(() => {});
  }, [key, claimKey]);

  if (!pickup || !key) return null;
  const streams = STREAM_ORDER.filter((id) => pickup.streams.includes(id) && ST[id]);
  const count = streams.filter((id) => done.includes(id)).length;
  const allOut = count === streams.length;

  const claim = async (ticked: WasteStreamId[]) => {
    if (!player || claimed !== null || claiming || ticked.length === 0) return;
    setClaiming(true);
    try {
      const r = await checkIn({ date: pickup.date, streams: ticked, due: streams.length });
      applyCheckin(r);
      setClaimed(r.points.total);
      AsyncStorage.setItem(claimKey!, String(r.points.total)).catch(() => {});
      haptics.success();
      const parts = [t("lb.earned", { n: r.points.total })];
      if (r.points.milestone) parts.push(t("lb.milestone", { n: r.points.milestone }));
      else if (r.streak >= 2) parts.push(t("lb.streak_toast", { n: r.streak }));
      toast.show(parts.join(" · "));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already claimed from another install of this device.
        setClaimed(0);
        AsyncStorage.setItem(claimKey!, "0").catch(() => {});
      } else {
        toast.show(t("lb.offline"), { variant: "error" });
      }
    } finally {
      setClaiming(false);
    }
  };

  const toggle = (id: WasteStreamId) => {
    if (claimed !== null && done.includes(id)) return; // points are in; keep the ticks
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    const ticked = next.filter((x) => streams.includes(x));
    const nowAllOut = !done.includes(id) && ticked.length === streams.length;
    if (nowAllOut) haptics.success();
    else haptics.select();
    setDone(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
    // Everything out: the day's points, without an extra tap.
    if (nowAllOut) claim(ticked);
  };

  return (
    <SoftCard style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={[TYPE.label, { color: S.ink, fontSize: 17 }]}>
          {pickup.evening ? t("home.tonight") : t("home.this_morning")}
        </Text>
        <Text style={[TYPE.cap, { color: allOut || claimed !== null ? S.success : S.sec }]}>
          {claimed
            ? t("lb.claimed", { n: claimed })
            : allOut
              ? t("home.all_out")
              : t("home.out_count", { n: count, total: streams.length })}
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

      {/* Some out, not all: claim for those. */}
      {player && claimed === null && count > 0 && !allOut && (
        <PillButton
          label={t("lb.claim")}
          onPress={() => claim(streams.filter((id) => done.includes(id)))}
          loading={claiming}
          style={{ height: 44, marginTop: 6 }}
        />
      )}
      {/* Not on the leaderboard: what this could have been worth. */}
      {!player && allOut && onJoin && (
        <Pressable onPress={onJoin} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ marginTop: 6, opacity: pressed ? 0.6 : 1 })}>
          <Text style={[TYPE.caption, { color: S.ink, fontFamily: FONT.w700 }]}>{t("lb.join_hint")} →</Text>
        </Pressable>
      )}
    </SoftCard>
  );
}
