// First-launch onboarding: four swipeable steps (language, getting a
// calendar, reminders, welcome). Each step pairs a simple illustration in the
// waste palette with one title and one line; the map is left for the tab bar.

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
import { BellIcon, CheckIcon } from "../components/icons/Icons";
import { LOCALES, type StringKey } from "../i18n";
import { useLocale, useT } from "../context/LocaleContext";
import { FlagIcon } from "../components/icons/Flags";
import { PillButton, QuietButton, OptionRow, ArtTile } from "../components/ui/sheet";
import { ScanArt, BrowseArt } from "../components/art/Art";
import { Recyclops } from "../components/Recyclops";
import { FONT, TYPE } from "../theme/type";

// Language chips share the tints used by the language picker sheet.
const LOCALE_TINT: Record<string, string> = {
  en: ST.papier.soft,
  de: ST.karton.soft,
  fr: ST.glas.soft,
  it: ST.gruengut.soft,
};

interface Props {
  onDone: () => void;
}

// Each step is identified by a key — copy is resolved through t() so a
// locale switch on step 0 instantly retranslates the remaining steps too.
const STEP_KEYS = ["language", "sorted", "reminders", "welcome"] as const;

// Title and body keys per step.
const STEP_COPY: Record<(typeof STEP_KEYS)[number], { title: StringKey; body: StringKey }> = {
  language: { title: "onboarding.language.title", body: "onboarding.language.body" },
  sorted: { title: "onboarding.sorted.title", body: "onboarding.sorted.body" },
  reminders: { title: "onboarding.reminders.title", body: "onboarding.reminders.body" },
  welcome: { title: "onboarding.welcome.title", body: "onboarding.welcome.body" },
};

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
  const title = t(STEP_COPY[stepKey].title);
  const body = t(STEP_COPY[stepKey].body);

  return (
    <View
      style={{
        flex: 1,
        // Match the rest of the app — the home/reminders/profile screens all
        // sit on this off-white. Keeps the onboarding visually continuous
        // with what the user lands on after "Get started".
        backgroundColor: S.bg,
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
          minHeight: 54,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BrandMark size={32} />
          <Text style={[TYPE.label, { fontFamily: FONT.w800, color: S.ink }]}>Abfall</Text>
        </View>
        {!isLast && (
          <View style={{ marginRight: -18 }}>
            <QuietButton label={t("common.skip")} onPress={onDone} />
          </View>
        )}
      </View>

      {/* Illustration — swipeable, takes the upper half */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX }],
        }}
      >
        {stepKey === "language" && <LanguageMockup />}
        {stepKey === "sorted" && <SortedArt />}
        {stepKey === "reminders" && <RemindersArt />}
        {stepKey === "welcome" && <WelcomeArt />}
      </Animated.View>

      {/* Copy block */}
      <View style={{ paddingHorizontal: 26, paddingBottom: 4 }}>
        <Text style={[TYPE.title, { color: S.ink, textAlign: "center" }]}>{title}</Text>
        <Text style={[TYPE.body, { color: S.sec, textAlign: "center", marginTop: 10 }]}>{body}</Text>
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
        <PillButton
          label={isLast ? t("common.get_started") : t("common.next")}
          onPress={() => (isLast ? onDone() : goTo(step + 1))}
          icon={isLast ? <CheckIcon color="#fff" size={16} /> : undefined}
        />
      </View>
    </View>
  );
}

// ── Step 1: language picker ─────────────────────────────────────────────────
// Unlike the other steps this one is interactive — the user picks
// their language right here, and it takes effect immediately (the strings
// further into onboarding will render in that language once they're
// translated). The active locale persists through the LocaleProvider, so
// "Continue" needs no extra wiring.

function LanguageMockup() {
  const { locale, setLocale } = useLocale();

  return (
    <View
      style={{
        width: SCREEN_W - 44,
        alignItems: "stretch",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 8,
      }}
    >
      {LOCALES.map((l) => (
        <OptionRow
          key={l.id}
          label={l.endonym}
          icon={<FlagIcon locale={l.id} width={26} />}
          iconBg={LOCALE_TINT[l.id] ?? ST.papier.soft}
          selected={l.id === locale}
          onPress={() => setLocale(l.id)}
        />
      ))}
    </View>
  );
}

// ── Step 2: your calendar, sorted ───────────────────────────────────────────
// The two ways to get a calendar, as the same tiles the add-calendar sheet
// uses. Illustrative only, so touches pass through to the swipe handler.

function SortedArt() {
  const { t } = useT();
  return (
    <View pointerEvents="none" style={{ width: SCREEN_W - 44, flexDirection: "row", gap: 12 }}>
      <ArtTile label={t("add.tile.scan")} bg={ST.kehricht.soft} onPress={() => {}}>
        <ScanArt />
      </ArtTile>
      <ArtTile label={t("add.tile.browse")} bg={ST.papier.soft} onPress={() => {}}>
        <BrowseArt />
      </ArtTile>
    </View>
  );
}

// ── Step 3: reminders ───────────────────────────────────────────────────────
// A big bell in a soft circle, with Recyclops standing beside it.

function RemindersArt() {
  return (
    <View style={{ width: 260, height: 240, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 190,
          height: 190,
          borderRadius: 99,
          backgroundColor: ST.karton.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BellIcon color={ST.karton.ink} size={92} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 4 }}>
        <Recyclops size={72} walkRange={0} />
      </View>
    </View>
  );
}

// ── Step 4: welcome ─────────────────────────────────────────────────────────
// Recyclops on his own, on a soft halo, ready to go.

function WelcomeArt() {
  return (
    <View style={{ width: 240, height: 240, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: 99,
          backgroundColor: ST.gruengut.soft,
        }}
      />
      <Recyclops size={140} walkRange={0} />
    </View>
  );
}
