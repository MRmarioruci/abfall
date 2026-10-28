// 25–30 s. "A nudge the evening before." The lock screen ticks over to
// 20:00, two reminders drop in, and Recyclops pops out from behind the
// phone to tap it, like a tap on the viewer's shoulder.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Phone, Scene, Sfx, Split, clamp, EASE_IN_OUT, EASE_OUT, useSpringIn, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { ST } from "../theme";
import { useCopy } from "../copy";
import { LockScreen } from "./parts/reminder-lockscreen";

const TICK = 18; //   clock 19:59 → 20:00
const FIRST = 28; //  "Paper goes out tomorrow"
const SECOND = 48; // "Cardboard too"
const POP = 62; //    Recyclops pops out
const TAP1 = 80;
const TAP2 = 88;
const HAPPY = 96;

export const Reminder: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const vertical = useVertical();

  const phoneH = vertical ? 1240 : 860;
  const phoneW = (phoneH * 418) / 872;
  const size = vertical ? 350 : 290;
  const boxW = phoneW + size * 0.78;

  // Phone rises in; buzzes a little as each notification lands.
  const phoneIn = useSpringIn(2, { damping: 16, stiffness: 120 });
  const buzz = (at: number) => Math.sin((frame - at) * 2.6) * interpolate(frame, [at, at + 3, at + 14], [0, 1, 0], clamp);
  const phoneRot = (buzz(FIRST + 4) + buzz(SECOND + 4)) * 1.1;

  // Each tap knocks the phone (and its notifications) a touch to the left.
  const knock = (at: number) => interpolate(frame, [at - 2, at, at + 7], [0, 1, 0], { ...clamp, easing: EASE_OUT });
  const tapKnock = knock(TAP1) + knock(TAP2);

  // Recyclops: slides out from behind the phone's right edge with overshoot.
  const pop = spring({ frame: frame - POP, fps, config: { damping: 11, stiffness: 150, mass: 0.8 } });
  const hiddenX = -size * 0.9;
  const recX = interpolate(pop, [0, 1], [hiddenX, 0]);
  const inFront = pop > 0.85 || frame > POP + 12;
  const reach = interpolate(frame, [POP + 8, TAP1 - 3], [0, 1], { ...clamp, easing: EASE_OUT });
  const tapPulse = knock(TAP1) + knock(TAP2);
  const release = interpolate(frame, [HAPPY, HAPPY + 12], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const happy = interpolate(frame, [HAPPY, HAPPY + 6, 140, 146], [0, 1, 1, 0.6], clamp);
  // Arm: up-left toward the phone, a little further on each tap, then a cheery wave back.
  const armL = 18 + reach * (112 - tapPulse * 22) * (1 - release);
  // …then a cheery wave with the other hand.
  const armR = 18 + release * 128 + Math.sin((frame - HAPPY - 6) / 3.2) * 16 * interpolate(frame, [HAPPY + 6, HAPPY + 10, 136, 142], [0, 1, 1, 0], clamp);
  const lean = interpolate(pop, [0, 0.6, 1], [0, -14, -6]) - tapPulse * 4 + release * 6;
  const squash = 1 + Math.sin(Math.min(1, Math.max(0, (frame - POP) / 14)) * Math.PI) * 0.06 - happy * 0.03;

  return (
    <Scene name="Reminder">
      <Split
        caption={
          <Caption text={copy.reminder.caption.text} accent={copy.reminder.caption.accent} accentColor={ST.papier.ink} from={4} stagger={3} />
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
            {/* Recyclops behind the phone while he pops out, in front once he's clear. */}
            <div
              style={{
                position: "absolute",
                left: phoneW - size * 0.12,
                bottom: phoneH * 0.04,
                zIndex: inFront ? 3 : 1,
                opacity: frame >= POP ? 1 : 0,
                translate: `${recX}px 0px`,
              }}
            >
              <Recyclops
                size={size}
                lean={lean}
                pose={{
                  armL,
                  armR,
                  squash,
                  happy,
                  smile: 0.55 + happy * 0.45,
                  mouthOpen: interpolate(frame, [POP, POP + 6, POP + 16], [0, 0.5, 0.1], clamp) + happy * 0.25,
                  browUp: interpolate(frame, [POP, POP + 6, POP + 20], [0, 0.8, 0.3], clamp) + happy * 0.3,
                  lookX: interpolate(frame, [POP, POP + 10, HAPPY - 4, HAPPY], [-0.9, -0.9, -0.9, 0], clamp),
                  lookY: interpolate(frame, [POP, POP + 10, HAPPY - 4, HAPPY], [-0.4, -0.5, -0.5, 0], clamp),
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 2,
                rotate: `${phoneRot}deg`,
                translate: `${-tapKnock * 8}px 0px`,
              }}
            >
              <Phone height={phoneH}>
                <LockScreen tickAt={TICK} firstAt={FIRST} secondAt={SECOND} nudge={-tapKnock * 4} />
              </Phone>
            </div>
          </div>
        }
      />

      <Sfx at={3} src="swoosh.wav" volume={0.3} />
      <Sfx at={TICK} src="tick_001.ogg" volume={0.5} />
      <Sfx at={FIRST} src="ding.wav" volume={0.55} />
      <Sfx at={SECOND} src="ding.wav" volume={0.38} />
      <Sfx at={POP} src="pluck_001.ogg" volume={0.6} />
      <Sfx at={TAP1} src="tick_002.ogg" volume={0.6} />
      <Sfx at={TAP2} src="tick_002.ogg" volume={0.5} />
      <Sfx at={HAPPY} src="pluck_002.ogg" volume={0.45} />
    </Scene>
  );
};
