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
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S } from "../../theme/colors";
import { CheckIcon } from "../icons/Icons";

interface ToastCtx {
  show: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const TOAST_DURATION = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMessage(msg);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
    ]).start();
    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMessage(null);
      });
    }, TOAST_DURATION);
  }, [opacity, translateY]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message !== null && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + 96,
            alignItems: "center",
          }}
        >
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: S.ink,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 99,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 6,
              maxWidth: "86%",
              opacity,
              transform: [{ translateY }],
            }}
          >
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
              <CheckIcon color="#fff" size={13} />
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 14.5,
                fontWeight: "700",
                letterSpacing: -0.2,
              }}
              numberOfLines={2}
            >
              {message}
            </Text>
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
