// ============================================================
//  EcoChargeCar — App.jsx  (User-facing, no emojis, real logo)
//  Paste into src/App.jsx on GitHub
// ============================================================

import { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

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

const T = {
  bg:"#0f1117", card:"#1a1d27", border:"#2a2d3a",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
};

// Real photos - verified working Unsplash URLs
const PHOTOS = {
  car:      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=700&q=85&fit=crop",
  scooter:  "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=700&q=85&fit=crop",
  tricycle: "https://images.unsplash.com/photo-1558980664-1db506751c6c?w=700&q=85&fit=crop",
  station:  "https://images.unsplash.com/photo-1647166545674-e6e87e0ac24a?w=700&q=85&fit=crop",
  hero:     "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=800&q=85&fit=crop",
};

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
  { type:"Car",      price:"GH₵140–210", amount:175, desc:"Full EV sedan — solar powered",     img: PHOTOS.car      },
  { type:"Scooter",  price:"GH₵8–15",   amount:12,  desc:"Electric scooter fast charge",       img: PHOTOS.scooter  },
  { type:"Tricycle", price:"GH₵18–28",  amount:23,  desc:"Cargo tricycle — station charge",    img: PHOTOS.tricycle },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { height:100%; }
  body { font-family:'Inter',sans-serif; background:#0f1117; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  .fade  { animation:fadeUp 0.35s ease both; }
  .fade1 { animation:fadeUp 0.35s 0.07s ease both; }
  .fade2 { animation:fadeUp 0.35s 0.14s ease both; }
  .fade3 { animation:fadeUp 0.35s 0.21s ease both; }
  .tap { transition:opacity 0.15s,transform 0.15s; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .tap:active { opacity:0.7; transform:scale(0.97); }
  .rowcard { transition:background 0.15s; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .rowcard:hover { background:#21253a !important; }
  input,button { font-family:'Inter',sans-serif; outline:none; }
  input::placeholder { color:#4b5563; }
  ::-webkit-scrollbar { width:0; }
`;

// ── SVG ICONS (no emojis) ─────────────────────────────────────
const Icon = {
  home: (c="#9ca3af") => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  station: (c="#9ca3af") => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M19.77 7.23l-.01.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 15H6v-4h6v4zm0-6H6V5h6v4z"/></svg>,
  profile: (c="#9ca3af") => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  more: (c="#9ca3af") => <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  bolt: (c=T.green) => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M13 2L4.09 12.97H11L10 22L20.91 11.03H14L13 2Z"/></svg>,
  water: (c=T.blue) => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z"/></svg>,
  leaf: (c=T.green) => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M17 8C8 10 5.9 16.17 3.82 19.82a2 2 0 103.09 2.5C9 19.5 11 14 17 12v4l5-5-5-5v2z"/></svg>,
  back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  check: (c=T.green) => <svg width="20" height="20" viewBox="0 0 24 24" fill={c}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  arrow: (c="#4b5563") => <svg width="16" height="16" viewBox="0 0 24 24" fill={c}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  pin: (c=T.green) => <svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={c}/><circle cx="14" cy="14" r="6" fill="#0f1117"/><path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill={c}/></svg>,
  car: (c=T.mutedLight) => <svg width="32" height="32" viewBox="0 0 24 24" fill={c}><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>,
  notify: (c=T.mutedLight) => <svg width="20" height="20" viewBox="0 0 24 24" fill={c}><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
};

// ── SHARED COMPONENTS ─────────────────────────────────────────

const Badge = ({ children, color=T.green }) => (
  <span style={{ background:`${color}20`,color,fontSize:10,fontWeight:700,
    borderRadius:6,padding:"3px 8px",border:`1px solid ${color}40`,whiteSpace:"nowrap" }}>
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

const Divider = () => <div style={{ height:1,background:T.border,margin:"10px 0" }}/>;

// ── DRAWER ────────────────────────────────────────────────────
const Drawer = ({ open, onClose, go, user, onLogout }) => (
  <>
    {open && (
      <div onClick={onClose} style={{ position:"fixed",inset:0,
        background:"rgba(0,0,0,0.65)",zIndex:200,animation:"fadeIn 0.25s ease" }}/>
    )}
    <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,
      background:T.card,zIndex:201,borderRight:`1px solid ${T.border}`,
      transform:open?"translateX(0)":"translateX(-100%)",
      transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",
      display:"flex",flexDirection:"column" }}>

      <div style={{ padding:"52px 20px 20px",
        background:"linear-gradient(135deg,#0a1f12,#0f2b1a)",
        borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18 }}>
          <img src="/logo.png" alt="EcoCharge"
            style={{ width:48,height:48,objectFit:"contain",borderRadius:12 }}
            onError={e=>{ e.target.style.display="none"; }}/>
          <div>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>EcoCharge</div>
            <div style={{ fontSize:11,color:T.muted }}>Ghana · Clean Energy</div>
          </div>
        </div>
        {user
          ? <div style={{ background:"rgba(74,222,128,0.08)",borderRadius:10,
              padding:"10px 14px",border:`1px solid ${T.greenDim}` }}>
              <div style={{ fontSize:11,color:T.muted }}>Signed in as</div>
              <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
          : <button onClick={()=>{ go("profile"); onClose(); }} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,
                color:"#000",cursor:"pointer" }}>Sign In / Register</button>
        }
      </div>

      <div style={{ flex:1,overflowY:"auto" }}>
        {[
          { icon: Icon.home(T.mutedLight),    label:"Find Stations",  screen:"home" },
          { icon: Icon.station(T.mutedLight), label:"Station List",   screen:"detail" },
          { icon: Icon.profile(T.mutedLight), label:"My Profile",     screen:"profile" },
          { icon: Icon.more(T.mutedLight),    label:"About EcoCharge",screen:"about" },
        ].map(item=>(
          <div key={item.label} className="tap rowcard"
            onClick={()=>{ go(item.screen); onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",
              borderBottom:`1px solid ${T.border}30` }}>
            {item.icon}
            <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
            {Icon.arrow()}
          </div>
        ))}
      </div>

      {user && (
        <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>{ onLogout(); onClose(); }} className="tap"
            style={{ width:"100%",background:"rgba(248,113,113,0.08)",
              border:`1px solid rgba(248,113,113,0.3)`,borderRadius:10,padding:"11px",
              fontSize:13,fontWeight:600,color:T.red,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            {Icon.logout()} Sign Out
          </button>
        </div>
      )}
    </div>
  </>
);

// ── NAV BAR ───────────────────────────────────────────────────
const NavBar = ({ active, go }) => {
  const tabs = [
    { label:"Home",     screen:"home",    icon: Icon.home },
    { label:"Stations", screen:"detail",  icon: Icon.station },
    { label:"Profile",  screen:"profile", icon: Icon.profile },
    { label:"More",     screen:"about",   icon: Icon.more },
  ];
  return (
    <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 22px",
      borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0 }}>
      {tabs.map(({ label, screen, icon })=>(
        <button key={label} onClick={()=>go(screen)} className="tap"
          style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
            flexDirection:"column",alignItems:"center",gap:4,minWidth:56,
            color:active===label?T.green:T.muted,
            fontSize:10,fontWeight:active===label?700:500 }}>
          {icon(active===label?T.green:T.muted)}
          {label}
          {active===label && (
            <div style={{ width:4,height:4,borderRadius:"50%",background:T.green,marginTop:-2 }}/>
          )}
        </button>
      ))}
    </div>
  );
};

// ── HEADER ────────────────────────────────────────────────────
const Header = ({ title, subtitle, onBack, onMenu, showNotify }) => (
  <div style={{ padding:"14px 18px 13px",display:"flex",alignItems:"center",gap:12,
    borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} className="tap"
          style={{ background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",padding:4 }}>
          {Icon.back()}
        </button>
      : <button onClick={onMenu} className="tap"
          style={{ background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",gap:5,padding:4 }}>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:16,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
        </button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{subtitle}</div>}
    </div>
    <img src="/logo.png" alt="EcoCharge"
      style={{ width:34,height:34,objectFit:"contain",borderRadius:8,flexShrink:0 }}
      onError={e=>{ e.target.style.display="none"; }}/>
  </div>
);

// ── HOME / MAP ────────────────────────────────────────────────
function HomeScreen({ go, stations, setStation, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="EcoChargeCar" subtitle="Find a charging station near you" onMenu={onMenu}/>

      <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,
        overflow:"hidden",background:"#0e1525" }}>
        {/* Map background */}
        <svg width="100%" height="100%" style={{ position:"absolute",inset:0 }} preserveAspectRatio="none">
          <defs>
            <radialGradient id="mg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#192540"/>
              <stop offset="100%" stopColor="#090e1a"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mg)"/>
          {["M5 35 Q30 28 60 40 Q80 48 95 35","M10 55 Q35 45 65 58 Q82 64 95 52",
            "M0 20 Q25 18 50 25 Q70 30 100 22","M20 70 Q45 65 70 72 Q85 76 100 68",
            "M30 10 Q32 40 28 70","M55 5 Q58 35 54 65","M70 8 Q73 38 69 68","M15 5 Q18 30 14 55"]
            .map((d,i)=>(
              <path key={i} d={d} stroke="#1e3060" strokeWidth={i%3===0?2.5:1.5}
                fill="none" vectorEffect="non-scaling-stroke" transform="scale(4,4)" opacity={0.7}/>
            ))}
        </svg>

        {/* Area label */}
        <div style={{ position:"absolute",top:14,left:16,
          color:T.text,fontWeight:700,fontSize:15,textShadow:"0 1px 8px rgba(0,0,0,0.8)" }}>
          Greater Accra
        </div>

        {/* Station count pill */}
        <div style={{ position:"absolute",top:14,right:14,background:"rgba(15,17,23,0.85)",
          backdropFilter:"blur(8px)",borderRadius:20,padding:"5px 12px",
          fontSize:11,color:T.green,fontWeight:700,border:`1px solid ${T.border}` }}>
          {stations.length} stations
        </div>

        {/* Map pins */}
        {stations.map(s=>(
          <button key={s.id} className="tap"
            onClick={()=>{ setStation(s); go("detail"); }}
            style={{ position:"absolute",top:s.lat,left:s.lng,background:"none",
              border:"none",transform:"translate(-50%,-100%)",
              filter:`drop-shadow(0 3px 8px rgba(74,222,128,0.4))`,
              transition:"filter 0.2s,transform 0.2s" }}>
            {Icon.pin(s.open>0?T.green:"#6b7280")}
          </button>
        ))}

        {/* Bottom station strip */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,
          background:"linear-gradient(0deg,rgba(9,14,26,1) 0%,transparent 100%)",
          padding:"24px 12px 12px" }}>
          <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:2 }}>
            {stations.map(s=>(
              <div key={s.id} className="tap"
                onClick={()=>{ setStation(s); go("detail"); }}
                style={{ background:"rgba(26,29,39,0.95)",backdropFilter:"blur(8px)",
                  borderRadius:12,padding:"10px 14px",
                  border:`1px solid ${T.border}`,flexShrink:0,minWidth:150 }}>
                <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.green,fontWeight:600 }}>{s.open}/{s.bays} bays open</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Wait: {s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavBar active="Home" go={go}/>
    </div>
  );
}

// ── STATION DETAIL ────────────────────────────────────────────
function DetailScreen({ go, station, stations, setStation, onMenu }) {
  const s = station || stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} subtitle={`${s.city} · Solar & Hydrogen`} onBack={()=>go("home")}/>

      {/* Real station photo */}
      <div style={{ margin:"12px 12px 0",borderRadius:16,overflow:"hidden",height:155,
        position:"relative",flexShrink:0 }}>
        <img src={PHOTOS.station} alt="Charging Station"
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(0deg,rgba(15,17,23,0.9) 0%,rgba(15,17,23,0.1) 60%)" }}/>
        <div style={{ position:"absolute",bottom:12,left:14,display:"flex",gap:8 }}>
          <Badge color={T.green}>{s.open}/{s.bays} Bays Open</Badge>
          <Badge color={T.yellow}>Wait: {s.time}</Badge>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        {/* Stats row */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[
            { label:"Bays Open",  value:`${s.open}/${s.bays}`, color:T.green  },
            { label:"Est. Wait",  value:s.time,                 color:T.yellow },
            { label:"Solar",      value:`${s.solar}%`,          color:T.blue   },
          ].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",
              border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontSize:9,color:T.muted,marginBottom:5,textTransform:"uppercase",
                letterSpacing:0.4 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:17,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>

        {/* Energy mix */}
        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <span style={{ fontSize:13,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% Hydrogen</span>
          </div>
          <div style={{ height:7,borderRadius:4,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,
              background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:4,
              transition:"width 0.8s ease" }}/>
          </div>
        </div>

        {/* CTA */}
        <button onClick={()=>go("vehicles")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:14,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {Icon.bolt("#000")} Charge Here — Select Vehicle
        </button>

        {/* All stations */}
        <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:0.6,
          textTransform:"uppercase",marginBottom:10 }}>All Stations</div>

        {stations.map(st=>(
          <div key={st.id} className="rowcard" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#152410":T.card,
              border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,
              borderRadius:13,padding:"13px 14px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,color:T.text,fontSize:14,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:3 }}>
                {st.city} · {st.bays} bays · {st.solar}% Solar
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button className="tap"
                onClick={e=>{ e.stopPropagation(); setStation(st); go("vehicles"); }}
                style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",
                  fontSize:11,fontWeight:700,color:"#000",cursor:"pointer" }}>
                Select
              </button>
            </div>
          </div>
        ))}
        <div style={{ height:18 }}/>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── VEHICLE SELECTION ─────────────────────────────────────────
function VehicleScreen({ go, setVehicle }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" subtitle="Choose your vehicle type" onBack={()=>go("detail")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`}
            onClick={()=>setSelected(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",
              border:`2px solid ${selected?.type===v.type?T.green:T.border}`,
              background:selected?.type===v.type?"#0d2010":T.card,
              transition:"border-color 0.2s,background 0.2s" }}>
            {/* Real photo */}
            <div style={{ height:175,position:"relative",overflow:"hidden" }}>
              <img src={v.img} alt={v.type}
                style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}
                onError={e=>{ e.target.parentElement.style.background="#1a2d1a"; e.target.style.display="none"; }}/>
              <div style={{ position:"absolute",inset:0,
                background:"linear-gradient(0deg,rgba(15,17,23,0.9) 0%,rgba(15,17,23,0.15) 55%)" }}/>
              <div style={{ position:"absolute",bottom:12,left:14 }}>
                <div style={{ fontWeight:800,fontSize:20,color:T.text }}>{v.type}</div>
                <div style={{ fontSize:12,color:T.mutedLight,marginTop:2 }}>{v.desc}</div>
              </div>
              {selected?.type===v.type && (
                <div style={{ position:"absolute",top:12,right:12,width:30,height:30,
                  borderRadius:"50%",background:T.green,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {Icon.check("#000")}
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px",display:"flex",
              justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:800,fontSize:19,color:T.green }}>{v.price}</div>
              <Badge color={T.blue}>+ 20L Clean Water</Badge>
            </div>
          </div>
        ))}

        {/* Bundle info */}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",
          border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,
            textTransform:"uppercase",letterSpacing:0.5 }}>Every charge includes</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            {Icon.bolt(T.green)}
            <span style={{ fontSize:13,color:T.text }}>Full vehicle charge via solar energy</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            {Icon.water(T.blue)}
            <span style={{ fontSize:13,color:T.text }}>20L clean desalinated water — free</span>
          </div>
        </div>

        <button onClick={()=>{ if(selected){ setVehicle(selected); go("payment"); } }}
          className="tap"
          style={{ width:"100%",
            background:selected?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,
            border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
            color:selected?"#000":T.muted,cursor:selected?"pointer":"not-allowed",
            marginBottom:16,transition:"all 0.2s" }}>
          {selected?`Continue with ${selected.type}  →`:"Select a vehicle to continue"}
        </button>
      </div>

      <NavBar active="Stations" go={go}/>
    </div>
  );
}

// ── PAYMENT ───────────────────────────────────────────────────
function PaymentScreen({ go, vehicle, station }) {
  const [method,  setMethod]  = useState("mtn");
  const [email,   setEmail]   = useState("");
  const [paying,  setPaying]  = useState(false);
  const [paid,    setPaid]    = useState(false);
  const [error,   setError]   = useState("");
  const scriptRef = useRef(false);

  const amount = vehicle?.amount || 175;
  const s = station || FALLBACK_STATIONS[0];

  // Load Paystack script on mount
  useEffect(()=>{
    if (scriptRef.current || window.PaystackPop) return;
    const el = document.createElement("script");
    el.src = "https://js.paystack.co/v1/inline.js";
    el.async = true;
    el.onload  = () => { scriptRef.current = true; };
    el.onerror = () => { console.error("Paystack script failed to load"); };
    document.head.appendChild(el);
    return () => {};
  }, []);

  const waitForPaystack = (cb, tries=0) => {
    if (window.PaystackPop) { cb(); return; }
    if (tries > 25) { setError("Payment system unavailable. Check your internet connection."); setPaying(false); return; }
    setTimeout(() => waitForPaystack(cb, tries+1), 300);
  };

  const handlePay = () => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address."); return;
    }
    setError("");
    setPaying(true);

    // Demo mode — no Paystack key
    if (!PAYSTACK_KEY || PAYSTACK_KEY === "") {
      setTimeout(() => { setPaid(true); setPaying(false); }, 1800);
      return;
    }

    waitForPaystack(() => {
      try {
        const handler = window.PaystackPop.setup({
          key:      PAYSTACK_KEY,
          email:    email,
          amount:   amount * 100, // pesewas
          currency: "GHS",
          ref:      `ECO-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          metadata: {
            custom_fields: [
              { display_name:"Vehicle",  variable_name:"vehicle",  value: vehicle?.type || "Car" },
              { display_name:"Station",  variable_name:"station",  value: s.name },
              { display_name:"Water",    variable_name:"water",    value: "20L bundle" },
            ]
          },
          callback: async (res) => {
            if (SUPABASE_URL) {
              await sb("payments", {
                method: "POST",
                headers: { Prefer:"return=minimal" },
                body: JSON.stringify({
                  reference:      res.reference,
                  amount,
                  email,
                  vehicle:        vehicle?.type,
                  station:        s.name,
                  payment_method: method,
                  status:         "success",
                  created_at:     new Date().toISOString(),
                }),
              }).catch(()=>{});
            }
            setPaid(true);
            setPaying(false);
          },
          onClose: () => {
            setPaying(false);
            setError("Payment was cancelled. Tap Pay again to retry.");
          },
        });
        handler.openIframe();
      } catch(err) {
        setError("Could not open payment. Please try again.");
        setPaying(false);
      }
    });
  };

  const METHODS = [
    { id:"mtn",      label:"MTN Mobile Money" },
    { id:"vodafone", label:"Vodafone Cash"     },
    { id:"airtel",   label:"AirtelTigo Cash"   },
  ];

  const METHOD_COLORS = { mtn:"#fbbf24", vodafone:"#f87171", airtel:"#60a5fa" };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Payment" subtitle="Secure checkout via Paystack" onBack={()=>go("vehicles")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        {/* Order summary */}
        <div className="fade" style={{ background:T.card,borderRadius:16,padding:"16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Order Summary</div>
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ color:T.muted,fontSize:13 }}>
              {vehicle?.type||"Vehicle"} Charging — {s.name}
            </span>
            <span style={{ color:T.green,fontWeight:700 }}>GH₵{amount-5}</span>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
            <span style={{ color:T.muted,fontSize:13 }}>Clean Water Bundle 20L</span>
            <span style={{ color:T.blue,fontWeight:700 }}>GH₵5</span>
          </div>
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text,fontSize:15 }}>Total</span>
            <span style={{ fontWeight:800,fontSize:24,color:T.green }}>GH₵{amount}</span>
          </div>
        </div>

        {/* Email */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600 }}>
            Email address — for payment receipt
          </div>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e=>{ setEmail(e.target.value); setError(""); }}
            style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
              borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14 }}/>
        </div>

        {/* Mobile money */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>
            Select Mobile Money
          </div>
          {METHODS.map(m=>(
            <div key={m.id} className="tap rowcard" onClick={()=>setMethod(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",
                borderRadius:12,marginBottom:8,
                background:method===m.id?"#132010":"transparent",
                border:`1px solid ${method===m.id?T.greenDim:T.border}`,
                transition:"all 0.15s" }}>
              <div style={{ width:12,height:12,borderRadius:"50%",
                background:METHOD_COLORS[m.id],flexShrink:0,
                boxShadow:`0 0 8px ${METHOD_COLORS[m.id]}80` }}/>
              <span style={{ flex:1,color:T.text,fontSize:14,fontWeight:500 }}>{m.label}</span>
              <div style={{ width:20,height:20,borderRadius:"50%",
                border:`2px solid ${method===m.id?T.green:T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {method===m.id&&(
                  <div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:"rgba(248,113,113,0.08)",border:`1px solid rgba(248,113,113,0.3)`,
            borderRadius:10,padding:"11px 14px",marginBottom:12,
            color:T.red,fontSize:12,fontWeight:500 }}>{error}</div>
        )}

        {/* Pay button / Success */}
        {!paid ? (
          <button onClick={handlePay} disabled={paying} className="tap"
            style={{ width:"100%",
              background:paying?"#0d2218":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:paying?`1px solid ${T.greenDim}`:"none",
              borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
              color:paying?T.green:"#000",cursor:paying?"default":"pointer",
              marginBottom:12,display:"flex",alignItems:"center",
              justifyContent:"center",gap:10,transition:"all 0.2s",
              opacity:paying?0.85:1 }}>
            {paying
              ? <><span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${T.green}`,
                  borderTopColor:"transparent",display:"inline-block",
                  animation:"spin 0.8s linear infinite" }}/> Opening Paystack…</>
              : <>{Icon.bolt("#000")} Pay GH₵{amount} via Paystack</>
            }
          </button>
        ) : (
          <div style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,
            borderRadius:16,padding:"24px",textAlign:"center",marginBottom:12 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:T.green,
              display:"flex",alignItems:"center",justifyContent:"center",
              margin:"0 auto 14px" }}>
              {Icon.check("#000")}
            </div>
            <div style={{ color:T.green,fontWeight:800,fontSize:19,marginBottom:6 }}>
              Payment Successful!
            </div>
            <div style={{ color:T.mutedLight,fontSize:13,lineHeight:1.6,marginBottom:16 }}>
              Bay assigned · Your charging session is starting.
            </div>
            <button onClick={()=>go("home")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:10,padding:"11px 28px",
                fontSize:13,fontWeight:700,color:"#000",cursor:"pointer" }}>
              Back to Map
            </button>
          </div>
        )}

        {/* Impact */}
        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:20,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11,color:T.muted,marginBottom:8,fontWeight:600,
            textTransform:"uppercase",letterSpacing:0.5 }}>Your Impact This Session</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              {Icon.leaf(T.green)}
              <span style={{ fontWeight:700,fontSize:13,color:T.green }}>~3.2 kg CO₂ saved</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              {Icon.water(T.blue)}
              <span style={{ fontSize:12,color:T.blue,fontWeight:600 }}>20L water</span>
            </div>
          </div>
        </div>
      </div>

      <NavBar active="Stations" go={go}/>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function ProfileScreen({ go, user, setUser, onMenu }) {
  const [mode,     setMode]     = useState("view");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [msg,      setMsg]      = useState("");

  const authCall = async (endpoint, body) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
      method:"POST",
      headers:{ apikey:SUPABASE_ANON,"Content-Type":"application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const doLogin = async () => {
    if (!email||!password) { setError("Enter email and password"); return; }
    setLoading(true); setError("");
    const d = SUPABASE_URL
      ? await authCall("token?grant_type=password",{ email, password })
      : { access_token:"demo" };
    if (d.access_token) {
      setUser({ email, name: name||email.split("@")[0], token:d.access_token });
      setMsg("Signed in successfully!"); setMode("view");
    } else setError(d.error_description||"Invalid credentials. Check email and password.");
    setLoading(false);
  };

  const doRegister = async () => {
    if (!name||!email||!password) { setError("Please fill in all fields"); return; }
    if (password.length<6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const d = SUPABASE_URL
      ? await authCall("signup",{ email, password, data:{ full_name:name } })
      : { id:"demo" };
    if (d.id||d.user) {
      setMsg("Account created! Check your email to verify, then sign in.");
      setMode("login");
    } else setError(d.msg||d.error_description||"Registration failed. Try again.");
    setLoading(false);
  };

  if (mode==="login"||mode==="register") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={mode==="login"?"Sign In":"Create Account"}
        subtitle="EcoCharge Ghana" onBack={()=>{ setMode("view"); setError(""); setMsg(""); }}/>
      <div style={{ flex:1,overflowY:"auto",padding:"30px 20px 0" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <img src="/logo.png" alt="EcoCharge"
            style={{ width:70,height:70,objectFit:"contain",marginBottom:12 }}
            onError={e=>e.target.style.display="none"}/>
          <div style={{ fontWeight:800,fontSize:20,color:T.text }}>
            {mode==="login"?"Welcome Back":"Join EcoCharge"}
          </div>
          <div style={{ fontSize:12,color:T.muted,marginTop:5 }}>
            {mode==="login"?"Sign in to your account":"Create your free account"}
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"20px",border:`1px solid ${T.border}` }}>
          {mode==="register"&&(
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Full Name</div>
              <input placeholder="Your full name" value={name}
                onChange={e=>{ setName(e.target.value); setError(""); }}
                style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                  borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14 }}/>
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Email</div>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e=>{ setEmail(e.target.value); setError(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14 }}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Password</div>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e=>{ setPassword(e.target.value); setError(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14 }}/>
          </div>

          {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,textAlign:"center",
            background:"rgba(248,113,113,0.08)",borderRadius:8,padding:"8px" }}>{error}</div>}

          <button onClick={mode==="login"?doLogin:doRegister} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
              color:"#000",cursor:"pointer",opacity:loading?0.7:1 }}>
            {loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}
          </button>
        </div>

        <div style={{ textAlign:"center",marginTop:20,marginBottom:16 }}>
          <span style={{ color:T.muted,fontSize:13 }}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
          </span>
          <button onClick={()=>{ setMode(mode==="login"?"register":"login"); setError(""); }}
            style={{ background:"none",border:"none",color:T.green,
              fontSize:13,fontWeight:700,cursor:"pointer" }}>
            {mode==="login"?"Register":"Sign In"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" subtitle="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        {msg&&(
          <div className="fade" style={{ background:"rgba(74,222,128,0.08)",
            border:`1px solid ${T.greenDim}`,borderRadius:12,padding:"11px 14px",
            marginBottom:14,color:T.green,fontSize:13,fontWeight:500 }}>{msg}</div>
        )}
        {user ? (
          <>
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",
              borderRadius:18,padding:"22px",marginBottom:16,border:`1px solid ${T.greenDim}`,
              textAlign:"center" }}>
              <div style={{ width:68,height:68,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 12px" }}>
                {Icon.profile("#000")}
              </div>
              <div style={{ fontWeight:800,fontSize:19,color:T.text }}>
                {user.name||user.email?.split("@")[0]}
              </div>
              <div style={{ fontSize:12,color:T.muted,marginTop:5,marginBottom:10 }}>{user.email}</div>
              <Badge color={T.green}>Active Member</Badge>
            </div>

            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",
              gap:10,marginBottom:16 }}>
              {[
                { label:"Total Charges",  value:"0",     color:T.green  },
                { label:"CO₂ Saved",      value:"0 kg",  color:T.green  },
                { label:"Water Received", value:"0 L",   color:T.blue   },
                { label:"Total Spent",    value:"GH₵0",  color:T.yellow },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:13,
                  padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.4 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <button onClick={()=>{ setUser(null); setMsg(""); }} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,0.07)",
                border:`1px solid rgba(248,113,113,0.25)`,borderRadius:12,padding:"14px",
                fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",
                marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              {Icon.logout()} Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"30px 16px" }}>
            <img src="/logo.png" alt="EcoCharge"
              style={{ width:76,height:76,objectFit:"contain",marginBottom:18 }}
              onError={e=>e.target.style.display="none"}/>
            <div style={{ fontWeight:800,fontSize:21,color:T.text,marginBottom:8 }}>
              Sign in to EcoCharge
            </div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.7 }}>
              Track charges, view bookings,<br/>and see your environmental impact.
            </div>
            <button onClick={()=>setMode("login")} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
                color:"#000",cursor:"pointer",marginBottom:12 }}>
              Sign In
            </button>
            <button onClick={()=>setMode("register")} className="tap"
              style={{ width:"100%",background:"transparent",border:`1px solid ${T.border}`,
                borderRadius:14,padding:"16px",fontSize:15,fontWeight:600,
                color:T.mutedLight,cursor:"pointer" }}>
              Create Account
            </button>
          </div>
        )}
      </div>
      <NavBar active="Profile" go={go}/>
    </div>
  );
}

// ── ABOUT ─────────────────────────────────────────────────────
function AboutScreen({ go, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="About EcoCharge" subtitle="Our mission" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <img src="/logo.png" alt="EcoCharge"
            style={{ width:82,height:82,objectFit:"contain",marginBottom:14 }}
            onError={e=>e.target.style.display="none"}/>
          <div style={{ fontWeight:800,fontSize:22,color:T.text }}>EcoCharge Ghana</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>
            Solar Charging · Clean Water · Zero Emissions
          </div>
        </div>

        {[
          { icon:Icon.bolt(T.yellow), title:"Solar EV Charging",
            text:"100% solar-powered stations across Ghana. Fast, clean and affordable for all vehicle types." },
          { icon:Icon.water(T.blue), title:"Clean Water Access",
            text:"Every session includes 20L of clean desalinated water — two needs solved at once." },
          { icon:Icon.leaf(T.green), title:"Zero Emissions",
            text:"Our stations run on solar and hydrogen — zero carbon footprint, clean future." },
          { icon:Icon.profile(T.mutedLight), title:"Local Employment",
            text:"We train and employ local female technicians, building sustainable communities." },
        ].map((item,i)=>(
          <div key={i} className={`fade${i}`}
            style={{ background:T.card,borderRadius:14,padding:"16px",marginBottom:12,
              border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ flexShrink:0,marginTop:2 }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:5 }}>{item.title}</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{item.text}</div>
            </div>
          </div>
        ))}

        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:20,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {Icon.bolt("#000")} Find a Station
        </button>
      </div>
      <NavBar active="More" go={go}/>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState("home");
  const [station,  setStation]  = useState(null);
  const [vehicle,  setVehicle]  = useState(null);
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [user,     setUser]     = useState(null);
  const [drawer,   setDrawer]   = useState(false);

  const go = s => { setScreen(s); setDrawer(false); };

  useEffect(()=>{
    if (!SUPABASE_URL) return;
    sb("stations?select=*&order=id").then(d=>{ if(d?.length) setStations(d); });
  },[]);

  const props = {
    go, stations,
    station: station||stations[0],
    setStation, user, setUser,
    vehicle, setVehicle,
    onMenu: ()=>setDrawer(true),
  };

  const views = {
    home:     <HomeScreen    {...props}/>,
    detail:   <DetailScreen  {...props}/>,
    vehicles: <VehicleScreen {...props}/>,
    payment:  <PaymentScreen {...props}/>,
    profile:  <ProfileScreen {...props}/>,
    about:    <AboutScreen   {...props}/>,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"relative",height:"100vh",overflow:"hidden",background:T.bg }}>
        <Drawer open={drawer} onClose={()=>setDrawer(false)}
          go={go} user={user} onLogout={()=>setUser(null)}/>
        <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {views[screen]||views.home}
        </div>
      </div>
    </>
  );
}
