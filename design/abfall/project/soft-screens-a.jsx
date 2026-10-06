// Abfall Scanner — SOFT screens: Home + Collection detail

const sfont = "'Hanken Grotesk', sans-serif";

// pastel stream card for the home grid (Exercises-grid analog) with ↗ corner button
function StreamGridCard({ stream, rel, date, tall = false }) {
  const s = ST[stream];
  return (
    <div style={{ position: 'relative', background: s.c, borderRadius: 26, padding: '16px 16px 14px', overflow: 'hidden', minHeight: tall ? 196 : 170, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', right: -16, bottom: -10, opacity: 0.18 }}>
        <StreamGlyph stream={stream} size={tall ? 150 : 124} c={s.ink} />
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: s.ink, opacity: 0.62, letterSpacing: 1, textTransform: 'uppercase' }}>{rel}</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: s.ink, letterSpacing: -0.5, lineHeight: 1.05, marginTop: 5 }}>{s.label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: s.ink, opacity: 0.7, marginTop: 3 }}>{date}</div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {SIco.arrowUR(s.ink, 19)}
        </div>
      </div>
    </div>
  );
}

function SHome() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, backgroundImage: S.screen, fontFamily: sfont }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 58 }}>
        {/* top bar */}
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandMark size={40} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: S.sec, fontWeight: 600 }}>Guten Tag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              {SIco.pin(S.ink, 15)}
              <span style={{ fontSize: 17, fontWeight: 800, color: S.ink, letterSpacing: -0.3 }}>Schlieren</span>
            </div>
          </div>
          <CircBtn size={44}>{SIco.search(S.ink, 20)}</CircBtn>
        </div>

        {/* headline */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 12.5, color: S.sec, fontWeight: 600, marginBottom: 6 }}>Your pickups</div>
          <Display size={33}>The streams<br />due <Bold>this week</Bold></Display>
        </div>

        {/* pastel card grid (signature) */}
        <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StreamGridCard stream="papier" rel="Tomorrow" date="Thu, 11 Jun · 07:00" tall />
          <StreamGridCard stream="metall" rel="In 3 days" date="Sat, 13 Jun" />
          <StreamGridCard stream="gruengut" rel="In 6 days" date="Tue, 16 Jun" />
          <StreamGridCard stream="karton" rel="In 8 days" date="Thu, 18 Jun" tall />
        </div>

        {/* this-year stat card with bubble cluster */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ background: S.card, borderRadius: 26, padding: '18px 18px 16px', boxShadow: S.shadow, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.ink }}>This year in Schlieren</div>
              {SIco.arrowUR(S.ter, 18)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 52, fontWeight: 800, color: S.ink, letterSpacing: -2.5, lineHeight: 0.9 }}>94<span style={{ fontSize: 30 }}>%</span></div>
                <div style={{ fontSize: 12.5, color: S.sec, fontWeight: 600, marginTop: 4 }}>sorted on the right day</div>
              </div>
              {/* bubble cluster */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {[['gruengut',46],['papier',38],['kehricht',30],['karton',24],['metall',20]].map(([st, d]) => (
                  <div key={st} style={{ width: d, height: d, borderRadius: 99, background: ST[st].c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <StreamGlyph stream={st} size={d * 0.5} c={ST[st].ink} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 120 }} />
      </div>
      <SoftNav active="home" />
    </div>
  );
}

// Collection detail — pastel hero circle, reminder-lead dial, bottom dock toggle
function SDetail() {
  const [lead, setLead] = React.useState(1);
  const [on, setOn] = React.useState(true);
  const leads = [{ v: 3, t: '3d' }, { v: 2, t: '2d' }, { v: 1, t: '1d' }, { v: 0, t: 'AM' }, { v: -1, t: 'Eve' }];
  const s = ST.papier;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, backgroundImage: S.screen, fontFamily: sfont, position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 58, position: 'relative' }}>
        {/* top bar */}
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CircBtn size={44}>{SIco.back(S.ink, 20)}</CircBtn>
          <span style={{ fontSize: 17, fontWeight: 800, color: S.ink, letterSpacing: -0.3 }}>{s.label}</span>
          <CircBtn size={44}>{SIco.heart(S.ink, 19)}</CircBtn>
        </div>

        {/* hero circle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 4px' }}>
          <div style={{ width: 224, height: 224, borderRadius: 99, background: `radial-gradient(circle at 38% 30%, ${s.soft}, ${s.c})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 28px 56px ${s.c}88` }}>
            <StreamGlyph stream="papier" size={120} c={s.ink} />
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '14px 20px 0' }}>
          <Display size={28}>Paper, every <Bold>two weeks</Bold></Display>
          <div style={{ fontSize: 13.5, color: S.sec, fontWeight: 600, marginTop: 6 }}>Flatten boxes · no plastic windows</div>
        </div>

        {/* reminder-lead dial */}
        <div style={{ padding: '24px 0 0' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: S.ter, letterSpacing: 1.5, marginBottom: 8 }}>REMIND ME</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {leads.map(l => {
              const sel = lead === l.v;
              return (
                <button key={l.v} onClick={() => setLead(l.v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                  {sel ? (
                    <div style={{ background: S.ink, borderRadius: 99, padding: '13px 8px 9px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, boxShadow: '0 10px 22px rgba(33,31,28,0.28)' }}>
                      <span style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -0.5 }}>{l.t}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: 0.5 }}>BEFORE</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 700, color: S.ter }}>{l.t}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ height: 160 }} />
      </div>

      {/* bottom dock */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '20px 22px 30px',
        background: 'linear-gradient(to top, #ECDFD4 58%, rgba(236,223,212,0))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: S.ter, letterSpacing: 1 }}>NEXT PICKUP</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: S.ink, letterSpacing: -0.6, marginTop: 3 }}>Tomorrow</div>
          <div style={{ fontSize: 13, color: S.sec, fontWeight: 600 }}>Thu 11 Jun · 07:00</div>
        </div>
        <PillToggle on={on} onChange={setOn} leftIcon={SIco.bell} rightIcon={SIco.check} />
      </div>
    </div>
  );
}

Object.assign(window, { SHome, SDetail, StreamGridCard });
