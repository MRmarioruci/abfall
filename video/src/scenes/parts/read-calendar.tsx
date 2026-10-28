// Read scene pieces: the printed paper page and the app's dark month card
// (after src/components/CalendarMonth.tsx in the app), laid out on fixed
// coordinates so the flying marks know exactly where to take off and land.

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import type { WasteStreamId } from "../../app/colors";
import { useCopy } from "../../copy";

// ─── the month: June 2026 starts on a Monday, 30 days, 5 rows ─────────────
export const FIRST_DAY = 0;
export const DAYS = 30;
export const TODAY = 8;

export type Mark = { day: number; stream: WasteStreamId };

/** Pickups in launch order (by date, so the cascade reads top to bottom). */
export const MARKS: Mark[] = [
  { day: 2, stream: "kehricht" },
  { day: 3, stream: "karton" },
  { day: 5, stream: "gruengut" },
  { day: 9, stream: "kehricht" },
  { day: 10, stream: "papier" },
  { day: 11, stream: "glas" },
  { day: 16, stream: "kehricht" },
  { day: 17, stream: "karton" },
  { day: 19, stream: "gruengut" },
  { day: 23, stream: "kehricht" },
  { day: 24, stream: "papier" },
  { day: 25, stream: "metall" },
  { day: 30, stream: "kehricht" },
];

export const LEGEND: WasteStreamId[] = ["kehricht", "papier", "karton", "glas", "gruengut", "metall"];

const cellOf = (day: number) => {
  const idx = FIRST_DAY + day - 1;
  return { c: idx % 7, r: Math.floor(idx / 7) };
};

// ─── card geometry (in the card's own px, app scale) ──────────────────────
export const CARD = { w: 350, h: 408, pad: 20, gridTop: 98 };
export const CELL = (CARD.w - CARD.pad * 2) / 7;

/** Top-left of a day cell inside the card. */
export const cardCell = (day: number) => {
  const { c, r } = cellOf(day);
  return { x: CARD.pad + c * CELL, y: CARD.gridTop + r * CELL };
};

// ─── paper geometry ────────────────────────────────────────────────────────
export const PAPER = { w: 250, h: 330, rot: -5, gridLeft: 20, gridTop: 96, cell: 30 };

/** Centre of a printed dot inside the paper (unrotated). */
export const paperDot = (day: number) => {
  const { c, r } = cellOf(day);
  return { x: PAPER.gridLeft + c * PAPER.cell + PAPER.cell / 2, y: PAPER.gridTop + r * PAPER.cell + PAPER.cell / 2 };
};

/** Paper-local point to stage point, given the paper's top-left and rotation. */
export const paperToStage = (p: { x: number; y: number }, left: number, top: number, rotDeg: number) => {
  const cx = PAPER.w / 2;
  const cy = PAPER.h / 2;
  const a = (rotDeg * Math.PI) / 180;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: left + cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: top + cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
};

/** The printed municipal page. `launched(day)` → 0..1 how far that dot has left. */
export const PaperPage: React.FC<{ launched: (day: number) => number }> = ({ launched }) => {
  const copy = useCopy();
  const byDay = new Map<number, WasteStreamId>();
  for (const m of MARKS) byDay.set(m.day, m.stream);
  return (
    <div
      style={{
        width: PAPER.w,
        height: PAPER.h,
        background: "linear-gradient(160deg, #FFFDF8 0%, #F7F1E6 100%)",
        borderRadius: 6,
        boxShadow: "0 18px 40px rgba(80,60,40,0.18), 0 2px 6px rgba(80,60,40,0.12)",
        position: "relative",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* fold line */}
      <div style={{ position: "absolute", left: 0, right: 0, top: PAPER.h * 0.52, height: 1, background: "rgba(80,60,40,0.08)" }} />
      <div style={{ position: "absolute", left: 20, top: 18, right: 20 }}>
        <div
          style={{
            // One line on the 210 px page: shrink long titles (≈0.55 em per character).
            fontSize: Math.min(16, (PAPER.w - 40) / (copy.read.paperTitle.length * 0.55)),
            whiteSpace: "nowrap",
            fontWeight: 800,
            color: "#2E2A26",
            letterSpacing: -0.3,
          }}
        >
          {copy.read.paperTitle}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(46,42,38,0.55)", marginTop: 2 }}>{copy.read.paperSub}</div>
      </div>
      {/* weekday heads */}
      {copy.read.paperWeekdays.map((w, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: PAPER.gridLeft + i * PAPER.cell,
            width: PAPER.cell,
            top: PAPER.gridTop - 18,
            textAlign: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(46,42,38,0.5)",
          }}
        >
          {w}
        </div>
      ))}
      {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => {
        const p = paperDot(d);
        const s = byDay.get(d);
        const gone = s ? launched(d) : 0;
        return (
          <div key={d} style={{ position: "absolute", left: p.x - 11, top: p.y - 11, width: 22, height: 22 }}>
            {s && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 99,
                    border: `1.5px dashed ${ST[s].c}`,
                    opacity: gone * 0.9,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 99,
                    background: ST[s].c,
                    opacity: 1 - gone,
                  }}
                />
              </>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: s && gone < 0.5 ? ST[s].ink : "rgba(46,42,38,0.6)",
              }}
            >
              {d}
            </div>
          </div>
        );
      })}
      {/* printed legend */}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: PAPER.gridTop + PAPER.cell * 5 + 14,
          display: "flex",
          flexWrap: "wrap",
          rowGap: 6,
          columnGap: 12,
        }}
      >
        {LEGEND.map((id) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 62 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: ST[id].c }} />
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(46,42,38,0.65)" }}>{copy.waste[id]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** When each day's mark lands (frame), or undefined if it has none. */
export type LandAt = (day: number) => number | undefined;

/** The app's dark month card. Cells fill in as their marks land. */
export const MonthCard: React.FC<{ landAt: LandAt; legendFrom: number }> = ({ landAt, legendFrom }) => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const byDay = new Map<number, WasteStreamId>();
  for (const m of MARKS) byDay.set(m.day, m.stream);
  return (
    <div
      style={{
        width: CARD.w,
        height: CARD.h,
        background: S.ink,
        borderRadius: 28,
        position: "relative",
        boxShadow: "0 16px 36px rgba(33,31,28,0.3)",
        fontFamily: FONT,
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: CARD.pad, top: CARD.pad }}>
        <div style={{ fontSize: 23, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.1 }}>{copy.read.month}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>{copy.read.monthSub}</div>
      </div>
      <div style={{ position: "absolute", right: CARD.pad, top: CARD.pad + 2, display: "flex", gap: 8 }}>
        {[-1, 1].map((dir) => (
          <div
            key={dir}
            style={{
              width: 34,
              height: 34,
              borderRadius: 99,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" style={{ scale: `${dir} 1` }}>
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
      {/* weekdays */}
      {copy.read.weekdays.map((w, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: CARD.pad + i * CELL,
            width: CELL,
            top: CARD.gridTop - 20,
            textAlign: "center",
            fontSize: 11.5,
            fontWeight: 700,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {w}
        </div>
      ))}
      {/* days */}
      {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => {
        const { x, y } = cardCell(d);
        const s = byDay.get(d);
        const at = landAt(d);
        const landed = at !== undefined && frame >= at;
        const pop = landed ? spring({ frame: frame - at!, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } }) : 0;
        const isToday = d === TODAY;
        const flash = landed ? interpolate(frame - at!, [0, 10], [0.9, 0], clamp) : 0;
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: x + 2,
              top: y + 2,
              width: CELL - 4,
              height: CELL - 4,
              borderRadius: 11,
              background: isToday ? "#fff" : "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {s && landed && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: ST[s].soft,
                  borderRadius: 11,
                  scale: String(interpolate(pop, [0, 1], [0.4, 1])),
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: isToday ? 800 : 600,
                color: isToday ? S.ink : s && landed ? ST[s].ink : "rgba(255,255,255,0.55)",
              }}
            >
              {d}
            </div>
            {flash > 0 && (
              <div style={{ position: "absolute", inset: 0, borderRadius: 11, boxShadow: `inset 0 0 0 2px rgba(255,255,255,${flash})` }} />
            )}
          </div>
        );
      })}
      {/* legend */}
      <div
        style={{
          position: "absolute",
          left: CARD.pad,
          right: CARD.pad,
          top: CARD.gridTop + CELL * 5 + 12,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          flexWrap: "wrap",
          rowGap: 9,
          columnGap: 12,
        }}
      >
        {LEGEND.map((id, i) => {
          const s = spring({ frame: frame - legendFrom - i * 3, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, opacity: s, translate: `0px ${(1 - s) * 8}px` }}>
              <div style={{ width: 9, height: 9, borderRadius: 3, background: ST[id].c }} />
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{copy.waste[id]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** One title chip for the language drift. */
export const LangChip: React.FC<{ text: string; stream: WasteStreamId }> = ({ text, stream }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px 8px 10px",
      borderRadius: 99,
      background: ST[stream].soft,
      color: ST[stream].ink,
      fontFamily: FONT,
      fontSize: 19,
      fontWeight: 700,
      whiteSpace: "nowrap",
      letterSpacing: -0.2,
    }}
  >
    <div style={{ width: 18, height: 18, borderRadius: 6, background: ST[stream].c }} />
    {text}
  </div>
);
