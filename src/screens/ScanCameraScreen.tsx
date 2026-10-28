import { useRef, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { CameraIcon, CheckIcon, FlashIcon, ImageIcon, QrIcon, XIcon } from "../components/icons/Icons";
import { openSharedLink } from "../lib/shareLinks";
import { haptics } from "../lib/haptics";
import type { ImageInput } from "../services/parseCalendar";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

interface Props {
  /** "paper" shoots calendar pages; "qr" looks for a shared calendar's QR
   *  code. Paper mode also opens a calendar QR code it happens to see. */
  mode?: "paper" | "qr";
  onClose: () => void;
  /** All pages the user captured or picked, in order. */
  onDone: (images: ImageInput[]) => void;
}

/**
 * Camera-first scan: shoot one or more pages (or pull them from the
 * gallery), then tick to read them all together.
 */
export function ScanCameraScreen({ mode = "paper", onClose, onDone }: Props) {
  const qr = mode === "qr";
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [pages, setPages] = useState<ImageInput[]>([]);
  // A short note over the hint ("not an Abfall calendar"), cleared after a moment.
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCode = useRef<string | null>(null);
  const opened = useRef(false);

  const flashNote = (text: string) => {
    setNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2600);
  };

  /** A calendar QR code: close the camera and offer to add it. */
  const tryOpen = (data: string) => {
    if (opened.current || !openSharedLink(data)) return false;
    opened.current = true;
    haptics.success();
    onClose();
    return true;
  };

  const handleBarcode = ({ data }: BarcodeScanningResult) => {
    if (opened.current || data === lastCode.current) return;
    lastCode.current = data;
    if (tryOpen(data)) return;
    // Paper mode ignores other codes (calendars often print a QR to the
    // town's website); QR mode says it isn't one of ours.
    if (qr) {
      haptics.warn();
      flashNote(t("add.qr.not_calendar"));
    }
  };

  // QR mode's gallery: read the code from a screenshot someone sent.
  const pickQr = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    try {
      const codes = await scanFromURLAsync(res.assets[0].uri, ["qr"]);
      if (codes.some((c) => tryOpen(c.data))) return;
    } catch (err) {
      console.warn("[scanCamera] scanFromURL failed:", err);
    }
    haptics.warn();
    flashNote(t("add.qr.none_found"));
  };

  const shoot = async () => {
    if (!ready || shooting) return;
    setShooting(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (photo) {
        setPages((prev) => [...prev, { uri: photo.uri, mimeType: "image/jpeg", width: photo.width, height: photo.height }]);
      }
    } catch (e) {
      console.warn("[scanCamera] takePicture failed:", e);
    } finally {
      setShooting(false);
    }
  };

  // No permission prompt: the system photo picker only hands over the
  // photos the user picks.
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (res.canceled || !res.assets.length) return;
    setPages((prev) => [
      ...prev,
      ...res.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType, width: a.width, height: a.height })),
    ]);
  };

  if (!permission) return <View style={st.root} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: S.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
        <RoundButton label={t("common.cancel")} onPress={onClose} light>
          <XIcon color={S.ink} size={16} />
        </RoundButton>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <View style={{ width: 84, height: 84, borderRadius: RADIUS.card, backgroundColor: qr ? ST.papier.soft : ST.kehricht.soft, alignItems: "center", justifyContent: "center" }}>
            {qr ? <QrIcon color={ST.papier.ink} size={38} /> : <CameraIcon color={ST.kehricht.ink} size={38} />}
          </View>
          <Text style={{ fontSize: 24, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.5 }}>
            {t("add.camera.permission_title")}
          </Text>
          <Text style={{ fontSize: 15, color: S.sec, fontFamily: FONT.w600, textAlign: "center" }}>
            {t("add.camera_permission_body")}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <PillButton label={t("add.camera.allow")} onPress={requestPermission} />
          <PillButton label={qr ? t("add.qr.from_photo") : t("add.scan.pick_gallery")} onPress={qr ? pickQr : pick} secondary />
        </View>
        {note && (
          <Text style={{ fontSize: 14, color: S.danger, fontFamily: FONT.w700, textAlign: "center", marginTop: 12 }}>{note}</Text>
        )}
        {pages.length > 0 && (
          <PillButton label={t("common.continue")} onPress={() => onDone(pages)} style={{ marginTop: 10 }} />
        )}
      </View>
    );
  }

  const hint = note
    ? note
    : qr
    ? t("add.qr.hint")
    : pages.length === 0
      ? t("add.camera.hint")
      : pages.length === 1
      ? t("add.camera.ready_one")
      : t("add.camera.ready_other", { n: pages.length });

  return (
    <View style={st.root}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setReady(true)}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarcode}
      />

      {/* Frame guide */}
      <View
        pointerEvents="none"
        style={[
          st.frame,
          qr
            ? { top: insets.top + 140, left: 56, right: 56, aspectRatio: 1 }
            : { top: insets.top + 84, bottom: insets.bottom + 236 },
        ]}
      >
        <View style={[st.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 18 }]} />
        <View style={[st.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 18 }]} />
        <View style={[st.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 18 }]} />
        <View style={[st.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 18 }]} />
      </View>

      {/* Top bar */}
      <View style={[st.top, { top: insets.top + 12 }]}>
        <RoundButton label={t("common.cancel")} onPress={onClose}>
          <XIcon color="#fff" size={16} />
        </RoundButton>
        <Text style={st.title}>{(qr ? t("add.qr.title") : t("add.scan.title")).toUpperCase()}</Text>
        <RoundButton label={t("add.camera.flash")} onPress={() => setTorch((v) => !v)} active={torch}>
          <FlashIcon color={torch ? CAM_INK : "#fff"} size={18} />
        </RoundButton>
      </View>

      {/* Bottom panel */}
      <View style={[st.bottom, { paddingBottom: insets.bottom + 28 }]}>
        <View style={st.hint}>
          <Text style={st.hintText}>{hint}</Text>
        </View>

        {qr ? (
          <View style={[st.controls, { justifyContent: "center", marginTop: 18 }]}>
            <Pressable
              onPress={pickQr}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: 48,
                paddingHorizontal: 18,
                borderRadius: 99,
                backgroundColor: "rgba(20,18,16,0.5)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <ImageIcon color="#fff" size={18} />
              <Text style={st.hintText}>{t("add.qr.from_photo")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ height: 78, alignSelf: "stretch" }}>
              {pages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 24, paddingTop: 8 }}>
                  {pages.map((p, i) => (
                    <View key={`${p.uri}-${i}`}>
                      <Image source={{ uri: p.uri }} style={st.thumb} />
                      <Pressable
                        onPress={() => setPages((prev) => prev.filter((_, j) => j !== i))}
                        accessibilityLabel={t("add.camera.remove")}
                        hitSlop={8}
                        style={st.thumbRemove}
                      >
                        <XIcon color={CAM_INK} size={9} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={st.controls}>
              <RoundButton label={t("add.scan.gallery")} onPress={pick} size={54}>
                <ImageIcon color="#fff" size={22} />
              </RoundButton>
              <Pressable
                onPress={shoot}
                disabled={!ready || shooting}
                accessibilityRole="button"
                accessibilityLabel={t("add.scan.take_photo")}
                style={({ pressed }) => [st.shutter, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                {shooting ? <ActivityIndicator color={CAM_INK} /> : <View style={st.shutterInner} />}
              </Pressable>
              {pages.length > 0 ? (
                <Pressable
                  onPress={() => onDone(pages)}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.continue")}
                  style={({ pressed }) => [st.done, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                >
                  <CheckIcon color={CAM_INK} size={22} />
                  <View style={st.badge}>
                    <Text style={st.badgeText}>{pages.length}</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={{ width: 54 }} />
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  children,
  size = 44,
  active,
  light,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  active?: boolean;
  light?: boolean;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 99,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#fff" : light ? S.chip : "rgba(20,18,16,0.5)",
        borderWidth: light ? 0 : 1,
        borderColor: "rgba(255,255,255,0.14)",
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {children}
    </Pressable>
  );
}

function PillButton({
  label,
  onPress,
  secondary,
  style,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  style?: object;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 54,
          borderRadius: RADIUS.control,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: secondary ? S.card : S.ink,
          borderWidth: secondary ? HAIRLINE : 0,
          borderColor: S.line,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16, fontFamily: FONT.w800, color: secondary ? S.ink : S.onInk }}>{label}</Text>
    </Pressable>
  );
}

// The camera view is always dark, whatever the app theme: its controls are
// fixed white with this ink on them.
const CAM_INK = "#211F1C";

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  frame: { position: "absolute", left: 28, right: 28 },
  corner: { position: "absolute", width: 34, height: 34, borderColor: "#fff" },
  top: { position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 12, fontFamily: FONT.w800, color: "#fff", letterSpacing: 1.4 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingTop: 16, backgroundColor: "rgba(0,0,0,0.45)" },
  hint: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: "rgba(20,18,16,0.65)" },
  hintText: { fontSize: 13, fontFamily: FONT.w700, color: "#fff" },
  thumb: { width: 52, height: 66, borderRadius: 10, backgroundColor: "#222", borderWidth: 2, borderColor: "#fff" },
  thumbRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 99, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", paddingHorizontal: 36, marginTop: 8 },
  shutter: { width: 78, height: 78, borderRadius: 99, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 62, height: 62, borderRadius: 99, backgroundColor: "#fff" },
  done: { width: 54, height: 54, borderRadius: 99, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 99, backgroundColor: "#E69A80", alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontFamily: FONT.w800, color: CAM_INK },
});
