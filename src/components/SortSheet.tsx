// "Where does this go?": type an item or take a photo of it, and get the
// bin (or drop-off, or shop) with one practical tip. Answers come from
// POST /v1/sort, which knows the bins this calendar collects.

import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader, SoftCard } from "./ui/sheet";
import { StreamGlyph } from "./icons/StreamGlyph";
import { CameraIcon, PinIcon, SearchIcon } from "./icons/Icons";
import { Recyclops } from "./Recyclops";
import { useTheme } from "../theme/ThemeContext";
import { FONT, TYPE } from "../theme/type";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { useT } from "../context/LocaleContext";
import { haptics } from "../lib/haptics";
import { parseISODate } from "../lib/dates";
import { sortItem, type SortAnswer } from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import type { WasteStreamId } from "../theme/colors";
import type { CollectionEvent } from "../types/calendar";
import type { StringKey } from "../i18n";

const EXAMPLES: StringKey[] = ["sort.ex1", "sort.ex2", "sort.ex3", "sort.ex4", "sort.ex5", "sort.ex6"];

const DROPOFF_LABEL: Record<NonNullable<SortAnswer["dropoff"]>, StringKey> = {
  centre: "map.category.centre",
  glass: "map.category.glass",
  clothes: "map.category.clothes",
  plastic: "map.category.plastic",
  paper: "map.category.paper",
  generic: "map.category.generic",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The active calendar's events: which bins it has, and when they're next collected. */
  events: CollectionEvent[];
  municipality?: string;
  canton?: string;
  /** Open the map of collection points. */
  onOpenMap?: () => void;
}

export function SortSheet({ visible, onClose, events, municipality, canton, onOpenMap }: Props) {
  const { S, ST } = useTheme();
  const { t, locale, wasteLabel, weekdayShort, monthShort } = useT();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<(SortAnswer & { points: number }) | null>(null);
  const { addPoints } = usePlayer();
  const [error, setError] = useState(false);
  const lastAsk = useRef<{ query?: string; image?: string } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setAnswer(null);
    setError(false);
    setLoading(false);
  }, [visible]);

  const streams = Array.from(new Set(events.map((e) => e.type))) as WasteStreamId[];

  const ask = async (input: { query?: string; image?: string }) => {
    lastAsk.current = input;
    setLoading(true);
    setError(false);
    setAnswer(null);
    try {
      const a = await sortItem({ ...input, locale, streams, municipality, canton });
      haptics.success();
      setAnswer(a);
      addPoints(a.points);
    } catch (err) {
      console.warn("[sort] failed", err);
      haptics.warn();
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const askText = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setQuery(q);
    ask({ query: q });
  };

  const askPhoto = async () => {
    haptics.tap();
    let res: ImagePicker.ImagePickerResult;
    const cam = Platform.OS === "web" ? { granted: false } : await ImagePicker.requestCameraPermissionsAsync();
    if (cam.granted) {
      res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    }
    if (res.canceled || !res.assets[0]) return;
    try {
      const small = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 1024 } }], {
        format: SaveFormat.JPEG,
        compress: 0.7,
        base64: true,
      });
      setQuery("");
      ask({ image: small.base64! });
    } catch (err) {
      console.warn("[sort] photo prep failed", err);
      setError(true);
    }
  };

  // When the answer's bin is collected here, the next date it goes out.
  const nextPickup = (() => {
    if (!answer?.stream) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = events
      .filter((e) => e.type === answer.stream)
      .map((e) => parseISODate(e.date))
      .filter((d) => d >= today)
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  })();
  const collectedHere = !!answer?.stream && streams.includes(answer.stream);

  const whereTitle = (a: SortAnswer) => {
    if (a.where === "bin" && a.stream) return wasteLabel(a.stream);
    if (a.where === "shop") return t("sort.where_shop");
    if (a.where === "special") return t("sort.where_special");
    if (a.where === "dropoff") return a.dropoff ? `${t("sort.where_dropoff")} · ${t(DROPOFF_LABEL[a.dropoff])}` : t("sort.where_dropoff");
    return a.stream ? wasteLabel(a.stream) : t("sort.where_dropoff");
  };

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        <SheetHeader title={t("sort.title")} />

        {/* Ask: type, or take a photo */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              height: 50,
              paddingHorizontal: 14,
              borderRadius: RADIUS.control,
              backgroundColor: S.card,
              borderWidth: HAIRLINE,
              borderColor: S.line,
            }}
          >
            <SearchIcon color={S.sec} size={17} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => askText(query)}
              placeholder={t("sort.placeholder")}
              placeholderTextColor={S.ter}
              returnKeyType="search"
              autoFocus
              accessibilityLabel={t("sort.title")}
              style={{ flex: 1, fontSize: 16, fontFamily: FONT.w600, color: S.ink, paddingVertical: 10 }}
            />
          </View>
          <Pressable
            onPress={askPhoto}
            accessibilityRole="button"
            accessibilityLabel={t("sort.photo")}
            style={({ pressed }) => ({
              width: 50,
              height: 50,
              borderRadius: RADIUS.control,
              backgroundColor: S.ink,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <CameraIcon color={S.onInk} size={21} />
          </Pressable>
        </View>

        {/* Before asking: a few common ones to tap */}
        {!answer && !loading && !error && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {EXAMPLES.map((k) => (
              <Pressable
                key={k}
                onPress={() => {
                  haptics.tap();
                  askText(t(k));
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: RADIUS.well,
                  backgroundColor: S.card,
                  borderWidth: HAIRLINE,
                  borderColor: S.line,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={[TYPE.caption, { color: S.ink, fontFamily: FONT.w700 }]}>{t(k)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {loading && (
          <View style={{ alignItems: "center", paddingTop: 22, paddingBottom: 8, gap: 6 }}>
            <Recyclops size={70} walkRange={0} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={S.sec} />
              <Text style={[TYPE.caption, { color: S.sec }]}>{t("sort.thinking")}</Text>
            </View>
          </View>
        )}

        {error && !loading && (
          <View style={{ alignItems: "center", paddingTop: 18, gap: 4 }}>
            <Text style={[TYPE.caption, { color: S.danger, textAlign: "center" }]}>{t("sort.error")}</Text>
            {lastAsk.current && (
              <QuietButton label={t("common.try_again")} onPress={() => lastAsk.current && ask(lastAsk.current)} />
            )}
          </View>
        )}

        {answer && !loading && (
          <>
            <SoftCard style={{ marginTop: 16, padding: 14 }}>
              <Text style={[TYPE.cap, { color: S.sec }]}>{answer.item}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: RADIUS.control,
                    backgroundColor: answer.stream ? ST[answer.stream].c : S.chip,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {answer.stream ? (
                    <StreamGlyph stream={answer.stream} size={32} color={ST[answer.stream].onC} />
                  ) : (
                    <PinIcon color={S.ink} size={22} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[TYPE.heading, { color: S.ink }]} numberOfLines={2}>
                    {whereTitle(answer)}
                  </Text>
                  {answer.where === "bin" && (
                    <Text style={[TYPE.caption, { color: S.sec, marginTop: 2 }]} numberOfLines={1}>
                      {nextPickup
                        ? t("sort.next_pickup", {
                            date: `${weekdayShort(nextPickup.getDay())} ${nextPickup.getDate()} ${monthShort(nextPickup.getMonth() + 1)}`,
                          })
                        : !collectedHere
                          ? t("sort.not_collected")
                          : ""}
                    </Text>
                  )}
                </View>
              </View>
              {!!answer.tip && (
                <Text style={[TYPE.body, { color: S.ink, marginTop: 12 }]}>{answer.tip}</Text>
              )}
              {answer.points > 0 && (
                <Text style={[TYPE.cap, { color: S.success, marginTop: 10 }]}>{t("lb.learn", { n: answer.points })}</Text>
              )}
            </SoftCard>

            {onOpenMap && (answer.where === "dropoff" || (answer.where === "bin" && !collectedHere)) && (
              <PillButton
                label={t("sort.show_map")}
                variant="secondary"
                icon={<PinIcon color={S.ink} size={16} />}
                onPress={() => {
                  onClose();
                  onOpenMap();
                }}
                style={{ marginTop: 10 }}
              />
            )}
            <QuietButton
              label={t("sort.again")}
              onPress={() => {
                setAnswer(null);
                setQuery("");
              }}
            />
          </>
        )}
      </View>
    </SlideUpSheet>
  );
}
