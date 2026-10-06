// Abfall Scanner — SOFT screens: Setup / Reminders / Schedule

const sfont2 = "'Hanken Grotesk', sans-serif";

// ── Setup / scan success ──────────────────────────────────────
function SSetup() {
  const [on, setOn] = React.useState(true);
  const rows = [
    { stream: 'papier', when: 'Tomorrow', date: 'Thu 11 Jun · 07:00', tag: 'TOMORROW' },
    { stream: 'gruengut', when: 'Tuesday', date: '16 Jun · 07:00' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, backgroundImage: S.warm, fontFamily: sfont2 }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 58 }}>
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CircBtn size={44}>{SIco.back(S.ink, 20)}</CircBtn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', boxShadow: S.shadowSm, padding: '8px 14px', borderRadius: 99 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: '#5BA86B' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: S.ink, letterSpacing: 0.3 }}>SCAN COMPLETE</span>
          </div>
          <div style={{ width: 44 }} />
        </div>

        <div style={{ padding: '22px 20px 0' }}>
          <Display size={34}>Your calendar<br />is <Bold>ready</Bold></Display>
          <p style={{ margin: '12px 0 0', fontSize: 15, color: S.sec, lineHeight: 1.45, fontWeight: 500 }}>We read <span style={{ color: S.ink, fontWeight: 800 }}>12 collection dates</span> for the rest of 2026.</p>
        </div>

        <div style={{ padding: '20px 20px 0' }}><SoftCalendar /></div>

        <div style={{ padding: '24px 20px 10px', fontSize: 12, fontWeight: 800, color: S.ter, letterSpacing: 1.2 }}>NEXT UP</div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r, i) => {
            const s = ST[r.stream];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: S.card, borderRadius: 22, padding: '12px 16px 12px 12px', boxShadow: S.shadowSm }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StreamGlyph stream={r.stream} size={34} c={s.ink} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: S.ink, letterSpacing: -0.3 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: S.sec, marginTop: 1, fontWeight: 600 }}>{r.when} · {r.date}</div>
                </div>
                {r.tag && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: S.ink, padding: '5px 10px', borderRadius: 99, letterSpacing: 0.3 }}>{r.tag}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: S.card, borderRadius: 22, padding: '14px 16px', boxShadow: S.shadowSm }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: ST.papier.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{SIco.bell(ST.papier.ink, 21)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: S.ink }}>Reminders</div>
              <div style={{ fontSize: 13, color: on ? S.ink : S.ter, marginTop: 1, fontWeight: 600 }}>{on ? '1 day before · 18:00' : 'Off'}</div>
            </div>
            <SSwitch on={on} onChange={setOn} />
          </div>
        </div>
        <div style={{ height: 130 }} />
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '14px 20px 30px',
        background: 'linear-gradient(to top, #ECDDD1 62%, rgba(236,221,209,0))' }}>
        <button style={{ width: '100%', height: 58, borderRadius: 99, border: 'none', cursor: 'pointer', background: S.ink, color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: -0.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 12px 26px rgba(33,31,28,0.28)' }}>
          {SIco.cal('#fff', 20)} Save &amp; sync to calendar
        </button>
      </div>
    </div>
  );
}

// ── Reminders (multi per stream) ──────────────────────────────
function SReminders() {
  const [sel, setSel] = React.useState('papier');
  const [data, setData] = React.useState({
    papier: [{ id: 1, when: '1 day before', time: '18:00', on: true }, { id: 2, when: 'Morning of', time: '07:00', on: true }],
    karton: [{ id: 3, when: '1 day before', time: '18:00', on: true }],
    kehricht: [{ id: 4, when: 'Evening before', time: '20:00', on: true }],
    gruengut: [], metall: [],
  });
  const whenOpts = [
    { v: 'Morning of', icon: SIco.sun }, { v: 'Evening before', icon: SIco.moon },
    { v: '1 day before', icon: SIco.bell }, { v: '2 days before', icon: SIco.bell },
  ];
  const whenIcon = (w, c) => (whenOpts.find(o => o.v === w)?.icon || SIco.bell)(c, 19);
  const list = data[sel];
  const setList = (fn) => setData(d => ({ ...d, [sel]: fn(d[sel]) }));
  const s = ST[sel];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, backgroundImage: S.screen, fontFamily: sfont2 }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 58 }}>
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ fontSize: 12.5, color: S.sec, fontWeight: 600, marginBottom: 6 }}>Notifications</div>
          <Display size={34}>Stack your <Bold>nudges</Bold></Display>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: S.sec, lineHeight: 1.4, fontWeight: 500 }}>As many reminders as you like, per collection.</p>
        </div>

        {/* stream chips */}
        <div style={{ display: 'flex', gap: 10, padding: '20px 16px 4px', overflowX: 'auto' }}>
          {ORDER.map(id => {
            const on = id === sel;
            const n = data[id].filter(r => r.on).length;
            const cc = ST[id];
            return (
              <button key={id} onClick={() => setSel(id)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 8px', borderRadius: 99, cursor: 'pointer',
                border: 'none', background: on ? cc.c : '#fff', boxShadow: on ? 'none' : S.shadowSm, transition: 'all .18s',
              }}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: on ? 'rgba(255,255,255,0.55)' : cc.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <StreamGlyph stream={id} size={19} c={cc.ink} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: on ? cc.ink : S.ink, letterSpacing: -0.3 }}>{cc.label}</span>
                {n > 0 && <span style={{ minWidth: 19, height: 19, padding: '0 5px', borderRadius: 99, background: on ? cc.ink : '#F0EAE4', color: on ? '#fff' : S.sec, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '20px 20px 10px', fontSize: 12, fontWeight: 800, color: S.ter, letterSpacing: 1.2 }}>{s.label.toUpperCase()} · {list.length} REMINDER{list.length === 1 ? '' : 'S'}</div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 && (
            <div style={{ background: S.card, borderRadius: 22, padding: '28px 18px', textAlign: 'center', boxShadow: S.shadowSm }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: S.ink, letterSpacing: -0.3 }}>No reminders yet</div>
              <div style={{ fontSize: 13.5, color: S.sec, marginTop: 4, fontWeight: 500 }}>Add one to get nudged for {s.label.toLowerCase()} pickups.</div>
            </div>
          )}
          {list.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: S.card, borderRadius: 22, padding: '13px 14px', boxShadow: S.shadowSm }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: r.on ? s.soft : '#F2ECE6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{whenIcon(r.when, r.on ? s.ink : S.ter)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.on ? S.ink : S.sec }}>{r.when}</div>
                <div style={{ fontSize: 13, color: S.sec, marginTop: 1, fontWeight: 600 }}>at {r.time}</div>
              </div>
              <button onClick={() => setList(l => l.filter(x => x.id !== r.id))} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: '#F2ECE6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}>{SIco.x(S.sec, 14)}</button>
              <SSwitch on={r.on} onChange={() => setList(l => l.map(x => x.id === r.id ? { ...x, on: !x.on } : x))} />
            </div>
          ))}
          <button onClick={() => setList(l => [...l, { id: Date.now(), when: '1 day before', time: '18:00', on: true }])} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'transparent', border: `1.6px dashed ${S.ter}`,
            borderRadius: 22, padding: '16px', cursor: 'pointer', color: S.ink, fontSize: 15.5, fontWeight: 700,
          }}>{SIco.plus(S.ink, 19)} Add a reminder</button>
        </div>
        <div style={{ height: 130 }} />
      </div>
      <SoftNav active="bell" />
    </div>
  );
}

// ── Schedule (full year list) ─────────────────────────────────
function SSchedule() {
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
      { stream: 'metall', wd: 'Thu', d: 9 },
    ]},
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, backgroundImage: S.screen, fontFamily: sfont2 }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 58 }}>
        <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: S.sec, letterSpacing: 0.3 }}>SCHLIEREN · 2026</div>
            <Display size={34} style={{ marginTop: 5 }}>The whole <Bold>year</Bold></Display>
          </div>
          <CircBtn size={44}>{SIco.search(S.ink, 19)}</CircBtn>
        </div>

        {months.map((m, mi) => (
          <div key={mi}>
            <div style={{ padding: '24px 20px 10px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 23, fontWeight: 800, color: S.ink, letterSpacing: -0.5 }}>{m.label}</span>
              <span style={{ fontSize: 13, color: S.ter, fontWeight: 700 }}>2026</span>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {m.items.map((it, i) => {
                const s = ST[it.stream];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: S.card, borderRadius: 22, padding: '12px 16px 12px 14px', boxShadow: S.shadowSm }}>
                    <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: S.ter, letterSpacing: 0.4, textTransform: 'uppercase' }}>{it.wd}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: S.ink, lineHeight: 1, letterSpacing: -0.5 }}>{it.d}</div>
                    </div>
                    <div style={{ width: 4, height: 36, borderRadius: 99, background: s.c, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: S.ink, letterSpacing: -0.3 }}>{s.label}</div>
                      <div style={{ fontSize: 12.5, color: S.sec, marginTop: 1, fontWeight: 600 }}>{s.en} · 07:00</div>
                    </div>
                    {it.tag
                      ? <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: S.ink, padding: '5px 10px', borderRadius: 99 }}>{it.tag.toUpperCase()}</span>
                      : <div style={{ width: 34, height: 34, borderRadius: 11, background: s.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StreamGlyph stream={it.stream} size={20} c={s.ink} /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ height: 130 }} />
      </div>
      <SoftNav active="cal" />
    </div>
  );
}

Object.assign(window, { SSetup, SReminders, SSchedule });
