// First-launch onboarding — three swipeable steps that introduce scan,
// reminders, and the recycling-center map. Each step centers on a stylized
// phone-frame mockup that mimics the actual UI in miniature, so the value
// prop is concrete instead of abstract.
//
// Mockups are inline SVG/View compositions rather than image assets — keeps
// them crisp at any size, easy to retheme, and removes the asset pipeline.

import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST } from "../theme/colors";
import { BrandMark } from "../components/ui/BrandMark";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { BellIcon, PinIcon, ChevRIcon, CheckIcon } from "../components/icons/Icons";
import { LOCALES, type StringKey } from "../i18n";
import { useLocale, useT } from "../context/LocaleContext";
import { FlagIcon } from "../components/icons/Flags";

interface Props {
  onDone: () => void;
}

// Each step is identified by a key — copy is resolved through t() so a
// locale switch on step 0 instantly retranslates the remaining steps too.
const STEP_KEYS = ["language", "scan", "community", "reminders", "map", "welcome"] as const;

const SCREEN_W = Dimensions.get("window").width;

export function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [step, setStep] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    if (next < 0 || next > STEP_KEYS.length - 1) return;
    Animated.timing(translateX, {
      toValue: (step - next) * 40,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      translateX.setValue((next - step) * 40);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }).start();
    });
  };

  const stepRef = useRef(step);
  stepRef.current = step;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        // Slight rubber-band on drag so swipe feels responsive without
        // committing yet.
        translateX.setValue(g.dx * 0.3);
      },
      onPanResponderRelease: (_, g) => {
        const threshold = 60;
        if (g.dx < -threshold && stepRef.current < STEP_KEYS.length - 1) {
          goTo(stepRef.current + 1);
        } else if (g.dx > threshold && stepRef.current > 0) {
          goTo(stepRef.current - 1);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const isLast = step === STEP_KEYS.length - 1;
  const stepKey = STEP_KEYS[step];
  const title = t(`onboarding.${stepKey}.title` as StringKey);
  const body = t(`onboarding.${stepKey}.body` as StringKey);

  return (
    <View
      style={{
        flex: 1,
        // Match the rest of the app — the home/reminders/profile screens all
        // sit on this off-white. Keeps the onboarding visually continuous
        // with what the user lands on after "Get started".
        backgroundColor: "#F5F2F7",
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {/* Top bar — brand left, Skip right (hidden on last step). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 22,
          paddingTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BrandMark size={32} />
          <Text style={{ fontSize: 17, fontWeight: "800", color: S.ink, letterSpacing: -0.3 }}>
            Abfall
          </Text>
        </View>
        {!isLast && (
          <Pressable
            onPress={onDone}
            hitSlop={12}
            style={{ paddingVertical: 6, paddingHorizontal: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: S.sec }}>
              {t("common.skip")}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Mockup — swipeable, takes the upper half */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX }],
        }}
      >
        {step === 0 && <LanguageMockup />}
        {step === 1 && <ScanMockup />}
        {step === 2 && <CommunityMockup />}
        {step === 3 && <RemindersMockup />}
        {step === 4 && <MapMockup />}
        {step === 5 && <WelcomeMockup />}
      </Animated.View>

      {/* Copy block */}
      <View style={{ paddingHorizontal: 26, paddingBottom: 4 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: S.ink,
            letterSpacing: -0.7,
            lineHeight: 34,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14.5,
            color: S.sec,
            fontWeight: "500",
            textAlign: "center",
            lineHeight: 21,
            marginTop: 12,
          }}
        >
          {body}
        </Text>
      </View>

      {/* Dot pagination */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          alignSelf: "center",
          marginTop: 22,
          marginBottom: 22,
        }}
      >
        {STEP_KEYS.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 99,
                backgroundColor: i === step ? S.ink : "rgba(33,31,28,0.18)",
              }}
            />
          </Pressable>
        ))}
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 22 }}>
        <Pressable
          onPress={() => (isLast ? onDone() : goTo(step + 1))}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: S.ink,
            borderRadius: 99,
            paddingVertical: 17,
            shadowColor: S.ink,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 18,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: "#fff",
              letterSpacing: -0.2,
            }}
          >
            {isLast ? t("common.get_started") : t("common.next")}
          </Text>
          {isLast ? (
            <CheckIcon color="#fff" size={16} />
          ) : (
            <ChevRIcon color="#fff" size={12} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Phone frame helper ──────────────────────────────────────────────────────

function PhoneFrame({ children, width = 220, height = 320 }: {
  children: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 32,
        borderWidth: 3,
        borderColor: S.ink,
        backgroundColor: "#fff",
        overflow: "hidden",
        shadowColor: S.ink,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 10,
      }}
    >
      {/* Notch */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: width / 2 - 32,
          width: 64,
          height: 16,
          backgroundColor: S.ink,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          zIndex: 2,
        }}
      />
      <View style={{ flex: 1, paddingTop: 22 }}>{children}</View>
    </View>
  );
}

// ── Step 1: language picker ─────────────────────────────────────────────────
// Unlike the other steps this one is fully interactive — the user picks
// their language right here, and it takes effect immediately (the strings
// further into onboarding will render in that language once they're
// translated). The active locale persists through the LocaleProvider, so
// "Continue" needs no extra wiring.

function LanguageMockup() {
  const { locale, setLocale } = useLocale();
  const { t } = useT();

  return (
    <View
      style={{
        width: SCREEN_W - 44,
        alignItems: "stretch",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 8,
      }}
    >
      {LOCALES.map((l) => {
        const active = l.id === locale;
        return (
          <Pressable
            key={l.id}
            onPress={() => setLocale(l.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 16,
              borderWidth: 2,
              borderColor: active ? S.ink : "transparent",
              shadowColor: "rgb(150,118,96)",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 18,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FlagIcon locale={l.id} width={38} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: S.ink,
                  letterSpacing: -0.3,
                }}
              >
                {l.endonym}
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  color: S.sec,
                  marginTop: 2,
                  fontWeight: "500",
                }}
              >
                {t(`language.${l.id}` as StringKey)}
              </Text>
            </View>
            {active && (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  backgroundColor: S.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon color="#fff" size={13} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Step 2: scan mockup ─────────────────────────────────────────────────────
// A phone frame showing the camera viewfinder pointed at a paper calendar:
// four corner brackets frame the paper, a glowing scan beam sweeps across it,
// and a shutter button sits at the bottom. Reads as "scanning happening now"
// at a glance — the actual action the step is describing.

const BRACKET_SIZE = 22;
const BRACKET_STROKE = 3;
const BRACKET_RADIUS = 4;

function ScanCorners() {
  // Four absolute-positioned L-shapes wrapping the paper. We give each one
  // only the two edges + corner radius that face outward, which yields a
  // clean scanner-bracket silhouette.
  return (
    <>
      <View
        style={{
          position: "absolute",
          top: -10,
          left: -10,
          width: BRACKET_SIZE,
          height: BRACKET_SIZE,
          borderTopWidth: BRACKET_STROKE,
          borderLeftWidth: BRACKET_STROKE,
          borderTopLeftRadius: BRACKET_RADIUS,
          borderColor: "#fff",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          width: BRACKET_SIZE,
          height: BRACKET_SIZE,
          borderTopWidth: BRACKET_STROKE,
          borderRightWidth: BRACKET_STROKE,
          borderTopRightRadius: BRACKET_RADIUS,
          borderColor: "#fff",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -10,
          left: -10,
          width: BRACKET_SIZE,
          height: BRACKET_SIZE,
          borderBottomWidth: BRACKET_STROKE,
          borderLeftWidth: BRACKET_STROKE,
          borderBottomLeftRadius: BRACKET_RADIUS,
          borderColor: "#fff",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -10,
          right: -10,
          width: BRACKET_SIZE,
          height: BRACKET_SIZE,
          borderBottomWidth: BRACKET_STROKE,
          borderRightWidth: BRACKET_STROKE,
          borderBottomRightRadius: BRACKET_RADIUS,
          borderColor: "#fff",
        }}
      />
    </>
  );
}

function ScanMockup() {
  return (
    <View style={{ width: 290, height: 360, alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame width={230} height={340}>
        <View style={{ flex: 1, backgroundColor: "#1B1916" }}>
          {/* Faint camera-grid overlay so the dark area reads as "viewfinder",
              not a void. Two thin white lines split it into thirds. */}
          <View
            style={{
              position: "absolute",
              top: "33%",
              left: 12,
              right: 12,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: "66%",
              left: 12,
              right: 12,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />

          {/* Viewfinder area with the paper centered inside */}
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <View style={{ position: "relative" }}>
              {/* Paper calendar — slightly tilted so it reads as a physical
                  document being held under the camera */}
              <View
                style={{
                  width: 144,
                  height: 196,
                  backgroundColor: "#FAF6F1",
                  borderRadius: 3,
                  padding: 12,
                  transform: [{ rotate: "-2deg" }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: S.ink, letterSpacing: 0.1 }}>
                  Waste Calendar
                </Text>
                <Text style={{ fontSize: 7, fontWeight: "700", color: S.sec, marginTop: 1 }}>
                  2026
                </Text>
                <View style={{ marginTop: 10, gap: 4 }}>
                  {[112, 92, 100, 80, 96, 70, 88].map((w, i) => (
                    <View
                      key={i}
                      style={{
                        height: 5,
                        width: w,
                        backgroundColor: "rgba(33,31,28,0.18)",
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
                <View
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    flexDirection: "row",
                    gap: 3,
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: ST.papier.c }} />
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: ST.kehricht.c }} />
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: ST.gruengut.c }} />
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: ST.gruengut.c }} />
                </View>
              </View>

              {/* Scanner corner brackets — sit just outside the paper */}
              <ScanCorners />

              {/* Glowing horizontal scan beam — green for that classic
                  scanner feel. Shadow gives it a real glow on iOS; elevation
                  approximates on Android. */}
              <View
                style={{
                  position: "absolute",
                  left: -16,
                  right: -16,
                  top: "50%",
                  marginTop: -1,
                  height: 2,
                  backgroundColor: "#7CE9C0",
                  shadowColor: "#7CE9C0",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 10,
                }}
              />
            </View>
          </View>

          {/* Bottom shutter button — the standard camera affordance */}
          <View style={{ paddingBottom: 18, alignItems: "center" }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                borderWidth: 2.5,
                borderColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  backgroundColor: "#fff",
                }}
              />
            </View>
          </View>
        </View>
      </PhoneFrame>
    </View>
  );
}

// ── Step 2: community calendars mockup ──────────────────────────────────────
// Phone frame with a location pill at top and three community calendar cards
// below, each marked with the sharer's initial avatar. A small heart-style
// badge marks the one already in use, suggesting both browse and contribute.

function CommunityMockup() {
  const cards: { muni: string; year: string; sharer: string; initial: string; tint: string }[] = [
    { muni: "Old Town", year: "2026 · Zone A", sharer: "Anna · 124 users", initial: "A", tint: ST.papier.c },
    { muni: "Lakeside", year: "2026 · Zone B", sharer: "Marco · 88 users", initial: "M", tint: ST.gruengut.c },
    { muni: "Hillcrest", year: "2026 · all zones", sharer: "Lea · 53 users", initial: "L", tint: ST.altmetall.c },
  ];

  return (
    <View style={{ width: 260, alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame width={230} height={340}>
        <View style={{ padding: 12, flex: 1, backgroundColor: "#fff" }}>
          {/* Location pill — mirrors the home top bar */}
          <View
            style={{
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 99,
              backgroundColor: "#F4EFEA",
            }}
          >
            <PinIcon color={S.ink} size={10} />
            <Text style={{ fontSize: 10, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }}>
              Your area
            </Text>
          </View>

          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: S.ter,
              letterSpacing: 1,
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            COMMUNITY
          </Text>

          {/* Community calendar cards */}
          <View style={{ gap: 7 }}>
            {cards.map((c, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  backgroundColor: "#F4EFEA",
                  borderRadius: 11,
                  padding: 8,
                  paddingRight: 10,
                }}
              >
                {/* Avatar with initial */}
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    backgroundColor: c.tint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: S.ink }}>
                    {c.initial}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }}>
                    {c.muni}
                  </Text>
                  <Text style={{ fontSize: 8.5, fontWeight: "600", color: S.sec, marginTop: 1 }}>
                    {c.year}
                  </Text>
                  <Text style={{ fontSize: 8, fontWeight: "600", color: S.ter, marginTop: 1 }}>
                    {c.sharer}
                  </Text>
                </View>
                <ChevRIcon color={S.ter} size={9} />
              </View>
            ))}
          </View>
        </View>
      </PhoneFrame>

      {/* Floating "shared" chip in top-right — like the bell in reminders */}
      <View
        style={{
          position: "absolute",
          top: -8,
          right: -4,
          backgroundColor: S.ink,
          width: 54,
          height: 54,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: S.ink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
          elevation: 6,
          borderWidth: 4,
          borderColor: "#F5F2F7",
        }}
      >
        {/* Two overlapping circles to suggest "shared between people" */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 99,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: S.ink,
              marginRight: -5,
            }}
          />
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 99,
              backgroundColor: ST.gruengut.c,
              borderWidth: 2,
              borderColor: S.ink,
            }}
          />
        </View>
      </View>
    </View>
  );
}

// ── Step 3: reminders mockup ────────────────────────────────────────────────
// Stacked reminder cards inside a phone frame, with a bell pinned to the top.

function RemindersMockup() {
  const { wasteLabel } = useT();
  const reminders: { stream: "papier" | "kehricht" | "gruengut"; when: string; time: string }[] = [
    { stream: "papier", when: "1 day before", time: "18:00" },
    { stream: "kehricht", when: "Evening before", time: "20:00" },
    { stream: "gruengut", when: "Morning of", time: "07:00" },
  ];

  return (
    <View style={{ width: 260, alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame width={230} height={340}>
        <View style={{ padding: 14, flex: 1, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: S.ter, letterSpacing: 1 }}>
            REMINDERS
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: S.ink, marginTop: 2, letterSpacing: -0.3 }}>
            Your nudges
          </Text>

          <View style={{ marginTop: 14, gap: 8 }}>
            {reminders.map((r, i) => {
              const cc = ST[r.stream];
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: "#F4EFEA",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: cc.c,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <StreamGlyph stream={r.stream} size={18} color={cc.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: S.ink }}>
                      {wasteLabel(r.stream)}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: "600", color: S.sec, marginTop: 1 }}>
                      {r.when} · {r.time}
                    </Text>
                  </View>
                  {/* Mini switch */}
                  <View
                    style={{
                      width: 26,
                      height: 14,
                      borderRadius: 99,
                      backgroundColor: S.ink,
                      padding: 2,
                      alignItems: "flex-end",
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        backgroundColor: "#fff",
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </PhoneFrame>

      {/* Floating bell chip in top-right */}
      <View
        style={{
          position: "absolute",
          top: -8,
          right: 0,
          backgroundColor: S.ink,
          width: 54,
          height: 54,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: S.ink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
          elevation: 6,
          borderWidth: 4,
          borderColor: "#F5F2F7",
        }}
      >
        <BellIcon color="#fff" size={22} />
      </View>
    </View>
  );
}

// ── Step 3: map mockup ──────────────────────────────────────────────────────
// Phone frame with a stylized map showing colored pins. Filter chips at top
// hint at the category filtering on the real Map tab.

function MapMockup() {
  const pins: { x: number; y: number; color: string; ink: string }[] = [
    { x: 32, y: 38, color: ST.papier.c, ink: ST.papier.ink },
    { x: 110, y: 30, color: ST.altmetall.c, ink: ST.altmetall.ink },
    { x: 78, y: 80, color: ST.gruengut.c, ink: ST.gruengut.ink },
    { x: 140, y: 95, color: ST.kehricht.c, ink: ST.kehricht.ink },
    { x: 50, y: 120, color: ST.metall.c, ink: ST.metall.ink },
  ];

  return (
    <View style={{ width: 240, alignItems: "center", justifyContent: "center" }}>
      <PhoneFrame width={230} height={340}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Filter chips */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              padding: 10,
              paddingBottom: 4,
            }}
          >
            {[
              { label: "All", on: true },
              { label: "Paper", on: false },
              { label: "Glass", on: false },
            ].map((c, i) => (
              <View
                key={i}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 99,
                  backgroundColor: c.on ? S.ink : "#F0EAE4",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    color: c.on ? "#fff" : S.ink,
                  }}
                >
                  {c.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Map area */}
          <View
            style={{
              flex: 1,
              margin: 10,
              borderRadius: 12,
              backgroundColor: "#E8EFE8",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Faux roads */}
            <View
              style={{
                position: "absolute",
                top: 60,
                left: -20,
                right: -20,
                height: 4,
                backgroundColor: "rgba(255,255,255,0.7)",
                transform: [{ rotate: "-8deg" }],
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 100,
                left: 60,
                width: 4,
                height: 200,
                backgroundColor: "rgba(255,255,255,0.7)",
                transform: [{ rotate: "12deg" }],
              }}
            />
            {/* Pins */}
            {pins.map((p, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  backgroundColor: p.color,
                  borderWidth: 2,
                  borderColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: S.ink,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <PinIcon color={p.ink} size={11} />
              </View>
            ))}
            {/* You-are-here dot */}
            <View
              style={{
                position: "absolute",
                left: 95,
                top: 158,
                width: 14,
                height: 14,
                borderRadius: 99,
                backgroundColor: "#2D6FCE",
                borderWidth: 3,
                borderColor: "#fff",
              }}
            />
          </View>
        </View>
      </PhoneFrame>
    </View>
  );
}

// ── Step 5: welcome / all-set mockup ────────────────────────────────────────
// Final step before "Get started". Big centered BrandMark inside a phone
// frame, surrounded by confetti-style dots in the canonical stream colors
// — reads as "celebration, you're ready". A small check badge in the corner
// reinforces the "setup complete" feeling.

function WelcomeMockup() {
  // Confetti positions, chosen to scatter around the phone frame without
  // bunching. Colors cycle through the canonical waste streams so the
  // celebration is on-brand instead of generic.
  const confetti: { x: number; y: number; size: number; color: string; rot: string }[] = [
    { x: 8, y: 30, size: 10, color: ST.papier.c, rot: "12deg" },
    { x: 38, y: 8, size: 8, color: ST.gruengut.c, rot: "-18deg" },
    { x: 220, y: 22, size: 11, color: ST.kehricht.c, rot: "24deg" },
    { x: 250, y: 70, size: 9, color: ST.altmetall.c, rot: "-8deg" },
    { x: 12, y: 200, size: 9, color: ST.metall.c, rot: "32deg" },
    { x: 248, y: 240, size: 10, color: ST.papier.c, rot: "-22deg" },
    { x: 0, y: 290, size: 8, color: ST.gruengut.c, rot: "10deg" },
    { x: 232, y: 310, size: 11, color: ST.karton.c, rot: "-14deg" },
  ];

  return (
    <View style={{ width: 290, height: 360, alignItems: "center", justifyContent: "center" }}>
      {/* Confetti layer — sits behind the phone frame */}
      {confetti.map((c, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            borderRadius: 2,
            backgroundColor: c.color,
            transform: [{ rotate: c.rot }],
            opacity: 0.9,
          }}
        />
      ))}

      <PhoneFrame width={230} height={340}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#F5F2F7",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          {/* Soft halo behind the mark — gives the logo a "spotlight"
              feeling without needing a real gradient. */}
          <View
            style={{
              position: "absolute",
              top: 78,
              width: 150,
              height: 150,
              borderRadius: 99,
              backgroundColor: "#fff",
              shadowColor: S.ink,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 22,
              elevation: 6,
            }}
          />
          <View style={{ zIndex: 1 }}>
            <BrandMark size={96} />
          </View>
        </View>
      </PhoneFrame>

      {/* Floating check badge — same visual language as the bell/share chips
          on earlier steps, but green to signal completion. */}
      <View
        style={{
          position: "absolute",
          top: 6,
          right: 18,
          backgroundColor: ST.gruengut.c,
          width: 54,
          height: 54,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: S.ink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
          elevation: 6,
          borderWidth: 4,
          borderColor: "#F5F2F7",
        }}
      >
        <CheckIcon color={ST.gruengut.ink} size={22} />
      </View>
    </View>
  );
}
