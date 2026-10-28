// Building blocks for bottom sheets, so every sheet reads the same way:
// one title (plus at most one short line), pictures and colour over
// paragraphs, one primary action. See AddCalendarSheet for the reference.
//
// Guidelines:
//   • No all-caps eyebrows or field labels; the title says what this is.
//   • At most one line of supporting text. If it needs a paragraph, it
//     needs a picture or a better title instead.
//   • One primary PillButton. Secondary actions are a `secondary` pill or
//     a QuietButton; never three equal buttons.
//   • Choices are ArtTiles (2–3 big ones) or OptionRows (lists).
//   • Surfaces are white cards with a hairline edge, never shadows; the
//     waste colours appear as markers (icon wells, squares, bars).

import { View, Text, Pressable, ActivityIndicator, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { CheckIcon } from "../icons/Icons";
import { haptics } from "../../lib/haptics";
import { FONT, TYPE } from "../../theme/type";
import { HAIRLINE, RADIUS } from "../../theme/layout";

export function SheetHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  /** One short line: a place, a count, a status. */
  subtitle?: string;
  /** Optional element on the title's right (a close or edit button). */
  right?: React.ReactNode;
}) {
  const { S } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.6 }} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ fontSize: 14, color: S.sec, fontFamily: FONT.w600, marginTop: 4 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

/** A big tappable tile: a picture in a tinted well, and a short label. */
export function ArtTile({
  label,
  bg,
  onPress,
  children,
  style,
}: {
  label: string;
  /** Tint of the picture's well; a soft palette colour. */
  bg: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flex: 1,
          aspectRatio: 0.86,
          borderRadius: RADIUS.card,
          backgroundColor: S.card,
          borderWidth: HAIRLINE,
          borderColor: S.line,
          padding: 8,
          paddingBottom: 14,
          gap: 12,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <View style={{ flex: 1, borderRadius: RADIUS.control, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
      <Text style={[TYPE.label, { color: S.ink, paddingHorizontal: 8 }]}>{label}</Text>
    </Pressable>
  );
}

export function PillButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { S } = useTheme();
  const bg = variant === "primary" ? S.ink : variant === "danger" ? S.danger : S.card;
  const fg = variant === "secondary" ? S.ink : variant === "danger" ? S.white : S.onInk;
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: RADIUS.control,
          backgroundColor: bg,
          borderWidth: variant === "secondary" ? HAIRLINE : 0,
          borderColor: S.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 20,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ fontSize: 16, fontFamily: FONT.w800, color: fg, letterSpacing: 0.1 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** A text-only action for the least important choice (Skip, Unpublish…). */
export function QuietButton({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 12, paddingHorizontal: 18, opacity: pressed ? 0.55 : 1 })}
    >
      <Text style={{ fontSize: 15, fontFamily: FONT.w800, color: danger ? S.danger : S.sec }}>{label}</Text>
    </Pressable>
  );
}

/** One row of a list of choices: coloured icon chip, label, tick. */
export function OptionRow({
  label,
  subtitle,
  icon,
  iconBg,
  selected,
  onPress,
  right,
}: {
  label: string;
  /** One short line under the label: a place, a count. */
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  selected?: boolean;
  onPress: () => void;
  /** Replaces the tick, e.g. a count or a chevron. */
  right?: React.ReactNode;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 60,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.control,
        backgroundColor: S.card,
        borderWidth: selected ? 1.5 : HAIRLINE,
        borderColor: selected ? S.ink : S.line,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icon && (
        <View style={{ width: 38, height: 38, borderRadius: RADIUS.well, backgroundColor: iconBg ?? S.chip, alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[TYPE.label, { color: S.ink }]} numberOfLines={1}>
          {label}
        </Text>
        {!!subtitle && (
          <Text style={[TYPE.caption, { color: S.sec, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ??
        (selected && (
          <View style={{ width: 24, height: 24, borderRadius: 99, backgroundColor: S.ink, alignItems: "center", justifyContent: "center" }}>
            <CheckIcon color={S.onInk} size={12} />
          </View>
        ))}
    </Pressable>
  );
}

/** A white card edged with a hairline: the one container on every screen. */
export function SoftCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { S } = useTheme();
  return (
    <View
      style={[
        { borderRadius: RADIUS.card, backgroundColor: S.card, borderWidth: HAIRLINE, borderColor: S.line, padding: 18 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A tinted well for an illustration inside a card (the art is drawn on a
 *  soft palette tint, not on the white card). */
export function ArtWell({ tint, children, style }: { tint: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        { alignSelf: "stretch", borderRadius: RADIUS.control, backgroundColor: tint, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A small rounded square in a stream's colour: the marker for a bin. */
export function StreamMark({ color, size = 9 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color }} />;
}
