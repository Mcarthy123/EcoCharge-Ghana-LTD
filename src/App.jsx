// ============================================================
//  EcoChargeCar — App.jsx
//  Fixed: Paystack inline, logo, login required flow
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

// No external images — using clean SVG illustrations that always work
const VEHICLE_GRADIENTS = {
  Car:      "linear-gradient(135deg, #0a2e14 0%, #0d3d1a 50%, #071a0d 100%)",
  Scooter:  "linear-gradient(135deg, #0a1f2e 0%, #0d2a3d 50%, #071218 100%)",
  Tricycle: "linear-gradient(135deg, #1a1f0a 0%, #252d0d 50%, #111507 100%)",
};
const STATION_BG = "linear-gradient(135deg, #0a1f12 0%, #0d2d1a 50%, #071a0d 100%)";

const FALLBACK_STATIONS = [
  { id:1, name:"Accra Central",  bays:6, open:6, solar:85, hydrogen:15, time:"23m", lat:"38%", lng:"54%", city:"Accra",      lat_coord:5.5502,  lng_coord:-0.2174 },
  { id:2, name:"Kumasi Hub",     bays:4, open:3, solar:90, hydrogen:10, time:"12m", lat:"26%", lng:"37%", city:"Kumasi",     lat_coord:6.6885,  lng_coord:-1.6244 },
  { id:3, name:"Tema Station",   bays:8, open:8, solar:75, hydrogen:25, time:"8m",  lat:"50%", lng:"68%", city:"Tema",       lat_coord:5.6698,  lng_coord:0.0166  },
  { id:4, name:"Takoradi",       bays:3, open:2, solar:80, hydrogen:20, time:"31m", lat:"22%", lng:"58%", city:"Takoradi",   lat_coord:4.9016,  lng_coord:-1.7648 },
  { id:5, name:"Tamale North",   bays:5, open:5, solar:95, hydrogen:5,  time:"45m", lat:"17%", lng:"24%", city:"Tamale",     lat_coord:9.4034,  lng_coord:-0.8424 },
  { id:6, name:"Sunyani East",   bays:2, open:1, solar:70, hydrogen:30, time:"19m", lat:"42%", lng:"19%", city:"Sunyani",    lat_coord:7.3349,  lng_coord:-2.3284 },
  { id:7, name:"Cape Coast",     bays:6, open:6, solar:88, hydrogen:12, time:"27m", lat:"72%", lng:"52%", city:"Cape Coast", lat_coord:5.1053,  lng_coord:-1.2466 },
  { id:8, name:"Ho District",    bays:4, open:3, solar:82, hydrogen:18, time:"15m", lat:"68%", lng:"74%", city:"Ho",         lat_coord:6.6011,  lng_coord:0.4717  },
];

const VEHICLES = [
  { type:"Car",      price:"GH₵140–210", amount:175, desc:"Full EV sedan — solar powered",  icon:"🚗" },
  { type:"Scooter",  price:"GH₵8–15",   amount:12,  desc:"Electric scooter fast charge",    icon:"🛵" },
  { type:"Tricycle", price:"GH₵18–28",  amount:23,  desc:"Cargo tricycle — station charge", icon:"🛺" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { height:100%; }
  body { font-family:'Inter',sans-serif; background:#0f1117; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes spin { to{transform:rotate(360deg)} }
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

const Icon = {
  home:    (c="#9ca3af")=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  station: (c="#9ca3af")=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M19.77 7.23l-.01.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 15H6v-4h6v4zm0-6H6V5h6v4z"/></svg>,
  profile: (c="#9ca3af")=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  more:    (c="#9ca3af")=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  bolt:    (c=T.green)=><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M13 2L4.09 12.97H11L10 22L20.91 11.03H14L13 2Z"/></svg>,
  water:   (c=T.blue)=><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z"/></svg>,
  leaf:    (c=T.green)=><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M17 8C8 10 5.9 16.17 3.82 19.82a2 2 0 103.09 2.5C9 19.5 11 14 17 12v4l5-5-5-5v2z"/></svg>,
  back:    ()=><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  check:   (c=T.green)=><svg width="20" height="20" viewBox="0 0 24 24" fill={c}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  arrow:   (c="#4b5563")=><svg width="16" height="16" viewBox="0 0 24 24" fill={c}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  logout:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  pin:     (c=T.green)=><svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={c}/><circle cx="14" cy="14" r="6" fill="#0f1117"/><path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill={c}/></svg>,
};

// ── LOGO COMPONENT — tries image first, falls back to SVG ─────
const LogoImg = ({ size=34 }) => {
  const [err, setErr] = useState(false);
  if (!err) return (
    <img src="/logo.png" alt="EcoCharge"
      style={{ width:size, height:size, objectFit:"contain", borderRadius:8, flexShrink:0 }}
      onError={()=>setErr(true)}/>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:8, flexShrink:0,
      background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.5 }}>
      {Icon.bolt("#000")}
    </div>
  );
};

const LogoLarge = ({ size=70 }) => {
  const [err, setErr] = useState(false);
  if (!err) return (
    <img src="/logo.png" alt="EcoCharge"
      style={{ width:size, height:size, objectFit:"contain", marginBottom:12 }}
      onError={()=>setErr(true)}/>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:16,
      background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
      display:"flex", alignItems:"center", justifyContent:"center",
      margin:"0 auto 12px", fontSize:size*0.45 }}>
      {Icon.bolt("#000")}
    </div>
  );
};

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

// ── SPLASH / ONBOARDING ───────────────────────────────────────
function SplashScreen({ onLogin, onRegister, onGuest }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,
      alignItems:"center",justifyContent:"center",padding:"40px 28px" }}>
      <div className="fade" style={{ textAlign:"center",marginBottom:40 }}>
        <LogoLarge size={90}/>
        <div style={{ fontWeight:800,fontSize:28,color:T.text,letterSpacing:-0.5 }}>EcoCharge</div>
        <div style={{ fontWeight:600,fontSize:16,color:T.green,marginTop:4 }}>Ghana</div>
        <div style={{ fontSize:13,color:T.muted,marginTop:12,lineHeight:1.7 }}>
          Solar EV Charging · Clean Water<br/>Zero Emissions · Ghana
        </div>
      </div>

      <div className="fade1" style={{ width:"100%" }}>
        <button onClick={onLogin} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>
          Sign In
        </button>
        <button onClick={onRegister} className="tap"
          style={{ width:"100%",background:"transparent",border:`1px solid ${T.border}`,
            borderRadius:14,padding:"16px",fontSize:16,fontWeight:600,
            color:T.text,cursor:"pointer",marginBottom:16,fontFamily:"inherit" }}>
          Create Account
        </button>
        <button onClick={onGuest} className="tap"
          style={{ width:"100%",background:"none",border:"none",
            fontSize:13,fontWeight:500,color:T.muted,cursor:"pointer",fontFamily:"inherit" }}>
          Continue as Guest →
        </button>
      </div>

      <div className="fade2" style={{ marginTop:32,display:"flex",gap:24 }}>
        {[
          { icon:Icon.bolt(T.green),  label:"Solar Power" },
          { icon:Icon.water(T.blue),  label:"Clean Water" },
          { icon:Icon.leaf(T.green),  label:"Zero CO₂"    },
        ].map(f=>(
          <div key={f.label} style={{ textAlign:"center" }}>
            <div style={{ marginBottom:4 }}>{f.icon}</div>
            <div style={{ fontSize:10,color:T.muted }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function AuthScreen({ mode, onBack, onSuccess }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const authCall = async (endpoint, body) => {
    if (!SUPABASE_URL) return { access_token:"demo", id:"demo" };
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
    const d = await authCall("token?grant_type=password",{ email, password });
    if (d.access_token) {
      onSuccess({ email, name:email.split("@")[0], token:d.access_token });
    } else {
      setError(d.error_description||"Invalid email or password.");
    }
    setLoading(false);
  };

  const doRegister = async () => {
    if (!name||!email||!password) { setError("Please fill in all fields"); return; }
    if (password.length<6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const d = await authCall("signup",{ email, password, data:{ full_name:name } });
    if (d.id||d.user||d.access_token) {
      onSuccess({ email, name, token: d.access_token||"demo" });
    } else {
      setError(d.msg||d.error_description||"Registration failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"14px 18px 13px",display:"flex",alignItems:"center",gap:12,
        borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <button onClick={onBack} className="tap"
          style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          {Icon.back()}
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>
            {mode==="login"?"Sign In":"Create Account"}
          </div>
          <div style={{ fontSize:10,color:T.muted }}>EcoCharge Ghana</div>
        </div>
        <LogoImg size={34}/>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"30px 24px 0" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <LogoLarge size={64}/>
          <div style={{ fontWeight:800,fontSize:20,color:T.text }}>
            {mode==="login"?"Welcome Back!":"Join EcoCharge"}
          </div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>
            {mode==="login"?"Sign in to your account":"Create your free account today"}
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"20px",border:`1px solid ${T.border}` }}>
          {mode==="register" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,color:T.muted,marginBottom:6,fontWeight:600 }}>Full Name</div>
              <input placeholder="Your full name" value={name}
                onChange={e=>{ setName(e.target.value); setError(""); }}
                style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                  borderRadius:10,padding:"13px 14px",color:T.text,fontSize:14 }}/>
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6,fontWeight:600 }}>Email Address</div>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e=>{ setEmail(e.target.value); setError(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                borderRadius:10,padding:"13px 14px",color:T.text,fontSize:14 }}/>
          </div>
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6,fontWeight:600 }}>Password</div>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e=>{ setPassword(e.target.value); setError(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                borderRadius:10,padding:"13px 14px",color:T.text,fontSize:14 }}/>
          </div>

          {error && (
            <div style={{ background:"rgba(248,113,113,0.08)",border:`1px solid rgba(248,113,113,0.3)`,
              borderRadius:10,padding:"10px 14px",marginBottom:14,color:T.red,fontSize:12,fontWeight:500 }}>
              {error}
            </div>
          )}

          <button onClick={mode==="login"?doLogin:doRegister} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
              border:"none",borderRadius:12,padding:"15px",fontSize:15,fontWeight:700,
              color:"#000",cursor:"pointer",opacity:loading?0.7:1,fontFamily:"inherit" }}>
            {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DRAWER ────────────────────────────────────────────────────
const Drawer = ({ open, onClose, go, user, onLogout }) => (
  <>
    {open && <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,animation:"fadeIn 0.25s ease" }}/>}
    <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,background:T.card,zIndex:201,
      borderRight:`1px solid ${T.border}`,transform:open?"translateX(0)":"translateX(-100%)",
      transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"52px 20px 20px",background:"linear-gradient(135deg,#0a1f12,#0f2b1a)",borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18 }}>
          <LogoImg size={48}/>
          <div>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>EcoCharge</div>
            <div style={{ fontSize:11,color:T.muted }}>Ghana · Clean Energy</div>
          </div>
        </div>
        {user
          ? <div style={{ background:"rgba(74,222,128,0.08)",borderRadius:10,padding:"10px 14px",border:`1px solid ${T.greenDim}` }}>
              <div style={{ fontSize:11,color:T.muted }}>Signed in as</div>
              <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
          : <button onClick={()=>{ go("splash"); onClose(); }} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Sign In / Register
            </button>
        }
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        {[
          { icon:Icon.home(T.mutedLight),    label:"Find Stations",   screen:"home"    },
          { icon:Icon.station(T.mutedLight), label:"Station List",    screen:"detail"  },
          { icon:Icon.profile(T.mutedLight), label:"My Profile",      screen:"profile" },
          { icon:Icon.more(T.mutedLight),    label:"About EcoCharge", screen:"about"   },
        ].map(item=>(
          <div key={item.label} className="tap rowcard" onClick={()=>{ go(item.screen); onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${T.border}30` }}>
            {item.icon}
            <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
            {Icon.arrow()}
          </div>
        ))}
      </div>
      {user && (
        <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>{ onLogout(); onClose(); }} className="tap"
            style={{ width:"100%",background:"rgba(248,113,113,0.08)",border:`1px solid rgba(248,113,113,0.3)`,
              borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,color:T.red,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
            {Icon.logout()} Sign Out
          </button>
        </div>
      )}
    </div>
  </>
);

const NavBar = ({ active, go }) => {
  const tabs = [
    { label:"Home",     screen:"home",    icon:Icon.home    },
    { label:"Stations", screen:"detail",  icon:Icon.station },
    { label:"Profile",  screen:"profile", icon:Icon.profile },
    { label:"More",     screen:"about",   icon:Icon.more    },
  ];
  return (
    <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 22px",
      borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0 }}>
      {tabs.map(({ label,screen,icon })=>(
        <button key={label} onClick={()=>go(screen)} className="tap"
          style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
            flexDirection:"column",alignItems:"center",gap:4,minWidth:56,
            color:active===label?T.green:T.muted,fontSize:10,fontWeight:active===label?700:500,fontFamily:"inherit" }}>
          {icon(active===label?T.green:T.muted)}
          {label}
          {active===label && <div style={{ width:4,height:4,borderRadius:"50%",background:T.green,marginTop:-2 }}/>}
        </button>
      ))}
    </div>
  );
};

const Header = ({ title, subtitle, onBack, onMenu }) => (
  <div style={{ padding:"14px 18px 13px",display:"flex",alignItems:"center",gap:12,
    borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:4 }}>{Icon.back()}</button>
      : <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:5,padding:4 }}>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:16,height:2,background:T.mutedLight,borderRadius:2 }}/>
          <div style={{ width:22,height:2,background:T.mutedLight,borderRadius:2 }}/>
        </button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{subtitle}</div>}
    </div>
    <LogoImg size={34}/>
  </div>
);

function HomeScreen({ go, stations, setStation, onMenu, user }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if (window.L) { initMap(); return; }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (mapInstanceRef.current || !mapRef.current) return;
      const L = window.L;

      // Center on Ghana
      const map = L.map(mapRef.current, {
        center: [7.9465, -1.0232],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom green marker
      const greenIcon = L.divIcon({
        html: `<div style="width:28px;height:36px">
          <svg viewBox="0 0 28 36">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#4ade80"/>
            <circle cx="14" cy="14" r="6" fill="#0f1117"/>
            <path d="M14 7l-3.5 5h2.5l-1 5 5-6h-2.5L14 7z" fill="#4ade80"/>
          </svg>
        </div>`,
        className: "",
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
      });

      // Add markers for each station
      stations.forEach(s => {
        if (!s.lat_coord || !s.lng_coord) return;
        const marker = L.marker([s.lat_coord, s.lng_coord], { icon: greenIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <strong style="font-size:14px">${s.name}</strong><br/>
            <span style="color:#22c55e;font-size:12px">${s.open}/${s.bays} bays open</span><br/>
            <span style="font-size:11px;color:#6b7280">Wait: ${s.time}</span>
          </div>
        `);
        marker.on("click", () => {
          setStation(s);
          go("detail");
        });
      });

      mapInstanceRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="EcoChargeCar" subtitle="Find a charging station near you" onMenu={onMenu}/>
      {user && (
        <div style={{ margin:"10px 14px 0",background:"linear-gradient(135deg,#0d2218,#112b1a)",
          borderRadius:12,padding:"10px 14px",border:`1px solid ${T.greenDim}`,
          display:"flex",alignItems:"center",gap:10 }}>
          {Icon.profile(T.green)}
          <span style={{ fontSize:13,color:T.text,fontWeight:500 }}>
            Welcome, <strong style={{ color:T.green }}>{user.name||user.email?.split("@")[0]}</strong>
          </span>
        </div>
      )}

      {/* Real Leaflet Map */}
      <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,overflow:"hidden" }}>
        <div ref={mapRef} style={{ width:"100%",height:"100%" }}/>

        {/* Station count pill */}
        <div style={{ position:"absolute",top:14,right:14,zIndex:1000,
          background:"rgba(15,17,23,0.85)",backdropFilter:"blur(8px)",
          borderRadius:20,padding:"5px 12px",fontSize:11,color:T.green,
          fontWeight:700,border:`1px solid ${T.border}` }}>
          {stations.length} stations
        </div>

        {/* Station cards at bottom */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:1000,
          background:"linear-gradient(0deg,rgba(9,14,26,0.98) 0%,transparent 100%)",
          padding:"24px 12px 12px" }}>
          <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:2 }}>
            {stations.map(s=>(
              <div key={s.id} className="tap" onClick={()=>{ setStation(s); go("detail"); }}
                style={{ background:"rgba(26,29,39,0.95)",backdropFilter:"blur(8px)",
                  borderRadius:12,padding:"10px 14px",border:`1px solid ${T.border}`,
                  flexShrink:0,minWidth:150 }}>
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

function DetailScreen({ go, station, stations, setStation }) {
  const s = station || stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} subtitle={`${s.city} · Solar & Hydrogen`} onBack={()=>go("home")}/>
      <div style={{ margin:"12px 12px 0",borderRadius:16,overflow:"hidden",height:155,
        position:"relative",flexShrink:0,background:STATION_BG,
        display:"flex",alignItems:"center",justifyContent:"center" }}>
        {/* Decorative elements */}
        <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,
          borderRadius:"50%",background:"rgba(74,222,128,0.05)" }}/>
        <div style={{ position:"absolute",bottom:-30,left:-30,width:150,height:150,
          borderRadius:"50%",background:"rgba(56,189,248,0.05)" }}/>
        {/* Station visual */}
        <div style={{ display:"flex",gap:16,alignItems:"flex-end",zIndex:1 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
              <div style={{ width:28,height:70,background:"linear-gradient(180deg,#1a3a2a,#0d2218)",
                borderRadius:8,border:`1px solid ${T.greenDim}`,position:"relative",
                display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8,gap:4 }}>
                <div style={{ width:14,height:10,background:T.green,borderRadius:3,opacity:0.9 }}/>
                <div style={{ width:10,height:8,background:"#38bdf8",borderRadius:2,opacity:0.7 }}/>
                <div style={{ position:"absolute",bottom:6,width:4,height:14,
                  background:T.green,borderRadius:2,opacity:0.8 }}/>
              </div>
              <div style={{ width:4,height:20,background:T.greenDim,borderRadius:2 }}/>
            </div>
          ))}
        </div>
        {/* Badges */}
        <div style={{ position:"absolute",bottom:12,left:14,display:"flex",gap:8 }}>
          <Badge color={T.green}>{s.open}/{s.bays} Bays Open</Badge>
          <Badge color={T.yellow}>Wait: {s.time}</Badge>
        </div>
        {/* Solar label */}
        <div style={{ position:"absolute",top:12,right:14 }}>
          <Badge color={T.blue}>{s.solar}% Solar</Badge>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[
            { label:"Bays Open", value:`${s.open}/${s.bays}`, color:T.green  },
            { label:"Est. Wait", value:s.time,                 color:T.yellow },
            { label:"Solar",     value:`${s.solar}%`,          color:T.blue   },
          ].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontSize:9,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.4 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:17,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <span style={{ fontSize:13,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% Hydrogen</span>
          </div>
          <div style={{ height:7,borderRadius:4,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:4 }}/>
          </div>
        </div>
        <button onClick={()=>go("vehicles")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
          {Icon.bolt("#000")} Charge Here — Select Vehicle
        </button>
        <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:10 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="rowcard" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#152410":T.card,border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,borderRadius:13,padding:"13px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,color:T.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:3 }}>{st.city} · {st.bays} bays · {st.solar}% Solar</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button className="tap" onClick={e=>{ e.stopPropagation(); setStation(st); go("vehicles"); }}
                style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
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

function VehicleScreen({ go, setVehicle }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" subtitle="Choose your vehicle type" onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`} onClick={()=>setSelected(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",
              border:`2px solid ${selected?.type===v.type?T.green:T.border}`,
              background:selected?.type===v.type?"#0d2010":T.card,
              transition:"border-color 0.2s,background 0.2s" }}>
            {/* Gradient card with icon */}
            <div style={{ height:160,position:"relative",overflow:"hidden",
              background:VEHICLE_GRADIENTS[v.type]||T.card,
              display:"flex",alignItems:"center",justifyContent:"center" }}>
              {/* Decorative circles */}
              <div style={{ position:"absolute",top:-30,right:-30,width:140,height:140,
                borderRadius:"50%",background:"rgba(74,222,128,0.06)" }}/>
              <div style={{ position:"absolute",bottom:-20,left:-20,width:100,height:100,
                borderRadius:"50%",background:"rgba(74,222,128,0.04)" }}/>
              {/* Big vehicle icon */}
              <div style={{ fontSize:90,filter:"drop-shadow(0 4px 16px rgba(74,222,128,0.3))",
                position:"relative",zIndex:1 }}>{v.icon}</div>
              {/* Charging bolt overlay */}
              <div style={{ position:"absolute",bottom:12,right:14,
                background:"rgba(74,222,128,0.15)",borderRadius:10,padding:"4px 10px",
                display:"flex",alignItems:"center",gap:6,border:`1px solid ${T.greenDim}` }}>
                {Icon.bolt(T.green)}
                <span style={{ fontSize:11,color:T.green,fontWeight:600 }}>Solar Powered</span>
              </div>
              {selected?.type===v.type && (
                <div style={{ position:"absolute",top:12,right:12,width:30,height:30,
                  borderRadius:"50%",background:T.green,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {Icon.check("#000")}
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                <div>
                  <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{v.type}</div>
                  <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{v.desc}</div>
                </div>
                <div style={{ fontWeight:800,fontSize:20,color:T.green }}>{v.price}</div>
              </div>
              <Badge color={T.blue}>+ 20L Clean Water</Badge>
            </div>
          </div>
        ))}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Every charge includes</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>{Icon.bolt(T.green)}<span style={{ fontSize:13,color:T.text }}>Full vehicle charge via solar energy</span></div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>{Icon.water(T.blue)}<span style={{ fontSize:13,color:T.text }}>20L clean desalinated water — free</span></div>
        </div>
        <button onClick={()=>{ if(selected){ setVehicle(selected); go("booking"); } }} className="tap"
          style={{ width:"100%",background:selected?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:selected?"#000":T.muted,cursor:selected?"pointer":"not-allowed",marginBottom:16,transition:"all 0.2s",fontFamily:"inherit" }}>
          {selected?`Continue with ${selected.type}  →`:"Select a vehicle to continue"}
        </button>
      </div>
      <NavBar active="Stations" go={go}/>
    </div>
  );
}

function PaymentScreen({ go, vehicle, station, user }) {
  const [method,  setMethod]  = useState("mtn");
  const [email,   setEmail]   = useState(user?.email||"");
  const [paying,  setPaying]  = useState(false);
  const [paid,    setPaid]    = useState(false);
  const [error,   setError]   = useState("");
  const paystackLoaded = useRef(false);

  const amount = vehicle?.amount || 175;
  const s = station || FALLBACK_STATIONS[0];

  // Load Paystack script
  useEffect(()=>{
    if (window.PaystackPop) { paystackLoaded.current=true; return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = ()=>{ paystackLoaded.current=true; };
    document.head.appendChild(script);
  },[]);

  // Check for Paystack redirect return
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference")||params.get("trxref");
    if (ref) {
      setPaid(true);
      window.history.replaceState({},"",window.location.pathname);
    }
  },[]);

  const tryPay = () => {
    if (!email||!email.includes("@")) { setError("Please enter a valid email"); return; }
    setError(""); setPaying(true);
    // Use existing Paystack payment page — already working!
    setTimeout(() => {
      window.location.href = `https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(email)}&amount=${amount * 100}`;
    }, 800);
  };

  const METHODS = [
    { id:"mtn",      label:"MTN Mobile Money" },
    { id:"vodafone", label:"Vodafone Cash"     },
    { id:"airtel",   label:"AirtelTigo Cash"   },
  ];
  const MCOLORS = { mtn:"#fbbf24", vodafone:"#f87171", airtel:"#60a5fa" };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Payment" subtitle="Secure checkout via Paystack" onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        <div className="fade" style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Order Summary</div>
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ color:T.muted,fontSize:13 }}>{vehicle?.type||"Vehicle"} Charging — {s.name}</span>
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

        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600 }}>Email for receipt</div>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e=>{ setEmail(e.target.value); setError(""); }}
            style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14 }}/>
        </div>

        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Mobile Money</div>
          {METHODS.map(m=>(
            <div key={m.id} className="tap rowcard" onClick={()=>setMethod(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRadius:12,marginBottom:8,background:method===m.id?"#132010":"transparent",border:`1px solid ${method===m.id?T.greenDim:T.border}`,transition:"all 0.15s" }}>
              <div style={{ width:12,height:12,borderRadius:"50%",background:MCOLORS[m.id],flexShrink:0,boxShadow:`0 0 8px ${MCOLORS[m.id]}80` }}/>
              <span style={{ flex:1,color:T.text,fontSize:14,fontWeight:500 }}>{m.label}</span>
              <div style={{ width:20,height:20,borderRadius:"50%",border:`2px solid ${method===m.id?T.green:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {method===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ background:"rgba(248,113,113,0.08)",border:`1px solid rgba(248,113,113,0.3)`,borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12,fontWeight:500 }}>{error}</div>}

        {!paid ? (
          <button onClick={tryPay} disabled={paying} className="tap"
            style={{ width:"100%",background:paying?"#0d2218":`linear-gradient(135deg,${T.green},${T.greenDark})`,border:paying?`1px solid ${T.greenDim}`:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,color:paying?T.green:"#000",cursor:paying?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.2s",fontFamily:"inherit" }}>
            {paying
              ? <><span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",display:"inline-block",animation:"spin 0.8s linear infinite" }}/> Opening Paystack…</>
              : <>{Icon.bolt("#000")} Pay GH₵{amount} via Paystack</>
            }
          </button>
        ) : (
          <div style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,borderRadius:16,padding:"24px",textAlign:"center",marginBottom:12 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
              {Icon.check("#000")}
            </div>
            <div style={{ color:T.green,fontWeight:800,fontSize:19,marginBottom:6 }}>Payment Successful!</div>
            <div style={{ color:T.mutedLight,fontSize:13,lineHeight:1.6,marginBottom:16 }}>Bay assigned · Your charging session is starting.</div>
            <button onClick={()=>go("home")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px 28px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Back to Map
            </button>
          </div>
        )}

        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:20,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Your Impact This Session</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>{Icon.leaf(T.green)}<span style={{ fontWeight:700,fontSize:13,color:T.green }}>~3.2 kg CO₂ saved</span></div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>{Icon.water(T.blue)}<span style={{ fontSize:12,color:T.blue,fontWeight:600 }}>20L water</span></div>
          </div>
        </div>
      </div>
      <NavBar active="Stations" go={go}/>
    </div>
  );
}

function ProfileScreen({ go, user, setUser, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" subtitle="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        {user ? (
          <>
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",borderRadius:18,padding:"22px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              <div style={{ width:68,height:68,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                {Icon.profile("#000")}
              </div>
              <div style={{ fontWeight:800,fontSize:19,color:T.text }}>{user.name||user.email?.split("@")[0]}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:5,marginBottom:10 }}>{user.email}</div>
              <Badge color={T.green}>Active Member</Badge>
            </div>
            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
              {[
                { label:"Total Charges",  value:"0",    color:T.green  },
                { label:"CO₂ Saved",      value:"0 kg", color:T.green  },
                { label:"Water Received", value:"0 L",  color:T.blue   },
                { label:"Total Spent",    value:"GH₵0", color:T.yellow },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:13,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.4 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setUser(null)} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,0.07)",border:`1px solid rgba(248,113,113,0.25)`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
              {Icon.logout()} Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"30px 16px" }}>
            <LogoLarge size={76}/>
            <div style={{ fontWeight:800,fontSize:21,color:T.text,marginBottom:8 }}>Sign in to EcoCharge</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.7 }}>Track charges, view bookings,<br/>and see your environmental impact.</div>
            <button onClick={()=>go("splash")} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>
              Sign In / Register
            </button>
          </div>
        )}
      </div>
      <NavBar active="Profile" go={go}/>
    </div>
  );
}

function AboutScreen({ go, onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="About EcoCharge" subtitle="Our mission" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 0" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <LogoLarge size={82}/>
          <div style={{ fontWeight:800,fontSize:22,color:T.text }}>EcoCharge Ghana</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>Solar Charging · Clean Water · Zero Emissions</div>
        </div>
        {[
          { icon:Icon.bolt(T.yellow), title:"Solar EV Charging",  text:"100% solar-powered stations across Ghana. Fast, clean and affordable for all vehicle types." },
          { icon:Icon.water(T.blue),  title:"Clean Water Access", text:"Every session includes 20L of clean desalinated water — two needs solved at once." },
          { icon:Icon.leaf(T.green),  title:"Zero Emissions",     text:"Our stations run on solar and hydrogen — zero carbon footprint, clean future." },
          { icon:Icon.profile(T.mutedLight), title:"Local Employment", text:"We train and employ local female technicians, building sustainable communities." },
        ].map((item,i)=>(
          <div key={i} className={`fade${i}`} style={{ background:T.card,borderRadius:14,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ flexShrink:0,marginTop:2 }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:5 }}>{item.title}</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{item.text}</div>
            </div>
          </div>
        ))}
        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
          {Icon.bolt("#000")} Find a Station
        </button>
      </div>
      <NavBar active="More" go={go}/>
    </div>
  );
}

// ── BOOKING SCREEN ────────────────────────────────────────────
function BookingScreen({ go, station, vehicle, user }) {
  const s = station || FALLBACK_STATIONS[0];
  const now = new Date();

  // Generate time slots from now until end of day (every 30 mins)
  const generateSlots = () => {
    const slots = [];
    const start = new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0);
    const end = new Date();
    end.setHours(22, 0, 0, 0);
    while (start <= end) {
      slots.push(new Date(start));
      start.setMinutes(start.getMinutes() + 30);
    }
    return slots;
  };

  const slots = generateSlots();
  const durations = [
    { label:"30 min",  value:30,  price:0    },
    { label:"1 hour",  value:60,  price:5    },
    { label:"2 hours", value:120, price:10   },
    { label:"3 hours", value:180, price:15   },
  ];

  const [selectedSlot,     setSelectedSlot]     = useState(slots[0]);
  const [selectedDuration, setSelectedDuration] = useState(durations[1]);
  const [payMethod,        setPayMethod]         = useState("now");
  const [name,             setName]              = useState(user?.name||"");
  const [phone,            setPhone]             = useState("");
  const [email,            setEmail]             = useState(user?.email||"");
  const [booked,           setBooked]            = useState(false);
  const [booking,          setBooking]           = useState(null);
  const [loading,          setLoading]           = useState(false);
  const [error,            setError]             = useState("");

  const baseAmount = vehicle?.amount || 175;
  const totalAmount = baseAmount + selectedDuration.price;

  const formatTime = (d) => d.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit", hour12:true });
  const formatEndTime = (d, mins) => {
    const end = new Date(d.getTime() + mins * 60000);
    return formatTime(end);
  };

  const generateRef = () => `ECO-BK-${Date.now().toString(36).toUpperCase()}`;

  const handleBook = async () => {
    if (!name) { setError("Please enter your name"); return; }
    if (!phone || phone.length < 10) { setError("Please enter a valid phone number"); return; }
    if (!email || !email.includes("@")) { setError("Please enter a valid email"); return; }
    setError(""); setLoading(true);

    const ref = generateRef();
    const bookingData = {
      reference:    ref,
      station:      s.name,
      city:         s.city,
      vehicle:      vehicle?.type || "Car",
      slot_time:    selectedSlot.toISOString(),
      duration_min: selectedDuration.value,
      amount:       totalAmount,
      name,
      phone,
      email,
      pay_method:   payMethod,
      status:       payMethod === "now" ? "pending_payment" : "confirmed",
      created_at:   new Date().toISOString(),
    };

    // Save to Supabase
    if (SUPABASE_URL) {
      await sb("bookings", {
        method: "POST",
        headers: { Prefer:"return=minimal" },
        body: JSON.stringify(bookingData),
      }).catch(()=>{});
    }

    setBooking({ ...bookingData });

    if (payMethod === "now") {
      setLoading(false);
      // Redirect to Paystack
      window.location.href = `https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(email)}&amount=${totalAmount * 100}`;
    } else {
      setLoading(false);
      setBooked(true);
    }
  };

  if (booked && booking) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Booking Confirmed!" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 0" }}>
        <div className="fade" style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,
          borderRadius:18,padding:24,textAlign:"center",marginBottom:16 }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:T.green,
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
            {Icon.check("#000")}
          </div>
          <div style={{ color:T.green,fontWeight:800,fontSize:20,marginBottom:6 }}>Booking Confirmed!</div>
          <div style={{ color:T.mutedLight,fontSize:13,marginBottom:16 }}>Your slot is reserved</div>
          <div style={{ background:"rgba(74,222,128,0.08)",borderRadius:12,padding:"12px 16px",
            border:`1px solid ${T.greenDim}`,marginBottom:12 }}>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking Reference</div>
            <div style={{ fontWeight:800,fontSize:18,color:T.green,letterSpacing:1 }}>{booking.reference}</div>
          </div>
        </div>

        {/* Booking details */}
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Booking Details</div>
          {[
            { label:"Station",   value:booking.station },
            { label:"Vehicle",   value:booking.vehicle },
            { label:"Time",      value:`${formatTime(new Date(booking.slot_time))} — ${formatEndTime(new Date(booking.slot_time), booking.duration_min)}` },
            { label:"Duration",  value:`${booking.duration_min} minutes` },
            { label:"Name",      value:booking.name },
            { label:"Phone",     value:booking.phone },
            { label:"Payment",   value:"Pay on arrival" },
            { label:"Amount",    value:`GH₵${booking.amount}` },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",
              marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:16,
          border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:6,fontWeight:600 }}>Important</div>
          <div style={{ fontSize:13,color:T.text,lineHeight:1.7 }}>
            Please arrive at <strong style={{ color:T.green }}>{s.name}</strong> by{" "}
            <strong style={{ color:T.green }}>{formatTime(new Date(booking.slot_time))}</strong>.
            Show your reference number <strong style={{ color:T.green }}>{booking.reference}</strong> to the attendant.
          </div>
        </div>

        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
            color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit" }}>
          Back to Map
        </button>
      </div>
      <NavBar active="Stations" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Book a Slot" subtitle={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>

        {/* Station + vehicle summary */}
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",
          borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <div style={{ fontSize:40 }}>
            {vehicle?.type==="Car"?"🚗":vehicle?.type==="Scooter"?"🛵":"🛺"}
          </div>
        </div>

        {/* Time slot picker */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>
            Select Time Slot — Today
          </div>
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
            {slots.slice(0,12).map((slot,i)=>(
              <button key={i} onClick={()=>setSelectedSlot(slot)} className="tap"
                style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,
                  background:selectedSlot===slot?T.green:T.bg,
                  border:`1px solid ${selectedSlot===slot?T.green:T.border}`,
                  color:selectedSlot===slot?"#000":T.text,
                  fontSize:13,fontWeight:selectedSlot===slot?700:500,
                  cursor:"pointer",fontFamily:"inherit" }}>
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration picker */}
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>
            Charging Duration
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {durations.map(d=>(
              <button key={d.value} onClick={()=>setSelectedDuration(d)} className="tap"
                style={{ padding:"12px",borderRadius:12,
                  background:selectedDuration===d?"#0d2010":T.bg,
                  border:`1px solid ${selectedDuration===d?T.green:T.border}`,
                  cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                <div style={{ fontWeight:700,fontSize:15,color:selectedDuration===d?T.green:T.text }}>
                  {d.label}
                </div>
                {d.price>0 && (
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>+GH₵{d.price}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Slot Summary</div>
          <Divider/>
          {[
            { label:"Station",   value:s.name },
            { label:"Time",      value:`${formatTime(selectedSlot)} — ${formatEndTime(selectedSlot, selectedDuration.value)}` },
            { label:"Duration",  value:selectedDuration.label },
            { label:"Vehicle",   value:vehicle?.type||"Car" },
            { label:"Water",     value:"20L Clean Bundle" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text }}>Total</span>
            <span style={{ fontWeight:800,fontSize:22,color:T.green }}>GH₵{totalAmount}</span>
          </div>
        </div>

        {/* Contact info */}
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Your Details</div>
          {[
            { placeholder:"Full name",      value:name,  set:setName,  type:"text"  },
            { placeholder:"Phone number",   value:phone, set:setPhone, type:"tel"   },
            { placeholder:"Email address",  value:email, set:setEmail, type:"email" },
          ].map((f,i)=>(
            <input key={i} type={f.type} placeholder={f.placeholder} value={f.value}
              onChange={e=>{ f.set(e.target.value); setError(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,
                marginBottom:10 }}/>
          ))}
        </div>

        {/* Payment method */}
        <div className="fade3" style={{ background:T.card,borderRadius:16,padding:"14px 16px",
          marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Payment</div>
          {[
            { id:"now",    label:"Pay now to confirm",    sub:"Instant booking via Paystack" },
            { id:"arrive", label:"Pay on arrival",        sub:"Reserve now, pay at station"  },
          ].map(m=>(
            <div key={m.id} className="tap rowcard" onClick={()=>setPayMethod(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",
                borderRadius:12,marginBottom:8,
                background:payMethod===m.id?"#132010":"transparent",
                border:`1px solid ${payMethod===m.id?T.greenDim:T.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>{m.label}</div>
                <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.sub}</div>
              </div>
              <div style={{ width:20,height:20,borderRadius:"50%",
                border:`2px solid ${payMethod===m.id?T.green:T.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {payMethod===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:"rgba(248,113,113,0.08)",border:`1px solid rgba(248,113,113,0.3)`,
            borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12 }}>
            {error}
          </div>
        )}

        <button onClick={handleBook} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
            color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit",
            opacity:loading?0.7:1 }}>
          {loading ? "Processing…" : payMethod==="now" ? `Pay GH₵${totalAmount} & Confirm` : `Reserve Slot — Pay on Arrival`}
        </button>
      </div>
      <NavBar active="Stations" go={go}/>
    </div>
  );
}

export default function App() {
  const [screen,   setScreen]   = useState("home");
  const [authMode, setAuthMode] = useState("login");
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

  const handleAuthSuccess = (u) => { setUser(u); go("home"); };

  const props = { go, stations, station:station||stations[0], setStation, user, setUser, vehicle, setVehicle, onMenu:()=>setDrawer(true) };

  if (screen==="splash") return (
    <><style>{CSS}</style>
    <SplashScreen
      onLogin={()=>{ setAuthMode("login"); go("auth"); }}
      onRegister={()=>{ setAuthMode("register"); go("auth"); }}
      onGuest={()=>go("home")}/>
    </>
  );

  if (screen==="auth") return (
    <><style>{CSS}</style>
    <AuthScreen mode={authMode} onBack={()=>go("splash")} onSuccess={handleAuthSuccess}/>
    </>
  );

  const views = {
    home:     <HomeScreen    {...props}/>,
    detail:   <DetailScreen  {...props}/>,
    vehicles: <VehicleScreen {...props}/>,
    booking:  <BookingScreen {...props}/>,
    payment:  <PaymentScreen {...props}/>,
    profile:  <ProfileScreen {...props}/>,
    about:    <AboutScreen   {...props}/>,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"relative",height:"100vh",overflow:"hidden",background:T.bg }}>
        <Drawer open={drawer} onClose={()=>setDrawer(false)} go={go} user={user} onLogout={()=>{ setUser(null); go("splash"); }}/>
        <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {views[screen]||views.home}
        </div>
      </div>
    </>
  );
}

// ============================================================
// BOOKING SCREEN — Add this to your App.jsx
// Place BookingScreen component before the export default App
// and add it to the views object as: booking: <BookingScreen {...props}/>
// ============================================================
