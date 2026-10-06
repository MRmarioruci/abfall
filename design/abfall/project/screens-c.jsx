// Abfall Scanner — Reminders editor (multiple reminders per collection)

function ReminderScreen() {
  const order = ['papier', 'karton', 'kehricht', 'gruengut'];
  const [sel, setSel] = React.useState('papier');
  const [data, setData] = React.useState({
    papier: [{ id: 1, when: '1 day before', time: '18:00', on: true }, { id: 2, when: 'Morning of', time: '07:00', on: true }],
    karton: [{ id: 3, when: '1 day before', time: '18:00', on: true }],
    kehricht: [{ id: 4, when: 'Evening before', time: '20:00', on: true }],
    gruengut: [],
  });
  const [adding, setAdding] = React.useState(false);
  const [draftWhen, setDraftWhen] = React.useState('1 day before');
  const [draftTime, setDraftTime] = React.useState('18:00');
  const nextId = React.useRef(10);

  const whenOpts = [
    { v: 'Morning of', icon: Ico.sun, t: '07:00' },
    { v: 'Evening before', icon: Ico.moon, t: '20:00' },
    { v: '1 day before', icon: Ico.bell, t: '18:00' },
    { v: '2 days before', icon: Ico.bell, t: '18:00' },
    { v: '3 days before', icon: Ico.bell, t: '18:00' },
  ];
  const whenIcon = (w, c) => (whenOpts.find(o => o.v === w)?.icon || Ico.bell)(c, 19);
  const times = ['07:00', '12:00', '18:00', '20:00'];

  const list = data[sel];
  const setList = (fn) => setData(d => ({ ...d, [sel]: fn(d[sel]) }));
  const toggle = (id) => setList(l => l.map(r => r.id === id ? { ...r, on: !r.on } : r));
  const remove = (id) => setList(l => l.filter(r => r.id !== id));
  const add = () => { setList(l => [...l, { id: nextId.current++, when: draftWhen, time: draftTime, on: true }]); setAdding(false); };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 60 }}>
        <div style={{ padding: '6px 22px 2px' }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: C.ink, letterSpacing: -0.7 }}>Reminders</h1>
          <p style={{ margin: '4px 0 0', fontSize: 15, color: C.sec, lineHeight: 1.35 }}>Get nudged before every pickup. Add as many as you like per type.</p>
        </div>

        {/* stream selector */}
        <div style={{ display: 'flex', gap: 9, padding: '18px 16px 4px', overflowX: 'auto' }}>
          {order.map(s => {
            const on = s === sel;
            const n = data[s].filter(r => r.on).length;
            return (
              <button key={s} onClick={() => { setSel(s); setAdding(false); }} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 14px 10px',
                borderRadius: 16, cursor: 'pointer', minWidth: 76,
                border: `1.5px solid ${on ? STREAMS[s].dot : 'rgba(60,60,67,0.12)'}`,
                background: on ? `${STREAMS[s].dot}12` : C.card, transition: 'all .18s', position: 'relative',
              }}>
                <StreamAvatar stream={s} size={34} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? C.ink : C.sec }}>{STREAMS[s].en}</span>
                {n > 0 && <span style={{ position: 'absolute', top: 8, right: 9, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: STREAMS[s].dot, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
              </button>
            );
          })}
        </div>

        {/* reminders for selected stream */}
        <div style={{ padding: '18px 22px 8px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: C.sec, letterSpacing: 0.6 }}>
          {STREAMS[sel].en.toUpperCase()} REMINDERS
        </div>

        <div style={{ margin: '0 16px', background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          {list.length === 0 && !adding && (
            <div style={{ padding: '26px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>No reminders yet</div>
              <div style={{ fontSize: 13.5, color: C.sec, marginTop: 3 }}>Add one below to get notified for {STREAMS[sel].en.toLowerCase()} pickups.</div>
            </div>
          )}

          {list.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 12px 16px', position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: r.on ? C.greenTint : '#F1F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                {whenIcon(r.when, r.on ? C.green : C.ter)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: r.on ? C.ink : C.sec, letterSpacing: -0.2 }}>{r.when}</div>
                <div style={{ fontSize: 13, color: C.sec, marginTop: 1 }}>at {r.time}</div>
              </div>
              <button onClick={() => remove(r.id)} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: '#F1F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 10, flexShrink: 0 }}>{Ico.x(C.sec, 14)}</button>
              <Switch on={r.on} onChange={() => toggle(r.id)} />
              {(i < list.length - 1 || adding) && <div style={{ position: 'absolute', left: 64, right: 0, bottom: 0, height: 1, background: C.sep }} />}
            </div>
          ))}

          {/* composer */}
          {adding ? (
            <div style={{ padding: '14px 16px 16px', background: 'rgba(31,157,87,0.04)' }}>
              <div style={{ fontSize: 12.5, color: C.sec, marginBottom: 8, fontWeight: 600 }}>When</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {whenOpts.map(o => {
                  const on = draftWhen === o.v;
                  return (
                    <button key={o.v} onClick={() => { setDraftWhen(o.v); setDraftTime(o.t); }} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 99, cursor: 'pointer',
                      border: `1.5px solid ${on ? C.green : 'rgba(60,60,67,0.14)'}`, background: on ? C.greenSoft : '#fff',
                      color: on ? C.greenDeep : C.sec, fontSize: 13, fontWeight: 600, transition: 'all .15s',
                    }}>{o.icon(on ? C.green : C.ter, 16)} {o.v}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12.5, color: C.sec, margin: '14px 0 8px', fontWeight: 600 }}>Time</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {times.map(t => {
                  const on = draftTime === t;
                  return (
                    <button key={t} onClick={() => setDraftTime(t)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                      border: `1.5px solid ${on ? C.green : 'rgba(60,60,67,0.14)'}`, background: on ? C.greenSoft : '#fff', color: on ? C.greenDeep : C.sec,
                    }}>{t}</button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setAdding(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid rgba(60,60,67,0.14)', background: '#fff', color: C.ink, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={add} style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>{Ico.plus('#fff', 18)} Add reminder</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', border: 'none',
              background: 'transparent', cursor: 'pointer', borderTop: list.length ? `1px solid ${C.sep}` : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.plus(C.green, 19)}</div>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: C.green }}>Add a reminder</span>
            </button>
          )}
        </div>

        <p style={{ margin: '12px 22px 0', fontSize: 12.5, color: C.ter, lineHeight: 1.4 }}>
          Reminders fire only on collection days for {STREAMS[sel].en.toLowerCase()}. Turn any off without deleting it.
        </p>
        <div style={{ height: 120 }} />
      </div>

      {/* pinned */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '14px 18px 30px',
        background: 'linear-gradient(to top, rgba(239,238,234,1) 64%, rgba(239,238,234,0))' }}>
        <button style={{
          width: '100%', height: 54, borderRadius: 15, border: 'none', cursor: 'pointer',
          background: C.green, color: '#fff', fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 22px rgba(31,157,87,0.3)',
        }}>{Ico.check('#fff', 3)} Save reminders</button>
      </div>
    </div>
  );
}

Object.assign(window, { ReminderScreen });
