import { useState, useCallback } from "react";
import { View, Text, Pressable, Alert, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { CommunityCalendarsSheet } from "./CommunityCalendarsSheet";
import { S } from "../theme/colors";
import { CameraIcon, SearchIcon, BackIcon, ScanIcon, GlobeIcon, ChevRIcon, XIcon, PlusIcon } from "./icons/Icons";
import type { ImageInput } from "../services/parseCalendar";
import { useT } from "../context/LocaleContext";

const OPTIONS = [
  {
    id: "scan",
    labelKey: "add.option.scan.label" as const,
    descKey: "add.option.scan.desc" as const,
    Icon: ScanIcon,
    bg: "#F6DDD2",
    iconColor: "#4A1B10",
  },
  {
    id: "browse",
    labelKey: "add.option.browse.label" as const,
    descKey: "add.option.browse.desc" as const,
    Icon: GlobeIcon,
    bg: "#E5E6F6",
    iconColor: "#2C2E61",
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the staged batch of images when the user confirms the scan. */
  onScanConfirm?: (images: ImageInput[]) => void;
  /** Asks the parent to re-open this sheet — needed when the community
   *  browse sheet pivots into the scan flow. We can't reopen ourselves
   *  because the parent owns the `visible` prop. */
  onRequestReopen?: () => void;
}

function assetsToImageInputs(assets: ImagePicker.ImagePickerAsset[]): ImageInput[] {
  return assets.map((a) => ({
    uri: a.uri,
    mimeType: a.mimeType,
    width: a.width,
    height: a.height,
  }));
}

export function AddCalendarSheet({ visible, onClose, onScanConfirm, onRequestReopen }: Props) {
  const { t } = useT();
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  // Staged images: user can add several photos / gallery picks before
  // confirming. The whole batch goes to the parser in one go so it can
  // see the calendar across pages.
  const [staged, setStaged] = useState<ImageInput[]>([]);

  const reset = () => {
    setStaged([]);
    setShowScanOptions(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePress = (id: string) => {
    if (id === "scan") {
      setShowScanOptions(true);
    } else if (id === "browse") {
      // Close the parent picker, then open the community sheet. Mounting
      // both at once would stack two slide-up sheets which feels wrong.
      onClose();
      setShowCommunity(true);
    }
  };

  const handleTakePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("common.permission_needed"), t("add.camera_permission_body"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled || !result.assets.length) return;
    setStaged((prev) => [...prev, ...assetsToImageInputs(result.assets)]);
  }, [t]);

  // No permission prompt: the system photo picker (Android 13+, iOS 14+)
  // only hands over the photos the user picks.
  const handlePickGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled || !result.assets.length) return;
    setStaged((prev) => [...prev, ...assetsToImageInputs(result.assets)]);
  }, []);

  const handleRemove = (index: number) => {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (staged.length === 0) return;
    const batch = staged;
    reset();
    onClose();
    onScanConfirm?.(batch);
  };

  // The community sheet is rendered as a sibling so it survives the
  // AddCalendarSheet closing itself when the user picks "browse". It's
  // included in every return path below.
  const communitySheet = (
    <CommunityCalendarsSheet
      visible={showCommunity}
      onClose={() => setShowCommunity(false)}
      onScanCalendar={() => {
        // Pivot from community browse to scanning the user's own
        // calendar. Three steps:
        //   1. close community
        //   2. flip our internal mode to scan
        //   3. ask the parent (TabNavigator) to set visible=true again
        //      since picking "browse" earlier closed us out
        setShowCommunity(false);
        setShowScanOptions(true);
        onRequestReopen?.();
      }}
    />
  );

  if (showScanOptions) {
    return (
      <>
      {communitySheet}
      <SlideUpSheet visible={visible} onClose={handleClose}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Pressable
              onPress={() => { setStaged([]); setShowScanOptions(false); }}
              hitSlop={10}
              style={{
                width: 36,
                height: 36,
                borderRadius: 99,
                backgroundColor: "#F4EFEA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BackIcon color={S.ink} size={18} />
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: "800", color: S.ink, letterSpacing: -0.6 }}>
              {t("add.scan.title")}
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: S.sec, fontWeight: "500", marginBottom: 18 }}>
            {staged.length === 0
              ? t("add.scan.intro")
              : staged.length === 1
              ? t("add.scan.added_one")
              : t("add.scan.added_other", { n: staged.length })}
          </Text>

          {/* Thumbnail strip — only shown after at least one image is staged */}
          {staged.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 18 }}
              contentContainerStyle={{ gap: 10, paddingRight: 10 }}
            >
              {staged.map((img, i) => (
                <View key={`${img.uri}-${i}`} style={{ position: "relative" }}>
                  <Image
                    source={{ uri: img.uri }}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 16,
                      backgroundColor: "#F4EFEA",
                    }}
                  />
                  <Pressable
                    onPress={() => handleRemove(i)}
                    hitSlop={6}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 24,
                      height: 24,
                      borderRadius: 99,
                      backgroundColor: S.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <XIcon color="#fff" size={11} />
                  </Pressable>
                  <View
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 99,
                      backgroundColor: "rgba(33,31,28,0.78)",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>
                      {i + 1}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Action buttons — large when empty, compact "+ Add" row when populated */}
          {staged.length === 0 ? (
            <View style={{ gap: 14 }}>
              {[
                { onPress: handleTakePhoto, Icon: CameraIcon, bg: "#F6DDD2", iconColor: "#4A1B10", label: t("add.scan.take_photo"), desc: t("add.scan.take_photo_desc") },
                { onPress: handlePickGallery, Icon: SearchIcon, bg: "#E5E6F6", iconColor: "#2C2E61", label: t("add.scan.pick_gallery"), desc: t("add.scan.pick_gallery_desc") },
              ].map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={opt.onPress}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    backgroundColor: "#fff",
                    borderRadius: 26,
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    shadowColor: "rgb(150,118,96)",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.13,
                    shadowRadius: 20,
                    elevation: 4,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 19,
                      backgroundColor: opt.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <opt.Icon color={opt.iconColor} size={30} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: S.ink, letterSpacing: -0.3 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontSize: 13.5, color: S.sec, fontWeight: "600", marginTop: 3, lineHeight: 18 }}>
                      {opt.desc}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 99,
                      backgroundColor: "#F4EFEA",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevRIcon color={S.sec} size={12} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 13,
                    borderRadius: 99,
                    backgroundColor: "#fff",
                    borderWidth: 1.5,
                    borderColor: S.line,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <CameraIcon color={S.ink} size={17} />
                  <Text style={{ fontSize: 14, fontWeight: "800", color: S.ink }}>{t("add.scan.camera")}</Text>
                </Pressable>
                <Pressable
                  onPress={handlePickGallery}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 13,
                    borderRadius: 99,
                    backgroundColor: "#fff",
                    borderWidth: 1.5,
                    borderColor: S.line,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <PlusIcon color={S.ink} size={16} />
                  <Text style={{ fontSize: 14, fontWeight: "800", color: S.ink }}>{t("add.scan.gallery")}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 16,
                  borderRadius: 99,
                  backgroundColor: S.ink,
                  marginTop: 4,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <ScanIcon color="#fff" size={18} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.2 }}>
                  {staged.length === 1
                    ? t("add.scan.confirm_one")
                    : t("add.scan.confirm_other", { n: staged.length })}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </SlideUpSheet>
      </>
    );
  }

  return (
    <>
    {communitySheet}
    <SlideUpSheet visible={visible} onClose={handleClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: S.ink, letterSpacing: -0.6 }}>
          {t("add.title")}
        </Text>
        <Text style={{ fontSize: 14, color: S.sec, fontWeight: "500", marginTop: 6, marginBottom: 22 }}>
          {t("add.subtitle")}
        </Text>

        <View style={{ gap: 14 }}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => handlePress(opt.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                backgroundColor: "#fff",
                borderRadius: 26,
                paddingVertical: 18,
                paddingHorizontal: 18,
                shadowColor: "rgb(150,118,96)",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.13,
                shadowRadius: 20,
                elevation: 4,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 19,
                  backgroundColor: opt.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <opt.Icon color={opt.iconColor} size={30} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: S.ink, letterSpacing: -0.3 }}>
                  {t(opt.labelKey)}
                </Text>
                <Text style={{ fontSize: 13.5, color: S.sec, fontWeight: "600", marginTop: 3, lineHeight: 18 }}>
                  {t(opt.descKey)}
                </Text>
              </View>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 99,
                  backgroundColor: "#F4EFEA",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevRIcon color={S.sec} size={12} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </SlideUpSheet>
    </>
  );
}
