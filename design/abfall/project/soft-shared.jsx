// Abfall Scanner — SOFT (warm, light) design system
// Inspired by a warm-blush, pastel color-block, bold-grotesk wellbeing aesthetic.

const S = {
  stage:  '#E7D6CB',           // warm blush behind the phones
  bg:     '#F3EFF4',           // screen base (cool cream)
  screen: 'linear-gradient(176deg,#F5F2F7 0%, #F1E8DF 54%, #ECDFD4 100%)',
  warm:   'linear-gradient(176deg,#F4ECE4 0%, #EFE2D6 60%, #ECDDD1 100%)',
  card:   '#FFFFFF',           // neutral white surface
  cardWarm:'#FBF6F1',
  ink:    '#211F1C',
  sec:    'rgba(33,31,28,0.50)',
  ter:    'rgba(33,31,28,0.32)',
  line:   'rgba(40,28,18,0.07)',
  shadow: '0 16px 36px rgba(150,118,96,0.14)',
  shadowSm:'0 6px 18px rgba(150,118,96,0.12)',
};

// warm pastel block color per waste stream (+ readable ink on it)
const ST = {
  papier:  { label: 'Papier',   en: 'Paper & cardboard', tag: 'Paper',  c: '#C3C6EC', ink: '#2C2E61', soft: '#E5E6F6' },
  karton:  { label: 'Karton',   en: 'Flattened carton',  tag: 'Carton', c: '#EFCB49', ink: '#42340A', soft: '#FAEEC4' },
  kehricht:{ label: 'Kehricht', en: 'Household refuse',   tag: 'Refuse', c: '#E69A80', ink: '#4A1B10', soft: '#F6DDD2' },
  gruengut:{ label: 'Grüngut',  en: 'Garden & organic',  tag: 'Green',  c: '#AECB93', ink: '#273913', soft: '#DCE9CE' },
  metall:  { label: 'Metall',   en: 'Metal & tins',      tag: 'Metal',  c: '#9CC9C2', ink: '#103330', soft: '#D4E8E4' },
};
const ORDER = ['papier', 'karton', 'kehricht', 'gruengut', 'metall'];

const ssw = (w = 1.8) => ({ fill: 'none', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });

const SIco = {
  search: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" stroke={c} {...ssw(2)} /><path d="m15.5 15.5 4 4" stroke={c} {...ssw(2)} /></svg>),
  heart: (c, s = 19, fill = 'none') => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 20.5C5.5 16 3 12.4 3 8.9 3 6.2 5.1 4 7.9 4c1.7 0 3.2.9 4.1 2.3C12.9 4.9 14.4 4 16.1 4 18.9 4 21 6.2 21 8.9c0 3.5-2.5 7.1-9 11.6Z" fill={fill} stroke={c} {...ssw(1.8)} /></svg>),
  arrowUR: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 17 17 7M8.5 7H17v8.5" stroke={c} {...ssw(2.1)} /></svg>),
  arrowR: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 12h15m0 0-6-6m6 6-6 6" stroke={c} {...ssw(2)} /></svg>),
  back: (c, s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M13 5l-7 7 7 7M7 12h12" stroke={c} {...ssw(2)} /></svg>),
  chevR: (c, s = 16) => (<svg width={s * 0.62} height={s} viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  bell: (c, s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.4 6 1.4 6H4.6S6 14.5 6 10Z" stroke={c} {...ssw(1.8)} /><path d="M10 19.5a2 2 0 0 0 4 0" stroke={c} {...ssw(1.8)} /></svg>),
  home: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 11 12 4l8 7M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" stroke={c} {...ssw(1.9)} /></svg>),
  cal: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke={c} {...ssw(1.9)} /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={c} {...ssw(1.9)} /></svg>),
  grid: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2.2" stroke={c} {...ssw(1.9)} /><rect x="13" y="4" width="7" height="7" rx="2.2" stroke={c} {...ssw(1.9)} /><rect x="4" y="13" width="7" height="7" rx="2.2" stroke={c} {...ssw(1.9)} /><rect x="13" y="13" width="7" height="7" rx="2.2" stroke={c} {...ssw(1.9)} /></svg>),
  camera: (c, s = 26) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.1-1.8a1 1 0 0 1 .85-.47h5.6a1 1 0 0 1 .85.47L16.7 6.5h1.8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z" stroke={c} {...ssw(1.9)} /><circle cx="12" cy="12.7" r="3.4" stroke={c} {...ssw(1.9)} /></svg>),
  user: (c, s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.7" stroke={c} {...ssw(1.9)} /><path d="M5 20a7 7 0 0 1 14 0" stroke={c} {...ssw(1.9)} /></svg>),
  clock: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke={c} {...ssw(1.8)} /><path d="M12 7.5V12l3 2" stroke={c} {...ssw(1.8)} /></svg>),
  check: (c, w = 2.6, s = 16) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" stroke={c} {...ssw(w)} /></svg>),
  plus: (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke={c} {...ssw(2.1)} /></svg>),
  x: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke={c} {...ssw(2)} /></svg>),
  sun: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke={c} {...ssw(1.8)} /><path d="M12 2v2.5M12 19.5V22M4 12H1.5M22.5 12H20M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke={c} {...ssw(1.7)} /></svg>),
  moon: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke={c} {...ssw(1.8)} /></svg>),
  pin: (c, s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 21c4-4.5 6.5-8 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3 2.5 6.5 6.5 11Z" stroke={c} {...ssw(1.9)} /><circle cx="12" cy="10" r="2.3" stroke={c} {...ssw(1.9)} /></svg>),
};

// big stream glyph for hero/cards
function StreamGlyph({ stream, size = 96, c }) {
  const col = c || ST[stream].ink;
  const P = {
    papier: <g><path d="M22 14h26L60 26v48H22a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2Z" stroke={col} {...ssw(3)} /><path d="M48 14v12h12M30 40h22M30 50h22M30 30h10" stroke={col} {...ssw(3)} /></g>,
    karton: <g><path d="M12 26 44 12l32 14v30L44 70 12 56V26Z" stroke={col} {...ssw(3)} /><path d="M12 26 44 38m0 0 32-12M44 38v32" stroke={col} {...ssw(3)} /></g>,
    kehricht: <g><path d="M18 26h52l-4 46a4 4 0 0 1-4 3.6H26a4 4 0 0 1-4-3.6L18 26Z" stroke={col} {...ssw(3)} /><path d="M12 26h64M32 26v-7a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v7M34 38v26M54 38v26M44 38v26" stroke={col} {...ssw(3)} /></g>,
    gruengut: <g><path d="M44 76c18-3 28-15 28-34 0-5-1-10-3-14-10 1.5-18 6-23 12-7 9-7 18-2 36Z" stroke={col} {...ssw(3)} /><path d="M44 76c-3-14-10-22-21-26" stroke={col} {...ssw(3)} /></g>,
    metall: <g><path d="M26 22h36v44a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V22Z" stroke={col} {...ssw(3)} /><path d="M26 34h36M26 22c0-4 36-4 36 0" stroke={col} {...ssw(3)} /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 88 88">{P[stream]}</svg>;
}

// brand mark — "Stream stack": five waste-stream bars + a leaf sprouting on top
function BrandMark({ size = 36, bg = '#211F1C' }) {
  const cols = [ST.papier.c, ST.karton.c, ST.kehricht.c, ST.gruengut.c, ST.metall.c];
  const w = [20, 30, 24, 32, 18];
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 48 48">
        {cols.map((c, i) => {
          const ww = w[i];
          return <rect key={i} x={24 - ww / 2} y={12.5 + i * 6} width={ww} height={4.6} rx={2.3} fill={c} />;
        })}
        <g transform="translate(33.5 2.5)">
          <path d="M11 0C4.5 0 0 4.2 0 11 6.5 11 11 6.8 11 0Z" fill={ST.gruengut.c} />
          <path d="M1.6 9.4C3.8 6.4 6.4 4.2 9.4 2.6" fill="none" stroke={bg} strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
        </g>
      </svg>
    </div>
  );
}

// headline with a bold-emphasis word (the reference's mixed-weight trick)
function Display({ children, size = 32, lh = 1.06, color = S.ink, style }) {
  return (
    <h2 style={{ margin: 0, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: size, fontWeight: 500, color, lineHeight: lh, letterSpacing: -0.8, textWrap: 'balance', ...style }}>{children}</h2>
  );
}
const Bold = ({ children }) => <span style={{ fontWeight: 800 }}>{children}</span>;

// white circular icon button (soft shadow), as in the reference
function CircBtn({ children, size = 48, bg = '#fff', shadow = true, style }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 99, background: bg, boxShadow: shadow ? S.shadowSm : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      {children}
    </div>
  );
}

// soft pill toggle (bell ↔ check), ink-accented capsule
function PillToggle({ on, onChange, leftIcon, rightIcon }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: 5,
      borderRadius: 99, border: 'none', cursor: 'pointer', boxShadow: S.shadowSm,
      background: on ? S.ink : '#fff', transition: 'background .25s',
    }}>
      <span style={{ width: 42, height: 42, borderRadius: 99, background: on ? 'rgba(255,255,255,0.16)' : 'rgba(33,31,28,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {leftIcon(on ? '#fff' : S.ter, 19)}
      </span>
      <span style={{ display: 'flex', gap: 3, padding: '0 2px' }}>
        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: 99, background: on ? 'rgba(255,255,255,0.5)' : S.ter }} />)}
      </span>
      <span style={{ width: 42, height: 42, borderRadius: 99, background: on ? '#fff' : 'rgba(33,31,28,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {rightIcon(on ? S.ink : S.ter, 19)}
      </span>
    </button>
  );
}

// soft switch
function SSwitch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 50, height: 30, borderRadius: 99, border: 'none', padding: 2, flexShrink: 0,
      background: on ? S.ink : 'rgba(33,31,28,0.14)', cursor: 'pointer',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .25s', boxSizing: 'border-box',
    }}>
      <span style={{ width: 26, height: 26, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// light calendar sheet
function SoftCalendar({ compact = false }) {
  const days = []; for (let d = 1; d <= 30; d++) days.push(d);
  const marks = { 2:'kehricht', 4:'gruengut', 11:'papier', 16:'gruengut', 18:'karton', 23:'kehricht', 25:'metall', 30:'papier' };
  const next = [11];
  return (
    <div style={{ background: S.card, borderRadius: 28, padding: compact ? '16px 16px 14px' : '20px 20px 18px', boxShadow: S.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, color: S.ink, lineHeight: 1, letterSpacing: -0.5 }}>Juni</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.ter, letterSpacing: 1.5, marginTop: 4 }}>2026 · SCHLIEREN</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CircBtn size={34} bg="#F4EFEA" shadow={false}><span style={{ transform: 'scaleX(-1)', display: 'flex' }}>{SIco.chevR(S.sec, 13)}</span></CircBtn>
          <CircBtn size={34} bg="#F4EFEA" shadow={false}>{SIco.chevR(S.sec, 13)}</CircBtn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: S.ter }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {days.map((d, i) => {
          const m = marks[d]; const isNext = next.includes(d);
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 11, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isNext ? S.ink : (m ? ST[m].soft : '#F6F1EC'),
            }}>
              <span style={{ fontSize: 12, fontWeight: isNext ? 800 : 600, color: isNext ? '#fff' : (m ? ST[m].ink : S.sec) }}>{d}</span>
              {m && !isNext && <span style={{ position: 'absolute', bottom: 5, width: '50%', height: 4, borderRadius: 99, background: ST[m].c }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${S.line}` }}>
        {ORDER.slice(0,4).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: ST[s].c }} />
            <span style={{ fontSize: 11, color: S.sec, fontWeight: 600 }}>{ST[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// floating bottom nav — white pill + raised black squircle scan FAB
function SoftNav({ active = 'home' }) {
  const items = [
    { id: 'home', icon: SIco.home }, { id: 'cal', icon: SIco.cal },
    { id: 'scan', center: true }, { id: 'bell', icon: SIco.bell }, { id: 'user', icon: SIco.user },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, paddingBottom: 18, paddingTop: 12 }}>
      <div style={{
        margin: '0 18px', height: 66, borderRadius: 99, background: '#fff',
        boxShadow: '0 10px 30px rgba(150,118,96,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', position: 'relative',
      }}>
        {items.map(it => {
          if (it.center) return (
            <div key={it.id} style={{
              width: 60, height: 60, borderRadius: 21, background: S.ink, transform: 'translateY(-12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 24px rgba(33,31,28,0.32)', border: '4px solid #fff',
            }}>{SIco.camera('#fff', 26)}</div>
          );
          const on = it.id === active;
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {it.icon(on ? S.ink : S.ter, 25)}
              {on && <span style={{ position: 'absolute', bottom: -9, width: 5, height: 5, borderRadius: 99, background: S.ink }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { S, ST, ORDER, SIco, StreamGlyph, BrandMark, Display, Bold, CircBtn, PillToggle, SSwitch, SoftCalendar, SoftNav });
