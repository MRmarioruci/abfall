// The old way: a printed municipal waste calendar. A dense year grid of
// tiny coloured marks, drawn as one SVG. Shared by Problem and Scan.
import { FONT, ST } from "../../theme";
import type { WasteStreamId } from "../../app/colors";
import { useCopy } from "../../copy";

export const PAGE_W = 360;
export const PAGE_H = 500;

const PAPER = "#FFFCF5";
const PRINT = "#2A2622";
const FAINT = "#8C847A";
const GRID = "#E7E0D5";

const STREAMS: WasteStreamId[] = ["kehricht", "papier", "karton", "gruengut", "metall", "glas"];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FIRST_DOW = [3, 6, 6, 2, 4, 0, 2, 5, 1, 3, 6, 1]; // 2026, Monday = 0

const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Geometry
const PAD = 16;
const GRID_TOP = 74;
const GRID_BOTTOM = PAGE_H - 46;
const GAP = 7;
const MW = (PAGE_W - PAD * 2 - GAP * 2) / 3;
const MH = (GRID_BOTTOM - GRID_TOP - GAP * 3) / 4;
const CW = MW / 7;
const CH = (MH - 14) / 6;

const cellOf = (m: number, d: number) => {
  const col = m % 3;
  const row = Math.floor(m / 3);
  const idx = FIRST_DOW[m] + d - 1;
  const x = PAD + col * (MW + GAP) + (idx % 7) * CW;
  const y = GRID_TOP + row * (MH + GAP) + 14 + Math.floor(idx / 7) * CH;
  return { x, y };
};

/** Marks per day: deterministic, dense, a bit chaotic like the real ones. */
const marksOf = (m: number, d: number): WasteStreamId[] => {
  const out: WasteStreamId[] = [];
  const dow = (FIRST_DOW[m] + d - 1) % 7;
  if (dow === 1) out.push("kehricht"); // weekly refuse on Tuesdays
  const r = rnd(m * 41 + d * 7);
  if (r < 0.2) out.push(STREAMS[1 + Math.floor(rnd(m * 13 + d * 3) * 5)]);
  if (r < 0.05 && dow < 5) out.push(STREAMS[1 + Math.floor(rnd(m * 5 + d * 17) * 5)]);
  return out.filter((s, i, a) => a.indexOf(s) === i).slice(0, 2);
};

/** Centre (in page units) of the first mark of `stream` in month `m`, after day `after`. */
export const findMark = (stream: WasteStreamId, m: number, after = 1) => {
  for (let mm = m; mm < 12; mm++) {
    for (let d = mm === m ? after : 1; d <= DAYS_IN[mm]; d++) {
      const ms = marksOf(mm, d);
      const i = ms.indexOf(stream);
      if (i >= 0) {
        const { x, y } = cellOf(mm, d);
        return { x: x + CW / 2, y: y + CH - 3.5 - i * 3.6 };
      }
    }
  }
  const { x, y } = cellOf(m, after);
  return { x: x + CW / 2, y: y + CH / 2 };
};

export const PaperPage: React.FC<{
  width: number;
  /** Pin pop-in 0–1 (scale); omit for no pin. */
  pin?: number;
  /** Extra SVG drawn on top, in page units (0–360 × 0–500). */
  children?: React.ReactNode;
  shadow?: boolean;
}> = ({ width, pin, children, shadow = true }) => {
  const copy = useCopy();
  const height = (width * PAGE_H) / PAGE_W;
  // Fit the title to the page width (≈0.66 em per bold capital).
  const title = copy.printed.title.toUpperCase();
  const titleSize = Math.min(21, (PAGE_W - PAD * 2) / (title.length * 0.66));
  // Legend: each entry as wide as its label, spread over the page width.
  const LEGEND_FS = 7.4;
  const legendW = STREAMS.map((s) => 15 + copy.waste[s].length * LEGEND_FS * 0.56);
  const legendGap = (PAGE_W - PAD * 2 - legendW.reduce((a, b) => a + b, 0)) / (STREAMS.length - 1);
  const legendX = legendW.map((_, i) => PAD + legendW.slice(0, i).reduce((a, b) => a + b + legendGap, 0));
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      style={{ overflow: "visible", display: "block", filter: shadow ? "drop-shadow(0 18px 26px rgba(80,60,40,0.22)) drop-shadow(0 3px 6px rgba(80,60,40,0.14))" : undefined }}
    >
      <rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={PAPER} />
      {/* faint fold across the middle */}
      <rect x={0} y={PAGE_H / 2 - 1} width={PAGE_W} height={2} fill="rgba(120,100,80,0.05)" />

      <text x={PAD} y={45} fontFamily={FONT} fontWeight={900} fontSize={titleSize} fill={PRINT} letterSpacing={0.4}>
        {title}
      </text>
      <text x={PAD} y={59} fontFamily={FONT} fontWeight={600} fontSize={9} fill={FAINT}>
        {copy.printed.subtitle}
      </text>
      <rect x={PAD} y={65} width={PAGE_W - PAD * 2} height={1.4} fill={PRINT} />

      {copy.printed.months.map((name, m) => {
        const col = m % 3;
        const row = Math.floor(m / 3);
        const mx = PAD + col * (MW + GAP);
        const my = GRID_TOP + row * (MH + GAP);
        return (
          <g key={name}>
            <text x={mx} y={my + 9} fontFamily={FONT} fontWeight={800} fontSize={7.6} fill={PRINT} letterSpacing={0.5}>
              {name}
            </text>
            {Array.from({ length: DAYS_IN[m] }, (_, i) => {
              const d = i + 1;
              const { x, y } = cellOf(m, d);
              const marks = marksOf(m, d);
              const weekend = (FIRST_DOW[m] + i) % 7 >= 5;
              return (
                <g key={d}>
                  <rect x={x + 0.4} y={y + 0.4} width={CW - 0.8} height={CH - 0.8} fill={weekend ? "#F4EEE4" : "none"} stroke={GRID} strokeWidth={0.6} />
                  <text x={x + 1.6} y={y + 4.6} fontFamily={FONT} fontWeight={700} fontSize={3.8} fill={FAINT}>
                    {d}
                  </text>
                  {marks.map((s, j) => (
                    <rect key={s} x={x + 2} y={y + CH - 5 - j * 3.6} width={CW - 4} height={3} rx={1} fill={ST[s].c} />
                  ))}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* legend */}
      <rect x={PAD} y={GRID_BOTTOM + 8} width={PAGE_W - PAD * 2} height={0.8} fill={GRID} />
      {STREAMS.map((s, i) => {
        const x = legendX[i];
        return (
          <g key={s}>
            <rect x={x} y={GRID_BOTTOM + 18} width={12} height={7} rx={1.5} fill={ST[s].c} />
            <text x={x + 15} y={GRID_BOTTOM + 24.5} fontFamily={FONT} fontWeight={700} fontSize={7.4} fill={PRINT}>
              {copy.waste[s]}
            </text>
          </g>
        );
      })}
      <text x={PAD} y={PAGE_H - 9} fontFamily={FONT} fontWeight={600} fontSize={5.6} fill={FAINT}>
        {copy.printed.footnote}
      </text>

      {children}

      {pin !== undefined && (
        <g style={{ scale: String(pin), transformOrigin: `${PAGE_W / 2}px 11px` }}>
          <ellipse cx={PAGE_W / 2 + 3} cy={17} rx={8} ry={3.5} fill="rgba(60,40,20,0.25)" />
          <circle cx={PAGE_W / 2} cy={11} r={8.5} fill="#E0574A" />
          <circle cx={PAGE_W / 2} cy={11} r={8.5} fill="none" stroke="#A8362B" strokeWidth={1.4} />
          <circle cx={PAGE_W / 2 - 3.2} cy={8} r={2.6} fill="rgba(255,255,255,0.65)" />
        </g>
      )}
    </svg>
  );
};
