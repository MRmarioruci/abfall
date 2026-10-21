import { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated Sheets are now content-driven — they grow to fit children
   *  and cap automatically at the visible viewport. Kept for callers that
   *  still pass it; ignored as a height cap. */
  height?: number;
  /** When true (default), wraps children in an internal ScrollView so
   *  content that exceeds the screen cap scrolls inside the sheet. Set
   *  false if the caller manages its own scroll layout (sticky footer etc). */
  scrollable?: boolean;
}

export function SlideUpSheet({
  visible,
  onClose,
  children,
  scrollable = true,
}: Props) {
  const { S } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Track keyboard so the sheet never extends past the visible viewport.
  // Without this, a tall sheet + keyboard on Android (adjustResize) clips
  // the top of the sheet off-screen.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0),
    );
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // The visible vertical area: full screen minus top safe area, the keyboard
  // when it's up, and an 8px breathing margin so the backdrop is still tappable.
  // This is the ONLY cap that exists — the sheet otherwise grows to fit content.
  const VIEWPORT_BUFFER = 8;
  const screenCap = Math.max(
    240,
    SCREEN_HEIGHT - Math.max(insets.top, 20) - keyboardHeight - VIEWPORT_BUFFER,
  );

  // Vertical space remaining inside the sheet for the scrollable area, after
  // the drag handle + bottom padding. The ScrollView maxes out here so content
  // scrolls only when it physically would not fit on screen; otherwise the
  // sheet grows to the content.
  const HANDLE_AREA_HEIGHT = 21; // paddingTop 10 + handle 5 + paddingBottom 6
  const bottomPad = insets.bottom + 8;
  const scrollMaxHeight = Math.max(120, screenCap - HANDLE_AREA_HEIGHT - bottomPad);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle),
            backgroundColor: S.scrim,
            opacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            // maxHeight as a safety net. The ScrollView's maxHeight is the
            // real constraint that makes content scroll when it would not
            // otherwise fit on screen.
            maxHeight: screenCap,
            backgroundColor: S.sheet,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: bottomPad,
            overflow: "hidden",
            transform: [{ translateY }],
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 99,
                backgroundColor: S.ter,
              }}
            />
          </View>
          {scrollable ? (
            <ScrollView
              // The key bit: explicit maxHeight tells the ScrollView its own
              // bounds so it can decide when to enable internal scrolling.
              // Without this it would either expand past the sheet (clip) or
              // collapse to content (no scroll).
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={{ paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
