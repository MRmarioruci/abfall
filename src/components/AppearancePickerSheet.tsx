// Light, Dark or follow the system. Same shape as the language picker.

import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { OptionRow, QuietButton, SheetHeader } from "./ui/sheet";
import { useT } from "../context/LocaleContext";
import { useTheme, type ThemeMode } from "../theme/ThemeContext";
import type { StringKey } from "../i18n";
import type { WasteStreamId } from "../theme/colors";

export const APPEARANCE_OPTIONS: { id: ThemeMode; labelKey: StringKey; tint: WasteStreamId }[] = [
  { id: "system", labelKey: "appearance.system", tint: "metall" },
  { id: "light", labelKey: "appearance.light", tint: "karton" },
  { id: "dark", labelKey: "appearance.dark", tint: "papier" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppearancePickerSheet({ visible, onClose }: Props) {
  const { t } = useT();
  const { ST, mode, setMode } = useTheme();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader title={t("appearance.title")} />

        <View style={{ gap: 8 }}>
          {APPEARANCE_OPTIONS.map((o) => (
            <OptionRow
              key={o.id}
              label={t(o.labelKey)}
              icon={<AppearanceGlyph mode={o.id} color={ST[o.tint].ink} size={20} />}
              iconBg={ST[o.tint].soft}
              selected={o.id === mode}
              onPress={() => {
                setMode(o.id);
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

/** Sun for light, moon for dark, a half-filled disc for "match system". */
export function AppearanceGlyph({ mode, color, size = 20 }: { mode: ThemeMode; color: string; size?: number }) {
  if (mode === "light") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={4.2} fill={color} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <Path
            key={a}
            d="M12 2.8v2.4"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            transform={`rotate(${a} 12 12)`}
          />
        ))}
      </Svg>
    );
  }
  if (mode === "dark") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 4a8 8 0 0 1 0 16Z" fill={color} />
    </Svg>
  );
}
