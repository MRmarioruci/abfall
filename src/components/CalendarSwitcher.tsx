import { useState } from "react";
import { View, Pressable } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { OptionRow, SheetHeader } from "./ui/sheet";
import { type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { CalIcon, CheckIcon, XIcon, ShareIcon } from "./icons/Icons";
import { useCalendars } from "../context/CalendarContext";
import { ShareSheet } from "./ShareSheet";
import type { SavedCalendar } from "../types/calendar";
import { useT } from "../context/LocaleContext";

// Each saved calendar gets its own palette colour so the list is easy to
// tell apart at a glance.
const CHIP_TINTS: WasteStreamId[] = ["papier", "karton", "kehricht", "gruengut", "glas", "textilien"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

function RowAction({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 99,
        backgroundColor: S.chip,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      {children}
    </Pressable>
  );
}

export function CalendarSwitcher({ visible, onClose }: Props) {
  const { S, ST } = useTheme();
  const { t } = useT();
  const { calendars, switchCalendar, removeCalendar } = useCalendars();
  const [shareTarget, setShareTarget] = useState<SavedCalendar | null>(null);

  const handleSwitch = async (id: string) => {
    await switchCalendar(id);
    onClose();
  };

  const sheetHeight = Math.min(140 + calendars.length * 100, 540);

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={sheetHeight}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
        <SheetHeader
          title={t("switcher.title")}
          subtitle={calendars.length > 0 ? t("switcher.subtitle") : t("switcher.empty")}
        />

        <View style={{ gap: 8 }}>
          {calendars.map((cal, i) => {
            const tint = ST[CHIP_TINTS[i % CHIP_TINTS.length]];
            return (
              <OptionRow
                key={cal.id}
                label={cal.title || cal.municipality}
                subtitle={[
                  cal.location || cal.municipality,
                  t(cal.events.length === 1 ? "share.dates_one" : "share.dates_other", { n: cal.events.length }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={<CalIcon color={tint.ink} size={20} />}
                iconBg={tint.soft}
                selected={cal.active}
                onPress={() => handleSwitch(cal.id)}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <RowAction label={t("switcher.share")} onPress={() => setShareTarget(cal)}>
                      <ShareIcon color={S.ink} size={15} />
                    </RowAction>
                    {cal.active ? (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 99,
                          backgroundColor: S.ink,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckIcon color={S.onInk} size={14} />
                      </View>
                    ) : (
                      <RowAction label={t("switcher.remove")} onPress={() => removeCalendar(cal.id)}>
                        <XIcon color={S.sec} size={14} />
                      </RowAction>
                    )}
                  </View>
                }
              />
            );
          })}
        </View>
      </View>

      <ShareSheet
        visible={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        calendar={shareTarget}
      />
    </SlideUpSheet>
  );
}
