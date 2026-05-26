// ============================================================
//  EcoChargeCar — App.jsx
//  Drop this file into your /src folder on GitHub.
//  It replaces your existing App.jsx entirely.
//
//  To connect Supabase: add your URL + anon key below.
//  To connect Paystack: add your public key below.
// ============================================================

import { useState, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────
// Replace with your actual keys (or use .env variables)
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

// ── SUPABASE HELPER ───────────────────────────────────────────
const sb = async (path, opts = {}) => {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
    ...opts,
  });
  return res.ok ? res.json() : null;
};

// ── PAYSTACK HELPER ───────────────────────────────────────────
const payWithPaystack = ({ email, amountGHS, onSuccess, onClose }) => {
  const amountKobo = Math.round(amountGHS * 100); // Paystack uses pesewas for GHS
  if (window.PaystackPop) {
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_KEY,
      email,
      amount: amountKobo,
      currency: "GHS",
      callback: (res) => onSuccess(res),
      onClose,
    });
    handler.openIframe();
  } else {
    // Fallback: redirect flow
    const ref = `ECO-${Date.now()}`;
    window.location.href =
      `https://checkout.paystack.com/pay?key=${PAYSTACK_KEY}&email=${encodeURIComponent(email)}&amount=${amountKobo}&currency=GHS&ref=${ref}`;
  }
};

// ── FALLBACK STATION DATA (used when Supabase not connected) ──
const FALLBACK_STATIONS = [
  { id:1, name:"Accra Central",  bays:6, open:6, solar:85, hydrogen:15, time:"23m", lat:"38%", lng:"54%" },
  { id:2, name:"Kumasi Hub",     bays:4, open:3, solar:90, hydrogen:10, time:"12m", lat:"26%", lng:"37%" },
  { id:3, name:"Tema Station",   bays:8, open:8, solar:75, hydrogen:25, time:"8m",  lat:"50%", lng:"68%" },
  { id:4, name:"Takoradi",       bays:3, open:2, solar:80, hydrogen:20, time:"31m", lat:"22%", lng:"58%" },
  { id:5, name:"Tamale North",   bays:5, open:5, solar:95, hydrogen:5,  time:"45m", lat:"17%", lng:"24%" },
  { id:6, name:"Sunyani East",   bays:2, open:1, solar:70, hydrogen:30, time:"19m", lat:"42%", lng:"19%" },
  { id:7, name:"Cape Coast",     bays:6, open:6, solar:88, hydrogen:12, time:"27m", lat:"72%", lng:"52%" },
  { id:8, name:"Ho District",    bays:4, open:3, solar:82, hydrogen:18, time:"15m", lat:"68%", lng:"74%" },
];

const VEHICLES = [
  { type:"Car",      price:"GH₵140–210", emoji:"🚗", desc:"Full EV sedan charging" },
  { type:"Scooter",  price:"GH₵8–15",    emoji:"🛵", desc:"Light 2-wheeler charge"  },
  { type:"Tricycle", price:"GH₵18–28",   emoji:"🛺", desc:"3-wheel cargo vehicle"   },
];

// ── THEME ─────────────────────────────────────────────────────
const T = {
  bg:"#0f1117", card:"#1a1d27", border:"#2a2d3a",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24",
};

// ── GLOBAL CSS ────────────────────────────────────────────────
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  html, body, #root { height: 100%; }
  body { font-family: 'Inter', sans-serif; background: #060810; }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  .fade  { animation: fadeUp 0.38s ease both; }
  .fade1 { animation: fadeUp 0.38s ease 0.07s both; }
  .fade2 { animation: fadeUp 0.38s ease 0.14s both; }
  .fade3 { animation: fadeUp 0.38s ease 0.21s both; }
  .row-card { transition: background 0.15s; cursor:pointer; }
  .row-card:hover { background: #21253a !important; }
  .pin-btn  { transition: filter 0.2s, transform 0.2s; }
  .pin-btn:hover {
    filter: drop-shadow(0 4px 12px rgba(74,222,128,0.8));
    transform: translate(-50%,-105%);
  }
  .nav-btn  { transition: color 0.15s; }
  ::-webkit-scrollbar { width:0; }
`;

// ── SHARED COMPONENTS ─────────────────────────────────────────

const Badge = ({ children, color = T.green }) => (
  <span style={{ background:`${color}22`, color, fontSize:10, fontWeight:700,
    borderRadius:6, padding:"2px 7px", border:`1px solid ${color}44` }}>
    {children}
  </span>
);

const Ring = ({ pct, size=80, stroke=7, color=T.green, trackColor="#1f2d1f", children }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center" }}>
        {children}
      </div>
    </div>
  );
};

const Divider = () => <div style={{ height:1, background:T.border, margin:"10px 0 12px" }}/>;

const NavBar = ({ active, go }) => {
  const items = [
    { label:"Home",     screen:"dashboard",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> },
    { label:"Map",      screen:"home",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg> },
    { label:"Stations", screen:"detail",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 15H6v-4h6v4zm0-6H6V5h6v4z"/></svg> },
    { label:"Profile",  screen:"dashboard",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> },
  ];
  return (
    <div style={{ display:"flex", justifyContent:"space-around", padding:"10px 0 18px",
      borderTop:`1px solid ${T.border}`, background:T.bg, flexShrink:0 }}>
      {items.map(({ label, screen, icon }) => (
        <button key={label} className="nav-btn" onClick={() => go(screen)}
          style={{ background:"none", border:"none", cursor:"pointer", display:"flex",
            flexDirection:"column", alignItems:"center", gap:3,
            color: active===label ? T.green : T.muted,
            fontSize:10, fontWeight: active===label ? 700 : 500, fontFamily:"inherit" }}>
          {icon(active===label)}
          {label}
          {active===label && <div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
        </button>
      ))}
    </div>
  );
};

// ── SCREEN 1 — Dashboard ──────────────────────────────────────

function Dashboard({ go, stats }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:T.bg }}>
      {/* Header */}
      <div style={{ padding:"12px 18px 14px", display:"flex", justifyContent:"space-between",
        alignItems:"center", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:10,
            background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⚡</div>
          <div>
            <div style={{ fontWeight:800,fontSize:16,color:T.text }}>EcoCharge Ghana</div>
            <div style={{ fontSize:10,color:T.muted }}>Solar · Clean Water · Zero Emissions</div>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:T.card,
            border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={T.mutedLight}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          </div>
          <div style={{ position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",
            background:"#ef4444",fontSize:9,fontWeight:800,color:"white",
            display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${T.bg}` }}>2</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 0" }}>
        {/* Revenue banner */}
        <div className="fade" style={{ background:"linear-gradient(135deg,#0d2218,#112b1a)",
          borderRadius:16, padding:"14px 16px", marginBottom:12,
          border:`1px solid ${T.greenDim}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Project Revenue · Today</div>
              <div style={{ fontWeight:800,fontSize:26,color:T.text,letterSpacing:-0.5 }}>
                ${stats.revenue.toLocaleString()}
                <span style={{ fontSize:12,fontWeight:600,color:T.green,marginLeft:8 }}>↑ +12.4%</span>
              </div>
            </div>
            <Badge color={T.green}>LIVE</Badge>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:14 }}>
            {[
              { label:"Energy Output", value:"6.4 MWh",   sub:"Solar & Wind", color:T.yellow },
              { label:"Fresh Water",   value:"46,300 L",  sub:"This Month",   color:T.blue   },
              { label:"CO₂ Saved",     value:"8.2 t",     sub:"This Month",   color:T.green  },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 10px" }}>
                <div style={{ fontSize:9,color:T.muted,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontWeight:800,fontSize:15,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* EV Charging */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={T.yellow}><path d="M13 2L4.09 12.97H11L10 22L20.91 11.03H14L13 2Z"/></svg>
              <span style={{ fontWeight:700,fontSize:15,color:T.text }}>EV Charging</span>
              <Badge color={T.green}>{stats.stationsOnline}/5 Online</Badge>
            </div>
            <div style={{ fontSize:13,color:T.mutedLight,marginBottom:3 }}>Energy Stored: <strong style={{ color:T.text }}>22.8 MWh</strong></div>
            <div style={{ fontSize:13,color:T.mutedLight }}>Avg wait: <strong style={{ color:T.green }}>18 min</strong></div>
          </div>
          <Ring pct={78} size={76} color={T.green} trackColor="#1f2d1f">
            <span style={{ fontWeight:800,fontSize:18,color:T.green }}>78%</span>
            <span style={{ fontSize:9,color:T.muted }}>capacity</span>
          </Ring>
        </div>

        {/* Water */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={T.blue}><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z"/></svg>
              <span style={{ fontWeight:700,fontSize:15,color:T.text }}>Water Production</span>
              <Badge color={T.blue}>2/2 Active</Badge>
            </div>
            <div style={{ fontSize:13,color:T.mutedLight,marginBottom:3 }}>Produced: <strong style={{ color:T.text }}>234,000 L</strong></div>
            <div style={{ fontSize:13,color:T.mutedLight }}>Distributed: <strong style={{ color:T.blue }}>207,000 L</strong></div>
          </div>
          <Ring pct={100} size={76} color={T.blue} trackColor="#0c1e30">
            <span style={{ fontWeight:800,fontSize:18,color:T.blue }}>100%</span>
            <span style={{ fontSize:9,color:T.muted }}>units up</span>
          </Ring>
        </div>

        {/* Impact grid */}
        <div className="fade3">
          <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:0.5,
            textTransform:"uppercase",marginBottom:8 }}>Impact Metrics</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
            {[
              { emoji:"⛽", label:"Active Stations",    value:stats.stationsOnline, screen:"detail" },
              { emoji:"🚗", label:"Cars Charged",       value:"275",                screen:"vehicles" },
              { emoji:"🚚", label:"Water Distributed",  value:"207k L",             screen:null },
              { emoji:"👩‍🔧", label:"Female Technicians", value:"8",                  screen:null },
            ].map((m,i)=>(
              <div key={i} className="row-card" onClick={()=> m.screen && go(m.screen)}
                style={{ background:T.card,borderRadius:12,padding:"12px",
                  border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:24 }}>{m.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10,color:T.muted }}>{m.label}</div>
                  <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{m.value}</div>
                </div>
                {m.screen && <svg width="14" height="14" viewBox="0 0 24 24" fill={T.border}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>}
              </div>
            ))}
          </div>
          <button onClick={()=>go("home")}
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:14,padding:"14px",fontSize:14,fontWeight:700,
              color:"#000",cursor:"pointer",marginBottom:16,fontFamily:"inherit" }}>
            View Live Map →
          </button>
        </div>
      </div>

      <NavBar active="Home" go={go}/>
    </div>
  );
}

// ── SCREEN 2 — Map ────────────────────────────────────────────

function MapScreen({ go, stations, setStation }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"12px 18px 10px",display:"flex",justifyContent:"space-between",
        alignItems:"center",flexShrink:0 }}>
        <span style={{ fontSize:22,color:T.muted }}>☰</span>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>EcoChargeCar</div>
          <div style={{ fontSize:10,color:T.muted }}>Solar Charging · Clean Water · Zero Emissions</div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill={T.muted}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>

      <div style={{ flex:1,position:"relative",margin:"0 12px 12px",borderRadius:18,
        overflow:"hidden",background:"#131a2e" }}>
        <svg width="100%" height="100%" style={{ position:"absolute",inset:0 }} preserveAspectRatio="none">
          <defs>
            <radialGradient id="mg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1e2d4d"/>
              <stop offset="100%" stopColor="#0c1120"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mg)"/>
          {["M5 35 Q30 28 60 40 Q80 48 95 35","M10 55 Q35 45 65 58 Q82 64 95 52",
            "M0 20 Q25 18 50 25 Q70 30 100 22","M20 70 Q45 65 70 72 Q85 76 100 68",
            "M30 10 Q32 40 28 70 Q26 85 30 95","M55 5 Q58 35 54 65 Q52 82 56 98",
            "M70 8 Q73 38 69 68","M15 5 Q18 30 14 55"].map((d,i)=>(
            <path key={i} d={d} stroke="#2a3f6e" strokeWidth={i%3===0?2:1.2} fill="none"
              vectorEffect="non-scaling-stroke" transform="scale(4,4)" opacity={0.6}/>
          ))}
        </svg>

        <div style={{ position:"absolute",top:12,left:14,color:T.text,fontWeight:700,
          fontSize:15,textShadow:"0 1px 6px #000" }}>Greater Accra</div>
        <div style={{ position:"absolute",top:12,right:12,background:T.card,borderRadius:10,
          padding:"6px 10px",fontSize:11,color:T.green,fontWeight:600,border:`1px solid ${T.border}` }}>
          {stations.length} stations
        </div>

        {stations.map(s=>(
          <button key={s.id} className="pin-btn"
            onClick={()=>{ setStation(s); go("detail"); }}
            style={{ position:"absolute",top:s.lat,left:s.lng,background:"none",border:"none",
              cursor:"pointer",transform:"translate(-50%,-100%)" }}>
            <svg width="26" height="34" viewBox="0 0 26 34">
              <path d="M13 0C5.82 0 0 5.82 0 13c0 8.67 13 21 13 21S26 21.67 26 13C26 5.82 20.18 0 13 0z" fill={T.green}/>
              <circle cx="13" cy="13" r="6" fill="#0f1117"/>
              <path d="M13 6.5l-3.5 4.5h2.5l-1 4.5 4.5-5.5h-2.5L13 6.5z" fill={T.green}/>
            </svg>
          </button>
        ))}

        <button onClick={()=>go("detail")}
          style={{ position:"absolute",bottom:14,right:14,background:T.green,border:"none",
            borderRadius:12,padding:"10px 14px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer" }}>
          View All
        </button>
      </div>

      <NavBar active="Map" go={go}/>
    </div>
  );
}

// ── SCREEN 3 — Station Detail ─────────────────────────────────

function DetailScreen({ go, station, stations, setStation }) {
  const s = station || stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"12px 18px 10px",display:"flex",alignItems:"center",gap:10,
        borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <button onClick={()=>go("home")} style={{ background:"none",border:"none",color:T.text,fontSize:22,cursor:"pointer" }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:16,color:T.text }}>{s.name}</div>
          <div style={{ fontSize:10,color:T.muted }}>Solar Water Charging · Zero Emissions</div>
        </div>
        <Badge color={T.green}>{s.open}/{s.bays} Open</Badge>
      </div>

      <div style={{ margin:"12px 12px 0",borderRadius:16,overflow:"hidden",height:140,
        background:"linear-gradient(135deg,#0d1f0d,#091a14)",
        display:"flex",alignItems:"center",justifyContent:"center",gap:20,
        position:"relative",flexShrink:0 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:44 }}>⚡</div>
          <div style={{ fontSize:11,color:T.green,fontWeight:600 }}>{s.solar}% Solar</div>
        </div>
        <div style={{ width:1,height:55,background:T.border }}/>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:44 }}>🔋</div>
          <div style={{ fontSize:11,color:T.blue,fontWeight:600 }}>{s.hydrogen}% Hydrogen</div>
        </div>
        <div style={{ position:"absolute",top:10,right:12 }}>
          <Ring pct={s.solar} size={54} stroke={5} color={T.green} trackColor="#1f2d1f">
            <span style={{ fontSize:11,fontWeight:800,color:T.green }}>{s.time}</span>
          </Ring>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[
            { label:"Bays Open",  value:`${s.open}/${s.bays}`, color:T.green  },
            { label:"Est. Wait",  value:s.time,                 color:T.yellow },
            { label:"Solar Mix",  value:`${s.solar}%`,          color:T.blue   },
          ].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"10px",
              border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontSize:9,color:T.muted,marginBottom:4 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:16,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:T.card,borderRadius:14,padding:"12px 14px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ fontSize:12,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% Hydrogen</span>
          </div>
          <div style={{ height:6,borderRadius:3,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,
              background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:3 }}/>
          </div>
        </div>

        <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:0.5,
          textTransform:"uppercase",marginBottom:8 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="row-card" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#1f2d1f":T.card,
              border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,
              borderRadius:12,padding:"11px 14px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:600,color:T.text,fontSize:14 }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{st.bays} bays · {st.solar}% Solar</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); setStation(st); go("vehicles"); }}
                style={{ background:T.green,border:"none",borderRadius:8,padding:"5px 11px",
                  fontSize:11,fontWeight:700,color:"#000",cursor:"pointer" }}>Select</button>
            </div>
          </div>
        ))}
        <div style={{ height:16 }}/>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── SCREEN 4 — Vehicle Selection ──────────────────────────────

function VehicleScreen({ go }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"12px 18px 10px",display:"flex",alignItems:"center",gap:10,
        borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <button onClick={()=>go("detail")} style={{ background:"none",border:"none",color:T.text,fontSize:22,cursor:"pointer" }}>‹</button>
        <div>
          <div style={{ fontWeight:700,fontSize:16,color:T.text }}>Vehicle Selection</div>
          <div style={{ fontSize:10,color:T.muted }}>Choose your vehicle type</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map(v=>(
          <div key={v.type} className="row-card" onClick={()=>setSelected(v.type)}
            style={{ background:selected===v.type?"#1a2d1a":T.card,
              border:`1px solid ${selected===v.type?T.green:T.border}`,
              borderRadius:16,padding:"16px 18px",marginBottom:12,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700,fontSize:17,color:T.text }}>{v.type}</div>
              <div style={{ color:T.muted,fontSize:12,marginTop:2 }}>{v.desc}</div>
              <div style={{ fontWeight:800,fontSize:16,color:T.green,marginTop:6 }}>{v.price}</div>
            </div>
            <div style={{ fontSize:50 }}>{v.emoji}</div>
          </div>
        ))}

        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",
          border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Bundle includes</div>
          <div style={{ fontSize:13,color:T.text,fontWeight:600,marginBottom:4 }}>⚡ Full vehicle charge</div>
          <div style={{ fontSize:13,color:T.blue,fontWeight:600 }}>💧 20L Clean Desalinated Water</div>
        </div>

        <button onClick={()=>go("payment")} disabled={!selected}
          style={{ width:"100%",
            background: selected?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:selected?"#000":T.muted,cursor:selected?"pointer":"not-allowed",
            marginBottom:16,fontFamily:"inherit",transition:"all 0.2s" }}>
          {selected?`Continue with ${selected} →`:"Select a vehicle to continue"}
        </button>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── SCREEN 5 — Payment ────────────────────────────────────────

function PaymentScreen({ go }) {
  const [method, setMethod]   = useState("mtn");
  const [email,  setEmail]    = useState("");
  const [paying, setPaying]   = useState(false);
  const [paid,   setPaid]     = useState(false);
  const [error,  setError]    = useState("");

  const AMOUNT = 165;

  const handlePay = async () => {
    if (!email || !email.includes("@")) { setError("Please enter a valid email"); return; }
    setError("");
    setPaying(true);

    // If Paystack key exists, use Paystack
    if (PAYSTACK_KEY) {
      payWithPaystack({
        email,
        amountGHS: AMOUNT,
        onSuccess: async (res) => {
          // Save transaction to Supabase if connected
          if (SUPABASE_URL) {
            await sb("payments", {
              method: "POST",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({
                reference: res.reference,
                amount: AMOUNT,
                email,
                method,
                status: "success",
                created_at: new Date().toISOString(),
              }),
            });
          }
          setPaid(true);
          setPaying(false);
        },
        onClose: () => setPaying(false),
      });
    } else {
      // Demo mode — simulate success after 1.5s
      setTimeout(() => { setPaid(true); setPaying(false); }, 1500);
    }
  };

  const methods = [
    { id:"mtn",      label:"MTN Mobile Money", icon:"🟡" },
    { id:"vodafone", label:"Vodafone Cash",     icon:"🔴" },
    { id:"airtel",   label:"AirtelTigo Cash",   icon:"🔵" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"12px 18px 10px",display:"flex",alignItems:"center",gap:10,
        borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <button onClick={()=>go("vehicles")} style={{ background:"none",border:"none",color:T.text,fontSize:22,cursor:"pointer" }}>‹</button>
        <div>
          <div style={{ fontWeight:700,fontSize:16,color:T.text }}>Payment</div>
          <div style={{ fontSize:10,color:T.muted }}>Secure checkout via Paystack</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        {/* Order summary */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Order Summary</div>
          <Divider/>
          {[
            { label:"Solar Charging (Full)", value:"GH₵150", color:T.green },
            { label:"Clean Water Bundle 20L", value:"GH₵15", color:T.blue  },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:r.color,fontWeight:700,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text }}>Total</span>
            <span style={{ fontWeight:800,fontSize:20,color:T.green }}>GH₵{AMOUNT}</span>
          </div>
        </div>

        {/* Email input */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600 }}>Email for receipt</div>
          <input
            type="email" placeholder="you@example.com" value={email}
            onChange={e=>setEmail(e.target.value)}
            style={{ width:"100%",background:"#0f1117",border:`1px solid ${T.border}`,borderRadius:10,
              padding:"10px 12px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none" }}/>
        </div>

        {/* Mobile money */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Mobile Money</div>
          {methods.map(m=>(
            <div key={m.id} className="row-card" onClick={()=>setMethod(m.id)}
              style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 12px",
                borderRadius:12,marginBottom:8,cursor:"pointer",
                background:method===m.id?"#1a2d1a":"transparent",
                border:`1px solid ${method===m.id?T.greenDim:T.border}` }}>
              <span style={{ fontSize:22 }}>{m.icon}</span>
              <span style={{ flex:1,color:T.text,fontSize:14,fontWeight:500 }}>{m.label}</span>
              <div style={{ width:20,height:20,borderRadius:"50%",
                border:`2px solid ${method===m.id?T.green:T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {method===m.id && <div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ color:"#f87171",fontSize:12,marginBottom:8,textAlign:"center" }}>{error}</div>}

        {!paid ? (
          <button onClick={handlePay} disabled={paying}
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:14,padding:"15px",fontSize:16,fontWeight:800,
              color:"#000",cursor:paying?"not-allowed":"pointer",marginBottom:8,
              fontFamily:"inherit",opacity:paying?0.7:1 }}>
            {paying ? "Processing…" : `Pay GH₵${AMOUNT}`}
          </button>
        ) : (
          <div style={{ background:"#0d2218",border:`1px solid ${T.greenDim}`,borderRadius:14,
            padding:22,textAlign:"center",marginBottom:8 }}>
            <div style={{ fontSize:40,marginBottom:10 }}>✅</div>
            <div style={{ color:T.green,fontWeight:800,fontSize:17,marginBottom:4 }}>Payment Successful!</div>
            <div style={{ color:T.muted,fontSize:12 }}>Session starting · Bay 3 assigned.</div>
          </div>
        )}

        {/* Impact */}
        <div style={{ background:T.card,borderRadius:14,padding:"12px 16px",marginBottom:16,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,marginBottom:2 }}>Your Impact Today</div>
              <div style={{ fontWeight:800,fontSize:15,color:T.green }}>🌿 Saved ~3.2 kg CO₂</div>
            </div>
            <div style={{ fontSize:11,color:T.blue }}>💧 20L water</div>
          </div>
        </div>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────

export default function App() {
  const [screen,  setScreen]  = useState("dashboard");
  const [station, setStation] = useState(null);
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [stats,   setStats]   = useState({ revenue:16200, stationsOnline:3 });

  // Load stations from Supabase if configured
  useEffect(() => {
    if (!SUPABASE_URL) return;
    sb("stations?select=*&order=id").then(data => {
      if (data && data.length) setStations(data);
    });
    sb("dashboard_stats?select=*&limit=1").then(data => {
      if (data && data[0]) setStats(data[0]);
    });

    // Inject Paystack script
    if (PAYSTACK_KEY && !window.PaystackPop) {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      document.head.appendChild(s);
    }
  }, []);

  const go = (s) => setScreen(s);

  const views = {
    dashboard: <Dashboard   go={go} stats={stats} />,
    home:      <MapScreen   go={go} stations={stations} setStation={setStation} />,
    detail:    <DetailScreen go={go} station={station||stations[0]} stations={stations} setStation={setStation} />,
    vehicles:  <VehicleScreen go={go} />,
    payment:   <PaymentScreen go={go} />,
  };

  return (
    <>
      <style>{globalCss}</style>
      {views[screen] || views.dashboard}
    </>
  );
}
