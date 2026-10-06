// Abfall Scanner — "Scan Success & Setup" screen
// All UI in system (SF) font. Subtle eco-green accent. iOS 26 styling.

const C = {
  bg: '#EFEEEA',          // warm light gray app background
  card: '#FFFFFF',
  ink: '#1B1B1D',
  sec: 'rgba(60,60,67,0.60)',
  ter: 'rgba(60,60,67,0.30)',
  sep: 'rgba(60,60,67,0.10)',
  green: '#1F9D57',       // eco primary
  greenDeep: '#178247',
  greenSoft: '#E7F4EC',
  greenTint: 'rgba(31,157,87,0.12)',
  paper: '#FBFAF5',
};

// Swiss waste stream palette (small color dots only)
const STREAMS = {
  papier:  { label: 'Papier',  dot: '#2F9E5C' },
  karton:  { label: 'Karton',  dot: '#C98A3A' },
  kehricht:{ label: 'Kehricht',dot: '#3A3A3C' },
  gruengut:{ label: 'Grüngut', dot: '#6FA82C' },
};

// ── tiny line icons ──────────────────────────────────────────
const Ico = {
  paper: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5h7.5L19 8v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M14 3.6V8h4.4M8.6 12.5h6.8M8.6 15.6h6.8M8.6 9.4h3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  carton: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3.5 7.6 12 4l8.5 3.6v8.8L12 20l-8.5-3.6V7.6Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M3.5 7.6 12 11m0 0 8.5-3.4M12 11v9" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  bell: (c) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.4 6 1.4 6H4.6S6 14.5 6 10Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 19.5a2 2 0 0 0 4 0" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  check: (c, w = 2.4) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5 10 17.5 19 7" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cal: (c) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke={c} strokeWidth="1.6"/>
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

// ── scanned paper calendar preview ───────────────────────────
function ScanPreview() {
  const Legend = ({ s }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: STREAMS[s].dot }} />
      <span style={{ fontSize: 9.5, color: '#6b6b66', letterSpacing: 0.1 }}>{STREAMS[s].label}</span>
    </div>
  );
  // June 2026 mini grid — Mon-first. nulls = leading blanks.
  const days = [null, null, null, null, null, null, 1];
  for (let d = 2; d <= 30; d++) days.push(d);
  const marks = { 11: 'papier', 18: 'karton', 9: 'kehricht', 23: 'kehricht', 16: 'gruengut' };
  const detected = [11, 18];

  return (
    <div style={{ position: 'relative', padding: '6px 4px 2px' }}>
      {/* paper */}
      <div style={{
        transform: 'rotate(-2.4deg)',
        background: C.paper,
        borderRadius: 10,
        padding: '18px 18px 20px',
        boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 10px 24px rgba(30,30,20,0.16), 0 26px 50px rgba(30,30,20,0.12)',
        border: '1px solid rgba(0,0,0,0.04)',
        position: 'relative',
        backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.015), rgba(255,255,255,0) 40%)',
      }}>
        {/* municipal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 5, flexShrink: 0,
            background: '#C0392B', position: 'relative',
          }}>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 13, height: 4, background: '#fff', position: 'absolute', borderRadius: 1 }} />
              <span style={{ width: 4, height: 13, background: '#fff', position: 'absolute', borderRadius: 1 }} />
            </span>
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#2a2a26', letterSpacing: -0.2 }}>Abfallkalender</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8a82', letterSpacing: 1.4, textTransform: 'uppercase' }}>Schlieren · 2026</div>
          </div>
        </div>

        {/* legend */}
        <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap', marginBottom: 12 }}>
          <Legend s="kehricht" /><Legend s="papier" /><Legend s="karton" /><Legend s="gruengut" />
        </div>

        {/* month label */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#55554f', marginBottom: 7, letterSpacing: 0.3 }}>JUNI</div>

        {/* weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
          {['M','D','M','D','F','S','S'].map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 8.5, fontWeight: 700, color: '#b3b3aa' }}>{w}</div>
          ))}
        </div>
        {/* grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {days.map((d, i) => {
            const m = d && marks[d];
            const isDet = d && detected.includes(d);
            return (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontSize: 9.5, color: d ? '#54544e' : 'transparent', fontWeight: 600,
                background: isDet ? 'rgba(31,157,87,0.16)' : 'transparent',
                outline: isDet ? '1.4px solid rgba(31,157,87,0.55)' : 'none',
                position: 'relative',
              }}>
                {d || '·'}
                {m && <span style={{ width: 4.5, height: 4.5, borderRadius: 99, background: STREAMS[m].dot, marginTop: 1.5 }} />}
              </div>
            );
          })}
        </div>

        {/* scanner corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
          <span key={i} style={{
            position:'absolute', [v]:8, [h]:8, width:16, height:16,
            [`border${v[0].toUpperCase()+v.slice(1)}`]:`2px solid ${C.green}`,
            [`border${h[0].toUpperCase()+h.slice(1)}`]:`2px solid ${C.green}`,
            [`border${v==='top'?'TopLeftRadius':v==='bottom'?'BottomLeftRadius':''}`]:undefined,
            borderRadius: v==='top'&&h==='left'?'4px 0 0 0':v==='top'&&h==='right'?'0 4px 0 0':v==='bottom'&&h==='left'?'0 0 0 4px':'0 0 4px 0',
            opacity:0.85,
          }}/>
        ))}
      </div>

      {/* floating "scanned" badge */}
      <div style={{
        position: 'absolute', top: 0, right: 16,
        display: 'flex', alignItems: 'center', gap: 6,
        background: C.green, color: '#fff',
        padding: '7px 13px 7px 10px', borderRadius: 99,
        fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1,
        boxShadow: '0 6px 16px rgba(31,157,87,0.4)',
      }}>
        {Ico.check('#fff', 3)} Scanned
      </div>
    </div>
  );
}

// ── iOS switch ───────────────────────────────────────────────
function Switch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 51, height: 31, borderRadius: 99, border: 'none', padding: 2,
      background: on ? C.green : '#E4E3DE', cursor: 'pointer',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .25s, justify-content .2s', boxSizing: 'border-box',
    }}>
      <span style={{
        width: 27, height: 27, borderRadius: 99, background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.2)',
        transition: 'transform .25s cubic-bezier(.3,1.4,.5,1)',
        transform: on ? 'translateX(0)' : 'translateX(0)',
      }} />
    </button>
  );
}

// ── collection row ───────────────────────────────────────────
function CollectionRow({ stream, title, when, soon, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', position: 'relative' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${STREAMS[stream].dot}1A`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 13,
      }}>
        {stream === 'papier' ? Ico.paper(STREAMS[stream].dot) : Ico.carton(STREAMS[stream].dot)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.sec, marginTop: 1 }}>{when}</div>
      </div>
      {soon && (
        <span style={{
          fontSize: 11.5, fontWeight: 700, color: C.green, background: C.greenSoft,
          padding: '4px 9px', borderRadius: 99, letterSpacing: 0.1,
        }}>{soon}</span>
      )}
      {!isLast && <div style={{ position: 'absolute', left: 67, right: 0, bottom: 0, height: 1, background: C.sep }} />}
    </div>
  );
}

// ── main screen ──────────────────────────────────────────────
function AbfallScreen() {
  const [remind, setRemind] = React.useState(true);
  const [lead, setLead] = React.useState(1);       // days before
  const [time, setTime] = React.useState('18:00');
  const [saved, setSaved] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const leadLabel = lead === 0 ? 'Same day' : lead === 1 ? '1 day before' : `${lead} days before`;
  const summary = `${leadLabel} at ${time}`;

  const times = ['07:00', '12:00', '18:00', '20:00'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* scrolling content */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 60 }}>
        {/* header */}
        <div style={{ padding: '4px 22px 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 99, background: C.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{Ico.check('#fff', 3.2)}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.green, letterSpacing: 0.2 }}>SCAN COMPLETE</span>
          </div>
          <h1 style={{
            margin: '8px 0 2px', fontSize: 30, fontWeight: 800, color: C.ink,
            letterSpacing: -0.6, lineHeight: 1.08,
          }}>Your calendar is ready</h1>
          <p style={{ margin: 0, fontSize: 15, color: C.sec, lineHeight: 1.35 }}>
            We found <b style={{ color: C.ink }}>12 collection dates</b> for the rest of 2026.
          </p>
        </div>

        {/* preview */}
        <div style={{ padding: '14px 18px 6px' }}>
          <ScanPreview />
        </div>

        {/* next up label */}
        <div style={{ padding: '14px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>
          NEXT UP
        </div>
        <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <CollectionRow stream="papier" title="Paper Collection" when="Tomorrow · 07:00" soon="TOMORROW" />
          <CollectionRow stream="karton" title="Carton" when="Thursday, 18 June · 07:00" isLast />
        </div>

        {/* remind me */}
        <div style={{ padding: '22px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>
          REMIND ME
        </div>
        <div style={{ margin: '0 16px 8px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: C.greenTint, marginRight: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{Ico.bell(C.green)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>Reminders</div>
              <div style={{ fontSize: 13.5, color: remind ? C.green : C.ter, marginTop: 1, fontWeight: remind ? 600 : 500 }}>
                {remind ? summary : 'Off'}
              </div>
            </div>
            <Switch on={remind} onChange={setRemind} />
          </div>

          {/* expandable picker */}
          <div style={{
            maxHeight: remind ? 200 : 0, opacity: remind ? 1 : 0, overflow: 'hidden',
            transition: 'max-height .35s ease, opacity .3s ease',
          }}>
            <div style={{ height: 1, background: C.sep, margin: '0 16px' }} />
            <div style={{ padding: '14px 16px 4px' }}>
              <div style={{ fontSize: 12.5, color: C.sec, marginBottom: 8, fontWeight: 500 }}>When</div>
              <div style={{ display: 'flex', gap: 6, background: '#F1F0EC', padding: 3, borderRadius: 11 }}>
                {[['Same day',0],['1 day before',1],['2 days',2]].map(([l,v]) => (
                  <button key={v} onClick={() => setLead(v)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8.5, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
                    background: lead === v ? '#fff' : 'transparent',
                    color: lead === v ? C.ink : C.sec,
                    boxShadow: lead === v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all .2s',
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 16px 16px' }}>
              <div style={{ fontSize: 12.5, color: C.sec, marginBottom: 8, fontWeight: 500 }}>Time</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {times.map(t => (
                  <button key={t} onClick={() => setTime(t)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                    fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
                    border: `1.5px solid ${time === t ? C.green : 'rgba(60,60,67,0.14)'}`,
                    background: time === t ? C.greenSoft : '#fff',
                    color: time === t ? C.greenDeep : C.sec,
                    transition: 'all .18s',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p style={{ margin: '6px 22px 0', fontSize: 12.5, color: C.ter, lineHeight: 1.4 }}>
          Events sync to your default calendar. You can change reminders anytime in Settings.
        </p>

        <div style={{ height: 110 }} />
      </div>

      {/* pinned CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: '14px 18px 30px',
        background: 'linear-gradient(to top, rgba(239,238,234,1) 62%, rgba(239,238,234,0))',
      }}>
        <button
          onMouseDown={() => setPress(true)}
          onMouseUp={() => setPress(false)}
          onMouseLeave={() => setPress(false)}
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: saved ? C.greenDeep : C.green, color: '#fff',
            fontSize: 17.5, fontWeight: 700, letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: '0 8px 22px rgba(31,157,87,0.36)',
            transform: press ? 'scale(0.975)' : 'scale(1)',
            transition: 'transform .12s, background .2s',
          }}>
          {saved ? <>{Ico.check('#fff', 3)} Synced to Calendar</> : <>{Ico.cal('#fff')} Save &amp; Sync to Calendar</>}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const fit = () => {
      const s = Math.min(1, (window.innerHeight - 56) / 874, (window.innerWidth - 56) / 402);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(120% 90% at 50% 0%, #f3f2ee 0%, #e3e1da 55%, #d4d2c9 100%)',
      padding: 20, overflow: 'hidden',
    }}>
      <div style={{ width: 402 * scale, height: 874 * scale, filter: 'drop-shadow(0 50px 70px rgba(40,38,30,0.28))' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 402, height: 874 }}>
          <IOSDevice>
            <AbfallScreen />
          </IOSDevice>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
