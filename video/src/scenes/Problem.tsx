// 4–9 s. The old way: a paper calendar pinned up, Recyclops puzzling over
// it. "Paper this week?" → "Or cardboard?" → "Wait… was that yesterday?"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Scene, Sfx, Split, clamp, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { FONT, ST } from "../theme";
import { PaperPage, PAGE_H, PAGE_W, findMark } from "./parts/problem-paper";
import type { WasteStreamId } from "../app/colors";
import { useCopy } from "../copy";

/** Felt-pen red, for the circles drawn on the page and the last line's accent. */
const MARKER = "#D5694B";

// Timing and accent colour of the three headlines (text from copy.problem.lines).
const LINES = [
  { from: 6, to: 50, color: "#5B60B5" },
  { from: 50, to: 95, color: "#B88A12" },
  { from: 95, to: 999, color: MARKER },
];

// Pen circles on the page, one per headline.
const RINGS: Array<{ at: number; stream: WasteStreamId; m: number; after: number }> = [
  { at: 12, stream: "papier", m: 6, after: 1 },
  { at: 56, stream: "karton", m: 4, after: 1 },
  { at: 100, stream: "kehricht", m: 9, after: 10 },
];

// Question marks popping around his head (x, y as fractions of his box).
const QS: Array<{ at: number; x: number; y: number; rot: number; s: WasteStreamId; k: number }> = [
  { at: 24, x: 0.84, y: -0.1, rot: 14, s: "papier", k: 1 },
  { at: 62, x: -0.12, y: -0.14, rot: -16, s: "karton", k: 0.9 },
  { at: 74, x: 0.86, y: 0.22, rot: 20, s: "metall", k: 0.75 },
  { at: 99, x: 0.3, y: -0.36, rot: -8, s: "kehricht", k: 1.15 },
  { at: 104, x: 0.82, y: -0.16, rot: 18, s: "papier", k: 0.9 },
  { at: 109, x: -0.1, y: 0.06, rot: -20, s: "karton", k: 0.8 },
];

const QMark: React.FC<{ q: (typeof QS)[number]; box: number }> = ({ q, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - q.at, fps, config: { damping: 8, stiffness: 220, mass: 0.5 } });
  const life = q.at >= 95 ? 60 : 30;
  const fade = interpolate(frame, [q.at + life, q.at + life + 8], [1, 0], clamp);
  const d = q.k * box * 0.24;
  return (
    <div
      style={{
        position: "absolute",
        left: q.x * box,
        top: q.y * box * 1.08,
        width: d,
        height: d,
        borderRadius: 999,
        background: ST[q.s].c,
        color: ST[q.s].ink,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: d * 0.7,
        lineHeight: `${d}px`,
        textAlign: "center",
        boxShadow: "0 8px 18px rgba(80,60,40,0.18)",
        opacity: Math.min(1, s * 2) * fade,
        scale: String(s),
        rotate: `${q.rot + Math.sin((frame - q.at) / 6) * 6}deg`,
        translate: `0px ${interpolate(frame, [q.at, q.at + life + 8], [0, -box * 0.08], clamp)}px`,
      }}
    >
      ?
    </div>
  );
};

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const paperW = vertical ? 580 : 430;
  const size = vertical ? 460 : 310;

  // The page drops in and gets pinned.
  const paperIn = spring({ frame: frame - 1, fps, config: { damping: 12, stiffness: 110, mass: 0.9 } });
  const pin = spring({ frame: frame - 12, fps, config: { damping: 8, stiffness: 240, mass: 0.5 } });
  const sway = Math.sin(frame / 18) * 0.5;

  // Recyclops hops in.
  const rIn = spring({ frame: frame - 6, fps, config: { damping: 11, stiffness: 150, mass: 0.8 } });

  // Eyes dart between the page (left) and us.
  const lookX = interpolate(
    frame,
    [0, 20, 25, 36, 41, 58, 62, 70, 74, 84, 88, 95, 99, 118, 123],
    [-0.9, -0.9, 0.35, 0.35, -0.9, -0.9, 0.8, 0.8, -0.9, -0.9, 0.2, 0.2, 0.05, 0.05, -0.85],
    clamp,
  );
  const lookY = interpolate(frame, [95, 99, 118, 123], [0, -0.25, -0.25, 0.1], clamp);

  // Scratching his head (right arm), then a shrug on "Wait…".
  const raise = interpolate(frame, [18, 28], [0, 1], { ...clamp, easing: EASE_OUT });
  const scratching = interpolate(frame, [27, 31, 88, 93], [0, 1, 1, 0], clamp);
  const scratch = Math.sin(frame * 0.95) * 7 * scratching;
  const shrug = spring({ frame: frame - 95, fps, config: { damping: 9, stiffness: 170, mass: 0.7 } });
  const armR = 18 + raise * 144 + scratch - shrug * 98;
  const armL = 18 + shrug * 44;

  // Face: puzzled until the penny almost drops, then wide-eyed.
  const shock = interpolate(frame, [95, 99, 120, 132], [0, 1, 1, 0.45], clamp);
  const browUp = (0.15 + Math.sin(frame / 6) * 0.22) * (1 - shock) + shock * 1;
  const browTilt = interpolate(frame, [0, 95, 99, 120, 130], [-0.75, -0.75, -0.1, -0.1, -0.85], clamp);
  const mouthOpen = shock * 0.55 + interpolate(frame, [60, 66, 84, 90], [0, 0.15, 0.15, 0], clamp);
  const smile = interpolate(frame, [0, 95, 99], [-0.15, -0.15, -0.45], clamp);
  const pop = frame > 95 ? Math.sin((frame - 95) / 2.2) * Math.exp(-(frame - 95) / 9) : 0;
  const squash = 1 + pop * 0.09;
  const lean = lookX * 3 + scratching * Math.sin(frame / 9) * 2 - shock * 3;

  const paperH = (paperW * PAGE_H) / PAGE_W;

  const caption = (
    <div style={{ display: "grid" }}>
      {LINES.map((l, i) => {
        const out = i < LINES.length - 1 ? interpolate(frame, [l.to - 6, l.to], [0, 1], { ...clamp, easing: EASE_OUT }) : 0;
        return (
          <div
            key={i}
            style={{
              gridArea: "1 / 1",
              opacity: 1 - out,
              translate: `0px ${-out * 50}px`,
              scale: String(1 - out * 0.05),
              transformOrigin: vertical ? "50% 50%" : "0% 50%",
            }}
          >
            <Caption text={copy.problem.lines[i].text} from={l.from} stagger={3} accent={copy.problem.lines[i].accent} accentColor={l.color} />
          </div>
        );
      })}
    </div>
  );

  const visual = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", marginTop: 0 }}>
      <div
        style={{
          width: paperW,
          height: paperH,
          opacity: Math.min(1, paperIn * 1.6),
          translate: `0px ${(1 - paperIn) * -140}px`,
          rotate: `${-4 - (1 - paperIn) * 9 + sway}deg`,
          transformOrigin: "50% 2%",
          marginBottom: vertical ? 200 : 120,
          flex: "0 0 auto",
        }}
      >
        <PaperPage width={paperW} pin={pin}>
          {RINGS.map((r) => {
            const c = findMark(r.stream, r.m, r.after);
            const draw = interpolate(frame, [r.at, r.at + 10], [0, 1], { ...clamp, easing: EASE_OUT });
            const dim = interpolate(frame, [r.at + 40, r.at + 46], [1, 0.35], clamp);
            return (
              <ellipse
                key={r.at}
                cx={c.x}
                cy={c.y}
                rx={13}
                ry={8}
                fill="none"
                stroke={MARKER}
                strokeWidth={2.2}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - draw}
                opacity={dim}
                style={{ rotate: "-12deg", transformBox: "fill-box", transformOrigin: "center" }}
              />
            );
          })}
        </PaperPage>
      </div>

      <div
        style={{
          position: "relative",
          marginLeft: vertical ? -150 : -10,
          flex: "0 0 auto",
          opacity: Math.min(1, rIn * 2),
          translate: `${(1 - rIn) * 120}px ${(1 - rIn) * 40}px`,
        }}
      >
        <Recyclops
          size={size}
          lean={lean}
          pose={{ lookX, lookY, armR, armL, browUp, browTilt, mouthOpen, smile, squash }}
        />
        {QS.map((q) => (
          <QMark key={q.at} q={q} box={size} />
        ))}
      </div>
    </div>
  );

  return (
    <Scene name="Problem">
      <Split caption={caption} visual={visual} />

      <Sfx at={2} src="drop_002.ogg" volume={0.4} />
      <Sfx at={12} src="click_001.ogg" volume={0.45} />
      <Sfx at={6} src="pluck_001.ogg" volume={0.55} />
      <Sfx at={24} src="tick_001.ogg" volume={0.3} />
      <Sfx at={50} src="pluck_002.ogg" volume={0.55} />
      <Sfx at={62} src="tick_002.ogg" volume={0.3} />
      <Sfx at={95} src="pluck_001.ogg" volume={0.6} />
      <Sfx at={99} src="tick_001.ogg" volume={0.35} />
    </Scene>
  );
};
