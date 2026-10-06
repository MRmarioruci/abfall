// Abfall Scanner — SOFT filmstrip storyboard (warm, light)

const SFLOW = [
  { n: '01', name: 'Home',       desc: 'Pickups due, at a glance', Comp: SHome },
  { n: '02', name: 'Collection', desc: 'One stream and its reminder dial', Comp: SDetail },
  { n: '03', name: 'Setup',      desc: 'Confirm the scanned dates', Comp: SSetup },
  { n: '04', name: 'Reminders',  desc: 'Stack nudges per collection', Comp: SReminders },
  { n: '05', name: 'Schedule',   desc: 'The whole year, by month', Comp: SSchedule },
];

function SPhone({ step, scale }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: 402 * scale, marginBottom: 16, paddingLeft: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: S.ink, opacity: 0.4, letterSpacing: 0.5 }}>{step.n}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: S.ink, letterSpacing: -0.4 }}>{step.name}</span>
        </div>
        <div style={{ fontSize: 13.5, color: S.sec, marginTop: 2, fontWeight: 500 }}>{step.desc}</div>
      </div>
      <div style={{ width: 402 * scale, height: 874 * scale, filter: 'drop-shadow(0 40px 60px rgba(120,90,68,0.32))' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 402, height: 874 }}>
          <IOSDevice><step.Comp /></IOSDevice>
        </div>
      </div>
    </div>
  );
}

function SConnector() {
  return (
    <div style={{ flexShrink: 0, alignSelf: 'center', display: 'flex', alignItems: 'center', padding: '0 6px', opacity: 0.32 }}>
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M2 8h32m0 0-6-5m6 5-6 5" stroke="#211F1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function SApp() {
  const [scale, setScale] = React.useState(0.66);
  React.useEffect(() => {
    const fit = () => setScale(Math.max(0.46, Math.min(0.72, (window.innerHeight - 180) / 874)));
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: 'radial-gradient(130% 110% at 50% 0%, #F0E3D8 0%, #E7D6CB 55%, #DFC9BC 100%)', fontFamily: "'Hanken Grotesk', sans-serif", WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '34px 40px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark size={40} />
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: S.ink, letterSpacing: -0.6, whiteSpace: 'nowrap' }}>Abfall Scanner</h1>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: S.sec, maxWidth: 580, lineHeight: 1.45, fontWeight: 500 }}>
            Soft direction — warm blush canvas, Hanken Grotesk in mixed weights, and a calm pastel per waste stream. Tap, toggle and scrub; everything is live.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: S.ter, whiteSpace: 'nowrap' }}>
          Scroll the flow
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M1 7h18m0 0-5-4m5 4-5 4" stroke={S.ter} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', padding: '8px 40px 48px', width: 'max-content' }}>
          {SFLOW.map((step, i) => (
            <React.Fragment key={step.n}>
              {i > 0 && <SConnector />}
              <SPhone step={step} scale={scale} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SApp />);
