// SVG flag icons for the language picker. Each flag renders at a 3:2 aspect
// ratio inside a rounded rect with a hairline border so it reads as a small
// physical card. Country choices follow the conventional "language → home
// country" mapping that Swiss users will recognize:
//   en → United Kingdom (the Union Jack is the universal "English" cue)
//   de → Germany
//   fr → France
//   it → Italy
//
// All four flags use approximate but recognizable palettes — exact Pantone
// values would be invisible at this size.

import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import type { Locale } from "../../i18n";

interface Props {
  locale: Locale;
  width?: number;
}

export function FlagIcon({ locale, width = 36 }: Props) {
  const height = Math.round(width * (2 / 3));
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 4,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: "rgba(0,0,0,0.12)",
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 60 40">
        {locale === "en" && <UnionJack />}
        {locale === "de" && <Germany />}
        {locale === "fr" && <France />}
        {locale === "it" && <Italy />}
      </Svg>
    </View>
  );
}

// Three horizontal bands: black, red, gold.
function Germany() {
  return (
    <>
      <Rect x={0} y={0} width={60} height={13.33} fill="#000000" />
      <Rect x={0} y={13.33} width={60} height={13.34} fill="#DD0000" />
      <Rect x={0} y={26.67} width={60} height={13.33} fill="#FFCE00" />
    </>
  );
}

// Tricolore — blue, white, red verticals.
function France() {
  return (
    <>
      <Rect x={0} y={0} width={20} height={40} fill="#0055A4" />
      <Rect x={20} y={0} width={20} height={40} fill="#FFFFFF" />
      <Rect x={40} y={0} width={20} height={40} fill="#EF4135" />
    </>
  );
}

// Tricolore — green, white, red verticals.
function Italy() {
  return (
    <>
      <Rect x={0} y={0} width={20} height={40} fill="#009246" />
      <Rect x={20} y={0} width={20} height={40} fill="#FFFFFF" />
      <Rect x={40} y={0} width={20} height={40} fill="#CE2B37" />
    </>
  );
}

// Simplified Union Jack. Layer order (bottom → top):
//   1. blue base
//   2. white saltire (diagonals)
//   3. red saltire (thinner diagonals on top of the white)
//   4. white cross (vertical + horizontal — overdraws the diagonals where
//      they'd pass through the center, which is correct for the real flag)
//   5. red cross (narrower, sitting on top of the white cross)
function UnionJack() {
  return (
    <>
      <Rect x={0} y={0} width={60} height={40} fill="#012169" />
      <Path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth={7} />
      <Path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth={2.5} />
      <Rect x={25} y={0} width={10} height={40} fill="#FFFFFF" />
      <Rect x={0} y={15} width={60} height={10} fill="#FFFFFF" />
      <Rect x={26.5} y={0} width={7} height={40} fill="#C8102E" />
      <Rect x={0} y={16.5} width={60} height={7} fill="#C8102E" />
    </>
  );
}
