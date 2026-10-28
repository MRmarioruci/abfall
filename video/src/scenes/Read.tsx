// 15–20 s. "Every date. Any calendar. Any language."
// The coloured pickup marks lift off a printed paper page and land, one
// after another, in the app's dark month card. Calendar titles in five
// languages drift past behind; Recyclops sits on the card and nods.
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Scene, Sfx, Split, clamp, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { ST } from "../theme";
import type { WasteStreamId } from "../app/colors";
import { useCopy } from "../copy";
import {
  CARD,
  CELL,
  LangChip,
  MARKS,
  MonthCard,
  PAPER,
  PaperPage,
  cardCell,
  paperDot,
  paperToStage,
} from "./parts/read-calendar";

// Stage, in native px; scaled to the format. 16:9 sets paper and card side
// by side; 9:16 stacks them diagonally to fill the taller frame.
const STAGE_W = 640;
type Layout = { h: number; paper: { x: number; y: number }; card: { x: number; y: number } };
const WIDE: Layout = { h: 640, paper: { x: 0, y: 200 }, card: { x: 285, y: 165 } };
const TALL: Layout = { h: 880, paper: { x: 10, y: 76 }, card: { x: 270, y: 400 } };
const RC_SIZE = 100;

// Timing.
const LAUNCH0 = 30;
const LAUNCH_GAP = 2.5;
const FLIGHT = 18;
const launchOf = (i: number) => Math.round(LAUNCH0 + i * LAUNCH_GAP);
const landOf = (i: number) => launchOf(i) + FLIGHT;
const LAST_LAND = landOf(MARKS.length - 1);
const NOD = LAST_LAND + 6;

// Deliberately multilingual in every version of the film: they illustrate
// "any language", so they are not in copy.ts.
const TITLES: { text: string; stream: WasteStreamId }[] = [
  { text: "Abfallkalender", stream: "papier" },
  { text: "Calendrier des déchets", stream: "karton" },
  { text: "Calendario dei rifiuti", stream: "gruengut" },
  { text: "Afvalkalender", stream: "glas" },
  { text: "Trash schedule", stream: "kehricht" },
];

const FLY_EASE = Easing.bezier(0.45, 0, 0.25, 1);

const Lane: React.FC<{ top: number; dir: 1 | -1; offset: number; order: number[] }> = ({ top, dir, offset, order }) => {
  const frame = useCurrentFrame();
  const x = offset + dir * frame * 1.6;
  const fade = interpolate(frame, [6, 24], [0, 1], clamp);
  const items = [...order, ...order];
  return (
    <div
      style={{
        position: "absolute",
        left: -80,
        width: STAGE_W + 160,
        top,
        overflow: "hidden",
        opacity: fade,
        maskImage: "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
      }}
    >
      <div style={{ display: "flex", gap: 14, translate: `${x}px 0px`, width: "max-content" }}>
        {items.map((k, i) => (
          <LangChip key={i} text={TITLES[k].text} stream={TITLES[k].stream} />
        ))}
      </div>
    </div>
  );
};

const Stage: React.FC<{ L: Layout }> = ({ L }) => {
  const frame = useCurrentFrame();
  const STAGE_H = L.h;
  const PAPER_POS = L.paper;
  const CARD_POS = L.card;
  const { fps } = useVideoConfig();

  // Paper and card enter.
  const paperIn = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const cardIn = spring({ frame: frame - 10, fps, config: { damping: 13, stiffness: 130, mass: 0.8 } });
  // After the marks leave, the paper sinks back a little.
  const paperBack = interpolate(frame, [LAST_LAND, LAST_LAND + 20], [0, 1], { ...clamp, easing: EASE_OUT });
  const paperRot = interpolate(paperIn, [0, 1], [-16, PAPER.rot]) - paperBack * 3;

  const launched = (day: number) => {
    const i = MARKS.findIndex((m) => m.day === day);
    return interpolate(frame, [launchOf(i), launchOf(i) + 6], [0, 1], clamp);
  };
  const landAt = (day: number) => {
    const i = MARKS.findIndex((m) => m.day === day);
    return i < 0 ? undefined : landOf(i);
  };

  // Recyclops drops onto the card, watches the marks, then nods.
  const drop = spring({ frame: frame - 16, fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const landSquash = interpolate(frame, [22, 25, 30], [1, 0.86, 1], clamp);
  const nodT = frame - NOD;
  const nodAmt = interpolate(frame, [NOD, NOD + 4, NOD + 34, NOD + 42], [0, 1, 1, 0], clamp);
  const nod = nodT > 0 ? Math.max(0, Math.sin(nodT / 2.6)) * nodAmt : 0;
  const happy = interpolate(frame, [NOD, NOD + 5, 140, 146], [0, 1, 1, 1], clamp);
  const watch = interpolate(frame, [26, 34, LAST_LAND - 4, NOD], [0, 1, 1, 0], clamp);
  const lookX = interpolate(frame, [26, LAUNCH0 + 4, LAST_LAND], [0, -0.95, 0.15], clamp) * watch;
  const fist = interpolate(frame, [NOD - 2, NOD + 5, 130, 140], [0, 1, 1, 0.3], { ...clamp, easing: EASE_OUT });

  return (
    <div style={{ position: "relative", width: STAGE_W, height: STAGE_H }}>
      <Lane top={6} dir={-1} offset={40} order={[0, 1, 2, 3, 4]} />
      <Lane top={STAGE_H - 46} dir={1} offset={-900} order={[3, 4, 0, 1, 2]} />

      <div
        style={{
          position: "absolute",
          left: PAPER_POS.x,
          top: PAPER_POS.y,
          rotate: `${paperRot}deg`,
          translate: `${(1 - paperIn) * -160 - paperBack * 14}px ${(1 - paperIn) * 120 + paperBack * 12}px`,
          opacity: interpolate(paperIn, [0, 0.4], [0, 1], clamp) * (1 - paperBack * 0.25),
          scale: String(1 - paperBack * 0.05),
        }}
      >
        <PaperPage launched={launched} />
      </div>

      <div
        style={{
          position: "absolute",
          left: CARD_POS.x,
          top: CARD_POS.y,
          opacity: interpolate(cardIn, [0, 0.3], [0, 1], clamp),
          translate: `0px ${(1 - cardIn) * 60}px`,
          scale: String(interpolate(cardIn, [0, 1], [0.9, 1])),
        }}
      >
        <MonthCard landAt={landAt} legendFrom={LAST_LAND - 4} />
      </div>

      {/* Recyclops perched on the card's top edge */}
      <div
        style={{
          position: "absolute",
          left: CARD_POS.x + CARD.w - RC_SIZE - 26,
          top: CARD_POS.y - RC_SIZE * 1.02 + 4,
          translate: `0px ${(1 - drop) * -260}px`,
          opacity: interpolate(drop, [0, 0.2], [0, 1], clamp),
        }}
      >
        <Recyclops
          size={RC_SIZE}
          lean={-nod * 4}
          pose={{
            squash: landSquash - nod * 0.07,
            lookX,
            lookY: watch * 0.55 + nod * 0.5,
            happy,
            smile: 0.5 + happy * 0.5,
            browUp: watch * 0.4 + happy * 0.3,
            armR: 18 + fist * 120,
            armL: 18 + watch * 14,
            mouthOpen: happy * 0.25,
          }}
        />
      </div>

      {/* Flying marks */}
      {MARKS.map((m, i) => {
        const a = launchOf(i);
        const b = landOf(i);
        if (frame < a || frame >= b) return null;
        const p = interpolate(frame, [a, b], [0, 1], { ...clamp, easing: FLY_EASE });
        const from = paperToStage(paperDot(m.day), PAPER_POS.x, PAPER_POS.y, PAPER.rot);
        const cell = cardCell(m.day);
        const to = { x: CARD_POS.x + cell.x + CELL / 2, y: CARD_POS.y + cell.y + CELL / 2 };
        const size = interpolate(p, [0, 1], [22, CELL - 4]);
        const x = interpolate(p, [0, 1], [from.x, to.x]);
        const y = interpolate(p, [0, 1], [from.y, to.y]) - Math.sin(Math.PI * p) * (70 + (i % 3) * 18);
        const lift = Math.sin(Math.PI * p);
        return (
          <div
            key={m.day}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: interpolate(p, [0, 1], [11, 11]),
              background: ST[m.stream].c,
              rotate: `${lift * (i % 2 ? 24 : -24)}deg`,
              scale: String(1 + lift * 0.18),
              boxShadow: `0 ${6 + lift * 14}px ${10 + lift * 18}px rgba(33,31,28,${0.12 + lift * 0.12})`,
            }}
          />
        );
      })}
    </div>
  );
};

export const Read: React.FC = () => {
  const vertical = useVertical();
  const copy = useCopy();
  const scale = vertical ? 1.42 : 1.32;
  const L = vertical ? TALL : WIDE;
  return (
    <Scene name="Read">
      <Split
        caption={<Caption text={copy.read.caption.text} accent={copy.read.caption.accent} from={6} stagger={4} />}
        visual={
          <div style={{ width: STAGE_W * scale, height: L.h * scale, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, scale: String(scale), transformOrigin: "0 0" }}>
              <Stage L={L} />
            </div>
          </div>
        }
      />
      <Sfx at={3} src="swoosh.wav" volume={0.3} />
      <Sfx at={20} src="drop_002.ogg" volume={0.4} />
      <Sfx at={LAUNCH0} src="whoosh.wav" volume={0.3} />
      {[0, 3, 6, 9, 12].map((i, k) => (
        <Sfx key={i} at={landOf(i)} src={k % 2 ? "tick_002.ogg" : "tick_001.ogg"} volume={0.45} />
      ))}
      <Sfx at={NOD} src="pluck_001.ogg" volume={0.55} />
      <Sfx at={NOD + 6} src="pluck_002.ogg" volume={0.4} />
    </Scene>
  );
};
