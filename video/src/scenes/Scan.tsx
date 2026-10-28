// 9–15 s. "Just snap your paper calendar." The app's camera frames the
// page, the shutter fires, and the reading screen sweeps it while
// Recyclops watches and cheers when it's done.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Phone, Scene, Sfx, Split, clamp, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { useCopy } from "../copy";
import { CameraScreen, ReadingScreen, SCREEN_W, sweepAt } from "./parts/scan-screens";

/** Deeper coral from the kehricht family, readable as headline text. */
const SNAP = "#D5694B";

const SHOT = 45;
const TICK = 62;
const PUSH = 64;
const SWEEP = 70;
const SEGS: Array<[number, number]> = [
  [70, 86],
  [86, 132],
  [132, 148],
];
const DONE = 148;

export const Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const phoneH = vertical ? 1200 : 800;
  const size = vertical ? 340 : 300;

  const phoneIn = spring({ frame: frame - 2, fps, config: { damping: 13, stiffness: 120, mass: 0.9 } });
  const rIn = spring({ frame: frame - 12, fps, config: { damping: 11, stiffness: 150, mass: 0.8 } });
  const push = spring({ frame: frame - PUSH, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } });
  const flash = interpolate(frame, [SHOT, SHOT + 1, SHOT + 12], [0, 1, 0], clamp);
  const kick = interpolate(frame, [SHOT, SHOT + 3, SHOT + 10], [1, 0.985, 1], clamp);

  // Recyclops: eager, leaning toward the phone (on his left).
  const sweep = sweepAt(frame, SWEEP);
  const reading = interpolate(frame, [SWEEP - 4, SWEEP + 4, DONE - 2, DONE + 2], [0, 1, 1, 0], clamp);
  const flinch = interpolate(frame, [SHOT, SHOT + 2, SHOT + 9], [0, 1, 0], clamp);
  const happy = spring({ frame: frame - DONE, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
  const hop = interpolate(frame, [DONE, DONE + 5, DONE + 11], [0, 1, 0], { ...clamp, easing: EASE_OUT });
  const land = frame > DONE + 11 ? Math.sin((frame - DONE - 11) / 2) * Math.exp(-(frame - DONE - 11) / 6) : 0;
  const lookX = interpolate(frame, [0, 14, 20], [0.3, 0.3, -0.85], clamp) * (1 - happy) + happy * 0.1;
  const lookY = (1 - reading) * -0.1 + reading * interpolate(sweep, [0, 1], [-0.7, 0.6]);
  const pump = Math.sin((frame - DONE) / 3) * 10 * interpolate(frame, [DONE + 6, DONE + 10], [0, 1], clamp);
  const armR = 18 + happy * 140 + pump;
  const armL = 18 + reading * (16 + Math.sin(frame / 4) * 6) + happy * 30 + flinch * 25;
  const lean = -5 * (1 - happy) + flinch * 6;

  const caption = (
    <Caption text={copy.scan.caption.text} from={8} stagger={3} accent={copy.scan.caption.accent} accentColor={SNAP} />
  );

  const visual = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: vertical ? 0 : 30 }}>
      <div
        style={{
          opacity: Math.min(1, phoneIn * 1.5),
          translate: `0px ${(1 - phoneIn) * 320}px`,
          rotate: `${(1 - phoneIn) * -7}deg`,
          scale: String(kick),
        }}
      >
        <Phone height={phoneH}>
          <div style={{ position: "absolute", inset: 0, translate: `${-push * SCREEN_W * 0.3}px 0px` }}>
            <CameraScreen f={frame} shot={SHOT} tickPress={TICK} settleFrom={10} settleTo={36} />
            <div style={{ position: "absolute", inset: 0, background: "#000", opacity: push * 0.5 }} />
          </div>
          {frame >= PUSH && (
            <div style={{ position: "absolute", inset: 0, translate: `${(1 - push) * SCREEN_W}px 0px`, boxShadow: "-12px 0 30px rgba(0,0,0,0.25)" }}>
              <ReadingScreen sf={frame} sweepFrom={SWEEP} segs={SEGS} />
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
        </Phone>
      </div>

      <div
        style={{
          flex: "0 0 auto",
          opacity: Math.min(1, rIn * 2),
          translate: `${(1 - rIn) * 100}px ${(1 - rIn) * 40 - hop * 46}px`,
        }}
      >
        <Recyclops
          size={size}
          lean={lean}
          pose={{
            lookX,
            lookY,
            armL,
            armR,
            happy,
            smile: 0.65 + happy * 0.35,
            browUp: 0.45 + happy * 0.35 + flinch * 0.4,
            mouthOpen: happy * 0.45,
            ...(flinch > 0.3 ? { lid: flinch } : {}),
            squash: 1 - flinch * 0.07 + land * 0.08 + hop * 0.05,
          }}
        />
      </div>
    </div>
  );

  return (
    <Scene name="Scan">
      <Split caption={caption} visual={visual} />

      <Sfx at={2} src="swoosh.wav" volume={0.3} />
      <Sfx at={17} src="pluck_001.ogg" volume={0.45} />
      <Sfx at={SHOT - 1} src="shutter-modern.wav" volume={0.65} />
      <Sfx at={TICK} src="click_003.ogg" volume={0.5} />
      <Sfx at={PUSH} src="whoosh.wav" volume={0.25} />
      <Sfx at={SEGS[1][0]} src="tick_001.ogg" volume={0.3} />
      <Sfx at={SEGS[2][0]} src="tick_002.ogg" volume={0.3} />
      <Sfx at={DONE} src="confirmation_001.ogg" volume={0.6} />
    </Scene>
  );
};
