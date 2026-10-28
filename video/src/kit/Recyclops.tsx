// Recyclops for the film: the app's rig (../app/rig.ts) drawn as plain SVG
// and driven by the frame instead of Reanimated. Breathing, blinking, the
// walk cycle, arm swing and the leaf's sway are automatic; scenes animate
// the rest through `pose`, `x`, `y`, `lean` and `back`.

import { useCurrentFrame } from "remotion";
import { REST_POSE, rig, type Pose } from "../app/rig";
import { ST } from "../app/colors";

const BODY = ST.gruengut.c;
const INK = ST.gruengut.ink;
const BELLY = "#C9DDB5";
const LEAF = "#7FB069";
const CHEEK = "rgba(232,128,120,0.45)";

const TAU = Math.PI * 2;

export interface RecyclopsProps {
  /** Width in px; height is 1.08 × size. */
  size: number;
  /** Pose overrides on top of the rest pose (arms, smile, look…). */
  pose?: Partial<Pose>;
  /** Walking amount 0–1: legs step, arms swing, body bobs. */
  walking?: number;
  /** Talking amount 0–1: the mouth flaps. */
  talking?: number;
  /** Turned away (shows his back). */
  back?: boolean;
  /** Body lean in degrees. */
  lean?: number;
  /** Mirror him (face left). */
  flip?: boolean;
  /** Turn squeeze 0–1 (mid-turn the body narrows). */
  turn?: number;
  /** Blink on his own (default on). */
  autoBlink?: boolean;
  style?: React.CSSProperties;
}

/** Deterministic blink: a short close every ~3 s, offset per instance. */
function blinkAt(frame: number, seed: number): number {
  const period = 95 + (seed % 23);
  const p = (frame + seed * 17) % period;
  if (p < 3) return p / 3;
  if (p < 6) return 1 - (p - 3) / 3;
  return 0;
}

export const Recyclops: React.FC<RecyclopsProps> = ({
  size,
  pose = {},
  walking = 0,
  talking = 0,
  back = false,
  lean = 0,
  flip = false,
  turn = 0,
  autoBlink = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const stepPhase = (t / 0.52) % 1;
  const swing = Math.sin(stepPhase * TAU) * 22 * walking;
  const p: Pose = {
    ...REST_POSE,
    breathe: (Math.sin((t * 1000) / 900) + 1) / 2,
    stepPhase,
    stepAmt: walking,
    armL: REST_POSE.armL + swing,
    armR: REST_POSE.armR - swing,
    mouthOpen: talking > 0 ? (0.35 + 0.35 * Math.sin(t * 14.3) * Math.sin(t * 5.8)) * talking : 0,
    // Leaf: trails the lean and the walk, plus a slow idle sway.
    leaf: -lean * 1.6 - walking * 10 * (flip ? -1 : 1) + Math.sin(t * 2.1) * 4,
    ...pose,
  };
  if (autoBlink && pose.lid === undefined && (pose.happy ?? 0) < 0.05) {
    p.lid = blinkAt(frame, Math.round(size));
  }
  const bob = -walking * Math.abs(Math.sin(stepPhase * TAU)) * 1.6;
  const R = rig(p);
  const height = Math.round(size * 1.08);
  const scaleX = (flip ? -1 : 1) * (1 - turn * 0.92);

  return (
    <div style={{ width: size, height, ...style }}>
      <svg
        width={size}
        height={height}
        viewBox="0 -8 100 108"
        style={{
          overflow: "visible",
          transformOrigin: "50% 95%",
          transform: `translateY(${bob}px) rotate(${lean}deg) scaleX(${scaleX})`,
        }}
      >
        <ellipse cx={50} cy={97} rx={26} ry={2.6} fill="rgba(0,0,0,0.14)" />
        <path d={R.legL} stroke={INK} strokeWidth={9.5} strokeLinecap="round" />
        <path d={R.legR} stroke={INK} strokeWidth={9.5} strokeLinecap="round" />
        <path d={R.legL} stroke={BODY} strokeWidth={6.5} strokeLinecap="round" />
        <path d={R.legR} stroke={BODY} strokeWidth={6.5} strokeLinecap="round" />
        <ellipse cx={R.footL.cx} cy={R.footL.cy} rx={7.5} ry={3.4} fill={INK} />
        <ellipse cx={R.footR.cx} cy={R.footR.cy} rx={7.5} ry={3.4} fill={INK} />

        <path d={R.armL} stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d={R.armR} stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d={R.armL} stroke={BODY} strokeWidth={8} strokeLinecap="round" />
        <path d={R.armR} stroke={BODY} strokeWidth={8} strokeLinecap="round" />
        <circle cx={R.handL.cx} cy={R.handL.cy} r={5.8} fill={BODY} stroke={INK} strokeWidth={1.6} />
        <circle cx={R.handR.cx} cy={R.handR.cy} r={5.8} fill={BODY} stroke={INK} strokeWidth={1.6} />

        <path d={R.leafStem} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <path d={R.leafBlade} fill={LEAF} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />

        <path d={R.body} fill={BODY} stroke={INK} strokeWidth={2.2} />

        {!back ? (
          <g>
            <path d={R.belly} fill={BELLY} />
            <circle cx={R.eye.cx} cy={R.eye.cy} r={15} fill="#fff" />
            <circle cx={R.pupil.cx} cy={R.pupil.cy} r={7} fill={INK} />
            <circle cx={R.shine.cx} cy={R.shine.cy} r={2.6} fill="#fff" />
            <path d={R.upperLid} fill={BODY} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
            <circle cx={R.eye.cx} cy={R.eye.cy} r={15} fill="none" stroke={INK} strokeWidth={2.2} />
            <g opacity={Math.max(0, Math.min(1, (p.happy - 0.5) * 3))}>
              <path d={R.happyEye} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
            </g>
            <path d={R.brow} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
            <ellipse cx={R.cheekL.cx} cy={R.cheekL.cy} rx={4.2} ry={2.6} fill={CHEEK} />
            <ellipse cx={R.cheekR.cx} cy={R.cheekR.cy} rx={4.2} ry={2.6} fill={CHEEK} />
            <path d={R.mouth} fill={INK} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          </g>
        ) : (
          <g>
            <circle cx={R.tushL.cx} cy={R.tushL.cy} r={9.5} fill={BODY} stroke={INK} strokeWidth={1.6} strokeOpacity={0.35} />
            <circle cx={R.tushR.cx} cy={R.tushR.cy} r={9.5} fill={BODY} stroke={INK} strokeWidth={1.6} strokeOpacity={0.35} />
            <path d={R.tushSeam} stroke={INK} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
          </g>
        )}
      </svg>
    </div>
  );
};
