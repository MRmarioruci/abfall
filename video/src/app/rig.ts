// Copied from the app (src/components/recyclops/rig.ts). Keep in sync if the rig changes.
// Recyclops's drawing, as geometry computed from a pose.
//
// Every moving part (body, arms, legs, eye, lid, brow, mouth, leaf) is
// built from a handful of numbers in `Pose`, so the component can animate
// the numbers and redraw the parts every frame on the UI thread. All
// functions are worklets and pure; nothing here imports React Native, so
// the same file also drives the browser preview used to design him.
//
// Coordinates are in a 0–100 viewBox; his feet stand on y ≈ 94.

export interface Pose {
  /** Vertical squash/stretch of the body: 1 = rest, <1 squashed, >1 stretched. */
  squash: number;
  /** Breathing, 0–1: a slight swell of the body. */
  breathe: number;
  /** Pupil direction, -1…1 on each axis. */
  lookX: number;
  lookY: number;
  /** Upper lid, 0 = open, 1 = shut. */
  lid: number;
  /** Happy closed eye (a "∩" arc), 0–1. Closes the lid as it rises. */
  happy: number;
  /** Brow height (-1 low/grumpy … 1 raised/surprised) and tilt (-1 sad … 1 cross). */
  browUp: number;
  browTilt: number;
  /** Mouth: how open (0–1) and how much it smiles (-1 frown … 1 grin). */
  mouthOpen: number;
  smile: number;
  /** Arm angles in degrees from hanging down; positive swings outward/up. */
  armL: number;
  armR: number;
  /** Walk cycle: phase in turns (0–1 repeating) and amount (0 = standing). */
  stepPhase: number;
  stepAmt: number;
  /** Leaf angle in degrees (secondary motion, driven by a spring). */
  leaf: number;
}

export const REST_POSE: Pose = {
  squash: 1,
  breathe: 0,
  lookX: 0,
  lookY: 0,
  lid: 0,
  happy: 0,
  browUp: 0,
  browTilt: 0,
  mouthOpen: 0,
  smile: 0.5,
  armL: 18,
  armR: 18,
  stepPhase: 0,
  stepAmt: 0,
  leaf: 0,
};

export interface Rig {
  body: string;
  belly: string;
  armL: string;
  armR: string;
  handL: { cx: number; cy: number };
  handR: { cx: number; cy: number };
  legL: string;
  legR: string;
  footL: { cx: number; cy: number };
  footR: { cx: number; cy: number };
  eye: { cx: number; cy: number; r: number };
  pupil: { cx: number; cy: number; r: number };
  shine: { cx: number; cy: number };
  upperLid: string;
  /** The "∩" line drawn over the closed eye when happy; fade it in with `happy`. */
  happyEye: string;
  brow: string;
  mouth: string;
  cheekL: { cx: number; cy: number };
  cheekR: { cx: number; cy: number };
  leafStem: string;
  leafBlade: string;
  tushL: { cx: number; cy: number };
  tushR: { cx: number; cy: number };
  tushSeam: string;
}

const CX = 50;
const BODY_BASE = 87; // where the body meets the legs
const BODY_W = 33; // half-width at rest
const BODY_H = 68; // height at rest
const FOOT_Y = 94;

const f = (n: number) => {
  "worklet";
  return Math.round(n * 100) / 100;
};

function limb(x1: number, y1: number, x2: number, y2: number): string {
  "worklet";
  return `M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)}`;
}

/** Point at `len` from (x, y) at `deg` measured from straight down. */
function polar(x: number, y: number, len: number, deg: number, side: -1 | 1) {
  "worklet";
  const a = (deg * Math.PI) / 180;
  return { x: x + side * Math.sin(a) * len, y: y + Math.cos(a) * len };
}

export function rig(p: Pose): Rig {
  "worklet";
  // ── Body: squash/stretch keeps roughly constant volume. ──────────────
  const sq = p.squash * (1 + p.breathe * 0.025);
  const h = BODY_H * sq;
  const w = (BODY_W / Math.sqrt(sq)) * (1 + p.breathe * 0.02);
  const yb = BODY_BASE;
  const yt = yb - h;
  const body =
    `M ${f(CX - w)} ${f(yb - h * 0.44)} ` +
    `C ${f(CX - w)} ${f(yb - h * 0.82)}, ${f(CX - w * 0.56)} ${f(yt)}, ${CX} ${f(yt)} ` +
    `C ${f(CX + w * 0.56)} ${f(yt)}, ${f(CX + w)} ${f(yb - h * 0.82)}, ${f(CX + w)} ${f(yb - h * 0.44)} ` +
    `C ${f(CX + w)} ${f(yb - h * 0.1)}, ${f(CX + w * 0.62)} ${yb}, ${CX} ${yb} ` +
    `C ${f(CX - w * 0.62)} ${yb}, ${f(CX - w)} ${f(yb - h * 0.1)}, ${f(CX - w)} ${f(yb - h * 0.44)} Z`;

  // Lighter belly patch, low on the front.
  const bw = w * 0.56;
  const bTop = yb - h * 0.34;
  const belly =
    `M ${f(CX - bw)} ${f(yb - h * 0.12)} ` +
    `C ${f(CX - bw)} ${f(bTop)}, ${f(CX + bw)} ${f(bTop)}, ${f(CX + bw)} ${f(yb - h * 0.12)} ` +
    `C ${f(CX + bw * 0.6)} ${f(yb - 1.5)}, ${f(CX - bw * 0.6)} ${f(yb - 1.5)}, ${f(CX - bw)} ${f(yb - h * 0.12)} Z`;

  // ── Arms hang from the shoulders and rotate there. ───────────────────
  const shY = yb - h * 0.46;
  const shLX = CX - w * 0.94;
  const shRX = CX + w * 0.94;
  const ARM = 21;
  const hl = polar(shLX, shY, ARM, p.armL, -1);
  const hr = polar(shRX, shY, ARM, p.armR, 1);

  // ── Legs: feet lift and swing alternately while walking. ─────────────
  const ph = p.stepPhase * Math.PI * 2;
  const liftL = Math.max(0, Math.sin(ph)) * 5 * p.stepAmt;
  const liftR = Math.max(0, Math.sin(ph + Math.PI)) * 5 * p.stepAmt;
  const swingL = Math.cos(ph) * 3 * p.stepAmt;
  const swingR = Math.cos(ph + Math.PI) * 3 * p.stepAmt;
  const hipY = yb - 4;
  const footL = { cx: f(CX - 11 + swingL), cy: f(FOOT_Y - liftL) };
  const footR = { cx: f(CX + 11 + swingR), cy: f(FOOT_Y - liftR) };

  // ── Face, placed relative to the body top so it rides the squash. ────
  const eyeR = 15;
  const ey = yt + h * 0.38;
  const eye = { cx: CX, cy: f(ey), r: eyeR };
  const pupil = { cx: f(CX + p.lookX * 6), cy: f(ey + p.lookY * 5), r: 7 };
  const shine = { cx: f(pupil.cx - 2.6), cy: f(pupil.cy - 2.6) };

  // Upper lid: the part of the eye above a chord that drops as it
  // closes; its lower edge bows down slightly like a real lid. Happy
  // closes it too, and the "∩" line takes over.
  const close = Math.min(1, Math.max(p.lid, p.happy));
  const lidY = ey - eyeR + 2 * eyeR * close;
  const ud = Math.min(eyeR - 0.01, Math.abs(lidY - ey));
  const uHalf = Math.sqrt(eyeR * eyeR - ud * ud);
  const upperLid =
    close <= 0.001
      ? ""
      : close >= 0.999
      ? `M ${CX - eyeR} ${f(ey)} A ${eyeR} ${eyeR} 0 1 1 ${CX + eyeR} ${f(ey)} A ${eyeR} ${eyeR} 0 1 1 ${CX - eyeR} ${f(ey)} Z`
      : `M ${f(CX - uHalf)} ${f(lidY)} A ${eyeR} ${eyeR} 0 ${lidY > ey ? 1 : 0} 1 ${f(CX + uHalf)} ${f(lidY)} ` +
        `Q ${CX} ${f(lidY + 3.5 * (1 - close))} ${f(CX - uHalf)} ${f(lidY)} Z`;
  const happyEye = `M ${CX - 9} ${f(ey + 3)} Q ${CX} ${f(ey - 8)} ${CX + 9} ${f(ey + 3)}`;

  // Brow: a thick arc above the eye; tilt makes him cross (inner end
  // down) or worried (inner end up). Cyclops brow, so "inner" = centre.
  const by = ey - eyeR - 5 - p.browUp * 3.5;
  const brow =
    `M ${f(CX - 12)} ${f(by + 2 + p.browTilt * 1.5)} ` +
    `Q ${CX} ${f(by - 3.5 + p.browTilt * 3)} ${f(CX + 12)} ${f(by + 2 + p.browTilt * 1.5)}`;

  // Mouth: lips meet at the corners; opening drops the lower lip, smiling
  // curves both down in the middle.
  const my = ey + eyeR + 8.5;
  const mw = 6 + p.mouthOpen * 1.5;
  const mouth =
    `M ${f(CX - mw)} ${f(my - p.smile * 1.2)} ` +
    `Q ${CX} ${f(my + p.smile * 3 - p.mouthOpen * 4)} ${f(CX + mw)} ${f(my - p.smile * 1.2)} ` +
    `Q ${CX} ${f(my + p.smile * 3.6 + p.mouthOpen * 9)} ${f(CX - mw)} ${f(my - p.smile * 1.2)} Z`;

  const cheekL = { cx: f(CX - 17), cy: f(my - 2.5) };
  const cheekR = { cx: f(CX + 17), cy: f(my - 2.5) };

  // ── Leaf on top, rotating about its stem base. ───────────────────────
  const la = (p.leaf * Math.PI) / 180;
  const rot = (x: number, y: number) => ({
    x: f(CX + x * Math.cos(la) - y * Math.sin(la)),
    y: f(yt + 1 + x * Math.sin(la) + y * Math.cos(la)),
  });
  const s0 = rot(0, 0), s1 = rot(1.5, -5), s2 = rot(0.5, -9);
  const leafStem = `M ${s0.x} ${s0.y} Q ${s1.x} ${s1.y} ${s2.x} ${s2.y}`;
  const b1 = rot(9, -11), b2 = rot(14, -19), b3 = rot(7, -24);
  const b4 = rot(1, -20), b5 = rot(-2, -13);
  const leafBlade =
    `M ${s2.x} ${s2.y} C ${b1.x} ${b1.y}, ${b2.x} ${b2.y}, ${b3.x} ${b3.y} ` +
    `C ${b4.x} ${b4.y}, ${b5.x} ${b5.y}, ${s2.x} ${s2.y} Z`;

  // ── Back view ────────────────────────────────────────────────────────
  const ty = yb - h * 0.2;
  const tushL = { cx: f(CX - 8.5), cy: f(ty) };
  const tushR = { cx: f(CX + 8.5), cy: f(ty) };
  const tushSeam = `M ${CX} ${f(ty - 8)} L ${CX} ${f(ty + 7)}`;

  return {
    body,
    belly,
    armL: limb(shLX, shY, hl.x, hl.y),
    armR: limb(shRX, shY, hr.x, hr.y),
    handL: { cx: f(hl.x), cy: f(hl.y) },
    handR: { cx: f(hr.x), cy: f(hr.y) },
    legL: limb(CX - 10, hipY, footL.cx, footL.cy - 2),
    legR: limb(CX + 10, hipY, footR.cx, footR.cy - 2),
    footL,
    footR,
    eye,
    pupil,
    shine,
    upperLid,
    happyEye,
    brow,
    mouth,
    cheekL,
    cheekR,
    leafStem,
    leafBlade,
    tushL,
    tushR,
    tushSeam,
  };
}
