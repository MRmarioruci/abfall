// Picker for "where do reminders go?" — Abfall / Phone calendar / Google
// Calendar. Renders as a SlideUpSheet for consistency with the rest of
// the app's dialog patterns.
//
// Cancel at the bottom dismisses the sheet without changing the current
// destination — same as tapping the backdrop.

import { View } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { OptionRow, QuietButton, SheetHeader } from "./ui/sheet";
import { ST } from "../theme/colors";
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

const ICONS: Record<NotificationDestination, React.ReactNode> = {
  abfall: <BrandMark size={26} />,
  phone: <CalIcon color={ST.gruengut.ink} size={20} />,
  google: <GoogleIcon size={20} />,
  none: <CalIcon color={ST.sonstiges.ink} size={18} />,
};

const ICON_BG: Record<NotificationDestination, string> = {
  abfall: ST.kehricht.soft,
  phone: ST.gruengut.soft,
  google: ST.glas.soft,
  none: ST.sonstiges.soft,
};

export function DestinationPicker({ visible, onClose, current, onPick }: Props) {
  const { t } = useT();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader title={t("destination_picker.title")} />

        <View style={{ gap: 8 }}>
          {DESTINATIONS.map((d) => (
            <OptionRow
              key={d.id}
              label={t(d.labelKey)}
              icon={ICONS[d.id]}
              iconBg={ICON_BG[d.id]}
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
