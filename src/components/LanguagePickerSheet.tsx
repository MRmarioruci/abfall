// "Switch language" sheet used by the Profile screen. The onboarding flow
// embeds a similar list inline (no sheet — it IS the screen) so this is
// kept dedicated to the in-app switcher.

import { View } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { OptionRow, QuietButton, SheetHeader } from "./ui/sheet";
import { type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { FlagIcon } from "./icons/Flags";
import { useLocale, useT } from "../context/LocaleContext";
import { LOCALES, type Locale } from "../i18n";

// A soft tint behind each flag so the list reads as colour, not grey.
const CHIP_BG: Record<Locale, WasteStreamId> = {
  en: "papier",
  de: "karton",
  fr: "glas",
  it: "gruengut",
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LanguagePickerSheet({ visible, onClose }: Props) {
  const { locale, setLocale } = useLocale();
  const { t } = useT();
  const { ST } = useTheme();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader title={t("language_picker.title")} />

        <View style={{ gap: 8 }}>
          {LOCALES.map((l) => (
            <OptionRow
              key={l.id}
              label={l.endonym}
              icon={<FlagIcon locale={l.id} width={24} />}
              iconBg={ST[CHIP_BG[l.id]].soft}
              selected={l.id === locale}
              onPress={() => {
                setLocale(l.id);
                onClose();
              }}
            />
          ))}
        </View>

        <View style={{ marginTop: 6 }}>
          <QuietButton label={t("common.done")} onPress={onClose} />
        </View>
      </View>
    </SlideUpSheet>
  );
}
