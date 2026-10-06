// Abfall Scanner — live app: Schedule / Home dashboard / Lock-screen reminder

// ── 4. Full schedule (all collections) ────────────────────────
function ScheduleScreen() {
  const [filter, setFilter] = React.useState('all');
  const chips = [['all','All'],['papier','Papier'],['karton','Karton'],['kehricht','Kehricht'],['gruengut','Grüngut']];

  const months = [
    { label: 'JUNI 2026', items: [
      { stream: 'papier', wd: 'Thu', d: 11, tag: 'Tomorrow' },
      { stream: 'gruengut', wd: 'Tue', d: 16 },
      { stream: 'karton', wd: 'Thu', d: 18 },
      { stream: 'kehricht', wd: 'Tue', d: 23 },
    ]},
    { label: 'JULI 2026', items: [
      { stream: 'papier', wd: 'Thu', d: 2 },
      { stream: 'gruengut', wd: 'Tue', d: 7 },
      { stream: 'kehricht', wd: 'Thu', d: 9 },
      { stream: 'karton', wd: 'Thu', d: 16 },
    ]},
  ];

  const Item = ({ it, isLast }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', position: 'relative' }}>
      <div style={{ width: 44, textAlign: 'center', marginRight: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.sec, letterSpacing: 0.3, textTransform: 'uppercase' }}>{it.wd}</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: C.ink, letterSpacing: -0.5, lineHeight: 1 }}>{it.d}</div>
      </div>
      <div style={{ width: 3, height: 30, borderRadius: 99, background: STREAMS[it.stream].dot, marginRight: 13, flexShrink: 0 }} />
      <div style={{ marginRight: 12 }}><StreamAvatar stream={it.stream} size={34} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{STREAMS[it.stream].label}</div>
        <div style={{ fontSize: 12.5, color: C.sec }}>{STREAMS[it.stream].en} collection · 07:00</div>
      </div>
      {it.tag && <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenSoft, padding: '4px 9px', borderRadius: 99 }}>{it.tag.toUpperCase()}</span>}
      {!isLast && <div style={{ position: 'absolute', left: 75, right: 0, bottom: 0, height: 1, background: C.sep }} />}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 60 }}>
        <div style={{ padding: '6px 22px 2px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.green, letterSpacing: 0.3 }}>SCHLIEREN · 2026</div>
          <h1 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 800, color: C.ink, letterSpacing: -0.7 }}>Schedule</h1>
        </div>

        {/* filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 16px 6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {chips.map(([id, lbl]) => {
            const on = filter === id;
            return (
              <button key={id} onClick={() => setFilter(id)} style={{
                flexShrink: 0, padding: '8px 15px', borderRadius: 99, cursor: 'pointer',
                border: `1.5px solid ${on ? C.green : 'rgba(60,60,67,0.14)'}`,
                background: on ? C.green : C.card, color: on ? '#fff' : C.sec,
                fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all .18s',
              }}>
                {id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: on ? '#fff' : STREAMS[id].dot }} />}
                {lbl}
              </button>
            );
          })}
        </div>

        {months.map((m, mi) => {
          const items = m.items.filter(it => filter === 'all' || it.stream === filter);
          if (!items.length) return null;
          return (
            <div key={mi}>
              <div style={{ padding: '16px 22px 8px', fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>{m.label}</div>
              <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                {items.map((it, i) => <Item key={i} it={it} isLast={i === items.length - 1} />)}
              </div>
            </div>
          );
        })}
        <div style={{ height: 100 }} />
      </div>
      <TabBar active="schedule" />
    </div>
  );
}

// ── 5. Home dashboard ─────────────────────────────────────────
function HomeScreen() {
  const upcoming = [
    { stream: 'karton', wd: 'Thu 18 Jun', sub: 'in 8 days' },
    { stream: 'gruengut', wd: 'Tue 16 Jun', sub: 'in 6 days' },
    { stream: 'kehricht', wd: 'Tue 23 Jun', sub: 'in 13 days' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 60 }}>
        <div style={{ padding: '6px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, color: C.sec, fontWeight: 500 }}>Guten Tag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              {Ico.pin(C.ink, 16)}
              <span style={{ fontSize: 19, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>Schlieren</span>
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {Ico.bell(C.ink, 19)}
          </div>
        </div>

        {/* hero next-collection card */}
        <div style={{ padding: '18px 18px 4px' }}>
          <div style={{
            position: 'relative', borderRadius: 24, padding: '22px 22px 24px', overflow: 'hidden',
            background: 'linear-gradient(150deg, #1F9D57 0%, #15824A 100%)',
            boxShadow: '0 14px 30px rgba(31,157,87,0.32)',
          }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', right: 18, bottom: -18, opacity: 0.16 }}>{Ico.paper('#fff', 130)}</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>NEXT COLLECTION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.paper('#fff', 26)}</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>Paper</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 3 }}>Tomorrow · 07:00</div>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, background: 'rgba(255,255,255,0.18)', padding: '9px 14px', borderRadius: 12 }}>
                {Ico.clock('#fff', 16)}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Put your paper out tonight</span>
              </div>
            </div>
          </div>
        </div>

        {/* upcoming */}
        <div style={{ padding: '20px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>UPCOMING</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.green }}>See all</span>
        </div>
        <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          {upcoming.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', position: 'relative' }}>
              <div style={{ marginRight: 13 }}><StreamAvatar stream={u.stream} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{STREAMS[u.stream].en}</div>
                <div style={{ fontSize: 13, color: C.sec, marginTop: 1 }}>{u.wd}</div>
              </div>
              <span style={{ fontSize: 13, color: C.sec, fontWeight: 500 }}>{u.sub}</span>
              {i < upcoming.length - 1 && <div style={{ position: 'absolute', left: 67, right: 0, bottom: 0, height: 1, background: C.sep }} />}
            </div>
          ))}
        </div>

        {/* rescan prompt */}
        <div style={{ margin: '16px 16px 0', padding: '14px 16px', borderRadius: 16, border: `1.5px dashed rgba(31,157,87,0.4)`, background: C.greenSoft, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Ico.camera(C.green, 19)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.greenDeep }}>Got a 2027 calendar?</div>
            <div style={{ fontSize: 12.5, color: 'rgba(23,130,71,0.8)' }}>Scan it to add next year's dates.</div>
          </div>
          {Ico.chev(C.green, 16)}
        </div>
        <div style={{ height: 100 }} />
      </div>
      <TabBar active="home" />
    </div>
  );
}

// ── 6. Lock-screen reminder ───────────────────────────────────
function LockScreen() {
  const Notif = ({ offset = 0, scale = 1, dim = 0 }) => (
    <div style={{
      margin: '0 14px', borderRadius: 22, padding: '13px 14px',
      background: `rgba(40,40,44,${0.62 - dim})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '0.5px solid rgba(255,255,255,0.12)',
      transform: `scale(${scale})`, transformOrigin: 'top center', marginTop: offset,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>{Ico.green('#fff', 23)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 }}>ABFALL SCANNER</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>now</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3, letterSpacing: -0.2 }}>Paper collection tomorrow, 07:00</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 1.3 }}>Put your paper &amp; cardboard out tonight in Schlieren.</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(165deg, #1d3326 0%, #16241c 45%, #0c130f 100%)' }}>
      {/* soft light */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, borderRadius: 99, background: 'radial-gradient(circle, rgba(31,157,87,0.22), transparent 70%)' }} />

      {/* clock */}
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.2 }}>Wednesday, 10 June</div>
        <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -2, lineHeight: 1, marginTop: 2 }}>06:30</div>
      </div>

      {/* notifications */}
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0 }}>
        <Notif />
        <Notif offset={-44} scale={0.93} dim={0.2} />
        <Notif offset={-50} scale={0.86} dim={0.34} />
      </div>

      {/* lock bottom controls */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 38px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 99, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.flash('rgba(255,255,255,0.9)', 20)}</div>
        <div style={{ width: 48, height: 48, borderRadius: 99, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.camera('rgba(255,255,255,0.9)', 22)}</div>
      </div>
    </div>
  );
}

Object.assign(window, { ScheduleScreen, HomeScreen, LockScreen });
