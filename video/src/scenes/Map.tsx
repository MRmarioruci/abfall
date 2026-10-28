// 30–35 s. "Glass? Batteries? Find where they go." Pins drop onto a little
// town map, Recyclops points at one, it pulses, and the place card slides up
// with what it takes and a Directions button that gets pressed.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Phone, Scene, Sfx, Split, clamp, EASE_IN_OUT, useSpringIn, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { ST } from "../theme";
import { useCopy } from "../copy";
import { PlaceCard } from "./parts/map-card";
import { HereDot, MapTopBar, MapWorld, Pin, type PinSpec } from "./parts/map-world";

const POP = 8; //     Recyclops hops up
const DROP = 22; //   first pin lands
const POINT = 54; //  he points
const SELECT = 60; // pin is selected
const CARD = 66; //   place card slides up
const PRESS = 112; // Directions pressed

const PINS: PinSpec[] = [
  { id: "a", stream: "sonderabfall", x: 92, y: 250, at: DROP },
  { id: "b", stream: "metall", x: 322, y: 236, at: DROP + 3 },
  { id: "sel", stream: "glas", x: 205, y: 392, at: DROP + 6 },
  { id: "c", stream: "papier", x: 62, y: 446, at: DROP + 9 },
  { id: "d", stream: "karton", x: 318, y: 488, at: DROP + 11 },
  { id: "e", stream: "textilien", x: 150, y: 640, at: DROP + 13 },
  { id: "f", stream: "verpackung", x: 280, y: 690, at: DROP + 15 },
];
const SEL = PINS.find((p) => p.id === "sel")!;

export const Map: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const vertical = useVertical();

  const phoneH = vertical ? 1240 : 860;
  const phoneW = (phoneH * 418) / 872;
  const size = vertical ? 320 : 270;
  const lead = size * 1.02; // room for Recyclops on the phone's left
  const boxW = lead + phoneW;

  const phoneIn = useSpringIn(2, { damping: 16, stiffness: 120 });

  // Map leans in on the chosen place and drifts up to clear the card.
  const focus = interpolate(frame, [SELECT, SELECT + 24], [0, 1], { ...clamp, easing: EASE_IN_OUT });

  // Recyclops: hops up from below, squashes on landing.
  const hop = spring({ frame: frame - POP, fps, config: { damping: 10, stiffness: 140, mass: 0.8 } });
  const land = interpolate(frame - POP, [8, 12, 20], [0, 1, 0], clamp);
  const point = spring({ frame: frame - POINT, fps, config: { damping: 9, stiffness: 160, mass: 0.7 } });
  const pointDown = interpolate(frame, [PRESS - 10, PRESS - 2], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const happy = interpolate(frame, [PRESS + 2, PRESS + 8, 142, 148], [0, 1, 1, 0.6], clamp);
  const cheer = spring({ frame: frame - PRESS - 2, fps, config: { damping: 9, stiffness: 160, mass: 0.7 } });
  // Eyes follow the pins as they rain down, then lock onto the selected one, then the card.
  const lookY = interpolate(frame, [POP + 6, DROP, DROP + 18, POINT, CARD + 14, PRESS - 6], [-0.2, -0.8, -0.1, -0.7, 0.3, 0.5], clamp);
  const armR = 18 + point * 142 * (1 - pointDown) + cheer * 120 * (frame > PRESS ? 1 : 0);
  const armL = 18 + cheer * 100 * (frame > PRESS ? 1 : 0);
  const wiggle = Math.sin((frame - POINT) / 2.2) * 6 * interpolate(frame, [POINT + 6, POINT + 10, POINT + 22, POINT + 30], [0, 1, 1, 0], clamp);

  return (
    <Scene name="Map">
      <Split
        caption={
          <Caption text={copy.map.caption.text} accent={copy.map.caption.accent} accentColor={ST.gruengut.ink} from={4} stagger={3} />
        }
        visual={
          <div
            style={{
              position: "relative",
              width: boxW,
              height: phoneH,
              opacity: interpolate(phoneIn, [0, 0.4], [0, 1], clamp),
              translate: `0px ${(1 - phoneIn) * 120}px`,
            }}
          >
            <div style={{ position: "absolute", left: lead, top: 0 }}>
              <Phone height={phoneH}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transformOrigin: `${SEL.x}px ${SEL.y}px`,
                    scale: String(1 + focus * 0.08),
                    translate: `0px ${-focus * 40}px`,
                  }}
                >
                  <MapWorld />
                  <HereDot x={175} y={548} />
                  {PINS.map((p) => (
                    <Pin
                      key={p.id}
                      pin={p}
                      selectedAt={p.id === "sel" ? SELECT : undefined}
                      dimFrom={p.id === "sel" ? undefined : SELECT}
                    />
                  ))}
                </div>
                <MapTopBar />
                <PlaceCard at={CARD} pressAt={PRESS} />
              </Phone>
            </div>

            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: phoneH * 0.06,
                translate: `0px ${(1 - hop) * (size * 1.4)}px`,
                opacity: frame >= POP ? 1 : 0,
                zIndex: 3,
              }}
            >
              <Recyclops
                size={size}
                lean={wiggle * 0.3 + point * 4 * (1 - pointDown)}
                pose={{
                  armR: armR + wiggle,
                  armL,
                  squash: 1 - land * 0.1 + cheer * 0.04 * (frame > PRESS ? 1 : 0),
                  happy,
                  lookX: 0.9 * (1 - happy),
                  lookY: lookY * (1 - happy),
                  browUp: interpolate(frame, [DROP, DROP + 6, DROP + 24], [0, 0.9, 0.3], clamp) + happy * 0.4,
                  mouthOpen: interpolate(frame, [DROP, DROP + 6, DROP + 20], [0, 0.55, 0.05], clamp) + happy * 0.3,
                  smile: 0.5 + happy * 0.5,
                }}
              />
            </div>
          </div>
        }
      />

      <Sfx at={3} src="swoosh.wav" volume={0.3} />
      <Sfx at={POP + 2} src="pluck_001.ogg" volume={0.5} />
      <Sfx at={DROP} src="drop_002.ogg" volume={0.5} />
      <Sfx at={DROP + 6} src="drop_002.ogg" volume={0.42} />
      <Sfx at={DROP + 12} src="drop_002.ogg" volume={0.34} />
      <Sfx at={SELECT} src="select_001.ogg" volume={0.55} />
      <Sfx at={CARD} src="swoosh.wav" volume={0.3} />
      <Sfx at={PRESS} src="click_003.ogg" volume={0.6} />
      <Sfx at={PRESS + 4} src="confirmation_001.ogg" volume={0.35} />
    </Scene>
  );
};
