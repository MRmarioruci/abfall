// The "⋯" button in the Home header and its small dropdown: the actions
// that used to sit next to the location pill (edit pickups, share), so the
// location can stay centred.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View, type HostInstance } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { HAIRLINE, RADIUS } from "../../theme/layout";
import { TYPE } from "../../theme/type";
import { CircBtn } from "../ui/CircBtn";
import { MoreIcon } from "../icons/Icons";
import { haptics } from "../../lib/haptics";

export interface HeaderMenuItem {
  label: string;
  icon: React.ReactNode;
  /** Soft tint behind the icon. */
  tint?: string;
  onPress: () => void;
}

export function HeaderMenu({ items, accessibilityLabel }: { items: HeaderMenuItem[]; accessibilityLabel: string }) {
  const { S, ST } = useTheme();
  const anchor = useRef<HostInstance>(null);
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const appear = useRef(new Animated.Value(0)).current;
  // iOS can't present a sheet while this overlay is still closing, so the
  // chosen action runs just after it's gone.
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (actionTimer.current) clearTimeout(actionTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    appear.setValue(0);
    const anim = Animated.timing(appear, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [open, appear]);

  const show = () => {
    // Place the menu right under the button; the button sits at the
    // header's right margin, so the menu hugs the same edge.
    anchor.current?.measureInWindow((_x, y, _w, h) => {
      setTop(y + h + 8);
      setOpen(true);
    });
  };

  return (
    <View ref={anchor} collapsable={false}>
      <CircBtn size={44} accessibilityLabel={accessibilityLabel} onPress={show}>
        <MoreIcon color={S.ink} size={20} />
      </CircBtn>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel={accessibilityLabel}>
          <Animated.View
            style={{
              position: "absolute",
              top,
              right: 16,
              minWidth: 210,
              padding: 6,
              borderRadius: RADIUS.card,
              backgroundColor: S.card,
              borderWidth: HAIRLINE,
              borderColor: S.line,
              // It floats over the page, so it keeps a soft shadow.
              shadowColor: S.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 10,
              opacity: appear,
              transform: [
                { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
                { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            }}
          >
            {items.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  haptics.select();
                  setOpen(false);
                  actionTimer.current = setTimeout(item.onPress, 220);
                }}
                accessibilityRole="menuitem"
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 50,
                  paddingHorizontal: 10,
                  borderRadius: RADIUS.well,
                  backgroundColor: pressed ? S.bg : "transparent",
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: item.tint ?? ST.papier.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </View>
                <Text style={[TYPE.label, { color: S.ink }]}>{item.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}
