import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S } from "../theme/colors";
import { BrandMark } from "../components/ui/BrandMark";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { LanguagePickerSheet } from "../components/LanguagePickerSheet";
import { ChevRIcon, XIcon, BellIcon } from "../components/icons/Icons";
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
import { LOCALES, type StringKey } from "../i18n";

type ConfirmKind = "onboarding" | "calendars" | "all" | null;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { reload } = useCalendars();
  const { locale } = useLocale();
  const { t } = useT();
  const toast = useToast();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [langSheet, setLangSheet] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2F7" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={{ alignItems: "center", paddingTop: 20, paddingBottom: 30 }}>
          <BrandMark size={64} />
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: S.ink,
              letterSpacing: -0.6,
              marginTop: 16,
            }}
          >
            Abfall
          </Text>
          <Text style={{ fontSize: 13, color: S.sec, fontWeight: "600", marginTop: 4 }}>
            {t("profile.version", { version: "1.0.0" })}
          </Text>
        </View>

        {/* Preferences */}
        <Text
          style={{
            paddingHorizontal: 22,
            fontSize: 12,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          {t("profile.preferences")}
        </Text>

        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 22 }}>
          <ActionRow
            title={t("profile.language_row")}
            description={`${currentLocaleMeta.endonym} · ${t(`language.${locale}` as StringKey)}`}
            icon={<FlagIcon locale={locale} width={28} />}
            onPress={() => setLangSheet(true)}
          />
        </View>

        {/* Data & privacy */}
        <Text
          style={{
            paddingHorizontal: 22,
            fontSize: 12,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          {t("profile.data_privacy")}
        </Text>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <ActionRow
            title={t("profile.replay_onboarding")}
            description={t("profile.replay_onboarding_desc")}
            icon={<BellIcon color={S.ink} size={18} />}
            onPress={() => setConfirm("onboarding")}
          />
          <ActionRow
            title={t("profile.clear_calendars")}
            description={t("profile.clear_calendars_desc")}
            icon={<XIcon color={S.ink} size={18} />}
            onPress={() => setConfirm("calendars")}
            destructive
          />
          <ActionRow
            title={t("profile.reset_everything")}
            description={t("profile.reset_everything_desc")}
            icon={<XIcon color={"#C8341A"} size={18} />}
            onPress={() => setConfirm("all")}
            destructive
          />
        </View>

        <Text
          style={{
            paddingHorizontal: 22,
            paddingTop: 18,
            fontSize: 12,
            color: S.ter,
            fontWeight: "500",
            lineHeight: 17,
          }}
        >
          {t("profile.data_note")}
        </Text>
      </ScrollView>

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

      <LanguagePickerSheet
        visible={langSheet}
        onClose={() => setLangSheet(false)}
      />
    </View>
  );
}

function ActionRow({
  title,
  description,
  icon,
  onPress,
  destructive = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        backgroundColor: S.card,
        borderRadius: 22,
        padding: 14,
        paddingRight: 14,
        shadowColor: "rgb(150,118,96)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: destructive ? "#FDECE7" : "#F4EFEA",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15.5,
            fontWeight: "800",
            color: destructive ? "#C8341A" : S.ink,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12.5,
            color: S.sec,
            marginTop: 2,
            fontWeight: "500",
            lineHeight: 17,
          }}
        >
          {description}
        </Text>
      </View>
      <ChevRIcon color={S.ter} size={13} />
    </Pressable>
  );
}
