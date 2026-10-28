// The app's Home screen for the Outro, in phone units (390 × 844): the
// next-pickup hero (paper, tomorrow) and the dark month card. A small
// Recyclops lives on the card's bottom edge; he walks to two neighbouring
// legend labels, turns his back, puts a hand on each, swaps them, turns
// round again and winks.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, EASE_IN_OUT, EASE_OUT } from "../../kit/kit";
import { Recyclops } from "../../kit/Recyclops";
import { S, ST } from "../../theme";
import type { WasteStreamId } from "../../app/colors";
import { StreamGlyph } from "../../app/StreamGlyph";
import { useCopy, type Copy } from "../../copy";

// ── Layout (phone units) ─────────────────────────────────────────────────
export const CARD_X = 16;
export const CARD_Y = 316;
const CARD_W = 358;
const PAD = 20;
const GRID_Y = 98;
const CELL = (CARD_W - PAD * 2) / 7;
const LEGEND_Y = 360; // centre line of the legend row, card coords
const CARD_H = 385;

// Legend: fixed widths (per language, from copy) so we know exactly where
// each label is.
type LegendItem = { id: WasteStreamId; label: string; w: number };
const GAP = 12;
const legendFor = (copy: Copy) => {
  const w = copy.outro.legend;
  const LEGEND: LegendItem[] = [
    { id: "kehricht", label: copy.waste.kehricht, w: w.refuse },
    { id: "gruengut", label: copy.waste.gruengut, w: w.gruengut },
    { id: "papier", label: copy.waste.papier, w: w.papier },
    { id: "karton", label: copy.waste.karton, w: w.karton },
  ];
  const xsFor = (order: number[]) => {
    const xs: number[] = [];
    let x = PAD;
    for (const i of order) {
      xs[i] = x;
      x += LEGEND[i].w + GAP;
    }
    return xs;
  };
  const BEFORE = xsFor([0, 1, 2, 3]);
  const AFTER = xsFor([0, 2, 1, 3]);
  /** Between "Green waste" and "Paper": where he stands to swap them. */
  const SWAP_X = (BEFORE[1] + LEGEND[1].w + BEFORE[2]) / 2;
  return { LEGEND, BEFORE, AFTER, SWAP_X };
};

// ── Recyclops on the card ────────────────────────────────────────────────
const REC = 72;
const REC_H = Math.round(REC * 1.08);
const REC_S = REC / 100; // px per rig unit
const REC_TOP = CARD_H + 4 - REC_H; // his box top when standing on the card's edge
const HOME_X = CARD_W - 4;
const BODY = ST.gruengut.c;
const INK = ST.gruengut.ink;

/** Hand centre (card coords) for an arm angle, from the rig's geometry. */
const handAt = (cx: number, deg: number, side: -1 | 1) => {
  const a = (deg * Math.PI) / 180;
  return {
    x: cx + side * (31 + Math.sin(a) * 21) * REC_S,
    y: REC_TOP + (55.7 + 8 + Math.cos(a) * 21) * REC_S,
  };
};

/** Where the camera should look (phone screen units): just above the swap. */
export const focusFor = (copy: Copy) => ({ x: CARD_X + legendFor(copy).SWAP_X, y: CARD_Y + LEGEND_Y - 30 });

// ── Timeline (frames) ────────────────────────────────────────────────────
export const T = {
  walk: [12, 32] as const,
  turnAway: [34, 40] as const,
  /** Hands onto the two labels. */
  reach: [40, 45] as const,
  /** Labels lifted to his hands. */
  lift: [45, 50] as const,
  /** They trade sides over his head. */
  swap: 50,
  /** Set down in their new places, arms down. */
  setDown: [61, 67] as const,
  turnBack: [67, 72] as const,
  /** Scuttles back home, then winks at the camera. */
  walkHome: [71, 84] as const,
  wink: [85, 89, 95, 100] as const,
};

/** Camera x to follow him: swap spot, then home (phone screen units). */
export const HOME_FOCUS_X = CARD_X + HOME_X - 20;

const ARM_ON = 95; // hands on the legend row
const ARM_UP = 150; // holding the labels up
const LIFT = 22;

// October 2026 starts on a Thursday (Mon-first index 3). Today is the 21st.
const FIRST = 3;
const DAYS = 31;
const TODAY = 21;
const MARKS: Record<number, WasteStreamId[]> = {
  6: ["kehricht"],
  13: ["kehricht"],
  20: ["kehricht"],
  27: ["kehricht"],
  2: ["gruengut"],
  16: ["gruengut"],
  30: ["gruengut"],
  8: ["papier"],
  22: ["papier"],
  15: ["karton"],
  29: ["karton", "gruengut"],
};

const Chevron: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" style={{ scale: flip ? "-1 1" : undefined }}>
    <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeroCard: React.FC = () => {
  const s = ST.papier;
  const o = useCopy().outro;
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        top: 112,
        width: 358,
        height: 148,
        boxSizing: "border-box",
        borderRadius: 28,
        background: s.soft,
        padding: 20,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: "38px", color: s.ink }}>{o.tomorrow}</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: "33px", color: S.ink, marginTop: 4 }}>{o.heroStream}</div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: "17px", color: s.ink, opacity: 0.7, marginTop: 6 }}>{o.heroWhen}</div>
      </div>
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 99,
          background: s.c,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <StreamGlyph stream="papier" size={80} color={s.ink} />
        <div
          style={{
            position: "absolute",
            right: -2,
            top: -2,
            width: 32,
            height: 32,
            borderRadius: 99,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <path
              d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17ZM10 21h4"
              stroke={s.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

const LegendChip: React.FC<{ l: LegendItem; x: number; y: number; lift: number }> = ({ l, x, y, lift }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: LEGEND_Y - 8 + y,
        height: 16,
        width: l.w,
        display: "flex",
        alignItems: "center",
        gap: 6,
        scale: String(1 + lift * 0.1),
        whiteSpace: "nowrap",
      }}
    >
      {/* a dark pill behind a picked-up label so it reads over his back */}
      <div
        style={{
          position: "absolute",
          left: -6,
          right: -6,
          top: -4,
          bottom: -4,
          borderRadius: 99,
          background: "#34302C",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          opacity: lift,
        }}
      />
      <div style={{ position: "relative", width: 9, height: 9, borderRadius: 3, background: ST[l.id].c, flex: "0 0 auto" }} />
      <div style={{ position: "relative", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.1, color: `rgba(255,255,255,${0.75 + lift * 0.25})` }}>
        {l.label}
      </div>
    </div>
  );
};

const MonthCard: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const { LEGEND, BEFORE, AFTER, SWAP_X } = legendFor(copy);

  // ── Recyclops' routine ────────────────────────────────────────────────
  const walkP = interpolate(frame, [T.walk[0], T.walk[1]], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const homeP = interpolate(frame, [T.walkHome[0], T.walkHome[1]], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const walking =
    interpolate(frame, [T.walk[0], T.walk[0] + 4, T.walk[1] - 4, T.walk[1]], [0, 1, 1, 0], clamp) +
    interpolate(frame, [T.walkHome[0], T.walkHome[0] + 3, T.walkHome[1] - 4, T.walkHome[1]], [0, 1, 1, 0], clamp);
  const cx = HOME_X + (SWAP_X - HOME_X) * walkP + (HOME_X - SWAP_X) * homeP;

  // Turning: squeeze in, flip the side shown at the narrowest point, open out.
  const midAway = (T.turnAway[0] + T.turnAway[1]) / 2;
  const midBack = (T.turnBack[0] + T.turnBack[1]) / 2;
  const turn =
    interpolate(frame, [T.turnAway[0], midAway, T.turnAway[1]], [0, 1, 0], clamp) +
    interpolate(frame, [T.turnBack[0], midBack, T.turnBack[1]], [0, 1, 0], clamp);
  const back = frame >= midAway && frame < midBack;

  // Arms: onto the labels, up with them, a little wobble while they cross,
  // then down as they're set in place.
  const reach = interpolate(frame, [T.reach[0], T.reach[1]], [0, 1], { ...clamp, easing: EASE_OUT });
  const up = interpolate(frame, [T.lift[0], T.lift[1]], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const down = interpolate(frame, [T.setDown[0], T.setDown[1]], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const wig = Math.sin((frame - T.swap) / 2) * 6 * interpolate(frame, [T.swap, T.swap + 2, T.setDown[0] - 2, T.setDown[0]], [0, 1, 1, 0], clamp);
  const armBase = 18 + reach * (ARM_ON - 18) + up * (ARM_UP - ARM_ON);
  // Down: back through "on the row" (setting them down) to rest.
  const armDown = interpolate(down, [0, 0.5, 1], [0, ARM_UP - ARM_ON, ARM_UP - 18], clamp);
  const armL = armBase - armDown + wig;
  const armR = armBase - armDown - wig;
  const squash = 1 + up * 0.05 - down * 0.05 + interpolate(down, [0.5, 0.75, 1], [0, 0.04, 0.05], clamp);

  // The two labels: picked up by their inner ends, carried over his head
  // to the other side, set down in each other's place.
  const hL = handAt(SWAP_X, ARM_UP, -1);
  const hR = handAt(SWAP_X, ARM_UP, 1);
  const heldL = (w: number) => hL.x + 10 - w; // left label's right end in his left hand
  const heldR = () => hR.x - 10; // right label's left end in his right hand
  const sw = spring({ frame: frame - T.swap, fps, config: { damping: 14, stiffness: 110, mass: 0.9 } });
  const arc = Math.sin(Math.min(1, Math.max(0, sw)) * Math.PI);
  const liftY = -LIFT * up * (1 - interpolate(down, [0.15, 1], [0, 1], clamp));
  const chip = (i: 1 | 2) => {
    const w = LEGEND[i].w;
    const start = i === 1 ? heldL(w) : heldR();
    const end = i === 1 ? heldR() : heldL(w);
    let x = BEFORE[i] + (start - BEFORE[i]) * up;
    x += (end - start) * sw;
    x += (AFTER[i] - end) * interpolate(down, [0.15, 1], [0, 1], { ...clamp, easing: EASE_IN_OUT });
    // Green goes over the top, Paper ducks a little under.
    const y = liftY + arc * (i === 1 ? -20 : 5);
    return { x, y };
  };
  const held = interpolate(frame, [T.reach[1] - 2, T.reach[1] + 1, T.setDown[1] - 2, T.setDown[1] + 2], [0, 1, 1, 0], clamp);

  // Wink: lid shut while he smiles, a head tilt and a little wave.
  const wink = interpolate(frame, [...T.wink], [0, 1, 1, 0], { ...clamp, easing: EASE_IN_OUT });
  const lookX = walking > 0.05 ? (frame > T.walkHome[0] ? 0.8 : -0.8) : 0;
  const lookUp = frame < midAway ? interpolate(frame, [T.walk[1] - 2, T.turnAway[0] + 2], [0, -0.7], clamp) : 0;
  // Hands drawn on top of the labels (his own hands sit under them).
  const handsOn = back && reach > 0.6 && frame < T.setDown[1];
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 28,
        background: S.ink,
        boxShadow: "0 16px 36px rgba(33,31,28,0.3)",
        opacity: enter,
        translate: `0px ${(1 - enter) * 40}px`,
        color: "#fff",
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: PAD, top: 18 }}>
        <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.5 }}>{copy.outro.month}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{copy.outro.monthSub}</div>
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 22,
            left: CARD_W - PAD - 34 - (1 - i) * 42,
            width: 34,
            height: 34,
            borderRadius: 99,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Chevron flip={i === 0} />
        </div>
      ))}
      {/* weekdays */}
      {copy.outro.weekdays.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 76,
            left: PAD + i * CELL,
            width: CELL,
            textAlign: "center",
            fontSize: 11.5,
            fontWeight: 700,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {d}
        </div>
      ))}
      {/* days */}
      {Array.from({ length: DAYS }, (_, k) => {
        const d = k + 1;
        const idx = FIRST + k;
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const marks = MARKS[d] ?? [];
        const isToday = d === TODAY;
        const pop = spring({ frame: frame - 6 - (row + col) * 0.8, fps, config: { damping: 14, stiffness: 170 } });
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: PAD + col * CELL + 2,
              top: GRID_Y + row * CELL + 2,
              width: CELL - 4,
              height: CELL - 4,
              borderRadius: 11,
              overflow: "hidden",
              display: "flex",
              background: isToday ? "#fff" : "rgba(255,255,255,0.06)",
              scale: String(0.7 + pop * 0.3),
              opacity: pop,
            }}
          >
            {!isToday && marks.map((m) => <div key={m} style={{ flex: 1, background: ST[m].soft }} />)}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: isToday ? 800 : 600,
                color: isToday ? S.ink : marks[0] ? ST[marks[0]].ink : "rgba(255,255,255,0.55)",
              }}
            >
              {d}
            </div>
          </div>
        );
      })}
      {/* Recyclops, standing on the card's bottom edge */}
      <div style={{ position: "absolute", left: cx - REC / 2, top: REC_TOP }}>
        <Recyclops
          size={REC}
          walking={walking}
          back={back}
          turn={turn}
          lean={walking * (frame > T.walkHome[0] ? 4 : -4) + wink * 7}
          pose={{
            // Leave the arms to the walk cycle until he reaches up.
            ...(frame >= T.reach[0] ? { armL: armL + wink * 10, armR: armR + wink * 60 } : {}),
            squash,
            lookX: wink > 0 ? 0 : lookX,
            lookY: lookUp,
            happy: wink,
            smile: 0.5 + wink * 0.5,
            browUp: wink * 0.8 - lookUp * 0.3,
            browTilt: -wink * 0.3,
          }}
        />
      </div>

      {/* legend, over him so the picked-up labels stay readable */}
      <div style={{ position: "absolute", left: PAD, right: PAD, top: LEGEND_Y - 22, height: 1, background: "rgba(255,255,255,0.12)" }} />
      {LEGEND.map((_, i) => {
        if (i === 1 || i === 2) {
          const { x, y } = chip(i);
          return <LegendChip key={i} l={LEGEND[i]} x={x} y={y} lift={held} />;
        }
        return <LegendChip key={i} l={LEGEND[i]} x={BEFORE[i]} y={0} lift={0} />;
      })}
      {handsOn &&
        ([-1, 1] as const).map((side) => {
          const h = handAt(cx, side === -1 ? armL : armR, side);
          // Squash lifts his shoulders (rig: shoulder sits 0.46 × body height up).
          return (
            <svg
              key={side}
              width={REC * 0.16}
              height={REC * 0.16}
              viewBox="-8 -8 16 16"
              style={{ position: "absolute", left: h.x - REC * 0.08, top: h.y - REC * 0.08 - (squash - 1) * 31.3 * REC_S }}
            >
              <circle r={5.8} fill={BODY} stroke={INK} strokeWidth={1.6} />
            </svg>
          );
        })}
    </div>
  );
};

export const HomeScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const o = useCopy().outro;
  const { fps } = useVideoConfig();
  const hero = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 150 } });
  const cal = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", inset: 0, background: S.bg, color: S.ink }}>
      {/* status bar */}
      <div style={{ position: "absolute", left: 34, top: 17, fontSize: 15, fontWeight: 700 }}>9:41</div>
      <div style={{ position: "absolute", right: 30, top: 20, display: "flex", gap: 5, alignItems: "center" }}>
        {[5, 8, 11, 14].map((h, i) => (
          <div key={i} style={{ width: 3, height: h, borderRadius: 1, background: S.ink, alignSelf: "flex-end" }} />
        ))}
        <div style={{ width: 24, height: 12, borderRadius: 4, border: `1.5px solid ${S.ink}`, marginLeft: 4, padding: 1.5, boxSizing: "border-box" }}>
          <div style={{ width: "75%", height: "100%", borderRadius: 2, background: S.ink }} />
        </div>
      </div>
      {/* header: location pill + add */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 60,
          height: 40,
          padding: "0 16px 0 12px",
          borderRadius: 99,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke={S.ink} strokeWidth={2.2} />
          <circle cx={12} cy={9.5} r={2.4} fill={S.ink} />
        </svg>
        {o.location}
      </div>
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 60,
          width: 40,
          height: 40,
          borderRadius: 99,
          background: S.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: hero, translate: `0px ${(1 - hero) * 30}px` }}>
        <HeroCard />
      </div>

      {/* calendar title row */}
      <div style={{ position: "absolute", left: 20, top: 278, fontSize: 18, fontWeight: 800, letterSpacing: -0.3, opacity: cal }}>
        {o.calendarTitle}
      </div>
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 274,
          height: 30,
          padding: "0 12px",
          borderRadius: 99,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
          opacity: cal,
        }}
      >
        {o.switch}
      </div>

      <MonthCard enter={cal} />

      {/* the fun-fact card peeking below, as on Home */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 718,
          width: 358,
          height: 96,
          boxSizing: "border-box",
          borderRadius: 24,
          background: ST.karton.soft,
          padding: "16px 20px",
          opacity: cal,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: "20px", color: ST.karton.ink }}>
          {o.funFact}
        </div>
      </div>
    </div>
  );
};
