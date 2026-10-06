// "Switch language" sheet used by the Profile screen. The onboarding flow
// embeds a similar list inline (no sheet — it IS the screen) so this is
// kept dedicated to the in-app switcher; sharing the row markup as a
// separate component felt like premature abstraction for two callers.

import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { CheckIcon } from "./icons/Icons";
import { FlagIcon } from "./icons/Flags";
import { useLocale, useT } from "../context/LocaleContext";
import { LOCALES, type StringKey } from "../i18n";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LanguagePickerSheet({ visible, onClose }: Props) {
  const { locale, setLocale } = useLocale();
  const { t } = useT();
  const insets = useSafeAreaInsets();

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
          {t("language_picker.title")}
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
          {t("language_picker.body")}
        </Text>

        <View style={{ gap: 10 }}>
          {LOCALES.map((l) => {
            const active = l.id === locale;
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  setLocale(l.id);
                  onClose();
                }}
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
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FlagIcon locale={l.id} width={36} />
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
            {t("common.done")}
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
