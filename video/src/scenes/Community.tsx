// 20–25 s. "No paper? Your neighbours already shared it."
// The community sheet: the town is typed, three shared calendars slide
// in, the first is tapped, its preview shows what it collects, "Use this
// calendar" is pressed and a toast confirms. Recyclops points the way and
// celebrates.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Phone, Scene, Sfx, Split, clamp, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { ST } from "../theme";
import { useCopy } from "../copy";
import { CommunitySheet, type SheetTimes } from "./parts/community-sheet";

const T: SheetTimes = {
  typeFrom: 18,
  typeEvery: 3,
  rowsFrom: 48,
  rowsEvery: 4,
  tapRow: 76,
  toPreview: 82,
  chipsFrom: 90,
  press: 112,
  toast: 118,
};

export const Community: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const phoneH = vertical ? 1100 : 820;
  const rcSize = vertical ? 290 : 250;

  const phoneIn = spring({ frame: frame - 2, fps, config: { damping: 15, stiffness: 120, mass: 0.9 } });
  const rcIn = spring({ frame: frame - 10, fps, config: { damping: 13, stiffness: 140, mass: 0.8 } });

  // Recyclops: watches the typing, points at the results, watches the
  // preview, then celebrates when the calendar is added.
  const point = interpolate(frame, [T.rowsFrom - 2, T.rowsFrom + 6, T.tapRow + 2, T.tapRow + 10], [0, 1, 1, 0], {
    ...clamp,
    easing: EASE_OUT,
  });
  const jab = Math.sin((frame - T.rowsFrom) / 2.4) * 8 * point * interpolate(frame, [T.rowsFrom + 6, T.rowsFrom + 10, T.tapRow - 6, T.tapRow], [0, 1, 1, 0], clamp);
  const cheer = interpolate(frame, [T.toast - 2, T.toast + 6], [0, 1], { ...clamp, easing: EASE_OUT });
  const cheerT = frame - T.toast;
  const hop = cheerT > 0 ? Math.abs(Math.sin(cheerT / 4.2)) * 46 * interpolate(cheerT, [0, 4, 22, 28], [0, 1, 1, 0], clamp) : 0;
  const squash = cheerT > 0 ? 1 - Math.max(0, Math.cos(cheerT / 4.2) ** 8) * 0.08 * cheer : 1;
  const wiggle = Math.sin(cheerT / 2.2) * 14 * cheer;
  const lookUp = interpolate(frame, [T.typeFrom, T.typeFrom + 6], [0, 1], clamp);

  const armR = 18 + point * 120 + jab + cheer * 140 + wiggle;
  const armL = 18 + cheer * 140 - wiggle;

  return (
    <Scene name="Community">
      <Split
        caption={
          <Caption
            text={copy.community.caption.text}
            from={6}
            stagger={3}
            accent={copy.community.caption.accent}
            accentColor={ST.gruengut.ink}
          />
        }
        visual={
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: vertical ? 0 : 10 }}>
            <div
              style={{
                marginRight: vertical ? -40 : -20,
                marginBottom: vertical ? 10 : 0,
                zIndex: 1,
                translate: `${(1 - rcIn) * -200}px ${-hop}px`,
                opacity: interpolate(rcIn, [0, 0.3], [0, 1], clamp),
              }}
            >
              <Recyclops
                size={rcSize}
                lean={interpolate(point, [0, 1], [0, 6]) - cheer * 2}
                pose={{
                  armR,
                  armL,
                  lookX: 0.75 * lookUp + point * 0.25 - cheer * 0.7,
                  lookY: -0.35 * lookUp - point * 0.3 + cheer * 0.35,
                  browUp: point * 0.6 + cheer * 0.5,
                  smile: 0.5 + point * 0.3 + cheer * 0.5,
                  mouthOpen: cheer * 0.55 + point * 0.15,
                  happy: cheer,
                  squash,
                }}
              />
            </div>
            <div
              style={{
                translate: `0px ${(1 - phoneIn) * 260}px`,
                opacity: interpolate(phoneIn, [0, 0.25], [0, 1], clamp),
                rotate: `${(1 - phoneIn) * 4}deg`,
              }}
            >
              <Phone height={phoneH}>
                <CommunitySheet T={T} />
              </Phone>
            </div>
          </div>
        }
      />

      <Sfx at={3} src="swoosh.wav" volume={0.3} />
      {Array.from({ length: copy.community.query.length }, (_, i) => (
        <Sfx key={i} at={T.typeFrom + i * T.typeEvery} src={i % 2 ? "tick_002.ogg" : "tick_001.ogg"} volume={0.3} />
      ))}
      <Sfx at={T.rowsFrom} src="pluck_001.ogg" volume={0.45} />
      <Sfx at={T.tapRow} src="click_001.ogg" volume={0.6} />
      <Sfx at={T.toPreview} src="swoosh.wav" volume={0.25} />
      <Sfx at={T.chipsFrom + 2} src="pluck_002.ogg" volume={0.35} />
      <Sfx at={T.press} src="click_003.ogg" volume={0.6} />
      <Sfx at={T.toast} src="confirmation_001.ogg" volume={0.6} />
    </Scene>
  );
};
