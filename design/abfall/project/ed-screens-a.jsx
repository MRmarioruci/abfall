// Abfall Scanner — EDITORIAL screens: Home + Detail

const serif = "Newsreader, 'Times New Roman', serif";

// vibrant collection card (New-Arrivals style, with speech-bubble arrow)
function CollectionCard({ stream, date, rel, time, bubble = false, width = 232 }) {
  const s = ST[stream];
  return (
    <div style={{ position: 'relative', width, flexShrink: 0 }}>
      <div style={{ background: s.c, borderRadius: 28, padding: '16px 18px 18px', position: 'relative', overflow: 'hidden', minHeight: 268 }}>
        {/* glyph watermark */}
        <div style={{ position: 'absolute', right: -14, top: 6, opacity: 0.16 }}>
          <StreamGlyph stream={stream} size={150} c={s.ink} />
        </div>
        <div style={{ position: 'relative' }}>
          <CircBtn size={40} bg="rgba(255,255,255,0.55)">{EIco.bell(s.ink, 19)}</CircBtn>
          <div style={{ fontFamily: serif, fontSize: 27, fontWeight: 500, color: s.ink, letterSpacing: -0.3, lineHeight: 1.04, marginTop: 16 }}>{s.label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: s.ink, opacity: 0.8, marginTop: 4 }}>{s.en}</div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.ink, opacity: 0.6, letterSpacing: 1 }}>{rel.toUpperCase()}</div>
            <div style={{ fontFamily: serif, fontSize: 25, fontWeight: 600, color: s.ink, letterSpacing: -0.4, marginTop: 2 }}>{date}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.ink, opacity: 0.75, marginTop: 1 }}>Out by {time}</div>
          </div>
        </div>
      </div>
      {bubble && (
        <div style={{ position: 'absolute', right: 14, bottom: 14, width: 56, height: 56, borderRadius: 99, background: s.c,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `5px solid ${D.bg}` }}>
          {EIco.arrowR(s.ink, 22)}
        </div>
      )}
    </div>
  );
}

function EHome() {
  const upcoming = [
    { stream: 'gruengut', d: 'Tue 16 Jun', rel: 'in 6 days' },
    { stream: 'karton', d: 'Thu 18 Jun', rel: 'in 8 days' },
    { stream: 'kehricht', d: 'Tue 23 Jun', rel: 'in 13 days' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: D.bg, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 56 }}>
        {/* top bar */}
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CircBtn bg="rgba(255,255,255,0.08)">{EIco.search(D.ink, 20)}</CircBtn>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: D.sec, fontWeight: 500 }}>Guten Tag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              {EIco.pin(D.lime, 15)}
              <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: D.ink, letterSpacing: -0.2 }}>Schlieren</span>
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 99, background: 'linear-gradient(135deg,#3a3a40,#222226)', border: `1.5px solid ${D.line}` }} />
        </div>

        {/* section header */}
        <div style={{ padding: '26px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 30, fontWeight: 500, color: D.ink, letterSpacing: -0.4 }}>Next up</h2>
          {EIco.arrowLong(D.ink, 24)}
        </div>

        {/* carousel */}
        <div style={{ display: 'flex', gap: 14, padding: '16px 20px 4px', overflowX: 'auto' }}>
          <CollectionCard stream="papier" date="Thu, 11 Jun" rel="Tomorrow" time="07:00" bubble />
          <CollectionCard stream="metall" date="Sat, 13 Jun" rel="in 3 days" time="07:00" />
        </div>
        {/* page dots */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 20px 0' }}>
          <span style={{ width: 18, height: 5, borderRadius: 99, background: D.lime }} />
          <span style={{ width: 5, height: 5, borderRadius: 99, background: D.ter }} />
          <span style={{ width: 5, height: 5, borderRadius: 99, background: D.ter }} />
        </div>

        {/* upcoming list */}
        <div style={{ padding: '24px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 30, fontWeight: 500, color: D.ink, letterSpacing: -0.4 }}>This month</h2>
          {EIco.arrowLong(D.ink, 24)}
        </div>
        <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcoming.map((u, i) => {
            const s = ST[u.stream];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: D.bg2, borderRadius: 20, padding: '12px 16px 12px 12px', border: `1px solid ${D.line}` }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StreamGlyph stream={u.stream} size={34} c={s.ink} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: D.ink, letterSpacing: -0.2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: D.sec, marginTop: 1 }}>{u.d} · 07:00</div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: D.sec, marginRight: 4 }}>{u.rel}</span>
                {EIco.chevR(D.ter, 15)}
              </div>
            );
          })}
        </div>
        <div style={{ height: 130 }} />
      </div>
      <EditorialNav active="home" />
    </div>
  );
}

// detail — big hero + reminder-lead scrubber + pill toggle (watch-detail analog)
function EDetail() {
  const [lead, setLead] = React.useState(1);
  const [on, setOn] = React.useState(true);
  const leads = [
    { v: 3, t: '3d' }, { v: 2, t: '2d' }, { v: 1, t: '1d' }, { v: 0, t: 'AM' }, { v: -1, t: 'Eve' },
  ];
  const s = ST.papier;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: D.bg, fontFamily: "'Hanken Grotesk', sans-serif", position: 'relative' }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, borderRadius: 99, background: `radial-gradient(circle, ${s.c}22, transparent 68%)` }} />

      <div style={{ flex: 1, overflow: 'auto', paddingTop: 56, position: 'relative' }}>
        {/* top bar */}
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CircBtn bg="rgba(255,255,255,0.08)">{EIco.back(D.ink, 19)}</CircBtn>
          <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: D.ink }}>{s.label}</span>
          <CircBtn bg="rgba(255,255,255,0.08)">{EIco.heart(D.ink, 18)}</CircBtn>
        </div>

        {/* hero glyph */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 6px' }}>
          <div style={{ width: 230, height: 230, borderRadius: 99, background: `radial-gradient(circle at 38% 30%, ${s.c}, ${s.c}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 24px 60px ${s.c}55` }}>
            <StreamGlyph stream="papier" size={120} c={s.ink} />
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px 20px 0' }}>
          <div style={{ fontSize: 13.5, color: D.sec, fontWeight: 600 }}>{s.en} · collected fortnightly</div>
        </div>

        {/* date dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '14px 0 4px' }}>
          <span style={{ width: 18, height: 5, borderRadius: 99, background: D.lime }} />
          <span style={{ width: 5, height: 5, borderRadius: 99, background: D.ter }} />
        </div>

        {/* reminder-lead scrubber (like the mm size selector) */}
        <div style={{ padding: '12px 0 0' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: D.ter, letterSpacing: 1.5, marginBottom: 6 }}>REMIND ME</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {leads.map(l => {
              const sel = lead === l.v;
              return (
                <button key={l.v} onClick={() => setLead(l.v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                  {sel ? (
                    <div style={{ background: D.lime, borderRadius: 99, padding: '12px 6px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, boxShadow: '0 8px 20px rgba(194,240,61,0.3)' }}>
                      <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: D.onDark, lineHeight: 1 }}>{l.t}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: D.onDark, opacity: 0.7, marginTop: 3, letterSpacing: 0.5 }}>BEFORE</span>
                    </div>
                  ) : (
                    <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, color: D.ter }}>{l.t}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ height: 150 }} />
      </div>

      {/* bottom dock: next date + pill toggle */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '18px 20px 30px',
        background: 'linear-gradient(to top, rgba(10,10,11,1) 60%, rgba(10,10,11,0))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.ter, letterSpacing: 1 }}>NEXT PICKUP</div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: D.lime, letterSpacing: -0.4, marginTop: 2 }}>Tomorrow</div>
          <div style={{ fontSize: 13, color: D.sec }}>Thu 11 Jun · 07:00</div>
        </div>
        <PillToggle on={on} onChange={setOn} leftIcon={EIco.bell} rightIcon={EIco.check} />
      </div>
    </div>
  );
}

Object.assign(window, { EHome, EDetail, CollectionCard });
