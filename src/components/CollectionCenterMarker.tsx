import { memo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect, G } from "react-native-svg";
import type { CenterCategory } from "../types/collectionCenters";

// Map pins keep these colours (with a white ring) in both themes: they sit
// on the map tiles, not on the app surface, and read on light and dark maps.
const CATEGORY_COLORS: Record<CenterCategory, string> = {
  centre: "#4A5568",   // slate
  glass: "#38A169",    // green
  clothes: "#9F7AEA",  // purple
  plastic: "#D69E2E",  // yellow/amber
  paper: "#3182CE",    // blue
  generic: "#718096",  // grey
};

interface IconProps {
  color: string;
  size?: number;
}

function sw(w = 2) {
  return {
    fill: "none",
    strokeWidth: w,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function CentreIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 21V10l9-7 9 7v11" stroke={color} {...sw(2.2)} />
      <Path d="M9 21V14h6v7" stroke={color} {...sw(2.2)} />
    </Svg>
  );
}

function GlassIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 3h6l2 8c0 3-2.5 6-5 6s-5-3-5-6l2-8Z" stroke={color} {...sw(2)} />
      <Path d="M9 7h6" stroke={color} {...sw(2)} />
    </Svg>
  );
}

function ClothesIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 4l3 3h4l3-3c1.5.5 3 2 3 2l-2 4v11H6V10L4 6s1.5-1.5 3-2Z"
        stroke={color}
        {...sw(2)}
      />
    </Svg>
  );
}

function PlasticIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={8} y={2} width={8} height={3} rx={1} stroke={color} {...sw(2)} />
      <Path d="M7 5h10l-1 14c0 1-1 2-2 2h-4c-1 0-2-1-2-2L7 5Z" stroke={color} {...sw(2)} />
    </Svg>
  );
}

function PaperIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" stroke={color} {...sw(2)} />
      <Path d="M14 3v6h6M14 3l6 6" stroke={color} {...sw(2)} />
    </Svg>
  );
}

function GenericIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G stroke={color} {...sw(2)}>
        <Path d="M7 6l3-5 7 4-3 5z" />
        <Path d="M20 10v7l-6 2-3-5 6-2z" />
        <Path d="M4 17v-7l6-2 3 5-6 2z" />
      </G>
    </Svg>
  );
}

const ICONS: Record<CenterCategory, React.ComponentType<IconProps>> = {
  centre: CentreIcon,
  glass: GlassIcon,
  clothes: ClothesIcon,
  plastic: PlasticIcon,
  paper: PaperIcon,
  generic: GenericIcon,
};

interface Props {
  category: CenterCategory;
  size?: number;
}

export const CollectionCenterMarker = memo(function CollectionCenterMarker({
  category,
  size = 32,
}: Props) {
  const Icon = ICONS[category];
  const color = CATEGORY_COLORS[category];
  return (
    <View
      collapsable={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon color="#fff" size={Math.round(size * 0.4)} />
    </View>
  );
});

export { CATEGORY_COLORS };
