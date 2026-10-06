// Abfall Scanner — EDITORIAL filmstrip storyboard

const EFLOW = [
  { n: '01', name: 'Home',      desc: 'Next collections at a glance', Comp: EHome },
  { n: '02', name: 'Collection', desc: 'A stream, with its reminder dial', Comp: EDetail },
  { n: '03', name: 'Setup',     desc: 'Confirm the scanned dates', Comp: ESetup },
  { n: '04', name: 'Reminders', desc: 'Stack nudges per collection', Comp: EReminders },
  { n: '05', name: 'Schedule',  desc: 'The whole year, by month', Comp: ESchedule },
];

function EPhone({ step, scale }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: 402 * scale, marginBottom: 16, paddingLeft: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#9FD423', letterSpacing: 0.5 }}>{step.n}</span>
          <span style={{ fontFamily: "Newsreader, serif", fontSize: 21, fontWeight: 600, color: '#fff', letterSpacing: -0.2 }}>{step.name}</span>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{step.desc}</div>
      </div>
      <div style={{ width: 402 * scale, height: 874 * scale, filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.55))' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 402, height: 874 }}>
          <IOSDevice dark><step.Comp /></IOSDevice>
        </div>
      </div>
    </div>
  );
}

function EConnector() {
  return (
    <div style={{ flexShrink: 0, alignSelf: 'center', display: 'flex', alignItems: 'center', padding: '0 6px', opacity: 0.5 }}>
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M2 8h32m0 0-6-5m6 5-6 5" stroke="#C2F03D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function EApp() {
  const [scale, setScale] = React.useState(0.66);
  React.useEffect(() => {
    const fit = () => setScale(Math.max(0.46, Math.min(0.72, (window.innerHeight - 180) / 874)));
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: 'radial-gradient(130% 100% at 50% 0%, #1a1a1c 0%, #0d0d0e 60%, #060607 100%)', fontFamily: "'Hanken Grotesk', sans-serif", WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '34px 40px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#C2F03D', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 16px rgba(194,240,61,0.4)' }}>
              <StreamGlyph stream="gruengut" size={26} c="#172105" />
            </div>
            <h1 style={{ margin: 0, fontFamily: "Newsreader, serif", fontSize: 28, fontWeight: 600, color: '#fff', letterSpacing: -0.4 }}>Abfall Scanner</h1>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.55)', maxWidth: 560, lineHeight: 1.4 }}>
            Editorial direction — dark canvas, Newsreader serif headlines, and a vivid colour per waste stream. Tap, toggle and scrub; everything is live.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
          Scroll the flow
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M1 7h18m0 0-5-4m5 4-5 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', padding: '8px 40px 48px', width: 'max-content' }}>
          {EFLOW.map((step, i) => (
            <React.Fragment key={step.n}>
              {i > 0 && <EConnector />}
              <EPhone step={step} scale={scale} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<EApp />);
