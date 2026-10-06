// Abfall Scanner — shared tokens, icons, primitives
// Exported to window for use across screen files.

const C = {
  bg: '#EFEEEA',
  card: '#FFFFFF',
  ink: '#1B1B1D',
  sec: 'rgba(60,60,67,0.60)',
  ter: 'rgba(60,60,67,0.30)',
  sep: 'rgba(60,60,67,0.10)',
  green: '#1F9D57',
  greenDeep: '#178247',
  greenSoft: '#E7F4EC',
  greenTint: 'rgba(31,157,87,0.12)',
  paper: '#FBFAF5',
  swiss: '#C0392B',
};

const STREAMS = {
  papier:  { label: 'Papier',   en: 'Paper',    dot: '#2F9E5C' },
  karton:  { label: 'Karton',   en: 'Carton',   dot: '#C98A3A' },
  kehricht:{ label: 'Kehricht', en: 'Refuse',   dot: '#3A3A3C' },
  gruengut:{ label: 'Grüngut',  en: 'Green',    dot: '#6FA82C' },
  metall:  { label: 'Metall',   en: 'Metal',    dot: '#5A7D9A' },
};

const sw = (w = 1.7) => ({ fill: 'none', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });

const Ico = {
  check: (c, w = 2.4, s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" stroke={c} {...sw(w)} /></svg>
  ),
  paper: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 3.5h7.5L19 8v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z" stroke={c} {...sw(1.6)} /><path d="M14 3.6V8h4.4M8.6 12.5h6.8M8.6 15.6h6.8M8.6 9.4h3" stroke={c} {...sw(1.6)} /></svg>
  ),
  carton: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M3.5 7.6 12 4l8.5 3.6v8.8L12 20l-8.5-3.6V7.6Z" stroke={c} {...sw(1.6)} /><path d="M3.5 7.6 12 11m0 0 8.5-3.4M12 11v9" stroke={c} {...sw(1.6)} /></svg>
  ),
  refuse: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M5.5 7.5h13l-1 12.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4L5.5 7.5Z" stroke={c} {...sw(1.6)} /><path d="M3.5 7.5h17M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5" stroke={c} {...sw(1.6)} /></svg>
  ),
  green: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 21c5-1 8-4.5 8-10 0-1.6-.3-3-.8-4.2-2.8.4-5 1.6-6.4 3.4C11 12 11 14.5 12 21Z" stroke={c} {...sw(1.6)} /><path d="M12 21c-1-4-3-6.5-6-7.5" stroke={c} {...sw(1.6)} /></svg>
  ),
  bell: (c, s = 19) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.4 6 1.4 6H4.6S6 14.5 6 10Z" stroke={c} {...sw(1.6)} /><path d="M10 19.5a2 2 0 0 0 4 0" stroke={c} {...sw(1.6)} /></svg>
  ),
  cal: (c, s = 17) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke={c} {...sw(1.6)} /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={c} {...sw(1.6)} /></svg>
  ),
  camera: (c, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.1-1.8a1 1 0 0 1 .85-.47h5.6a1 1 0 0 1 .85.47L16.7 6.5h1.8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z" stroke={c} {...sw(1.6)} /><circle cx="12" cy="12.7" r="3.4" stroke={c} {...sw(1.6)} /></svg>
  ),
  image: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke={c} {...sw(1.6)} /><circle cx="8.5" cy="9.5" r="1.6" stroke={c} {...sw(1.4)} /><path d="M4.5 17 9 12.5l3 2.5 3.5-3.5 4 4" stroke={c} {...sw(1.6)} /></svg>
  ),
  pin: (c, s = 17) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 21c4-4.5 6.5-8 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3 2.5 6.5 6.5 11Z" stroke={c} {...sw(1.6)} /><circle cx="12" cy="10" r="2.3" stroke={c} {...sw(1.6)} /></svg>
  ),
  chev: (c, s = 14) => (
    <svg width={s * 0.6} height={s} viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  arrowR: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 12h15m0 0-6-6m6 6-6 6" stroke={c} {...sw(2)} /></svg>
  ),
  home: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 11 12 4l8 7M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" stroke={c} {...sw(1.8)} /></svg>
  ),
  listIco: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" stroke={c} {...sw(1.9)} /></svg>
  ),
  gear: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke={c} {...sw(1.8)} /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" stroke={c} {...sw(1.8)} /></svg>
  ),
  clock: (c, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke={c} {...sw(1.6)} /><path d="M12 7.5V12l3 2" stroke={c} {...sw(1.6)} /></svg>
  ),
  flash: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" stroke={c} {...sw(1.6)} /></svg>
  ),
  search: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" stroke={c} {...sw(1.7)} /><path d="m15.5 15.5 4 4" stroke={c} {...sw(1.7)} /></svg>
  ),
  locate: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke={c} {...sw(1.7)} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={c} {...sw(1.7)} /></svg>
  ),
  plus: (c, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke={c} {...sw(2.1)} /></svg>
  ),
  x: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke={c} {...sw(2)} /></svg>
  ),
  sun: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke={c} {...sw(1.7)} /><path d="M12 2v2.5M12 19.5V22M4 12H1.5M22.5 12H20M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke={c} {...sw(1.6)} /></svg>
  ),
  moon: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke={c} {...sw(1.7)} /></svg>
  ),
  users: (c, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" stroke={c} {...sw(1.6)} /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8" stroke={c} {...sw(1.6)} /></svg>
  ),
};

// ── iOS switch ──
function Switch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 51, height: 31, borderRadius: 99, border: 'none', padding: 2, flexShrink: 0,
      background: on ? C.green : '#E4E3DE', cursor: 'pointer',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .25s', boxSizing: 'border-box',
    }}>
      <span style={{
        width: 27, height: 27, borderRadius: 99, background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ── waste type avatar ──
function StreamAvatar({ stream, size = 38 }) {
  const ic = { papier: Ico.paper, karton: Ico.carton, kehricht: Ico.refuse, gruengut: Ico.green, metall: Ico.refuse };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.27, flexShrink: 0,
      background: `${STREAMS[stream].dot}1A`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {ic[stream](STREAMS[stream].dot, size * 0.55)}
    </div>
  );
}

// ── calendar sheet (clean printed look) ──
// props: rotate, badge (show "Scanned" pill), flat (no paper shadow, for in-app)
function ScanPreview({ rotate = 0, badge = false, flat = false }) {
  const days = []; // June 2026 starts on a Monday (Mon-first grid)
  for (let d = 1; d <= 30; d++) days.push(d);
  // collection days → stream
  const marks = { 2:'kehricht', 4:'gruengut', 11:'papier', 16:'kehricht', 18:'karton', 23:'gruengut', 25:'kehricht', 30:'papier' };
  const next = [11, 18];

  const Legend = ({ s }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: STREAMS[s].dot }} />
      <span style={{ fontSize: 10, color: '#76746c', letterSpacing: 0.1, fontWeight: 500 }}>{STREAMS[s].label}</span>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        transform: `rotate(${rotate}deg)`,
        background: 'linear-gradient(170deg, #FFFFFF 0%, #FAF9F4 100%)',
        borderRadius: 16, padding: '16px 16px 15px', position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: flat
          ? '0 1px 2px rgba(0,0,0,0.05)'
          : '0 2px 3px rgba(30,30,20,0.05), 0 14px 30px rgba(30,30,20,0.14), 0 30px 54px rgba(30,30,20,0.10)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: C.swiss, position: 'relative' }}>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 12, height: 3.6, background: '#fff', position: 'absolute', borderRadius: 1 }} />
                <span style={{ width: 3.6, height: 12, background: '#fff', position: 'absolute', borderRadius: 1 }} />
              </span>
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#23231f', letterSpacing: -0.2 }}>Abfallkalender</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#a09e94', letterSpacing: 1.5, textTransform: 'uppercase' }}>Schlieren</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ color: '#c8c6ba', fontSize: 14 }}>‹</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#46453f' }}>Juni 2026</span>
            <span style={{ color: '#c8c6ba', fontSize: 14 }}>›</span>
          </div>
        </div>

        {/* weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 5 }}>
          {['Mo','Di','Mi','Do','Fr','Sa','So'].map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: 0.2, color: i >= 5 ? '#cdab9f' : '#bdbbb0' }}>{w}</div>
          ))}
        </div>

        {/* grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {days.map((d, i) => {
            const m = marks[d];
            const isNext = next.includes(d);
            const sun = (i % 7) === 6;
            return (
              <div key={i} style={{
                minHeight: 30, borderRadius: 7, padding: '3px 0 0', position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: isNext ? 'rgba(31,157,87,0.10)' : '#fff',
                border: isNext ? '1.4px solid rgba(31,157,87,0.45)' : '1px solid rgba(0,0,0,0.045)',
              }}>
                <span style={{ fontSize: 10.5, fontWeight: isNext ? 800 : 600, color: isNext ? C.greenDeep : (sun ? '#c08070' : '#54534d') }}>{d}</span>
                {m && <span style={{ position: 'absolute', bottom: 4, width: '62%', height: 4.5, borderRadius: 99, background: STREAMS[m].dot }} />}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 13, paddingTop: 11, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <Legend s="kehricht" /><Legend s="papier" /><Legend s="karton" /><Legend s="gruengut" />
        </div>
      </div>

      {badge && (
        <div style={{
          position: 'absolute', top: -10, right: 14, display: 'flex', alignItems: 'center', gap: 6,
          background: C.green, color: '#fff', padding: '7px 13px 7px 10px', borderRadius: 99,
          fontSize: 12.5, fontWeight: 700, letterSpacing: -0.1, boxShadow: '0 6px 16px rgba(31,157,87,0.4)',
        }}>
          {Ico.check('#fff', 3)} Scanned
        </div>
      )}
    </div>
  );
}

// ── bottom tab bar ──
function TabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Ico.home },
    { id: 'schedule', label: 'Schedule', icon: Ico.listIco },
    { id: 'settings', label: 'Settings', icon: Ico.gear },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 22, paddingTop: 9,
      background: 'rgba(247,246,243,0.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderTop: '0.5px solid rgba(0,0,0,0.08)',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        const c = on ? C.green : 'rgba(60,60,67,0.45)';
        return (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {t.icon(c, 26)}
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, color: c, letterSpacing: 0.1 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { C, STREAMS, Ico, Switch, StreamAvatar, ScanPreview, TabBar });
