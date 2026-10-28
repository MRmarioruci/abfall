// 39–45 s. Two beats.
// 1. (0–95) Home screen on the phone; the camera pushes in on the month
//    card, where little Recyclops swaps two legend labels behind his back,
//    turns round and winks.
// 2. (95–180) A soft green circle opens on the logo card: BrandMark, "Abfall",
//    "Never miss a pickup again." and Recyclops waving. Calm hold, fade out.
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Phone, Scene, Sfx, clamp, EASE_IN_OUT, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { FONT, S, ST } from "../theme";
import { useCopy } from "../copy";
import { focusFor, HOME_FOCUS_X, HomeScreen, T } from "./parts/outro-home";
import { BrandMarkIn } from "./parts/outro-brand";

const LOGO_AT = 95;

const PhoneBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const vertical = useVertical();
  const FOCUS = focusFor(useCopy());

  const H = vertical ? 1540 : 940;
  const Z = vertical ? 1.6 : 2.5;
  const k = H / 872; // phone px per screen unit
  const pw = 418 * k;

  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 120, mass: 0.9 } });
  // Push in on the legend, ease back a touch for the wink.
  const push =
    interpolate(frame, [10, 34], [0, 1], { ...clamp, easing: EASE_IN_OUT }) -
    interpolate(frame, [T.wink[0] - 4, LOGO_AT], [0, 0.12], { ...clamp, easing: EASE_IN_OUT });
  const z = 1 + push * (Z - 1);

  const left = (width - pw) / 2;
  const top = (height - H) / 2;
  // The camera follows him home for the wink.
  const fx = interpolate(frame, [T.walkHome[0], T.walkHome[1] + 4], [FOCUS.x, HOME_FOCUS_X], { ...clamp, easing: EASE_IN_OUT });
  const F = { x: left + (14 + fx) * k, y: top + (14 + FOCUS.y) * k };
  // Where the focus lands on screen: centre, a little low so his head fits.
  const C = { x: width / 2, y: height / 2 + (vertical ? 60 : 30) };

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${F.x}px ${F.y}px`,
          translate: `${push * (C.x - F.x)}px ${push * (C.y - F.y) + (1 - enter) * 300}px`,
          scale: String(z * (0.94 + enter * 0.06)),
        }}
      >
        <div style={{ position: "absolute", left, top }}>
          <Phone height={H}>
            <HomeScreen />
          </Phone>
        </div>
      </div>
      {/* sound: walk patter, the turn, hands on, the slide, the wink */}
      <Sfx at={1} src="swoosh.wav" volume={0.3} />
      <Sfx at={T.walk[0] + 4} src="tick_001.ogg" volume={0.3} />
      <Sfx at={T.walk[0] + 12} src="tick_002.ogg" volume={0.3} />
      <Sfx at={T.walk[0] + 20} src="tick_001.ogg" volume={0.3} />
      <Sfx at={T.turnAway[0]} src="whip.wav" volume={0.3} />
      <Sfx at={T.reach[1] - 1} src="click_003.ogg" volume={0.5} />
      <Sfx at={T.swap + 2} src="switch.wav" volume={0.45} />
      <Sfx at={T.setDown[1] - 1} src="tick_002.ogg" volume={0.4} />
      <Sfx at={T.wink[0] + 2} src="pluck_002.ogg" volume={0.55} />
    </AbsoluteFill>
  );
};

const LogoBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const vertical = useVertical();
  const copy = useCopy();

  // Circle opens from the centre, where little Recyclops just winked.
  const r = interpolate(frame, [0, 14], [0, Math.hypot(width, height) / 2 + 40], { ...clamp, easing: EASE_IN_OUT });
  const cy = height / 2 + (vertical ? 20 : 40);

  const markSize = vertical ? 200 : 190;
  const wordSize = vertical ? 210 : 200;
  const word = copy.brand;

  // Recyclops hops in, waves, then settles and looks at the logo.
  const hop = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 130, mass: 0.8 } });
  const land = interpolate(frame, [15, 18, 24], [0, 1, 0], clamp);
  const waveUp = interpolate(frame, [20, 27], [0, 1], { ...clamp, easing: EASE_OUT });
  const waveDown = interpolate(frame, [56, 64], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const waveSwing = Math.sin((frame - 27) / 3.2) * 18 * interpolate(frame, [27, 31, 52, 57], [0, 1, 1, 0], clamp);
  const armR = 18 + waveUp * 132 + waveSwing - waveDown * 132;
  const happy = interpolate(frame, [22, 28, 54, 62], [0, 1, 1, 0], clamp);
  // After the wave he glances at the logo, then back to camera for the hold.
  const glance = interpolate(frame, [62, 68, 74, 80], [0, 1, 1, 0], { ...clamp, easing: EASE_IN_OUT });
  const recSize = vertical ? 400 : 330;

  const brand = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: vertical ? "center" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: vertical ? 22 : 26 }}>
        <BrandMarkIn size={markSize} from={4} />
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: wordSize,
            letterSpacing: -wordSize * 0.045,
            lineHeight: 1,
            color: S.ink,
            display: "flex",
          }}
        >
          {word.split("").map((ch, i) => {
            const s = spring({ frame: frame - 10 - i * 2, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
            return (
              <span key={i} style={{ display: "inline-block", opacity: Math.min(1, s * 1.5), translate: `0px ${(1 - s) * wordSize * 0.4}px`, scale: String(0.8 + s * 0.2) }}>
                {ch}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ width: vertical ? 900 : 1000, marginTop: vertical ? 50 : 34 }}>
        <Caption text={copy.outro.tagline.text} from={24} stagger={4} accent={copy.outro.tagline.accent} accentColor={ST.gruengut.ink} align={vertical ? "center" : "left"} />
      </div>
    </div>
  );

  const rec = (
    <div style={{ translate: `0px ${(1 - hop) * 520}px` }}>
      <Recyclops
        size={recSize}
        lean={-glance * 3 + happy * 3}
        pose={{
          armR,
          armL: 18 + happy * 8,
          happy,
          smile: 0.6 + happy * 0.4,
          browUp: happy * 0.5 + glance * 0.2,
          squash: 1 - land * 0.12,
          lookX: vertical ? 0 : -glance * 0.9,
          lookY: vertical ? -glance * 0.9 : 0,
        }}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ clipPath: `circle(${r}px at ${width / 2}px ${cy}px)`, background: ST.gruengut.soft }}>
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: vertical ? 90 : 90,
        }}
      >
        {brand}
        {rec}
      </AbsoluteFill>
      <Sfx at={5} src="maximize_006.ogg" volume={0.6} />
      <Sfx at={24} src="pluck_001.ogg" volume={0.45} />
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => (
  <Scene name="Outro">
    <Sequence durationInFrames={LOGO_AT + 16} name="Home">
      <PhoneBeat />
    </Sequence>
    <Sequence from={LOGO_AT} name="Logo">
      <LogoBeat />
    </Sequence>
  </Scene>
);
