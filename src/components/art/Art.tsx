// Small illustrations for sheets and empty states, drawn in the waste
// palette so they match the calendar.

import { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { ST } from "../../theme/colors";

// A paper calendar page inside scan brackets, with a scan line sweeping
// over it. The coloured dots are pickup days in the waste palette.
export const ART = 112;
const DOT_COLORS = [ST.kehricht.c, ST.papier.c, ST.karton.c, ST.gruengut.c];
const MARKED: Record<number, number> = { 2: 0, 6: 1, 9: 2, 13: 0, 15: 3, 18: 1, 22: 2, 25: 0 };

export function ScanArt() {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  return (
    <View style={{ width: ART, height: ART }}>
      <Svg width={ART} height={ART} viewBox="0 0 112 112">
        {/* Page */}
        <Rect x={24} y={20} width={64} height={74} rx={8} fill="#fff" />
        <Rect x={32} y={28} width={30} height={5} rx={2.5} fill={ST.kehricht.ink} opacity={0.75} />
        {Array.from({ length: 28 }, (_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const marked = MARKED[i];
          return (
            <Circle
              key={i}
              cx={33 + col * 7.6}
              cy={45 + row * 11}
              r={marked !== undefined ? 3 : 1.6}
              fill={marked !== undefined ? DOT_COLORS[marked] : "#E4DBD2"}
            />
          );
        })}
        {/* Scan brackets */}
        {[
          "M14 30V18a4 4 0 0 1 4-4h12",
          "M82 14h12a4 4 0 0 1 4 4v12",
          "M98 82v12a4 4 0 0 1-4 4H82",
          "M30 98H18a4 4 0 0 1-4-4V82",
        ].map((d) => (
          <Path key={d} d={d} stroke={ST.kehricht.ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          top: 22,
          height: 3,
          borderRadius: 99,
          backgroundColor: ST.kehricht.ink,
          opacity: 0.55,
          transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 66] }) }],
        }}
      />
    </View>
  );
}

// Shared calendars nearby: a map pin over two stacked calendar cards.
export function BrowseArt() {
  return (
    <Svg width={ART} height={ART} viewBox="0 0 112 112">
      <Rect x={20} y={46} width={60} height={46} rx={9} fill="#fff" opacity={0.6} transform="rotate(-8 50 69)" />
      <Rect x={32} y={44} width={60} height={46} rx={9} fill="#fff" />
      <Rect x={40} y={53} width={26} height={5} rx={2.5} fill={ST.papier.ink} opacity={0.75} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Circle key={i} cx={44 + i * 9.5} cy={70} r={i === 1 || i === 3 ? 3 : 1.7} fill={i === 1 ? ST.karton.c : i === 3 ? ST.gruengut.c : "#E1E2F0"} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Circle key={i} cx={44 + i * 9.5} cy={80} r={i === 2 ? 3 : 1.7} fill={i === 2 ? ST.kehricht.c : "#E1E2F0"} />
      ))}
      {/* Pin */}
      <Path
        d="M74 14c-9.4 0-16 7-16 15.6C58 41 74 54 74 54s16-13 16-24.4C90 21 83.4 14 74 14Z"
        fill={ST.papier.ink}
      />
      <Circle cx={74} cy={29.5} r={6} fill="#fff" />
    </Svg>
  );
}

// Sharing with neighbours: a calendar card with three little houses
// around it, linked by dotted lines.
export function NeighboursArt({ size = ART }: { size?: number }) {
  const house = (x: number, y: number, fill: string, roof: string) => (
    <>
      <Path d={`M${x} ${y + 10}l12-10 12 10v14a2 2 0 0 1-2 2H${x + 2}a2 2 0 0 1-2-2V${y + 10}Z`} fill={fill} />
      <Path d={`M${x - 2} ${y + 11}l14-12 14 12`} stroke={roof} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={x + 9} y={y + 15} width={6} height={9} rx={1.5} fill={roof} opacity={0.7} />
    </>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 112 112">
      <Path d="M56 56 22 30M56 56 90 30M56 56v32" stroke={ST.papier.ink} strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" opacity={0.45} />
      <Rect x={36} y={38} width={40} height={36} rx={8} fill="#fff" />
      <Rect x={42} y={45} width={18} height={4} rx={2} fill={ST.papier.ink} opacity={0.75} />
      {[0, 1, 2, 3].map((i) => (
        <Circle key={i} cx={45 + i * 7.5} cy={58} r={i === 1 ? 2.8 : 1.6} fill={i === 1 ? ST.kehricht.c : "#E1E2F0"} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Circle key={i} cx={45 + i * 7.5} cy={66} r={i === 2 ? 2.8 : 1.6} fill={i === 2 ? ST.gruengut.c : "#E1E2F0"} />
      ))}
      {house(10, 12, ST.karton.soft, ST.karton.ink)}
      {house(78, 12, ST.kehricht.soft, ST.kehricht.ink)}
      {house(44, 84, ST.gruengut.soft, ST.gruengut.ink)}
    </Svg>
  );
}
