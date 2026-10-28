// The BrandMark (same geometry as src/app/BrandMark.tsx), built in: the five
// stream bars stretch out one after another, then the leaf pops on top.
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ST } from "../../theme";

const COLS = [ST.papier.c, ST.karton.c, ST.kehricht.c, ST.gruengut.c, ST.metall.c];
const W = [20, 30, 24, 32, 18];

export const BrandMarkIn: React.FC<{ size: number; from: number }> = ({ size, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leaf = spring({ frame: frame - from - 11, fps, config: { damping: 9, stiffness: 160, mass: 0.6 } });
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: "visible" }}>
      {COLS.map((c, i) => {
        const s = spring({ frame: frame - from - i * 2, fps, config: { damping: 11, stiffness: 190, mass: 0.6 } });
        const w = W[i] * s;
        return <rect key={i} x={24 - w / 2} y={12.5 + i * 6 + (1 - Math.min(1, s)) * 3} width={Math.max(0, w)} height={4.6} rx={2.3} fill={c} opacity={Math.min(1, s * 2)} />;
      })}
      <g transform={`translate(34 13) scale(${leaf}) rotate(${(1 - leaf) * -60}) translate(-34 -13)`}>
        <path d="M44.5 2.5C38 2.5 33.5 6.7 33.5 13.5 40 13.5 44.5 9.3 44.5 2.5Z" fill={ST.gruengut.c} />
        <path d="M35.1 11.9C37.3 8.9 39.9 6.7 42.9 5.1" fill="none" stroke="#211F1C" strokeWidth={0.9} strokeLinecap="round" opacity={0.45} />
      </g>
    </svg>
  );
};
