import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Image, Pressable, StyleSheet } from "react-native";
import { S, ST } from "../theme/colors";
import type { ParseStage } from "../services/parseCalendar";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";
import { FONT } from "../theme/type";

const STEPS: Array<{ id: ParseStage; labelKey: StringKey }> = [
  { id: "preparing", labelKey: "scan.stage.preparing" },
  { id: "reading", labelKey: "scan.stage.extracting" },
  { id: "mapping", labelKey: "scan.stage.mapping" },
];

// One segment colour per step, from the waste palette.
const SEGMENT_COLORS = [ST.kehricht.c, ST.papier.c, ST.gruengut.c];

interface Props {
  stage: ParseStage;
  detail?: string;
  /** The page being read, shown with a scan line over it. */
  imageUri?: string;
  /** How many pages are being read together. */
  pageCount?: number;
  /** Stops the scan. */
  onCancel?: () => void;
}

export function ScanProgress({ stage, detail, imageUri, pageCount = 1, onCancel }: Props) {
  const { t } = useT();
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.id === stage));
  const step = STEPS[Math.min(currentIndex, STEPS.length - 1)];

  // Scan line sweeping up and down the photo.
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  // Cross-fade the step text when it changes.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [stage, detail, fade]);

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}>
      {/* Photo with scan line */}
      <View style={{ flex: 1, borderRadius: 28, overflow: "hidden", backgroundColor: "#E9E1D8" }}>
        {imageUri && <Image source={{ uri: imageUri }} style={{ flex: 1 }} resizeMode="cover" />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,242,247,0.18)" }]} />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 90,
            top: sweep.interpolate({ inputRange: [0, 1], outputRange: ["-12%", "88%"] }),
          }}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(230,154,128,0.22)" }} />
          <View style={{ height: 3, backgroundColor: ST.kehricht.c }} />
        </Animated.View>
        {pageCount > 1 && (
          <View style={{ position: "absolute", top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: "rgba(33,31,28,0.75)" }}>
            <Text style={{ fontSize: 12, fontFamily: FONT.w800, color: "#fff" }}>
              {t("add.camera.ready_other", { n: pageCount })}
            </Text>
          </View>
        )}
      </View>

      {/* Status */}
      <View style={{ paddingTop: 24, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {STEPS.map((s, i) => (
            <View
              key={s.id}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 99,
                backgroundColor: i <= currentIndex ? SEGMENT_COLORS[i] : "#E6DED6",
              }}
            />
          ))}
        </View>
        <Animated.View style={{ opacity: fade, marginTop: 18, minHeight: 58 }}>
          <Text style={{ fontSize: 22, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.5 }}>
            {t(step.labelKey)}
          </Text>
          {!!detail && (
            <Text style={{ fontSize: 14, color: S.sec, fontFamily: FONT.w600, marginTop: 4 }} numberOfLines={2}>
              {detail}
            </Text>
          )}
        </Animated.View>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => ({ alignSelf: "center", marginTop: 14, paddingVertical: 8, paddingHorizontal: 18, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 15, fontFamily: FONT.w800, color: S.sec }}>{t("common.cancel")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
