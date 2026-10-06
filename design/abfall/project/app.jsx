// Abfall Scanner — full UX storyboard (filmstrip of connected screens)

const FLOW = [
  { n: '01', name: 'Launch', desc: 'Scan, locate, or use a shared schedule', Comp: LaunchScreen },
  { n: '02', name: 'Scan',   desc: 'Auto-detect the paper calendar', Comp: CameraScreen, dark: true },
  { n: '03', name: 'Setup',  desc: 'Confirm detected dates',          Comp: SuccessScreen },
  { n: '04', name: 'Reminders', desc: 'Stack reminders per collection', Comp: ReminderScreen },
  { n: '05', name: 'Home',   desc: 'Your next collection at a glance', Comp: HomeScreen },
  { n: '06', name: 'Schedule', desc: 'Every date for the year',       Comp: ScheduleScreen },
  { n: '07', name: 'Notification', desc: 'A nudge the night before',  Comp: LockScreen, dark: true },
];

function Phone({ step, scale }) {
  const { Comp, dark } = step;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      {/* label */}
      <div style={{ width: 402 * scale, marginBottom: 16, paddingLeft: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1F9D57', letterSpacing: 0.5 }}>{step.n}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1B1B1D', letterSpacing: -0.3 }}>{step.name}</span>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(60,60,67,0.6)', marginTop: 2 }}>{step.desc}</div>
      </div>
      {/* phone */}
      <div style={{ width: 402 * scale, height: 874 * scale, filter: 'drop-shadow(0 36px 50px rgba(40,38,30,0.22))' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 402, height: 874 }}>
          <IOSDevice dark={dark}><Comp /></IOSDevice>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div style={{ flexShrink: 0, alignSelf: 'center', display: 'flex', alignItems: 'center', padding: '0 6px', opacity: 0.5 }}>
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
        <path d="M2 8h32m0 0-6-5m6 5-6 5" stroke="#1F9D57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function App() {
  const [scale, setScale] = React.useState(0.7);
  React.useEffect(() => {
    const fit = () => setScale(Math.max(0.46, Math.min(0.74, (window.innerHeight - 180) / 874)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', boxSizing: 'border-box',
      background: 'radial-gradient(130% 100% at 50% 0%, #f3f2ee 0%, #e6e4dd 60%, #dad8cf 100%)',
      fontFamily: '-apple-system, system-ui, sans-serif', WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{ padding: '34px 40px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#1F9D57', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 14px rgba(31,157,87,0.35)' }}>
              {Ico.green('#fff', 24)}
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1B1B1D', letterSpacing: -0.6 }}>Abfall Scanner</h1>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'rgba(60,60,67,0.62)', maxWidth: 540, lineHeight: 1.4 }}>
            The complete experience — from scanning a Swiss paper Abfallkalender to a synced, reminding calendar. Tap and toggle anything; the controls are live.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'rgba(60,60,67,0.5)', whiteSpace: 'nowrap' }}>
          Scroll the flow
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M1 7h18m0 0-5-4m5 4-5 4" stroke="rgba(60,60,67,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>

      {/* filmstrip */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', padding: '8px 40px 48px', gap: 0, width: 'max-content' }}>
          {FLOW.map((step, i) => (
            <React.Fragment key={step.n}>
              {i > 0 && <Connector />}
              <Phone step={step} scale={scale} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
