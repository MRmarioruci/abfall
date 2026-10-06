// Picker for "where do reminders go?" — Abfall / Phone calendar / Google
// Calendar. Renders as a SlideUpSheet for consistency with the rest of
// the app's dialog patterns.
//
// Pressing Cancel at the bottom dismisses the sheet without changing
// the current destination — same as tapping the backdrop.

import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { CheckIcon, CalIcon, GoogleIcon } from "./icons/Icons";
import { BrandMark } from "./ui/BrandMark";
import {
  DESTINATIONS,
  type NotificationDestination,
} from "../services/notificationDelivery";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";

interface Props {
  visible: boolean;
  onClose: () => void;
  current: NotificationDestination;
  onPick: (next: NotificationDestination) => void;
}

const ICONS: Record<NotificationDestination, React.ReactNode> = {
  abfall: <BrandMark size={28} />,
  phone: <CalIcon color="#273913" size={20} />,
  google: <GoogleIcon size={22} />,
  none: <CalIcon color={S.sec} size={18} />,
};

const ICON_BG: Record<NotificationDestination, string> = {
  abfall: "#fff",
  phone: "#DCE9CE",
  google: "#fff",
  none: "#F0EAE4",
};

export function DestinationPicker({ visible, onClose, current, onPick }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useT();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: S.ink,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("destination_picker.title")}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: S.sec,
            fontWeight: "600",
            marginBottom: 18,
            lineHeight: 18,
          }}
        >
          {t("destination_picker.body")}
        </Text>

        <View style={{ gap: 10 }}>
          {DESTINATIONS.map((d) => {
            const active = d.id === current;
            return (
              <Pressable
                key={d.id}
                onPress={() => {
                  onPick(d.id);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: active ? S.ink : "transparent",
                  shadowColor: "rgb(150,118,96)",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 14,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    backgroundColor: ICON_BG[d.id],
                    alignItems: "center",
                    justifyContent: "center",
                    // Slight border on the white Google bg so the logo
                    // has a visible chip edge against the card.
                    borderWidth: d.id === "google" ? 1.5 : 0,
                    borderColor: S.line,
                  }}
                >
                  {ICONS[d.id]}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15.5,
                      fontWeight: "800",
                      color: S.ink,
                      letterSpacing: -0.3,
                    }}
                  >
                    {t(`destination.${d.id}.label` as StringKey)}
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
                    {t(`destination.${d.id}.desc` as StringKey)}
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

        {/* Cancel — dismiss without changing the current destination. */}
        <Pressable
          onPress={onClose}
          style={{
            marginTop: 14,
            marginBottom: Math.max(insets.bottom, 10),
            paddingVertical: 14,
            borderRadius: 99,
            backgroundColor: "#F0EAE4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: S.ink,
              letterSpacing: -0.2,
            }}
          >
            {t("common.cancel")}
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
