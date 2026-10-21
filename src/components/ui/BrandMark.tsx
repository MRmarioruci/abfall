import Svg, { Rect, Path } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  size?: number;
}

export function BrandMark({ size = 36 }: Props) {
  const { ST } = useTheme();
  const cols = [ST.papier.c, ST.karton.c, ST.kehricht.c, ST.gruengut.c, ST.metall.c];
  const w = [20, 30, 24, 32, 18];

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {cols.map((c, i) => (
        <Rect
          key={i}
          x={24 - w[i] / 2}
          y={12.5 + i * 6}
          width={w[i]}
          height={4.6}
          rx={2.3}
          fill={c}
        />
      ))}
      <Path
        d="M44.5 2.5C38 2.5 33.5 6.7 33.5 13.5 40 13.5 44.5 9.3 44.5 2.5Z"
        fill={ST.gruengut.c}
      />
      <Path
        d="M35.1 11.9C37.3 8.9 39.9 6.7 42.9 5.1"
        fill="none"
        stroke={ST.gruengut.onC}
        strokeWidth={0.9}
        strokeLinecap="round"
        opacity={0.45}
      />
    </Svg>
  );
}
