// ============================================================
//  EcoCharge Ghana — App.jsx (Clean Stable Version)
//  All features working: Map, Booking, Payment, QR, Verify
// ============================================================

import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

const sb = async (path, opts = {}) => {
  if (!SUPABASE_URL) return null;
  try {
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
  } catch(e) { return null; }
};

// ── THEME ─────────────────────────────────────────────────────
const T = {
  bg:"#0f1117", card:"#1a1d27", border:"#2a2d3a",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
};

// ── STATIONS ──────────────────────────────────────────────────
const STATIONS = [
  { id:1, name:"Accra Central",  city:"Accra",      bays:6, open:6, solar:85, hydrogen:15, time:"23m", lat:5.5502,  lng:-0.2174 },
  { id:2, name:"Kumasi Hub",     city:"Kumasi",     bays:4, open:3, solar:90, hydrogen:10, time:"12m", lat:6.6885,  lng:-1.6244 },
  { id:3, name:"Tema Station",   city:"Tema",       bays:8, open:8, solar:75, hydrogen:25, time:"8m",  lat:5.6698,  lng:0.0166  },
  { id:4, name:"Takoradi",       city:"Takoradi",   bays:3, open:2, solar:80, hydrogen:20, time:"31m", lat:4.9016,  lng:-1.7648 },
  { id:5, name:"Tamale North",   city:"Tamale",     bays:5, open:5, solar:95, hydrogen:5,  time:"45m", lat:9.4034,  lng:-0.8424 },
  { id:6, name:"Sunyani East",   city:"Sunyani",    bays:2, open:1, solar:70, hydrogen:30, time:"19m", lat:7.3349,  lng:-2.3284 },
  { id:7, name:"Cape Coast",     city:"Cape Coast", bays:6, open:6, solar:88, hydrogen:12, time:"27m", lat:5.1053,  lng:-1.2466 },
  { id:8, name:"Ho District",    city:"Ho",         bays:4, open:3, solar:82, hydrogen:18, time:"15m", lat:6.6011,  lng:0.4717  },
];

const VEHICLES = [
  { type:"Car",      price:"GH₵140–210", amount:175, desc:"Full EV sedan — solar powered"  },
  { type:"Scooter",  price:"GH₵8–15",   amount:12,  desc:"Electric scooter fast charge"    },
  { type:"Tricycle", price:"GH₵18–28",  amount:23,  desc:"Cargo tricycle — station charge" },
];

const DURATIONS = [
  { label:"30 min",  value:30,  extra:0  },
  { label:"1 hour",  value:60,  extra:5  },
  { label:"2 hours", value:120, extra:10 },
  { label:"3 hours", value:180, extra:15 },
];

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{font-family:'Inter',sans-serif;background:#0f1117;color:#fff}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade{animation:fadeUp .35s ease both}
  .fade1{animation:fadeUp .35s .07s ease both}
  .fade2{animation:fadeUp .35s .14s ease both}
  .fade3{animation:fadeUp .35s .21s ease both}
  .tap{transition:opacity .15s,transform .15s;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .tap:active{opacity:.7;transform:scale(.97)}
  .row{transition:background .15s;cursor:pointer}
  .row:active{background:#21253a}
  input,button,textarea{font-family:'Inter',sans-serif;outline:none}
  input{color:#fff}
  input::placeholder{color:#4b5563}
  ::-webkit-scrollbar{width:0}
  /* Fix Leaflet map z-index — prevents map overlapping drawer */
  .leaflet-pane { z-index: 1 !important; }
  .leaflet-top, .leaflet-bottom { z-index: 2 !important; }
  .leaflet-control { z-index: 2 !important; }
`;

// ── HELPERS ───────────────────────────────────────────────────
const Badge = ({ label, color=T.green }) => (
  <span style={{ background:`${color}22`,color,fontSize:10,fontWeight:700,
    borderRadius:6,padding:"3px 8px",border:`1px solid ${color}44`,whiteSpace:"nowrap" }}>
    {label}
  </span>
);

const Divider = () => <div style={{ height:1,background:T.border,margin:"10px 0" }}/>;

const Spinner = () => (
  <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${T.green}`,
    borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite" }}/>
);

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit",hour12:true });
const fmtEndTime = (d,mins) => fmtTime(new Date(new Date(d).getTime()+mins*60000));
const genRef = () => `ECO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

// ── LOGO ──────────────────────────────────────────────────────
const Logo = ({ size=34 }) => {
  const [err,setErr] = useState(false);
  if (!err) return (
    <img src="/logo.png" alt="EcoCharge" onError={()=>setErr(true)}
      style={{ width:size,height:size,objectFit:"contain",borderRadius:8,flexShrink:0 }}/>
  );
  return (
    <div style={{ width:size,height:size,borderRadius:8,flexShrink:0,
      background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.5 }}>⚡</div>
  );
};

// ── ICONS ─────────────────────────────────────────────────────
const Ico = {
  home:    (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  station: (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M19.77 7.23l-.01.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 15H6v-4h6v4zm0-6H6V5h6v4z"/></svg>,
  profile: (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  more:    (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  bolt:    (c=T.green)=><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M13 2L4.09 12.97H11L10 22L20.91 11.03H14L13 2Z"/></svg>,
  water:   (c=T.blue) =><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z"/></svg>,
  back:    ()=><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  check:   (c=T.green)=><svg width="20" height="20" viewBox="0 0 24 24" fill={c}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  pin:     (c=T.green)=><svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={c}/><circle cx="14" cy="14" r="6" fill="#0f1117"/><path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill={c}/></svg>,
  logout:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill={T.red}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  arrow:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill={T.muted}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
};

// ── NAV ───────────────────────────────────────────────────────
const Nav = ({ active, go }) => (
  <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 20px",
    borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0 }}>
    {[
      { label:"Home",     screen:"home",    icon:Ico.home    },
      { label:"Stations", screen:"detail",  icon:Ico.station },
      { label:"Profile",  screen:"profile", icon:Ico.profile },
      { label:"More",     screen:"about",   icon:Ico.more    },
    ].map(({ label,screen,icon })=>(
      <button key={label} onClick={()=>go(screen)} className="tap"
        style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
          flexDirection:"column",alignItems:"center",gap:4,minWidth:56,
          color:active===label?T.green:T.muted,fontSize:10,
          fontWeight:active===label?700:500,fontFamily:"inherit" }}>
        {icon(active===label?T.green:T.muted)}
        {label}
        {active===label&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
      </button>
    ))}
  </div>
);

// ── NEW BOTTOM NAV (5 tabs with center scan button) ──────────
const NewNav = ({ active, go }) => (
  <div style={{ position:"fixed",bottom:0,left:0,right:0,
    display:"flex",justifyContent:"space-around",alignItems:"flex-end",
    padding:"10px 0 22px",borderTop:`1px solid ${T.border}`,
    background:"rgba(8,13,16,.97)",backdropFilter:"blur(12px)",zIndex:100 }}>
    {[
      { label:"Home",     screen:"home",   icon:"🏠" },
      { label:"Stations", screen:"detail", icon:"⚡" },
      { label:"Scan",     screen:"qr",     icon:"📱", center:true },
      { label:"Bookings", screen:"map",    icon:"📋" },
      { label:"Profile",  screen:"profile",icon:"👤" },
    ].map(({ label,screen,icon,center })=>(
      <button key={label} onClick={()=>go(screen)} className="tap"
        style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
          flexDirection:"column",alignItems:"center",gap:4,minWidth:56,fontFamily:"inherit" }}>
        {center ? (
          <div style={{ width:52,height:52,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22,marginBottom:2,
            boxShadow:`0 4px 20px rgba(74,222,128,.4)`,marginTop:-20 }}>{icon}</div>
        ) : (
          <>
            <div style={{ fontSize:22,opacity:active===label?1:.45 }}>{icon}</div>
            <span style={{ fontSize:10,fontWeight:active===label?700:500,
              color:active===label?T.green:T.muted }}>{label}</span>
            {active===label&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
          </>
        )}
      </button>
    ))}
  </div>
);

// ── HEADER ────────────────────────────────────────────────────
const Header = ({ title, sub, onBack, onMenu }) => (
  <div style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:12,
    borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer" }}>{Ico.back()}</button>
      : <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:5,padding:4 }}>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:16,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
        </button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{title}</div>
      {sub&&<div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
    <Logo size={34}/>
  </div>
);

// ── DRAWER ────────────────────────────────────────────────────
const Drawer = ({ open, onClose, go, user, onLogout }) => (
  <>
    {open&&<div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:200,animation:"fadeIn .25s" }}/>}
    <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,background:T.card,
      zIndex:201,borderRight:`1px solid ${T.border}`,
      transform:open?"translateX(0)":"translateX(-100%)",
      transition:"transform .3s cubic-bezier(.4,0,.2,1)",
      display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"52px 20px 20px",background:"linear-gradient(135deg,#0a1f12,#0f2b1a)",borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <Logo size={48}/>
          <div>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>EcoCharge</div>
            <div style={{ fontSize:11,color:T.muted }}>Ghana · Clean Energy</div>
          </div>
        </div>
        {user
          ? <div style={{ background:"rgba(74,222,128,.08)",borderRadius:10,padding:"10px 14px",border:`1px solid ${T.greenDim}` }}>
              <div style={{ fontSize:11,color:T.muted }}>Signed in as</div>
              <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
          : <button onClick={()=>{ go("auth"); onClose(); }} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,
                color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Sign In / Register</button>
        }
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        {[
          { icon:Ico.home(T.mutedLight),    label:"Find Stations",    screen:"home"    },
          { icon:Ico.station(T.mutedLight), label:"All Stations",     screen:"detail"  },
          { icon:Ico.profile(T.mutedLight), label:"My Profile",       screen:"profile" },
          { icon:Ico.more(T.mutedLight),    label:"About EcoCharge",  screen:"about"   },
          { icon:Ico.bolt("#fbbf24"),        label:"Verify Booking",   screen:"verify"  },
        ].map(item=>(
          <div key={item.label} className="tap row" onClick={()=>{ go(item.screen); onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${T.border}20` }}>
            {item.icon}
            <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
            {Ico.arrow()}
          </div>
        ))}
      </div>
      {user&&(
        <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>{ onLogout(); onClose(); }} className="tap"
            style={{ width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.3)",
              borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,color:T.red,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
            {Ico.logout()} Sign Out
          </button>
        </div>
      )}
    </div>
  </>
);

// ── SPLASH ────────────────────────────────────────────────────
function Splash({ onLogin, onRegister, onGuest }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,
      alignItems:"center",justifyContent:"center",padding:"40px 28px" }}>
      <div className="fade" style={{ textAlign:"center",marginBottom:40 }}>
        <Logo size={90}/>
        <div style={{ fontWeight:800,fontSize:30,color:T.text,marginTop:16,letterSpacing:-1 }}>EcoCharge</div>
        <div style={{ fontWeight:600,fontSize:16,color:T.green,marginTop:4 }}>Ghana</div>
        <div style={{ fontSize:13,color:T.muted,marginTop:12,lineHeight:1.7 }}>
          Solar EV Charging · Clean Water<br/>Zero Emissions
        </div>
      </div>
      <div className="fade1" style={{ width:"100%" }}>
        <button onClick={onLogin} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>Sign In</button>
        <button onClick={onRegister} className="tap"
          style={{ width:"100%",background:"transparent",border:`1px solid ${T.border}`,
            borderRadius:14,padding:"16px",fontSize:16,fontWeight:600,
            color:T.text,cursor:"pointer",marginBottom:16,fontFamily:"inherit" }}>Create Account</button>
        <button onClick={onGuest} className="tap"
          style={{ width:"100%",background:"none",border:"none",fontSize:13,
            color:T.muted,cursor:"pointer",fontFamily:"inherit" }}>Continue as Guest →</button>
      </div>
      <div className="fade2" style={{ marginTop:32,display:"flex",gap:28 }}>
        {[{ icon:Ico.bolt(T.green),label:"Solar"},{icon:Ico.water(T.blue),label:"Water"},{icon:Ico.bolt("#fbbf24"),label:"Clean"}]
          .map(f=>(
            <div key={f.label} style={{ textAlign:"center" }}>
              <div style={{ marginBottom:4 }}>{f.icon}</div>
              <div style={{ fontSize:10,color:T.muted }}>{f.label}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────
function Auth({ mode, onBack, onSuccess }) {
  const [name,setPname] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPass] = useState("");
  const [loading,setLoad] = useState(false);
  const [error,setErr] = useState("");

  const call = async (ep, body) => {
    if (!SUPABASE_URL) return { access_token:"demo", id:"demo" };
    const r = await fetch(`${SUPABASE_URL}/auth/v1/${ep}`,{
      method:"POST",
      headers:{ apikey:SUPABASE_ANON,"Content-Type":"application/json" },
      body:JSON.stringify(body),
    });
    return r.json();
  };

  const submit = async () => {
    if (!email||!password) { setErr("Please fill in all fields"); return; }
    if (mode==="register"&&!name) { setErr("Please enter your name"); return; }
    if (password.length<6) { setErr("Password must be at least 6 characters"); return; }
    setLoad(true); setErr("");
    const d = mode==="login"
      ? await call("token?grant_type=password",{ email,password })
      : await call("signup",{ email,password,data:{ full_name:name } });
    if (d.access_token||d.id||d.user) {
      onSuccess({ email, name:name||email.split("@")[0], token:d.access_token||"demo" });
    } else {
      setErr(d.error_description||d.msg||"Something went wrong. Try again.");
    }
    setLoad(false);
  };

  const inp = (ph,val,set,type="text") => (
    <input type={type} placeholder={ph} value={val}
      onChange={e=>{ set(e.target.value); setErr(""); }}
      style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
        borderRadius:10,padding:"13px 14px",color:T.text,fontSize:14,marginBottom:12 }}/>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={mode==="login"?"Sign In":"Create Account"} sub="EcoCharge Ghana" onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"30px 20px 0" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <Logo size={64}/>
          <div style={{ fontWeight:800,fontSize:20,color:T.text,marginTop:12 }}>
            {mode==="login"?"Welcome Back!":"Join EcoCharge"}
          </div>
          <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>
            {mode==="login"?"Sign in to your account":"Create your free account"}
          </div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"20px",border:`1px solid ${T.border}` }}>
          {mode==="register"&&inp("Full name",name,setPname)}
          {inp("Email address",email,setEmail,"email")}
          {inp("Password (min 6 chars)",password,setPass,"password")}
          {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,
            background:"rgba(248,113,113,.08)",borderRadius:8,padding:"8px 12px" }}>{error}</div>}
          <button onClick={submit} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
              color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:loading?.7:1 }}>
            {loading?<Spinner/>:mode==="login"?"Sign In":"Create Account"}
          </button>
        </div>
        <div style={{ textAlign:"center",marginTop:20 }}>
          <span style={{ color:T.muted,fontSize:13 }}>
            {mode==="login"?"No account? ":"Already registered? "}
          </span>
          <button onClick={()=>onBack(mode==="login"?"register":"login")}
            style={{ background:"none",border:"none",color:T.green,
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            {mode==="login"?"Register":"Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HOME / MAP ────────────────────────────────────────────────
// ── MAP SCREEN (moved from home) ──────────────────────────────
function MapScreen({ go, stations, setStation, onMenu }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(()=>{
    if (!document.getElementById("lcss")) {
      const l=document.createElement("link");
      l.id="lcss"; l.rel="stylesheet";
      l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    const init = () => {
      if (mapInst.current||!mapRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current,{ center:[7.9465,-1.0232],zoom:7,attributionControl:false,zoomControl:true });
      mapRef.current.style.zIndex = "0";
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{ maxZoom:19 }).addTo(map);
      const icon = L.divIcon({
        html:`<div style="filter:drop-shadow(0 2px 6px rgba(74,222,128,.6))"><svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#4ade80"/><circle cx="14" cy="14" r="6" fill="#0f1117"/><path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill="#4ade80"/></svg></div>`,
        className:"",iconSize:[28,36],iconAnchor:[14,36],
      });
      stations.forEach(s=>{
        if(!s.lat||!s.lng) return;
        const m = L.marker([s.lat,s.lng],{ icon }).addTo(map);
        m.on("click",()=>{ setStation(s); go("detail"); });
      });
      mapInst.current = map;
    };
    if (window.L) { init(); return; }
    const s=document.createElement("script");
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload=init;
    document.head.appendChild(s);
    return ()=>{ if(mapInst.current){ mapInst.current.remove(); mapInst.current=null; } };
  },[]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Find Stations" sub="Ghana charging network" onBack={()=>go("home")}/>
      <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,overflow:"hidden",zIndex:0,isolation:"isolate" }}>
        <div ref={mapRef} style={{ width:"100%",height:"100%",zIndex:0 }}/>
        <div style={{ position:"absolute",top:14,right:14,zIndex:1000,
          background:"rgba(15,17,23,.85)",backdropFilter:"blur(8px)",
          borderRadius:20,padding:"5px 12px",fontSize:11,color:T.green,
          fontWeight:700,border:`1px solid ${T.border}` }}>{stations.length} stations</div>
        <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:1000,
          background:"linear-gradient(0deg,rgba(9,14,26,.98) 0%,transparent 100%)",
          padding:"24px 12px 12px" }}>
          <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:2 }}>
            {stations.map(s=>(
              <div key={s.id} className="tap" onClick={()=>{ setStation(s); go("detail"); }}
                style={{ background:"rgba(26,29,39,.95)",backdropFilter:"blur(8px)",borderRadius:12,
                  padding:"10px 14px",border:`1px solid ${T.border}`,flexShrink:0,minWidth:150 }}>
                <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.green,fontWeight:600 }}>{s.open}/{s.bays} bays open</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Wait: {s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );
}

// ── NEW HOME DASHBOARD ────────────────────────────────────────
function Home({ go, stations, setStation, user, onMenu }) {
  const [search, setSearch] = useState("");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetEmoji = hour < 12 ? "👋" : hour < 17 ? "☀️" : "🌙";

  const filtered = search
    ? stations.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
    : stations;

  const quickActions = [
    { icon:"⚡", label:"Find Stations", sub:"Nearby",    screen:"map"      },
    { icon:"📋", label:"My Bookings",   sub:"View all",  screen:"bookings" },
    { icon:"📱", label:"Charging Pass", sub:"Show QR",   screen:"qr"       },
    { icon:"💧", label:"Water Points",  sub:"Find clean water", screen:"detail" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#080d10",overflowY:"auto" }}>

      {/* Header */}
      <div style={{ padding:"14px 18px 12px",display:"flex",justifyContent:"space-between",
        alignItems:"center",flexShrink:0 }}>
        <button onClick={onMenu} className="tap"
          style={{ background:"rgba(255,255,255,.08)",border:`1px solid ${T.border}`,
            borderRadius:12,width:40,height:40,cursor:"pointer",
            display:"flex",flexDirection:"column",gap:4,alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:18,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:14,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:18,height:2,background:T.mutedLight,borderRadius:1 }}/>
        </button>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <Logo size={28}/>
          <div>
            <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1 }}>EcoCharge</div>
            <div style={{ fontSize:10,color:T.green,fontWeight:600 }}>Ghana</div>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ background:"rgba(255,255,255,.08)",border:`1px solid ${T.border}`,
            borderRadius:12,width:40,height:40,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🔔</div>
          <div style={{ position:"absolute",top:-3,right:-3,width:12,height:12,
            borderRadius:"50%",background:T.green,border:"2px solid #080d10" }}/>
        </div>
      </div>

      {/* Hero section */}
      <div style={{ margin:"0 14px 16px",borderRadius:20,overflow:"hidden",
        background:"linear-gradient(135deg,#0a1f0a,#0d2d14)",
        position:"relative",minHeight:180 }}>
        {/* BG image overlay */}
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(135deg,rgba(10,31,10,.85) 0%,rgba(13,45,20,.6) 100%)",zIndex:1 }}/>
        {/* Charging station silhouette */}
        <div style={{ position:"absolute",right:0,bottom:0,top:0,width:"55%",
          background:"linear-gradient(135deg,#0d2d14,#0a1f0a)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:80,opacity:.15 }}>⚡</div>
        <div style={{ position:"relative",zIndex:2,padding:"20px 20px 16px" }}>
          <div style={{ fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:4 }}>
            {greeting} {greetEmoji}
          </div>
          <div style={{ fontWeight:800,fontSize:24,color:T.text,marginBottom:6,letterSpacing:-.5 }}>
            {user?.name || user?.email?.split("@")[0] || "Welcome"}
          </div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.6 }}>
            Powering Ghana with{" "}
            <span style={{ color:T.green,fontWeight:600 }}>clean energy</span>
            {" "}and{" "}
            <span style={{ color:T.blue,fontWeight:600 }}>clean water</span>
          </div>
          <div style={{ marginTop:14,display:"flex",gap:8 }}>
            <button onClick={()=>go("map")} className="tap"
              style={{ background:T.green,border:"none",borderRadius:10,
                padding:"8px 16px",fontSize:13,fontWeight:700,color:"#000",
                cursor:"pointer",fontFamily:"inherit" }}>Find Station →</button>
            <button onClick={()=>go("qr")} className="tap"
              style={{ background:"rgba(255,255,255,.1)",border:`1px solid rgba(255,255,255,.2)`,
                borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,color:T.text,
                cursor:"pointer",fontFamily:"inherit" }}>My Pass</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ margin:"0 14px 16px",position:"relative" }}>
        <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16 }}>🔍</div>
        <input placeholder="Search station or location" value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",background:"#1a1d27",border:`1px solid ${T.border}`,
            borderRadius:14,padding:"13px 14px 13px 42px",color:T.text,fontSize:14 }}/>
        <div style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
          background:"rgba(255,255,255,.06)",borderRadius:8,padding:"5px 8px",fontSize:14 }}>⚙️</div>
      </div>

      {/* Quick actions */}
      <div style={{ margin:"0 14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10 }}>
        {quickActions.map(a=>(
          <div key={a.label} className="tap" onClick={()=>go(a.screen)}
            style={{ background:"#1a1d27",borderRadius:14,padding:"14px 8px",
              border:`1px solid ${T.border}`,textAlign:"center",cursor:"pointer" }}>
            <div style={{ fontSize:24,marginBottom:6 }}>{a.icon}</div>
            <div style={{ fontSize:11,fontWeight:700,color:T.text,lineHeight:1.3 }}>{a.label}</div>
            <div style={{ fontSize:9,color:T.muted,marginTop:3 }}>{a.sub}</div>
          </div>
        ))}
      </div>

      {/* Impact card */}
      <div style={{ margin:"0 14px 16px",background:"linear-gradient(135deg,#0a2010,#0d2d1a)",
        borderRadius:16,padding:"16px",border:`1px solid ${T.greenDim}`,
        display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:T.green,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🌱</div>
            <span style={{ fontWeight:700,fontSize:13,color:T.text }}>You're making impact!</span>
          </div>
          <div style={{ fontSize:13,color:T.mutedLight }}>
            <strong style={{ color:T.text }}>0 charges</strong> · <strong style={{ color:T.green }}>0 kg CO₂</strong> saved
          </div>
          <div style={{ fontSize:13,color:T.mutedLight,marginTop:4 }}>
            <strong style={{ color:T.blue }}>0L</strong> clean water received
          </div>
        </div>
        <div style={{ fontSize:40 }}>🌍</div>
      </div>

      {/* Nearby stations */}
      <div style={{ margin:"0 14px 16px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Nearby Stations</div>
          <button onClick={()=>go("detail")} className="tap"
            style={{ background:"none",border:"none",color:T.green,fontSize:13,
              fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4 }}>
            View all →
          </button>
        </div>
        {(search ? filtered : stations).slice(0,4).map(s=>(
          <div key={s.id} className="tap row" onClick={()=>{ setStation(s); go("detail"); }}
            style={{ background:"#1a1d27",borderRadius:16,padding:"14px",
              border:`1px solid ${T.border}`,marginBottom:10,
              display:"flex",gap:12,alignItems:"center" }}>
            {/* Station icon */}
            <div style={{ width:72,height:72,borderRadius:12,flexShrink:0,
              background:"linear-gradient(135deg,#0a2010,#0d3018)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,
              border:`1px solid ${T.greenDim}` }}>⚡</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:3,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</div>
              <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}>{s.time} away · {s.city}</div>
              <div style={{ display:"flex",gap:8 }}>
                <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",
                  fontSize:10,color:T.mutedLight }}>⚡ {s.solar*1.2|0} kW Max</div>
                <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",
                  fontSize:10,color:T.mutedLight }}>☀️ {s.solar}% Solar</div>
              </div>
            </div>
            <div style={{ flexShrink:0,textAlign:"center" }}>
              <div style={{ background:`${T.green}22`,borderRadius:10,padding:"6px 10px",
                border:`1px solid ${T.greenDim}`,marginBottom:8 }}>
                <div style={{ fontWeight:800,fontSize:16,color:T.green }}>{s.open}/{s.bays}</div>
                <div style={{ fontSize:9,color:T.green }}>Bays avail.</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); setStation(s); go("detail"); }} className="tap"
                style={{ background:T.green,border:"none",borderRadius:8,
                  width:32,height:32,cursor:"pointer",fontSize:16,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>↗</button>
            </div>
          </div>
        ))}
        {search && filtered.length===0 && (
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>
            No stations found for "{search}"
          </div>
        )}
      </div>

      {/* Water banner */}
      <div style={{ margin:"0 14px 20px",background:"linear-gradient(135deg,#061824,#0a2030)",
        borderRadius:16,padding:"16px",border:`1px solid rgba(56,189,248,.2)`,
        display:"flex",alignItems:"center",gap:14 }}>
        <div style={{ fontSize:40 }}>💧</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.blue,marginBottom:4 }}>
            Every charge includes 20L Clean Water
          </div>
          <div style={{ fontSize:12,color:T.muted }}>Clean energy for your ride. Clean water for life.</div>
        </div>
        <div style={{ fontSize:20,color:T.muted }}>›</div>
      </div>

      {/* Bottom nav spacer */}
      <div style={{ height:80,flexShrink:0 }}/>

      {/* Fixed bottom nav */}
      <NewNav active="Home" go={go}/>
    </div>
  );
}


function Detail({ go, station, stations, setStation }) {
  const s = station||stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} sub={`${s.city} · Solar & Hydrogen`} onBack={()=>go("home")}/>
      <div style={{ margin:"12px 12px 0",borderRadius:16,overflow:"hidden",height:150,
        position:"relative",flexShrink:0,
        background:"linear-gradient(135deg,#0d1f0d,#091a14)",
        display:"flex",alignItems:"center",justifyContent:"center",gap:16 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36 }}>⚡</div>
          <div style={{ fontSize:11,color:T.green,fontWeight:600,marginTop:4 }}>{s.solar}% Solar</div>
        </div>
        <div style={{ width:1,height:50,background:T.border }}/>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36 }}>💧</div>
          <div style={{ fontSize:11,color:T.blue,fontWeight:600,marginTop:4 }}>{s.hydrogen}% H₂</div>
        </div>
        <div style={{ position:"absolute",bottom:10,left:14,display:"flex",gap:8 }}>
          <Badge label={`${s.open}/${s.bays} Open`} color={T.green}/>
          <Badge label={`Wait: ${s.time}`} color={T.yellow}/>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[
            { label:"Bays Open",value:`${s.open}/${s.bays}`,color:T.green  },
            { label:"Est. Wait",value:s.time,               color:T.yellow },
            { label:"Solar",    value:`${s.solar}%`,        color:T.blue   },
          ].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",
              border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontSize:9,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:.4 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:17,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ fontSize:13,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% H₂</span>
          </div>
          <div style={{ height:7,borderRadius:4,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:4 }}/>
          </div>
        </div>
        <button onClick={()=>go("vehicles")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:14,fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {Ico.bolt("#000")} Charge Here — Select Vehicle
        </button>
        <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:8 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="row" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#152410":T.card,
              border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,
              borderRadius:13,padding:"13px 14px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,color:T.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{st.city} · {st.bays} bays · {st.solar}% Solar</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button className="tap" onClick={e=>{ e.stopPropagation(); setStation(st); go("vehicles"); }}
                style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",
                  fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                Select
              </button>
            </div>
          </div>
        ))}
        <div style={{ height:18 }}/>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );
}

// ── VEHICLES ──────────────────────────────────────────────────
function Vehicles({ go, setVehicle, user }) {
  const [sel,setSel] = useState(null);
  const icons = { Car:"🚗", Scooter:"🛵", Tricycle:"🛺" };
  const gradients = {
    Car:      "linear-gradient(135deg,#0a2e14,#0d3d1a)",
    Scooter:  "linear-gradient(135deg,#0a1f2e,#0d2a3d)",
    Tricycle: "linear-gradient(135deg,#1a1f0a,#252d0d)",
  };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" sub="Choose your vehicle type" onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`} onClick={()=>setSel(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",
              border:`2px solid ${sel?.type===v.type?T.green:T.border}`,
              transition:"border-color .2s" }}>
            <div style={{ height:160,background:gradients[v.type],
              display:"flex",alignItems:"center",justifyContent:"center",
              position:"relative" }}>
              <div style={{ fontSize:90,filter:`drop-shadow(0 4px 16px rgba(74,222,128,.3))` }}>{icons[v.type]}</div>
              <div style={{ position:"absolute",bottom:10,left:14 }}>
                <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{v.type}</div>
                <div style={{ fontSize:11,color:T.mutedLight,marginTop:2 }}>{v.desc}</div>
              </div>
              {sel?.type===v.type&&(
                <div style={{ position:"absolute",top:12,right:12,width:28,height:28,
                  borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {Ico.check("#000")}
                </div>
              )}
              <div style={{ position:"absolute",bottom:10,right:14 }}>
                <div style={{ background:`${T.green}22`,border:`1px solid ${T.greenDim}`,borderRadius:8,
                  padding:"4px 10px",display:"flex",alignItems:"center",gap:4 }}>
                  {Ico.bolt(T.green)}
                  <span style={{ fontSize:10,color:T.green,fontWeight:600 }}>Solar</span>
                </div>
              </div>
            </div>
            <div style={{ padding:"12px 16px",background:T.card,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:800,fontSize:19,color:T.green }}>{v.price}</div>
              <Badge label="+ 20L Clean Water" color={T.blue}/>
            </div>
          </div>
        ))}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:.5 }}>Every charge includes</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            {Ico.bolt(T.green)}<span style={{ fontSize:13,color:T.text }}>Full vehicle charge via solar energy</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            {Ico.water(T.blue)}<span style={{ fontSize:13,color:T.text }}>20L clean desalinated water — free</span>
          </div>
        </div>
        <button onClick={()=>{ if(sel){ setVehicle(sel); go("booking"); } }} className="tap"
          style={{ width:"100%",
            background:sel?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,
            border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
            color:sel?"#000":T.muted,cursor:sel?"pointer":"not-allowed",
            marginBottom:16,fontFamily:"inherit",transition:"all .2s" }}>
          {sel?`Continue with ${sel.type} →`:"Select a vehicle to continue"}
        </button>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );
}

// ── BOOKING ───────────────────────────────────────────────────
function Booking({ go, station, vehicle, user, setBooking }) {
  const s = station||STATIONS[0];
  const now = new Date();
  const slots = (() => {
    const arr=[]; const t=new Date();
    t.setMinutes(Math.ceil(t.getMinutes()/30)*30,0,0);
    const end=new Date(); end.setHours(22,0,0,0);
    while(t<=end){ arr.push(new Date(t)); t.setMinutes(t.getMinutes()+30); }
    return arr;
  })();

  const [slotIdx,setSlotIdx]   = useState(0);
  const [durIdx,setDurIdx]     = useState(1);
  const [payHow,setPayHow]     = useState("now");
  const [name,setName]         = useState(user?.name||"");
  const [phone,setPhone]       = useState("");
  const [email,setEmail]       = useState(user?.email||"");
  const [loading,setLoad]      = useState(false);
  const [error,setErr]         = useState("");

  const dur = DURATIONS[durIdx];
  const total = (vehicle?.amount||175) + dur.extra;

  const book = async () => {
    if (!name.trim()) { setErr("Enter your name"); return; }
    if (!phone.trim()||phone.length<10) { setErr("Enter a valid phone number"); return; }
    if (!email.trim()||!email.includes("@")) { setErr("Enter a valid email"); return; }
    setLoad(true); setErr("");
    const ref = genRef();
    const data = {
      reference:ref, station:s.name, city:s.city,
      vehicle:vehicle?.type||"Car",
      slot_time:slots[slotIdx].toISOString(),
      duration_min:dur.value, amount:total,
      name, phone, email,
      pay_method:payHow,
      status:payHow==="now"?"pending_payment":"confirmed",
      created_at:new Date().toISOString(),
    };
    if (SUPABASE_URL) {
      await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.stringify(data) });
    }
    setBooking(data);
    try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
    if (payHow==="now") {
      window.location.href=`https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(email)}&amount=${total*100}`;
    } else {
      setLoad(false); go("qr");
    }
  };

  const inp=(ph,val,set,type="text")=>(
    <input type={type} placeholder={ph} value={val}
      onChange={e=>{ set(e.target.value); setErr(""); }}
      style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
        borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,marginBottom:10 }}/>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Book a Slot" sub={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        {/* Summary */}
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",
          borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <div style={{ fontSize:50 }}>{{ Car:"🚗",Scooter:"🛵",Tricycle:"🛺" }[vehicle?.type]||"🚗"}</div>
        </div>

        {/* Time slots */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Select Time — Today</div>
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
            {slots.slice(0,12).map((sl,i)=>(
              <button key={i} onClick={()=>setSlotIdx(i)} className="tap"
                style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,fontFamily:"inherit",
                  background:slotIdx===i?T.green:T.bg,
                  border:`1px solid ${slotIdx===i?T.green:T.border}`,
                  color:slotIdx===i?"#000":T.text,fontSize:13,fontWeight:slotIdx===i?700:500,cursor:"pointer" }}>
                {fmtTime(sl)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Charging Duration</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {DURATIONS.map((d,i)=>(
              <button key={i} onClick={()=>setDurIdx(i)} className="tap"
                style={{ padding:"12px",borderRadius:12,fontFamily:"inherit",textAlign:"left",
                  background:durIdx===i?"#0d2010":T.bg,
                  border:`1px solid ${durIdx===i?T.green:T.border}`,cursor:"pointer" }}>
                <div style={{ fontWeight:700,fontSize:15,color:durIdx===i?T.green:T.text }}>{d.label}</div>
                {d.extra>0&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>+GH₵{d.extra}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Summary</div>
          <Divider/>
          {[
            { label:"Time",     value:`${fmtTime(slots[slotIdx])} — ${fmtEndTime(slots[slotIdx],dur.value)}` },
            { label:"Duration", value:dur.label },
            { label:"Vehicle",  value:vehicle?.type||"Car" },
            { label:"Water",    value:"20L Clean Bundle" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text }}>Total</span>
            <span style={{ fontWeight:800,fontSize:22,color:T.green }}>GH₵{total}</span>
          </div>
        </div>

        {/* Contact */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Your Details</div>
          {inp("Full name",name,setName)}
          {inp("Phone number",phone,setPhone,"tel")}
          {inp("Email address",email,setEmail,"email")}
        </div>

        {/* Payment method */}
        <div className="fade3" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Payment</div>
          {[
            { id:"now",    label:"Pay now to confirm",  sub:"Instant booking via Paystack" },
            { id:"arrive", label:"Pay on arrival",      sub:"Reserve now, pay at station"  },
          ].map(m=>(
            <div key={m.id} className="tap row" onClick={()=>setPayHow(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRadius:12,marginBottom:8,
                background:payHow===m.id?"#132010":"transparent",
                border:`1px solid ${payHow===m.id?T.greenDim:T.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>{m.label}</div>
                <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.sub}</div>
              </div>
              <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,
                border:`2px solid ${payHow===m.id?T.green:T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {payHow===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>

        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.3)",
          borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12 }}>{error}</div>}

        <button onClick={book} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
            color:"#000",cursor:loading?"default":"pointer",marginBottom:20,fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
          {loading?<><Spinner/> Processing…</>:payHow==="now"?`Pay GH₵${total} & Confirm`:"Reserve — Pay on Arrival"}
        </button>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );
}

// ── QR SCREEN ─────────────────────────────────────────────────
function QRScreen({ go, booking }) {
  const b = booking;
  if (!b) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
        <div>
          <div style={{ fontSize:48,marginBottom:14 }}>🎫</div>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active Booking</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:20 }}>Complete a booking to get your QR pass</div>
          <button onClick={()=>go("home")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",
              borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
            Find a Station
          </button>
        </div>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );

  const qrData = encodeURIComponent(`${b.reference}|${b.station}|${b.vehicle}|${b.status}`);
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=10`;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" sub="Show this to the attendant" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 0" }}>
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",
          borderRadius:20,padding:24,textAlign:"center",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Booking Reference</div>
          <div style={{ fontWeight:800,fontSize:20,color:T.green,letterSpacing:1,marginBottom:16 }}>{b.reference}</div>
          <div style={{ background:"#0f1117",borderRadius:16,padding:12,display:"inline-block",
            border:`2px solid ${T.greenDim}`,marginBottom:12 }}>
            <img src={qrUrl} alt="QR" width={180} height={180} style={{ borderRadius:8,display:"block" }}/>
          </div>
          <div style={{ fontSize:12,color:T.muted }}>Attendant scans to activate your charger</div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Session Details</div>
          {[
            { label:"Station",  value:b.station  },
            { label:"Vehicle",  value:b.vehicle  },
            { label:"Duration", value:`${b.duration_min} min` },
            { label:"Amount",   value:`GH₵${b.amount}` },
            { label:"Payment",  value:b.pay_method==="now"?"Paid ✅":"Pay on Arrival" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",
              marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>go("verify")} className="tap"
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,
            borderRadius:14,padding:"13px",fontSize:13,fontWeight:600,
            color:T.mutedLight,cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>
          Attendant Verification Portal →
        </button>
        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit" }}>
          Back to Home
        </button>
      </div>
      <NewNav active="Stations" go={go}/>
    </div>
  );
}

// ── VERIFY ────────────────────────────────────────────────────
function Verify({ go }) {
  const [code,setCode]     = useState("");
  const [result,setResult] = useState(null);
  const [loading,setLoad]  = useState(false);
  const [error,setErr]     = useState("");

  const verify = async () => {
    if (!code.trim()) { setErr("Enter a booking reference"); return; }
    setLoad(true); setErr(""); setResult(null);
    try {
      // Extract just the reference — handles both "ECO-ABC123" and full QR string
      const raw = code.trim().toUpperCase();
      const ref = raw.includes("|") ? raw.split("|")[0].trim() : raw;
      const data = await sb(`bookings?reference=eq.${ref}&select=*`);
      if (!data||data.length===0) {
        setErr(`Booking "${ref}" not found. Make sure the booking was saved correctly.`);
      } else {
        const b = data[0];
        if (SUPABASE_URL) {
          await sb(`bookings?id=eq.${b.id}`,{
            method:"PATCH",headers:{ Prefer:"return=minimal" },
            body:JSON.stringify({ verified:true,verified_at:new Date().toISOString() }),
          });
        }
        setResult(b);
      }
    } catch(e) { setErr("Verification failed. Check internet connection."); }
    setLoad(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Verify Booking" sub="Attendant portal" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 0" }}>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Enter Booking Reference</div>
          <input placeholder="e.g. ECO-ABC123" value={code}
            onChange={e=>{ setCode(e.target.value.toUpperCase()); setErr(""); setResult(null); }}
            style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
              borderRadius:10,padding:"14px",color:T.text,fontSize:16,
              fontFamily:"monospace",letterSpacing:1,marginBottom:12 }}/>
          <button onClick={verify} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
              color:"#000",cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            {loading?<><Spinner/> Verifying…</>:"Verify Booking"}
          </button>
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.3)",
          borderRadius:12,padding:"12px 16px",marginBottom:12,color:T.red,fontSize:13 }}>{error}</div>}
        {result&&(
          <div className="fade" style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,
            borderRadius:16,padding:"16px",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
              <div style={{ width:48,height:48,borderRadius:"50%",background:T.green,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>✅</div>
              <div>
                <div style={{ fontWeight:800,fontSize:16,color:T.green }}>Verified — Activate Charger</div>
                <div style={{ fontSize:12,color:T.muted }}>Booking confirmed and valid</div>
              </div>
            </div>
            {[
              { label:"Name",     value:result.name     },
              { label:"Phone",    value:result.phone    },
              { label:"Vehicle",  value:result.vehicle  },
              { label:"Duration", value:`${result.duration_min} min` },
              { label:"Amount",   value:`GH₵${result.amount}` },
              { label:"Payment",  value:result.pay_method==="now"?"PAID ✅":`Collect GH₵${result.amount}` },
            ].map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",
                marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
              </div>
            ))}
            <div style={{ background:T.green,borderRadius:12,padding:"14px",textAlign:"center",marginTop:8 }}>
              <div style={{ fontWeight:800,fontSize:16,color:"#000" }}>⚡ ACTIVATE CHARGER NOW</div>
            </div>
          </div>
        )}
      </div>
      <NewNav active="More" go={go}/>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function Profile({ go, user, setUser, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" sub="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        {user ? (
          <>
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",
              borderRadius:18,padding:"22px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              <div style={{ width:68,height:68,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                {Ico.profile("#000")}
              </div>
              <div style={{ fontWeight:800,fontSize:19,color:T.text }}>{user.name||user.email?.split("@")[0]}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:5,marginBottom:10 }}>{user.email}</div>
              <Badge label="Active Member" color={T.green}/>
            </div>
            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
              {[
                { label:"Total Charges",  value:"0",    color:T.green  },
                { label:"CO₂ Saved",      value:"0 kg", color:T.green  },
                { label:"Water Received", value:"0 L",  color:T.blue   },
                { label:"Total Spent",    value:"GH₵0", color:T.yellow },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:13,padding:"14px",
                  border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:.4 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setUser(null)} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.25)",
                borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",
                marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
              {Ico.logout()} Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"30px 16px" }}>
            <Logo size={76}/>
            <div style={{ fontWeight:800,fontSize:21,color:T.text,marginTop:16,marginBottom:8 }}>Sign in to EcoCharge</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.7 }}>
              Track charges, view bookings,<br/>and see your environmental impact.
            </div>
            <button onClick={()=>go("auth")} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
                color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>Sign In / Register</button>
          </div>
        )}
      </div>
      <NewNav active="Profile" go={go}/>
    </div>
  );
}

// ── ABOUT ─────────────────────────────────────────────────────
function About({ go, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="About EcoCharge" sub="Our mission" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <Logo size={82}/>
          <div style={{ fontWeight:800,fontSize:22,color:T.text,marginTop:14 }}>EcoCharge Ghana</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>Solar Charging · Clean Water · Zero Emissions</div>
        </div>
        {[
          { icon:Ico.bolt(T.yellow), title:"Solar EV Charging",  text:"100% solar-powered stations across Ghana. Fast, clean and affordable for all vehicle types." },
          { icon:Ico.water(T.blue),  title:"Clean Water Access", text:"Every session includes 20L of clean desalinated water — two needs solved at once." },
          { icon:Ico.bolt(T.green),  title:"Zero Emissions",     text:"Our stations run on solar and hydrogen — zero carbon footprint, clean future." },
          { icon:Ico.profile(T.mutedLight), title:"Local Employment", text:"We train and employ local female technicians, building sustainable communities." },
        ].map((item,i)=>(
          <div key={i} className={`fade${i}`} style={{ background:T.card,borderRadius:14,padding:"16px",marginBottom:12,
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
            color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {Ico.bolt("#000")} Find a Station
        </button>
      </div>
      <NewNav active="More" go={go}/>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState(()=>{ try { return localStorage.getItem("eco_user")?"home":"splash"; } catch(e){ return "splash"; } });
  const [authMode, setAuthMode] = useState("login");
  const [station,  setStation]  = useState(null);
  const [vehicle,  setVehicle]  = useState(null);
  const [stations, setStations] = useState(STATIONS);
  const [booking,  setBooking]  = useState(()=>{ try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } });
  const [user,     setUserRaw]  = useState(()=>{ try { const u=localStorage.getItem("eco_user"); return u?JSON.parse(u):null; } catch(e){ return null; } });
  const [drawer,   setDrawer]   = useState(false);

  const setUser = (u) => {
    setUserRaw(u);
    try { u?localStorage.setItem("eco_user",JSON.stringify(u)):localStorage.removeItem("eco_user"); } catch(e){}
  };

  const go = (s) => { setScreen(s); setDrawer(false); };

  const goSecure = (s) => {
    const open = ["splash","auth","about","home","detail","verify"];
    if (!user&&!open.includes(s)) { setAuthMode("login"); go("auth"); return; }
    go(s);
  };

  useEffect(()=>{
    if (SUPABASE_URL) sb("stations?select=*&order=id").then(d=>{ if(d?.length) setStations(d); });
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference")||params.get("trxref");
    if (ref) { window.history.replaceState({},"",window.location.pathname); go("qr"); }
  },[]);

  const props = {
    go:goSecure, stations,
    station:station||stations[0],
    setStation, user, setUser,
    vehicle, setVehicle,
    booking, setBooking,
    onMenu:()=>setDrawer(true),
  };

  if (screen==="splash") return (
    <><style>{CSS}</style>
    <Splash
      onLogin={()=>{ setAuthMode("login"); go("auth"); }}
      onRegister={()=>{ setAuthMode("register"); go("auth"); }}
      onGuest={()=>go("home")}/>
    </>
  );

  if (screen==="auth") return (
    <><style>{CSS}</style>
    <Auth mode={authMode}
      onBack={(mode)=>{ if(mode){ setAuthMode(mode); } else { go("splash"); } }}
      onSuccess={(u)=>{ setUser(u); go("home"); }}/>
    </>
  );

  const views = {
    home:     <Home      {...props}/>,
    map:      <MapScreen {...props}/>,
    detail:   <Detail    {...props}/>,
    vehicles: <Vehicles  {...props}/>,
    booking:  <Booking   {...props}/>,
    qr:       <QRScreen  {...props}/>,
    verify:   <Verify    {...props}/>,
    profile:  <Profile   {...props}/>,
    about:    <About     {...props}/>,
    bookings: <Detail    {...props}/>,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"relative",height:"100vh",overflow:"hidden",background:T.bg }}>
        <Drawer open={drawer} onClose={()=>setDrawer(false)}
          go={goSecure} user={user}
          onLogout={()=>{ setUser(null); go("splash"); }}/>
        <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {views[screen]||views.home}
        </div>
      </div>
    </>
  );
}
