// The leaderboard on Home: this season's top five in your town, your own
// row if you're further down, and the way in ("See all", or "Join" for
// people who haven't picked a nickname yet).

import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { FONT, NUMS, TYPE } from "../../theme/type";
import { HAIRLINE, RADIUS } from "../../theme/layout";
import { ChevRIcon, TrophyIcon } from "../icons/Icons";
import { PillButton, SoftCard } from "../ui/sheet";
import { useT } from "../../context/LocaleContext";
import { usePlayer } from "../../context/PlayerContext";
import { getBoard, type Board } from "../../services/api";
import { haptics } from "../../lib/haptics";

const TOP = 5;

export function LeaderboardPreview({
  canton,
  municipality,
  onOpen,
}: {
  canton?: string;
  municipality?: string;
  /** Opens the full leaderboard (where joining happens too). */
  onOpen: () => void;
}) {
  const { S, ST } = useTheme();
  const { t } = useT();
  const { player } = usePlayer();
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    let alive = true;
    getBoard("town", { canton, municipality }, TOP)
      .then((b) => alive && setBoard(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [canton, municipality, player?.points, player?.nickname]);

  const rows = board?.rows ?? [];
  const top = rows.filter((r) => r.rank <= TOP).slice(0, TOP);
  const meBelow = rows.find((r) => r.me && r.rank > TOP);
  const tints = [ST.kehricht, ST.karton, ST.papier, ST.gruengut, ST.glas, ST.textilien, ST.metall];
  const place = board?.place.municipality ?? municipality;

  const open = () => {
    haptics.tap();
    onOpen();
  };

  const Row = ({ r, last }: { r: Board["rows"][number]; last: boolean }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: r.me ? RADIUS.well : 0,
        backgroundColor: r.me ? ST.karton.soft : "transparent",
        borderBottomWidth: last || r.me ? 0 : HAIRLINE,
        borderBottomColor: S.line,
      }}
    >
      <Text style={[NUMS, { width: 22, textAlign: "center", fontSize: 14, fontFamily: FONT.w800, color: r.rank <= 3 ? S.ink : S.sec }]}>
        {r.rank}
      </Text>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: tints[r.nickname.length % tints.length]!.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 15 }}>{r.avatar}</Text>
      </View>
      <Text style={[TYPE.label, { flex: 1, color: S.ink, fontSize: 14.5 }]} numberOfLines={1}>
        {r.me ? `${r.nickname} · ${t("lb.you")}` : r.nickname}
      </Text>
      {r.streak >= 2 && <Text style={[TYPE.cap, { color: S.sec }]}>🔥{r.streak}</Text>}
      <Text style={[NUMS, { fontSize: 14.5, fontFamily: FONT.w800, color: S.ink, minWidth: 36, textAlign: "right" }]}>{r.points}</Text>
    </View>
  );

  return (
    <View>
      {/* Header: what this is, and the way to the full board */}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${t("lb.preview_title")}, ${t("lb.see_all")}`}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 6,
          marginBottom: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <TrophyIcon color={S.ink} size={17} />
        <Text style={[TYPE.heading, { flex: 1, color: S.ink, fontSize: 18 }]} numberOfLines={1}>
          {t("lb.preview_title")}
          {place ? <Text style={{ color: S.sec, fontFamily: FONT.w600 }}> · {place}</Text> : null}
        </Text>
        <Text style={[TYPE.cap, { color: S.ink }]}>{t("lb.see_all")}</Text>
        <ChevRIcon color={S.sec} size={10} />
      </Pressable>

      <SoftCard style={{ padding: 6 }}>
        {top.length === 0 ? (
          <Text style={[TYPE.caption, { color: S.sec, padding: 10 }]}>{t("lb.empty")}</Text>
        ) : (
          top.map((r, i) => <Row key={`${r.rank}-${r.nickname}-${i}`} r={r} last={i === top.length - 1 && !meBelow} />)
        )}
        {meBelow && (
          <>
            <Text style={[TYPE.cap, { color: S.ter, textAlign: "center", paddingVertical: 2 }]}>···</Text>
            <Row r={meBelow} last />
          </>
        )}

        {/* Not on the board yet: the pitch and the button */}
        {!player && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
              paddingTop: 12,
              paddingHorizontal: 8,
              paddingBottom: 6,
              borderTopWidth: HAIRLINE,
              borderTopColor: S.line,
            }}
          >
            <Text style={[TYPE.caption, { flex: 1, color: S.ink }]}>{t("lb.preview_join")}</Text>
            <PillButton label={t("lb.join")} onPress={open} style={{ height: 38, paddingHorizontal: 16, borderRadius: RADIUS.well }} />
          </View>
        )}
      </SoftCard>
    </View>
  );
}
