import Svg, { G, Path, Rect, Circle } from "react-native-svg";
import { S, ST, type WasteStreamId } from "../../theme/colors";

interface Props {
  stream: WasteStreamId;
  size?: number;
  color?: string;
}

const SW = 3;

export function StreamGlyph({ stream, size = 96, color }: Props) {
  const col = color || ST[stream]?.ink || S.ink;

  const glyphs: Record<WasteStreamId, React.ReactNode> = {
    papier: (
      <G>
        <Path
          d="M22 14h26L60 26v48H22a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M48 14v12h12M30 40h22M30 50h22M30 30h10"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    karton: (
      <G>
        <Path
          d="M12 26 44 12l32 14v30L44 70 12 56V26Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M12 26 44 38m0 0 32-12M44 38v32"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    kehricht: (
      <G>
        <Path
          d="M18 26h52l-4 46a4 4 0 0 1-4 3.6H26a4 4 0 0 1-4-3.6L18 26Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M12 26h64M32 26v-7a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v7M34 38v26M54 38v26M44 38v26"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    gruengut: (
      <G>
        <Path
          d="M44 76c18-3 28-15 28-34 0-5-1-10-3-14-10 1.5-18 6-23 12-7 9-7 18-2 36Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M44 76c-3-14-10-22-21-26"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    metall: (
      <G>
        <Path
          d="M26 22h36v44a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V22Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M26 34h36M26 22c0-4 36-4 36 0"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    bio: (
      <G>
        <Path
          d="M44 76c18-3 28-15 28-34 0-5-1-10-3-14-10 1.5-18 6-23 12-7 9-7 18-2 36Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M44 76c-3-14-10-22-21-26"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    sperrgut: (
      <G>
        <Path
          d="M20 60h48M24 60V28h12v32M52 60V28h12v32"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M18 60v10h52V60"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    altmetall: (
      <G>
        <Path
          d="M26 22h36v44a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V22Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M26 34h36M26 22c0-4 36-4 36 0"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    textilien: (
      <G>
        <Path
          d="M30 20 44 26l14-6v10L44 36 30 30V20Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M30 30v38a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V30"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
    sonderabfall: (
      <G>
        <Path
          d="M44 18 16 66h56L44 18Z"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M44 38v16M44 60v2"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 88 88">
      {glyphs[stream]}
    </Svg>
  );
}
