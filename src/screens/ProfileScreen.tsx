import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { S, ST } from "../theme/colors";
import { BrandMark } from "../components/ui/BrandMark";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { LanguagePickerSheet } from "../components/LanguagePickerSheet";
import { SlideUpSheet } from "../components/ui/SlideUpSheet";
import { OptionRow, QuietButton, SheetHeader, DANGER } from "../components/ui/sheet";
import { Recyclops } from "../components/Recyclops";
import { ChevRIcon, XIcon, CalIcon } from "../components/icons/Icons";
import { FlagIcon } from "../components/icons/Flags";
import { useCalendars } from "../context/CalendarContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../components/ui/Toast";
import { clearAllCalendars } from "../services/storage";
import { resetOnboarded } from "../services/onboarding";
import { resetReminderNudge } from "../services/nudges";
import { resetDeviceId } from "../services/deviceId";
import { clearAllDeliveries } from "../services/notificationDelivery";
import { getRefreshClientId } from "../hooks/useGoogleAuth";
import { LOCALES } from "../i18n";
import { TYPE } from "../theme/type";

type ConfirmKind = "onboarding" | "calendars" | "all" | null;

// The language row's chip takes the same tint as in the language picker.
const LOCALE_TINT: Record<string, string> = {
  en: ST.papier.soft,
  de: ST.karton.soft,
  fr: ST.glas.soft,
  it: ST.gruengut.soft,
};

// Lets the reset sheet slide away before the confirmation opens; iOS
// can't present one Modal while another is still dismissing.
const SHEET_SWAP_MS = 320;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { reload } = useCalendars();
  const { locale } = useLocale();
  const { t } = useT();
  const toast = useToast();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [langSheet, setLangSheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);

  const currentLocaleMeta = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  const handleReplayOnboarding = async () => {
    await resetOnboarded();
    toast.show(t("profile.toast.replay"));
  };

  const handleClearCalendars = async () => {
    await clearAllCalendars();
    // clearAllDeliveries cancels OS notifications AND removes any
    // calendar-event sync (native + Google). Single call replaces the
    // previous chain.
    await clearAllDeliveries(getRefreshClientId()).catch(() => {});
    await reload();
    toast.show(t("profile.toast.cleared"));
  };

  const handleClearAll = async () => {
    await clearAllCalendars();
    await clearAllDeliveries(getRefreshClientId()).catch(() => {});
    await resetOnboarded();
    await resetReminderNudge();
    await resetDeviceId();
    await reload();
    toast.show(t("profile.toast.reset"));
  };

  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (swapTimer.current) clearTimeout(swapTimer.current);
  }, []);

  const openFromResetSheet = (kind: Exclude<ConfirmKind, null>) => {
    setResetSheet(false);
    swapTimer.current = setTimeout(() => setConfirm(kind), SHEET_SWAP_MS);
  };

  return (
    <View style={{ flex: 1, backgroundColor: S.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header, with Recyclops keeping the logo company */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 28 }}>
          {/* The logo alone sets the width, so it stays centred; Recyclops
              is pinned just to its right without taking up layout space. */}
          <View>
            <BrandMark size={64} />
            <View pointerEvents="none" style={{ position: "absolute", left: 64 + 6, bottom: -6 }}>
              <Recyclops size={52} walkRange={0} />
            </View>
          </View>
          <Text style={[TYPE.title, { color: S.ink, marginTop: 14 }]}>Abfall</Text>
          <Text style={[TYPE.caption, { color: S.sec, marginTop: 2 }]}>
            {t("profile.version", { version: Constants.expoConfig?.version ?? "1.0.0" })}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <OptionRow
            label={t("profile.language_row")}
            icon={<FlagIcon locale={locale} width={24} />}
            iconBg={LOCALE_TINT[locale] ?? ST.papier.soft}
            onPress={() => setLangSheet(true)}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[TYPE.caption, { color: S.sec }]} numberOfLines={1}>
                  {currentLocaleMeta.endonym}
                </Text>
                <ChevRIcon color={S.ter} size={13} />
              </View>
            }
          />
          <OptionRow
            label={t("profile.replay_onboarding")}
            icon={<ReplayGlyph color={ST.gruengut.ink} size={20} />}
            iconBg={ST.gruengut.soft}
            onPress={() => setConfirm("onboarding")}
            right={<ChevRIcon color={S.ter} size={13} />}
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <QuietButton
            label={t("profile.reset")}
            danger
            onPress={() => setResetSheet(true)}
          />
        </View>

        {/* Privacy note: a pictogram and one short line */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 22,
            marginTop: 18,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              backgroundColor: ST.metall.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockGlyph color={ST.metall.ink} size={15} />
          </View>
          <Text style={[TYPE.caption, { color: S.sec, flexShrink: 1 }]} numberOfLines={1}>
            {t("profile.data_note_short")}
          </Text>
        </View>
      </ScrollView>

      {/* The destructive actions, grouped behind one quiet "Reset…" */}
      <SlideUpSheet visible={resetSheet} onClose={() => setResetSheet(false)}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <SheetHeader title={t("profile.reset")} />
          <View style={{ gap: 8 }}>
            <OptionRow
              label={t("profile.clear_calendars")}
              icon={<CalIcon color={ST.kehricht.ink} size={20} />}
              iconBg={ST.kehricht.soft}
              onPress={() => openFromResetSheet("calendars")}
              right={<ChevRIcon color={S.ter} size={13} />}
            />
            <OptionRow
              label={t("profile.reset_everything")}
              icon={<XIcon color={DANGER} size={18} />}
              iconBg={ST.sonderabfall.soft}
              onPress={() => openFromResetSheet("all")}
              right={<ChevRIcon color={S.ter} size={13} />}
            />
          </View>
          <View style={{ marginTop: 6 }}>
            <QuietButton label={t("common.cancel")} onPress={() => setResetSheet(false)} />
          </View>
        </View>
      </SlideUpSheet>

      <ConfirmSheet
        visible={confirm === "onboarding"}
        onClose={() => setConfirm(null)}
        title={t("profile.confirm.replay.title")}
        body={t("profile.confirm.replay.body")}
        confirmLabel={t("profile.confirm.replay.label")}
        onConfirm={handleReplayOnboarding}
      />

      <ConfirmSheet
        visible={confirm === "calendars"}
        onClose={() => setConfirm(null)}
        title={t("profile.confirm.clear.title")}
        body={t("profile.confirm.clear.body")}
        confirmLabel={t("profile.confirm.clear.label")}
        variant="danger"
        onConfirm={handleClearCalendars}
      />

      <ConfirmSheet
        visible={confirm === "all"}
        onClose={() => setConfirm(null)}
        title={t("profile.confirm.reset.title")}
        body={t("profile.confirm.reset.body")}
        confirmLabel={t("profile.confirm.reset.label")}
        variant="danger"
        onConfirm={handleClearAll}
      />

      <LanguagePickerSheet visible={langSheet} onClose={() => setLangSheet(false)} />
    </View>
  );
}

/** A circular arrow: "play the intro again". */
function ReplayGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M4.5 4v4h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M10.5 9.2v5.6l4.4-2.8z" fill={color} />
    </Svg>
  );
}

/** A small padlock for the privacy note. */
function LockGlyph({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Rect x={5} y={10.5} width={14} height={10} rx={3} fill={color} />
      <Circle cx={12} cy={15.5} r={1.6} fill="#fff" />
    </Svg>
  );
}
