// Abfall Scanner — early flow: Launch / Camera / Success

// ── 1. Launch & setup methods ─────────────────────────────────
function LaunchScreen() {
  const Method = ({ icon, title, sub, isLast }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', position: 'relative', cursor: 'pointer' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 13, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.sec, marginTop: 1 }}>{sub}</div>
      </div>
      {Ico.chev(C.ter, 15)}
      {!isLast && <div style={{ position: 'absolute', left: 67, right: 0, bottom: 0, height: 1, background: C.sep }} />}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '64px 0 0' }}>
        {/* brand */}
        <div style={{ padding: '6px 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(31,157,87,0.35)' }}>{Ico.green('#fff', 21)}</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>Abfall Scanner</span>
        </div>

        {/* hero */}
        <div style={{ padding: '30px 24px 0' }}>
          <h1 style={{ margin: 0, fontSize: 31, fontWeight: 800, color: C.ink, letterSpacing: -0.7, lineHeight: 1.07 }}>
            Never miss a<br />collection again.
          </h1>
          <p style={{ margin: '11px 0 0', fontSize: 15.5, color: C.sec, lineHeight: 1.4, maxWidth: 310 }}>
            Add your local waste schedule in seconds — then we sync it and remind you.
          </p>
        </div>

        {/* calendar visual */}
        <div style={{ padding: '22px 34px 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', transform: 'rotate(-1.5deg)' }}><ScanPreview /></div>
        </div>

        {/* community fast-path */}
        <div style={{ padding: '24px 16px 0' }}>
          <div style={{
            borderRadius: 18, padding: '15px 16px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
            background: 'linear-gradient(135deg, #1F9D57, #15824A)', boxShadow: '0 10px 24px rgba(31,157,87,0.3)',
          }}>
            <div style={{ position: 'absolute', right: -16, bottom: -22, opacity: 0.15 }}>{Ico.users('#fff', 110)}</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {Ico.check('#fff', 3, 16)}
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.6 }}>ALREADY AVAILABLE</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3, marginTop: 7 }}>Schlieren · 2026 is ready</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Shared &amp; verified by 1,240 neighbours.</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 13, background: '#fff', color: C.greenDeep, padding: '8px 14px', borderRadius: 11, fontSize: 14.5, fontWeight: 700 }}>
                Use this schedule {Ico.arrowR(C.greenDeep, 16)}
              </div>
            </div>
          </div>
        </div>

        {/* manual methods */}
        <div style={{ padding: '22px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>OR ADD IT YOURSELF</div>
        <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <Method icon={Ico.camera(C.green, 21)} title="Scan Abfallkalender" sub="Point your camera at the paper calendar" />
          <Method icon={Ico.image(C.green, 19)} title="Choose from Photos" sub="Use a photo you already took" />
          <Method icon={Ico.locate(C.green, 19)} title="Use my location" sub="Auto-detect your municipality" />
          <Method icon={Ico.search(C.green, 19)} title="Browse municipalities" sub="Search 2,100 Swiss communes" isLast />
        </div>
        <div style={{ height: 120 }} />
      </div>

      {/* pinned primary */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '14px 18px 30px',
        background: 'linear-gradient(to top, rgba(239,238,234,1) 64%, rgba(239,238,234,0))' }}>
        <button style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: C.green, color: '#fff', fontSize: 17.5, fontWeight: 700, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 22px rgba(31,157,87,0.36)',
        }}>{Ico.camera('#fff', 22)} Scan Abfallkalender</button>
      </div>
    </div>
  );
}

// ── 2. Camera / document scanning ─────────────────────────────
function CameraScreen() {
  return (
    <div style={{ height: '100%', position: 'relative', background: '#0d0d0f', overflow: 'hidden' }}>
      {/* faux viewfinder gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 35%, #2a2a2e 0%, #141416 60%, #0a0a0b 100%)' }} />

      {/* top controls */}
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, zIndex: 20, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>Scan calendar</span>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Ico.flash('#fff', 19)}
        </div>
      </div>

      {/* detected document */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(2deg)', width: 300 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'brightness(0.97)' }}>
            <ScanPreview rotate={0} />
          </div>
          {/* bright detection frame */}
          <div style={{
            position: 'absolute', inset: '2px -2px', borderRadius: 12,
            boxShadow: '0 0 0 2.5px rgba(43,210,120,0.9), 0 0 26px rgba(43,210,120,0.5)',
            pointerEvents: 'none',
          }} />
          {/* corner nodes */}
          {[['-7px','-7px'],['-7px','auto','-7px'],['auto','-7px','auto','-7px'],['auto','auto','-7px','-7px']].map((p,i)=>(
            <span key={i} style={{ position:'absolute', top:p[0], right:p[1], bottom:p[2], left:p[3], width:13, height:13, borderRadius:99, background:'#2BD278', border:'2.5px solid #0d0d0f' }}/>
          ))}
        </div>
      </div>

      {/* status pill */}
      <div style={{ position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(43,210,120,0.16)',
        border: '1px solid rgba(43,210,120,0.5)', padding: '8px 15px', borderRadius: 99 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#2BD278' }} />
        <span style={{ color: '#9af0c0', fontSize: 13.5, fontWeight: 600 }}>Calendar detected — hold steady</span>
      </div>

      {/* bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: 38, paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 30px' }}>
          {/* gallery thumb */}
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'linear-gradient(135deg,#3a3a40,#222226)', border: '1.5px solid rgba(255,255,255,0.25)' }} />
          {/* shutter */}
          <div style={{ width: 74, height: 74, borderRadius: 99, border: '4px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: 99, background: '#fff' }} />
          </div>
          {/* auto badge */}
          <div style={{ width: 46, height: 46, borderRadius: 99, background: 'rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#2BD278', fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>AUTO</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. Scan success & reminder setup ──────────────────────────
function SuccessScreen() {
  const [remind, setRemind] = React.useState(true);
  const [lead, setLead] = React.useState(1);
  const [time, setTime] = React.useState('18:00');
  const [saved, setSaved] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const leadLabel = lead === 0 ? 'Same day' : lead === 1 ? '1 day before' : `${lead} days before`;
  const summary = `${leadLabel} at ${time}`;
  const times = ['07:00', '12:00', '18:00', '20:00'];

  const Row = ({ stream, title, when, soon, isLast }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', position: 'relative' }}>
      <div style={{ marginRight: 13 }}><StreamAvatar stream={stream} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.sec, marginTop: 1 }}>{when}</div>
      </div>
      {soon && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green, background: C.greenSoft, padding: '4px 9px', borderRadius: 99, letterSpacing: 0.1 }}>{soon}</span>}
      {!isLast && <div style={{ position: 'absolute', left: 67, right: 0, bottom: 0, height: 1, background: C.sep }} />}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 60 }}>
        <div style={{ padding: '4px 22px 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Ico.check('#fff', 3.2)}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.green, letterSpacing: 0.2 }}>SCAN COMPLETE</span>
          </div>
          <h1 style={{ margin: '8px 0 2px', fontSize: 30, fontWeight: 800, color: C.ink, letterSpacing: -0.6, lineHeight: 1.08 }}>Your calendar is ready</h1>
          <p style={{ margin: 0, fontSize: 15, color: C.sec, lineHeight: 1.35 }}>
            We found <b style={{ color: C.ink }}>12 collection dates</b> for the rest of 2026.
          </p>
        </div>

        <div style={{ padding: '20px 18px 6px' }}><ScanPreview badge /></div>

        <div style={{ padding: '14px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>NEXT UP</div>
        <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <Row stream="papier" title="Paper Collection" when="Tomorrow · 07:00" soon="TOMORROW" />
          <Row stream="karton" title="Carton" when="Thursday, 18 June · 07:00" isLast />
        </div>

        <div style={{ padding: '22px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>REMIND ME</div>
        <div style={{ margin: '0 16px 8px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.greenTint, marginRight: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Ico.bell(C.green)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>Reminders</div>
              <div style={{ fontSize: 13.5, color: remind ? C.green : C.ter, marginTop: 1, fontWeight: remind ? 600 : 500 }}>{remind ? summary : 'Off'}</div>
            </div>
            <Switch on={remind} onChange={setRemind} />
          </div>
          <div style={{ maxHeight: remind ? 200 : 0, opacity: remind ? 1 : 0, overflow: 'hidden', transition: 'max-height .35s ease, opacity .3s ease' }}>
            <div style={{ height: 1, background: C.sep, margin: '0 16px' }} />
            <div style={{ padding: '14px 16px 4px' }}>
              <div style={{ fontSize: 12.5, color: C.sec, marginBottom: 8, fontWeight: 500 }}>When</div>
              <div style={{ display: 'flex', gap: 6, background: '#F1F0EC', padding: 3, borderRadius: 11 }}>
                {[['Same day',0],['1 day before',1],['2 days',2]].map(([l,v]) => (
                  <button key={v} onClick={() => setLead(v)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8.5, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
                    background: lead === v ? '#fff' : 'transparent', color: lead === v ? C.ink : C.sec,
                    boxShadow: lead === v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all .2s',
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
                    background: time === t ? C.greenSoft : '#fff', color: time === t ? C.greenDeep : C.sec, transition: 'all .18s',
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

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '14px 18px 30px',
        background: 'linear-gradient(to top, rgba(239,238,234,1) 62%, rgba(239,238,234,0))' }}>
        <button
          onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: saved ? C.greenDeep : C.green, color: '#fff', fontSize: 17.5, fontWeight: 700, letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: '0 8px 22px rgba(31,157,87,0.36)', transform: press ? 'scale(0.975)' : 'scale(1)', transition: 'transform .12s, background .2s',
          }}>
          {saved ? <>{Ico.check('#fff', 3)} Synced to Calendar</> : <>{Ico.cal('#fff')} Save &amp; Sync to Calendar</>}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { LaunchScreen, CameraScreen, SuccessScreen });
