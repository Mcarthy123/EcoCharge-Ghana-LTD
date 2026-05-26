// ============================================================
//  EcoChargeCar — App.jsx  (User-facing version)
//  Paste this into src/App.jsx on GitHub
// ============================================================

import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────
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

// ── THEME ─────────────────────────────────────────────────────
const T = {
  bg:"#0f1117", card:"#1a1d27", border:"#2a2d3a",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
};

// ── REAL PHOTO URLS (Unsplash) ────────────────────────────────
const PHOTOS = {
  car:      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80",
  scooter:  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  tricycle: "https://images.unsplash.com/photo-1597762117709-859f744b84c3?w=600&q=80",
  station1: "https://images.unsplash.com/photo-1647166545674-e6e87e0ac24a?w=600&q=80",
  station2: "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=600&q=80",
  hero:     "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80",
};

// ── STATION DATA ──────────────────────────────────────────────
const FALLBACK_STATIONS = [
  { id:1, name:"Accra Central",  bays:6, open:6, solar:85, hydrogen:15, time:"23m", lat:"38%", lng:"54%", city:"Accra" },
  { id:2, name:"Kumasi Hub",     bays:4, open:3, solar:90, hydrogen:10, time:"12m", lat:"26%", lng:"37%", city:"Kumasi" },
  { id:3, name:"Tema Station",   bays:8, open:8, solar:75, hydrogen:25, time:"8m",  lat:"50%", lng:"68%", city:"Tema" },
  { id:4, name:"Takoradi",       bays:3, open:2, solar:80, hydrogen:20, time:"31m", lat:"22%", lng:"58%", city:"Takoradi" },
  { id:5, name:"Tamale North",   bays:5, open:5, solar:95, hydrogen:5,  time:"45m", lat:"17%", lng:"24%", city:"Tamale" },
  { id:6, name:"Sunyani East",   bays:2, open:1, solar:70, hydrogen:30, time:"19m", lat:"42%", lng:"19%", city:"Sunyani" },
  { id:7, name:"Cape Coast",     bays:6, open:6, solar:88, hydrogen:12, time:"27m", lat:"72%", lng:"52%", city:"Cape Coast" },
  { id:8, name:"Ho District",    bays:4, open:3, solar:82, hydrogen:18, time:"15m", lat:"68%", lng:"74%", city:"Ho" },
];

const VEHICLES = [
  { type:"Car",      price:"GH₵140–210", amount:175, desc:"Full EV sedan charging", img: PHOTOS.car },
  { type:"Scooter",  price:"GH₵8–15",   amount:12,  desc:"Light 2-wheeler charge",  img: PHOTOS.scooter },
  { type:"Tricycle", price:"GH₵18–28",  amount:23,  desc:"3-wheel cargo vehicle",   img: PHOTOS.tricycle },
];

// ── GLOBAL CSS ────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { height:100%; }
  body { font-family:'Inter',sans-serif; background:#060810; overflow-x:hidden; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .fade  { animation:fadeUp 0.35s ease both; }
  .fade1 { animation:fadeUp 0.35s ease 0.06s both; }
  .fade2 { animation:fadeUp 0.35s ease 0.12s both; }
  .fade3 { animation:fadeUp 0.35s ease 0.18s both; }
  .slide-in { animation:slideIn 0.3s cubic-bezier(.4,0,.2,1) both; }
  .overlay  { animation:overlayIn 0.3s ease both; }
  .tappable { transition:opacity 0.15s, transform 0.15s; cursor:pointer; }
  .tappable:active { opacity:0.75; transform:scale(0.97); }
  .row-card { transition:background 0.15s; cursor:pointer; }
  .row-card:hover { background:#21253a !important; }
  .pin-btn { transition:filter 0.2s,transform 0.2s; cursor:pointer; }
  .pin-btn:hover { filter:drop-shadow(0 4px 14px rgba(74,222,128,0.85)); transform:translate(-50%,-108%); }
  input { outline:none; }
  input::placeholder { color:#4b5563; }
  ::-webkit-scrollbar { width:0; }
`;

// ── SHARED ────────────────────────────────────────────────────

const Badge = ({ children, color=T.green }) => (
  <span style={{ background:`${color}22`,color,fontSize:10,fontWeight:700,
    borderRadius:6,padding:"2px 8px",border:`1px solid ${color}44` }}>
    {children}
  </span>
);

const Ring = ({ pct, size=76, stroke=7, color=T.green, track="#1a2d1a", children }) => {
  const r=(size-stroke)/2, c=2*Math.PI*r;
  return (
    <div style={{ position:"relative",width:size,height:size,flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c*(1-pct/100)} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center" }}>{children}</div>
    </div>
  );
};

// ── LOGO SVG (EcoCharge brand colors) ────────────────────────
const Logo = ({ size=32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e"/>
        <stop offset="100%" stopColor="#15803d"/>
      </linearGradient>
      <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8"/>
        <stop offset="100%" stopColor="#1e40af"/>
      </linearGradient>
    </defs>
    {/* E */}
    <rect x="8" y="20" width="28" height="7" rx="2" fill="url(#lg1)"/>
    <rect x="8" y="33" width="20" height="7" rx="2" fill="url(#lg1)"/>
    <rect x="8" y="46" width="28" height="7" rx="2" fill="url(#lg1)"/>
    <rect x="8" y="59" width="20" height="7" rx="2" fill="url(#lg1)"/>
    <rect x="8" y="72" width="28" height="7" rx="2" fill="url(#lg1)"/>
    {/* G arc */}
    <path d="M55 20 A28 28 0 1 1 55 80 L55 55 L75 55 L75 48 L48 48 L48 80" 
      fill="none" stroke="url(#lg2)" strokeWidth="8" strokeLinecap="round"/>
    {/* Lightning bolt */}
    <path d="M62 28 L52 52 L60 52 L50 76 L70 46 L61 46 Z" fill="url(#lg2)"/>
  </svg>
);

// ── HAMBURGER DRAWER ──────────────────────────────────────────
const Drawer = ({ open, onClose, go, user, onLogout }) => (
  <>
    {open && (
      <div className="overlay" onClick={onClose}
        style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:100 }}/>
    )}
    <div className={open?"slide-in":""}
      style={{ position:"fixed",top:0,left:0,height:"100%",width:280,
        background:T.card,zIndex:101,borderRight:`1px solid ${T.border}`,
        transform:open?"translateX(0)":"translateX(-100%)",
        transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",
        display:"flex",flexDirection:"column" }}>

      {/* Drawer header */}
      <div style={{ padding:"48px 20px 20px",
        background:"linear-gradient(135deg,#0d2218,#112b1a)",
        borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <Logo size={44}/>
          <div>
            <div style={{ fontWeight:800,fontSize:17,color:T.text }}>EcoCharge</div>
            <div style={{ fontSize:10,color:T.muted }}>Ghana · Clean Energy</div>
          </div>
        </div>
        {user
          ? <div style={{ background:"rgba(74,222,128,0.08)",borderRadius:10,padding:"10px 12px",
              border:`1px solid ${T.greenDim}` }}>
              <div style={{ fontSize:12,color:T.muted }}>Signed in as</div>
              <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2 }}>{user.email}</div>
            </div>
          : <button onClick={()=>{ go("auth"); onClose(); }} className="tappable"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,
                color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Sign In / Register
            </button>
        }
      </div>

      {/* Menu items */}
      <div style={{ flex:1,padding:"12px 0",overflowY:"auto" }}>
        {[
          { icon:"🗺️", label:"Find Stations", screen:"home" },
          { icon:"⚡", label:"Station List",  screen:"detail" },
          { icon:"👤", label:"My Profile",    screen:"profile" },
          { icon:"📋", label:"My Bookings",   screen:"bookings" },
          { icon:"💧", label:"Water Info",    screen:"home" },
          { icon:"ℹ️",  label:"About EcoCharge", screen:"about" },
        ].map(item=>(
          <div key={item.label} className="tappable row-card"
            onClick={()=>{ go(item.screen); onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 20px",
              borderBottom:`1px solid ${T.border}20` }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ color:T.text,fontSize:14,fontWeight:500 }}>{item.label}</span>
            <svg style={{ marginLeft:"auto" }} width="14" height="14" viewBox="0 0 24 24" fill={T.muted}>
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Logout */}
      {user && (
        <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>{ onLogout(); onClose(); }} className="tappable"
            style={{ width:"100%",background:"rgba(248,113,113,0.1)",border:`1px solid ${T.red}44`,
              borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,
              color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  </>
);

// ── NAV BAR ───────────────────────────────────────────────────
const NavBar = ({ active, go }) => {
  const items = [
    { label:"Home", screen:"home",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> },
    { label:"Stations", screen:"detail",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 15H6v-4h6v4zm0-6H6V5h6v4z"/></svg> },
    { label:"Profile", screen:"profile",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> },
    { label:"More", screen:"about",
      icon:(a)=><svg width="20" height="20" viewBox="0 0 24 24" fill={a?T.green:T.muted}><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg> },
  ];
  return (
    <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 20px",
      borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0 }}>
      {items.map(({ label, screen, icon })=>(
        <button key={label} onClick={()=>go(screen)}
          style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
            flexDirection:"column",alignItems:"center",gap:3,
            color:active===label?T.green:T.muted,fontSize:10,
            fontWeight:active===label?700:500,fontFamily:"inherit" }}>
          {icon(active===label)}
          {label}
          {active===label && <div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
        </button>
      ))}
    </div>
  );
};

// ── HEADER ────────────────────────────────────────────────────
const Header = ({ title, subtitle, onMenu, onBack, go }) => (
  <div style={{ padding:"12px 18px 12px",display:"flex",alignItems:"center",gap:12,
    borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} style={{ background:"none",border:"none",color:T.text,fontSize:24,cursor:"pointer",lineHeight:1 }}>‹</button>
      : <button onClick={onMenu} className="tappable"
          style={{ background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",gap:4,padding:4 }}>
          <div style={{ width:20,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:16,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:20,height:2,background:T.mutedLight,borderRadius:1 }}/>
        </button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{title}</div>
      {subtitle && <div style={{ fontSize:10,color:T.muted }}>{subtitle}</div>}
    </div>
    <Logo size={30}/>
  </div>
);

// ── SCREEN: Map / Home ────────────────────────────────────────
function HomeScreen({ go, stations, setStation, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="EcoChargeCar" subtitle="Find a charging station near you" onMenu={onMenu}/>

      {/* Map */}
      <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,overflow:"hidden",background:"#131a2e" }}>
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
            "M30 10 Q32 40 28 70","M55 5 Q58 35 54 65 Q52 82 56 98",
            "M70 8 Q73 38 69 68","M15 5 Q18 30 14 55"].map((d,i)=>(
            <path key={i} d={d} stroke="#2a3f6e" strokeWidth={i%3===0?2:1.2}
              fill="none" vectorEffect="non-scaling-stroke" transform="scale(4,4)" opacity={0.6}/>
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
            style={{ position:"absolute",top:s.lat,left:s.lng,background:"none",
              border:"none",transform:"translate(-50%,-100%)" }}>
            <svg width="28" height="36" viewBox="0 0 28 36">
              <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={T.green}/>
              <circle cx="14" cy="14" r="6" fill="#0f1117"/>
              <path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill={T.green}/>
            </svg>
          </button>
        ))}

        {/* Station preview cards at bottom */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,
          background:"linear-gradient(0deg,rgba(15,17,23,0.98) 0%,transparent 100%)",
          padding:"20px 12px 12px" }}>
          <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:2 }}>
            {stations.slice(0,4).map(s=>(
              <div key={s.id} className="tappable"
                onClick={()=>{ setStation(s); go("detail"); }}
                style={{ background:T.card,borderRadius:12,padding:"10px 12px",
                  border:`1px solid ${T.border}`,flexShrink:0,minWidth:140 }}>
                <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:10,color:T.green }}>{s.open}/{s.bays} bays open</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>⏱ {s.time} wait</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavBar active="Home" go={go}/>
    </div>
  );
}

// ── SCREEN: Station Detail ────────────────────────────────────
function DetailScreen({ go, station, stations, setStation, onMenu }) {
  const s = station || stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} subtitle={`${s.city} · Solar & Hydrogen`}
        onBack={()=>go("home")} go={go}/>

      {/* Station photo */}
      <div style={{ margin:"12px 12px 0",borderRadius:16,overflow:"hidden",height:160,flexShrink:0 }}>
        <img src={PHOTOS.station1} alt="Charging Station"
          style={{ width:"100%",height:"100%",objectFit:"cover" }}
          onError={e=>{ e.target.src=PHOTOS.station2; }}/>
        <div style={{ position:"relative",marginTop:-50,
          background:"linear-gradient(0deg,rgba(15,17,23,1) 0%,transparent 100%)",height:50 }}/>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[
            { label:"Bays Open",  value:`${s.open}/${s.bays}`, color:T.green  },
            { label:"Est. Wait",  value:s.time,                 color:T.yellow },
            { label:"Solar",      value:`${s.solar}%`,          color:T.blue   },
          ].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"10px",
              border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontSize:9,color:T.muted,marginBottom:4 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:16,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>

        {/* Energy bar */}
        <div style={{ background:T.card,borderRadius:14,padding:"12px 14px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ fontSize:12,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% Hydrogen</span>
          </div>
          <div style={{ height:6,borderRadius:3,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,
              background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:3 }}/>
          </div>
        </div>

        {/* Select vehicle CTA */}
        <button onClick={()=>go("vehicles")} className="tappable"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:14,fontFamily:"inherit" }}>
          ⚡ Charge Here — Select Vehicle
        </button>

        {/* All stations list */}
        <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:0.5,
          textTransform:"uppercase",marginBottom:8 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="row-card" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#1a2d1a":T.card,
              border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,
              borderRadius:12,padding:"12px 14px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:600,color:T.text,fontSize:14 }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{st.city} · {st.bays} bays · {st.solar}% Solar</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); setStation(st); go("vehicles"); }}
                className="tappable"
                style={{ background:T.green,border:"none",borderRadius:8,padding:"6px 12px",
                  fontSize:11,fontWeight:700,color:"#000",cursor:"pointer" }}>
                Select
              </button>
            </div>
          </div>
        ))}
        <div style={{ height:16 }}/>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── SCREEN: Vehicle Selection ─────────────────────────────────
function VehicleScreen({ go, setVehicle }) {
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    setVehicle(selected);
    go("payment");
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" subtitle="Choose your vehicle type to charge"
        onBack={()=>go("detail")} go={go}/>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map(v=>(
          <div key={v.type} className="tappable"
            onClick={()=>setSelected(v)}
            style={{ background:selected?.type===v.type?"#1a2d1a":T.card,
              border:`2px solid ${selected?.type===v.type?T.green:T.border}`,
              borderRadius:18,marginBottom:14,overflow:"hidden",
              transition:"border-color 0.2s,background 0.2s" }}>
            {/* Real photo */}
            <div style={{ height:170,overflow:"hidden",position:"relative" }}>
              <img src={v.img} alt={v.type}
                style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              <div style={{ position:"absolute",inset:0,
                background:"linear-gradient(0deg,rgba(15,17,23,0.85) 0%,transparent 50%)" }}/>
              <div style={{ position:"absolute",bottom:12,left:14 }}>
                <div style={{ fontWeight:800,fontSize:20,color:T.text }}>{v.type}</div>
                <div style={{ fontSize:12,color:T.muted }}>{v.desc}</div>
              </div>
              {selected?.type===v.type && (
                <div style={{ position:"absolute",top:12,right:12,width:28,height:28,
                  borderRadius:"50%",background:T.green,display:"flex",
                  alignItems:"center",justifyContent:"center",fontSize:16 }}>✓</div>
              )}
            </div>
            <div style={{ padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:800,fontSize:18,color:T.green }}>{v.price}</div>
              <Badge color={T.blue}>+ 20L Water Bundle</Badge>
            </div>
          </div>
        ))}

        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",
          border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:6,fontWeight:600 }}>Every charge includes:</div>
          <div style={{ fontSize:13,color:T.text,marginBottom:4 }}>⚡ Full vehicle charge via solar energy</div>
          <div style={{ fontSize:13,color:T.blue }}>💧 20L Clean Desalinated Water free</div>
        </div>

        <button onClick={handleContinue} className="tappable"
          style={{ width:"100%",
            background:selected?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,
            border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
            color:selected?"#000":T.muted,cursor:selected?"pointer":"not-allowed",
            marginBottom:16,fontFamily:"inherit",transition:"all 0.2s" }}>
          {selected?`Continue with ${selected.type} →`:"Select a vehicle to continue"}
        </button>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── SCREEN: Payment ───────────────────────────────────────────
function PaymentScreen({ go, vehicle, station }) {
  const [method,  setMethod]  = useState("mtn");
  const [email,   setEmail]   = useState("");
  const [paying,  setPaying]  = useState(false);
  const [paid,    setPaid]    = useState(false);
  const [error,   setError]   = useState("");
  const scriptLoaded = useRef(false);

  const amount = vehicle?.amount || 175;
  const s = station || FALLBACK_STATIONS[0];

  // Load Paystack script on mount
  useEffect(() => {
    if (scriptLoaded.current) return;
    if (window.PaystackPop) { scriptLoaded.current = true; return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => { scriptLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  const handlePay = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address"); return;
    }
    setError("");
    setPaying(true);

    const amountPesewas = amount * 100;

    const doPaystack = () => {
      if (!window.PaystackPop) {
        setError("Payment system still loading, please try again in a second.");
        setPaying(false); return;
      }
      try {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_KEY || "pk_test_demo",
          email,
          amount: amountPesewas,
          currency: "GHS",
          ref: `ECO-${Date.now()}`,
          metadata: {
            vehicle: vehicle?.type,
            station: s.name,
            water_bundle: "20L",
          },
          callback: async (response) => {
            // Save to Supabase
            if (SUPABASE_URL) {
              await sb("payments", {
                method: "POST",
                headers: { Prefer:"return=minimal" },
                body: JSON.stringify({
                  reference: response.reference,
                  amount,
                  email,
                  vehicle: vehicle?.type,
                  station: s.name,
                  payment_method: method,
                  status: "success",
                  created_at: new Date().toISOString(),
                }),
              });
            }
            setPaid(true);
            setPaying(false);
          },
          onClose: () => {
            setPaying(false);
            setError("Payment cancelled. Try again.");
          },
        });
        handler.openIframe();
      } catch (err) {
        setError("Payment error. Please try again.");
        setPaying(false);
      }
    };

    // If no Paystack key (demo mode)
    if (!PAYSTACK_KEY) {
      setTimeout(() => { setPaid(true); setPaying(false); }, 1500);
      return;
    }

    // Wait for script if not ready yet
    if (!window.PaystackPop) {
      let attempts = 0;
      const wait = setInterval(() => {
        attempts++;
        if (window.PaystackPop) { clearInterval(wait); doPaystack(); }
        if (attempts > 20) { clearInterval(wait); setError("Payment system unavailable."); setPaying(false); }
      }, 300);
    } else {
      doPaystack();
    }
  };

  const methods = [
    { id:"mtn",      label:"MTN Mobile Money", icon:"🟡" },
    { id:"vodafone", label:"Vodafone Cash",     icon:"🔴" },
    { id:"airtel",   label:"AirtelTigo Cash",   icon:"🔵" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Payment" subtitle="Secure checkout via Paystack"
        onBack={()=>go("vehicles")} go={go}/>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        {/* Order summary */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Order Summary</div>
          <div style={{ height:1,background:T.border,marginBottom:10 }}/>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ color:T.muted,fontSize:13 }}>
              {vehicle?.type || "Vehicle"} Charging — {s.name}
            </span>
            <span style={{ color:T.green,fontWeight:700,fontSize:13 }}>GH₵{amount-5}</span>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ color:T.muted,fontSize:13 }}>Clean Water Bundle 20L</span>
            <span style={{ color:T.blue,fontWeight:700,fontSize:13 }}>GH₵5</span>
          </div>
          <div style={{ height:1,background:T.border,marginBottom:10 }}/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text }}>Total</span>
            <span style={{ fontWeight:800,fontSize:22,color:T.green }}>GH₵{amount}</span>
          </div>
        </div>

        {/* Email */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600 }}>
            Email address (for receipt)
          </div>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e=>{ setEmail(e.target.value); setError(""); }}
            style={{ width:"100%",background:"#0f1117",border:`1px solid ${error&&!email.includes("@")?T.red:T.border}`,
              borderRadius:10,padding:"11px 12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
        </div>

        {/* Mobile money */}
        <div style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Mobile Money</div>
          {methods.map(m=>(
            <div key={m.id} className="tappable row-card" onClick={()=>setMethod(m.id)}
              style={{ display:"flex",alignItems:"center",gap:12,padding:"12px",
                borderRadius:12,marginBottom:8,
                background:method===m.id?"#1a2d1a":"transparent",
                border:`1px solid ${method===m.id?T.greenDim:T.border}` }}>
              <span style={{ fontSize:24 }}>{m.icon}</span>
              <span style={{ flex:1,color:T.text,fontSize:14,fontWeight:500 }}>{m.label}</span>
              <div style={{ width:20,height:20,borderRadius:"50%",
                border:`2px solid ${method===m.id?T.green:T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {method===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:"rgba(248,113,113,0.1)",border:`1px solid ${T.red}44`,
            borderRadius:10,padding:"10px 14px",marginBottom:12,
            color:T.red,fontSize:12,fontWeight:500 }}>{error}</div>
        )}

        {!paid ? (
          <button onClick={handlePay} disabled={paying} className="tappable"
            style={{ width:"100%",
              background:paying?"#1a2d1a":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:paying?`1px solid ${T.greenDim}`:"none",
              borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
              color:paying?T.green:"#000",cursor:paying?"not-allowed":"pointer",
              marginBottom:12,fontFamily:"inherit",transition:"all 0.2s" }}>
            {paying ? "⏳ Opening Paystack…" : `Pay GH₵${amount} via Paystack`}
          </button>
        ) : (
          <div style={{ background:"#0d2218",border:`1px solid ${T.greenDim}`,
            borderRadius:16,padding:24,textAlign:"center",marginBottom:12 }}>
            <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
            <div style={{ color:T.green,fontWeight:800,fontSize:18,marginBottom:6 }}>
              Payment Successful!
            </div>
            <div style={{ color:T.mutedLight,fontSize:13,marginBottom:12 }}>
              Bay assigned · Session starting soon
            </div>
            <button onClick={()=>go("home")} className="tappable"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:700,
                color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Back to Map
            </button>
          </div>
        )}

        {/* Impact */}
        <div style={{ background:T.card,borderRadius:14,padding:"12px 16px",marginBottom:20,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Your Impact This Session</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontWeight:700,fontSize:14,color:T.green }}>🌿 ~3.2 kg CO₂ saved</div>
            <div style={{ fontSize:12,color:T.blue }}>💧 20L clean water</div>
          </div>
        </div>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── SCREEN: Profile ───────────────────────────────────────────
function ProfileScreen({ go, user, setUser, onMenu }) {
  const [mode,     setMode]     = useState("view"); // view | login | register
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const authFetch = async (endpoint, body) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
      method:"POST",
      headers:{ apikey:SUPABASE_ANON, "Content-Type":"application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const handleLogin = async () => {
    if (!email||!password) { setError("Enter email and password"); return; }
    setLoading(true); setError("");
    const data = await authFetch("token?grant_type=password", { email, password });
    if (data.access_token) {
      setUser({ email, token: data.access_token });
      setSuccess("Signed in successfully!");
      setMode("view");
    } else {
      setError(data.error_description || "Invalid credentials");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email||!password||!name) { setError("Fill in all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const data = await authFetch("signup", { email, password, data:{ full_name:name } });
    if (data.id || data.user) {
      setSuccess("Account created! Check your email to verify.");
      setMode("view");
    } else {
      setError(data.msg || data.error_description || "Registration failed");
    }
    setLoading(false);
  };

  // Demo mode (no Supabase)
  const demoLogin = () => {
    setUser({ email: email||"demo@ecocharge.gh", name:"Demo User" });
    setMode("view"); setSuccess("Signed in (demo mode)");
  };

  if (mode === "login" || mode === "register") {
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <Header title={mode==="login"?"Sign In":"Create Account"}
          subtitle="EcoCharge Ghana" onBack={()=>{ setMode("view"); setError(""); }} go={go}/>

        <div style={{ flex:1,overflowY:"auto",padding:"24px 20px 0" }}>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <Logo size={56}/>
            <div style={{ fontWeight:800,fontSize:20,color:T.text,marginTop:12 }}>EcoCharge Ghana</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>
              {mode==="login"?"Welcome back!":"Join the clean energy movement"}
            </div>
          </div>

          <div style={{ background:T.card,borderRadius:16,padding:"20px",border:`1px solid ${T.border}` }}>
            {mode==="register" && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Full Name</div>
                <input placeholder="Your full name" value={name}
                  onChange={e=>{ setName(e.target.value); setError(""); }}
                  style={{ width:"100%",background:"#0f1117",border:`1px solid ${T.border}`,
                    borderRadius:10,padding:"12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Email</div>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e=>{ setEmail(e.target.value); setError(""); }}
                style={{ width:"100%",background:"#0f1117",border:`1px solid ${T.border}`,
                  borderRadius:10,padding:"12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Password</div>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e=>{ setPassword(e.target.value); setError(""); }}
                style={{ width:"100%",background:"#0f1117",border:`1px solid ${T.border}`,
                  borderRadius:10,padding:"12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
            </div>

            {error && <div style={{ color:T.red,fontSize:12,marginBottom:12,textAlign:"center" }}>{error}</div>}

            <button onClick={SUPABASE_URL?(mode==="login"?handleLogin:handleRegister):demoLogin}
              disabled={loading} className="tappable"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
                color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:loading?0.7:1 }}>
              {loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}
            </button>
          </div>

          <div style={{ textAlign:"center",marginTop:20 }}>
            <span style={{ color:T.muted,fontSize:13 }}>
              {mode==="login"?"Don't have an account? ":"Already have an account? "}
            </span>
            <button onClick={()=>{ setMode(mode==="login"?"register":"login"); setError(""); }}
              style={{ background:"none",border:"none",color:T.green,
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              {mode==="login"?"Register":"Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" subtitle="Account & bookings" onMenu={onMenu} go={go}/>

      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        {success && (
          <div className="fade" style={{ background:"rgba(74,222,128,0.1)",border:`1px solid ${T.greenDim}`,
            borderRadius:12,padding:"10px 14px",marginBottom:14,color:T.green,fontSize:13 }}>
            {success}
          </div>
        )}

        {user ? (
          <>
            {/* User card */}
            <div className="fade" style={{ background:"linear-gradient(135deg,#0d2218,#112b1a)",
              borderRadius:18,padding:"20px",marginBottom:16,border:`1px solid ${T.greenDim}`,
              textAlign:"center" }}>
              <div style={{ width:64,height:64,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:28,margin:"0 auto 12px" }}>👤</div>
              <div style={{ fontWeight:800,fontSize:18,color:T.text }}>
                {user.name || user.email?.split("@")[0]}
              </div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{user.email}</div>
              <Badge color={T.green}>Active Member</Badge>
            </div>

            {/* Stats */}
            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",
              gap:10,marginBottom:14 }}>
              {[
                { label:"Total Charges", value:"0", color:T.green },
                { label:"CO₂ Saved",     value:"0 kg", color:T.blue },
                { label:"Water Received", value:"0 L", color:T.blue },
                { label:"Total Spent",   value:"GH₵0", color:T.yellow },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:12,
                  padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <button onClick={()=>{ setUser(null); setSuccess(""); }} className="tappable"
              style={{ width:"100%",background:"rgba(248,113,113,0.1)",
                border:`1px solid ${T.red}44`,borderRadius:12,padding:"13px",
                fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",
                fontFamily:"inherit",marginBottom:16 }}>
              Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"40px 20px" }}>
            <Logo size={64}/>
            <div style={{ fontWeight:800,fontSize:20,color:T.text,marginTop:16,marginBottom:8 }}>
              Sign in to EcoCharge
            </div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.6 }}>
              Track your charges, manage your bookings, and see your environmental impact.
            </div>
            <button onClick={()=>setMode("login")} className="tappable"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
                color:"#000",cursor:"pointer",fontFamily:"inherit",marginBottom:12 }}>
              Sign In
            </button>
            <button onClick={()=>setMode("register")} className="tappable"
              style={{ width:"100%",background:"transparent",
                border:`1px solid ${T.border}`,borderRadius:14,padding:"16px",
                fontSize:15,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit" }}>
              Create Account
            </button>
          </div>
        )}
      </div>

      <NavBar active="Profile" go={go}/>
    </div>
  );
}

// ── SCREEN: About ─────────────────────────────────────────────
function AboutScreen({ go, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="About EcoCharge" subtitle="Our mission" onMenu={onMenu} go={go}/>

      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <Logo size={72}/>
          <div style={{ fontWeight:800,fontSize:22,color:T.text,marginTop:14 }}>EcoCharge Ghana</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6,lineHeight:1.6 }}>
            Solar Charging · Clean Water · Zero Emissions
          </div>
        </div>

        {[
          { icon:"⚡", title:"Solar EV Charging", text:"100% solar-powered charging stations across Ghana. Fast, clean and affordable for all vehicle types." },
          { icon:"💧", title:"Clean Water Access", text:"Every charging session comes with 20L of clean desalinated water — addressing two needs at once." },
          { icon:"🌿", title:"Zero Emissions", text:"Our stations run entirely on renewable energy — solar and hydrogen — with zero carbon footprint." },
          { icon:"👩‍🔧", title:"Local Employment", text:"We train and employ local female technicians, building sustainable communities across Ghana." },
        ].map((item,i)=>(
          <div key={i} className={`fade${i}`} style={{ background:T.card,borderRadius:14,
            padding:"16px",marginBottom:12,border:`1px solid ${T.border}`,
            display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ fontSize:28,flexShrink:0 }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:4 }}>{item.title}</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>{item.text}</div>
            </div>
          </div>
        ))}

        <button onClick={()=>go("home")} className="tappable"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit" }}>
          Find a Station →
        </button>
      </div>

      <NavBar active="More" go={go}/>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState("home");
  const [station,  setStation]  = useState(null);
  const [vehicle,  setVehicle]  = useState(null);
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [user,     setUser]     = useState(null);
  const [drawer,   setDrawer]   = useState(false);

  const go = (s) => { setScreen(s); setDrawer(false); };

  // Load stations from Supabase
  useEffect(() => {
    if (!SUPABASE_URL) return;
    sb("stations?select=*&order=id").then(data => {
      if (data?.length) setStations(data);
    });
  }, []);

  const commonProps = {
    go, stations, station: station||stations[0],
    setStation, user, setUser,
    onMenu: ()=>setDrawer(true),
  };

  const views = {
    home:     <HomeScreen    {...commonProps} />,
    detail:   <DetailScreen  {...commonProps} />,
    vehicles: <VehicleScreen {...commonProps} setVehicle={setVehicle} />,
    payment:  <PaymentScreen {...commonProps} vehicle={vehicle} />,
    profile:  <ProfileScreen {...commonProps} />,
    about:    <AboutScreen   {...commonProps} />,
    auth:     <ProfileScreen {...commonProps} />,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"relative",height:"100vh",overflow:"hidden" }}>
        <Drawer open={drawer} onClose={()=>setDrawer(false)}
          go={go} user={user} onLogout={()=>setUser(null)}/>
        <div style={{ height:"100%",overflow:"hidden",display:"flex",flexDirection:"column" }}>
          {views[screen] || views.home}
        </div>
      </div>
    </>
  );
}
