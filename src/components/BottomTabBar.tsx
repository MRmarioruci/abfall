import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { HomeIcon, PinIcon, PlusIcon, BellIcon, UserIcon } from "./icons/Icons";
import { useT } from "../context/LocaleContext";
import type { StringKey } from "../i18n";
import { FONT } from "../theme/type";
import { haptics } from "../lib/haptics";

interface Props {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onAddPress: () => void;
  /** Per-tab badge counts. A count > 0 renders a black pill with white text
   *  pinned to the top-right of the icon. Missing or 0 → no badge. */
  badges?: Record<string, number>;
}

type TabDef =
  | { id: string; label: StringKey; Icon: React.ComponentType<{ color: string; size?: number }>; center?: false }
  | { id: string; label: StringKey; center: true; Icon?: undefined };

const TABS: TabDef[] = [
  { id: "Home", label: "tabs.home", Icon: HomeIcon },
  { id: "Map", label: "tabs.map", Icon: PinIcon },
  { id: "add", label: "tabs.add", center: true },
  { id: "Reminders", label: "tabs.reminders", Icon: BellIcon },
  { id: "Profile", label: "tabs.profile", Icon: UserIcon },
];

export function BottomTabBar({ activeTab, onTabPress, onAddPress, badges }: Props) {
  const { S } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useT();

  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 18),
        left: 18,
        right: 18,
        height: 66,
        borderRadius: 99,
        backgroundColor: S.card,
        shadowColor: S.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {TABS.map((tab) => {
        if (tab.center) {
          return (
            <View key={tab.id} style={{ flex: 1, alignItems: "center" }}>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  onAddPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={t(tab.label)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  width: 60,
                  height: 60,
                  borderRadius: 21,
                  backgroundColor: S.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -24,
                  shadowColor: S.inkShadow,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.32,
                  shadowRadius: 24,
                  elevation: 12,
                  borderWidth: 4,
                  borderColor: S.card,
                })}
              >
                <PlusIcon color={S.onInk} size={26} />
              </Pressable>
            </View>
          );
        }

        const focused = activeTab === tab.id;
        const Icon = tab.Icon!;
        const badge = badges?.[tab.id] ?? 0;

        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              if (!focused) haptics.select();
              onTabPress(tab.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.label)}
            style={{
              flex: 1,
              height: 66,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View>
              <Icon color={focused ? S.ink : S.ter} size={25} />
              {badge > 0 && (
                <View
                  style={{
                    position: "absolute",
                    // Pinned to top-right of the icon. Negative offsets pull
                    // it half-off the icon edge so it reads as a chip rather
                    // than a label tucked inside.
                    top: -6,
                    right: -10,
                    minWidth: 17,
                    height: 17,
                    paddingHorizontal: 4.5,
                    borderRadius: 99,
                    backgroundColor: S.ink,
                    borderWidth: 1.5,
                    borderColor: S.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: FONT.w800,
                      color: S.onInk,
                      lineHeight: 12,
                    }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </Text>
                </View>
              )}
            </View>
            {focused && (
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  backgroundColor: S.ink,
                  marginTop: 4,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
