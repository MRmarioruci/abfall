// Pictures for the Reminders screen's empty states and quick-start tiles,
// drawn from the waste palette so they sit next to the calendar's colours.

import { View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { BellIcon, MoonIcon, SunIcon } from "../icons/Icons";

/** A bell in a soft disc, ringed by a few pickup-coloured dots. */
export function BellArt({ size = 112 }: { size?: number }) {
  const { S, ST } = useTheme();
  const disc = size * 0.72;
  const dots: { c: string; x: number; y: number; r: number }[] = [
    { c: ST.kehricht.c, x: 0.1, y: 0.22, r: 0.07 },
    { c: ST.papier.c, x: 0.84, y: 0.14, r: 0.09 },
    { c: ST.gruengut.c, x: 0.88, y: 0.74, r: 0.065 },
    { c: ST.karton.c, x: 0.06, y: 0.78, r: 0.08 },
  ];
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: disc,
          height: disc,
          borderRadius: disc,
          backgroundColor: S.onTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ transform: [{ rotate: "-12deg" }] }}>
          <BellIcon color={ST.papier.ink} size={disc * 0.52} />
        </View>
      </View>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: d.x * size - d.r * size,
            top: d.y * size - d.r * size,
            width: d.r * size * 2,
            height: d.r * size * 2,
            borderRadius: size,
            backgroundColor: d.c,
          }}
        />
      ))}
    </View>
  );
}

/** Moon or sun on a white disc, for the "Evening before" / "Morning of" tiles. */
export function WhenArt({ kind, ink }: { kind: "evening" | "morning"; ink: string }) {
  const { S } = useTheme();
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 64,
        backgroundColor: S.glass,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {kind === "evening" ? <MoonIcon color={ink} size={30} /> : <SunIcon color={ink} size={30} />}
    </View>
  );
}
