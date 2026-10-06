// In-app confirmation sheet. Replaces native `Alert.alert` for destructive
// actions so the UX stays consistent with the rest of the app (rounded
// bottom sheet, custom typography, dark primary button vs. tinted
// destructive button). Use for "are you sure?" prompts before clearing
// data, removing calendars, etc.

import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S } from "../theme/colors";
import { SlideUpSheet } from "./ui/SlideUpSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** Label on the destructive button. Defaults to "Confirm". */
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
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const dangerColor = "#C8341A";
  const confirmBg = variant === "danger" ? dangerColor : S.ink;

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: S.ink,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14.5,
            color: S.sec,
            lineHeight: 21,
            fontWeight: "500",
            marginTop: 10,
            marginBottom: 24,
          }}
        >
          {body}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: Math.max(insets.bottom, 10) }}>
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 15,
              borderRadius: 18,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            style={{
              flex: 1.4,
              paddingVertical: 15,
              borderRadius: 18,
              backgroundColor: confirmBg,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: confirmBg,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SlideUpSheet>
  );
}
