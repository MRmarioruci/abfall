// Picker for "where do reminders go?" — Abfall / Phone calendar / Google
// Calendar. Renders as a SlideUpSheet for consistency with the rest of
// the app's dialog patterns.
//
// Cancel at the bottom dismisses the sheet without changing the current
// destination — same as tapping the backdrop.

import { View } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { OptionRow, QuietButton, SheetHeader } from "./ui/sheet";
import { type Palette, type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { CalIcon, GoogleIcon } from "./icons/Icons";
import { BrandMark } from "./ui/BrandMark";
import {
  DESTINATIONS,
  type NotificationDestination,
} from "../services/notificationDelivery";
import { useT } from "../context/LocaleContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  current: NotificationDestination;
  onPick: (next: NotificationDestination) => void;
}

function icon(id: NotificationDestination, ST: Palette["ST"]): React.ReactNode {
  switch (id) {
    case "abfall":
      return <BrandMark size={26} />;
    case "phone":
      return <CalIcon color={ST.gruengut.ink} size={20} />;
    case "google":
      return <GoogleIcon size={20} />;
    case "none":
      return <CalIcon color={ST.sonstiges.ink} size={18} />;
  }
}

const ICON_BG: Record<NotificationDestination, WasteStreamId> = {
  abfall: "kehricht",
  phone: "gruengut",
  google: "glas",
  none: "sonstiges",
};

export function DestinationPicker({ visible, onClose, current, onPick }: Props) {
  const { t } = useT();
  const { ST } = useTheme();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader title={t("destination_picker.title")} />

        <View style={{ gap: 8 }}>
          {DESTINATIONS.map((d) => (
            <OptionRow
              key={d.id}
              label={t(d.labelKey)}
              icon={icon(d.id, ST)}
              iconBg={ST[ICON_BG[d.id]].soft}
              selected={d.id === current}
              onPress={() => {
                onPick(d.id);
                onClose();
              }}
            />
          ))}
        </View>

        {/* Cancel — dismiss without changing the current destination. */}
        <View style={{ marginTop: 6 }}>
          <QuietButton label={t("common.cancel")} onPress={onClose} />
        </View>
      </View>
    </SlideUpSheet>
  );
}
