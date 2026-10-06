// Abfall Scanner — EDITORIAL screens: Setup / Reminders / Schedule

const eserif = "Newsreader, 'Times New Roman', serif";

// ── Setup / scan success ──────────────────────────────────────
function ESetup() {
  const [on, setOn] = React.useState(true);
  const rows = [
    { stream: 'papier', when: 'Tomorrow', date: 'Thu 11 Jun · 07:00', tag: 'TOMORROW' },
    { stream: 'karton', when: 'Thursday', date: '18 Jun · 07:00' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: D.bg, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 56 }}>
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CircBtn bg="rgba(255,255,255,0.08)">{EIco.back(D.ink, 19)}</CircBtn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(194,240,61,0.14)', border: `1px solid rgba(194,240,61,0.4)`, padding: '6px 12px', borderRadius: 99 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: D.lime }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: D.lime, letterSpacing: 0.3 }}>SCAN COMPLETE</span>
          </div>
          <div style={{ width: 44 }} />
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <h1 style={{ margin: 0, fontFamily: eserif, fontSize: 34, fontWeight: 500, color: D.ink, letterSpacing: -0.6, lineHeight: 1.05 }}>Your calendar<br />is ready</h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: D.sec, lineHeight: 1.4 }}>We read <span style={{ color: D.lime, fontWeight: 700 }}>12 collection dates</span> for the rest of 2026.</p>
        </div>

        <div style={{ padding: '20px 20px 0' }}><DarkCalendar /></div>

        <div style={{ padding: '24px 20px 8px', fontSize: 12, fontWeight: 700, color: D.ter, letterSpacing: 1.2 }}>NEXT UP</div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r, i) => {
            const s = ST[r.stream];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: D.bg2, borderRadius: 20, padding: '12px 16px 12px 12px', border: `1px solid ${D.line}` }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StreamGlyph stream={r.stream} size={34} c={s.ink} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: eserif, fontSize: 19, fontWeight: 600, color: D.ink, letterSpacing: -0.2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: D.sec, marginTop: 1 }}>{r.when} · {r.date}</div>
                </div>
                {r.tag && <span style={{ fontSize: 10.5, fontWeight: 800, color: D.onDark, background: D.lime, padding: '4px 9px', borderRadius: 99, letterSpacing: 0.3 }}>{r.tag}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: D.bg2, borderRadius: 20, padding: '14px 16px', border: `1px solid ${D.line}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(194,240,61,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{EIco.bell(D.lime, 21)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: D.ink }}>Reminders</div>
              <div style={{ fontSize: 13, color: on ? D.lime : D.ter, marginTop: 1, fontWeight: on ? 600 : 500 }}>{on ? '1 day before · 18:00' : 'Off'}</div>
            </div>
            <ESwitch on={on} onChange={setOn} />
          </div>
        </div>
        <div style={{ height: 120 }} />
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '14px 20px 30px',
        background: 'linear-gradient(to top, rgba(10,10,11,1) 62%, rgba(10,10,11,0))' }}>
        <button style={{ width: '100%', height: 56, borderRadius: 99, border: 'none', cursor: 'pointer', background: D.lime, color: D.onDark, fontSize: 17, fontWeight: 700, letterSpacing: -0.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 10px 26px rgba(194,240,61,0.32)' }}>
          {EIco.cal(D.onDark, 20)} Save &amp; sync to calendar
        </button>
      </div>
    </div>
  );
}

// ── Reminders (multi per stream) ──────────────────────────────
function EReminders() {
  const [sel, setSel] = React.useState('papier');
  const [data, setData] = React.useState({
    papier: [{ id: 1, when: '1 day before', time: '18:00', on: true }, { id: 2, when: 'Morning of', time: '07:00', on: true }],
    karton: [{ id: 3, when: '1 day before', time: '18:00', on: true }],
    kehricht: [{ id: 4, when: 'Evening before', time: '20:00', on: true }],
    gruengut: [], metall: [],
  });
  const whenOpts = [
    { v: 'Morning of', icon: EIco.sun }, { v: 'Evening before', icon: EIco.moon },
    { v: '1 day before', icon: EIco.bell }, { v: '2 days before', icon: EIco.bell },
  ];
  const whenIcon = (w, c) => (whenOpts.find(o => o.v === w)?.icon || EIco.bell)(c, 19);
  const list = data[sel];
  const setList = (fn) => setData(d => ({ ...d, [sel]: fn(d[sel]) }));
  const s = ST[sel];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: D.bg, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 56 }}>
        <div style={{ padding: '8px 20px 0' }}>
          <h1 style={{ margin: 0, fontFamily: eserif, fontSize: 34, fontWeight: 500, color: D.ink, letterSpacing: -0.6 }}>Reminders</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: D.sec, lineHeight: 1.4 }}>Stack as many nudges as you like, per collection.</p>
        </div>

        {/* stream chips */}
        <div style={{ display: 'flex', gap: 10, padding: '20px 16px 4px', overflowX: 'auto' }}>
          {ORDER.map(id => {
            const on = id === sel;
            const n = data[id].filter(r => r.on).length;
            const cc = ST[id];
            return (
              <button key={id} onClick={() => setSel(id)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px 9px 10px', borderRadius: 99, cursor: 'pointer',
                border: `1.5px solid ${on ? cc.c : D.line}`, background: on ? cc.c : D.bg2, transition: 'all .18s', position: 'relative',
              }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: on ? cc.ink : cc.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <StreamGlyph stream={id} size={18} c={on ? cc.c : cc.ink} />
                </span>
                <span style={{ fontFamily: eserif, fontSize: 16, fontWeight: 600, color: on ? cc.ink : D.ink }}>{cc.label}</span>
                {n > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: on ? cc.ink : D.bg3, color: on ? cc.c : D.sec, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '18px 20px 8px', fontSize: 12, fontWeight: 700, color: D.ter, letterSpacing: 1.2 }}>{s.label.toUpperCase()} · {list.length} REMINDER{list.length === 1 ? '' : 'S'}</div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 && (
            <div style={{ background: D.bg2, borderRadius: 20, border: `1px dashed ${D.line}`, padding: '26px 18px', textAlign: 'center' }}>
              <div style={{ fontFamily: eserif, fontSize: 18, fontWeight: 600, color: D.ink }}>No reminders yet</div>
              <div style={{ fontSize: 13.5, color: D.sec, marginTop: 3 }}>Add one to get nudged for {s.label.toLowerCase()} pickups.</div>
            </div>
          )}
          {list.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: D.bg2, borderRadius: 20, padding: '13px 14px 13px 14px', border: `1px solid ${D.line}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: r.on ? 'rgba(194,240,61,0.14)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{whenIcon(r.when, r.on ? D.lime : D.ter)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: r.on ? D.ink : D.sec }}>{r.when}</div>
                <div style={{ fontSize: 13, color: D.sec, marginTop: 1 }}>at {r.time}</div>
              </div>
              <button onClick={() => setList(l => l.filter(x => x.id !== r.id))} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 6 }}>{EIco.x(D.sec, 14)}</button>
              <ESwitch on={r.on} onChange={() => setList(l => l.map(x => x.id === r.id ? { ...x, on: !x.on } : x))} />
            </div>
          ))}
          {/* add */}
          <button onClick={() => setList(l => [...l, { id: Date.now(), when: '1 day before', time: '18:00', on: true }])} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'transparent', border: `1.5px dashed ${D.line}`,
            borderRadius: 20, padding: '15px', cursor: 'pointer', color: D.lime, fontSize: 15.5, fontWeight: 600,
          }}>{EIco.plus(D.lime, 19)} Add a reminder</button>
        </div>
        <div style={{ height: 120 }} />
      </div>
      <EditorialNav active="bell" />
    </div>
  );
}

// ── Schedule (full year list) ─────────────────────────────────
function ESchedule() {
  const months = [
    { label: 'Juni', items: [
      { stream: 'papier', wd: 'Thu', d: 11, tag: 'Tomorrow' },
      { stream: 'gruengut', wd: 'Tue', d: 16 },
      { stream: 'karton', wd: 'Thu', d: 18 },
      { stream: 'kehricht', wd: 'Tue', d: 23 },
    ]},
    { label: 'Juli', items: [
      { stream: 'papier', wd: 'Thu', d: 2 },
      { stream: 'gruengut', wd: 'Tue', d: 7 },
      { stream: 'kehricht', wd: 'Thu', d: 9 },
    ]},
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: D.bg, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 56 }}>
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: D.lime, letterSpacing: 0.3 }}>SCHLIEREN · 2026</div>
            <h1 style={{ margin: '4px 0 0', fontFamily: eserif, fontSize: 34, fontWeight: 500, color: D.ink, letterSpacing: -0.6 }}>Schedule</h1>
          </div>
          <CircBtn bg="rgba(255,255,255,0.08)">{EIco.search(D.ink, 19)}</CircBtn>
        </div>

        {months.map((m, mi) => (
          <div key={mi}>
            <div style={{ padding: '22px 20px 10px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: eserif, fontSize: 24, fontWeight: 500, color: D.ink }}>{m.label}</span>
              <span style={{ fontSize: 13, color: D.ter, fontWeight: 600 }}>2026</span>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {m.items.map((it, i) => {
                const s = ST[it.stream];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: D.bg2, borderRadius: 20, padding: '12px 16px 12px 14px', border: `1px solid ${D.line}` }}>
                    <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: D.ter, letterSpacing: 0.4, textTransform: 'uppercase' }}>{it.wd}</div>
                      <div style={{ fontFamily: eserif, fontSize: 24, fontWeight: 600, color: D.ink, lineHeight: 1 }}>{it.d}</div>
                    </div>
                    <div style={{ width: 4, height: 34, borderRadius: 99, background: s.c, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: eserif, fontSize: 18, fontWeight: 600, color: D.ink, letterSpacing: -0.2 }}>{s.label}</div>
                      <div style={{ fontSize: 12.5, color: D.sec, marginTop: 1 }}>{s.en} · 07:00</div>
                    </div>
                    {it.tag
                      ? <span style={{ fontSize: 10.5, fontWeight: 800, color: D.onDark, background: D.lime, padding: '4px 9px', borderRadius: 99 }}>{it.tag.toUpperCase()}</span>
                      : <div style={{ width: 30, height: 30, borderRadius: 10, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StreamGlyph stream={it.stream} size={19} c={s.ink} /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ height: 120 }} />
      </div>
      <EditorialNav active="cal" />
    </div>
  );
}

Object.assign(window, { ESetup, EReminders, ESchedule });
