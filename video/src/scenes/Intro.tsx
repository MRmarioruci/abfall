// 0–4 s. Recyclops walks in, stops, waves at the camera: "Hi, I'm Recyclops."
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Caption, Scene, Sfx, clamp, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { ST } from "../theme";
import { useCopy } from "../copy";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const vertical = useVertical();
  const size = vertical ? 420 : 340;

  // Walk in from the left edge, settle with a little lean-back.
  const WALK_END = 40;
  const x = interpolate(frame, [0, WALK_END], [vertical ? -760 : -1100, 0], { ...clamp, easing: EASE_OUT });
  const walking = interpolate(frame, [0, WALK_END - 6, WALK_END], [1, 1, 0], clamp);
  const lean = interpolate(frame, [0, WALK_END - 4, WALK_END + 6, WALK_END + 16], [6, 6, -5, 0], clamp);

  // Wave: right arm up, three swings, happy eye while waving.
  const waveUp = interpolate(frame, [48, 56], [0, 1], { ...clamp, easing: EASE_OUT });
  const waveSwing = Math.sin((frame - 56) / 3.2) * 18 * interpolate(frame, [56, 60, 92, 98], [0, 1, 1, 0], clamp);
  const armR = 18 + waveUp * 132 + waveSwing - interpolate(frame, [96, 106], [0, 132], clamp);
  const happy = interpolate(frame, [52, 58, 92, 100], [0, 1, 1, 0], clamp);

  return (
    <Scene name="Intro" bg={ST.gruengut.soft}>
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: vertical ? 70 : 90,
        }}
      >
        <div style={{ translate: `${x}px 0px` }}>
          <Recyclops
            size={size}
            walking={walking}
            lean={lean}
            pose={{ armR, happy, smile: 0.5 + happy * 0.5, browUp: happy * 0.5, lookX: walking > 0 ? 0.8 : 0 }}
          />
        </div>
        <div style={{ width: vertical ? 900 : undefined, maxWidth: vertical ? 900 : 760 }}>
          <Caption text={copy.intro.caption.text} from={50} stagger={4} size={vertical ? 120 : 110} accent={copy.intro.caption.accent} accentColor={ST.gruengut.ink} />
        </div>
      </AbsoluteFill>

      <Sfx at={2} src="swoosh.wav" volume={0.35} />
      <Sfx at={50} src="pluck_001.ogg" volume={0.7} />
      <Sfx at={58} src="pluck_002.ogg" volume={0.5} />
    </Scene>
  );
};
