// A decorative QR code that builds in: three finder squares pop first, then
// the data modules sweep in diagonally with a little overshoot. The pattern
// comes from a fixed seed, so every render draws the same code.
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { S } from "../../theme";
import { clamp } from "../../kit/kit";

const N = 25;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Mod = { r: number; c: number; jitter: number };

/** Data modules (everything except the finders, which are drawn whole). */
const buildModules = (seed: number): Mod[] => {
  const rnd = mulberry32(seed);
  const inFinder = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8);
  const inAlign = (r: number, c: number) => r >= 16 && r <= 20 && c >= 16 && c <= 20;
  const mods: Mod[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const j = rnd();
      if (inFinder(r, c)) continue;
      let on: boolean;
      if (inAlign(r, c)) {
        const d = Math.max(Math.abs(r - 18), Math.abs(c - 18));
        on = d !== 1;
      } else if (r === 6) on = c % 2 === 0;
      else if (c === 6) on = r % 2 === 0;
      else on = rnd() < 0.48;
      if (on) mods.push({ r, c, jitter: j });
    }
  }
  return mods;
};

const MODS = buildModules(0xab4a11);

const backOut = Easing.out(Easing.back(2.4));

export const QrCode: React.FC<{ size: number; start: number; color?: string }> = ({ size, start, color = S.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const finders: [number, number][] = [
    [0, 0],
    [0, N - 7],
    [N - 7, 0],
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`} shapeRendering="geometricPrecision">
      {finders.map(([r, c], i) => {
        const s = spring({ frame: frame - start - i * 3, fps, config: { damping: 11, stiffness: 180, mass: 0.7 } });
        const cx = c + 3.5;
        const cy = r + 3.5;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${s}) rotate(${(1 - s) * -40}) translate(${-cx} ${-cy})`}>
            <rect x={c + 0.5} y={r + 0.5} width={6} height={6} rx={1.4} fill="none" stroke={color} strokeWidth={1} />
            <rect x={c + 2} y={r + 2} width={3} height={3} rx={0.7} fill={color} />
          </g>
        );
      })}
      {MODS.map(({ r, c, jitter }, i) => {
        const delay = start + 7 + ((r + c) / (2 * N - 2)) * 16 + jitter * 4;
        const s = interpolate(frame, [delay, delay + 7], [0, 1], { ...clamp, easing: backOut });
        if (s <= 0) return null;
        const w = 0.92 * s;
        return <rect key={i} x={c + 0.5 - w / 2} y={r + 0.5 - w / 2} width={w} height={w} rx={0.16} fill={color} />;
      })}
    </svg>
  );
};
