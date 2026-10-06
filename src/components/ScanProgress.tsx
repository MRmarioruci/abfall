import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, ActivityIndicator } from "react-native";
import { S } from "../theme/colors";
import { BrandMark } from "./ui/BrandMark";
import { CheckIcon } from "./icons/Icons";
import type { ParseStage } from "../services/parseCalendar";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";

const STEPS: Array<{ id: ParseStage; labelKey: StringKey }> = [
  { id: "preparing", labelKey: "scan.stage.preparing" },
  { id: "anchoring", labelKey: "scan.stage.anchoring" },
  { id: "understanding", labelKey: "scan.stage.understanding" },
  { id: "extracting", labelKey: "scan.stage.extracting" },
  { id: "mapping", labelKey: "scan.stage.mapping" },
];

// Rotating tips shown at the bottom of the screen while the scan runs.
// Keep these short, useful, and friendly. Order is randomised on each
// scan so the same one doesn't appear first every time.
const TIPS: StringKey[] = [
  "scan.tip.steady",
  "scan.tip.lighting",
  "scan.tip.multi_page",
  "scan.tip.fix_later",
  "scan.tip.flatten",
  "scan.tip.languages",
  "scan.tip.frame",
  "scan.tip.zones",
  "scan.tip.rules",
  "scan.tip.review",
];

function shuffleTips(): StringKey[] {
  const out = [...TIPS];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Props {
  stage: ParseStage;
  detail?: string;
}

export function ScanProgress({ stage, detail }: Props) {
  const { t } = useT();
  // Remember the most recent detail seen per stage so completed steps still
  // display their result ("Found 6 months: ...") instead of going silent.
  const [stageDetails, setStageDetails] = useState<Partial<Record<ParseStage, string>>>({});
  useEffect(() => {
    if (detail) {
      setStageDetails((prev) => ({ ...prev, [stage]: detail }));
    }
  }, [stage, detail]);

  const currentIndex = STEPS.findIndex((s) => s.id === stage);
  const progress = (currentIndex + 1) / STEPS.length;

  // Animated progress bar
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Gentle pulse on the brand mark
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  // Rotating tips — cycle every 5 seconds with a crossfade so the user has
  // something to read while the scan is in flight.
  const tipsRef = useRef(shuffleTips());
  const [tipIndex, setTipIndex] = useState(0);
  const tipOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % tipsRef.current.length);
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [tipOpacity]);

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 80, alignItems: "center" }}>
      {/* Brand mark */}
      <Animated.View style={{ transform: [{ scale }], marginBottom: 28 }}>
        <BrandMark size={64} />
      </Animated.View>

      <Text style={{ fontSize: 24, fontWeight: "800", color: S.ink, letterSpacing: -0.5, textAlign: "center" }}>
        {t("scan.progress.title")}
      </Text>
      <Text style={{ fontSize: 14, color: S.sec, fontWeight: "500", marginTop: 6, textAlign: "center" }}>
        {t("scan.progress.duration")}
      </Text>

      {/* Progress bar */}
      <View style={{ width: "100%", height: 6, borderRadius: 99, backgroundColor: "#EAE3DA", marginTop: 28, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 99,
            backgroundColor: S.ink,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }}
        />
      </View>

      {/* Steps list — kept tight to leave room for the tip line */}
      <View style={{ alignSelf: "stretch", marginTop: 36, gap: 14, marginBottom: 90 }}>
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          const isPending = i > currentIndex;

          return (
            <View key={step.id} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  backgroundColor: isDone ? S.ink : isActive ? "#fff" : "transparent",
                  borderWidth: isPending ? 1.5 : 0,
                  borderColor: isPending ? "#D8CFC4" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: isActive ? S.ink : "transparent",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isActive ? 0.18 : 0,
                  shadowRadius: 8,
                  elevation: isActive ? 3 : 0,
                }}
              >
                {isDone && <CheckIcon color="#fff" size={14} />}
                {isActive && <ActivityIndicator size="small" color={S.ink} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: isActive ? "800" : isDone ? "700" : "600",
                    color: isPending ? S.ter : S.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {t(step.labelKey)}
                </Text>
                {!isPending && stageDetails[step.id] && (
                  <Text style={{ fontSize: 12, color: S.sec, fontWeight: "500", marginTop: 2 }}>
                    {stageDetails[step.id]}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Rotating tip — plain centered text, no card */}
      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 32,
          right: 32,
          alignItems: "center",
          minHeight: 56,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.4,
          }}
        >
          {t("scan.progress.quick_tip")}
        </Text>
        <Animated.View style={{ opacity: tipOpacity, marginTop: 5 }}>
          <Text
            style={{
              fontSize: 12.5,
              color: S.sec,
              fontWeight: "600",
              lineHeight: 17,
              textAlign: "center",
            }}
          >
            {t(tipsRef.current[tipIndex])}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
