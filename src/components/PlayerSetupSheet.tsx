// Join the leaderboard, or change how you appear on it: a nickname and an
// avatar, nothing else. Also where you leave it.

import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader } from "./ui/sheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { useTheme } from "../theme/ThemeContext";
import { FONT, TYPE } from "../theme/type";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { useT } from "../context/LocaleContext";
import { AVATARS, usePlayer } from "../context/PlayerContext";
import { useToast } from "./ui/Toast";
import { haptics } from "../lib/haptics";

export function PlayerSetupSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { S, ST } = useTheme();
  const { t } = useT();
  const toast = useToast();
  const { player, save, leave } = usePlayer();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNickname(player?.nickname ?? "");
    setAvatar(player?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
    setError(false);
  }, [visible, player?.nickname, player?.avatar]);

  const valid = /^[\p{L}\p{N} ._-]{2,20}$/u.test(nickname.trim());

  const handleSave = async () => {
    if (!valid) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      await save(nickname.trim(), avatar);
      haptics.success();
      onClose();
    } catch {
      setError(true);
      haptics.warn();
    } finally {
      setSaving(false);
    }
  };

  // Tints for the avatar wells, so the grid reads as colour.
  const tints = [ST.kehricht, ST.karton, ST.papier, ST.gruengut, ST.glas, ST.textilien];

  return (
    <>
      <SlideUpSheet visible={visible} onClose={onClose}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
          <SheetHeader title={player ? t("lb.edit") : t("lb.setup_title")} subtitle={player ? undefined : t("lb.join_body")} />

          <Text style={[TYPE.cap, { color: S.sec, marginBottom: 8 }]}>{t("lb.nickname")}</Text>
          <TextInput
            value={nickname}
            onChangeText={(v) => {
              setNickname(v);
              setError(false);
            }}
            placeholder={t("lb.nickname_ph")}
            placeholderTextColor={S.ter}
            maxLength={20}
            autoCorrect={false}
            accessibilityLabel={t("lb.nickname")}
            style={{
              height: 50,
              paddingHorizontal: 14,
              borderRadius: RADIUS.control,
              backgroundColor: S.card,
              borderWidth: error ? 1.5 : HAIRLINE,
              borderColor: error ? S.danger : S.line,
              fontSize: 17,
              fontFamily: FONT.w700,
              color: S.ink,
            }}
          />
          {error && <Text style={[TYPE.caption, { color: S.danger, marginTop: 6 }]}>{t("lb.nickname_bad")}</Text>}

          <Text style={[TYPE.cap, { color: S.sec, marginTop: 18, marginBottom: 8 }]}>{t("lb.avatar")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AVATARS.map((a, i) => {
              const on = a === avatar;
              return (
                <Pressable
                  key={a}
                  onPress={() => {
                    haptics.select();
                    setAvatar(a);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({
                    width: 50,
                    height: 50,
                    borderRadius: RADIUS.control,
                    backgroundColor: tints[i % tints.length]!.soft,
                    borderWidth: 2,
                    borderColor: on ? S.ink : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 24 }}>{a}</Text>
                </Pressable>
              );
            })}
          </View>

          <PillButton
            label={player ? t("lb.save") : t("lb.join")}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 22 }}
          />
          {player && (
            <QuietButton
              label={t("lb.leave")}
              danger
              onPress={() => {
                onClose();
                setTimeout(() => setConfirmLeave(true), 320);
              }}
            />
          )}
        </View>
      </SlideUpSheet>

      <ConfirmSheet
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={t("lb.leave_title")}
        body={t("lb.leave_body")}
        confirmLabel={t("lb.leave_confirm")}
        variant="danger"
        onConfirm={async () => {
          try {
            await leave();
          } catch {
            toast.show(t("lb.offline"), { variant: "error" });
          }
        }}
      />
    </>
  );
}
