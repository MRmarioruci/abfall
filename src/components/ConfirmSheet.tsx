// In-app confirmation sheet. Replaces native `Alert.alert` for destructive
// actions so the UX stays consistent with the rest of the app: the shared
// sheet header, one pill for the action (red for "danger"), and a quiet
// Cancel underneath. Use for "are you sure?" prompts before clearing
// data, removing calendars, etc.

import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader } from "./ui/sheet";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** Label on the destructive button. Defaults to the localized "Confirm". */
  confirmLabel?: string;
  /** Visual treatment for the confirm button. "danger" tints it red. */
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  body,
  confirmLabel,
  variant = "default",
  onConfirm,
}: Props) {
  const { S } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 10) }}>
        <SheetHeader title={title} />
        {/* The body stays: it spells out what the action will undo. */}
        <Text
          style={{
            fontSize: 15,
            color: S.sec,
            lineHeight: 21,
            fontFamily: FONT.w600,
            marginTop: -8,
            marginBottom: 22,
          }}
        >
          {body}
        </Text>

        <PillButton
          label={confirmLabel ?? t("confirm.confirm")}
          variant={variant === "danger" ? "danger" : "primary"}
          onPress={handleConfirm}
        />
        <QuietButton label={t("common.cancel")} onPress={onClose} />
      </View>
    </SlideUpSheet>
  );
}
