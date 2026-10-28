// The leaderboard: this season's points in your town, canton or all of
// Switzerland. Players see their rank, points and weekly streak up top and
// tick tonight's bins right here; everyone else sees the board and an
// invitation to join with a nickname.

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { FONT, NUMS, TYPE } from "../theme/type";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { CircBtn } from "../components/ui/CircBtn";
import { BackIcon } from "../components/icons/Icons";
import { PillButton, SoftCard } from "../components/ui/sheet";
import { Segmented } from "../components/ui/Segmented";
import { Skeleton } from "../components/ui/Skeleton";
import { Recyclops } from "../components/Recyclops";
import { TonightCard } from "../components/home/TonightCard";
import { PlayerSetupSheet } from "../components/PlayerSetupSheet";
import { useT } from "../context/LocaleContext";
import { useCalendars } from "../context/CalendarContext";
import { usePlayer } from "../context/PlayerContext";
import { getBoard, type Board, type BoardScope } from "../services/api";
import { haptics } from "../lib/haptics";

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, monthShort } = useT();
  const { active } = useCalendars();
  const { player, refresh } = usePlayer();
  const [scope, setScope] = useState<BoardScope>("town");
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupVisible, setSetupVisible] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const b = await getBoard(scope, {
        canton: active?.canton || undefined,
        municipality: active?.municipality || undefined,
      });
      setBoard(b);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [scope, active?.canton, active?.municipality]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, player?.points, player?.nickname]);

  // "Oct–Dec · ends in 64 days"
  const seasonLine = (() => {
    const s = board?.season ?? player?.season;
    if (!s) return "";
    const q = Number(s.id.split("-Q")[1]);
    const range = `${monthShort(q * 3 - 2)}–${monthShort(q * 3)}`;
    const days = Math.max(0, Math.ceil((new Date(`${s.endsOn}T00:00:00`).getTime() - Date.now()) / 86_400_000));
    return t("lb.season", { range, n: days });
  })();

  const placeName =
    scope === "all" ? t("lb.scope_all") : scope === "canton" ? board?.place.canton ?? active?.canton ?? "" : board?.place.municipality ?? active?.municipality ?? "";
  const me = board?.me;
  const tints = [ST.kehricht, ST.karton, ST.papier, ST.gruengut, ST.glas, ST.textilien, ST.metall];

  return (
    <View style={{ flex: 1, backgroundColor: S.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refresh();
              load();
            }}
          />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <CircBtn size={44} onPress={onBack} accessibilityLabel={t("common.cancel")}>
            <BackIcon color={S.ink} size={20} />
          </CircBtn>
          {player && (
            <Pressable
              onPress={() => setSetupVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t("lb.edit")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingLeft: 6,
                paddingRight: 12,
                height: 40,
                borderRadius: RADIUS.control,
                backgroundColor: S.card,
                borderWidth: HAIRLINE,
                borderColor: S.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 20 }}>{player.avatar}</Text>
              <Text style={[TYPE.label, { color: S.ink, fontSize: 14 }]} numberOfLines={1}>
                {player.nickname}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={[TYPE.title, { color: S.ink }]}>{t("lb.title")}</Text>
          {!!seasonLine && <Text style={[TYPE.caption, { color: S.sec, marginTop: 4 }]}>{seasonLine}</Text>}
        </View>

        {/* You: rank, points, streak — or the invitation */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {player ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Stat label={t("lb.rank")} value={me ? `#${me.rank}` : "–"} sub={me ? (me.toNext ? t("lb.to_next", { n: me.toNext, rank: me.rank - 1 }) : t("lb.top")) : ""} />
              <Stat label={t("lb.points")} value={String(player.points)} />
              <Stat label={t("lb.streak")} value={`${player.streak}`} sub={player.streak >= 2 ? `🔥 ${t("lb.weeks")}` : t("lb.weeks")} />
            </View>
          ) : (
            <SoftCard style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.heading, { color: S.ink }]}>{t("lb.join_title")}</Text>
                <Text style={[TYPE.caption, { color: S.sec, marginTop: 4 }]}>{t("lb.join_body")}</Text>
                <PillButton
                  label={t("lb.join")}
                  onPress={() => setSetupVisible(true)}
                  style={{ height: 40, alignSelf: "flex-start", paddingHorizontal: 18, marginTop: 12, borderRadius: RADIUS.well }}
                />
              </View>
              <Recyclops size={70} walkRange={0} talk={false} />
            </SoftCard>
          )}
        </View>

        {/* Tonight's bins, checked in right here */}
        {active && (
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <TonightCard calendarId={active.id} events={active.events} onJoin={() => setSetupVisible(true)} />
          </View>
        )}

        {/* The board */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={[TYPE.cap, { flex: 1, color: S.ink }]} numberOfLines={1}>
            {placeName}
          </Text>
          <Segmented
            options={[
              { value: "town", label: t("lb.scope_town") },
              { value: "canton", label: t("lb.scope_canton") },
              { value: "all", label: t("lb.scope_all") },
            ]}
            value={scope}
            onChange={(v) => {
              haptics.select();
              setScope(v);
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading && !board ? (
            <Skeleton style={{ height: 300, borderRadius: RADIUS.card }} />
          ) : failed && !board ? (
            <SoftCard style={{ alignItems: "center" }}>
              <Text style={[TYPE.caption, { color: S.sec }]}>{t("lb.offline")}</Text>
            </SoftCard>
          ) : board && board.rows.length === 0 ? (
            <SoftCard style={{ alignItems: "center", gap: 8 }}>
              <Recyclops size={64} walkRange={0} talk={false} />
              <Text style={[TYPE.caption, { color: S.sec, textAlign: "center" }]}>{t("lb.empty")}</Text>
            </SoftCard>
          ) : (
            <SoftCard style={{ padding: 4 }}>
              {board?.rows.map((r, i) => (
                <View
                  key={`${r.rank}-${r.nickname}-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: r.me ? RADIUS.control : 0,
                    backgroundColor: r.me ? ST.karton.soft : "transparent",
                    borderTopWidth: i === 0 || r.me || board.rows[i - 1]?.me ? 0 : HAIRLINE,
                    borderTopColor: S.line,
                  }}
                >
                  <Text style={[NUMS, { width: 26, textAlign: "center", fontSize: 15, fontFamily: FONT.w800, color: r.rank <= 3 ? S.ink : S.sec }]}>
                    {r.rank}
                  </Text>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: RADIUS.well,
                      backgroundColor: tints[r.nickname.length % tints.length]!.soft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{r.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[TYPE.label, { color: S.ink, fontSize: 15 }]} numberOfLines={1}>
                      {r.nickname}
                    </Text>
                    {r.streak >= 2 && (
                      <Text style={[TYPE.cap, { color: S.sec, marginTop: 1 }]}>🔥 {t("lb.streak_row", { n: r.streak })}</Text>
                    )}
                  </View>
                  <Text style={[NUMS, { fontSize: 16, fontFamily: FONT.w800, color: S.ink }]}>{r.points}</Text>
                </View>
              ))}
            </SoftCard>
          )}
        </View>

        <Text style={[TYPE.caption, { color: S.sec, paddingHorizontal: 22, paddingTop: 16 }]}>{t("lb.how")}</Text>
      </ScrollView>

      <PlayerSetupSheet visible={setupVisible} onClose={() => setSetupVisible(false)} />
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { S } = useTheme();
  return (
    <SoftCard style={{ flex: 1, padding: 12 }}>
      <Text style={[TYPE.cap, { color: S.sec }]}>{label}</Text>
      <Text style={[NUMS, { fontSize: 26, fontFamily: FONT.w800, letterSpacing: -1, color: S.ink, marginTop: 2 }]}>{value}</Text>
      {!!sub && (
        <Text style={[TYPE.cap, { color: S.sec }]} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </SoftCard>
  );
}
