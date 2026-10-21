// Global in-app toast — replaces native Alert/ToastAndroid for transient
// confirmations like "Reminder saved". Provider lives at the app root; any
// screen calls `useToast().show("...")`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S } from "../../theme/colors";
import { CheckIcon } from "../icons/Icons";
import { haptics } from "../../lib/haptics";
import { FONT } from "../../theme/type";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  /** "success" (default) shows a tick, "error" a warning mark, "info" no icon. */
  variant?: ToastVariant;
  /** A button inside the toast, e.g. Undo after a delete. */
  action?: { label: string; onPress: () => void };
}

interface ToastCtx {
  show: (message: string, options?: ToastOptions) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const TOAST_DURATION = 2200;
// Long enough to reach for the action button.
const ACTION_DURATION = 4500;

interface ToastState {
  message: string;
  variant: ToastVariant;
  action?: ToastOptions["action"];
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback((message: string, options?: ToastOptions) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const variant = options?.variant ?? "success";
    if (variant === "error") haptics.warn();
    setToast({ message, variant, action: options?.action });
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
    ]).start();
    hideTimer.current = setTimeout(hide, options?.action ? ACTION_DURATION : TOAST_DURATION);
  }, [opacity, translateY, hide]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast !== null && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + 96,
            alignItems: "center",
          }}
        >
          <Animated.View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: toast.variant === "error" ? "#7A2414" : S.ink,
              paddingVertical: toast.action ? 8 : 12,
              paddingLeft: toast.variant === "info" ? 20 : 12,
              paddingRight: toast.action ? 8 : 18,
              borderRadius: 99,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 6,
              maxWidth: "90%",
              opacity,
              transform: [{ translateY }],
            }}
          >
            {toast.variant !== "info" && (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {toast.variant === "error" ? (
                  <Text style={{ color: "#fff", fontSize: 13, fontFamily: FONT.w900, lineHeight: 15 }}>!</Text>
                ) : (
                  <CheckIcon color="#fff" size={13} />
                )}
              </View>
            )}
            <Text
              style={{
                flexShrink: 1,
                color: "#fff",
                fontSize: 14.5,
                fontFamily: FONT.w700,
                letterSpacing: -0.2,
              }}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                onPress={() => {
                  if (hideTimer.current) clearTimeout(hideTimer.current);
                  haptics.tap();
                  toast.action!.onPress();
                  hide();
                }}
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 99,
                  backgroundColor: pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.18)",
                })}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: FONT.w800 }}>{toast.action.label}</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
