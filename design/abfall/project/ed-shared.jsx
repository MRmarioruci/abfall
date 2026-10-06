// Abfall Scanner — EDITORIAL (dark) design system
// Inspired by a dark, color-block, serif-display aesthetic.

const D = {
  bg:   '#0A0A0B',
  bg2:  '#161618',
  bg3:  '#202023',
  ink:  '#FFFFFF',
  sec:  'rgba(255,255,255,0.62)',
  ter:  'rgba(255,255,255,0.34)',
  line: 'rgba(255,255,255,0.10)',
  lime: '#C2F03D',
  limeDeep: '#9FD423',
  onDark: '#15160F', // dark text used on vibrant cards
};

// vibrant block color per waste stream (+ readable ink on it)
const ST = {
  papier:  { label: 'Papier',   en: 'Paper & cardboard', tag: 'Paper',  c: '#5EA8F5', ink: '#0B1B30' },
  karton:  { label: 'Karton',   en: 'Flattened carton',  tag: 'Carton', c: '#F2CE4B', ink: '#2A2206' },
  kehricht:{ label: 'Kehricht', en: 'Household refuse',   tag: 'Refuse', c: '#EE8A6A', ink: '#2E120A' },
  gruengut:{ label: 'Grüngut',  en: 'Garden & organic',   tag: 'Green',  c: '#BFF03D', ink: '#172105' },
  metall:  { label: 'Metall',   en: 'Metal & tins',       tag: 'Metal',  c: '#4FE0C4', ink: '#04261F' },
};
const ORDER = ['papier', 'karton', 'kehricht', 'gruengut', 'metall'];

const esw = (w = 1.7) => ({ fill: 'none', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });

const EIco = {
  search: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" stroke={c} {...esw(1.8)} /><path d="m15.5 15.5 4 4" stroke={c} {...esw(1.8)} /></svg>),
  heart: (c, s = 19, fill = 'none') => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 20.5C5.5 16 3 12.4 3 8.9 3 6.2 5.1 4 7.9 4c1.7 0 3.2.9 4.1 2.3C12.9 4.9 14.4 4 16.1 4 18.9 4 21 6.2 21 8.9c0 3.5-2.5 7.1-9 11.6Z" fill={fill} stroke={c} {...esw(1.7)} /></svg>),
  arrowR: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 12h15m0 0-6-6m6 6-6 6" stroke={c} {...esw(2)} /></svg>),
  arrowLong: (c, s = 22) => (<svg width={s} height={s * 0.55} viewBox="0 0 40 22"><path d="M2 11h34m0 0-8-7m8 7-8 7" stroke={c} {...esw(2)} /></svg>),
  back: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M13 5l-7 7 7 7M7 12h12" stroke={c} {...esw(2)} /></svg>),
  chevR: (c, s = 16) => (<svg width={s * 0.62} height={s} viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  bell: (c, s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.4 6 1.4 6H4.6S6 14.5 6 10Z" stroke={c} {...esw(1.7)} /><path d="M10 19.5a2 2 0 0 0 4 0" stroke={c} {...esw(1.7)} /></svg>),
  home: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 11 12 4l8 7M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" stroke={c} {...esw(1.9)} /></svg>),
  cal: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke={c} {...esw(1.8)} /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={c} {...esw(1.8)} /></svg>),
  camera: (c, s = 26) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.1-1.8a1 1 0 0 1 .85-.47h5.6a1 1 0 0 1 .85.47L16.7 6.5h1.8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z" stroke={c} {...esw(1.8)} /><circle cx="12" cy="12.7" r="3.4" stroke={c} {...esw(1.8)} /></svg>),
  user: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.7" stroke={c} {...esw(1.8)} /><path d="M5 20a7 7 0 0 1 14 0" stroke={c} {...esw(1.8)} /></svg>),
  clock: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke={c} {...esw(1.7)} /><path d="M12 7.5V12l3 2" stroke={c} {...esw(1.7)} /></svg>),
  check: (c, w = 2.6, s = 16) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" stroke={c} {...esw(w)} /></svg>),
  plus: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke={c} {...esw(2.1)} /></svg>),
  x: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke={c} {...esw(2)} /></svg>),
  sun: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke={c} {...esw(1.7)} /><path d="M12 2v2.5M12 19.5V22M4 12H1.5M22.5 12H20M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke={c} {...esw(1.6)} /></svg>),
  moon: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke={c} {...esw(1.7)} /></svg>),
  locate: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke={c} {...esw(1.8)} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={c} {...esw(1.8)} /></svg>),
  pin: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 21c4-4.5 6.5-8 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3 2.5 6.5 6.5 11Z" stroke={c} {...esw(1.8)} /><circle cx="12" cy="10" r="2.3" stroke={c} {...esw(1.8)} /></svg>),
  flash: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" stroke={c} {...esw(1.7)} /></svg>),
};

// big stream glyph for hero/cards (drawn in the card's ink color)
function StreamGlyph({ stream, size = 96, c }) {
  const col = c || ST[stream].ink;
  const P = {
    papier: <g><path d="M22 14h26L60 26v48H22a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2Z" stroke={col} {...esw(3)} /><path d="M48 14v12h12M30 40h22M30 50h22M30 30h10" stroke={col} {...esw(3)} /></g>,
    karton: <g><path d="M12 26 44 12l32 14v30L44 70 12 56V26Z" stroke={col} {...esw(3)} /><path d="M12 26 44 38m0 0 32-12M44 38v32" stroke={col} {...esw(3)} /></g>,
    kehricht: <g><path d="M18 26h52l-4 46a4 4 0 0 1-4 3.6H26a4 4 0 0 1-4-3.6L18 26Z" stroke={col} {...esw(3)} /><path d="M12 26h64M32 26v-7a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v7M34 38v26M54 38v26M44 38v26" stroke={col} {...esw(3)} /></g>,
    gruengut: <g><path d="M44 76c18-3 28-15 28-34 0-5-1-10-3-14-10 1.5-18 6-23 12-7 9-7 18-2 36Z" stroke={col} {...esw(3)} /><path d="M44 76c-3-14-10-22-21-26" stroke={col} {...esw(3)} /></g>,
    metall: <g><path d="M26 22h36v44a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V22Z" stroke={col} {...esw(3)} /><path d="M26 34h36M26 22c0-4 36-4 36 0" stroke={col} {...esw(3)} /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 88 88">{P[stream]}</svg>;
}

// little circular icon button (top-left of cards, header)
function CircBtn({ children, bg = 'rgba(255,255,255,0.10)', size = 44, style }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 99, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      {children}
    </div>
  );
}

// editorial pill toggle (the lime sliding capsule from the reference)
function PillToggle({ on, onChange, leftIcon, rightIcon }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, padding: 6,
      borderRadius: 99, border: 'none', cursor: 'pointer',
      background: on ? D.lime : D.bg3, transition: 'background .25s',
    }}>
      <span style={{ width: 44, height: 44, borderRadius: 99, background: on ? '#fff' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {leftIcon(on ? D.onDark : D.sec, 20)}
      </span>
      <span style={{ display: 'flex', gap: 3, paddingRight: 2 }}>
        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: 99, background: on ? D.onDark : D.ter }} />)}
      </span>
      <span style={{ width: 44, height: 44, borderRadius: 99, background: on ? '#fff' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -4 }}>
        {rightIcon(on ? D.onDark : D.sec, 20)}
      </span>
    </button>
  );
}

// iOS-style switch, dark
function ESwitch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 50, height: 30, borderRadius: 99, border: 'none', padding: 2, flexShrink: 0,
      background: on ? D.lime : 'rgba(255,255,255,0.16)', cursor: 'pointer',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .25s', boxSizing: 'border-box',
    }}>
      <span style={{ width: 26, height: 26, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

// dark editorial calendar sheet
function DarkCalendar({ compact = false }) {
  const days = [];
  for (let d = 1; d <= 30; d++) days.push(d);
  const marks = { 2:'kehricht', 4:'gruengut', 11:'papier', 16:'kehricht', 18:'karton', 23:'gruengut', 25:'kehricht', 30:'papier' };
  const next = [11, 18];
  return (
    <div style={{ background: D.bg2, borderRadius: 24, padding: compact ? '16px 16px 14px' : '20px 20px 18px', border: `1px solid ${D.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 500, color: D.ink, lineHeight: 1 }}>Juni</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: D.ter, letterSpacing: 1.5, marginTop: 3 }}>2026 · SCHLIEREN</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CircBtn size={32}>{EIco.chevR(D.sec, 13)}<span style={{ transform: 'scaleX(-1)', position: 'absolute' }} /></CircBtn>
          <CircBtn size={32}>{EIco.chevR(D.sec, 13)}</CircBtn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3, color: D.ter }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {days.map((d, i) => {
          const m = marks[d];
          const isNext = next.includes(d);
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 9, position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: isNext ? 'rgba(194,240,61,0.16)' : 'rgba(255,255,255,0.03)',
              border: isNext ? `1.4px solid ${D.lime}` : '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 11.5, fontWeight: isNext ? 800 : 600, color: isNext ? D.lime : D.sec }}>{d}</span>
              {m && <span style={{ position: 'absolute', bottom: 5, width: '54%', height: 4.5, borderRadius: 99, background: ST[m].c }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 13, borderTop: `1px solid ${D.line}` }}>
        {ORDER.slice(0,4).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: ST[s].c }} />
            <span style={{ fontSize: 11, color: D.sec, fontWeight: 500 }}>{ST[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// floating bottom nav with raised lime scan button
function EditorialNav({ active = 'home' }) {
  const items = [
    { id: 'home', icon: EIco.home }, { id: 'cal', icon: EIco.cal },
    { id: 'scan', center: true }, { id: 'bell', icon: EIco.bell }, { id: 'user', icon: EIco.user },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, paddingBottom: 20, paddingTop: 12 }}>
      <div style={{
        margin: '0 16px', height: 64, borderRadius: 99, background: 'rgba(28,28,30,0.86)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${D.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', position: 'relative',
      }}>
        {items.map(it => {
          if (it.center) return (
            <div key={it.id} style={{
              width: 60, height: 60, borderRadius: 99, background: D.lime, transform: 'translateY(-14px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 24px rgba(194,240,61,0.4)', border: `4px solid ${D.bg}`,
            }}>{EIco.camera(D.onDark, 26)}</div>
          );
          const on = it.id === active;
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {it.icon(on ? D.lime : D.ter, 25)}
              {on && <span style={{ position: 'absolute', bottom: -9, width: 5, height: 5, borderRadius: 99, background: D.lime }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { D, ST, ORDER, EIco, StreamGlyph, CircBtn, PillToggle, ESwitch, DarkCalendar, EditorialNav });
