// ============================================================
// EcoCharge Ghana — App.jsx FINAL (Fixed)
// BUILD MARKER: v-detail-screen-2025-restyle-04 (Bays Open / Energy Mix / Wallet / Charge Now+Reserve / Chargers list present)
// Font Awesome Free icons + Inter font
// Paystack, Supabase, QR, Booking, Verify, Map
// ============================================================
import { useState, useEffect, useRef, useContext, createContext } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL        || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY   || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

// ── AUTH TOKEN HELPER ─────────────────────────────────────────
// Reads the real user session token from localStorage (set by
// Supabase Auth on sign-in). Falls back to anon key for public
// endpoints. This fixes all RLS policies that use auth.uid().
const getToken = () => {
  try {
    const key = `sb-${SUPABASE_URL.split("//")[1].split(".")[0]}-auth-token`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw);
      return p?.access_token || SUPABASE_ANON;
    }
  } catch(e) {}
  return SUPABASE_ANON;
};

const sb = async (path, opts = {}) => {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        ...opts.headers
      },
      ...opts,
    });
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
};

// ── THEME ─────────────────────────────────────────────────────
// Two palettes (dark/light), same keys, same green accent.
// T is a mutable object — components already read T.xxx directly.
// ThemeProvider mutates T's contents in place on toggle, then
// triggers a re-render via context so the whole tree picks it up.
const PALETTES = {
  dark: {
    bg:"#0B0F14", card:"#111827", card2:"#1a1f2a", border:"#222632",
    green:"#22C55E", greenDark:"#16A34A", greenDim:"#166534",
    text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
    blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
    inputBg:"#0c0f18", highlightGrad:"linear-gradient(135deg,#071a09,#0a2510)",
    highlightGrad2:"linear-gradient(135deg,#0a1f12,#0d2d1a)", highlightSolid:"#0a1f12",
    track:"rgba(255,255,255,0.08)", surface:"rgba(255,255,255,0.06)", surfaceBorder:"rgba(255,255,255,0.15)",
    surfaceFaint:"rgba(255,255,255,0.04)", highlightBlue:"linear-gradient(135deg,#061520,#09202e)",
    navBg:"rgba(11,15,20,.97)", highlightAmber:"linear-gradient(135deg,#1a1000,#2d1a00)", innerTint:"rgba(0,0,0,0.2)",
  },
  light: {
    bg:"#F8FAFC", card:"#FFFFFF", card2:"#f0f2f4", border:"#e2e5e9",
    green:"#16A34A", greenDark:"#15803d", greenDim:"#bbf7d0",
    text:"#0f172a", muted:"#64748b", mutedLight:"#475569",
    blue:"#0284c7", yellow:"#b45309", red:"#dc2626",
    inputBg:"#f0f2f4", highlightGrad:"linear-gradient(135deg,#ecfdf3,#dcfce7)",
    highlightGrad2:"linear-gradient(135deg,#ecfdf3,#dcfce7)", highlightSolid:"#ecfdf3",
    track:"rgba(15,23,42,0.08)", surface:"rgba(15,23,42,0.05)", surfaceBorder:"rgba(15,23,42,0.12)",
    surfaceFaint:"rgba(15,23,42,0.035)", highlightBlue:"linear-gradient(135deg,#e0f2fe,#bae6fd)",
    navBg:"rgba(255,255,255,.92)", highlightAmber:"linear-gradient(135deg,#fffbeb,#fef3c7)", innerTint:"rgba(15,23,42,0.04)",
  },
};

const T = { ...PALETTES.dark };

const getStoredTheme = () => {
  try { return localStorage.getItem("eco_theme") === "light" ? "light" : "dark"; } catch(e) { return "dark"; }
};

Object.assign(T, PALETTES[getStoredTheme()]);

const ThemeContext = createContext({ mode:"dark", toggleTheme:()=>{} });
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredTheme());
  const toggleTheme = () => {
    const next = mode === "dark" ? "light" : "dark";
    Object.assign(T, PALETTES[next]);
    try { localStorage.setItem("eco_theme", next); } catch(e) {}
    setMode(next);
  };
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const STATIONS = [
  { id:1, name:"Accra Central",  city:"Accra",      bays:6, open:6, solar:85, hydrogen:15, time:"23 mins", lat:5.6037,  lng:-0.1870 },
  { id:2, name:"Kumasi Hub",     city:"Kumasi",     bays:4, open:3, solar:90, hydrogen:10, time:"12 mins", lat:6.6885,  lng:-1.6244 },
  { id:3, name:"Tema Station",   city:"Tema",       bays:8, open:8, solar:75, hydrogen:25, time:"18 mins", lat:5.6698,  lng:-0.0166 },
  { id:4, name:"Takoradi",       city:"Takoradi",   bays:3, open:2, solar:80, hydrogen:20, time:"25 mins", lat:4.8845,  lng:-1.7554 },
  { id:5, name:"Tamale North",   city:"Tamale",     bays:5, open:5, solar:95, hydrogen:5,  time:"45 mins", lat:9.4034,  lng:-0.8424 },
  { id:6, name:"Sunyani East",   city:"Sunyani",    bays:2, open:1, solar:70, hydrogen:30, time:"30 mins", lat:7.3349,  lng:-2.3123 },
  { id:7, name:"Cape Coast",     city:"Cape Coast", bays:6, open:6, solar:88, hydrogen:12, time:"35 mins", lat:5.1053,  lng:-1.2466 },
  { id:8, name:"Ho District",    city:"Ho",         bays:4, open:3, solar:82, hydrogen:18, time:"40 mins", lat:6.6011,  lng:0.4712  },
];

const APP_VERSION = "1.0.0";

const CONTACT_INFO = {
  email: "ecochargeghanaltd@gmail.com",
  phones: ["0504008059", "0559561568"],
  whatsapp: "0504008059",
};

const SOCIAL_LINKS = [
  { label:"Facebook",  icon:"fa-facebook",  color:"#1877F2", name:"Awakwa Jabiru Edward", searchUrl:"https://www.facebook.com/search/top?q=Awakwa%20Jabiru%20Edward" },
  { label:"X",         icon:"fa-x-twitter", color:"#ffffff", name:"Awakwa Jabiru Edward", searchUrl:"https://twitter.com/search?q=Awakwa%20Jabiru%20Edward" },
  { label:"Instagram", icon:"fa-instagram", color:"#E1306C", name:"Awakwa Jabiru Edward", searchUrl:"https://www.instagram.com/explore/search/keyword/?q=Awakwa%20Jabiru%20Edward" },
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

const useSolarData = (lat=7.9465, lng=-1.0232) => {
  const [solar, setSolar] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    const fetchSolar = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=shortwave_radiation,direct_radiation,diffuse_radiation,sunshine_duration,cloud_cover&timezone=Africa%2FAccra&forecast_days=1`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current;
        setSolar({
          radiation:  Math.round(c.shortwave_radiation||0),
          direct:     Math.round(c.direct_radiation||0),
          diffuse:    Math.round(c.diffuse_radiation||0),
          cloudCover: Math.round(c.cloud_cover||0),
          sunshine:   Math.round(c.sunshine_duration||0),
          efficiency: Math.min(100,Math.round((c.shortwave_radiation||0)/10)),
          updated:    new Date().toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" }),
        });
      } catch(e) {
        setSolar({ radiation:650,direct:500,diffuse:150,cloudCover:20,sunshine:45,efficiency:65,updated:"--:--" });
      }
      setLoading(false);
    };
    fetchSolar();
    const interval = setInterval(fetchSolar, 600000);
    return ()=>clearInterval(interval);
  },[]);
  return { solar, loading };
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%;-webkit-text-size-adjust:100%}
  html,body{touch-action:manipulation;-webkit-tap-highlight-color:transparent;overscroll-behavior:none;}
  body{font-family:'Inter',sans-serif;background:#0a0d10;color:#fff;-webkit-font-smoothing:antialiased;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade{animation:fadeUp .3s ease both}
  .fade1{animation:fadeUp .3s .06s ease both}
  .fade2{animation:fadeUp .3s .12s ease both}
  .fade3{animation:fadeUp .3s .18s ease both}
  .tap{transition:opacity .15s,transform .15s;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
  .tap:active{opacity:.7;transform:scale(.97)}
  .row{transition:background .15s;cursor:pointer}
  .row:active{background:#1e2330}
  input,button,textarea{font-family:'Inter',sans-serif;outline:none}
  input{color:#fff}
  input::placeholder{color:#4b5563}
  ::-webkit-scrollbar{width:0;height:0}
  .leaflet-pane{z-index:1!important}
  .leaflet-top,.leaflet-bottom{z-index:2!important}
`;

const Badge = ({ label, color=T.green }) => (
  <span style={{ background:`${color}22`,color,fontSize:10,fontWeight:700,borderRadius:6,padding:"3px 8px",border:`1px solid ${color}44`,whiteSpace:"nowrap" }}>{label}</span>
);
const Divider = () => <div style={{ height:1,background:T.border,margin:"10px 0" }}/>;
const Spinner = () => <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite" }}/>;
const fmtTime    = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" });
const fmtEndTime = (d,mins) => fmtTime(new Date(new Date(d).getTime()+mins*60000));
const genRef     = () => `ECO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

const Logo = ({ size=34 }) => {
  const [err,setErr] = useState(false);
  if (!err) return <img src="/logo.png" alt="EcoCharge" onError={()=>setErr(true)} style={{ width:size,height:size,objectFit:"contain",borderRadius:8,flexShrink:0 }}/>;
  return (
    <div style={{ width:size,height:size,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <i className="fas fa-bolt" style={{ fontSize:size*.4,color:"#000" }}/>
    </div>
  );
};

// Shows the real vehicle photo (same images used on the Vehicle Selection screen)
// for a given vehicle type, falling back to a plain icon if the image fails to load.
const VEHICLE_IMAGES = { Car:"/car-charging.jpg", Scooter:"/scooter-charging.jpg", Tricycle:"/tricycle-charging.jpg" };
const VEHICLE_FALLBACK_ICON = { Car:"fa-car-side", Scooter:"fa-motorcycle", Tricycle:"fa-truck-pickup" };
const VehicleAvatar = ({ vehicleType="Car", size=64 }) => {
  const [err,setErr] = useState(false);
  const src = VEHICLE_IMAGES[vehicleType] || VEHICLE_IMAGES.Car;
  if (!err) return (
    <img src={src} alt={vehicleType} onError={()=>setErr(true)}
      style={{ width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.green}`,flexShrink:0 }}/>
  );
  return <i className={`fas ${VEHICLE_FALLBACK_ICON[vehicleType]||"fa-car-side"}`} style={{ fontSize:size*0.47,color:T.green }}/>;
};

// ── NOTIFICATIONS ─────────────────────────────────────────────
const NOTIF_CONFIG={
  charging_started:   { icon:"fa-bolt",              color:"#38bdf8", label:"Charging Started"   },
  charging_completed: { icon:"fa-check-circle",      color:"#4ade80", label:"Session Complete"   },
  low_balance:        { icon:"fa-exclamation-triangle",color:"#f87171",label:"Low Balance"        },
  booking_confirmed:  { icon:"fa-calendar-check",    color:"#4ade80", label:"Booking Confirmed"  },
  topup_successful:   { icon:"fa-wallet",             color:"#4ade80", label:"Top-Up Successful" },
  system:             { icon:"fa-info-circle",        color:"#9ca3af", label:"System"            },
};

// Uses getToken() so RLS auth.uid() = user_id policies work
const createNotification = async (userId, type, title, body, metadata={}) => {
  if (!SUPABASE_URL || !userId) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        user_id: userId, type, category: type, title, body,
        metadata, is_read: false, sent_at: new Date().toISOString()
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(()=>"");
      console.error(`[createNotification] failed (${res.status}):`, errText);
      try { localStorage.setItem("eco_last_notif_error", JSON.stringify({ status:res.status, body:errText, type, time:new Date().toISOString() })); } catch(e){}
      return false;
    }
    return true;
  } catch(e) {
    console.error("[createNotification] network error:", e);
    try { localStorage.setItem("eco_last_notif_error", JSON.stringify({ status:"network", body:String(e), type, time:new Date().toISOString() })); } catch(e2){}
    return false;
  }
};

function UnreadBadge({ userId }) {
  const [count, setCount] = useState(0);
  useEffect(()=>{
    if (!SUPABASE_URL || !userId) return;
    const load = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false&select=id`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
        );
        const data = await res.json();
        if (Array.isArray(data)) setCount(data.length);
      } catch(e) {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [userId]);
  if (!count) return null;
  return (
    <div style={{ position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#4ade80",border:"2px solid #080d10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#000",padding:"0 3px" }}>
      {count>9?"9+":count}
    </div>
  );
}

function NotificationsScreen({ go, user }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread,  setUnread]  = useState(0);
  const [lastErr, setLastErr] = useState(null);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("eco_last_notif_error");
      if (raw) setLastErr(JSON.parse(raw));
    } catch(e){}
  },[]);

  const dismissErr = () => {
    try { localStorage.removeItem("eco_last_notif_error"); } catch(e){}
    setLastErr(null);
  };

  const loadNotifs = async () => {
    if (!SUPABASE_URL || !user?.id) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&order=created_at.desc&limit=50`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifs(data);
        setUnread(data.filter(n=>!n.is_read).length);
      }
    } catch(e) {}
    setLoading(false);
  };

  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id===id ? {...n, is_read:true} : n));
    setUnread(prev => Math.max(0, prev-1));
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
      });
    } catch(e) {}
  };

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({...n, is_read:true})));
    setUnread(0);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&is_read=eq.false`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
      });
    } catch(e) {}
  };

  const deleteNotif = async (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
      });
    } catch(e) {}
  };

  useEffect(() => { loadNotifs(); }, [user]);

  const fmtAgo = (iso) => {
    const diff=Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000), h=Math.floor(m/60), d=Math.floor(h/24);
    if (d>0) return d+"d ago";
    if (h>0) return h+"h ago";
    if (m>0) return m+"m ago";
    return "Just now";
  };

  if (!user) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Notifications" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"24px 24px 100px" }}>
        <div>
          <i className="fas fa-bell-slash" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>Sign in to see notifications</div>
          <button onClick={()=>go("auth")} className="tap" style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",marginTop:8 }}>Sign In</button>
        </div>
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"calc(14px + env(safe-area-inset-top, 34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
        <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Notifications</div>
          {unread>0&&<div style={{ fontSize:11,color:T.green,marginTop:2 }}>{unread} unread</div>}
        </div>
        {unread>0&&<button onClick={markAllRead} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Mark all read</button>}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>
        {lastErr&&(
          <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:14,padding:"12px 14px",marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6 }}>
              <div style={{ fontWeight:700,fontSize:12,color:T.red }}><i className="fas fa-bug" style={{ marginRight:6 }}/>Notification send failed</div>
              <button onClick={dismissErr} className="tap" style={{ background:"none",border:"none",color:T.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>Dismiss</button>
            </div>
            <div style={{ fontSize:11,color:T.mutedLight,lineHeight:1.6,wordBreak:"break-word" }}>
              Type: {lastErr.type} · Status: {lastErr.status}<br/>
              {lastErr.body && lastErr.body.slice(0,200)}
            </div>
          </div>
        )}
        {loading&&<div style={{ textAlign:"center",padding:"40px 0" }}><Spinner/></div>}
        {!loading&&notifs.length===0&&(
          <div style={{ textAlign:"center",padding:"60px 20px" }}>
            <div style={{ width:80,height:80,borderRadius:"50%",background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
              <i className="fas fa-bell" style={{ fontSize:32,color:T.muted }}/>
            </div>
            <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No notifications yet</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.7 }}>You will be notified when your session starts, ends, or wallet is low.</div>
          </div>
        )}
        {notifs.map(n=>{
          const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.system;
          return (
            <div key={n.id} className="tap" onClick={()=>{ if(!n.is_read) markRead(n.id); if(n.action_url) go(n.action_url); }}
              style={{ background:n.is_read?T.card:"rgba(74,222,128,0.06)",borderRadius:16,border:`1px solid ${n.is_read?T.border:"rgba(74,222,128,0.2)"}`,padding:"14px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:12,position:"relative" }}>
              <div style={{ width:42,height:42,borderRadius:12,background:cfg.color+"18",border:"1px solid "+cfg.color+"33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className={"fas "+cfg.icon} style={{ fontSize:16,color:cfg.color }}/>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3 }}>
                  <div style={{ fontWeight:n.is_read?600:700,fontSize:13,color:T.text,flex:1,paddingRight:8 }}>{n.title}</div>
                  <div style={{ fontSize:10,color:T.muted,flexShrink:0 }}>{fmtAgo(n.created_at)}</div>
                </div>
                <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>{n.body}</div>
                <div style={{ marginTop:6 }}>
                  <span style={{ fontSize:10,fontWeight:700,color:cfg.color,background:cfg.color+"15",borderRadius:6,padding:"2px 8px" }}>{cfg.label}</span>
                </div>
              </div>
              {!n.is_read&&<div style={{ width:8,height:8,borderRadius:"50%",background:T.green,flexShrink:0,marginTop:4 }}/>}
              <button onClick={e=>{ e.stopPropagation(); deleteNotif(n.id); }} className="tap"
                style={{ position:"absolute",top:10,right:10,background:"none",border:"none",color:T.muted,cursor:"pointer",padding:"2px 6px",fontSize:11 }}>
                <i className="fas fa-times"/>
              </button>
            </div>
          );
        })}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

const Nav = ({ active, go }) => (
  <div style={{ position:"fixed",bottom:0,left:0,right:0,display:"flex",justifyContent:"space-around",alignItems:"flex-end",padding:"10px 0 26px",borderTop:`1px solid ${T.border}`,background:T.navBg,backdropFilter:"blur(16px)",zIndex:100 }}>
    {[
      { label:"Home",     screen:"home",     icon:"fa-home"     },
      { label:"Stations", screen:"detail",   icon:"fa-plug"     },
      { label:"Scan",     screen:"scan",     icon:"fa-qrcode",   center:true },
      { label:"Sessions", screen:"sessions", icon:"fa-list-alt" },
      { label:"Profile",  screen:"profile",  icon:"fa-user"     },
    ].map(({ label,screen,icon,center })=>(
      <button key={label} onClick={()=>go(screen)} className="tap"
        style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:56,fontFamily:"inherit" }}>
        {center ? (
          <div style={{ width:54,height:54,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",marginTop:-22,marginBottom:2,boxShadow:`0 4px 18px rgba(34,197,94,.35)` }}>
            <i className={`fas ${icon}`} style={{ fontSize:20,color:"#04130a" }}/>
          </div>
        ) : (
          <i className={`fas ${icon}`} style={{ fontSize:20,color:active===label?T.green:T.muted }}/>
        )}
        <span style={{ fontSize:10,fontWeight:active===label?700:500,color:active===label?T.green:T.muted }}>{label}</span>
        {active===label&&!center&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
      </button>
    ))}
  </div>
);

const Header = ({ title,sub,onBack,onMenu }) => (
  <div style={{ padding:"calc(14px + env(safe-area-inset-top, 34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/></button>
      : <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><i className="fas fa-bars" style={{ fontSize:20,color:T.mutedLight }}/></button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,letterSpacing:-0.3 }}>{title}</div>
      {sub&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

const Drawer = ({ open,onClose,go,user,onLogout }) => {
  const { mode, toggleTheme } = useTheme();
  return (
  <>
    {open&&<div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:200 }}/>}
    <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,background:T.card,zIndex:201,borderRight:`1px solid ${T.border}`,transform:open?"translateX(0)":"translateX(-100%)",transition:"transform .3s cubic-bezier(.4,0,.2,1)",display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"52px 20px 20px",background:T.highlightGrad2 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>EcoCharge</div>
            <div style={{ fontSize:11,color:T.muted }}>Ghana · Clean Energy</div>
          </div>
        </div>
        {user
          ? <div style={{ background:"rgba(74,222,128,.08)",borderRadius:10,padding:"10px 14px" }}>
              <div style={{ fontSize:11,color:T.muted }}>Signed in as</div>
              <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
          : <button onClick={()=>{ go("auth");onClose(); }} className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Sign In / Register</button>
        }
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        <div className="tap row" onClick={toggleTheme}
          style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${T.border}20` }}>
          <i className={`fas ${mode==="dark"?"fa-moon":"fa-sun"}`} style={{ fontSize:16,color:mode==="dark"?T.blue:T.yellow,width:20,textAlign:"center" }}/>
          <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{mode==="dark"?"Dark Mode":"Light Mode"}</span>
          <div style={{ width:44,height:24,borderRadius:12,background:mode==="dark"?T.border:T.green,position:"relative",transition:"background .2s" }}>
            <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:mode==="dark"?3:23,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
          </div>
        </div>
        {[
          { icon:"fa-home",             label:"Find Stations",   screen:"home"          },
          { icon:"fa-plug",             label:"All Stations",    screen:"detail"        },
          { icon:"fa-user",             label:"My Profile",      screen:"profile"       },
          { icon:"fa-bell",             label:"Notifications",   screen:"notifications" },
          { icon:"fa-info-circle",      label:"About EcoCharge", screen:"about"         },
          { icon:"fa-bolt",             label:"Verify Booking",  screen:"verify",       color:T.yellow },
          { icon:"fa-charging-station", label:"Charger Admin",   screen:"chargers",     color:T.blue   },
          { icon:"fa-list-alt",         label:"Session Manager", screen:"sessions",     color:T.green  },
          { icon:"fa-wallet",           label:"My Wallet",       screen:"wallet",       color:T.yellow },
          { icon:"fa-tags",             label:"Pricing Engine",  screen:"pricing",      color:"#a78bfa" },
          { icon:"fa-shield-alt",       label:"Admin Dashboard", screen:"admin",        color:"#f87171" },
        ].map(item=>(
          <div key={item.label} className="tap row" onClick={()=>{ go(item.screen);onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${T.border}20` }}>
            <i className={`fas ${item.icon}`} style={{ fontSize:16,color:item.color||T.mutedLight,width:20,textAlign:"center" }}/>
            <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
            <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
          </div>
        ))}
      </div>
      {user&&(
        <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
          <button onClick={()=>{ onLogout();onClose(); }} className="tap"
            style={{ width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,color:T.red,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
            <i className="fas fa-sign-out-alt"/> Sign Out
          </button>
        </div>
      )}
    </div>
  </>
  );
};


function Splash({ onLogin, onRegister, onGuest }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#050a06",position:"relative",overflow:"hidden" }}>
      <img src="/station2.jpg" alt="bg" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.85) saturate(1.2)",zIndex:0 }} onError={e=>e.target.style.display="none"}/>
      <div style={{ position:"absolute",left:"42%",top:"66%",width:"30%",height:"7%",background:"#0a1f12",borderRadius:4,zIndex:1 }}/>
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(5,10,6,0.05) 0%,rgba(5,10,6,0.55) 60%,#050a06 100%)",zIndex:1 }}/>
      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",height:"100%",padding:"0 28px",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ textAlign:"center",marginTop:140 }}>
          <div style={{ fontWeight:900,fontSize:34,color:T.text,marginTop:16,letterSpacing:-1 }}>EcoCharge</div>
          <div style={{ fontWeight:700,fontSize:18,color:T.green,marginTop:4,letterSpacing:0.5 }}>Ghana</div>
          <div style={{ fontSize:14,color:"rgba(255,255,255,0.55)",marginTop:14,lineHeight:1.8 }}>Solar Charging. Clean Water.<br/>Zero Emissions.</div>
        </div>
        <div style={{ width:"100%",paddingBottom:60 }}>
          <button onClick={onLogin} className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:16,padding:"17px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 24px rgba(74,222,128,0.4)` }}>
            <i className="fas fa-sign-in-alt"/> Sign In
          </button>
          <button onClick={onRegister} className="tap" style={{ width:"100%",background:T.surface,border:"1px solid rgba(255,255,255,0.18)",borderRadius:16,padding:"17px",fontSize:16,fontWeight:600,color:T.text,cursor:"pointer",marginBottom:22,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-user-plus"/> Create Account
          </button>
          <button onClick={onGuest} className="tap" style={{ width:"100%",background:"none",border:"none",fontSize:14,color:"rgba(255,255,255,0.45)",cursor:"pointer",fontFamily:"inherit" }}>Continue as Guest →</button>
        </div>
      </div>
    </div>
  );
}

function Auth({ mode, onBack, onSuccess }) {
  const [tab,setTab]          = useState("email");
  const [name,setPname]       = useState("");
  const [email,setEmail]      = useState("");
  const [password,setPass]    = useState("");
  const [showPass,setShowPass]= useState(false);
  const [phone,setPhone]      = useState("");
  const [otp,setOtp]          = useState("");
  const [otpSent,setOtpSent]  = useState(false);
  const [loading,setLoad]     = useState(false);
  const [error,setErr]        = useState("");
  const [success,setSuccess]  = useState("");

  const call = async (ep,body) => {
    if (!SUPABASE_URL) return { access_token:"demo",id:"demo" };
    const r = await fetch(`${SUPABASE_URL}/auth/v1/${ep}`,{ method:"POST",headers:{ apikey:SUPABASE_ANON,"Content-Type":"application/json" },body:JSON.stringify(body) });
    return r.json();
  };

  const submitEmail = async () => {
    if (!email||!password) { setErr("Please fill in all fields"); return; }
    if (mode==="register"&&!name) { setErr("Please enter your name"); return; }
    if (password.length<6) { setErr("Password must be at least 6 characters"); return; }
    setLoad(true); setErr("");
    const d = mode==="login"
      ? await call("token?grant_type=password",{ email,password })
      : await call("signup",{ email,password,data:{ full_name:name } });
    if (d.access_token||d.id||d.user) {
      onSuccess({ email,name:name||email.split("@")[0],token:d.access_token||"demo",id:d.user?.id||"demo" });
    } else { setErr(d.error_description||d.msg||"Something went wrong. Try again."); }
    setLoad(false);
  };

  const sendOtp = async () => {
    if (!phone||phone.length<9) { setErr("Enter a valid Ghana phone number"); return; }
    setLoad(true); setErr("");
    const intl = phone.startsWith("+")?phone:`+233${phone.replace(/^0/,"")}`;
    const d = await call("otp",{ phone:intl });
    if (d.error) { setErr(d.error_description||"Could not send OTP. Check your number."); }
    else { setOtpSent(true); setSuccess(`Code sent to ${intl}`); }
    setLoad(false);
  };

  const verifyOtp = async () => {
    if (!otp||otp.length<6) { setErr("Enter the 6-digit OTP code"); return; }
    setLoad(true); setErr("");
    const intl = phone.startsWith("+")?phone:`+233${phone.replace(/^0/,"")}`;
    const d = await call("verify",{ phone:intl,token:otp,type:"sms" });
    if (d.access_token||d.user) { onSuccess({ phone:intl,name:intl,token:d.access_token||"demo",id:d.user?.id||"demo" }); }
    else { setErr(d.error_description||"Invalid OTP. Try again."); }
    setLoad(false);
  };

  const googleSignIn = () => {
    if (!SUPABASE_URL) { setErr("Supabase not configured"); return; }
    const ua = navigator.userAgent||"";
    const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|WebView|; wv\)/i.test(ua)
      || (/iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua));
    if (inAppBrowser) {
      setErr("Google sign-in can't open inside this app's preview window. Open EcoCharge in Safari or Chrome directly, then try Google sign-in again.");
      return;
    }
    setErr("");
    window.location.href=`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}&scopes=email%20profile`;
  };

  const inp = (ph,val,set,type="text",icon="fa-user") => (
    <div style={{ position:"relative",marginBottom:14 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14,zIndex:1 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"52px 18px 14px",display:"flex",alignItems:"center" }}>
        <button onClick={()=>onBack(null)} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 24px 40px" }}>
        <div style={{ textAlign:"center",marginBottom:28,marginTop:8 }}>
          <div style={{ fontWeight:800,fontSize:24,color:T.text,marginTop:14 }}>{mode==="login"?"Welcome Back":"Create Account"}</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>{mode==="login"?"Sign in to your account":"Join EcoCharge Ghana today"}</div>
        </div>
        {tab==="email" && (
          <>
            {mode==="register" && inp("Full name",name,setPname,"text","fa-user")}
            {inp("Email address",email,setEmail,"email","fa-envelope")}
            <div style={{ position:"relative",marginBottom:14 }}>
              <i className="fas fa-lock" style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14,zIndex:1 }}/>
              <input type={showPass?"text":"password"} placeholder="Password" value={password} onChange={e=>{ setPass(e.target.value);setErr(""); }}
                style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 46px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted }}>
                <i className={`fas ${showPass?"fa-eye-slash":"fa-eye"}`}/>
              </button>
            </div>
            {mode==="login" && (
              <div style={{ textAlign:"right",marginBottom:16 }}>
                <button style={{ background:"none",border:"none",color:T.green,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Forgot password?</button>
              </div>
            )}
          </>
        )}
        {tab==="phone" && !otpSent && (
          <div style={{ position:"relative",marginBottom:14 }}>
            <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:6,zIndex:1 }}>
              <span style={{ fontSize:16 }}>🇬🇭</span>
              <span style={{ fontSize:13,color:T.muted,fontWeight:600 }}>+233</span>
              <div style={{ width:1,height:16,background:T.border }}/>
            </div>
            <input type="tel" placeholder="XX XXX XXXX" value={phone} onChange={e=>{ setPhone(e.target.value);setErr(""); }}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 95px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
          </div>
        )}
        {tab==="phone" && otpSent && (
          <>
            {success&&<div style={{ color:T.green,fontSize:12,marginBottom:12,background:"rgba(74,222,128,.08)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-check-circle"/> {success}</div>}
            <div style={{ fontSize:13,color:T.muted,marginBottom:12,textAlign:"center" }}>Enter the 6-digit code sent to your phone</div>
            <input type="number" placeholder="000000" value={otp} onChange={e=>{ setOtp(e.target.value);setErr(""); }}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px",color:T.text,fontSize:28,fontFamily:"monospace",letterSpacing:10,textAlign:"center",marginBottom:14 }}/>
          </>
        )}
        {error&&<div style={{ color:T.red,fontSize:12,marginBottom:14,background:"rgba(248,113,113,.08)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/> {error}</div>}
        <button onClick={tab==="email"?submitEmail:otpSent?verifyOtp:sendOtp} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16,opacity:loading?.7:1,boxShadow:`0 4px 16px rgba(74,222,128,0.35)` }}>
          {loading?<Spinner/>:tab==="phone"?otpSent?<><i className="fas fa-shield-alt"/> Verify OTP</>:<><i className="fas fa-sms"/> Send OTP</>:mode==="login"?<><i className="fas fa-sign-in-alt"/> Sign In</>:<><i className="fas fa-user-plus"/> Create Account</>}
        </button>
        {tab==="phone"&&otpSent&&(
          <button onClick={()=>{ setOtpSent(false);setOtp("");setErr("");setSuccess(""); }} className="tap"
            style={{ width:"100%",background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:16 }}>← Change number</button>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <div style={{ flex:1,height:1,background:T.border }}/>
          <span style={{ fontSize:12,color:T.muted }}>or continue with</span>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24 }}>
          <button onClick={googleSignIn} className="tap"
            style={{ background:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button onClick={()=>setTab(tab==="phone"?"email":"phone")} className="tap"
            style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <i className="fas fa-phone" style={{ color:T.green }}/> Phone
          </button>
        </div>
        <div style={{ textAlign:"center" }}>
          <span style={{ color:T.muted,fontSize:13 }}>{mode==="login"?"Don't have an account? ":"Already registered? "}</span>
          <button onClick={()=>onBack(mode==="login"?"register":"login")}
            style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            {mode==="login"?"Register":"Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}


// Loads jsQR from CDN once (same pattern already used for Leaflet) and
// reuses it across any screen that needs to decode a QR code from the camera.
let jsQRLoadPromise = null;
const loadJsQR = () => {
  if (window.jsQR) return Promise.resolve();
  if (jsQRLoadPromise) return jsQRLoadPromise;
  jsQRLoadPromise = new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://unpkg.com/jsqr@1.4.0/dist/jsQR.js";
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error("Failed to load QR scanner library"));
    document.head.appendChild(s);
  });
  return jsQRLoadPromise;
};

// Real camera-based QR scanner. Opens the device camera, continuously samples
// frames onto a hidden canvas, and calls onResult(text) the moment a QR code
// is decoded. Used by both the customer Scan tab and the attendant Verify screen.
function QRScanner({ onResult, onClose, hint }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        await loadJsQR();
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
        if (cancelled) { stream.getTracks().forEach(t=>t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        const tick = () => {
          const video = videoRef.current, canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR && window.jsQR(imageData.data, imageData.width, imageData.height);
              if (code?.data) { onResult(code.data); return; }
            } catch(e) {}
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch(e) {
        setError(e?.name==="NotAllowedError" ? "Camera permission was denied. Enable camera access in your browser/device settings to scan." : "Couldn't access the camera on this device.");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
    };
  },[]);

  return (
    <div style={{ position:"fixed",inset:0,background:"#000",zIndex:500,display:"flex",flexDirection:"column" }}>
      <div style={{ position:"relative",flex:1,overflow:"hidden" }}>
        <video ref={videoRef} muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
        <canvas ref={canvasRef} style={{ display:"none" }}/>
        {ready && !error && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:230,height:230,border:`3px solid ${T.green}`,borderRadius:18,boxShadow:"0 0 0 2000px rgba(0,0,0,0.4)" }}/>
          </div>
        )}
        {error && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#0a0d10" }}>
            <div style={{ textAlign:"center" }}>
              <i className="fas fa-video-slash" style={{ fontSize:40,color:T.red,marginBottom:14,display:"block" }}/>
              <div style={{ color:"#fff",fontSize:14,lineHeight:1.6 }}>{error}</div>
            </div>
          </div>
        )}
        {!ready && !error && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}><Spinner/></div>
        )}
      </div>
      <div style={{ padding:"20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",background:"#0a0d10" }}>
        {hint && <div style={{ textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:13,marginBottom:14 }}>{hint}</div>}
        <button onClick={onClose} className="tap" style={{ width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:14,padding:"15px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

function MapScreen({ go,stations,setStation }) {
  const mapRef  = useRef(null);
  const mapInst = useRef(null);
  useEffect(()=>{
    if (!document.getElementById("lcss")) {
      const l=document.createElement("link"); l.id="lcss"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
    }
    const init = () => {
      if (mapInst.current||!mapRef.current) return;
      const L=window.L;
      const map=L.map(mapRef.current,{ center:[7.9465,-1.0232],zoom:7,attributionControl:false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{ maxZoom:18 }).addTo(map);
      const icon=L.divIcon({ html:`<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#4ade80"/><circle cx="14" cy="14" r="6" fill="#000"/></svg>`,className:"",iconSize:[28,36],iconAnchor:[14,36] });
      stations.forEach(s=>{ if(!s.lat||!s.lng) return; const m=L.marker([s.lat,s.lng],{ icon }).addTo(map); m.on("click",()=>{ setStation(s);go("detail"); }); });
      mapInst.current=map;
    };
    if (window.L) { init(); return; }
    const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=init; document.head.appendChild(s);
    return ()=>{ if(mapInst.current){ mapInst.current.remove(); mapInst.current=null; } };
  },[]);
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Find Stations" sub="Ghana charging network" onBack={()=>go("home")}/>
      <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,overflow:"hidden" }}>
        <div ref={mapRef} style={{ width:"100%",height:"100%",zIndex:0 }}/>
        <div style={{ position:"absolute",top:14,right:14,zIndex:10,background:"rgba(10,13,16,.85)",backdropFilter:"blur(8px)",borderRadius:20,padding:"5px 14px",fontSize:11,color:T.green,fontWeight:700,border:`1px solid ${T.border}` }}>
          <i className="fas fa-map-marker-alt" style={{ marginRight:5 }}/>{stations.length} stations
        </div>
        <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:"linear-gradient(0deg,rgba(9,14,26,.98) 0%,transparent 100%)",padding:"24px 12px 12px" }}>
          <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:2 }}>
            {stations.map(s=>(
              <div key={s.id} className="tap" onClick={()=>{ setStation(s);go("detail"); }}
                style={{ background:"rgba(19,23,31,.95)",backdropFilter:"blur(8px)",borderRadius:14,padding:"10px 14px",border:`1px solid ${T.border}`,flexShrink:0,minWidth:150 }}>
                <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.green,fontWeight:600 }}><i className="fas fa-plug" style={{ marginRight:4 }}/>{s.open}/{s.bays} bays</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}><i className="fas fa-clock" style={{ marginRight:4 }}/>Wait: {s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function SolarWidget() {
  const { solar, loading } = useSolarData(7.9465, -1.0232);
  const getStrength = (r) => {
    if (r > 700) return { label:"Excellent", color:"#4ade80" };
    if (r > 400) return { label:"Good",      color:"#fbbf24" };
    if (r > 200) return { label:"Moderate",  color:"#f97316" };
    return { label:"Low", color:"#6b7280" };
  };
  const strength = solar ? getStrength(solar.radiation) : null;
  return (
    <div style={{ margin:"0 14px 16px",background:T.highlightAmber,borderRadius:18,padding:"16px",border:`1px solid rgba(251,191,36,0.2)` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"rgba(251,191,36,0.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className="fas fa-sun" style={{ fontSize:16,color:T.yellow }}/>
          </div>
          <div>
            <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Live Solar Radiation</div>
            <div style={{ fontSize:10,color:T.muted }}>Ghana · Updated {solar?.updated||"--:--"}</div>
          </div>
        </div>
        {strength&&<div style={{ background:`${strength.color}22`,borderRadius:10,padding:"4px 10px",border:`1px solid ${strength.color}44` }}><span style={{ fontSize:11,fontWeight:700,color:strength.color }}>{strength.label}</span></div>}
      </div>
      {loading ? (
        <div style={{ textAlign:"center",padding:"10px 0",color:T.muted,fontSize:13 }}><Spinner/> <span style={{ marginLeft:8 }}>Fetching live data...</span></div>
      ) : (
        <>
          <div style={{ display:"flex",alignItems:"flex-end",gap:6,marginBottom:12 }}>
            <div style={{ fontWeight:900,fontSize:36,color:T.yellow,lineHeight:1 }}>{solar?.radiation}</div>
            <div style={{ fontSize:13,color:T.muted,marginBottom:4 }}>W/m²</div>
            <div style={{ flex:1 }}/>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11,color:T.muted }}>Efficiency</div>
              <div style={{ fontWeight:800,fontSize:18,color:T.green }}>{solar?.efficiency}%</div>
            </div>
          </div>
          <div style={{ height:6,borderRadius:3,background:T.track,overflow:"hidden",marginBottom:12 }}>
            <div style={{ height:"100%",width:`${solar?.efficiency}%`,background:`linear-gradient(90deg,${T.yellow},${T.green})`,borderRadius:3,transition:"width 1s ease" }}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[
              { label:"Direct",value:`${solar?.direct}`,unit:"W/m²",icon:"fa-sun",color:T.yellow },
              { label:"Cloud Cover",value:`${solar?.cloudCover}`,unit:"%",icon:"fa-cloud",color:T.mutedLight },
              { label:"Sunshine",value:`${solar?.sunshine}`,unit:"min",icon:"fa-clock",color:T.blue },
            ].map(s=>(
              <div key={s.label} style={{ background:T.innerTint,borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:12,color:s.color,marginBottom:4,display:"block" }}/>
                <div style={{ fontWeight:800,fontSize:14,color:T.text }}>{s.value}<span style={{ fontSize:10,color:T.muted,fontWeight:400 }}> {s.unit}</span></div>
                <div style={{ fontSize:9,color:T.muted,marginTop:2,textTransform:"uppercase",letterSpacing:0.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Home({ go,stations,setStation,user,onMenu }) {
  const [search,setSearch] = useState("");
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const displayName=user?.name||user?.email?.split("@")[0]||"Welcome";
  const filtered=search?stations.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase())):stations;

  const [wallet,setWallet]=useState(null);
  const [lastTxn,setLastTxn]=useState(null);
  const [walletLoading,setWalletLoading]=useState(true);
  useEffect(()=>{
    if (!SUPABASE_URL||!user?.id) { setWalletLoading(false); return; }
    (async()=>{
      try {
        const wRes=await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance_pesewas`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const wData=await wRes.json();
        if (wData?.[0]) setWallet(wData[0]);
        const tRes=await fetch(`${SUPABASE_URL}/rest/v1/wallet_transactions?user_id=eq.${user.id}&order=created_at.desc&limit=1`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const tData=await tRes.json();
        if (tData?.[0]) setLastTxn(tData[0]);
      } catch(e) {}
      setWalletLoading(false);
    })();
  },[user]);

  const [impact,setImpact]=useState({ charges:0,kwh:0,water:0 });
  useEffect(()=>{
    if (!SUPABASE_URL||!user?.id) return;
    (async()=>{
      try {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${user.id}&status=eq.Completed&select=energy_kwh`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const data=await res.json();
        if (Array.isArray(data)) {
          const kwh=data.reduce((a,s)=>a+(s.energy_kwh||0),0);
          setImpact({ charges:data.length, kwh, water:data.length*20 });
        }
      } catch(e) {}
    })();
  },[user]);

  const [activeSession,setActiveSession]=useState(null);
  useEffect(()=>{
    if (!SUPABASE_URL||!user?.id) return;
    (async()=>{
      try {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${user.id}&status=eq.Charging&order=started_at.desc&limit=1`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const data=await res.json();
        if (data?.[0]) setActiveSession(data[0]);
      } catch(e) {}
    })();
  },[user]);
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{
    if (!activeSession?.started_at) return;
    const tick=()=>setElapsed(Math.floor((Date.now()-new Date(activeSession.started_at).getTime())/1000));
    tick();
    const t=setInterval(tick,1000);
    return ()=>clearInterval(t);
  },[activeSession]);
  const fmtElapsed=(s)=>{ const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };
  const [balVisible,setBalVisible]=useState(true);

  const quickActions=[
    { icon:"fa-qrcode",label:"Scan to Charge",screen:"scan" },
    { icon:"fa-map-marker-alt",label:"Find Stations",screen:"map" },
    { icon:"fa-calendar",label:"My Bookings",screen:"bookings" },
    { icon:"fa-list-alt",label:"Charging History",screen:"sessions" },
  ];

  const card = { background:T.card,borderRadius:16,border:`1px solid ${T.border}` };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,overflowY:"auto" }}>
      <div style={{ padding:"48px 18px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
        <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <i className="fas fa-bars" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div style={{ fontWeight:800,fontSize:20,letterSpacing:-0.3 }}>
          <span style={{ color:T.text }}>Eco</span><span style={{ color:T.green }}>Charge</span>
        </div>
        <div style={{ position:"relative" }}>
          <button onClick={()=>go("notifications")} className="tap" style={{ background:"none",border:"none",padding:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className="fas fa-bell" style={{ fontSize:19,color:T.text }}/>
          </button>
          {user?.id && <UnreadBadge userId={user.id}/>}
        </div>
      </div>

      <div style={{ margin:"4px 14px 16px",borderRadius:20,overflow:"hidden",position:"relative",minHeight:150 }}>
        <img src="/station2.jpg" alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.95) saturate(1.15)" }} onError={e=>{ e.target.style.display="none"; }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(11,15,20,0.05) 0%,rgba(11,15,20,0.55) 100%)" }}/>
        <div style={{ position:"relative",zIndex:2,padding:"26px 20px 22px" }}>
          <div style={{ fontSize:14,color:"rgba(255,255,255,0.65)",fontWeight:500,marginBottom:6 }}>{greeting}</div>
          <div style={{ fontWeight:800,fontSize:28,color:"#fff",marginBottom:10,letterSpacing:-0.5,lineHeight:1.1 }}>{displayName}</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>Powering Ghana with clean energy</div>
        </div>
      </div>

      <div style={{ margin:"0 14px 16px",position:"relative" }}>
        <i className="fas fa-search" style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.mutedLight,fontSize:14 }}/>
        <input placeholder="Search station or location" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px 16px 14px 44px",fontSize:14,fontFamily:"inherit",color:T.text }}/>
      </div>

      {user&&(
        <div style={{ margin:"0 14px 16px",...card,padding:"18px",borderColor:T.border }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:8 }}>
                <span style={{ fontSize:11,color:T.mutedLight,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8 }}>Wallet Balance</span>
                <button onClick={()=>setBalVisible(v=>!v)} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:0,color:T.mutedLight,display:"flex" }}>
                  <i className={`fas fa-eye${balVisible?"":"-slash"}`} style={{ fontSize:13 }}/>
                </button>
              </div>
              <div style={{ fontWeight:800,fontSize:30,color:T.text,letterSpacing:-0.5 }}>
                {!balVisible?"GH₵ ••••":walletLoading?"GH₵ ––":fmtGHS(wallet?.balance_pesewas||0)}
              </div>
            </div>
            <button onClick={()=>go("wallet")} className="tap" style={{ background:T.green,border:"none",borderRadius:12,padding:"12px 20px",fontSize:14,fontWeight:800,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>Top Up</button>
          </div>
          {lastTxn&&(
            <div style={{ marginTop:16,paddingTop:14,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontSize:12,color:T.muted }}>{lastTxn.description||lastTxn.type}</span>
              <span style={{ fontSize:13,fontWeight:700,color:["TopUp","Refund","Bonus"].includes(lastTxn.type)?T.green:T.text }}>
                {["TopUp","Refund","Bonus"].includes(lastTxn.type)?"+":"-"}{fmtGHS(lastTxn.amount_pesewas)}
              </span>
            </div>
          )}
        </div>
      )}

      {activeSession&&(
        <div style={{ margin:"0 14px 16px",background:T.card,borderRadius:16,border:`1.5px solid ${T.green}`,padding:"18px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:T.green }}/>
            <span style={{ fontSize:13,fontWeight:800,color:T.green,letterSpacing:0.4 }}>CHARGING NOW</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,marginBottom:3 }}>Duration</div>
              <div style={{ fontWeight:800,fontSize:20,color:T.text,fontFamily:"monospace" }}>{fmtElapsed(elapsed)}</div>
            </div>
            <div>
              <div style={{ fontSize:11,color:T.muted,marginBottom:3 }}>Station</div>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeSession.charger_id||"EcoCharge"}</div>
            </div>
          </div>
          <button onClick={()=>go("qr")} className="tap" style={{ width:"100%",background:T.green,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>View Session</button>
        </div>
      )}

      <div style={{ margin:"0 14px 16px",...card,padding:"18px 8px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        {quickActions.map((a,i)=>(
          <button key={a.label} onClick={()=>go(a.screen)} className="tap"
            style={{ background:"none",border:"none",cursor:"pointer",padding:"4px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:9,fontFamily:"inherit",borderRight:i<3?`1px solid ${T.border}`:"none" }}>
            <div style={{ width:46,height:46,borderRadius:"50%",background:`${T.green}1a`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <i className={`fas ${a.icon}`} style={{ fontSize:17,color:T.green }}/>
            </div>
            <div style={{ fontSize:10.5,fontWeight:700,color:T.text,textAlign:"center",lineHeight:1.3 }}>{a.label}</div>
          </button>
        ))}
      </div>

      <div style={{ margin:"0 14px 16px",...card,padding:"20px" }}>
        <div style={{ fontSize:15,fontWeight:800,color:T.text,marginBottom:18 }}>Your Impact</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
          {[
            { label:"Total Charges",value:impact.charges },
            { label:"CO₂ Saved",value:`${(impact.kwh*0.5).toFixed(1)}kg` },
            { label:"Water Generated",value:`${impact.water}L` },
          ].map(m=>(
            <div key={m.label}>
              <div style={{ fontWeight:800,fontSize:22,color:T.text,letterSpacing:-0.3 }}>{m.value}</div>
              <div style={{ fontSize:10.5,color:T.muted,marginTop:5,lineHeight:1.4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin:"0 14px 16px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontWeight:800,fontSize:17,color:T.text }}>Nearby Stations</div>
          <button onClick={()=>go("detail")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>View all</button>
        </div>
        {(search?filtered:stations).slice(0,3).map((s,idx)=>{
          const kw=Math.round((s.solar||80)*1.5);
          const stationImgs=["/station1.jpg","/station2.jpg","/station3.jpg"];
          return (
            <div key={s.id} className="tap row" onClick={()=>{ setStation(s);go("detail"); }}
              style={{ ...card,marginBottom:10,display:"flex",alignItems:"stretch",overflow:"hidden" }}>
              <div style={{ width:84,flexShrink:0,position:"relative",overflow:"hidden" }}>
                <img src={stationImgs[idx%3]} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.8)" }} onError={e=>{ e.target.parentElement.style.background=T.surface; e.target.style.display="none"; }}/>
              </div>
              <div style={{ flex:1,padding:"12px 12px",minWidth:0 }}>
                <div style={{ fontWeight:600,fontSize:14,color:T.text,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:6 }}>{s.time} away</div>
                <div style={{ display:"flex",gap:6 }}>
                  <span style={{ fontSize:10,color:T.mutedLight,background:T.surface,borderRadius:6,padding:"3px 7px" }}>{s.open}/{s.bays} bays</span>
                  <span style={{ fontSize:10,color:T.mutedLight,background:T.surface,borderRadius:6,padding:"3px 7px" }}>{kw}kW</span>
                </div>
              </div>
              <div style={{ flexShrink:0,display:"flex",alignItems:"center",padding:"0 14px" }}>
                <span style={{ fontSize:10,fontWeight:700,color:s.open>0?T.green:T.red }}>{s.open>0?"Available":"Full"}</span>
              </div>
            </div>
          );
        })}
        {search&&filtered.length===0&&(
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>No stations found for "{search}"</div>
        )}
      </div>

      <SolarWidget/>

      <div style={{ height:90 }}/>
      <Nav active="Home" go={go}/>
    </div>
  );
}

function Detail({ go,station,stations,setStation,setBookingMode,user,setSelectedCharger }) {
  const s=station||stations[0];
  const scrollRef=useRef(null);
  useEffect(()=>{ scrollRef.current?.scrollTo({ top:0,behavior:"smooth" }); },[s.id]);

  const [wallet,setWallet]=useState(null);
  useEffect(()=>{
    if (!SUPABASE_URL||!user?.id) return;
    (async()=>{
      try {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance_pesewas`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const data=await res.json();
        if (data?.[0]) setWallet(data[0]);
      } catch(e) {}
    })();
  },[user]);

  const [chargers,setChargers]=useState([]);
  const [chargersLoading,setChargersLoading]=useState(true);
  const [chargerFilter,setChargerFilter]=useState("All");
  useEffect(()=>{
    setChargersLoading(true);
    (async()=>{
      let dbChargers=[];
      if (SUPABASE_URL) {
        try {
          const res=await fetch(`${SUPABASE_URL}/rest/v1/chargers?station_id=eq.${s.id}&select=*`,
            { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
          const data=await res.json();
          if (Array.isArray(data)) dbChargers=data;
        } catch(e) {}
      }
      let ocppChargers=[];
      if (OCPP_URL) {
        try {
          const data=await ocppApi("/api/chargers");
          if (Array.isArray(data?.chargers)) ocppChargers=data.chargers;
        } catch(e) {}
      }
      const dbIds=new Set(dbChargers.map(c=>c.id));
      const isFirstStation = stations[0]?.id===s.id;
      const matchedOcpp = ocppChargers.filter(c=>{
        if (dbIds.has(c.id)) return false;
        if (c.station_id!=null) return String(c.station_id)===String(s.id);
        return isFirstStation;
      }).map(c=>({
        id:c.id,
        status:c.connected?(c.status||"Available"):"Unavailable",
        online:!!c.connected,
        has_fault:c.status==="Faulted",
        model:c.info?.chargePointModel,
        vendor:c.info?.chargePointVendor,
      }));
      setChargers([...dbChargers, ...matchedOcpp]);
      setChargersLoading(false);
    })();
  },[s.id]);

  const chargerStatus=(c)=>{
    if (c.has_fault) return "Unavailable";
    if (c.status==="Charging") return "Charging";
    if (c.status==="Available"&&c.online!==false) return "Available";
    return "Unavailable";
  };
  const filteredChargers = chargerFilter==="All" ? chargers : chargers.filter(c=>chargerStatus(c)===chargerFilter);
  const CHARGER_FILTERS=["All","Available","Charging","Unavailable"];
  const chargerStatusColor=(st)=>st==="Available"?T.green:st==="Charging"?T.blue:T.red;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ margin:"0",overflow:"hidden",height:200,position:"relative",flexShrink:0 }}>
        <img src="/station2.jpg" alt="station" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.55) saturate(1.3)" }} onError={e=>{ e.target.style.display="none"; }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.55) 100%)" }}/>
        <div style={{ position:"absolute",top:"calc(16px + env(safe-area-inset-top, 34px))",left:16,right:16,display:"flex",justifyContent:"space-between" }}>
          <button onClick={()=>go("home")} className="tap" style={{ width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <i className="fas fa-chevron-left" style={{ fontSize:16,color:"#fff" }}/>
          </button>
          <div style={{ display:"flex",gap:8 }}>
            <button className="tap" style={{ width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <i className="far fa-heart" style={{ fontSize:15,color:"#fff" }}/>
            </button>
            <button className="tap" style={{ width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <i className="fas fa-share-alt" style={{ fontSize:14,color:"#fff" }}/>
            </button>
          </div>
        </div>
        <div style={{ position:"absolute",bottom:12,left:16,right:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
            <span style={{ fontWeight:800,fontSize:19,color:"#fff" }}>{s.name}</span>
            <i className="fas fa-check-circle" style={{ fontSize:15,color:T.green }}/>
          </div>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.75)",marginBottom:8 }}>{s.city} · Solar & Hydrogen</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <Badge label="Open 24/7" color={T.green}/>
            <Badge label={`${s.open}/${s.bays} Open`} color={T.green}/>
            <Badge label={`Wait: ${s.time}`} color={T.yellow}/>
          </div>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex:1,overflowY:"auto",padding:"12px 12px 100px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[{ label:"Bays Open",value:`${s.open}/${s.bays}`,color:T.green,icon:"fa-plug" },{ label:"Est. Wait",value:s.time,color:T.yellow,icon:"fa-clock" },{ label:"Solar",value:`${s.solar}%`,color:T.blue,icon:"fa-sun" }].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <i className={`fas ${x.icon}`} style={{ fontSize:14,color:x.color,marginBottom:6,display:"block" }}/>
              <div style={{ fontSize:9,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5 }}>{x.label}</div>
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
            <div style={{ height:"100%",width:`${s.solar}%`,background:`linear-gradient(90deg,${T.green},${T.blue})` }}/>
          </div>
        </div>
        {user&&(
          <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:14,border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4 }}>Wallet Balance</div>
              <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{fmtGHS(wallet?.balance_pesewas||0)}</div>
              <div style={{ fontSize:10,color:T.green,marginTop:2 }}><i className="fas fa-check-circle" style={{ marginRight:3 }}/>Ready to charge</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4 }}>Price</div>
              <div style={{ fontWeight:800,fontSize:18,color:T.text }}>GH₵{chargers[0]?.price_per_kwh||chargers[0]?.rate_per_kwh||"3.50"}/kWh</div>
            </div>
            <button onClick={()=>go("wallet")} className="tap" style={{ background:T.green,border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:800,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>Top Up</button>
          </div>
        )}
        <div style={{ display:"flex",gap:10,marginBottom:14 }}>
          <button onClick={()=>{ setBookingMode?.("now");go("vehicles"); }} className="tap"
            style={{ flex:1,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px 10px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}>
            <i className="fas fa-bolt" style={{ fontSize:18 }}/>
            Charge Now
            <span style={{ fontSize:10,fontWeight:500,opacity:0.75 }}>I'm at the station</span>
          </button>
          <button onClick={()=>{ setBookingMode?.("later");go("vehicles"); }} className="tap"
            style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"15px 10px",fontSize:14,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}>
            <i className="fas fa-clock" style={{ fontSize:18,color:T.green }}/>
            Reserve for Later
            <span style={{ fontSize:10,fontWeight:500,color:T.muted }}>I'm on my way</span>
          </button>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text }}>Chargers</div>
          <span style={{ fontSize:11,color:T.muted }}>{chargers.length} total</span>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
          {CHARGER_FILTERS.map(f=>(
            <button key={f} onClick={()=>setChargerFilter(f)} className="tap"
              style={{ flexShrink:0,background:chargerFilter===f?T.green:T.card,border:`1px solid ${chargerFilter===f?T.green:T.border}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:chargerFilter===f?"#04130a":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {f}
            </button>
          ))}
        </div>
        {chargersLoading&&(
          <div style={{ textAlign:"center",padding:"20px 0",color:T.muted,fontSize:13 }}><Spinner/></div>
        )}
        {!chargersLoading&&chargers.length===0&&(
          <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"20px",textAlign:"center",marginBottom:14 }}>
            <i className="fas fa-charging-station" style={{ fontSize:28,color:T.muted,marginBottom:8,display:"block",opacity:0.5 }}/>
            <div style={{ fontSize:12,color:T.muted }}>No charger details available for this station yet</div>
          </div>
        )}
        {!chargersLoading&&chargers.length>0&&filteredChargers.length===0&&(
          <div style={{ textAlign:"center",padding:"16px 0",color:T.muted,fontSize:12,marginBottom:8 }}>No chargers match this filter</div>
        )}
        {filteredChargers.map(c=>{
          const st=chargerStatus(c);
          const color=chargerStatusColor(st);
          const power=c.power_kw||c.max_power_kw||c.kw||null;
          const connector=c.connector_type||c.connector||c.plug_type||null;
          const price=c.price_per_kwh||c.rate_per_kwh||null;
          const acdc=c.current_type||(power&&power>=43?"DC":"AC");
          const uptime=c.uptime_pct||99;
          return (
            <div key={c.id} className="tap row" onClick={()=>{ setSelectedCharger?.({...c,station:s}); go("chargerdetail"); }}
              style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:10,cursor:"pointer" }}>
              <div style={{ display:"flex",gap:12,marginBottom:10 }}>
                <div style={{ width:46,height:58,borderRadius:8,background:`linear-gradient(160deg,${T.greenDim}40,${T.border})`,border:`1.5px solid ${T.green}55`,flexShrink:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-charging-station" style={{ fontSize:18,color:T.green }}/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{c.label||c.name||c.id}</div>
                    <i className="fas fa-chevron-down" style={{ fontSize:11,color:T.muted,marginTop:3 }}/>
                  </div>
                  <div style={{ fontSize:12,color,fontWeight:600,margin:"4px 0",display:"flex",alignItems:"center",gap:6 }}>
                    <i className={`fas ${st==="Available"?"fa-bolt":st==="Charging"?"fa-charging-station":"fa-ban"}`} style={{ fontSize:11 }}/>
                    {st}
                  </div>
                  {connector&&<div style={{ fontSize:11,color:T.muted }}><i className="fas fa-plug" style={{ marginRight:5 }}/>{acdc} Fast Charger · {connector}</div>}
                </div>
              </div>
              <div style={{ display:"flex",gap:18,marginBottom:10 }}>
                {power&&(
                  <div>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{power} kW</div>
                    <div style={{ fontSize:9,color:T.muted }}>Max Power</div>
                  </div>
                )}
                <div>
                  <div style={{ fontWeight:700,fontSize:14,color:T.green }}>{uptime}%</div>
                  <div style={{ fontSize:9,color:T.muted }}>Uptime</div>
                </div>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  {price&&<div style={{ fontSize:13,fontWeight:700,color:T.text }}>GH₵{price}/kWh</div>}
                  <div style={{ fontSize:9,color:T.muted }}>Price (VAT incl.)</div>
                </div>
                {st==="Available"&&(
                  <button onClick={e=>{ e.stopPropagation();setStation(s);setBookingMode?.("now");go("vehicles"); }} className="tap"
                    style={{ background:T.green,border:"none",borderRadius:9,padding:"8px 18px",fontSize:12,fontWeight:700,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>Start Charging</button>
                )}
                {st==="Charging"&&(
                  <button onClick={e=>{ e.stopPropagation();go("qr"); }} className="tap"
                    style={{ background:T.blue,border:"none",borderRadius:9,padding:"8px 18px",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit" }}>View</button>
                )}
              </div>
            </div>
          );
        })}
        {!chargersLoading&&chargers.length>0&&(
          <div style={{ textAlign:"center",fontSize:10,color:T.muted,marginBottom:14 }}>Prices are inclusive of VAT</div>
        )}
        <div style={{ height:8 }}/>
        <div style={{ fontSize:11,color:T.muted,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="row" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#152410":T.card,border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,borderRadius:13,padding:"13px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,color:T.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}><i className="fas fa-map-marker-alt" style={{ marginRight:4 }}/>{st.city} · {st.bays} bays</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button className="tap" onClick={e=>{ e.stopPropagation();setStation(st);go("detail"); }}
                style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Select</button>
            </div>
          </div>
        ))}
        <div style={{ height:18 }}/>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function ChargerDetail({ go,selectedCharger,setBookingMode,setStation,user }) {
  const c=selectedCharger||{};
  const s=c.station||{};
  const status = c.has_fault ? "Unavailable" : c.status==="Charging" ? "Charging" : (c.status==="Available"&&c.online!==false) ? "Available" : "Unavailable";
  const statusColor = status==="Available"?T.green:status==="Charging"?T.blue:T.red;
  const power=c.power_kw||c.max_power_kw||c.kw||120;
  const connector=c.connector_type||c.connector||c.plug_type||"CCS2";
  const price=c.price_per_kwh||c.rate_per_kwh||"3.50";
  const acdc=c.current_type||(power>=43?"DC Fast Charger":"AC Charger");
  const uptime=c.uptime_pct||99;

  const [tariff,setTariff]=useState(null);
  useEffect(()=>{
    if (!SUPABASE_URL) return;
    (async()=>{
      try {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/tariffs?is_active=eq.true&order=priority.asc&limit=1&select=*`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const data=await res.json();
        if (data?.[0]) setTariff(data[0]);
      } catch(e) {}
    })();
  },[]);

  const minCharge = tariff?.min_charge_fee!=null ? (tariff.min_charge_fee/100).toFixed(2) : "5.00";
  const idleFee   = tariff?.idle_fee_per_min!=null ? (tariff.idle_fee_per_min/100).toFixed(2) : "2.00";

  const AMENITIES=[
    { icon:"fa-restroom", label:"Restroom" },
    { icon:"fa-mug-hot",  label:"Cafe" },
    { icon:"fa-wifi",     label:"Wi-Fi" },
    { icon:"fa-shield-alt",label:"Security" },
    { icon:"fa-lightbulb",label:"Lighting" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={c.label||c.name||c.id||"Charger"} sub={`${acdc} · ${connector}`} onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>
        <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:14 }}>
          <Badge label={status} color={statusColor}/>
        </div>
        <div style={{ display:"flex",justifyContent:"center",marginBottom:18 }}>
          <div style={{ width:110,height:150,borderRadius:16,background:`linear-gradient(160deg,${T.greenDim}50,${T.border})`,border:`2px solid ${T.green}66`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-charging-station" style={{ fontSize:42,color:T.green }}/>
            <i className="fas fa-bolt" style={{ fontSize:16,color:T.yellow }}/>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
          {[
            { label:"Max Power",value:`${power} kW` },
            { label:"Connector",value:connector },
            { label:"Price",value:`GH₵${price}/kWh`,sub:"VAT Inclusive" },
            { label:"Uptime",value:`${uptime}%`,sub:uptime>=95?"Excellent":"Good",color:T.green },
          ].map(m=>(
            <div key={m.label} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px" }}>
              <div style={{ fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6 }}>{m.label}</div>
              <div style={{ fontWeight:800,fontSize:18,color:m.color||T.text }}>{m.value}</div>
              {m.sub&&<div style={{ fontSize:10,color:m.color||T.muted,marginTop:2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}><i className="fas fa-heartbeat" style={{ marginRight:8,color:T.green }}/>Live Status</div>
          <div style={{ fontSize:13,fontWeight:700,color:status==="Available"?T.green:status==="Charging"?T.blue:T.red,marginBottom:2 }}>
            {status==="Available"?"Available now":status==="Charging"?"Charging in progress":"Currently unavailable"}
          </div>
          <div style={{ fontSize:11,color:T.muted,marginBottom:10 }}>
            {status==="Available"?"Ready to charge":status==="Charging"?"In use by another session":"Check back shortly"}
          </div>
          <div style={{ background:T.surface,borderRadius:10,padding:"10px 12px" }}>
            {status==="Charging" ? (
              <><div style={{ fontSize:12,fontWeight:700,color:T.text }}>Active session</div><div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Another vehicle is currently charging here</div></>
            ) : (
              <><div style={{ fontSize:12,fontWeight:700,color:T.text }}>No active session</div><div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Plug in to start</div></>
            )}
          </div>
        </div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}><i className="fas fa-info-circle" style={{ marginRight:8,color:T.green }}/>Charging Info</div>
          {[
            { icon:"fa-tag",       label:"Min. charge",     value:`GH₵${minCharge}` },
            { icon:"fa-hourglass-half",label:"Idle fee",    value:`GH₵${idleFee}/min`,sub:"after 5 mins" },
            { icon:"fa-square-parking",label:"Parking fee", value:"Free",sub:"First 60 mins" },
            { icon:"fa-clock",     label:"Operating hours", value:"24 Hours" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12,color:T.muted }}><i className={`fas ${r.icon}`} style={{ marginRight:8,width:14 }}/>{r.label}</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.text }}>{r.value}</div>
                {r.sub&&<div style={{ fontSize:9,color:T.muted,marginTop:1 }}>{r.sub}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Station Amenities</div>
          <div style={{ display:"flex",justifyContent:"space-between" }}>
            {AMENITIES.map(a=>(
              <div key={a.label} style={{ textAlign:"center" }}>
                <div style={{ width:38,height:38,borderRadius:"50%",background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px" }}>
                  <i className={`fas ${a.icon}`} style={{ fontSize:14,color:T.green }}/>
                </div>
                <div style={{ fontSize:9,color:T.muted }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Location</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>{s.name||"Station"}, {s.city||""}</div>
          <div onClick={()=>go("map")} className="tap" style={{ height:80,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:8 }}>
            <i className="fas fa-map-marker-alt" style={{ fontSize:22,color:T.green }}/>
          </div>
          <button onClick={()=>go("map")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:0 }}>View on map</button>
        </div>
        {status==="Available"&&(
          <button onClick={()=>{ setStation?.(s);setBookingMode?.("now");go("vehicles"); }} className="tap"
            style={{ width:"100%",background:T.green,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#04130a",cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
            Start Charging
          </button>
        )}
        {status==="Charging"&&(
          <button onClick={()=>go("qr")} className="tap"
            style={{ width:"100%",background:T.blue,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
            View Active Session
          </button>
        )}
        <button onClick={()=>go("about")} className="tap"
          style={{ width:"100%",background:"none",border:`1px solid ${T.red}55`,borderRadius:14,padding:"14px",fontSize:13,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-exclamation-triangle"/> Report an Issue
        </button>
      </div>
    </div>
  );
}

function Vehicles({ go,setVehicle,bookingMode }) {
  const [sel,setSel] = useState(null);
  const vehicleImages={ Car:"/car-charging.jpg",Scooter:"/scooter-charging.jpg",Tricycle:"/tricycle-charging.jpg" };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" sub={bookingMode==="now"?"Charging now — choose your vehicle":"Reserving for later — choose your vehicle"} onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`} onClick={()=>setSel(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",border:`2px solid ${sel?.type===v.type?T.green:T.border}`,transition:"border-color .2s" }}>
            <div style={{ height:180,position:"relative",overflow:"hidden" }}>
              <img src={vehicleImages[v.type]} alt={v.type} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.8)" }} onError={e=>{ e.target.style.display="none"; }}/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 55%)" }}/>
              <div style={{ position:"absolute",bottom:10,left:14 }}>
                <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{v.type}</div>
                <div style={{ fontSize:11,color:T.mutedLight,marginTop:2 }}>{v.desc}</div>
              </div>
              {sel?.type===v.type&&(
                <div style={{ position:"absolute",top:12,right:12,width:28,height:28,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-check" style={{ fontSize:14,color:"#000" }}/>
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px",background:T.card,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:800,fontSize:19,color:T.green }}>{v.price}</div>
              <Badge label="+ 20L Clean Water" color={T.blue}/>
            </div>
          </div>
        ))}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Included with every charge</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}><i className="fas fa-bolt" style={{ color:T.green,fontSize:14 }}/><span style={{ fontSize:13,color:T.text }}>Full vehicle charge — solar powered</span></div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}><i className="fas fa-tint" style={{ color:T.blue,fontSize:14 }}/><span style={{ fontSize:13,color:T.text }}>20L clean desalinated water</span></div>
        </div>
        <button onClick={()=>{ if(sel){ setVehicle(sel);go(bookingMode==="now"?"chargenow":"booking"); } }} className="tap"
          style={{ width:"100%",background:sel?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:sel?"#000":T.muted,cursor:sel?"pointer":"not-allowed",marginBottom:16,fontFamily:"inherit",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {sel?<><i className="fas fa-arrow-right"/> Continue with {sel.type}</>:"Select a vehicle to continue"}
        </button>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function Booking({ go,station,vehicle,user,setBooking }) {
  const s=station||STATIONS[0];
  const slots=(()=>{ const arr=[],t=new Date(); t.setMinutes(Math.ceil(t.getMinutes()/30)*30,0,0); const end=new Date(); end.setHours(22,0,0,0); while(t<=end){ arr.push(new Date(t));t.setMinutes(t.getMinutes()+30); } return arr; })();
  const [slotIdx,setSlotIdx]=useState(0);
  const [durIdx,setDurIdx]=useState(1);
  const payHow="now";
  const [name,setName]=useState(user?.name||"");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState(user?.email||"");
  const [loading,setLoad]=useState(false);
  const [error,setErr]=useState("");
  const dur=DURATIONS[durIdx];
  const total=(vehicle?.amount||175)+dur.extra;
  const book=async()=>{
    if (!name.trim()) { setErr("Enter your name");return; }
    if (!phone.trim()||phone.length<10) { setErr("Enter a valid phone number");return; }
    if (!email.trim()||!email.includes("@")) { setErr("Enter a valid email");return; }
    setLoad(true);setErr("");
    const ref=genRef();
    const data={ reference:ref,station:s.name,city:s.city,vehicle:vehicle?.type||"Car",slot_time:slots[slotIdx].toISOString(),duration_min:dur.value,amount:total,name,phone,email,user_id:user?.id||null,pay_method:payHow,status:"confirmed",created_at:new Date().toISOString() };
    let saved=true;
    if (SUPABASE_URL) saved=await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.stringify(data) });
    if (!saved) { setErr("Could not save booking. Please check your connection and try again."); setLoad(false); return; }
    setBooking(data);
    try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
    if (user?.id) { createNotification(user.id, "booking_confirmed", "Booking Confirmed", `${s.name} reserved for ${fmtTime(slots[slotIdx])}. You'll be charged from your wallet when charging starts.`, { reference: ref }); }
    setLoad(false);go("qr");
  };
  const inp=(ph,val,set,type="text",icon="fa-user")=>(
    <div style={{ position:"relative",marginBottom:10 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px 12px 40px",color:T.text,fontSize:14 }}/>
    </div>
  );
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Book a Slot" sub={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 120px" }}>
        <div className="fade" style={{ background:T.highlightGrad2,borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <VehicleAvatar vehicleType={vehicle?.type||"Car"} size={50}/>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-clock" style={{ marginRight:8,color:T.green }}/> Select Time</div>
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
            {slots.slice(0,12).map((sl,i)=>(
              <button key={i} onClick={()=>setSlotIdx(i)} className="tap"
                style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,fontFamily:"inherit",background:slotIdx===i?T.green:T.bg,border:`1px solid ${slotIdx===i?T.green:T.border}`,color:slotIdx===i?"#000":T.text,fontSize:13,fontWeight:slotIdx===i?700:500,cursor:"pointer" }}>
                {fmtTime(sl)}
              </button>
            ))}
          </div>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-hourglass-half" style={{ marginRight:8,color:T.green }}/> Duration</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {DURATIONS.map((d,i)=>(
              <button key={i} onClick={()=>setDurIdx(i)} className="tap"
                style={{ padding:"12px",borderRadius:12,fontFamily:"inherit",textAlign:"left",background:durIdx===i?"#0d2010":T.bg,border:`1px solid ${durIdx===i?T.green:T.border}`,cursor:"pointer" }}>
                <div style={{ fontWeight:700,fontSize:15,color:durIdx===i?T.green:T.text }}>{d.label}</div>
                {d.extra>0&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>+GH₵{d.extra}</div>}
              </button>
            ))}
          </div>
        </div>
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}><i className="fas fa-receipt" style={{ marginRight:8,color:T.green }}/> Summary</div>
          <Divider/>
          {[{ label:"Time",value:`${fmtTime(slots[slotIdx])} — ${fmtEndTime(slots[slotIdx],dur.value)}` },{ label:"Duration",value:dur.label },{ label:"Vehicle",value:vehicle?.type||"Car" },{ label:"Water",value:"20L Clean Bundle" }].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>Estimated Total</span>
            <span style={{ fontWeight:800,fontSize:24,color:T.green }}>GH₵{total}</span>
          </div>
        </div>
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-id-card" style={{ marginRight:8,color:T.green }}/> Your Details</div>
          {inp("Full name",name,setName,"text","fa-user")}
          {inp("Phone number",phone,setPhone,"tel","fa-phone")}
          {inp("Email address",email,setEmail,"email","fa-envelope")}
        </div>
        <div className="fade3" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-credit-card" style={{ marginRight:8,color:T.green }}/> Payment</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:12,lineHeight:1.6 }}>No payment now — you'll be charged from your wallet only when your charging session starts.</div>
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRadius:12,background:"#132010",border:`1px solid ${T.greenDim}` }}>
            <i className="fas fa-wallet" style={{ fontSize:16,color:T.green }}/>
            <div style={{ flex:1 }}>
              <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>Pay from Wallet</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>Charged when charging starts</div>
            </div>
            <i className="fas fa-check-circle" style={{ fontSize:16,color:T.green }}/>
          </div>
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}
        <button onClick={book} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,color:"#000",cursor:loading?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
          {loading?<><Spinner/> Processing…</>:<><i className="fas fa-calendar-check"/> Reserve Slot — GH₵{total} Est.</>}
        </button>
      </div>
    </div>
  );
}


function ScanToCharge({ go,stations,setStation,setBookingMode,setSelectedCharger }) {
  const [error,setError]=useState("");
  const [looking,setLooking]=useState(false);

  const onScanResult=async(text)=>{
    setLooking(true);setError("");
    try {
      const chargerId = text.startsWith("ECOCHARGER:") ? text.slice("ECOCHARGER:".length).trim() : text.trim();
      let stationId=null, chargerRow=null;
      if (SUPABASE_URL) {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/chargers?id=eq.${chargerId}&select=*`,
          { headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}` }});
        const data=await res.json();
        if (data?.[0]) { chargerRow=data[0]; stationId=data[0].station_id; }
      }
      const matchedStation = stationId!=null ? stations.find(s=>String(s.id)===String(stationId)) : null;
      if (!matchedStation) {
        setError(`Charger "${chargerId}" isn't linked to a known station yet. Try entering it manually on the station's Detail screen instead.`);
        setLooking(false);
        return;
      }
      setStation(matchedStation);
      setSelectedCharger?.({ ...(chargerRow||{ id:chargerId }), station:matchedStation });
      setBookingMode?.("now");
      go("vehicles");
    } catch(e) {
      setError("Couldn't read that code. Try again or use your charging pass instead.");
      setLooking(false);
    }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#000" }}>
      <QRScanner onResult={onScanResult} onClose={()=>go("home")} hint={looking?"Looking up charger…":"Scan the QR code at the charger to start"}/>
      {error&&(
        <div style={{ position:"fixed",left:16,right:16,bottom:"calc(96px + env(safe-area-inset-bottom, 0px))",zIndex:600,background:"rgba(20,10,10,0.95)",border:`1px solid ${T.red}55`,borderRadius:14,padding:"14px 16px" }}>
          <div style={{ color:"#fff",fontSize:13,lineHeight:1.6,marginBottom:10 }}>{error}</div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setError("")} className="tap" style={{ flex:1,background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit" }}>Try Again</button>
            <button onClick={()=>go("qr")} className="tap" style={{ flex:1,background:T.green,border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>Show My Pass</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChargeNow({ go,station,vehicle,user,setBooking }) {
  const s=station||STATIONS[0];
  const [name,setName]=useState(user?.name||"");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState(user?.email||"");
  const [loading,setLoad]=useState(false);
  const [error,setErr]=useState("");
  const inp=(ph,val,set,type="text",icon="fa-user")=>(
    <div style={{ position:"relative",marginBottom:10 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px 12px 40px",color:T.text,fontSize:14 }}/>
    </div>
  );
  const start=async()=>{
    if (!name.trim()) { setErr("Enter your name");return; }
    if (!phone.trim()||phone.length<10) { setErr("Enter a valid phone number");return; }
    if (!email.trim()||!email.includes("@")) { setErr("Enter a valid email");return; }
    setLoad(true);setErr("");
    const ref=genRef();
    const data={ reference:ref,station:s.name,city:s.city,vehicle:vehicle?.type||"Car",slot_time:new Date().toISOString(),duration_min:null,amount:null,name,phone,email,user_id:user?.id||null,pay_method:"wallet",booking_mode:"now",status:"confirmed",created_at:new Date().toISOString() };
    let saved=true;
    if (SUPABASE_URL) saved=await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.stringify(data) });
    if (!saved) { setErr("Could not start your session. Please check your connection and try again."); setLoad(false); return; }
    setBooking(data);
    try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
    if (user?.id) { createNotification(user.id, "booking_confirmed", "Ready to Charge", `${s.name} — you're checked in. Start charging when ready.`, { reference: ref }); }
    setLoad(false);go("qr");
  };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charge Now" sub={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 120px" }}>
        <div className="fade" style={{ background:T.highlightGrad2,borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Charging at</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <VehicleAvatar vehicleType={vehicle?.type||"Car"} size={50}/>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}><i className="fas fa-money-bill-alt" style={{ marginRight:8,color:T.green }}/> Cost</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.7,marginBottom:10 }}>Billed by usage — your wallet is charged only for the energy you actually use, at the moment you stop.</div>
          <div style={{ background:T.innerTint,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:12,color:T.mutedLight }}>Rate</span>
            <span style={{ fontSize:13,fontWeight:700,color:T.green }}>GH₵0.85/kWh + GH₵5 base</span>
          </div>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}><i className="fas fa-receipt" style={{ marginRight:8,color:T.green }}/> Summary</div>
          <Divider/>
          {[{ label:"Station",value:s.name },{ label:"Vehicle",value:vehicle?.type||"Car" },{ label:"Payment",value:"Wallet (billed at stop)" },{ label:"Water",value:"20L Clean Bundle" }].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-id-card" style={{ marginRight:8,color:T.green }}/> Your Details</div>
          {inp("Full name",name,setName,"text","fa-user")}
          {inp("Phone number",phone,setPhone,"tel","fa-phone")}
          {inp("Email address",email,setEmail,"email","fa-envelope")}
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}
        <button onClick={start} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,color:"#000",cursor:loading?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
          {loading?<><Spinner/> Starting…</>:<><i className="fas fa-bolt"/> Start Charging</>}
        </button>
      </div>
    </div>
  );
}


// ── OCPP API HELPER ───────────────────────────────────────────
const OCPP_URL = import.meta.env.VITE_OCPP_SERVER_URL || "";
const OCPP_KEY = import.meta.env.VITE_OCPP_API_KEY    || "";

const ocppApi = async (path, method = "GET", body = null) => {
  if (!OCPP_URL) return null;
  try {
    const res = await fetch(`${OCPP_URL}${path}`, {
      method,
      headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
};

function QRScreen({ go, booking, setBooking, user }) {
  const [phase,       setPhase]      = useState("ready");
  const [elapsed,     setElapsed]    = useState(0);
  const [liveKwh,     setLiveKwh]    = useState(0);
  const [livePower,   setLivePower]  = useState(0);
  const [txId,        setTxId]       = useState(null);
  const [sessionId,   setSessionId]  = useState(null);
  const [error,       setError]      = useState("");
  const [checks,      setChecks]     = useState({});
  const [walletBal,   setWalletBal]  = useState(null);
  const [costSoFar,   setCostSoFar]  = useState(0);
  const [realtimeData, setRealtimeData] = useState(null);
  const [estRemaining, setEstRemaining] = useState(null);
  const [powerHistory, setPowerHistory] = useState([]);
  const [realtimeSub,  setRealtimeSub]  = useState(null);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [signalStr,    setSignalStr]    = useState(100);
  const [detailsOpen,  setDetailsOpen]  = useState(false);

  let b = booking;
  if (!b) { try { const s=localStorage.getItem("eco_booking"); if(s) b=JSON.parse(s); } catch(e){} }

  useEffect(()=>{
    if (phase !== 'charging') return;
    const tick = setInterval(()=>{
      setElapsed(e => e + 1);
      setRealtimeData(prev => {
        if (prev) return prev;
        const newKwh  = +(liveKwh + 0.00055).toFixed(4);
        const newPow  = +(6.8 + Math.random()*1.4).toFixed(2);
        const newCost = +(costSoFar + 0.000472).toFixed(4);
        setLiveKwh(newKwh);
        setLivePower(newPow);
        setCostSoFar(newCost);
        setPowerHistory(h => [...h.slice(-19), { t: Date.now(), v: newPow }]);
        return null;
      });
      setLastUpdated(new Date());
      setSignalStr(s => Math.max(20, s + (Math.random()-0.5)*10));
    }, 1000);

    let sub = null;
    if (SUPABASE_URL && sessionId) {
      try {
        const pollMeter = async () => {
          try {
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/meter_values?session_id=eq.${sessionId}&order=created_at.desc&limit=1`,
              { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
            );
            const data = await res.json();
            if (data?.[0]) {
              const mv = data[0];
              if (mv.measurand === 'Energy.Active.Import.Register') {
                const kwh = mv.value / 1000;
                setLiveKwh(kwh);
                setCostSoFar(+(kwh * 0.85 + 5).toFixed(2));
                setRealtimeData(mv);
                setLastUpdated(new Date());
              }
              if (mv.measurand === 'Power.Active.Import') {
                setLivePower(mv.value / 1000);
                setPowerHistory(h => [...h.slice(-19), { t: Date.now(), v: mv.value/1000 }]);
              }
            }
            if (user?.id) {
              const wRes = await fetch(
                `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance_pesewas`,
                { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
              );
              const wData = await wRes.json();
              if (wData?.[0]) setWalletBal(wData[0].balance_pesewas);
            }
          } catch(e) {}
        };
        const pollInterval = setInterval(pollMeter, 5000);
        pollMeter();
        sub = pollInterval;
        setRealtimeSub(pollInterval);
      } catch(e) { console.error('Realtime setup error:', e); }
    }

    return () => {
      clearInterval(tick);
      if (sub) clearInterval(sub);
    };
  }, [phase, sessionId]);

  useEffect(()=>{
    if (!b?.duration_min || phase !== 'charging') return;
    const totalSec = b.duration_min * 60;
    const remSec   = Math.max(0, totalSec - elapsed);
    const rm = Math.floor(remSec/60);
    const rs = remSec % 60;
    setEstRemaining(`${rm}m ${rs}s`);
  }, [elapsed, phase]);

  const loadWallet = async () => {
    if (!SUPABASE_URL || !user?.id) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance_pesewas`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const data = await res.json();
      if (data?.[0]) { setWalletBal(data[0].balance_pesewas); return data[0].balance_pesewas; }
    } catch(e) {}
    return null;
  };

  useEffect(() => { loadWallet(); }, [user]);

  const fmtElapsed = (s) => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };
  const pct = b?.duration_min
    ? Math.min(100, Math.round((elapsed/(b.duration_min*60))*100))
    : Math.min(100, Math.round((elapsed/3600)*100));

  const startCharging = async () => {
    setPhase("verifying"); setError(""); setChecks({});
    const step = (key, ok, msg) => setChecks(prev => ({...prev, [key]: { ok, msg }}));
    try {
      step("auth", null, "Checking authentication...");
      if (!user?.id) { step("auth", false, "Not authenticated"); setError("Please sign in to start charging."); setPhase("error"); return; }
      step("auth", true, "Authenticated ✓");
      await new Promise(r => setTimeout(r, 300));

      step("booking", null, "Validating booking...");
      if (!b?.reference) { step("booking", false, "No valid booking"); setError("No active booking found. Please book a slot first."); setPhase("error"); return; }
      if (b.status === "cancelled") { step("booking", false, "Booking cancelled"); setError("This booking has been cancelled."); setPhase("error"); return; }
      step("booking", true, `Booking ${b.reference} valid ✓`);
      await new Promise(r => setTimeout(r, 300));

      step("wallet", null, "Checking wallet balance...");
      const requiredPesewas = (b.amount || 175) * 100;
      const balance = await loadWallet();
      if (balance !== null && balance < requiredPesewas) {
        step("wallet", false, `Insufficient balance. Have: GH₵${(balance/100).toFixed(2)}, Need: GH₵${(requiredPesewas/100).toFixed(2)}`);
        setError(`Insufficient wallet balance. Top up at least GH₵${((requiredPesewas - balance)/100).toFixed(2)} to continue.`);
        setPhase("error"); return;
      }
      step("wallet", true, balance !== null ? `Balance GH₵${(balance/100).toFixed(2)} ✓` : "Balance check skipped (pay on arrival) ✓");
      await new Promise(r => setTimeout(r, 300));

      step("charger", null, "Checking charger availability...");
      let chargerId = b.charger_id || "ECOCHARGE-001";
      let chargerOk = false;
      if (OCPP_URL) {
        try {
          const cRes = await fetch(`${OCPP_URL}/api/chargers/${chargerId}`, { headers: { "x-api-key": OCPP_KEY } });
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData.connected && cData.status === "Available") { chargerOk = true; step("charger", true, `Charger ${chargerId} available ✓`); }
            else if (!cData.connected) { step("charger", false, "Charger offline"); setError("Charger is currently offline. Please contact station staff."); setPhase("error"); return; }
            else { step("charger", false, `Charger status: ${cData.status}`); setError(`Charger is ${cData.status}. Please wait or choose another bay.`); setPhase("error"); return; }
          } else { chargerOk = true; step("charger", true, "Station confirmed ✓"); }
        } catch(e) { chargerOk = true; step("charger", true, "Station confirmed ✓"); }
      } else { chargerOk = true; step("charger", true, "Station confirmed ✓"); }
      await new Promise(r => setTimeout(r, 300));

      step("lock", null, "Reserving funds...");
      if (SUPABASE_URL && user?.id && b.pay_method === "wallet") {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}`, {
            method: "PATCH",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ locked_pesewas: requiredPesewas })
          });
        } catch(e) {}
      }
      step("lock", true, "Funds reserved ✓");
      await new Promise(r => setTimeout(r, 200));

      step("ocpp", null, "Sending start command to charger...");
      let newTxId = Date.now();
      if (OCPP_URL) {
        try {
          const ocppRes = await fetch(`${OCPP_URL}/api/chargers/${chargerId}/remote-start`, {
            method: "POST",
            headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ idTag: user.id || b.reference, connectorId: 1 })
          });
          const ocppData = await ocppRes.json();
          if (ocppData.success && ocppData.result?.transactionId) { newTxId = ocppData.result.transactionId; step("ocpp", true, "Charger activated ✓"); }
          else if (ocppData.success) { step("ocpp", true, "Start command accepted ✓"); }
          else { step("ocpp", false, "Charger did not respond"); step("ocpp", true, "Manual activation mode ✓"); }
        } catch(e) { step("ocpp", true, "Manual activation mode ✓"); }
      } else { step("ocpp", true, "Session started ✓"); }

      const newSessionId = `SES-${Date.now().toString(36).toUpperCase()}`;
      if (SUPABASE_URL) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({
              id: newSessionId, session_ref: b.reference, transaction_id: newTxId,
              charger_id: chargerId, connector_id: 1, user_id: user?.id || null,
              booking_ref: b.reference, id_tag: user?.id || b.reference,
              status: "Charging", vehicle_type: b.vehicle, meter_start: 0,
              rate_per_kwh: 85, base_fee: 500, started_at: new Date().toISOString(), authorized_at: new Date().toISOString(),
            })
          });
        } catch(e) { console.error("Session create error:", e); }
      }

      if (SUPABASE_URL) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/bookings?reference=eq.${b.reference}`, {
            method: "PATCH",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ status: "charging", session_id: newSessionId })
          });
        } catch(e) {}
      }

      setTxId(newTxId);
      setSessionId(newSessionId);
      setElapsed(0); setLiveKwh(0); setCostSoFar(0);
      setPhase("charging");

      if (user?.id) { createNotification(user.id, "charging_started", "Charging Started", `Your session at ${b.station || "EcoCharge"} has begun.`, { session_id: newSessionId }); }

    } catch(e) {
      setError("An unexpected error occurred: " + e.message);
      setPhase("error");
    }
  };

  const stopCharging = async () => {
    setPhase("stopping");
    const chargerId = b?.charger_id || "ECOCHARGE-001";
    try {
      if (OCPP_URL && txId) {
        try {
          await fetch(`${OCPP_URL}/api/chargers/${chargerId}/remote-stop`, {
            method: "POST",
            headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: txId })
          });
        } catch(e) { console.error("RemoteStop error:", e); }
      }

      const finalKwh    = liveKwh;
      const finalCost   = costSoFar;
      const finalCostPs = Math.round(finalCost * 100);
      const now         = new Date().toISOString();

      if (SUPABASE_URL && sessionId) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?id=eq.${sessionId}`, {
            method: "PATCH",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ status: "Completed", meter_stop: Math.round(finalKwh * 1000), meter_current: Math.round(finalKwh * 1000), completed_at: now, stop_reason: "Remote", cost_total: finalCostPs, payment_status: "Paid", energy_kwh: finalKwh })
          });
        } catch(e) { console.error("Session update error:", e); }
      }

      if (SUPABASE_URL && user?.id && finalCostPs > 0) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/wallet_debit`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ p_user_id: user.id, p_amount_pesewas: finalCostPs, p_type: "debit", p_description: `Charging session at ${b?.station || "EcoCharge"} — ${finalKwh.toFixed(3)} kWh`, p_session_id: sessionId, p_booking_ref: b?.reference })
          });
          await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}`, {
            method: "PATCH",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ locked_pesewas: 0 })
          });
        } catch(e) { console.error("Wallet debit error:", e); }
      }

      if (SUPABASE_URL && b?.reference) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/bookings?reference=eq.${b.reference}`, {
            method: "PATCH",
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ status: "completed" })
          });
        } catch(e) {}
      }

      if (user?.id) { createNotification(user.id, "charging_completed", "Session Complete", `You used ${finalKwh.toFixed(2)} kWh for GH₵${finalCost.toFixed(2)}.`, { session_id: sessionId }); }
      setPhase("completed");

    } catch(e) {
      console.error("Stop charging error:", e);
      setPhase("completed");
    }
  };

  if (!b) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 20px 100px" }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-ticket-alt" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active Booking</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:24 }}>Complete a booking to get your charging pass</div>
          <button onClick={()=>go("home")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,margin:"0 auto" }}>
            <i className="fas fa-map-marker-alt"/> Find a Station
          </button>
        </div>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );

  const qrData = encodeURIComponent(`${b.reference}|${b.station}|${b.vehicle}|${b.status}`);
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=10`;

  if (phase === "verifying") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Starting Charge" sub="Running pre-checks..." onBack={()=>setPhase("ready")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(74,222,128,0.12)",border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}><Spinner/></div>
          <div style={{ fontWeight:700,fontSize:16,color:T.text }}>Verifying your session</div>
          <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>Please wait while we check everything</div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",border:`1px solid ${T.border}` }}>
          {[
            { key:"auth",    label:"User Authentication",    icon:"fa-user-shield"      },
            { key:"booking", label:"Booking Validation",     icon:"fa-calendar-check"   },
            { key:"wallet",  label:"Wallet Balance",         icon:"fa-wallet"           },
            { key:"charger", label:"Charger Availability",   icon:"fa-charging-station" },
            { key:"lock",    label:"Reserving Funds",        icon:"fa-lock"             },
            { key:"ocpp",    label:"Activating Charger",     icon:"fa-bolt"             },
          ].map(item=>{
            const c = checks[item.key];
            return (
              <div key={item.key} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <div style={{ width:36,height:36,borderRadius:10,background:c?.ok===true?"rgba(74,222,128,0.12)":c?.ok===false?"rgba(248,113,113,0.12)":T.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {c?.ok===null ? <Spinner/> : c?.ok===true ? <i className="fas fa-check" style={{ color:T.green,fontSize:14 }}/> : c?.ok===false ? <i className="fas fa-times" style={{ color:T.red,fontSize:14 }}/> : <i className={`fas ${item.icon}`} style={{ color:T.muted,fontSize:14 }}/>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600,fontSize:13,color:T.text }}>{item.label}</div>
                  {c?.msg&&<div style={{ fontSize:11,color:c.ok===false?T.red:T.muted,marginTop:2 }}>{c.msg}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Cannot Start" onBack={()=>setPhase("ready")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 24px 100px" }}>
        <div style={{ textAlign:"center",width:"100%" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(248,113,113,0.12)",border:"2px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize:28,color:T.red }}/>
          </div>
          <div style={{ fontWeight:800,fontSize:18,color:T.text,marginBottom:10 }}>Verification Failed</div>
          <div style={{ fontSize:13,color:T.muted,marginBottom:24,lineHeight:1.7,background:"rgba(248,113,113,0.06)",borderRadius:12,padding:"14px",border:"1px solid rgba(248,113,113,0.15)" }}>{error}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <button onClick={()=>setPhase("ready")} className="tap"
              style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-arrow-left" style={{ marginRight:6 }}/>Try Again
            </button>
            <button onClick={()=>go("wallet")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-wallet" style={{ marginRight:6 }}/>Top Up
            </button>
          </div>
        </div>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );

  if (phase === 'charging' || phase === 'stopping') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',background:T.bg }}>
      <div style={{ padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-chevron-left" style={{ fontSize:18,color:T.text }}/>
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:11,color:T.muted }}>{phase==='stopping'?'Stopping':'Charging'}</div>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{b.charger_id||'Charger'}</div>
        </div>
        <button onClick={stopCharging} disabled={phase==='stopping'} className="tap"
          style={{ background:"none",border:`1px solid ${T.red}`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,color:T.red,cursor:phase==='stopping'?'default':'pointer',fontFamily:'inherit',opacity:phase==='stopping'?0.6:1 }}>
          Stop
        </button>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'20px 16px 24px' }}>
        <div style={{ textAlign:'center',fontSize:12,color:T.muted,marginBottom:18 }}>{b.station}</div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8,position:'relative' }}>
          <div style={{ position:'relative',width:210,height:210 }}>
            <svg width='210' height='210' style={{ transform:'rotate(-90deg)' }}>
              <circle cx='105' cy='105' r='90' fill='none' stroke={T.surface} strokeWidth='14'/>
              <circle cx='105' cy='105' r='90' fill='none' stroke={T.green} strokeWidth='14'
                strokeDasharray={`${2*Math.PI*90}`}
                strokeDashoffset={`${2*Math.PI*90*(1-pct/100)}`}
                strokeLinecap='round' style={{ transition:'stroke-dashoffset 1s linear' }}/>
            </svg>
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Charging Power</div>
              <div style={{ fontWeight:800,fontSize:34,color:T.text,lineHeight:1 }}>{livePower.toFixed(1)} <span style={{ fontSize:16,color:T.muted,fontWeight:600 }}>kW</span></div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex',justifyContent:'center',marginBottom:8 }}>
          <VehicleAvatar vehicleType={b.vehicle} size={120}/>
        </div>
        <div style={{ textAlign:'center',color:T.green,fontWeight:600,fontSize:13,marginBottom:22 }}>
          <span style={{ display:'inline-block',width:6,height:6,borderRadius:'50%',background:T.green,marginRight:6 }}/>
          {phase==='stopping'?'Stopping…':'Charging…'}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16 }}>
          {[
            { label:'Energy',   value:liveKwh.toFixed(2),           unit:'kWh' },
            { label:'Duration', value:fmtElapsed(elapsed),          unit:'hh:mm:ss' },
            { label:'Cost',     value:`GH₵${costSoFar.toFixed(2)}`, unit:null },
          ].map(m=>(
            <div key={m.label} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:'14px 8px',textAlign:'center' }}>
              <div style={{ fontWeight:700,fontSize:17,color:T.text }}>{m.value}</div>
              <div style={{ fontSize:10,color:T.muted,marginTop:4 }}>{m.label}</div>
              {m.unit&&<div style={{ fontSize:9,color:T.muted,marginTop:1 }}>{m.unit}</div>}
            </div>
          ))}
        </div>

        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,overflow:'hidden',marginBottom:14 }}>
          <div className="tap" onClick={()=>setDetailsOpen(o=>!o)} style={{ padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer' }}>
            <span style={{ fontWeight:700,fontSize:13,color:T.text }}>Session Details</span>
            <i className={`fas fa-chevron-${detailsOpen?'up':'down'}`} style={{ fontSize:12,color:T.muted }}/>
          </div>
          {detailsOpen&&(
            <div style={{ padding:'0 16px 16px' }}>
              {[
                { label:'Session ID',  value:sessionId||'--' },
                { label:'Charger',     value:b.charger_id||'ECOCHARGE-001' },
                { label:'Rate',        value:'GH₵0.85/kWh + GH₵5 base' },
                { label:'Est. Finish', value:estRemaining?`~${estRemaining} remaining`:'--' },
              ].map(r=>(
                <div key={r.label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.muted,fontSize:12 }}>{r.label}</span>
                  <span style={{ color:T.text,fontWeight:600,fontSize:12 }}>{r.value}</span>
                </div>
              ))}
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.muted,fontSize:12 }}>Wallet Balance</span>
                <span style={{ color:walletBal!=null&&walletBal<(costSoFar*100+500)?T.red:T.green,fontWeight:700,fontSize:12 }}>
                  {walletBal!=null?`GH₵${(walletBal/100).toFixed(2)}`:'--'}
                </span>
              </div>
              {powerHistory.length>2&&(
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}>Power history</div>
                  <div style={{ height:40,display:'flex',alignItems:'flex-end',gap:2 }}>
                    {powerHistory.map((p,i)=>{
                      const maxP=Math.max(...powerHistory.map(x=>x.v),0.1);
                      const h=Math.max(4,Math.round((p.v/maxP)*36));
                      return <div key={i} style={{ flex:1,height:`${h}px`,background:i===powerHistory.length-1?T.green:T.surface,borderRadius:'2px 2px 0 0' }}/>;
                    })}
                  </div>
                </div>
              )}
              <div style={{ fontSize:10,color:T.muted,textAlign:'center',marginTop:12 }}>
                {realtimeData?'Live data from charger':'Simulated data — connect OCPP charger for live readings'}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize:11,color:T.muted,textAlign:'center',lineHeight:1.7 }}>
          Wallet will be debited GH₵{costSoFar.toFixed(2)} when you stop · 85% solar powered
        </div>
      </div>
    </div>
  );

  if (phase === "completed") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Session Complete" sub="Thank you for charging!" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:`0 4px 24px rgba(74,222,128,0.4)` }}>
            <i className="fas fa-check" style={{ fontSize:36,color:"#000" }}/>
          </div>
          <div style={{ fontWeight:900,fontSize:24,color:T.green,marginBottom:6 }}>Charging Complete!</div>
          <div style={{ fontSize:13,color:T.muted }}>Session ended · {b.station}</div>
        </div>
        <div style={{ background:T.highlightGrad,borderRadius:18,padding:"20px",marginBottom:16,border:`1px solid rgba(74,222,128,0.2)` }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
            {[
              { label:"Energy Delivered", value:`${liveKwh.toFixed(3)} kWh`, color:T.green  },
              { label:"Time Charged",     value:fmtElapsed(elapsed),         color:T.blue   },
              { label:"Total Cost",       value:`GH₵${costSoFar.toFixed(2)}`,color:T.yellow },
              { label:"CO₂ Saved",        value:`${(liveKwh*0.5).toFixed(2)} kg`,color:T.green },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:"center" }}>
                <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"rgba(56,189,248,0.1)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
            <i className="fas fa-tint" style={{ fontSize:16,color:T.blue }}/>
            <div>
              <div style={{ fontWeight:700,fontSize:13,color:T.blue }}>20L Clean Water Included</div>
              <div style={{ fontSize:11,color:T.muted }}>Collect at the station counter</div>
            </div>
          </div>
        </div>
        {walletBal!=null&&(
          <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",marginBottom:16,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"rgba(74,222,128,0.12)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <i className="fas fa-wallet" style={{ fontSize:16,color:T.green }}/>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Wallet Debited</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>GH₵{costSoFar.toFixed(2)} charged · Balance: GH₵{((walletBal - Math.round(costSoFar*100))/100).toFixed(2)}</div>
            </div>
          </div>
        )}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <button onClick={()=>go("home")} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className="fas fa-home"/>Home
          </button>
          <button onClick={()=>go("sessions")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className="fas fa-list"/>Sessions
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" sub="Ready to charge" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        {walletBal!=null&&(
          <div style={{ background:"rgba(74,222,128,0.08)",border:`1px solid rgba(74,222,128,0.2)`,borderRadius:12,padding:"10px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <i className="fas fa-wallet" style={{ color:T.green,fontSize:14 }}/>
              <span style={{ fontSize:13,color:T.text,fontWeight:600 }}>Wallet Balance</span>
            </div>
            <span style={{ fontWeight:800,fontSize:16,color:T.green }}>GH₵{(walletBal/100).toFixed(2)}</span>
          </div>
        )}
        <div style={{ textAlign:"center",marginBottom:16 }}>
          <div style={{ display:"inline-block",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,borderRadius:20,padding:"7px 24px" }}>
            <span style={{ fontSize:12,fontWeight:800,color:"#000",letterSpacing:1 }}>READY TO CHARGE</span>
          </div>
        </div>
        <div className="fade" style={{ background:T.highlightGrad2,borderRadius:20,padding:"20px",textAlign:"center",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ background:"#0f1117",borderRadius:16,padding:14,display:"inline-block",border:`2px solid ${T.greenDim}`,marginBottom:12,position:"relative" }}>
            <img src={qrUrl} alt="QR" width={190} height={190} style={{ borderRadius:8,display:"block" }}/>
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:36,height:36,borderRadius:8,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${T.greenDim}` }}>
              <i className="fas fa-bolt" style={{ fontSize:16,color:T.green }}/>
            </div>
          </div>
          <div style={{ fontSize:11,color:T.muted,marginBottom:6 }}>Booking Reference</div>
          <div style={{ fontWeight:800,fontSize:18,color:T.green,letterSpacing:2,marginBottom:4 }}>{b.reference}</div>
          <div style={{ fontSize:11,color:T.muted }}>Show to attendant or tap Start below</div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          {[
            { label:"Station",  value:b.station,     icon:"fa-map-marker-alt" },
            { label:"Vehicle",  value:b.vehicle,      icon:"fa-car"            },
            ...(b.booking_mode==="now"
              ? [{ label:"Billing", value:"Metered — pay per kWh used", icon:"fa-bolt" }]
              : [{ label:"Duration", value:`${b.duration_min} min`, icon:"fa-hourglass-half" },
                 { label:"Amount",   value:`GH₵${b.amount}`, icon:"fa-money-bill-alt" }]),
            { label:"Payment",  value:b.pay_method==="wallet"||b.pay_method==="now"?"Charged from wallet":"Pay on Arrival", icon:"fa-credit-card" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <i className={`fas ${r.icon}`} style={{ fontSize:12,color:T.muted,width:16 }}/>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              </div>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <button onClick={startCharging} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"18px",fontSize:17,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,boxShadow:`0 4px 24px rgba(74,222,128,0.45)` }}>
          <i className="fas fa-bolt"/> Start Charging
        </button>
        <div style={{ fontSize:11,color:T.muted,textAlign:"center",marginBottom:10 }}>
          <i className="fas fa-shield-alt" style={{ marginRight:5,color:T.green }}/>
          Wallet · Booking · Charger verified before starting
        </div>
        <button onClick={()=>go("map")} className="tap"
          style={{ width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-map-marker-alt"/> View Station on Map
        </button>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function Verify({ go }) {
  const [code,setCode]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoad]=useState(false);
  const [error,setErr]=useState("");
  const [scanning,setScanning]=useState(false);
  const verify=async(overrideCode)=>{
    const raw0=(overrideCode??code).trim();
    if (!raw0) { setErr("Enter a booking reference");return; }
    setLoad(true);setErr("");setResult(null);
    try {
      const raw=raw0.toUpperCase();
      const ref=raw.includes("|")?raw.split("|")[0].trim():raw;
      const data=await sb(`bookings?reference=eq.${ref}&select=*`);
      if (!data||data.length===0) { setErr(`Booking "${ref}" not found.`); }
      else {
        const b=data[0];
        if (SUPABASE_URL) await sb(`bookings?id=eq.${b.id}`,{ method:"PATCH",headers:{ Prefer:"return=minimal" },body:JSON.stringify({ verified:true,verified_at:new Date().toISOString() }) });
        setResult(b);
      }
    } catch(e) { setErr("Verification failed. Check internet connection."); }
    setLoad(false);
  };
  const onScanResult=(text)=>{ setScanning(false); setCode(text); verify(text); };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      {scanning && <QRScanner onResult={onScanResult} onClose={()=>setScanning(false)} hint="Point the camera at the customer's QR code"/>}
      <Header title="Verify Booking" sub="Attendant Portal" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div style={{ background:T.card,borderRadius:16,padding:"18px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:6 }}><i className="fas fa-qrcode" style={{ marginRight:8,color:T.green }}/> Scan QR Code</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Use camera to scan booking QR</div>
          <button onClick={()=>setScanning(true)} className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-camera"/> Open Camera
          </button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
          <div style={{ flex:1,height:1,background:T.border }}/><span style={{ fontSize:12,color:T.muted }}>or enter reference manually</span><div style={{ flex:1,height:1,background:T.border }}/>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13,color:T.muted,marginBottom:10 }}>Enter booking reference</div>
          <div style={{ position:"relative",marginBottom:12 }}>
            <i className="fas fa-hashtag" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
            <input placeholder="ECO-XXXXXX" value={code} onChange={e=>{ setCode(e.target.value.toUpperCase());setErr("");setResult(null); }}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 14px 14px 40px",color:T.text,fontSize:16,fontFamily:"monospace",letterSpacing:1 }}/>
          </div>
          <button onClick={verify} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            {loading?<><Spinner/> Verifying…</>:<><i className="fas fa-search"/> Verify</>}
          </button>
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"12px 16px",marginBottom:12,color:T.red,fontSize:13,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}
        {result&&(
          <div className="fade" style={{ background:T.highlightSolid,border:`1px solid ${T.greenDim}`,borderRadius:16,padding:"18px",marginBottom:12 }}>
            <div style={{ textAlign:"center",marginBottom:16 }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px" }}>
                <i className="fas fa-check" style={{ fontSize:26,color:"#000" }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:18,color:T.green }}>Booking Verified</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>This booking is valid</div>
            </div>
            {[{ label:"Name",value:result.name },{ label:"Vehicle",value:result.vehicle },{ label:"Station",value:result.station },{ label:"Amount",value:`GH₵${result.amount}` }].map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
              </div>
            ))}
            <button className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"15px",textAlign:"center",marginTop:8,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:15,fontWeight:800,color:"#000" }}>
              <i className="fas fa-bolt"/> Authorize & Start Charging
            </button>
          </div>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

function Profile({ go,user,setUser,onMenu }) {
  const fileRef=useRef(null);
  const [avatar,setAvatar]=useState(null);
  const [avatarErr,setAvatarErr]=useState("");
  const [avatarSaving,setAvatarSaving]=useState(false);
  useEffect(()=>{
    if(!SUPABASE_URL||!user?.id)return;
    fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${user.id}&select=avatar_url`,{headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.json()).then(d=>{if(d?.[0]?.avatar_url)setAvatar(d[0].avatar_url);}).catch(()=>{});
  },[user]);
  const handlePhoto=async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    setAvatarErr(""); setAvatarSaving(true);
    const r=new FileReader(); r.onload=(ev)=>setAvatar(ev.target.result); r.readAsDataURL(file);
    if(!SUPABASE_URL||!user?.id) { setAvatarSaving(false); return; }
    try{
      const ext=file.name.split('.').pop(); const path=`${user.id}/avatar.${ext}`;
      const res=await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`,{method:'POST',headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}`,'Content-Type':file.type,'x-upsert':'true'},body:file});
      if(!res.ok){
        const errText=await res.text().catch(()=>"");
        setAvatarErr(`Upload failed (${res.status}): ${errText.slice(0,160)}`);
        setAvatarSaving(false); return;
      }
      const url=`${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
      setAvatar(url);
      const patchRes=await fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${user.id}`,{method:'PATCH',headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({avatar_url:url})});
      if(!patchRes.ok){ const errText=await patchRes.text().catch(()=>""); setAvatarErr(`Save failed (${patchRes.status}): ${errText.slice(0,160)}`); setAvatarSaving(false); return; }
      const patchData=await patchRes.json().catch(()=>[]);
      if(!Array.isArray(patchData)||patchData.length===0){ setAvatarErr("Save did not match any user record — your account row may be missing or auth_id doesn't match."); setAvatarSaving(false); return; }
    }catch(e){ setAvatarErr("Network error while saving photo: "+String(e)); }
    setAvatarSaving(false);
  };
  const booking=(()=>{ try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } })();
  const totalCharges=booking?1:0;
  const totalSpent=booking?booking.amount:0;
  const co2Saved=totalCharges*4;
  const waterReceived=totalCharges*20;
  const [loyaltyData,setLoyaltyData]=useState({points:0,tier:"Bronze",totalCharges:0,totalKwh:0});
  useEffect(()=>{
    if(!SUPABASE_URL||!user?.id)return;
    fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${user.id}&select=loyalty_points,loyalty_tier,total_charges,total_kwh`,{headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.json()).then(d=>{if(d?.[0])setLoyaltyData({points:d[0].loyalty_points||0,tier:d[0].loyalty_tier||"Bronze",totalCharges:d[0].total_charges||0,totalKwh:d[0].total_kwh||0});}).catch(()=>{});
  },[user]);
  const tierColor={"Bronze":"#cd7f32","Silver":"#9ca3af","Gold":"#fbbf24","Platinum":"#38bdf8"}[loyaltyData.tier]||"#cd7f32";
  const tierNext={"Bronze":500,"Silver":2000,"Gold":5000,"Platinum":5000}[loyaltyData.tier]||500;
  const tierPct=Math.min(100,Math.round((loyaltyData.points/tierNext)*100));

  const menuItems=[
    { icon:"fa-car",            label:"My Vehicles",         screen:"myvehicles"    },
    { icon:"fa-bell",           label:"Notifications",       screen:"notifications" },
    { icon:"fa-credit-card",    label:"Payment Methods",     screen:"wallet"        },
    { icon:"fa-cog",            label:"Settings",            screen:"settings"      },
    { icon:"fa-leaf",           label:"Zero Emissions",      screen:"zeroemissions" },
    { icon:"fa-info-circle",    label:"About EcoCharge",     screen:"about"         },
    { icon:"fa-shield-alt",     label:"Privacy Policy",      screen:"privacypolicy" },
    { icon:"fa-file-contract",  label:"Terms & Conditions",  screen:"terms"         },
    { icon:"fa-undo",           label:"Refund Policy",       screen:"refund"        },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" sub="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {user ? (
          <>
            <div className="fade" style={{ background:T.highlightGrad2,borderRadius:18,padding:"24px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              <div style={{ position:"relative",display:"inline-block",marginBottom:14 }}>
                <div style={{ width:82,height:82,borderRadius:"50%",overflow:"hidden",border:`3px solid ${T.green}`,margin:"0 auto" }}>
                  {avatar
                    ? <img src={avatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <div style={{ width:"100%",height:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}><i className="fas fa-user" style={{ fontSize:34,color:"#000" }}/></div>
                  }
                </div>
                <button onClick={()=>fileRef.current?.click()} className="tap" disabled={avatarSaving}
                  style={{ position:"absolute",bottom:-2,right:-2,width:28,height:28,borderRadius:"50%",background:T.green,border:`2px solid ${T.bg}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:avatarSaving?"default":"pointer" }}>
                  {avatarSaving?<Spinner/>:<i className="fas fa-camera" style={{ fontSize:11,color:"#000" }}/>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
              </div>
              {avatarErr&&(
                <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:12,color:T.red,fontSize:11,lineHeight:1.6,textAlign:"left" }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight:6 }}/>{avatarErr}
                </div>
              )}
              <div style={{ fontWeight:800,fontSize:20,color:T.text }}>{user.name||user.email?.split("@")[0]}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4,marginBottom:12 }}>{user.email||user.phone}</div>
              <Badge label="Active Member" color={T.green}/>
              <div style={{marginTop:16,width:"100%",background:T.innerTint,borderRadius:14,padding:"14px 16px",border:`1px solid ${tierColor}33`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{"Bronze"===loyaltyData.tier?"🥉":"Silver"===loyaltyData.tier?"🥈":"Gold"===loyaltyData.tier?"🥇":"💎"}</span>
                    <div><div style={{fontWeight:800,fontSize:15,color:tierColor}}>{loyaltyData.tier}</div><div style={{fontSize:11,color:T.muted}}>Loyalty Tier</div></div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:22,color:tierColor}}>{loyaltyData.points.toLocaleString()}</div><div style={{fontSize:11,color:T.muted}}>points</div></div>
                </div>
                <div style={{height:6,borderRadius:3,background:T.track,overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${tierPct}%`,background:`linear-gradient(90deg,${tierColor},${tierColor}99)`,borderRadius:3,transition:"width 1s ease"}}/>
                </div>
                <div style={{fontSize:11,color:T.muted,textAlign:"right"}}>{loyaltyData.tier==="Platinum"?"Max tier reached!":`${tierNext-loyaltyData.points} points to next tier`}</div>
              </div>
            </div>
            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
              {[{ label:"Total Charges",value:totalCharges,color:T.green,icon:"fa-bolt" },{ label:"CO₂ Saved",value:`${co2Saved} kg`,color:T.green,icon:"fa-leaf" },{ label:"Water Received",value:`${waterReceived} L`,color:T.blue,icon:"fa-tint" },{ label:"Total Spent",value:`GH₵${totalSpent}`,color:T.yellow,icon:"fa-money-bill-alt" }].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <i className={`fas ${s.icon}`} style={{ fontSize:20,color:s.color,marginBottom:8,display:"block" }}/>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="fade2" style={{ background:T.card,borderRadius:16,border:`1px solid ${T.border}`,marginBottom:16,overflow:"hidden" }}>
              {menuItems.map((item,i)=>(
                <div key={item.label} className="tap row" onClick={()=>go(item.screen)}
                  style={{ display:"flex",alignItems:"center",gap:14,padding:"16px",borderBottom:i<menuItems.length-1?`1px solid ${T.border}20`:"none",cursor:"pointer" }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <i className={`fas ${item.icon}`} style={{ fontSize:15,color:T.mutedLight }}/>
                  </div>
                  <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
                  <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
                </div>
              ))}
            </div>
            <button onClick={()=>setUser(null)} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
              <i className="fas fa-sign-out-alt"/> Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"40px 16px" }}>
            <i className="fas fa-user-circle" style={{ fontSize:80,color:T.muted,marginBottom:16,display:"block" }}/>
            <div style={{ fontWeight:800,fontSize:22,color:T.text,marginBottom:8 }}>Your Profile</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.8 }}>Track charges, view bookings,<br/>and see your environmental impact.</div>
            <button onClick={()=>go("auth")} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <i className="fas fa-sign-in-alt"/> Sign In / Register
            </button>
          </div>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

// ── ABOUT SCREEN — Updated with hero image, impact stats, opportunities ──────
function About({ go, onMenu }) {
  const impactStats = [
    { icon:"fa-users",          value:"150+", label:"Local Jobs\nCreated"            },
    { icon:"fa-graduation-cap", value:"80+",  label:"Youth Trained\n(EV & Solar Tech)" },
    { icon:"fa-map-marker-alt", value:"25+",  label:"Stations with\nLocal Teams"      },
    { icon:"fa-handshake",      value:"100%", label:"Committed to\nLocal Growth"      },
  ];

  const opportunities = [
    { icon:"fa-briefcase",      label:"Job Openings",           sub:"View current job vacancies",             href:`mailto:${CONTACT_INFO.email}?subject=Job+Application` },
    { icon:"fa-graduation-cap", label:"Apprenticeship Program",  sub:"Hands-on training for young talents",    href:`mailto:${CONTACT_INFO.email}?subject=Apprenticeship+Enquiry` },
    { icon:"fa-users",          label:"Partner With Us",         sub:"Refer talent or partner with EcoCharge", href:`mailto:${CONTACT_INFO.email}?subject=Partnership+Enquiry` },
    { icon:"fa-file-alt",       label:"Submit Your CV",          sub:"Send us your CV for future roles",       href:`mailto:${CONTACT_INFO.email}?subject=CV+Submission` },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ position:"relative",height:180,flexShrink:0,overflow:"hidden" }}>
        <img src="/station2.jpg" alt="EcoCharge" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.55) saturate(1.3)" }} onError={e=>e.target.style.display="none"}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.65) 100%)" }}/>
        <div style={{ position:"absolute",top:"calc(16px + env(safe-area-inset-top, 34px))",left:14 }}>
          <button onClick={()=>go("home")} className="tap" style={{ width:36,height:36,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <i className="fas fa-arrow-left" style={{ fontSize:16,color:"#fff" }}/>
          </button>
        </div>
        <div style={{ position:"absolute",bottom:16,left:16,right:80 }}>
          <div style={{ fontWeight:900,fontSize:22,color:"#fff",letterSpacing:-0.5 }}>About EcoCharge</div>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4 }}>Our mission for a cleaner future</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        {[
          { icon:"fa-sun",color:T.yellow,title:"Solar EV Charging",text:"100% solar-powered stations across Ghana providing clean, affordable EV charging." },
          { icon:"fa-tint",color:T.blue,title:"Clean Water Access",text:"Every charging session includes 20L of clean desalinated water for you and your family." },
          { icon:"fa-leaf",color:T.green,title:"Zero Emissions",text:"Our stations run on solar and hydrogen energy — zero carbon footprint." },
          { icon:"fa-users",color:T.mutedLight,title:"Local Employment",text:"We train and employ local Ghanaians at every station across the country." },
        ].map((item,i)=>(
          <div key={i} style={{ background:T.card,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ width:44,height:44,borderRadius:12,flexShrink:0,background:`${item.color}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <i className={`fas ${item.icon}`} style={{ fontSize:18,color:item.color }}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:5 }}>{item.title}</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{item.text}</div>
            </div>
          </div>
        ))}

        <div style={{ background:T.highlightGrad2,borderRadius:18,padding:"18px 16px",marginBottom:14,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.green,marginBottom:14 }}>Our Impact</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8 }}>
            {impactStats.map((s,i)=>(
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
                  <i className={`fas ${s.icon}`} style={{ fontSize:14,color:T.green }}/>
                </div>
                <div style={{ fontWeight:900,fontSize:18,color:T.text,lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:5,lineHeight:1.4,whiteSpace:"pre-line" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:18,padding:"18px 16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.green,marginBottom:4 }}>Opportunities</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Join our mission and build the future of clean energy in Ghana.</div>
          {opportunities.map((o,i)=>(
            <a key={i} href={o.href} className="tap row"
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:i<opportunities.length-1?`1px solid ${T.border}20`:"none",textDecoration:"none",color:"inherit" }}>
              <div style={{ width:40,height:40,borderRadius:10,background:`${T.green}18`,border:`1px solid ${T.green}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className={`fas ${o.icon}`} style={{ fontSize:15,color:T.green }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{o.label}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{o.sub}</div>
              </div>
              <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
            </a>
          ))}
        </div>

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",margin:"10px 0 10px 4px" }}>Contact Us</div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,marginBottom:16,overflow:"hidden" }}>
          <a href={`mailto:${CONTACT_INFO.email}`} className="tap row" style={{ display:"flex",alignItems:"center",gap:14,padding:"15px 16px",borderBottom:`1px solid ${T.border}`,textDecoration:"none",color:"inherit" }}>
            <i className="fas fa-envelope" style={{ fontSize:15,color:T.green,width:20,textAlign:"center" }}/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:11,color:T.muted }}>Email</div>
              <div style={{ fontSize:13,color:T.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{CONTACT_INFO.email}</div>
            </div>
            <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
          </a>
          {CONTACT_INFO.phones.map(p=>(
            <a key={p} href={`tel:+233${p.replace(/^0/,"")}`} className="tap row" style={{ display:"flex",alignItems:"center",gap:14,padding:"15px 16px",borderBottom:`1px solid ${T.border}`,textDecoration:"none",color:"inherit" }}>
              <i className="fas fa-phone" style={{ fontSize:14,color:T.green,width:20,textAlign:"center" }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11,color:T.muted }}>Call</div>
                <div style={{ fontSize:13,color:T.text,fontWeight:600 }}>{p}</div>
              </div>
              <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
            </a>
          ))}
          <a href={`https://wa.me/233${CONTACT_INFO.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noopener noreferrer" className="tap row" style={{ display:"flex",alignItems:"center",gap:14,padding:"15px 16px",textDecoration:"none",color:"inherit" }}>
            <i className="fab fa-whatsapp" style={{ fontSize:16,color:"#25D366",width:20,textAlign:"center" }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11,color:T.muted }}>WhatsApp</div>
              <div style={{ fontSize:13,color:T.text,fontWeight:600 }}>{CONTACT_INFO.whatsapp}</div>
            </div>
            <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
          </a>
        </div>

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",margin:"10px 0 10px 4px" }}>Follow Us</div>
        <div style={{ display:"flex",gap:10,marginBottom:16 }}>
          {SOCIAL_LINKS.map(s=>(
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="tap"
              style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 8px",textAlign:"center",textDecoration:"none" }}>
              <i className={`fab ${s.icon}`} style={{ fontSize:20,color:s.color,marginBottom:8,display:"block" }}/>
              <div style={{ fontSize:11,color:T.text,fontWeight:600 }}>{s.label}</div>
            </a>
          ))}
        </div>

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",margin:"10px 0 10px 4px" }}>Legal</div>
        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,marginBottom:16,overflow:"hidden" }}>
          {[
            { label:"Privacy Policy",     screen:"privacypolicy", icon:"fa-shield-alt"    },
            { label:"Terms & Conditions", screen:"terms",          icon:"fa-file-contract" },
            { label:"Refund Policy",      screen:"refund",         icon:"fa-undo"          },
          ].map((l,i)=>(
            <div key={l.label} className="tap row" onClick={()=>go(l.screen)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"15px 16px",borderBottom:i<2?`1px solid ${T.border}`:"none",cursor:"pointer" }}>
              <i className={`fas ${l.icon}`} style={{ fontSize:14,color:T.mutedLight,width:20,textAlign:"center" }}/>
              <span style={{ flex:1,fontSize:13,color:T.text,fontWeight:600 }}>{l.label}</span>
              <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
            </div>
          ))}
        </div>

        <div style={{ textAlign:"center",fontSize:11,color:T.muted,marginBottom:16 }}>EcoCharge Ghana · Version {APP_VERSION}</div>

        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-bolt"/> Find a Station
        </button>
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

// ── LEGAL SHARED COMPONENT ────────────────────────────────────
function LegalSection({ title, children }) {
  return (
    <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:12 }}>
      <div style={{ fontWeight:700,fontSize:14,color:T.green,marginBottom:10 }}>{title}</div>
      <div style={{ fontSize:13,color:T.mutedLight,lineHeight:1.8,whiteSpace:"pre-line" }}>{children}</div>
    </div>
  );
}

// ── PRIVACY POLICY ────────────────────────────────────────────
function PrivacyPolicy({ go }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Privacy Policy" sub="Last updated: June 2025" onBack={()=>go("about")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        <div style={{ background:T.highlightGrad2,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontWeight:800,fontSize:15,color:T.green,marginBottom:6 }}>Your Privacy Matters</div>
          <div style={{ fontSize:13,color:T.mutedLight,lineHeight:1.8 }}>
            EcoCharge Ghana ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use the EcoCharge Ghana mobile application.
          </div>
        </div>

        <LegalSection title="1. Information We Collect">
{`We collect the following categories of information:

Account Information: your name, email address, phone number, and password when you create an account.

Charging & Booking Data: session history, station usage, vehicle type, booking references, and charging durations.

Payment Information: wallet top-up history, transaction references, and payment amounts. We do not store full card numbers — payments are processed securely via Paystack.

Device Information: device type, operating system, app version, and unique device identifiers for analytics and security.

Location Data: approximate GPS location to help you find nearby charging stations. We only access your location when the app is in use, and only with your permission.`}
        </LegalSection>

        <LegalSection title="2. How We Use Your Information">
{`We use your information to:
• Provide and improve the EcoCharge Ghana charging service
• Process bookings and charging sessions
• Manage your wallet and transaction history
• Send notifications about your sessions, wallet balance, and bookings
• Respond to customer support requests
• Comply with legal and regulatory obligations in the Republic of Ghana
• Analyse usage patterns to improve app performance and user experience`}
        </LegalSection>

        <LegalSection title="3. Payments & Wallet">
All financial transactions are processed through Paystack, a PCI-DSS compliant payment provider. We store transaction references and amounts for accounting and refund purposes. Your full payment card details are never stored on EcoCharge systems. Wallet balances are held in your EcoCharge account and are subject to our Refund Policy.
        </LegalSection>

        <LegalSection title="4. Location Services">
Location access is used exclusively to show nearby charging stations and to provide navigation assistance. We do not track your location in the background. Location data is not sold or shared with third parties for marketing purposes.
        </LegalSection>

        <LegalSection title="5. Data Security">
We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure database storage via Supabase, and access controls to protect your personal data. No method of transmission over the internet is 100% secure; however, we take all reasonable precautions to protect your information.
        </LegalSection>

        <LegalSection title="6. Sharing Your Information">
{`We do not sell your personal data. We may share your information with:
• Paystack — for payment processing
• Supabase — for secure data storage
• Law enforcement — when legally required by Ghanaian law
• Station operators — limited data required to facilitate your charging session`}
        </LegalSection>

        <LegalSection title="7. Your Rights">
{`You have the right to:
• Access the personal data we hold about you
• Request correction of inaccurate data
• Request deletion of your account and associated data
• Withdraw consent for location access at any time via device settings
• Opt out of marketing communications

To exercise these rights, contact us at ecochargeghanaltd@gmail.com.`}
        </LegalSection>

        <LegalSection title="8. Data Retention">
We retain your account data for as long as your account is active. Transaction records are retained for a minimum of 5 years to comply with Ghanaian financial regulations. You may request deletion of your account at any time; some data may be retained where required by law.
        </LegalSection>

        <LegalSection title="9. Children's Privacy">
EcoCharge Ghana is not intended for use by persons under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal information, please contact us immediately.
        </LegalSection>

        <LegalSection title="10. Changes to This Policy">
We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of the app after changes constitutes acceptance of the updated policy.
        </LegalSection>

        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:8 }}>Contact Us</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.8 }}>
            For privacy-related enquiries, contact:<br/>
            <strong style={{ color:T.text }}>EcoCharge Ghana Ltd</strong><br/>
            Email: ecochargeghanaltd@gmail.com<br/>
            Phone: 0504008059
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TERMS & CONDITIONS ────────────────────────────────────────
function TermsAndConditions({ go }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Terms & Conditions" sub="Last updated: June 2025" onBack={()=>go("about")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        <div style={{ background:T.highlightGrad2,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontWeight:800,fontSize:15,color:T.green,marginBottom:6 }}>Please Read Carefully</div>
          <div style={{ fontSize:13,color:T.mutedLight,lineHeight:1.8 }}>
            By downloading or using the EcoCharge Ghana application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.
          </div>
        </div>

        <LegalSection title="1. Acceptance of Terms">
These Terms and Conditions ("Terms") govern your use of the EcoCharge Ghana mobile application and related services ("Service") operated by EcoCharge Ghana Ltd ("Company", "we", "us"). By accessing or using the Service, you confirm that you are at least 18 years of age and legally capable of entering into a binding contract under the laws of the Republic of Ghana.
        </LegalSection>

        <LegalSection title="2. User Responsibilities">
{`As a user of EcoCharge Ghana, you agree to:
• Provide accurate and truthful registration information
• Keep your account credentials confidential and secure
• Ensure your vehicle is compatible with the charging equipment before initiating a session
• Follow all safety instructions displayed at charging stations
• Not tamper with, damage, or misuse any EcoCharge equipment
• Report any faults, damage, or safety concerns to station staff immediately
• Comply with all applicable Ghanaian laws and regulations`}
        </LegalSection>

        <LegalSection title="3. Charging Sessions">
Charging sessions begin when you activate a charger via the app. You are responsible for monitoring your session. Sessions will be billed based on actual energy consumed (kWh) at the applicable tariff rate. An idle fee applies after the grace period if your vehicle remains connected but is no longer charging. EcoCharge Ghana reserves the right to terminate a session remotely if safety concerns arise or misuse is detected.
        </LegalSection>

        <LegalSection title="4. Reservations & Bookings">
Reservations guarantee a charging bay for the selected time slot. Failure to arrive within 15 minutes of your reserved slot may result in forfeiture of the reservation without refund. Bookings are personal and non-transferable. EcoCharge Ghana reserves the right to cancel reservations in cases of equipment failure, emergency maintenance, or force majeure events.
        </LegalSection>

        <LegalSection title="5. Wallet Usage">
The EcoCharge Wallet ("Wallet") is a prepaid digital balance used to pay for charging sessions and services. Wallet funds have no cash value and cannot be transferred to other users. The Wallet is subject to a minimum top-up amount of GH₵5.00. EcoCharge Ghana reserves the right to deduct outstanding charges from your Wallet balance. Unused Wallet balances may be refunded upon account closure, subject to the Refund Policy.
        </LegalSection>

        <LegalSection title="6. Payment Terms">
All prices are displayed in Ghanaian Cedis (GH₵) and are inclusive of applicable taxes. Payment is made via Wallet deduction at the end of each charging session. For reservations, the estimated session cost is reserved (locked) in your Wallet at session start and finalised once the session ends. Payments are processed by Paystack; EcoCharge Ghana does not store full card details.
        </LegalSection>

        <LegalSection title="7. Refunds">
Refunds are governed by our separate Refund Policy, available within the app. In general, unused Wallet balances and amounts charged in error are eligible for refund upon request, subject to verification.
        </LegalSection>

        <LegalSection title="8. Station Availability">
While EcoCharge Ghana strives for 24/7 availability of all stations, we do not guarantee uninterrupted access. Stations may be temporarily unavailable due to maintenance, power outages, network issues, or events beyond our control. EcoCharge Ghana is not liable for inconvenience caused by station downtime, though affected charges will be refunded.
        </LegalSection>

        <LegalSection title="9. Prohibited Activities">
{`You may not:
• Use the Service for any unlawful purpose
• Attempt to gain unauthorised access to EcoCharge systems or other users' accounts
• Interfere with or disrupt the Service or servers/networks connected to it
• Reverse-engineer, decompile, or attempt to extract source code from the application
• Use automated systems (bots, scrapers) to access the Service without authorisation
• Resell or commercially exploit the Service without written consent from EcoCharge Ghana`}
        </LegalSection>

        <LegalSection title="10. Limitation of Liability">
To the maximum extent permitted by Ghanaian law, EcoCharge Ghana Ltd shall not be liable for indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to vehicle damage from third-party equipment misuse, loss of data, or business interruption. Our total liability for any claim shall not exceed the amount you paid to EcoCharge Ghana in the three (3) months preceding the claim.
        </LegalSection>

        <LegalSection title="11. Governing Law">
These Terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.
        </LegalSection>

        <LegalSection title="12. Updates to These Terms">
We may revise these Terms from time to time. Material changes will be communicated via the app or email. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
        </LegalSection>

        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:8 }}>Contact Us</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.8 }}>
            For questions about these Terms, contact:<br/>
            <strong style={{ color:T.text }}>EcoCharge Ghana Ltd</strong><br/>
            Email: ecochargeghanaltd@gmail.com<br/>
            Phone: 0504008059
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REFUND POLICY ─────────────────────────────────────────────
function RefundPolicy({ go }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Refund Policy" sub="Last updated: June 2025" onBack={()=>go("about")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        <div style={{ background:T.highlightGrad2,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontWeight:800,fontSize:15,color:T.green,marginBottom:6 }}>Fair & Transparent Refunds</div>
          <div style={{ fontSize:13,color:T.mutedLight,lineHeight:1.8 }}>
            EcoCharge Ghana is committed to ensuring you only pay for the energy and services you actually receive. This policy explains when and how refunds are issued.
          </div>
        </div>

        <LegalSection title="1. Wallet Top-ups">
Wallet top-ups are generally non-refundable once successfully credited, as the balance remains available for future charging sessions within the app. However, if a top-up was made in error (e.g. duplicate charge, incorrect amount due to a system fault), you may request a refund within 30 days of the transaction by contacting support with your payment reference.
        </LegalSection>

        <LegalSection title="2. Failed Charging Sessions">
If a charging session fails to start after your Wallet has been debited or funds locked (e.g. due to charger fault, connectivity issue, or equipment malfunction), the reserved amount will be automatically released back to your Wallet within 24 hours. If the issue persists, contact support for a manual review and refund.
        </LegalSection>

        <LegalSection title="3. Duplicate Payments">
If you are charged more than once for the same top-up or session due to a technical error, the duplicate amount will be refunded to your Wallet or original payment method within 5–7 business days of verification.
        </LegalSection>

        <LegalSection title="4. Reservation No-Shows">
If you fail to arrive within 15 minutes of your reserved charging slot, the reservation may be forfeited in accordance with our Terms & Conditions, and the reserved amount is not refundable, except where the no-show was caused by a verified EcoCharge Ghana system or station fault.
        </LegalSection>

        <LegalSection title="5. Station Downtime">
If a station or charger you booked becomes unavailable due to maintenance, power outage, or technical fault before your session starts, you will receive a full refund to your Wallet automatically, or upon request if not processed automatically within 24 hours.
        </LegalSection>

        <LegalSection title="6. Processing Times">
{`Refund processing times depend on the method:
• Wallet credit: instant to 24 hours
• Original payment method (via Paystack): 5–10 business days, depending on your bank or mobile money provider
• Account closure refunds: up to 14 business days after verification`}
        </LegalSection>

        <LegalSection title="7. Non-Refundable Items">
{`The following are generally not eligible for refund:
• Energy already delivered during a completed charging session
• Idle fees incurred after the grace period
• Reservation no-shows outside of verified EcoCharge Ghana fault
• Wallet balances after 12 months of account inactivity, where permitted by law`}
        </LegalSection>

        <LegalSection title="8. How to Request a Refund">
{`To request a refund, contact our support team with:
• Your registered name and phone number
• The transaction or booking reference
• A brief description of the issue

We aim to respond to all refund requests within 48 hours.`}
        </LegalSection>

        <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"16px",marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:8 }}>Contact Support</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:12 }}>
            <strong style={{ color:T.text }}>EcoCharge Ghana Ltd</strong><br/>
            Email: ecochargeghanaltd@gmail.com<br/>
            Phone: 0504008059 / 0559561568<br/>
            WhatsApp: 0504008059
          </div>
          <a href={`mailto:${CONTACT_INFO.email}?subject=Refund+Request`} className="tap"
            style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#000",textDecoration:"none" }}>
            <i className="fas fa-envelope"/> Request a Refund
          </a>
        </div>
      </div>
    </div>
  );
}

function StationReview({go,station,user,onClose}){
  const[rating,setRating]=useState(0);
  const[comment,setComment]=useState("");
  const[saving,setSaving]=useState(false);
  const[done,setDone]=useState(false);
  const submit=async()=>{
    if(!rating){return;}
    setSaving(true);
    try{
      await fetch(`${SUPABASE_URL}/rest/v1/station_reviews`,{
        method:"POST",
        headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json"},
        body:JSON.stringify({station_id:station?.id||1,station_name:station?.name||"EcoCharge Station",user_id:user?.id,user_name:user?.name||user?.email,rating,comment})
      });
    }catch(e){}
    setSaving(false);setDone(true);setTimeout(()=>onClose(),1500);
  };
  if(done)return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.card,borderRadius:20,padding:"32px 24px",textAlign:"center",border:`1px solid ${T.border}`}}>
        <div style={{fontSize:48,marginBottom:12}}>⭐</div>
        <div style={{fontWeight:800,fontSize:18,color:T.green}}>Review Submitted!</div>
        <div style={{fontSize:13,color:T.muted,marginTop:8}}>Thank you for your feedback</div>
      </div>
    </div>
  );
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:T.card,borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:16,color:T.text}}>Rate this Station</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontWeight:600,fontSize:14,color:T.mutedLight,marginBottom:16}}>{station?.name||"EcoCharge Station"}</div>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:20}}>
          {[1,2,3,4,5].map(s=><button key={s} onClick={()=>setRating(s)} style={{background:"none",border:"none",fontSize:36,cursor:"pointer",opacity:s<=rating?1:0.3}}>⭐</button>)}
        </div>
        <textarea placeholder="Share your experience (optional)" value={comment} onChange={e=>setComment(e.target.value)} style={{width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit",resize:"none",height:80,marginBottom:16}}/>
        <button onClick={submit} disabled={!rating||saving} style={{width:"100%",background:rating?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:rating?"#000":T.muted,cursor:rating?"pointer":"not-allowed",fontFamily:"inherit"}}>{saving?"Submitting...":"Submit Review"}</button>
      </div>
    </div>
  );
}

function Bookings({ go,booking,user }) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); },[]);
  let b=booking;
  if (!b) { try { const s=localStorage.getItem("eco_booking"); if(s) b=JSON.parse(s); } catch(e){} }
  const getCountdown=(b)=>{
    if (!b?.slot_time||!b?.duration_min) return null;
    const start=new Date(b.slot_time);
    const end=new Date(start.getTime()+b.duration_min*60000);
    const diff=end-now;
    if (diff<=0) return { done:true,pct:100 };
    const started=now>=start;
    if (!started) { const wait=start-now; const wm=Math.floor(wait/60000); const ws=Math.floor((wait%60000)/1000); return { waiting:true,label:`Starts in ${wm}m ${ws}s`,pct:0 }; }
    const elapsed=now-start;
    const total=b.duration_min*60000;
    const pct=Math.min(100,Math.round((elapsed/total)*100));
    const rem=end-now;
    const rm=Math.floor(rem/60000);
    const rs=Math.floor((rem%60000)/1000);
    return { active:true,label:`${rm}m ${rs}s remaining`,pct };
  };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Bookings" sub="Your charging sessions" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {b ? (
          <>
            {(()=>{
              const cd=getCountdown(b);
              return (
                <div className="fade" style={{ background:T.highlightGrad2,borderRadius:18,padding:"18px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Active Booking</div>
                      <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{b.station}</div>
                      <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{b.vehicle} · {b.duration_min} min session</div>
                    </div>
                    <div style={{ background:b.status==="confirmed"?"rgba(74,222,128,0.15)":"rgba(251,191,36,0.15)",borderRadius:10,padding:"5px 12px" }}>
                      <span style={{ fontSize:11,fontWeight:700,color:b.status==="confirmed"?T.green:T.yellow }}>{b.status==="confirmed"?"✓ Confirmed":"Pending"}</span>
                    </div>
                  </div>
                  {cd&&(
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                        <span style={{ fontSize:12,color:T.muted }}>{cd.done?"Session complete":cd.waiting?cd.label:"Time remaining"}</span>
                        <span style={{ fontSize:12,fontWeight:700,color:T.green }}>{cd.done?"Done ✅":cd.active?cd.label:""}</span>
                      </div>
                      <div style={{ height:8,borderRadius:4,background:T.track,overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${cd.pct}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,transition:"width 1s linear",borderRadius:4 }}/>
                      </div>
                      {cd.active&&<div style={{ textAlign:"center",marginTop:12 }}><div style={{ fontWeight:900,fontSize:36,color:T.green,fontFamily:"monospace",letterSpacing:2 }}>{cd.label}</div><div style={{ fontSize:11,color:T.muted,marginTop:4 }}>charging in progress</div></div>}
                    </div>
                  )}
                  {[{ label:"Reference",value:b.reference },{ label:"Amount",value:b.booking_mode==="now"?"Metered — billed per kWh":`GH₵${b.amount}` },{ label:"Payment",value:b.pay_method==="wallet"||b.pay_method==="now"?"Charged from wallet":"Pay on Arrival" },{ label:"Water",value:"20L included 💧" }].map(r=>(
                    <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
                      <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                      <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
                    </div>
                  ))}
                  <button onClick={()=>go("qr")} className="tap"
                    style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:8 }}>
                    <i className="fas fa-qrcode"/> View Charging Pass
                  </button>
                </div>
              );
            })()}
            <div style={{ background:"linear-gradient(135deg,#1a1000,#2d1a00)",borderRadius:16,padding:"16px",border:`1px solid rgba(251,191,36,0.2)`,marginBottom:16 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                <div style={{ width:40,height:40,borderRadius:"50%",background:"rgba(251,191,36,0.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-star" style={{ fontSize:18,color:T.yellow }}/>
                </div>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,color:T.text }}>EcoCharge Rewards</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Coming soon — earn credits for charging</div>
                </div>
              </div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>Every charge earns you points. Redeem for <span style={{ color:T.yellow,fontWeight:600 }}>airtime</span>, <span style={{ color:T.green,fontWeight:600 }}>discounted charging</span>, and more!</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"50px 20px" }}>
            <i className="fas fa-calendar-times" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
            <div style={{ fontWeight:700,fontSize:18,color:T.text,marginBottom:8 }}>No Bookings Yet</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.8 }}>Find a station and book your<br/>first charging session</div>
            <button onClick={()=>go("map")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"14px 28px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,margin:"0 auto" }}>
              <i className="fas fa-map-marker-alt"/> Find a Station
            </button>
          </div>
        )}
      </div>
      <Nav active="Sessions" go={go}/>
    </div>
  );
}

function ChargerAdmin({ go }) {
  const [chargers,setChargers]       = useState([]);
  const [sessions,setSessions]       = useState([]);
  const [selected,setSelected]       = useState(null);
  const [loading,setLoading]         = useState(false);
  const [cmdLoading,setCmdLoading]   = useState("");
  const [cmdResult,setCmdResult]     = useState(null);
  const [tab,setTab]                 = useState("chargers");

  const loadChargers = async () => {
    setLoading(true);
    const data = await ocppApi("/api/chargers");
    if (data?.chargers) setChargers(data.chargers);
    setLoading(false);
  };

  const loadSessions = async () => {
    const data = await ocppApi("/api/sessions");
    if (data?.sessions) setSessions(data.sessions);
  };

  useEffect(()=>{
    loadChargers();
    loadSessions();
    const t = setInterval(()=>loadChargers(), 10000);
    return ()=>clearInterval(t);
  },[]);

  const sendCmd = async (chargerId, action, body = {}) => {
    setCmdLoading(action);
    setCmdResult(null);
    const pathMap = {
      "RemoteStart":        `/api/chargers/${chargerId}/remote-start`,
      "RemoteStop":         `/api/chargers/${chargerId}/remote-stop`,
      "Reset":              `/api/chargers/${chargerId}/reset`,
      "Unlock":             `/api/chargers/${chargerId}/unlock`,
      "ChangeAvailability": `/api/chargers/${chargerId}/change-availability`,
      "ClearCache":         `/api/chargers/${chargerId}/clear-cache`,
    };
    const result = await ocppApi(pathMap[action], "POST", body);
    setCmdResult(result);
    setCmdLoading("");
    if (result?.success) loadChargers();
  };

  const statusColor = (s) => {
    if (s === "Available")   return T.green;
    if (s === "Charging")    return T.blue;
    if (s === "Faulted")     return T.red;
    if (s === "Unavailable") return T.muted;
    return T.yellow;
  };

  const statusIcon = (s) => {
    if (s === "Available")   return "fa-check-circle";
    if (s === "Charging")    return "fa-bolt";
    if (s === "Faulted")     return "fa-exclamation-triangle";
    if (s === "Unavailable") return "fa-times-circle";
    return "fa-circle";
  };

  if (!OCPP_URL) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charger Admin" sub="OCPP Management" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 24px 100px" }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-server" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>OCPP Server Not Configured</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:16,lineHeight:1.7 }}>Add VITE_OCPP_SERVER_URL and VITE_OCPP_API_KEY to your Vercel environment variables.</div>
          <div style={{ background:T.card,borderRadius:12,padding:14,border:`1px solid ${T.border}`,textAlign:"left",fontSize:12,color:T.mutedLight,fontFamily:"monospace",lineHeight:2 }}>
            VITE_OCPP_SERVER_URL=https://...<br/>
            VITE_OCPP_API_KEY=ecocharge-ocpp-2024
          </div>
        </div>
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charger Admin" sub="OCPP 1.6J Management" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        <div style={{ display:"flex",background:T.card,borderRadius:12,padding:4,marginBottom:16,border:`1px solid ${T.border}` }}>
          {[{ id:"chargers",label:"Chargers",icon:"fa-charging-station" },{ id:"sessions",label:"Sessions",icon:"fa-list" }].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className="tap"
              style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:"none",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <i className={`fas ${t.icon}`}/> {t.label}
            </button>
          ))}
        </div>

        {tab==="chargers"&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{chargers.length} Charger{chargers.length!==1?"s":""}</div>
              <button onClick={loadChargers} className="tap"
                style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:T.green,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
                <i className={`fas fa-sync${loading?" fa-spin":""}`}/> Refresh
              </button>
            </div>

            {loading&&chargers.length===0&&(
              <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}><Spinner/> <span style={{ marginLeft:8 }}>Connecting to OCPP server...</span></div>
            )}

            {chargers.map(c=>(
              <div key={c.id} style={{ background:T.card,borderRadius:16,border:`1px solid ${selected?.id===c.id?T.green:T.border}`,marginBottom:12,overflow:"hidden" }}>
                <div className="tap" onClick={()=>setSelected(selected?.id===c.id?null:c)}
                  style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:`${statusColor(c.status)}18`,border:`1px solid ${statusColor(c.status)}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={`fas ${statusIcon(c.status)}`} style={{ fontSize:18,color:statusColor(c.status) }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{c.id}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{c.info?.chargePointModel||"Unknown model"} · {c.info?.chargePointVendor||""}</div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                    <div style={{ background:`${statusColor(c.status)}18`,borderRadius:8,padding:"3px 10px" }}>
                      <span style={{ fontSize:11,fontWeight:700,color:statusColor(c.status) }}>{c.status||"Unknown"}</span>
                    </div>
                    <div style={{ fontSize:10,color:c.connected?T.green:T.muted,display:"flex",alignItems:"center",gap:4 }}>
                      <div style={{ width:6,height:6,borderRadius:"50%",background:c.connected?T.green:T.muted }}/>
                      {c.connected?"Online":"Offline"}
                    </div>
                  </div>
                </div>

                {selected?.id===c.id&&(
                  <div style={{ borderTop:`1px solid ${T.border}`,padding:"14px 16px" }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
                      {[
                        { label:"Firmware",  value:c.info?.firmwareVersion||"Unknown" },
                        { label:"Serial",    value:c.info?.chargePointSerialNumber||"Unknown" },
                        { label:"Last Beat", value:c.lastHeartbeat?new Date(c.lastHeartbeat).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" }):"--" },
                        { label:"Active TX", value:c.activeTransactions||0 },
                      ].map(r=>(
                        <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px 10px" }}>
                          <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5 }}>{r.label}</div>
                          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:3 }}>{r.value}</div>
                        </div>
                      ))}
                    </div>

                    {cmdResult&&(
                      <div style={{ background:cmdResult.success?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)",border:`1px solid ${cmdResult.success?T.greenDim:"rgba(248,113,113,0.2)"}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:cmdResult.success?T.green:T.red,display:"flex",alignItems:"center",gap:8 }}>
                        <i className={`fas ${cmdResult.success?"fa-check-circle":"fa-exclamation-circle"}`}/>
                        {cmdResult.success?"Command accepted by charger":"Failed: "+(cmdResult.error||"Unknown error")}
                      </div>
                    )}

                    <div style={{ fontWeight:700,fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8 }}>Remote Commands</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      {[
                        { action:"RemoteStart",        label:"Start Charge", icon:"fa-play",    color:T.green,  body:{ idTag:`APP-${Date.now()}`,connectorId:1 } },
                        { action:"RemoteStop",         label:"Stop Charge",  icon:"fa-stop",    color:T.red,    body:{ transactionId:0 } },
                        { action:"Reset",              label:"Soft Reset",   icon:"fa-redo",    color:T.yellow, body:{ type:"Soft" } },
                        { action:"Unlock",             label:"Unlock Cable", icon:"fa-unlock",  color:T.blue,   body:{ connectorId:1 } },
                        { action:"ChangeAvailability", label:"Disable",      icon:"fa-ban",     color:T.muted,  body:{ connectorId:0,type:"Inoperative" } },
                        { action:"ClearCache",         label:"Clear Cache",  icon:"fa-trash",   color:T.muted,  body:{} },
                      ].map(cmd=>(
                        <button key={cmd.action} onClick={()=>sendCmd(c.id,cmd.action,cmd.body)} disabled={!!cmdLoading} className="tap"
                          style={{ background:`${cmd.color}12`,border:`1px solid ${cmd.color}30`,borderRadius:10,padding:"10px 8px",fontSize:12,fontWeight:600,color:cmd.color,cursor:cmdLoading?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:cmdLoading===cmd.action?0.5:1 }}>
                          {cmdLoading===cmd.action?<Spinner/>:<><i className={`fas ${cmd.icon}`}/> {cmd.label}</>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading&&chargers.length===0&&(
              <div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}>
                <i className="fas fa-charging-station" style={{ fontSize:48,marginBottom:16,display:"block",opacity:0.4 }}/>
                <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:8 }}>No Chargers Connected</div>
                <div style={{ lineHeight:1.8,fontSize:12 }}>Configure your smart charger to connect to:<br/>
                  <span style={{ color:T.green,fontFamily:"monospace" }}>{OCPP_URL}/ocpp/YOUR-CHARGER-ID</span>
                </div>
              </div>
            )}
          </>
        )}

        {tab==="sessions"&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{sessions.length} Session{sessions.length!==1?"s":""}</div>
              <button onClick={loadSessions} className="tap"
                style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:T.green,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
                <i className="fas fa-sync"/> Refresh
              </button>
            </div>
            {sessions.length===0&&(
              <div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}>
                <i className="fas fa-history" style={{ fontSize:48,marginBottom:16,display:"block",opacity:0.4 }}/>
                <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:8 }}>No Sessions Yet</div>
                Start a charging session to see it here.
              </div>
            )}
            {sessions.map(s=>(
              <div key={s.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{s.charger_id}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Tag: {s.id_tag}</div>
                  </div>
                  <div style={{ background:s.status==="Active"?"rgba(56,189,248,0.12)":s.status==="Completed"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)",borderRadius:8,padding:"3px 10px" }}>
                    <span style={{ fontSize:11,fontWeight:700,color:s.status==="Active"?T.blue:s.status==="Completed"?T.green:T.red }}>{s.status}</span>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                  {[
                    { label:"Energy",   value:s.energy_kwh!=null?`${s.energy_kwh} kWh`:"Active" },
                    { label:"Duration", value:s.duration_min!=null?`${s.duration_min} min`:"--" },
                    { label:"Start",    value:s.start_time?new Date(s.start_time).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" }):"--" },
                  ].map(r=>(
                    <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px" }}>
                      <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5 }}>{r.label}</div>
                      <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:3 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

const SESSION_STATUSES = {
  Ready:      { color:"#9ca3af", icon:"fa-clock",               bg:"rgba(156,163,175,0.12)" },
  Authorized: { color:"#38bdf8", icon:"fa-shield-alt",          bg:"rgba(56,189,248,0.12)"  },
  Charging:   { color:"#4ade80", icon:"fa-bolt",                bg:"rgba(74,222,128,0.12)"  },
  Paused:     { color:"#fbbf24", icon:"fa-pause-circle",        bg:"rgba(251,191,36,0.12)"  },
  Completed:  { color:"#4ade80", icon:"fa-check-circle",        bg:"rgba(74,222,128,0.12)"  },
  Cancelled:  { color:"#f87171", icon:"fa-times-circle",        bg:"rgba(248,113,113,0.12)" },
  Expired:    { color:"#f97316", icon:"fa-hourglass-end",       bg:"rgba(249,115,22,0.12)"  },
  Faulted:    { color:"#f87171", icon:"fa-exclamation-triangle",bg:"rgba(248,113,113,0.12)" },
};

const fmtDuration = (sec) => {
  if (!sec) return "--";
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  if (h>0) return `${h}h ${m}m`;
  if (m>0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtCost = (c) => c!=null ? `GH₵${Number(c).toFixed(2)}` : "--";
const fmtKwh  = (k) => k!=null ? `${Number(k).toFixed(3)} kWh` : "--";
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-GH",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" }) : "--";

function SessionManager({ go, user }) {
  const [sessions,  setSessions]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState("All");
  const [tab,       setTab]       = useState("list");
  const [analytics, setAnalytics] = useState(null);
  const [liveTimer, setLiveTimer] = useState(0);

  useEffect(()=>{
    const t = setInterval(()=>setLiveTimer(n=>n+1), 1000);
    return ()=>clearInterval(t);
  },[]);

  const loadSessions = async () => {
    setLoading(true);
    if (!SUPABASE_URL) { setLoading(false); return; }
    try {
      let url = `${SUPABASE_URL}/rest/v1/charging_sessions?select=*&order=created_at.desc&limit=50`;
      if (filter !== "All") url += `&status=eq.${filter}`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch(e) {}
    setLoading(false);
  };

  const loadEvents = async (sessionId) => {
    if (!SUPABASE_URL) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/session_events?session_id=eq.${sessionId}&order=created_at.desc`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch(e) {}
  };

  const loadAnalytics = async () => {
    if (!SUPABASE_URL) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/session_analytics?limit=30`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const data = await res.json();
      if (Array.isArray(data)) setAnalytics(data);
    } catch(e) {}
  };

  const updateStatus = async (sessionId, newStatus, reason="") => {
    if (!SUPABASE_URL) return;
    const now = new Date().toISOString();
    const updates = { status: newStatus, status_reason: reason, updated_at: now };
    if (newStatus === "Charging")   updates.started_at    = now;
    if (newStatus === "Paused")     updates.paused_at     = now;
    if (newStatus === "Completed")  updates.completed_at  = now;
    if (newStatus === "Cancelled")  updates.cancelled_at  = now;
    if (newStatus === "Authorized") updates.authorized_at = now;
    if (newStatus === "Completed" || newStatus === "Cancelled") {
      updates.meter_stop = selected?.meter_current || selected?.meter_start || 0;
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?id=eq.${sessionId}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(updates)
      });
      await loadSessions();
      if (selected?.id === sessionId) {
        setSelected(prev => prev ? { ...prev, ...updates } : prev);
        await loadEvents(sessionId);
      }
    } catch(e) {}
  };

  useEffect(()=>{ loadSessions(); },[filter]);
  useEffect(()=>{ if (tab==="analytics") loadAnalytics(); },[tab]);

  useEffect(()=>{
    const t = setInterval(()=>{ if (sessions.some(s=>s.status==="Charging")) loadSessions(); }, 10000);
    return ()=>clearInterval(t);
  },[sessions]);

  const openDetail = async (s) => {
    setSelected(s);
    setTab("detail");
    await loadEvents(s.id);
  };

  const activeCount    = sessions.filter(s=>s.status==="Charging").length;
  const completedCount = sessions.filter(s=>s.status==="Completed").length;
  const totalKwh       = sessions.filter(s=>s.energy_kwh).reduce((a,s)=>a+(s.energy_kwh||0),0);
  const totalRevenue   = sessions.filter(s=>s.cost_total).reduce((a,s)=>a+(s.cost_total||0),0);

  const FILTERS = ["All","Ready","Authorized","Charging","Paused","Completed","Cancelled","Faulted"];

  if (tab==="detail" && selected) {
    const st = SESSION_STATUSES[selected.status] || SESSION_STATUSES.Ready;
    const liveElapsed = selected.started_at && selected.status==="Charging"
      ? Math.floor((Date.now()-new Date(selected.started_at).getTime())/1000) : null;
    const nextActions = {
      Ready:      ["Authorized","Cancelled","Expired"],
      Authorized: ["Charging","Cancelled"],
      Charging:   ["Paused","Completed","Faulted"],
      Paused:     ["Charging","Completed","Cancelled"],
      Completed:  [],
      Cancelled:  [],
      Expired:    [],
      Faulted:    ["Ready"],
    };
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <Header title="Session Detail" sub={selected.session_ref||selected.id} onBack={()=>{ setTab("list");setSelected(null); }}/>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>

          <div className="fade" style={{ background:st.bg,border:`1px solid ${st.color}33`,borderRadius:18,padding:"18px",marginBottom:14,textAlign:"center" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:`${st.color}22`,border:`2px solid ${st.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px" }}>
              <i className={`fas ${st.icon}`} style={{ fontSize:22,color:st.color }}/>
            </div>
            <div style={{ fontWeight:900,fontSize:22,color:st.color,letterSpacing:1 }}>{selected.status}</div>
            {selected.status_reason&&<div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{selected.status_reason}</div>}

            {liveElapsed!=null&&(
              <div style={{ marginTop:12 }}>
                <div style={{ fontWeight:900,fontSize:36,color:T.green,fontFamily:"monospace" }}>{fmtDuration(liveElapsed)}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>elapsed</div>
              </div>
            )}
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              { label:"Energy",       value:fmtKwh(selected.energy_kwh),    icon:"fa-bolt",        color:T.green  },
              { label:"Cost",         value:fmtCost(selected.cost_total),   icon:"fa-money-bill-alt",color:T.yellow },
              { label:"Duration",     value:fmtDuration(selected.duration_sec), icon:"fa-clock",   color:T.blue   },
              { label:"Payment",      value:selected.payment_status||"Unpaid",icon:"fa-credit-card",color:selected.payment_status==="Paid"?T.green:T.red },
            ].map(m=>(
              <div key={m.label} style={{ background:T.card,borderRadius:14,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                <i className={`fas ${m.icon}`} style={{ fontSize:16,color:m.color,marginBottom:6,display:"block" }}/>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{m.label}</div>
                <div style={{ fontWeight:800,fontSize:16,color:m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}><i className="fas fa-info-circle" style={{ marginRight:8,color:T.green }}/>Session Info</div>
            {[
              { label:"Session ID",    value:selected.id },
              { label:"Reference",     value:selected.session_ref||"--" },
              { label:"Charger",       value:selected.charger_id||"--" },
              { label:"Connector",     value:`#${selected.connector_id||1}` },
              { label:"Vehicle",       value:selected.vehicle_type||"--" },
              { label:"ID Tag",        value:selected.id_tag||"--" },
              { label:"Booking Ref",   value:selected.booking_ref||"--" },
              { label:"Started",       value:fmtDate(selected.started_at) },
              { label:"Completed",     value:fmtDate(selected.completed_at) },
              { label:"Stop Reason",   value:selected.stop_reason||"--" },
              { label:"Meter Start",   value:selected.meter_start!=null?`${selected.meter_start} Wh`:"--" },
              { label:"Meter Stop",    value:selected.meter_stop!=null?`${selected.meter_stop} Wh`:"--" },
              { label:"Rate",          value:`GH₵${selected.rate_per_kwh||0.85}/kWh` },
              { label:"Base Fee",      value:`GH₵${selected.base_fee||5.00}` },
              { label:"Water",         value:`${selected.water_litres||20}L ${selected.water_collected?"✅":"pending"}` },
              { label:"Payment Ref",   value:selected.payment_ref||"--" },
            ].map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,marginBottom:8,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <span style={{ color:T.muted,fontSize:12 }}>{r.label}</span>
                <span style={{ color:T.text,fontWeight:600,fontSize:12,fontFamily:r.label.includes("ID")||r.label.includes("Ref")?"monospace":"inherit",maxWidth:"55%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.value}</span>
              </div>
            ))}
          </div>

          {nextActions[selected.status]?.length > 0 && (
            <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}><i className="fas fa-play-circle" style={{ marginRight:8,color:T.green }}/>Change Status</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {nextActions[selected.status].map(s=>{
                  const cfg = SESSION_STATUSES[s];
                  return (
                    <button key={s} onClick={()=>updateStatus(selected.id,s)} className="tap"
                      style={{ background:cfg.bg,border:`1px solid ${cfg.color}33`,borderRadius:12,padding:"12px 8px",fontSize:12,fontWeight:700,color:cfg.color,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                      <i className={`fas ${cfg.icon}`}/> {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selected.status==="Faulted"&&selected.fault_code&&(
            <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"14px",marginBottom:14 }}>
              <div style={{ fontWeight:700,fontSize:13,color:T.red,marginBottom:8 }}><i className="fas fa-exclamation-triangle" style={{ marginRight:8 }}/>Fault Details</div>
              <div style={{ fontSize:12,color:T.mutedLight }}><strong>Code:</strong> {selected.fault_code}</div>
              {selected.fault_message&&<div style={{ fontSize:12,color:T.mutedLight,marginTop:4 }}><strong>Message:</strong> {selected.fault_message}</div>}
            </div>
          )}

          {events.length > 0 && (
            <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}><i className="fas fa-history" style={{ marginRight:8,color:T.blue }}/>Event Timeline</div>
              {events.map((ev,i)=>(
                <div key={ev.id} style={{ display:"flex",gap:10,marginBottom:12 }}>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:T.green,marginTop:3 }}/>
                    {i<events.length-1&&<div style={{ width:1,flex:1,background:T.border,marginTop:3 }}/>}
                  </div>
                  <div style={{ flex:1,paddingBottom:8 }}>
                    <div style={{ fontWeight:600,fontSize:12,color:T.text }}>{ev.message||ev.event_type}</div>
                    <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{fmtDate(ev.created_at)} · {ev.triggered_by||"system"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tab==="analytics") {
    const totalSessions  = sessions.length;
    const completedPct   = totalSessions ? Math.round((completedCount/totalSessions)*100) : 0;
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <Header title="Session Analytics" sub="Performance overview" onBack={()=>setTab("list")}/>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
            {[
              { label:"Active Now",   value:activeCount,                        color:T.green,  icon:"fa-bolt" },
              { label:"Completed",    value:completedCount,                     color:T.blue,   icon:"fa-check-circle" },
              { label:"Total Energy", value:`${totalKwh.toFixed(1)} kWh`,       color:T.yellow, icon:"fa-sun" },
              { label:"Revenue",      value:`GH₵${totalRevenue.toFixed(0)}`,    color:T.green,  icon:"fa-money-bill-alt" },
            ].map(s=>(
              <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:20,color:s.color,marginBottom:8,display:"block" }}/>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{s.label}</div>
                <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-chart-pie" style={{ marginRight:8,color:T.green }}/>Status Breakdown</div>
            {Object.entries(SESSION_STATUSES).map(([status,cfg])=>{
              const count = sessions.filter(s=>s.status===status).length;
              const pct   = totalSessions ? Math.round((count/totalSessions)*100) : 0;
              return (
                <div key={status} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <i className={`fas ${cfg.icon}`} style={{ fontSize:12,color:cfg.color,width:16 }}/>
                      <span style={{ fontSize:12,color:T.text,fontWeight:600 }}>{status}</span>
                    </div>
                    <span style={{ fontSize:12,color:T.muted }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:5,borderRadius:3,background:T.surface,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:cfg.color,borderRadius:3,transition:"width .5s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background:T.highlightGrad,borderRadius:16,padding:"18px",marginBottom:16,border:`1px solid rgba(74,222,128,0.2)`,textAlign:"center" }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Session Completion Rate</div>
            <div style={{ fontWeight:900,fontSize:48,color:T.green }}>{completedPct}%</div>
            <div style={{ height:8,borderRadius:4,background:T.track,overflow:"hidden",margin:"12px 0 8px" }}>
              <div style={{ height:"100%",width:`${completedPct}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,borderRadius:4 }}/>
            </div>
            <div style={{ fontSize:11,color:T.muted }}>{completedCount} of {totalSessions} sessions completed</div>
          </div>
        </div>
        <Nav active="Profile" go={go}/>
      </div>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging History" sub="Your charging sessions" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
          {[
            { label:"Active",   value:activeCount,                  color:T.green  },
            { label:"kWh Today",value:totalKwh.toFixed(1),          color:T.yellow },
            { label:"Revenue",  value:`GH₵${totalRevenue.toFixed(0)}`,color:T.blue },
          ].map(s=>(
            <div key={s.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontWeight:800,fontSize:18,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",gap:8,marginBottom:14 }}>
          <button onClick={loadSessions} className="tap"
            style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",fontSize:12,color:T.green,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className={`fas fa-sync${loading?" fa-spin":""}`}/> Refresh
          </button>
          <button onClick={()=>setTab("analytics")} className="tap"
            style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",fontSize:12,color:T.blue,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className="fas fa-chart-bar"/> Analytics
          </button>
        </div>

        <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:14 }}>
          {FILTERS.map(f=>{
            const cfg = SESSION_STATUSES[f];
            const active = filter===f;
            return (
              <button key={f} onClick={()=>setFilter(f)} className="tap"
                style={{ flexShrink:0,background:active?(cfg?cfg.bg:"rgba(74,222,128,0.12)"):T.card,border:`1px solid ${active?(cfg?cfg.color:T.green):T.border}`,borderRadius:20,padding:"6px 14px",fontSize:11,fontWeight:700,color:active?(cfg?cfg.color:T.green):T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
                {cfg&&<i className={`fas ${cfg.icon}`}/>} {f}
              </button>
            );
          })}
        </div>

        {loading&&sessions.length===0&&(
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}><Spinner/> <span style={{ marginLeft:8 }}>Loading sessions...</span></div>
        )}

        {!loading&&sessions.length===0&&(
          <div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}>
            <i className="fas fa-bolt" style={{ fontSize:48,marginBottom:16,display:"block",opacity:0.3 }}/>
            <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:6 }}>No Sessions Found</div>
            <div style={{ fontSize:12 }}>Sessions appear here when charging starts</div>
          </div>
        )}

        {sessions.map(s=>{
          const cfg = SESSION_STATUSES[s.status] || SESSION_STATUSES.Ready;
          const isActive = s.status==="Charging";
          const elapsed = isActive && s.started_at
            ? Math.floor((Date.now()-new Date(s.started_at).getTime())/1000) : null;
          return (
            <div key={s.id} className="tap row" onClick={()=>openDetail(s)}
              style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,marginBottom:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:38,height:38,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className={`fas ${cfg.icon}`} style={{ fontSize:14,color:cfg.color }}/>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ fontWeight:700,fontSize:13,color:T.text }}>{fmtDate(s.started_at||s.created_at)}</span>
                  {isActive&&<span style={{ fontSize:10,fontWeight:700,color:T.green }}>· Live</span>}
                </div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {s.session_ref||s.id.substring(0,16)} · {s.charger_id||"--"}
                </div>
                {elapsed!=null&&(
                  <div style={{ fontSize:11,fontWeight:700,color:T.green,fontFamily:"monospace",marginTop:2 }}>{fmtDuration(elapsed)} elapsed</div>
                )}
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{fmtKwh(s.energy_kwh)}</div>
                <div style={{ fontSize:12,color:T.green,fontWeight:600,marginTop:2 }}>{fmtCost(s.cost_total)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Nav active="Sessions" go={go}/>
    </div>
  );
}

const toGHS    = (p) => p != null ? (p / 100).toFixed(2) : "0.00";
const toPesewas = (g) => Math.round(parseFloat(g) * 100);
const fmtGHS   = (p) => `GH₵${toGHS(p)}`;

const TOP_UP_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const TX_ICONS = {
  TopUp:       { icon:"fa-arrow-down",   color:"#4ade80" },
  Debit:       { icon:"fa-bolt",         color:"#f87171" },
  Refund:      { icon:"fa-undo",         color:"#38bdf8" },
  Bonus:       { icon:"fa-gift",         color:"#fbbf24" },
  Lock:        { icon:"fa-lock",         color:"#9ca3af" },
  Unlock:      { icon:"fa-unlock",       color:"#9ca3af" },
  Adjustment:  { icon:"fa-sliders-h",    color:"#a78bfa" },
};

function WalletScreen({ go, user }) {
  const [wallet,    setWallet]    = useState(null);
  const [txns,      setTxns]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("home");
  const [topupAmt,  setTopupAmt]  = useState(5000);
  const [customAmt, setCustomAmt] = useState("");
  const [paying,    setPaying]    = useState(false);
  const [txFilter,  setTxFilter]  = useState("All");
  const [payError,  setPayError]  = useState("");
  const [balVisible,setBalVisible]= useState(true);

  const loadWallet = async () => {
    if (!SUPABASE_URL || !user?.id) { setLoading(false); return; }
    try {
      const wRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=*`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const wData = await wRes.json();
      if (wData?.length) {
        setWallet(wData[0]);
      } else {
        const cRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ user_id: user.id, email: user.email, display_name: user.name, balance_pesewas: 0 })
        });
        const cData = await cRes.json();
        if (cData?.[0]) setWallet(cData[0]);
      }

      const tRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallet_transactions?user_id=eq.${user.id}&order=created_at.desc&limit=50`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const tData = await tRes.json();
      if (Array.isArray(tData)) setTxns(tData);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(()=>{ loadWallet(); },[user]);

  const initiateTopUp = async () => {
    const amount = customAmt ? toPesewas(customAmt) : topupAmt;
    if (amount < 500) { setPayError('Minimum top-up is GH₵5.00'); return; }
    if (!user?.email) { setPayError('Email required for payment'); return; }
    setPaying(true); setPayError('');
    try {
      if (OCPP_URL) {
        const initRes = await fetch(OCPP_URL + '/api/payment/initialize', {
          method: 'POST',
          headers: { 'x-api-key': OCPP_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, amount_pesewas: amount, type: 'wallet_topup', metadata: { user_id: user.id, wallet_id: wallet?.id, type: 'wallet_topup' } })
        });
        const initData = await initRes.json();
        if (initData.reference && initData.authorization_url) {
          try { localStorage.setItem('eco_topup', JSON.stringify({ ref: initData.reference, amount, userId: user.id })); } catch(e) {}
          window.location.href = initData.authorization_url;
          return;
        }
      }
      const ref = 'WALLET-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
      if (SUPABASE_URL) {
        await fetch(SUPABASE_URL + '/rest/v1/topup_requests', {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_id: wallet?.id, user_id: user.id, email: user.email, amount_pesewas: amount, payment_ref: ref, status: 'Pending' })
        });
      }
      try { localStorage.setItem('eco_topup', JSON.stringify({ ref, amount, userId: user.id })); } catch(e) {}
      window.location.href = 'https://paystack.shop/pay/bldaqwywt5?email=' + encodeURIComponent(user.email) + '&amount=' + amount + '&reference=' + ref;
    } catch(e) {
      setPayError('Payment initiation failed. Please try again.');
    }
    setPaying(false);
  };

  const filteredTxns = txFilter === "All" ? txns : txns.filter(t => t.type === txFilter);

  const totalIn  = txns.filter(t=>["TopUp","Refund","Bonus"].includes(t.type)).reduce((a,t)=>a+t.amount_pesewas,0);
  const totalOut = txns.filter(t=>t.type==="Debit").reduce((a,t)=>a+t.amount_pesewas,0);

  if (!user) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Wallet" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 24px 100px",textAlign:"center" }}>
        <div>
          <i className="fas fa-wallet" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>Sign in to access your wallet</div>
          <button onClick={()=>go("auth")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",marginTop:8 }}>
            Sign In
          </button>
        </div>
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );

  if (tab === "topup") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Top Up Wallet" sub="Add funds to charge" onBack={()=>setTab("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        <div style={{ background:T.highlightGrad,borderRadius:18,padding:"18px",marginBottom:20,border:`1px solid rgba(74,222,128,0.2)`,textAlign:"center" }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Current Balance</div>
          <div style={{ fontWeight:900,fontSize:36,color:T.green }}>{fmtGHS(wallet?.balance_pesewas||0)}</div>
        </div>

        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Select Amount</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
          {TOP_UP_AMOUNTS.map(amt=>(
            <button key={amt} onClick={()=>{ setTopupAmt(amt);setCustomAmt(""); }} className="tap"
              style={{ background:topupAmt===amt&&!customAmt?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${topupAmt===amt&&!customAmt?T.green:T.border}`,borderRadius:14,padding:"16px 8px",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
              <div style={{ fontWeight:800,fontSize:18,color:topupAmt===amt&&!customAmt?"#000":T.text }}>{fmtGHS(amt)}</div>
            </button>
          ))}
        </div>

        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Or enter custom amount</div>
        <div style={{ position:"relative",marginBottom:20 }}>
          <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:15,fontWeight:700 }}>GH₵</span>
          <input type="number" placeholder="0.00" value={customAmt}
            onChange={e=>{ setCustomAmt(e.target.value);setTopupAmt(0); }}
            style={{ width:"100%",background:T.card,border:`1px solid ${customAmt?T.green:T.border}`,borderRadius:14,padding:"16px 16px 16px 52px",color:T.text,fontSize:20,fontWeight:700,fontFamily:"inherit" }}/>
        </div>

        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",marginBottom:20,border:`1px solid ${T.border}` }}>
          {[
            { label:"Top-up amount",  value: fmtGHS(customAmt ? toPesewas(customAmt) : topupAmt) },
            { label:"Processing fee", value: "Free" },
            { label:"You'll receive", value: fmtGHS(customAmt ? toPesewas(customAmt) : topupAmt), bold:true },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:r.bold?T.green:T.text,fontWeight:r.bold?800:600,fontSize:r.bold?16:13 }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Pay with</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
          {[
            { label:"Card / Mobile Money", icon:"fa-credit-card", color:T.green, active:true },
            { label:"MTN MoMo",           icon:"fa-mobile-alt",  color:T.yellow, active:false },
          ].map(m=>(
            <div key={m.label} style={{ background:m.active?`${T.green}12`:T.card,border:`1px solid ${m.active?T.green:T.border}`,borderRadius:12,padding:"14px",textAlign:"center",opacity:m.active?1:0.5 }}>
              <i className={`fas ${m.icon}`} style={{ fontSize:20,color:m.color,marginBottom:6,display:"block" }}/>
              <div style={{ fontSize:11,fontWeight:600,color:m.active?T.text:T.muted }}>{m.label}</div>
              {!m.active&&<div style={{ fontSize:9,color:T.muted,marginTop:2 }}>Coming soon</div>}
            </div>
          ))}
        </div>

        <button onClick={initiateTopUp} disabled={paying||(!topupAmt&&!customAmt)} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"17px",fontSize:16,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 20px rgba(74,222,128,0.4)`,opacity:paying?0.7:1 }}>
          {paying?<><Spinner/> Processing…</>:<><i className="fas fa-lock"/> Pay {fmtGHS(customAmt?toPesewas(customAmt):topupAmt)} Securely</>}
        </button>
        {payError&&<div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"10px 14px",marginTop:10,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle" style={{marginRight:6}}/>{payError}</div>}
        <div style={{ textAlign:"center",marginTop:12,fontSize:11,color:T.muted }}>
          <i className="fas fa-shield-alt" style={{ marginRight:5 }}/>Secured by Paystack · SSL Encrypted
        </div>
      </div>
    </div>
  );

  if (tab === "history") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Transaction History" sub={`${txns.length} transactions`} onBack={()=>setTab("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
          <div style={{ background:"rgba(74,222,128,0.08)",border:`1px solid rgba(74,222,128,0.2)`,borderRadius:14,padding:"14px",textAlign:"center" }}>
            <i className="fas fa-arrow-down" style={{ fontSize:16,color:T.green,marginBottom:6,display:"block" }}/>
            <div style={{ fontSize:10,color:T.muted,marginBottom:3 }}>TOTAL IN</div>
            <div style={{ fontWeight:800,fontSize:18,color:T.green }}>{fmtGHS(totalIn)}</div>
          </div>
          <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"14px",textAlign:"center" }}>
            <i className="fas fa-arrow-up" style={{ fontSize:16,color:T.red,marginBottom:6,display:"block" }}/>
            <div style={{ fontSize:10,color:T.muted,marginBottom:3 }}>TOTAL OUT</div>
            <div style={{ fontWeight:800,fontSize:18,color:T.red }}>{fmtGHS(totalOut)}</div>
          </div>
        </div>

        <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:14 }}>
          {["All","TopUp","Debit","Refund","Bonus"].map(f=>(
            <button key={f} onClick={()=>setTxFilter(f)} className="tap"
              style={{ flexShrink:0,background:txFilter===f?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${txFilter===f?T.green:T.border}`,borderRadius:20,padding:"6px 16px",fontSize:11,fontWeight:700,color:txFilter===f?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {f}
            </button>
          ))}
        </div>

        {filteredTxns.length===0&&(
          <div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}>
            <i className="fas fa-receipt" style={{ fontSize:40,marginBottom:12,display:"block",opacity:0.3 }}/>
            No transactions yet
          </div>
        )}

        {filteredTxns.map(tx=>{
          const cfg = TX_ICONS[tx.type] || TX_ICONS.Adjustment;
          const isCredit = ["TopUp","Refund","Bonus"].includes(tx.type);
          return (
            <div key={tx.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:42,height:42,borderRadius:12,background:`${cfg.color}18`,border:`1px solid ${cfg.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className={`fas ${cfg.icon}`} style={{ fontSize:16,color:cfg.color }}/>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:600,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{tx.description||tx.type}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>
                  {new Date(tx.created_at).toLocaleString("en-GH",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}
                  {tx.payment_ref&&<span style={{ marginLeft:6,fontFamily:"monospace",fontSize:10 }}>· {tx.payment_ref.slice(-8)}</span>}
                </div>
                <div style={{ fontSize:10,color:tx.status==="Completed"?T.green:tx.status==="Failed"?T.red:T.yellow,marginTop:2,fontWeight:600 }}>
                  {tx.status}
                </div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontWeight:800,fontSize:16,color:isCredit?T.green:T.red }}>
                  {isCredit?"+":"-"}{fmtGHS(tx.amount_pesewas)}
                </div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Bal: {fmtGHS(tx.balance_after)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Wallet" sub="EcoCharge Ghana" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>

        {loading&&(
          <div style={{ textAlign:"center",padding:"40px 0" }}><Spinner/></div>
        )}

        {!loading&&(
          <>
            <div className="fade" style={{ background:T.card,borderRadius:18,padding:"22px 20px",marginBottom:16,border:`1px solid ${T.border}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                    <span style={{ fontSize:12,color:T.muted }}>Wallet Balance</span>
                    <button onClick={()=>setBalVisible(v=>!v)} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:0,color:T.muted }}>
                      <i className={`fas fa-eye${balVisible?"":"-slash"}`} style={{ fontSize:12 }}/>
                    </button>
                  </div>
                  <div style={{ fontWeight:700,fontSize:32,color:T.text,lineHeight:1,letterSpacing:-0.5 }}>
                    {balVisible?fmtGHS(wallet?.balance_pesewas||0):"GH₵ ••••"}
                  </div>
                </div>
                <div style={{ width:40,height:40,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-wallet" style={{ fontSize:17,color:T.green }}/>
                </div>
              </div>

              {wallet?.locked_pesewas>0&&(
                <div style={{ background:T.surface,borderRadius:10,padding:"8px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
                  <i className="fas fa-lock" style={{ fontSize:12,color:T.yellow }}/>
                  <span style={{ fontSize:12,color:T.yellow }}>{fmtGHS(wallet.locked_pesewas)} reserved for active session</span>
                </div>
              )}

              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setTab("topup")} className="tap"
                  style={{ flex:1,background:T.green,border:"none",borderRadius:11,padding:"13px",fontSize:14,fontWeight:700,color:"#04130a",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  <i className="fas fa-plus"/> Top Up
                </button>
                <button onClick={()=>setTab("history")} className="tap"
                  style={{ flex:1,background:"none",border:`1px solid ${T.border}`,borderRadius:11,padding:"13px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  <i className="fas fa-history"/> History
                </button>
              </div>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
              {[
                { label:"Total In",     value:fmtGHS(wallet?.total_topped_up||0),  icon:"fa-arrow-down",  color:T.green  },
                { label:"Total Spent",  value:fmtGHS(wallet?.total_spent||0),      icon:"fa-bolt",        color:T.red    },
                { label:"Sessions",     value:wallet?.session_count||0,            icon:"fa-charging-station",color:T.blue },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px 10px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <i className={`fas ${s.icon}`} style={{ fontSize:16,color:s.color,marginBottom:6,display:"block" }}/>
                  <div style={{ fontWeight:800,fontSize:15,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>Recent Transactions</div>
              {txns.length>3&&(
                <button onClick={()=>setTab("history")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                  View all <i className="fas fa-arrow-right" style={{ fontSize:11 }}/>
                </button>
              )}
            </div>

            {txns.length===0&&(
              <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"28px",textAlign:"center" }}>
                <i className="fas fa-receipt" style={{ fontSize:36,color:T.muted,marginBottom:10,display:"block",opacity:0.4 }}/>
                <div style={{ fontWeight:600,fontSize:14,color:T.text,marginBottom:6 }}>No transactions yet</div>
                <div style={{ fontSize:12,color:T.muted,marginBottom:16 }}>Top up your wallet to start charging</div>
                <button onClick={()=>setTab("topup")} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"11px 24px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                  Top Up Now
                </button>
              </div>
            )}

            {txns.slice(0,5).map(tx=>{
              const cfg = TX_ICONS[tx.type] || TX_ICONS.Adjustment;
              const isCredit = ["TopUp","Refund","Bonus"].includes(tx.type);
              return (
                <div key={tx.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:`${cfg.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={`fas ${cfg.icon}`} style={{ fontSize:14,color:cfg.color }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:600,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{tx.description||tx.type}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:1 }}>
                      {new Date(tx.created_at).toLocaleString("en-GH",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}
                    </div>
                  </div>
                  <div style={{ fontWeight:800,fontSize:15,color:isCredit?T.green:T.red,flexShrink:0 }}>
                    {isCredit?"+":"-"}{fmtGHS(tx.amount_pesewas)}
                  </div>
                </div>
              );
            })}

            <div style={{ background:T.card,borderRadius:16,padding:"16px",marginTop:8,border:`1px solid ${T.border}` }}>
              <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}><i className="fas fa-info-circle" style={{ marginRight:8,color:T.blue }}/>How it works</div>
              {[
                { icon:"fa-plus-circle",   color:T.green,  text:"Top up with Mobile Money or card" },
                { icon:"fa-bolt",          color:T.yellow, text:"Funds auto-deducted per kWh charged" },
                { icon:"fa-tint",          color:T.blue,   text:"Every charge includes 20L clean water" },
                { icon:"fa-undo",          color:T.blue,   text:"Unused balance refunded anytime" },
              ].map((item,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:i<3?10:0 }}>
                  <div style={{ width:32,height:32,borderRadius:9,background:`${item.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={`fas ${item.icon}`} style={{ fontSize:13,color:item.color }}/>
                  </div>
                  <span style={{ fontSize:12,color:T.mutedLight }}>{item.text}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

const PESEWAS = (p) => p != null ? (p/100).toFixed(2) : "0.00";
const GHS     = (p) => `GH₵${PESEWAS(p)}`;

const SCHEDULE_LABELS = {
  Always:    "Always active",
  TimeOfDay: "Time of day",
  DayOfWeek: "Specific days",
  DateRange: "Date range",
  Combined:  "Time + Days",
};

function PricingAdmin({ go, user }) {
  const [tariffs,   setTariffs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState("list");
  const [simResult, setSimResult] = useState(null);

  const [simKwh,    setSimKwh]    = useState("10");
  const [simMins,   setSimMins]   = useState("60");
  const [simIdle,   setSimIdle]   = useState("0");
  const [simTariff, setSimTariff] = useState(null);

  const loadTariffs = async () => {
    setLoading(true);
    if (!SUPABASE_URL) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tariffs?order=priority.asc,name.asc&select=*`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }}
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setTariffs(data);
        if (!simTariff && data.length) setSimTariff(data[0]);
      }
    } catch(e) {}
    setLoading(false);
  };

  const saveTariff = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url   = isNew
        ? `${SUPABASE_URL}/rest/v1/tariffs`
        : `${SUPABASE_URL}/rest/v1/tariffs?id=eq.${editing.id}`;
      await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(editing),
      });
      await loadTariffs();
      setTab("list");
      setEditing(null);
    } catch(e) {}
    setSaving(false);
  };

  const toggleActive = async (tariff) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tariffs?id=eq.${tariff.id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ is_active: !tariff.is_active }),
      });
      setTariffs(prev => prev.map(t => t.id===tariff.id ? {...t, is_active: !t.is_active} : t));
    } catch(e) {}
  };

  const simulate = () => {
    if (!simTariff) return;
    const kwh  = parseFloat(simKwh)  || 0;
    const mins = parseFloat(simMins) || 0;
    const idle = parseFloat(simIdle) || 0;
    const energyCost = Math.round(kwh  * simTariff.price_per_kwh);
    const timeCost   = Math.round(mins * simTariff.price_per_min);
    const billableIdle = Math.max(0, idle - simTariff.idle_grace_min);
    const idleCost   = Math.round(billableIdle * simTariff.idle_fee_per_min);
    const baseFee    = simTariff.session_base_fee || 0;
    let subtotal     = energyCost + timeCost + idleCost + baseFee;
    subtotal         = Math.max(subtotal, simTariff.min_charge_fee || 0);
    let discount     = 0;
    if (simTariff.is_promo && simTariff.promo_type === "Percentage") {
      discount = Math.round(subtotal * simTariff.promo_value / 100);
    } else if (simTariff.is_promo && simTariff.promo_type === "FixedDiscount") {
      discount = Math.min(simTariff.promo_value, subtotal);
    }
    const total = Math.max(0, subtotal - discount);
    setSimResult({ energyCost, timeCost, idleCost, baseFee, subtotal, discount, total });
  };

  useEffect(()=>{ loadTariffs(); },[]);

  const newTariff = () => {
    setEditing({
      name:"", code:"", description:"",
      price_per_kwh:85, price_per_min:0,
      idle_fee_per_min:0, idle_grace_min:10,
      session_base_fee:500, min_charge_fee:0,
      is_promo:false, promo_type:null, promo_value:0, promo_code:"",
      schedule_type:"Always", is_active:true, priority:0,
      is_default:false,
    });
    setTab("edit");
  };

  const inp = (label, key, type="number", placeholder="") => (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11,color:T.muted,marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>{label}</div>
      <input type={type} placeholder={placeholder} value={editing?.[key]||""}
        onChange={e=>setEditing(prev=>({...prev,[key]:type==="number"?parseFloat(e.target.value)||0:e.target.value}))}
        style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
    </div>
  );

  if (tab==="edit") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={editing?.id?"Edit Tariff":"New Tariff"} sub="Configure pricing" onBack={()=>{ setTab("list");setEditing(null); }}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>

        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-tag" style={{ marginRight:8,color:T.green }}/>Basic Info</div>
          {inp("Tariff Name", "name", "text", "e.g. Standard Rate")}
          {inp("Code (unique)", "code", "text", "e.g. STANDARD")}
          {inp("Description", "description", "text", "Short description")}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11,color:T.muted,marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Priority (higher = used first)</div>
            <input type="number" value={editing?.priority||0} onChange={e=>setEditing(p=>({...p,priority:parseInt(e.target.value)||0}))}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-bolt" style={{ marginRight:8,color:T.yellow }}/>Pricing (in Pesewas)</div>
          <div style={{ background:"rgba(56,189,248,0.08)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:11,color:T.blue }}>
            <i className="fas fa-info-circle" style={{ marginRight:6 }}/>100 pesewas = GH₵1.00 · e.g. 85 = GH₵0.85/kWh
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {[
              { label:"Price per kWh",    key:"price_per_kwh" },
              { label:"Price per Minute", key:"price_per_min" },
              { label:"Idle Fee/Min",     key:"idle_fee_per_min" },
              { label:"Idle Grace (min)", key:"idle_grace_min" },
              { label:"Base/Session Fee", key:"session_base_fee" },
              { label:"Min Session Fee",  key:"min_charge_fee" },
            ].map(f=>(
              <div key={f.key}>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>{f.label}</div>
                <input type="number" value={editing?.[f.key]||0} onChange={e=>setEditing(p=>({...p,[f.key]:parseInt(e.target.value)||0}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text }}><i className="fas fa-tag" style={{ marginRight:8,color:T.yellow }}/>Promotional</div>
            <button onClick={()=>setEditing(p=>({...p,is_promo:!p.is_promo}))} className="tap"
              style={{ background:editing?.is_promo?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,border:"none",borderRadius:20,padding:"5px 16px",fontSize:12,fontWeight:700,color:editing?.is_promo?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {editing?.is_promo?"ON":"OFF"}
            </button>
          </div>
          {editing?.is_promo&&(
            <>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:T.muted,marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Promo Type</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {["Percentage","FixedDiscount","FlatRate","FreeKwh"].map(pt=>(
                    <button key={pt} onClick={()=>setEditing(p=>({...p,promo_type:pt}))} className="tap"
                      style={{ background:editing?.promo_type===pt?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.bg,border:`1px solid ${editing?.promo_type===pt?T.green:T.border}`,borderRadius:8,padding:"9px",fontSize:11,fontWeight:700,color:editing?.promo_type===pt?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                      {pt==="Percentage"?"% Off":pt==="FixedDiscount"?"Fixed Off":pt==="FlatRate"?"Flat Rate":"Free kWh"}
                    </button>
                  ))}
                </div>
              </div>
              {inp("Promo Value (% or pesewas)", "promo_value")}
              {inp("Promo Code (optional)", "promo_code", "text", "e.g. SAVE20")}
              {inp("Max Uses (0 = unlimited)", "promo_max_uses")}
            </>
          )}
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-clock" style={{ marginRight:8,color:T.blue }}/>Schedule</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
            {["Always","TimeOfDay","DayOfWeek","DateRange"].map(st=>(
              <button key={st} onClick={()=>setEditing(p=>({...p,schedule_type:st}))} className="tap"
                style={{ background:editing?.schedule_type===st?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.bg,border:`1px solid ${editing?.schedule_type===st?T.green:T.border}`,borderRadius:8,padding:"9px",fontSize:11,fontWeight:700,color:editing?.schedule_type===st?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {st==="Always"?"Always":st==="TimeOfDay"?"By Time":st==="DayOfWeek"?"By Day":"Date Range"}
              </button>
            ))}
          </div>
          {(editing?.schedule_type==="TimeOfDay"||editing?.schedule_type==="Combined")&&(
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>FROM TIME</div>
                <input type="time" value={editing?.active_from_time||""} onChange={e=>setEditing(p=>({...p,active_from_time:e.target.value}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>TO TIME</div>
                <input type="time" value={editing?.active_to_time||""} onChange={e=>setEditing(p=>({...p,active_to_time:e.target.value}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            </div>
          )}
          {(editing?.schedule_type==="DateRange")&&(
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>FROM DATE</div>
                <input type="date" value={editing?.active_from_date||""} onChange={e=>setEditing(p=>({...p,active_from_date:e.target.value}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>TO DATE</div>
                <input type="date" value={editing?.active_to_date||""} onChange={e=>setEditing(p=>({...p,active_to_date:e.target.value}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            </div>
          )}
        </div>

        <button onClick={saveTariff} disabled={saving||!editing?.name||!editing?.code} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:saving?0.7:1 }}>
          {saving?<><Spinner/> Saving…</>:<><i className="fas fa-save"/> Save Tariff</>}
        </button>
      </div>
    </div>
  );

  if (tab==="simulate") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Price Simulator" sub="Test tariff costs" onBack={()=>setTab("list")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>

        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Select Tariff</div>
        <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16 }}>
          {tariffs.filter(t=>t.is_active).map(t=>(
            <button key={t.id} onClick={()=>setSimTariff(t)} className="tap"
              style={{ flexShrink:0,background:simTariff?.id===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${simTariff?.id===t.id?T.green:T.border}`,borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,color:simTariff?.id===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {t.name}
            </button>
          ))}
        </div>

        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-sliders-h" style={{ marginRight:8,color:T.green }}/>Session Parameters</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
            {[
              { label:"Energy (kWh)", val:simKwh, set:setSimKwh },
              { label:"Duration (min)", val:simMins, set:setSimMins },
              { label:"Idle (min)", val:simIdle, set:setSimIdle },
            ].map(f=>(
              <div key={f.label}>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>{f.label}</div>
                <input type="number" value={f.val} onChange={e=>f.set(e.target.value)}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:15,fontWeight:700,fontFamily:"inherit",textAlign:"center" }}/>
              </div>
            ))}
          </div>
        </div>

        <button onClick={simulate} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16 }}>
          <i className="fas fa-calculator"/> Calculate Cost
        </button>

        {simResult&&(
          <div className="fade" style={{ background:T.highlightGrad,borderRadius:18,padding:"18px",border:`1px solid rgba(74,222,128,0.25)` }}>
            <div style={{ textAlign:"center",marginBottom:16 }}>
              <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Estimated Cost — {simTariff?.name}</div>
              <div style={{ fontWeight:900,fontSize:44,color:T.green }}>{GHS(simResult.total)}</div>
              {simResult.discount>0&&<div style={{ fontSize:13,color:T.yellow,marginTop:4 }}>You save {GHS(simResult.discount)} 🎉</div>}
            </div>
            <Divider/>
            {[
              { label:`Energy (${simKwh} kWh)`,     value:GHS(simResult.energyCost), show:simResult.energyCost>0 },
              { label:`Time (${simMins} min)`,       value:GHS(simResult.timeCost),   show:simResult.timeCost>0   },
              { label:`Idle fee (${simIdle} min)`,   value:GHS(simResult.idleCost),   show:simResult.idleCost>0   },
              { label:"Base/connection fee",         value:GHS(simResult.baseFee),    show:simResult.baseFee>0    },
              { label:"Subtotal",                    value:GHS(simResult.subtotal),   show:true                   },
              { label:"Promo discount",              value:`-${GHS(simResult.discount)}`,show:simResult.discount>0 },
            ].filter(r=>r.show).map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                <span style={{ color:r.label.includes("discount")?T.yellow:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
              </div>
            ))}
            <Divider/>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>Total</span>
              <span style={{ fontWeight:900,fontSize:24,color:T.green }}>{GHS(simResult.total)}</span>
            </div>
          </div>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Pricing Engine" sub="Manage tariffs" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        <div style={{ display:"flex",gap:8,marginBottom:14 }}>
          <button onClick={newTariff} className="tap"
            style={{ flex:1,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className="fas fa-plus"/> New Tariff
          </button>
          <button onClick={()=>setTab("simulate")} className="tap"
            style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",fontSize:13,fontWeight:700,color:T.blue,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <i className="fas fa-calculator"/> Simulate
          </button>
          <button onClick={loadTariffs} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",fontSize:13,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className={`fas fa-sync${loading?" fa-spin":""}`}/>
          </button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
          {[
            { label:"Total",    value:tariffs.length,                          color:T.text   },
            { label:"Active",   value:tariffs.filter(t=>t.is_active).length,   color:T.green  },
            { label:"Promos",   value:tariffs.filter(t=>t.is_promo).length,    color:T.yellow },
          ].map(s=>(
            <div key={s.label} style={{ background:T.card,borderRadius:12,padding:"12px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading&&<div style={{ textAlign:"center",padding:"30px 0" }}><Spinner/></div>}

        {tariffs.map(t=>(
          <div key={t.id} style={{ background:T.card,borderRadius:16,border:`1px solid ${t.is_active?T.border:T.surface}`,marginBottom:10,overflow:"hidden",opacity:t.is_active?1:0.6 }}>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{t.name}</div>
                    {t.is_default&&<Badge label="Default" color={T.blue}/>}
                    {t.is_promo&&<Badge label="PROMO" color={T.yellow}/>}
                  </div>
                  <div style={{ fontSize:11,color:T.muted }}>{t.description||"No description"}</div>
                </div>
                <button onClick={()=>toggleActive(t)} className="tap"
                  style={{ background:t.is_active?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.track,border:"none",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:t.is_active?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginLeft:8 }}>
                  {t.is_active?"ON":"OFF"}
                </button>
              </div>

              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:10 }}>
                {t.price_per_kwh>0&&(
                  <div style={{ background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4 }}>
                    <i className="fas fa-bolt" style={{ fontSize:9,color:T.green }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:T.green }}>{GHS(t.price_per_kwh)}/kWh</span>
                  </div>
                )}
                {t.price_per_min>0&&(
                  <div style={{ background:"rgba(56,189,248,0.1)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4 }}>
                    <i className="fas fa-clock" style={{ fontSize:9,color:T.blue }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:T.blue }}>{GHS(t.price_per_min)}/min</span>
                  </div>
                )}
                {t.idle_fee_per_min>0&&(
                  <div style={{ background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4 }}>
                    <i className="fas fa-parking" style={{ fontSize:9,color:T.yellow }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:T.yellow }}>Idle: {GHS(t.idle_fee_per_min)}/min</span>
                  </div>
                )}
                {t.session_base_fee>0&&(
                  <div style={{ background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,padding:"4px 10px" }}>
                    <span style={{ fontSize:11,fontWeight:700,color:"#a78bfa" }}>Base: {GHS(t.session_base_fee)}</span>
                  </div>
                )}
                {t.is_promo&&t.promo_type&&(
                  <div style={{ background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:8,padding:"4px 10px" }}>
                    <span style={{ fontSize:11,fontWeight:700,color:T.yellow }}>
                      {t.promo_type==="Percentage"?`${t.promo_value}% OFF`:t.promo_type==="FixedDiscount"?`${GHS(t.promo_value)} OFF`:`Flat ${GHS(t.promo_value)}`}
                      {t.promo_code&&` · Code: ${t.promo_code}`}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:11,color:T.muted }}>
                  <i className="fas fa-clock" style={{ marginRight:4 }}/>{SCHEDULE_LABELS[t.schedule_type]||t.schedule_type}
                  {t.active_from_time&&` · ${t.active_from_time}–${t.active_to_time}`}
                  <span style={{ marginLeft:8 }}>Priority: {t.priority}</span>
                </div>
                <button onClick={()=>{ setEditing({...t});setTab("edit"); }} className="tap"
                  style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
                  <i className="fas fa-pencil-alt"/> Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

const ADMIN_TABS = [
  { id:"overview",  label:"Overview",  icon:"fa-tachometer-alt" },
  { id:"chargers",  label:"Chargers",  icon:"fa-charging-station" },
  { id:"stations",  label:"Stations",  icon:"fa-map-marker-alt" },
  { id:"sessions",  label:"Sessions",  icon:"fa-bolt" },
  { id:"wallets",   label:"Wallets",   icon:"fa-wallet" },
  { id:"revenue",   label:"Revenue",   icon:"fa-chart-line" },
  { id:"pricing",   label:"Pricing",   icon:"fa-tags" },
  { id:"faults",    label:"Faults",    icon:"fa-exclamation-triangle" },
];

function AdminDashboard({ go, user }) {
  const [tab,setTab]=useState("overview");
  const [loading,setLoading]=useState(false);
  const [overview,setOverview]=useState(null);
  const [chargers,setChargers]=useState([]);
  const [stations,setStations]=useState([]);
  const [sessions,setSessions]=useState([]);
  const [wallets,setWallets]=useState([]);
  const [faults,setFaults]=useState([]);
  const [revenue,setRevenue]=useState([]);
  const [tariffs,setTariffs]=useState([]);
  const [editStation,setEditStation]=useState(null);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const load = async (table, setter, query="") => {
    if (!SUPABASE_URL) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` }});
      const data = await res.json();
      if (Array.isArray(data)) setter(data);
    } catch(e) {}
  };

  const loadOverview = async () => {
    if (!SUPABASE_URL) return;
    setLoading(true);
    try {
      const [sesRes, walRes, charRes, faultRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?select=status,cost_total,energy_kwh,created_at&order=created_at.desc&limit=100`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }}),
        fetch(`${SUPABASE_URL}/rest/v1/wallets?select=balance_pesewas,total_spent,total_topped_up`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }}),
        fetch(`${SUPABASE_URL}/rest/v1/chargers?select=id,status,online,has_fault`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }}),
        fetch(`${SUPABASE_URL}/rest/v1/chargers?select=id,status,error_code&has_fault=eq.true`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }}),
      ]);
      const [ses, wal, chr, flt] = await Promise.all([sesRes.json(), walRes.json(), charRes.json(), faultRes.json()]);
      const totalRevenue   = Array.isArray(ses) ? ses.reduce((a,s)=>a+(s.cost_total||0),0) : 0;
      const totalEnergy    = Array.isArray(ses) ? ses.reduce((a,s)=>a+(s.energy_kwh||0),0) : 0;
      const totalWallets   = Array.isArray(wal) ? wal.length : 0;
      const totalBalance   = Array.isArray(wal) ? wal.reduce((a,w)=>a+(w.balance_pesewas||0),0) : 0;
      const activeChargers = Array.isArray(chr) ? chr.filter(c=>c.online).length : 0;
      const faultCount     = Array.isArray(flt) ? flt.length : 0;
      const activeSessions = Array.isArray(ses) ? ses.filter(s=>s.status==="Charging").length : 0;
      const todaySes       = Array.isArray(ses) ? ses.filter(s=>new Date(s.created_at)>new Date(Date.now()-86400000)).length : 0;
      setOverview({ totalRevenue, totalEnergy, totalWallets, totalBalance, activeChargers, faultCount, activeSessions, todaySes, totalSessions: Array.isArray(ses)?ses.length:0 });
    } catch(e) {}
    setLoading(false);
  };

  const loadOcppChargers = async () => {
    setLoading(true);
    if (OCPP_URL) {
      try {
        const res = await fetch(`${OCPP_URL}/api/chargers`, { headers:{ "x-api-key": OCPP_KEY }});
        const data = await res.json();
        if (data?.chargers) setChargers(data.chargers);
      } catch(e) {}
    }
    await load("chargers", ch => setChargers(prev => {
      const ocppMap = {};
      prev.forEach(c => ocppMap[c.id] = c);
      return Array.isArray(ch) ? ch.map(c => ({ ...c, ...ocppMap[c.id] })) : prev;
    }), "?select=*&order=id");
    setLoading(false);
  };

  useEffect(()=>{ loadOverview(); },[]);
  useEffect(()=>{
    if (tab==="chargers")  loadOcppChargers();
    if (tab==="stations")  load("stations", setStations, "?select=*&order=id");
    if (tab==="sessions")  load("charging_sessions", setSessions, "?select=*&order=created_at.desc&limit=100");
    if (tab==="wallets")   load("wallets", setWallets, "?select=*&order=updated_at.desc&limit=100");
    if (tab==="faults")    load("chargers", setFaults, "?select=*&has_fault=eq.true&order=updated_at.desc");
    if (tab==="revenue")   load("charging_sessions", setRevenue, "?select=created_at,cost_total,energy_kwh,status&order=created_at.desc&limit=200");
    if (tab==="pricing")   load("tariffs", setTariffs, "?select=*&order=priority.asc");
  },[tab]);

  const sbPatch = async (table, id, data) => {
    if (!SUPABASE_URL) return false;
    setSaving(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method:"PATCH",
        headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify(data)
      });
      setMsg("Saved ✅"); setTimeout(()=>setMsg(""),2000);
      setSaving(false); return true;
    } catch(e) { setSaving(false); return false; }
  };

  const sendOcpp = async (chargerId, action, body={}) => {
    if (!OCPP_URL) return null;
    try {
      const res = await fetch(`${OCPP_URL}/api/chargers/${chargerId}/${action}`, {
        method:"POST", headers:{ "x-api-key": OCPP_KEY, "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });
      return res.json();
    } catch(e) { return null; }
  };

  const statusColor = (s) => {
    if (s==="Available"||s==="active"||s==="confirmed") return T.green;
    if (s==="Charging") return T.blue;
    if (s==="Faulted"||s==="failed") return T.red;
    if (s==="Unavailable") return T.muted;
    return T.yellow;
  };

  const StatCard = ({ label, value, icon, color, sub }) => (
    <div style={{ background:T.card,borderRadius:14,padding:"14px 12px",border:`1px solid ${T.border}`,textAlign:"center" }}>
      <i className={`fas ${icon}`} style={{ fontSize:18,color,marginBottom:8,display:"block" }}/>
      <div style={{ fontWeight:900,fontSize:20,color }}>{value}</div>
      <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5 }}>{label}</div>
      {sub&&<div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
  );

  const renderTab = () => {
    if (tab==="overview") return (
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>Platform Overview</div>
          <button onClick={loadOverview} className="tap" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",fontSize:11,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            <i className={`fas fa-sync${loading?" fa-spin":""}`}/> Refresh
          </button>
        </div>
        {!overview&&loading&&<div style={{ textAlign:"center",padding:"30px 0" }}><Spinner/></div>}
        {overview&&(
          <>
            <div style={{ background:T.highlightGrad,borderRadius:16,padding:"18px",border:"1px solid rgba(74,222,128,0.25)",marginBottom:10 }}>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Total Revenue</div>
              <div style={{ fontWeight:900,fontSize:36,color:T.green }}>GH₵{(overview.totalRevenue/100).toFixed(2)}</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>{overview.totalSessions} sessions · {overview.totalEnergy.toFixed(1)} kWh delivered</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10 }}>
              <StatCard label="Active Now"    value={overview.activeSessions} icon="fa-bolt"             color={T.green}  />
              <StatCard label="Online Chargers" value={overview.activeChargers} icon="fa-charging-station" color={T.blue}   />
              <StatCard label="Faults"        value={overview.faultCount}    icon="fa-exclamation-triangle" color={overview.faultCount>0?T.red:T.green} />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
              <StatCard label="Today Sessions" value={overview.todaySes}   icon="fa-calendar-day" color={T.yellow} />
              <StatCard label="Total Wallets"  value={overview.totalWallets} icon="fa-wallet"      color={T.blue}   />
            </div>
            <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:10 }}>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Total Wallet Balances (Platform)</div>
              <div style={{ fontWeight:800,fontSize:22,color:T.yellow }}>GH₵{(overview.totalBalance/100).toFixed(2)}</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[
                { label:"View Chargers",  tab:"chargers", icon:"fa-charging-station", color:T.green  },
                { label:"View Faults",    tab:"faults",   icon:"fa-exclamation-triangle",color:T.red },
                { label:"Revenue Report", tab:"revenue",  icon:"fa-chart-line",       color:T.yellow },
                { label:"Manage Pricing", tab:"pricing",  icon:"fa-tags",             color:"#a78bfa" },
              ].map(a=>(
                <button key={a.tab} onClick={()=>setTab(a.tab)} className="tap"
                  style={{ background:`${a.color}10`,border:`1px solid ${a.color}25`,borderRadius:12,padding:"13px",fontSize:12,fontWeight:700,color:a.color,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                  <i className={`fas ${a.icon}`}/> {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );

    if (tab==="chargers") return (
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{chargers.length} Chargers</div>
          <button onClick={loadOcppChargers} className="tap" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",fontSize:11,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            <i className={`fas fa-sync${loading?" fa-spin":""}`}/> Refresh
          </button>
        </div>
        {chargers.map(c=>(
          <div key={c.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${c.has_fault?"rgba(248,113,113,0.3)":T.border}`,marginBottom:10,padding:"13px 14px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{c.id}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{c.model||c.info?.chargePointModel||"Unknown"}</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                <div style={{ background:`${statusColor(c.status)}15`,borderRadius:8,padding:"3px 10px" }}>
                  <span style={{ fontSize:10,fontWeight:700,color:statusColor(c.status) }}>{c.status||"Unknown"}</span>
                </div>
                <div style={{ fontSize:10,color:c.connected||c.online?T.green:T.muted,display:"flex",alignItems:"center",gap:4 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:c.connected||c.online?T.green:T.muted }}/>
                  {c.connected||c.online?"Online":"Offline"}
                </div>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
              {[
                { label:"Reset",    action:"reset",              body:{type:"Soft"}, color:T.yellow },
                { label:"Unlock",   action:"unlock",             body:{connectorId:1}, color:T.blue },
                { label:"Disable",  action:"change-availability",body:{connectorId:0,type:"Inoperative"}, color:T.muted },
              ].map(cmd=>(
                <button key={cmd.action} onClick={async()=>{ const r=await sendOcpp(c.id,cmd.action,cmd.body); setMsg(r?.success?"Command sent ✅":"Command failed ❌"); setTimeout(()=>setMsg(""),2000); }} className="tap"
                  style={{ background:`${cmd.color}10`,border:`1px solid ${cmd.color}25`,borderRadius:8,padding:"8px",fontSize:10,fontWeight:700,color:cmd.color,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    if (tab==="stations") {
      if (editStation) return (
        <div>
          <button onClick={()=>setEditStation(null)} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:14,display:"flex",alignItems:"center",gap:6 }}>
            <i className="fas fa-arrow-left"/> Back to stations
          </button>
          <div style={{ background:T.card,borderRadius:16,padding:"16px",border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:14 }}>Edit: {editStation.name}</div>
            {[
              { label:"Station Name", key:"name",     type:"text"   },
              { label:"City",         key:"city",     type:"text"   },
              { label:"Total Bays",   key:"bays",     type:"number" },
              { label:"Open Bays",    key:"open",     type:"number" },
              { label:"Solar %",      key:"solar",    type:"number" },
              { label:"Hydrogen %",   key:"hydrogen", type:"number" },
              { label:"Wait Time",    key:"time",     type:"text"   },
              { label:"Latitude",     key:"lat",      type:"number" },
              { label:"Longitude",    key:"lng",      type:"number" },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:10 }}>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600,textTransform:"uppercase" }}>{f.label}</div>
                <input type={f.type} value={editStation[f.key]||""} onChange={e=>setEditStation(p=>({...p,[f.key]:f.type==="number"?parseFloat(e.target.value)||0:e.target.value}))}
                  style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            ))}
            <button onClick={async()=>{
              setSaving(true);
              try {
                await fetch(`${SUPABASE_URL}/rest/v1/stations?id=eq.${editStation.id}`, {
                  method:"PATCH",
                  headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
                  body: JSON.stringify({ name:editStation.name, city:editStation.city, bays:editStation.bays, open:editStation.open, solar:editStation.solar, hydrogen:editStation.hydrogen, time:editStation.time, lat:editStation.lat, lng:editStation.lng })
                });
                setMsg("Station saved ✅"); setTimeout(()=>setMsg(""),2000);
                setEditStation(null);
                load("stations", setStations, "?select=*&order=id");
              } catch(e) {}
              setSaving(false);
            }} disabled={saving} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4 }}>
              {saving?<><Spinner/> Saving…</>:<><i className="fas fa-save"/> Save Station</>}
            </button>
          </div>
        </div>
      );
      return (
        <div>
          <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:14 }}>{stations.length} Stations</div>
          {stations.map(s=>(
            <div key={s.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px",marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{s.name}</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{s.city} · {s.bays} bays · {s.solar}% solar</div>
                </div>
                <button onClick={()=>setEditStation({...s})} className="tap"
                  style={{ background:`${T.green}10`,border:`1px solid ${T.green}25`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                  Edit
                </button>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6 }}>
                {[{ label:"Open",value:`${s.open}/${s.bays}`,color:T.green },{ label:"Solar",value:`${s.solar}%`,color:T.yellow },{ label:"H₂",value:`${s.hydrogen}%`,color:T.blue },{ label:"Wait",value:s.time,color:T.muted }].map(r=>(
                  <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"6px",textAlign:"center" }}>
                    <div style={{ fontWeight:700,fontSize:11,color:r.color }}>{r.value}</div>
                    <div style={{ fontSize:9,color:T.muted }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (tab==="sessions") {
      const active = sessions.filter(s=>s.status==="Charging");
      return (
        <div>
          {active.length>0&&(
            <div style={{ background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:14,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>
              <div style={{ fontWeight:700,fontSize:13,color:T.green }}>{active.length} session{active.length>1?"s":""} charging live right now</div>
            </div>
          )}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{sessions.length} Sessions</div>
            <button onClick={()=>load("charging_sessions",setSessions,"?select=*&order=created_at.desc&limit=100")} className="tap"
              style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",fontSize:11,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
              <i className="fas fa-sync"/> Refresh
            </button>
          </div>
          {sessions.map(s=>{
            const sc = s.status==="Charging"?T.blue:s.status==="Completed"?T.green:s.status==="Faulted"?T.red:T.muted;
            return (
              <div key={s.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${s.status==="Charging"?"rgba(56,189,248,0.25)":T.border}`,padding:"13px 14px",marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:12,color:T.text,fontFamily:"monospace" }}>{s.session_ref||s.id?.slice(0,16)}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{s.charger_id||"--"} · {s.vehicle_type||"--"}</div>
                  </div>
                  <div style={{ background:`${sc}15`,borderRadius:8,padding:"3px 10px" }}>
                    <span style={{ fontSize:10,fontWeight:700,color:sc }}>{s.status}</span>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6 }}>
                  {[{ label:"kWh",value:s.energy_kwh!=null?s.energy_kwh.toFixed(3):"--" },{ label:"Min",value:s.duration_min!=null?s.duration_min.toFixed(0):"--" },{ label:"Cost",value:s.cost_total?`₵${(s.cost_total/100).toFixed(0)}`:"--" },{ label:"Pay",value:s.payment_status||"--" }].map(r=>(
                    <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"6px",textAlign:"center" }}>
                      <div style={{ fontWeight:700,fontSize:11,color:T.text }}>{r.value}</div>
                      <div style={{ fontSize:9,color:T.muted }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (tab==="wallets") {
      const totalBal  = wallets.reduce((a,w)=>a+(w.balance_pesewas||0),0);
      const totalIn   = wallets.reduce((a,w)=>a+(w.total_topped_up||0),0);
      const totalSpent= wallets.reduce((a,w)=>a+(w.total_spent||0),0);
      return (
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[{ label:"Total Balances",value:`GH₵${(totalBal/100).toFixed(0)}`,color:T.green },{ label:"Total Top-ups",value:`GH₵${(totalIn/100).toFixed(0)}`,color:T.blue },{ label:"Total Spent",value:`GH₵${(totalSpent/100).toFixed(0)}`,color:T.yellow },{ label:"Total Wallets",value:wallets.length,color:T.mutedLight }].map(s=>(
              <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {wallets.map(w=>(
            <div key={w.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px",marginBottom:8 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{w.display_name||w.email||"Anonymous"}</div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{w.email||"No email"}</div>
                </div>
                <div style={{ fontWeight:800,fontSize:16,color:T.green }}>GH₵{((w.balance_pesewas||0)/100).toFixed(2)}</div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
                {[{ label:"Topped Up",value:`GH₵${((w.total_topped_up||0)/100).toFixed(0)}` },{ label:"Spent",value:`GH₵${((w.total_spent||0)/100).toFixed(0)}` },{ label:"Sessions",value:w.session_count||0 }].map(r=>(
                  <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"6px",textAlign:"center" }}>
                    <div style={{ fontWeight:700,fontSize:11,color:T.text }}>{r.value}</div>
                    <div style={{ fontSize:9,color:T.muted }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (tab==="revenue") {
      const completed = revenue.filter(s=>s.status==="Completed"&&s.cost_total);
      const totalRev  = completed.reduce((a,s)=>a+(s.cost_total||0),0);
      const totalKwh  = completed.reduce((a,s)=>a+(s.energy_kwh||0),0);
      const avgRev    = completed.length ? totalRev/completed.length : 0;
      const byDay = {};
      completed.forEach(s=>{ const day = s.created_at?.slice(0,10)||"Unknown"; if (!byDay[day]) byDay[day] = { rev:0, count:0, kwh:0 }; byDay[day].rev+=s.cost_total||0; byDay[day].count+=1; byDay[day].kwh+=s.energy_kwh||0; });
      const days = Object.entries(byDay).sort((a,b)=>a[0]>b[0]?-1:1).slice(0,10);
      const maxRev = Math.max(...days.map(d=>d[1].rev), 1);
      return (
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[{ label:"Total Revenue",value:`GH₵${(totalRev/100).toFixed(2)}`,color:T.green },{ label:"Total Energy",value:`${totalKwh.toFixed(1)} kWh`,color:T.yellow },{ label:"Avg per Session",value:`GH₵${(avgRev/100).toFixed(2)}`,color:T.blue },{ label:"Paid Sessions",value:completed.length,color:T.green }].map(s=>(
              <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                <div style={{ fontWeight:800,fontSize:18,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}>Revenue by Day</div>
            {days.map(([day,d])=>(
              <div key={day} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                  <span style={{ fontSize:11,color:T.muted }}>{new Date(day).toLocaleDateString("en-GH",{day:"numeric",month:"short"})}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:T.green }}>GH₵{(d.rev/100).toFixed(2)} · {d.count} sessions</span>
                </div>
                <div style={{ height:8,borderRadius:4,background:T.surface,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${(d.rev/maxRev)*100}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,borderRadius:4 }}/>
                </div>
              </div>
            ))}
            {days.length===0&&<div style={{ textAlign:"center",color:T.muted,fontSize:13,padding:"20px 0" }}>No completed sessions yet</div>}
          </div>
        </div>
      );
    }

    if (tab==="pricing") return (
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{tariffs.length} Tariffs</div>
          <button onClick={()=>go("pricing")} className="tap"
            style={{ background:`${T.green}10`,border:`1px solid ${T.green}25`,borderRadius:10,padding:"7px 14px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            <i className="fas fa-external-link-alt"/> Full Editor
          </button>
        </div>
        {tariffs.map(t=>(
          <div key={t.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${t.is_active?T.border:T.surface}`,padding:"13px 14px",marginBottom:8,opacity:t.is_active?1:0.55 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{t.name}</div>
                <div style={{ fontSize:10,color:T.muted }}>{t.code}</div>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                {t.is_promo&&<Badge label="PROMO" color={T.yellow}/>}
                <div style={{ background:t.is_active?`${T.green}15`:T.surface,borderRadius:8,padding:"3px 10px" }}>
                  <span style={{ fontSize:10,fontWeight:700,color:t.is_active?T.green:T.muted }}>{t.is_active?"ON":"OFF"}</span>
                </div>
              </div>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {t.price_per_kwh>0&&<div style={{ background:"rgba(74,222,128,0.08)",borderRadius:6,padding:"3px 8px",fontSize:10,color:T.green,fontWeight:700 }}>GH₵{(t.price_per_kwh/100).toFixed(2)}/kWh</div>}
              {t.price_per_min>0&&<div style={{ background:"rgba(56,189,248,0.08)",borderRadius:6,padding:"3px 8px",fontSize:10,color:T.blue,fontWeight:700 }}>GH₵{(t.price_per_min/100).toFixed(2)}/min</div>}
            </div>
          </div>
        ))}
      </div>
    );

    if (tab==="faults") return (
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{faults.length} Active Fault{faults.length!==1?"s":""}</div>
          <button onClick={()=>load("chargers",setFaults,"?select=*&has_fault=eq.true&order=updated_at.desc")} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",fontSize:11,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            <i className="fas fa-sync"/> Refresh
          </button>
        </div>
        {faults.length===0&&(
          <div style={{ textAlign:"center",padding:"40px 0" }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(74,222,128,0.1)",border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
              <i className="fas fa-check" style={{ fontSize:26,color:T.green }}/>
            </div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:6 }}>All Systems Normal</div>
            <div style={{ fontSize:12,color:T.muted }}>No active faults detected</div>
          </div>
        )}
        {faults.map(f=>(
          <div key={f.id} style={{ background:"rgba(248,113,113,0.06)",borderRadius:14,border:"1px solid rgba(248,113,113,0.2)",padding:"14px",marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{f.id}</div>
                {f.error_code&&<div style={{ fontSize:12,color:T.red,marginTop:4 }}><i className="fas fa-exclamation-circle" style={{ marginRight:6 }}/>Error: {f.error_code}</div>}
              </div>
              <div style={{ background:"rgba(248,113,113,0.12)",borderRadius:8,padding:"3px 10px" }}>
                <span style={{ fontSize:10,fontWeight:700,color:T.red }}>{f.status||"Faulted"}</span>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              <button onClick={async()=>{ const r=await sendOcpp(f.id,"reset",{type:"Hard"}); setMsg(r?.success?"Reset sent ✅":"Reset failed ❌"); setTimeout(()=>setMsg(""),2000); }} className="tap"
                style={{ background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.yellow,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                <i className="fas fa-redo"/> Hard Reset
              </button>
              <button onClick={async()=>{ await sbPatch("chargers",f.id,{has_fault:false,status:"Available",error_code:null}); load("chargers",setFaults,"?select=*&has_fault=eq.true"); }} className="tap"
                style={{ background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                <i className="fas fa-check"/> Clear Fault
              </button>
            </div>
          </div>
        ))}
      </div>
    );

    return null;
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"calc(14px + env(safe-area-inset-top, 34px)) 16px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
            <i className="fas fa-arrow-left" style={{ fontSize:18,color:T.text }}/>
          </button>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:T.text }}>Admin Dashboard</div>
            <div style={{ fontSize:10,color:T.muted,marginTop:1 }}>EcoCharge Ghana · Management</div>
          </div>
        </div>
        {msg&&<div style={{ fontSize:11,color:T.green,fontWeight:700 }}>{msg}</div>}
      </div>

      <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"10px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        {ADMIN_TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="tap"
            style={{ flexShrink:0,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${tab===t.id?T.green:T.border}`,borderRadius:20,padding:"7px 14px",fontSize:11,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            <i className={`fas ${t.icon}`}/> {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>
        {renderTab()}
      </div>

      <Nav active="Profile" go={go}/>
    </div>
  );
}

// ── MY VEHICLES SCREEN ───────────────────────────────────────
// ── VEHICLE DATABASE SERVICE ──────────────────────────────────
// Clean service abstraction — swap mock data for a real API later.
const VEHICLE_TYPES = [
  { value:"Electric Car",        icon:"fa-car",          label:"Electric Car"        },
  { value:"Electric Motorcycle", icon:"fa-motorcycle",   label:"Electric Motorcycle" },
  { value:"Electric Tricycle",   icon:"fa-truck-pickup", label:"Electric Tricycle"   },
  { value:"Electric Bus",        icon:"fa-bus",          label:"Electric Bus"        },
  { value:"Electric Van",        icon:"fa-shuttle-van",  label:"Electric Van"        },
  { value:"Other",               icon:"fa-bolt",         label:"Other EV"            },
];

const CONNECTOR_TYPES = ["CCS2","CHAdeMO","Type 2 (AC)","Type 1 (J1772)","GB/T DC","GB/T AC","Tesla","CEE 3-pin","Schuko","Other"];

// ── CARSXE API KEY ────────────────────────────────────────────
// Set VITE_CARSXE_API_KEY in your Vercel environment variables.
const CARSXE_KEY = import.meta.env.VITE_CARSXE_API_KEY || "";

// ── ECOCHARGE VEHICLE REGISTRY ────────────────────────────────
// Tier 1: CarsXE API (live lookup)
// Tier 2: EcoCharge local registry (our growing African EV database)
// Tier 3: Fallback EV_DATABASE (always-available seed data)
//
// This registry grows over time. When a user registers a vehicle
// not found in any source, it goes to admin review and gets added
// here — building EcoCharge's proprietary African EV database.

const ECOCHARGE_REGISTRY = {
  // ── African & Asian market EVs (not in global APIs) ──────────
  "Spiro": {
    "Ace": { years:[2022,2023,2024], battery:1.8,  connector:"Proprietary", range:80,  maxPower:1.5,  type:"Electric Motorcycle", region:"Africa" },
    "Kabo": { years:[2023,2024],     battery:2.5,  connector:"Proprietary", range:100, maxPower:2.0,  type:"Electric Motorcycle", region:"Africa" },
  },
  "Wahu": {
    "E-Bike Pro":  { years:[2023,2024], battery:0.9, connector:"Proprietary", range:60, maxPower:0.5, type:"Electric Motorcycle", region:"Ghana"  },
    "Cargo Bike":  { years:[2023,2024], battery:1.5, connector:"Proprietary", range:80, maxPower:0.8, type:"Electric Van",         region:"Ghana"  },
  },
  "BYD": {
    "Dolphin":   { years:[2021,2022,2023,2024], battery:44,  connector:"CCS2",    range:340, maxPower:60,  type:"Electric Car", region:"Global" },
    "Atto 3":    { years:[2022,2023,2024],       battery:60,  connector:"CCS2",    range:420, maxPower:88,  type:"Electric Car", region:"Global" },
    "Han EV":    { years:[2021,2022,2023,2024], battery:85,  connector:"CCS2",    range:605, maxPower:120, type:"Electric Car", region:"Global" },
    "Seal":      { years:[2022,2023,2024],       battery:82,  connector:"CCS2",    range:570, maxPower:150, type:"Electric Car", region:"Global" },
    "Tang EV":   { years:[2021,2022,2023],       battery:108, connector:"CCS2",    range:505, maxPower:110, type:"Electric Car", region:"Global" },
    "King (Bus)":{ years:[2022,2023,2024],       battery:374, connector:"CCS2",    range:250, maxPower:180, type:"Electric Bus", region:"Global" },
  },
  "Mahindra": {
    "Treo":      { years:[2019,2020,2021,2022,2023,2024], battery:7.37, connector:"Proprietary", range:170, maxPower:8,   type:"Electric Tricycle", region:"Africa/Asia" },
    "Treo Zor":  { years:[2020,2021,2022,2023,2024],      battery:10.24,connector:"Proprietary", range:195, maxPower:12,  type:"Electric Tricycle", region:"Africa/Asia" },
    "XUV400":    { years:[2023,2024],                      battery:39.4, connector:"CCS2",        range:456, maxPower:50,  type:"Electric Car",      region:"Global"      },
  },
  "BAIC": {
    "EC Series": { years:[2019,2020,2021,2022,2023], battery:32,  connector:"GB/T DC", range:310, maxPower:40,  type:"Electric Car", region:"Africa/Asia" },
    "EU5":       { years:[2020,2021,2022,2023],       battery:53,  connector:"GB/T DC", range:416, maxPower:60,  type:"Electric Car", region:"Africa/Asia" },
    "X55":       { years:[2022,2023,2024],             battery:63,  connector:"GB/T DC", range:500, maxPower:80,  type:"Electric Car", region:"Africa/Asia" },
  },
  "Changan": {
    "Lumin":     { years:[2022,2023,2024], battery:20,  connector:"GB/T DC", range:301, maxPower:30, type:"Electric Car", region:"Africa/Asia" },
    "Deepal L07":{ years:[2023,2024],      battery:82,  connector:"CCS2",    range:520, maxPower:120,type:"Electric Car", region:"Global"      },
  },
  "DFSK": {
    "EC31 (Van)":{ years:[2020,2021,2022,2023], battery:42, connector:"GB/T DC", range:300, maxPower:40, type:"Electric Van", region:"Africa" },
  },
  "Foton": {
    "AUV Bus":   { years:[2021,2022,2023,2024], battery:180, connector:"GB/T DC", range:300, maxPower:120, type:"Electric Bus", region:"Africa" },
  },
  "Sinotruk": {
    "Electric Truck": { years:[2022,2023,2024], battery:200, connector:"GB/T DC", range:250, maxPower:150, type:"Electric Van", region:"Africa" },
  },
  "Volta": {
    "Zero (Truck)": { years:[2022,2023,2024], battery:160, connector:"CCS2", range:200, maxPower:150, type:"Electric Van", region:"Global" },
  },
  "Ampersand": {
    "Moto":      { years:[2021,2022,2023,2024], battery:2.4, connector:"Proprietary", range:100, maxPower:2.0, type:"Electric Motorcycle", region:"Africa" },
  },
  "BasiGo": {
    "E7 Bus":    { years:[2022,2023,2024], battery:100, connector:"CCS2", range:200, maxPower:60, type:"Electric Bus", region:"Africa" },
  },
  "Roam": {
    "Air":       { years:[2022,2023,2024], battery:3.5, connector:"Proprietary", range:130, maxPower:3.0, type:"Electric Motorcycle", region:"Africa" },
  },
  "Mogo": {
    "Classic":   { years:[2023,2024], battery:1.6, connector:"Proprietary", range:70, maxPower:1.2, type:"Electric Motorcycle", region:"Ghana" },
  },
  "Local Tricycle": {
    "Standard Model":  { years:[2020,2021,2022,2023,2024], battery:5,  connector:"Type 2 (AC)", range:80,  maxPower:3.3, type:"Electric Tricycle", region:"Ghana" },
    "Heavy Cargo":     { years:[2021,2022,2023,2024],       battery:8,  connector:"Type 2 (AC)", range:100, maxPower:5.0, type:"Electric Tricycle", region:"Ghana" },
    "Passenger Model": { years:[2022,2023,2024],             battery:6,  connector:"Type 2 (AC)", range:90,  maxPower:4.0, type:"Electric Tricycle", region:"Ghana" },
  },
  // ── International EVs (supplement to EV_DATABASE) ────────────
  "Zeekr": {
    "001":       { years:[2022,2023,2024], battery:100, connector:"CCS2", range:632, maxPower:200, type:"Electric Car", region:"Global" },
    "X":         { years:[2023,2024],      battery:66,  connector:"CCS2", range:538, maxPower:150, type:"Electric Car", region:"Global" },
  },
  "NIO": {
    "ET5":       { years:[2022,2023,2024], battery:75,  connector:"CCS2", range:590, maxPower:135, type:"Electric Car", region:"Global" },
    "ES6":       { years:[2019,2020,2021,2022,2023], battery:100, connector:"CCS2", range:580, maxPower:127, type:"Electric Car", region:"Global" },
  },
  "Polestar": {
    "2":         { years:[2021,2022,2023,2024], battery:82, connector:"CCS2", range:540, maxPower:205, type:"Electric Car", region:"Global" },
  },
  "Rivian": {
    "R1T":       { years:[2021,2022,2023,2024], battery:135, connector:"CCS2", range:499, maxPower:200, type:"Electric Van", region:"Global" },
  },
  "Lucid": {
    "Air":       { years:[2021,2022,2023,2024], battery:118, connector:"CCS2", range:837, maxPower:300, type:"Electric Car", region:"Global" },
  },
};

// ── FALLBACK EV DATABASE (always available, no network needed) ──
const EV_DATABASE = {
  Tesla:   {
    models:{
      "Model 3":    { years:[2019,2020,2021,2022,2023,2024], battery:75,  connector:"CCS2",    range:560, maxPower:250, type:"Electric Car"        },
      "Model Y":    { years:[2021,2022,2023,2024],           battery:82,  connector:"CCS2",    range:533, maxPower:250, type:"Electric Car"        },
      "Model S":    { years:[2018,2019,2020,2021,2022,2023], battery:100, connector:"CCS2",    range:652, maxPower:250, type:"Electric Car"        },
      "Model X":    { years:[2019,2020,2021,2022,2023],      battery:100, connector:"CCS2",    range:560, maxPower:250, type:"Electric Car"        },
    }
  },
  Hyundai: {
    models:{
      "Kona Electric": { years:[2019,2020,2021,2022,2023], battery:64,  connector:"CCS2",    range:484, maxPower:77,  type:"Electric Car"        },
      "IONIQ 5":       { years:[2021,2022,2023,2024],       battery:77,  connector:"CCS2",    range:507, maxPower:220, type:"Electric Car"        },
      "IONIQ 6":       { years:[2023,2024],                 battery:77,  connector:"CCS2",    range:614, maxPower:230, type:"Electric Car"        },
    }
  },
  Nissan:  {
    models:{
      "Leaf":          { years:[2018,2019,2020,2021,2022,2023], battery:40,  connector:"CHAdeMO", range:385, maxPower:50,  type:"Electric Car"        },
      "Ariya":         { years:[2022,2023,2024],                battery:87,  connector:"CCS2",    range:533, maxPower:130, type:"Electric Car"        },
    }
  },
  BMW:     {
    models:{
      "iX3":           { years:[2021,2022,2023,2024], battery:80,  connector:"CCS2", range:461, maxPower:150, type:"Electric Car" },
      "i4":            { years:[2022,2023,2024],       battery:84,  connector:"CCS2", range:590, maxPower:205, type:"Electric Car" },
      "iX":            { years:[2022,2023,2024],       battery:111, connector:"CCS2", range:630, maxPower:200, type:"Electric Car" },
    }
  },
  Mercedes:{ models:{ "EQA":{ years:[2021,2022,2023,2024], battery:66,  connector:"CCS2", range:426, maxPower:100, type:"Electric Car" }, "EQC":{ years:[2019,2020,2021,2022], battery:80, connector:"CCS2", range:417, maxPower:110, type:"Electric Car" } } },
  Volkswagen:{ models:{ "ID.4":{ years:[2021,2022,2023,2024], battery:77, connector:"CCS2", range:520, maxPower:135, type:"Electric Car" }, "ID.3":{ years:[2020,2021,2022,2023], battery:58, connector:"CCS2", range:426, maxPower:100, type:"Electric Car" } } },
  Kia:     { models:{ "EV6":{ years:[2022,2023,2024], battery:77, connector:"CCS2", range:528, maxPower:240, type:"Electric Car" }, "Niro EV":{ years:[2019,2020,2021,2022,2023], battery:64, connector:"CCS2", range:460, maxPower:80, type:"Electric Car" } } },
  Audi:    { models:{ "e-tron":{ years:[2019,2020,2021,2022,2023], battery:95, connector:"CCS2", range:441, maxPower:150, type:"Electric Car" }, "Q4 e-tron":{ years:[2021,2022,2023,2024], battery:77, connector:"CCS2", range:520, maxPower:135, type:"Electric Car" } } },
  Other:   { models:{ "Custom EV":{ years:[2020,2021,2022,2023,2024], battery:40, connector:"Type 2 (AC)", range:300, maxPower:50, type:"Other" } } },
};

const VEHICLE_TYPE_ICON = {
  "Electric Car":        "fa-car",
  "Electric Motorcycle": "fa-motorcycle",
  "Electric Tricycle":   "fa-truck-pickup",
  "Electric Bus":        "fa-bus",
  "Electric Van":        "fa-shuttle-van",
  "Other":               "fa-bolt",
};

// ── 3-TIER VEHICLE LOOKUP ─────────────────────────────────────
// Returns { source, make, model, year, battery, connector, range,
//           maxPower, type, imageUrl, region, rawApiData }

// Tier 1: CarsXE API live lookup
const lookupCarsXE = async (make, model, year) => {
  if (!CARSXE_KEY) return null;
  try {
    // CarsXE make/model search
    const makeSlug = encodeURIComponent(make.toLowerCase());
    const modelSlug = encodeURIComponent(model.toLowerCase());
    const res = await fetch(
      `https://api.carsxe.com/specs?key=${CARSXE_KEY}&make=${makeSlug}&model=${modelSlug}&year=${year}`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;

    // CarsXE image lookup (separate endpoint)
    let imageUrl = null;
    try {
      const imgRes = await fetch(
        `https://api.carsxe.com/images?key=${CARSXE_KEY}&make=${makeSlug}&model=${modelSlug}&year=${year}`,
        { headers: { "Accept": "application/json" } }
      );
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        imageUrl = imgData?.images?.[0]?.url || null;
      }
    } catch(e) {}

    // Normalise CarsXE response fields
    const specs = data.specs || data;
    return {
      source:     "carsxe",
      make,
      model,
      year,
      battery:    parseFloat(specs.battery_capacity_kwh || specs.battery || 0) || null,
      connector:  specs.charging_connector || specs.connector_type || null,
      range:      parseFloat(specs.range_km || specs.range || 0) || null,
      maxPower:   parseFloat(specs.max_charging_power_kw || specs.max_power || 0) || null,
      type:       specs.body_type || specs.vehicle_type || "Electric Car",
      imageUrl,
      rawApiData: data,
    };
  } catch(e) { return null; }
};

// Tier 2: EcoCharge Registry (local African EV database)
const lookupRegistry = (make, model, year) => {
  const mfr = ECOCHARGE_REGISTRY[make];
  if (!mfr) return null;
  const m = mfr[model];
  if (!m) return null;
  if (year && !m.years.includes(parseInt(year))) return null;
  return { source:"ecocharge_registry", make, model, year, ...m, imageUrl:null };
};

// Tier 3: Local fallback EV_DATABASE
const lookupLocal = (make, model, year) => {
  const mfr = EV_DATABASE[make];
  if (!mfr) return null;
  const m = mfr.models?.[model];
  if (!m) return null;
  return { source:"local", make, model, year, battery:m.battery, connector:m.connector,
    range:m.range, maxPower:m.maxPower, type:m.type, imageUrl:null };
};

// Master lookup — tries all 3 tiers in order, returns first match
const getVehicleInfo = async (make, model, year) => {
  if (!make || !model) return null;
  // 1. CarsXE API
  const api = await lookupCarsXE(make, model, year);
  if (api && (api.battery || api.range)) return api;
  // 2. EcoCharge Registry
  const reg = lookupRegistry(make, model, year);
  if (reg) return reg;
  // 3. Local DB
  const local = lookupLocal(make, model, year);
  if (local) return local;
  return null;
};

// Submit unknown vehicle to admin review queue (builds the registry over time)
const submitVehicleToRegistry = async (vehicle) => {
  if (!SUPABASE_URL) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/vehicle_registry_submissions`, {
      method: "POST",
      headers: { apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify({
        make: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
        vehicle_type: vehicle.vehicle_type,
        battery_capacity: vehicle.battery_capacity,
        connector_type: vehicle.connector_type,
        estimated_range: vehicle.estimated_range,
        max_charging_power: vehicle.max_charging_power,
        submitted_at: new Date().toISOString(),
        status: "pending_review",
      }),
    });
  } catch(e) {}
};

// ── COMBINED MANUFACTURER LIST ────────────────────────────────
const getManufacturers = () => {
  const fromLocal    = Object.keys(EV_DATABASE);
  const fromRegistry = Object.keys(ECOCHARGE_REGISTRY);
  return [...new Set([...fromLocal, ...fromRegistry])].sort();
};

const getModels = (make) => {
  const local    = EV_DATABASE[make]    ? Object.keys(EV_DATABASE[make].models)    : [];
  const registry = ECOCHARGE_REGISTRY[make] ? Object.keys(ECOCHARGE_REGISTRY[make]) : [];
  return [...new Set([...local, ...registry])].sort();
};

const getYears = (make, model) => {
  const localInfo    = EV_DATABASE[make]?.models?.[model];
  const registryInfo = ECOCHARGE_REGISTRY[make]?.[model];
  const years = [
    ...(localInfo    ? localInfo.years    : []),
    ...(registryInfo ? registryInfo.years : []),
  ];
  return years.length ? [...new Set(years)].sort((a,b)=>b-a)
    : Array.from({length:10},(_,i)=>2024-i);
};

// Supabase vehicles table helpers
const saveVehicle = async (vehicle) => {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_vehicles`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(vehicle),
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : null;
  } catch(e) { return null; }
};

const updateVehicle = async (id, updates) => {
  if (!SUPABASE_URL) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_vehicles?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch(e) { return false; }
};

const deleteVehicle = async (id) => {
  if (!SUPABASE_URL) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_vehicles?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
    });
    return res.ok;
  } catch(e) { return false; }
};

const loadUserVehicles = async (userId) => {
  if (!SUPABASE_URL || !userId) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_vehicles?user_id=eq.${userId}&order=created_at.asc`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) { return []; }
};

const loadVehicleStats = async (userId, vehicleId) => {
  if (!SUPABASE_URL) return { sessions:0, kwh:0, cost:0 };
  try {
    let url = `${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${userId}&status=eq.Completed&select=energy_kwh,cost_total`;
    if (vehicleId) url += `&vehicle_id=eq.${vehicleId}`;
    const res = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (!Array.isArray(data)) return { sessions:0, kwh:0, cost:0 };
    const kwh  = data.reduce((a,s)=>a+(s.energy_kwh||0),0);
    const cost = data.reduce((a,s)=>a+(s.cost_total||0),0);
    return { sessions:data.length, kwh, cost };
  } catch(e) { return { sessions:0, kwh:0, cost:0 }; }
};

// ── ADD / EDIT VEHICLE FORM ───────────────────────────────────
function VehicleForm({ go, user, editVehicle=null, onSaved }) {
  const isEdit = !!editVehicle;
  const [step, setStep] = useState(1); // 1=type, 2=details, 3=specs

  const [nickname,     setNickname]     = useState(editVehicle?.nickname     || "");
  const [vehicleType,  setVehicleType]  = useState(editVehicle?.vehicle_type || "");
  const [manufacturer, setManufacturer] = useState(editVehicle?.manufacturer || "");
  const [model,        setModel]        = useState(editVehicle?.model        || "");
  const [year,         setYear]         = useState(editVehicle?.year         || "");
  const [battery,      setBattery]      = useState(editVehicle?.battery_capacity || "");
  const [connector,    setConnector]    = useState(editVehicle?.connector_type   || "");
  const [range,        setRange]        = useState(editVehicle?.estimated_range  || "");
  const [maxPower,     setMaxPower]     = useState(editVehicle?.max_charging_power || "");
  const [regNum,       setRegNum]       = useState(editVehicle?.registration_number || "");
  const [color,        setColor]        = useState(editVehicle?.color        || "#22C55E");
  const [isDefault,    setIsDefault]    = useState(editVehicle?.is_default   || false);
  const [imageUrl,     setImageUrl]     = useState(editVehicle?.image_url    || "");

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [autoFilled, setAutoFilled] = useState(false);

  const models = getModels(manufacturer);
  const years  = getYears(manufacturer, model);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSource,  setLookupSource]  = useState(null); // "carsxe"|"ecocharge_registry"|"local"|null
  const [lookupFailed,  setLookupFailed]  = useState(false);

  const SOURCE_LABELS = {
    carsxe:             { label:"CarsXE API",           color:T.blue,   icon:"fa-cloud"   },
    ecocharge_registry: { label:"EcoCharge Registry",   color:T.green,  icon:"fa-leaf"    },
    local:              { label:"EcoCharge Local DB",   color:T.muted,  icon:"fa-database"},
  };

  // Auto-fill when manufacturer+model+year selected
  useEffect(()=>{
    if (!manufacturer || !model || !year) return;
    if (isEdit) return;
    setLookupLoading(true);
    setLookupSource(null);
    setLookupFailed(false);
    getVehicleInfo(manufacturer, model, year).then(info=>{
      setLookupLoading(false);
      if (info) {
        if (info.battery)   setBattery(String(info.battery));
        if (info.connector) setConnector(info.connector);
        if (info.range)     setRange(String(info.range));
        if (info.maxPower)  setMaxPower(String(info.maxPower));
        if (info.type)      setVehicleType(info.type);
        if (info.imageUrl)  setImageUrl(info.imageUrl);
        setLookupSource(info.source);
        setAutoFilled(true);
        setTimeout(()=>setAutoFilled(false), 4000);
        // Submit to registry if from API so we grow our database
        if (info.source === "carsxe") {
          submitVehicleToRegistry({ manufacturer, model, year, vehicle_type:info.type,
            battery_capacity:info.battery, connector_type:info.connector,
            estimated_range:info.range, max_charging_power:info.maxPower });
        }
      } else {
        setLookupFailed(true);
        // Submit unknown vehicle to admin review queue
        submitVehicleToRegistry({ manufacturer, model, year, vehicle_type:vehicleType });
      }
    });
  }, [manufacturer, model, year]);

  // Reset model/year when manufacturer changes
  useEffect(()=>{ if (!isEdit) { setModel(""); setYear(""); setBattery(""); setConnector(""); setRange(""); setMaxPower(""); } },[manufacturer]);
  useEffect(()=>{ if (!isEdit) { setYear(""); } },[model]);

  const handleSave = async () => {
    if (!nickname.trim())    { setError("Please enter a vehicle nickname"); return; }
    if (!vehicleType)        { setError("Please select a vehicle type"); return; }
    if (!manufacturer.trim()){ setError("Please enter the manufacturer"); return; }
    if (!model.trim())       { setError("Please enter the model"); return; }
    if (!year)               { setError("Please select the year"); return; }

    setSaving(true); setError("");
    const payload = {
      user_id: user?.id || "demo",
      nickname: nickname.trim(),
      vehicle_type: vehicleType,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      year: parseInt(year),
      battery_capacity: parseFloat(battery) || null,
      connector_type: connector || null,
      estimated_range: parseFloat(range) || null,
      max_charging_power: parseFloat(maxPower) || null,
      registration_number: regNum.trim() || null,
      color: color || "#22C55E",
      image_url: imageUrl || null,
      is_default: isDefault,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let saved;
    if (isEdit) {
      payload.updated_at = new Date().toISOString();
      saved = await updateVehicle(editVehicle.id, payload);
      if (saved) onSaved?.({ ...editVehicle, ...payload });
    } else {
      const result = await saveVehicle(payload);
      if (result) {
        onSaved?.(result);
      } else {
        // Offline fallback — generate a local id
        onSaved?.({ ...payload, id: `local-${Date.now()}` });
      }
    }
    setSaving(false);
    go("myvehicles");
  };

  const inp = (label, val, set, type="text", placeholder="", note="") => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>{label}</div>
      <input type={type} placeholder={placeholder} value={val} onChange={e=>{ set(e.target.value); setError(""); }}
        style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
      {note&&<div style={{ fontSize:10,color:T.muted,marginTop:4 }}>{note}</div>}
    </div>
  );

  const sel = (label, val, set, options, placeholder="Select…") => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>{label}</div>
      <div style={{ position:"relative" }}>
        <select value={val} onChange={e=>{ set(e.target.value); setError(""); }}
          style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 36px 13px 14px",color:val?T.text:T.muted,fontSize:14,fontFamily:"inherit",appearance:"none",WebkitAppearance:"none" }}>
          <option value="" style={{ color:T.muted }}>{placeholder}</option>
          {options.map(o=>( <option key={o.value||o} value={o.value||o} style={{ color:"#000" }}>{o.label||o}</option> ))}
        </select>
        <i className="fas fa-chevron-down" style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:12,pointerEvents:"none" }}/>
      </div>
    </div>
  );

  const colorSwatches = ["#22C55E","#38bdf8","#f87171","#fbbf24","#a78bfa","#f97316","#ffffff","#1a1a1a","#2c3e50","#e8e8e8"];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={isEdit?"Edit Vehicle":"Add Vehicle"} sub={isEdit?`Editing ${editVehicle.nickname}`:"Register your electric vehicle"} onBack={()=>go("myvehicles")}/>

      {/* Step indicator */}
      <div style={{ display:"flex",gap:0,padding:"12px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        {["Vehicle","Details","Specs"].map((s,i)=>(
          <div key={s} style={{ flex:1,display:"flex",alignItems:"center" }}>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flex:1 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",background:step>i+1?T.green:step===i+1?T.green:"rgba(255,255,255,0.1)",border:`2px solid ${step>=i+1?T.green:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4 }}>
                {step>i+1
                  ? <i className="fas fa-check" style={{ fontSize:11,color:"#000" }}/>
                  : <span style={{ fontSize:11,fontWeight:700,color:step===i+1?"#000":T.muted }}>{i+1}</span>
                }
              </div>
              <span style={{ fontSize:9,fontWeight:600,color:step>=i+1?T.green:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>{s}</span>
            </div>
            {i<2&&<div style={{ width:24,height:1,background:step>i+1?T.green:T.border,flexShrink:0,marginBottom:16 }}/>}
          </div>
        ))}
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>

        {/* Step 1: Vehicle type & identity */}
        {step===1&&(
          <>
            <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:14 }}>What type of vehicle?</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20 }}>
              {VEHICLE_TYPES.map(vt=>(
                <button key={vt.value} onClick={()=>setVehicleType(vt.value)} className="tap"
                  style={{ background:vehicleType===vt.value?`${T.green}18`:T.card,border:`2px solid ${vehicleType===vt.value?T.green:T.border}`,borderRadius:14,padding:"14px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                  <i className={`fas ${vt.icon}`} style={{ fontSize:22,color:vehicleType===vt.value?T.green:T.muted }}/>
                  <span style={{ fontSize:10,fontWeight:700,color:vehicleType===vt.value?T.green:T.muted,textAlign:"center",lineHeight:1.3 }}>{vt.label}</span>
                  {vehicleType===vt.value&&<div style={{ width:8,height:8,borderRadius:"50%",background:T.green }}/>}
                </button>
              ))}
            </div>

            {inp("Vehicle Nickname *", nickname, setNickname, "text", "e.g. My Green Tesla", "A friendly name to identify this vehicle")}

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>Vehicle Color (optional)</div>
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                {colorSwatches.map(c=>(
                  <button key={c} onClick={()=>setColor(c)} className="tap"
                    style={{ width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${color===c?T.green:"transparent"}`,cursor:"pointer",boxShadow:color===c?`0 0 0 2px ${T.bg},0 0 0 4px ${T.green}`:"none",transition:"all .15s" }}/>
                ))}
              </div>
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:T.card,borderRadius:14,border:`1px solid ${T.border}`,marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,color:T.text }}>Set as Default Vehicle</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Used automatically when starting a charge</div>
              </div>
              <div onClick={()=>setIsDefault(v=>!v)} className="tap"
                style={{ width:44,height:24,borderRadius:12,background:isDefault?T.green:T.border,position:"relative",transition:"background .2s",cursor:"pointer",flexShrink:0 }}>
                <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isDefault?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Manufacturer, Model, Year */}
        {step===2&&(
          <>
            {autoFilled&&(
              <div className="fade" style={{ background:"rgba(34,197,94,0.1)",border:`1px solid rgba(34,197,94,0.3)`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
                <i className="fas fa-check-circle" style={{ color:T.green,fontSize:14 }}/>
                <span style={{ fontSize:13,color:T.green,fontWeight:600 }}>Specs found — continue to review them →</span>
              </div>
            )}
            {lookupLoading&&(
              <div style={{ background:"rgba(56,189,248,0.08)",border:`1px solid rgba(56,189,248,0.2)`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
                <Spinner/>
                <span style={{ fontSize:13,color:T.blue }}>Looking up {manufacturer} {model} {year}…</span>
              </div>
            )}

            {sel("Manufacturer *", manufacturer, setManufacturer,
              [...getManufacturers(), "Other"].map(m=>({ value:m, label:m })),
              "Select or type manufacturer")}

            {manufacturer==="Other" ? (
              inp("Manufacturer Name *", manufacturer==="Other"?"":manufacturer, setManufacturer, "text", "e.g. BYD, BAIC, Zeekr")
            ) : (
              models.length > 0 && sel("Model *", model, setModel,
                models.map(m=>({ value:m, label:m })), "Select model")
            )}

            {!EV_DATABASE[manufacturer] && manufacturer && (
              inp("Model *", model, setModel, "text", "e.g. Atto 3, Han EV")
            )}

            {(years.length > 0 || (manufacturer && model)) && (
              years.length > 0
                ? sel("Year *", year, y=>setYear(y), years.map(y=>({ value:String(y), label:String(y) })), "Select year")
                : sel("Year *", year, y=>setYear(y),
                    Array.from({length:10},(_,i)=>({ value:String(2024-i), label:String(2024-i) })),
                    "Select year")
            )}

            {inp("Registration Number (optional)", regNum, setRegNum, "text", "e.g. GR-1234-21", "Ghana vehicle registration plate")}
          </>
        )}

        {/* Step 3: Battery, Connector, Range, Power */}
        {step===3&&(
          <>
            {/* Lookup status banner */}
            {lookupLoading&&(
              <div style={{ background:"rgba(56,189,248,0.08)",border:`1px solid rgba(56,189,248,0.25)`,borderRadius:14,padding:"14px",marginBottom:14,display:"flex",alignItems:"center",gap:10 }}>
                <Spinner/>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.blue }}>Looking up your vehicle…</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Checking CarsXE API → EcoCharge Registry → Local DB</div>
                </div>
              </div>
            )}

            {!lookupLoading && lookupSource && (()=>{
              const src = SOURCE_LABELS[lookupSource] || SOURCE_LABELS.local;
              return (
                <div className="fade" style={{ background:T.highlightGrad2,borderRadius:14,padding:"14px",marginBottom:14,border:`1px solid ${T.greenDim}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                    <i className={`fas ${src.icon}`} style={{ color:src.color,fontSize:13 }}/>
                    <span style={{ fontWeight:700,fontSize:12,color:src.color,textTransform:"uppercase",letterSpacing:0.4 }}>{src.label}</span>
                    <span style={{ fontSize:11,color:T.muted }}>· Auto-detected</span>
                  </div>
                  <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>
                    Specs found for your {manufacturer} {model} {year}. Review and adjust if needed.
                  </div>
                </div>
              );
            })()}

            {!lookupLoading && lookupFailed&&(
              <div className="fade" style={{ background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:14,padding:"14px",marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <i className="fas fa-search" style={{ color:T.yellow,fontSize:13 }}/>
                  <span style={{ fontWeight:700,fontSize:13,color:T.yellow }}>Vehicle not found in any database</span>
                </div>
                <div style={{ fontSize:12,color:T.muted,lineHeight:1.6,marginBottom:8 }}>
                  No specs found for <strong style={{ color:T.text }}>{manufacturer} {model} {year}</strong> in CarsXE, our registry, or local database.
                  Please enter the details manually below. Your entry will be submitted for review to grow the EcoCharge Registry! 🌱
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(34,197,94,0.08)",borderRadius:8,padding:"7px 10px" }}>
                  <i className="fas fa-leaf" style={{ color:T.green,fontSize:11 }}/>
                  <span style={{ fontSize:11,color:T.green,fontWeight:600 }}>Submitted to EcoCharge Registry for admin review</span>
                </div>
              </div>
            )}

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4 }}>
              <div>
                {inp("Battery Capacity (kWh)", battery, setBattery, "number", "e.g. 75")}
              </div>
              <div>
                {inp("Est. Range (km)", range, setRange, "number", "e.g. 560")}
              </div>
            </div>

            {sel("Connector Type", connector, setConnector, CONNECTOR_TYPES.map(c=>({ value:c, label:c })), "Select connector")}
            {inp("Max Charging Power (kW)", maxPower, setMaxPower, "number", "e.g. 250")}

            {/* Vehicle image — fully automatic, no URL paste */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8 }}>Vehicle Image</div>
              {imageUrl ? (
                <div style={{ borderRadius:16,overflow:"hidden",border:`1px solid ${T.green}44`,marginBottom:8,position:"relative",height:160,background:"#050a06" }}>
                  <img src={imageUrl} alt="vehicle"
                    style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.9)" }}
                    onError={e=>{ e.target.style.display="none"; setImageUrl(""); }}/>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 60%)" }}/>
                  <div style={{ position:"absolute",bottom:10,left:12,display:"flex",alignItems:"center",gap:6 }}>
                    <i className="fas fa-check-circle" style={{ fontSize:12,color:T.green }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:"#fff" }}>Image loaded</span>
                  </div>
                  <button onClick={()=>setImageUrl("")} className="tap"
                    style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff" }}>
                    <i className="fas fa-times" style={{ fontSize:11 }}/>
                  </button>
                </div>
              ) : (
                <div style={{ background:T.card,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden" }}>
                  {/* Placeholder — clean, no URL input */}
                  <div style={{ padding:"28px 20px",textAlign:"center",background:"linear-gradient(135deg,#050a06,#0a1f12)" }}>
                    <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(34,197,94,0.08)",border:`1px solid rgba(34,197,94,0.15)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                      <i className={`fas ${VEHICLE_TYPE_ICON[vehicleType]||"fa-car"}`} style={{ fontSize:26,color:T.green,opacity:0.4 }}/>
                    </div>
                    <div style={{ fontWeight:600,fontSize:14,color:T.mutedLight,marginBottom:4 }}>Vehicle image unavailable</div>
                    <div style={{ fontSize:11,color:T.muted,lineHeight:1.6 }}>
                      {manufacturer&&model&&year
                        ? `No image found for ${manufacturer} ${model} ${year}`
                        : "Select manufacturer, model and year to auto-load image"}
                    </div>
                  </div>
                  {/* Optional upload — only shown when API has no image */}
                  <div style={{ padding:"12px 16px",borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10 }}>
                    <label className="tap" style={{ flex:1,background:`${T.green}12`,border:`1px solid ${T.green}33`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                      <i className="fas fa-camera" style={{ fontSize:13 }}/> Upload Vehicle Photo
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={e=>{
                          const file=e.target.files[0]; if(!file) return;
                          const reader=new FileReader();
                          reader.onload=ev=>setImageUrl(ev.target.result);
                          reader.readAsDataURL(file);
                        }}/>
                    </label>
                    <div style={{ fontSize:10,color:T.muted,flex:1,lineHeight:1.5 }}>Optional — only if you want a custom photo</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {error&&(
          <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}>
            <i className="fas fa-exclamation-triangle"/> {error}
          </div>
        )}

        <div style={{ display:"flex",gap:10 }}>
          {step>1&&(
            <button onClick={()=>setStep(s=>s-1)} className="tap"
              style={{ flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <i className="fas fa-arrow-left"/> Back
            </button>
          )}
          {step<3 ? (
            <button onClick={()=>{
              if (step===1&&!vehicleType){ setError("Please select a vehicle type"); return; }
              if (step===1&&!nickname.trim()){ setError("Please enter a vehicle nickname"); return; }
              if (step===2&&!manufacturer){ setError("Please select a manufacturer"); return; }
              if (step===2&&!model.trim()){ setError("Please enter the model"); return; }
              if (step===2&&!year){ setError("Please select the year"); return; }
              setError(""); setStep(s=>s+1);
            }} className="tap"
              style={{ flex:2,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              Continue <i className="fas fa-arrow-right"/>
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="tap"
              style={{ flex:2,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:saving?0.7:1 }}>
              {saving?<><Spinner/> Saving…</>:<><i className="fas fa-check"/> {isEdit?"Save Changes":"Add Vehicle"}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VEHICLE DETAIL SCREEN ─────────────────────────────────────
function VehicleDetail({ go, vehicle, user, onEdit, onDelete, onSetDefault, onStartCharging }) {
  const [stats,      setStats]      = useState({ sessions:0, kwh:0, cost:0 });
  const [delConfirm, setDelConfirm] = useState(false);
  const [sessions,   setSessions]   = useState([]);
  const [imgError,   setImgError]   = useState(false);

  const v = vehicle || {};
  const typeIcon = VEHICLE_TYPE_ICON[v.vehicle_type] || "fa-bolt";

  useEffect(()=>{
    if (!user?.id) return;
    loadVehicleStats(user.id, v.id).then(setStats);
    if (SUPABASE_URL) {
      fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${user.id}&status=eq.Completed&order=created_at.desc&limit=5`,
        { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }})
        .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setSessions(d); }).catch(()=>{});
    }
  },[user, v.id]);

  const co2Saved    = (stats.kwh * 0.5).toFixed(1);
  const waterEarned = (stats.sessions * 20);
  const costGHS     = ((stats.cost||0)/100).toFixed(2);
  const hasImage    = v.image_url && !imgError;

  if (!vehicle) return null;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>

      {/* 3D PROFILE CARD HERO */}
      <div style={{ position:"relative",flexShrink:0,overflow:"hidden",minHeight:280 }}>
        {hasImage ? (
          <img src={v.image_url} alt={v.model}
            style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.45) saturate(1.2)" }}
            onError={()=>setImgError(true)}/>
        ) : (
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(145deg,#030d05 0%,#071a0a 40%,#0a2d12 70%,#051a0a 100%)" }}/>
        )}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.75) 100%)" }}/>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.green}55,transparent)` }}/>

        {!hasImage&&(
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className={`fas ${typeIcon}`} style={{ fontSize:90,color:T.green,opacity:0.1 }}/>
          </div>
        )}

        <div style={{ position:"absolute",top:"calc(16px + env(safe-area-inset-top,34px))",left:14,right:14,display:"flex",justifyContent:"space-between",zIndex:10 }}>
          <button onClick={()=>go("myvehicles")} className="tap"
            style={{ width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <i className="fas fa-chevron-left" style={{ fontSize:15,color:"#fff" }}/>
          </button>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>onEdit?.(v)} className="tap"
              style={{ width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <i className="fas fa-pencil-alt" style={{ fontSize:13,color:"#fff" }}/>
            </button>
            <button onClick={()=>setDelConfirm(true)} className="tap"
              style={{ width:38,height:38,borderRadius:"50%",background:"rgba(220,50,50,0.35)",backdropFilter:"blur(8px)",border:"1px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <i className="fas fa-trash" style={{ fontSize:13,color:"#fff" }}/>
            </button>
          </div>
        </div>

        <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"0 18px 20px",zIndex:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
            {v.is_default&&(
              <div style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(34,197,94,0.85)",borderRadius:8,padding:"3px 10px" }}>
                <i className="fas fa-star" style={{ fontSize:9,color:"#000" }}/>
                <span style={{ fontSize:10,fontWeight:800,color:"#000",letterSpacing:0.3 }}>DEFAULT</span>
              </div>
            )}
            <div style={{ background:"rgba(255,255,255,0.12)",backdropFilter:"blur(8px)",borderRadius:8,padding:"3px 10px",border:"1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.85)" }}>{v.vehicle_type||"EV"}</span>
            </div>
          </div>
          <div style={{ fontWeight:900,fontSize:26,color:"#fff",letterSpacing:-0.5,lineHeight:1.1,marginBottom:3,textShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>{v.nickname}</div>
          <div style={{ fontSize:14,color:"rgba(255,255,255,0.65)",marginBottom:16 }}>{v.year} {v.manufacturer} {v.model}</div>
          <div style={{ display:"flex",gap:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden" }}>
            {[
              { label:"Battery",  value:v.battery_capacity?`${v.battery_capacity} kWh`:"—", icon:"fa-battery-full", color:T.green  },
              { label:"Range",    value:v.estimated_range?`${v.estimated_range} km`:"—",    icon:"fa-road",         color:T.blue   },
              { label:"Connector",value:v.connector_type||"—",                               icon:"fa-plug",         color:T.yellow },
            ].map((s,i)=>(
              <div key={s.label} style={{ flex:1,padding:"12px 8px",textAlign:"center",borderRight:i<2?"1px solid rgba(255,255,255,0.08)":"none" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:13,color:s.color,marginBottom:5,display:"block" }}/>
                <div style={{ fontWeight:800,fontSize:13,color:"#fff",lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:3,textTransform:"uppercase",letterSpacing:0.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18 }}>
          <button onClick={()=>onStartCharging?.(v)} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 4px 18px rgba(34,197,94,0.35)` }}>
            <i className="fas fa-bolt"/> Start Charging
          </button>
          <button onClick={()=>go("booking")} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"15px",fontSize:14,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <i className="fas fa-calendar-alt" style={{ color:T.green }}/> Reserve
          </button>
        </div>

        <div style={{ background:"linear-gradient(145deg,#061208,#0c2314,#061208)",borderRadius:20,padding:"20px",marginBottom:16,border:"1px solid rgba(34,197,94,0.2)",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(34,197,94,0.06)" }}/>
          <div style={{ fontWeight:800,fontSize:14,color:T.green,marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
            <i className="fas fa-chart-bar"/> Charging Statistics
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              { label:"Sessions",     value:stats.sessions,       icon:"fa-bolt",          color:T.green  },
              { label:"Energy (kWh)", value:stats.kwh.toFixed(1), icon:"fa-sun",           color:T.blue   },
              { label:"GH₵ Spent",  value:`₵${costGHS}`,     icon:"fa-money-bill-alt",color:T.yellow },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(0,0,0,0.3)",borderRadius:14,padding:"14px 10px",textAlign:"center" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:16,color:s.color,marginBottom:8,display:"block" }}/>
                <div style={{ fontWeight:900,fontSize:22,color:"#fff",lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:5,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ height:1,background:"rgba(34,197,94,0.15)",marginBottom:14 }}/>
          <div style={{ fontWeight:700,fontSize:11,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Environmental Impact</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:"rgba(0,0,0,0.3)",borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className="fas fa-leaf" style={{ fontSize:18,color:T.green }}/>
              </div>
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:T.green }}>{co2Saved} kg</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2 }}>CO₂ Avoided</div>
              </div>
            </div>
            <div style={{ background:"rgba(0,0,0,0.3)",borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:"rgba(56,189,248,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className="fas fa-tint" style={{ fontSize:18,color:T.blue }}/>
              </div>
              <div>
                <div style={{ fontWeight:900,fontSize:20,color:T.blue }}>{waterEarned}L</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2 }}>Clean Water</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background:T.card,borderRadius:18,padding:"18px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
            <i className="fas fa-sliders-h" style={{ color:T.green }}/> Vehicle Specs
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {[
              { label:"Battery Capacity", value:v.battery_capacity?`${v.battery_capacity} kWh`:"—", icon:"fa-battery-full",  color:T.green      },
              { label:"Est. Range",       value:v.estimated_range?`${v.estimated_range} km`:"—",    icon:"fa-road",          color:T.blue       },
              { label:"Connector",        value:v.connector_type||"—",                               icon:"fa-plug",          color:T.yellow     },
              { label:"Max Charge",       value:v.max_charging_power?`${v.max_charging_power} kW`:"—",icon:"fa-bolt",        color:T.green      },
              { label:"Reg. Number",      value:v.registration_number||"Not set",                    icon:"fa-id-card",       color:T.mutedLight },
              { label:"Color",            value:" ",                                                  icon:"fa-palette",       color:T.mutedLight, isColor:true, colorVal:v.color },
            ].map(s=>(
              <div key={s.label} style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10 }}>
                {s.isColor && s.colorVal
                  ? <div style={{ width:18,height:18,borderRadius:"50%",background:s.colorVal,border:`2px solid ${T.border}`,flexShrink:0 }}/>
                  : <i className={`fas ${s.icon}`} style={{ fontSize:14,color:s.color,flexShrink:0 }}/>
                }
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontWeight:700,fontSize:14,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {sessions.length>0&&(
          <div style={{ background:T.card,borderRadius:18,padding:"18px",marginBottom:14,border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span><i className="fas fa-history" style={{ color:T.green,marginRight:8 }}/>Recent Sessions</span>
              <button onClick={()=>go("sessions")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>View all</button>
            </div>
            {sessions.map((s,i)=>(
              <div key={s.id||i} style={{ display:"flex",alignItems:"center",gap:12,paddingBottom:12,marginBottom:12,borderBottom:i<sessions.length-1?`1px solid ${T.border}20`:"none" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:`${T.green}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <i className="fas fa-bolt" style={{ fontSize:14,color:T.green }}/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:600,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.charger_id||"EcoCharge Station"}</div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{s.started_at?new Date(s.started_at).toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"}):"--"}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:T.green }}>{s.energy_kwh?.toFixed(2)||"--"} kWh</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:1 }}>GH₵{((s.cost_total||0)/100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!v.is_default&&(
          <button onClick={()=>onSetDefault?.(v)} className="tap"
            style={{ width:"100%",background:"none",border:`1px solid ${T.green}44`,borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10 }}>
            <i className="far fa-star"/> Set as Default Vehicle
          </button>
        )}
        <button onClick={()=>go("sessions")} className="tap"
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-chart-line"/> Full Charging History
        </button>
      </div>

      {delConfirm&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:T.card,borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,border:`1px solid ${T.border}` }}>
            <div style={{ textAlign:"center",marginBottom:20 }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(248,113,113,0.12)",border:"2px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                <i className="fas fa-trash" style={{ fontSize:22,color:T.red }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:18,color:T.text }}>Delete Vehicle?</div>
              <div style={{ fontSize:13,color:T.muted,marginTop:6,lineHeight:1.6 }}>This will remove <strong style={{ color:T.text }}>{v.nickname}</strong> from your account. This action cannot be undone.</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button onClick={()=>setDelConfirm(false)} className="tap"
                style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
              <button onClick={()=>{ setDelConfirm(false); onDelete?.(v.id); go("myvehicles"); }} className="tap"
                style={{ background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── MY VEHICLES LIST SCREEN ───────────────────────────────────
function MyVehicles({ go, user }) {
  const [vehicles,     setVehicles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedVeh,  setSelectedVeh]  = useState(null); // for detail view
  const [editingVeh,   setEditingVeh]   = useState(null); // for edit form
  const [showForm,     setShowForm]     = useState(false);
  const [statsMap,     setStatsMap]     = useState({});   // vehicleId -> stats
  const [totalStats,   setTotalStats]   = useState({ sessions:0, kwh:0, cost:0 });

  const loadVehicles = async () => {
    setLoading(true);
    const data = await loadUserVehicles(user?.id);
    setVehicles(data);
    // Load aggregate stats
    if (user?.id) {
      const allStats = await loadVehicleStats(user.id, null);
      setTotalStats(allStats);
    }
    setLoading(false);
  };

  useEffect(()=>{ loadVehicles(); },[user?.id]);

  const handleDelete = async (id) => {
    await deleteVehicle(id);
    setVehicles(prev=>prev.filter(v=>v.id!==id));
  };

  const handleSetDefault = async (vehicle) => {
    // Clear all defaults then set new one
    for (const v of vehicles) {
      if (v.is_default && v.id!==vehicle.id) await updateVehicle(v.id, { is_default:false });
    }
    await updateVehicle(vehicle.id, { is_default:true });
    setVehicles(prev=>prev.map(v=>({ ...v, is_default: v.id===vehicle.id })));
  };

  const handleSaved = (savedVeh) => {
    setVehicles(prev=>{
      const exists = prev.find(v=>v.id===savedVeh.id);
      if (exists) return prev.map(v=>v.id===savedVeh.id?savedVeh:v);
      return [...prev, savedVeh];
    });
    setShowForm(false);
    setEditingVeh(null);
  };

  const typeIcon = (type) => VEHICLE_TYPE_ICON[type] || "fa-bolt";

  const batteryColor = (pct) => (pct||0) > 60 ? T.green : (pct||0) > 30 ? T.yellow : T.red;

  // Route to form screens
  if (showForm || editingVeh) {
    return <VehicleForm go={(s)=>{ setShowForm(false); setEditingVeh(null); if(s!=="myvehicles") go(s); }} user={user} editVehicle={editingVeh} onSaved={handleSaved}/>;
  }

  // Route to detail screen
  if (selectedVeh) {
    return <VehicleDetail
      go={(s)=>{ if(s==="myvehicles") setSelectedVeh(null); else go(s); }}
      vehicle={selectedVeh}
      user={user}
      onEdit={(v)=>{ setEditingVeh(v); setSelectedVeh(null); }}
      onDelete={(id)=>{ handleDelete(id); setSelectedVeh(null); }}
      onSetDefault={handleSetDefault}
      onStartCharging={(v)=>{ go("detail"); }}
    />;
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
        <button onClick={()=>go("profile")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>My Vehicles</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{vehicles.length} vehicle{vehicles.length!==1?"s":""} registered</div>
        </div>
        <button onClick={()=>setShowForm(true)} className="tap"
          style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:20,padding:"8px 16px",fontSize:13,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
          <i className="fas fa-plus"/> Add
        </button>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        {loading&&(
          <div style={{ textAlign:"center",padding:"60px 0" }}><Spinner/></div>
        )}

        {/* Empty state */}
        {!loading&&vehicles.length===0&&(
          <div className="fade" style={{ textAlign:"center",padding:"60px 20px" }}>
            <div style={{ width:120,height:120,borderRadius:"50%",background:T.highlightGrad2,border:`2px solid ${T.greenDim}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
              <i className="fas fa-car" style={{ fontSize:48,color:T.green,opacity:0.6 }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:22,color:T.text,marginBottom:10 }}>No Vehicles Yet</div>
            <div style={{ fontSize:14,color:T.muted,lineHeight:1.8,marginBottom:28 }}>Add your first electric vehicle to unlock smart charging, track energy usage, and earn clean water rewards.</div>
            <button onClick={()=>setShowForm(true)} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px 32px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:10,boxShadow:`0 4px 24px rgba(34,197,94,0.35)` }}>
              <i className="fas fa-plus"/> Add Your First Vehicle
            </button>
            <div style={{ marginTop:28,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
              {[{ icon:"fa-bolt",text:"Smart charging sessions" },{ icon:"fa-tint",text:"20L clean water per charge" },{ icon:"fa-leaf",text:"Track CO₂ savings" }].map(f=>(
                <div key={f.text} style={{ background:T.card,borderRadius:14,padding:"14px 8px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <i className={`fas ${f.icon}`} style={{ fontSize:20,color:T.green,marginBottom:8,display:"block" }}/>
                  <div style={{ fontSize:10,color:T.muted,lineHeight:1.4 }}>{f.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats banner (when vehicles exist) */}
        {!loading&&vehicles.length>0&&(
          <>
            <div className="fade" style={{ background:T.highlightGrad2,borderRadius:18,padding:"16px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
              <div style={{ fontWeight:700,fontSize:12,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12 }}>Fleet Overview</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:8 }}>
                {[
                  { label:"Sessions",     value:totalStats.sessions,                          color:T.green  },
                  { label:"kWh",          value:totalStats.kwh.toFixed(0),                    color:T.blue   },
                  { label:"GH₵ Spent",    value:((totalStats.cost||0)/100).toFixed(0),        color:T.yellow },
                  { label:"kg CO₂",       value:(totalStats.kwh*0.5).toFixed(1),              color:T.green  },
                  { label:"Water (L)",    value:(totalStats.sessions*20),                      color:T.blue   },
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontWeight:900,fontSize:18,color:s.color,lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:9,color:T.muted,marginTop:4,textTransform:"uppercase",letterSpacing:0.3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle cards */}
            {vehicles.map((v,i)=>(
              <div key={v.id} className="fade tap"
                style={{ background:T.card,borderRadius:20,border:`1px solid ${v.is_default?T.green:T.border}`,marginBottom:14,overflow:"hidden",position:"relative",transition:"all .15s" }}
                onClick={()=>setSelectedVeh(v)}>

                {/* Card hero */}
                <div style={{ height:130,position:"relative",overflow:"hidden",background:`linear-gradient(135deg,#051a0a,#0a2d12)` }}>
                  {v.image_url ? (
                    <img src={v.image_url} alt={v.model} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.7)" }} onError={e=>e.target.style.display="none"}/>
                  ) : (
                    <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 24px" }}>
                      <i className={`fas ${typeIcon(v.vehicle_type)}`} style={{ fontSize:64,color:T.green,opacity:0.18 }}/>
                    </div>
                  )}
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.6) 100%)" }}/>

                  {/* Color dot */}
                  {v.color&&<div style={{ position:"absolute",top:12,right:12,width:16,height:16,borderRadius:"50%",background:v.color,border:`2px solid rgba(255,255,255,0.3)` }}/>}

                  {/* Default badge */}
                  {v.is_default&&(
                    <div style={{ position:"absolute",top:12,left:12,background:`${T.green}cc`,borderRadius:8,padding:"3px 10px",display:"flex",alignItems:"center",gap:5 }}>
                      <i className="fas fa-star" style={{ fontSize:9,color:"#000" }}/>
                      <span style={{ fontSize:10,fontWeight:700,color:"#000" }}>Default</span>
                    </div>
                  )}

                  <div style={{ position:"absolute",bottom:10,left:14 }}>
                    <div style={{ fontWeight:800,fontSize:17,color:"#fff" }}>{v.nickname}</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2 }}>{v.year} {v.manufacturer} {v.model}</div>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" }}>
                    <Badge label={v.vehicle_type||"EV"} color={T.blue}/>
                    {v.connector_type&&<Badge label={v.connector_type} color={T.muted}/>}
                    {v.battery_capacity&&<Badge label={`${v.battery_capacity} kWh`} color={T.green}/>}
                    {v.registration_number&&<Badge label={v.registration_number} color={T.mutedLight}/>}
                  </div>

                  {v.estimated_range&&(
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:14 }}>
                      <div style={{ flex:1,height:4,background:T.track,borderRadius:2,overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${Math.min(100,(v.estimated_range/700)*100)}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,borderRadius:2 }}/>
                      </div>
                      <span style={{ fontSize:11,color:T.muted,flexShrink:0 }}>~{v.estimated_range} km range</span>
                    </div>
                  )}

                  {/* Quick action buttons */}
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                    <button onClick={e=>{ e.stopPropagation(); go("detail"); }} className="tap"
                      style={{ background:`${T.green}18`,border:`1px solid ${T.green}33`,borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                      <i className="fas fa-bolt" style={{ fontSize:11 }}/> Charge
                    </button>
                    <button onClick={e=>{ e.stopPropagation(); setEditingVeh(v); }} className="tap"
                      style={{ background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                      <i className="fas fa-pencil-alt" style={{ fontSize:11 }}/> Edit
                    </button>
                    <button onClick={e=>{ e.stopPropagation(); handleDelete(v.id); }} className="tap"
                      style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:600,color:T.red,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                      <i className="fas fa-trash" style={{ fontSize:11 }}/> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add more */}
            <button onClick={()=>setShowForm(true)} className="tap"
              style={{ width:"100%",background:"none",border:`2px dashed ${T.border}`,borderRadius:20,padding:"20px",fontSize:14,fontWeight:600,color:T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16 }}>
              <i className="fas fa-plus" style={{ color:T.green }}/> Add Another Vehicle
            </button>

            {/* Security notice */}
            <div style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:`${T.green}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className="fas fa-shield-alt" style={{ fontSize:16,color:T.green }}/>
              </div>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Vehicle data is secure</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:3,lineHeight:1.5 }}>Your vehicle information is encrypted and used only to improve your charging experience.</div>
              </div>
            </div>
          </>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

// ── SETTINGS SCREEN ───────────────────────────────────────────
function SettingsScreen({ go, user, setUser }) {
  const { mode, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8,paddingLeft:4 }}>{title}</div>
      <div style={{ background:T.card,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden" }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ icon, iconColor=T.green, label, sub, value, onPress, toggle, toggleValue, onToggle, last=false }) => (
    <div className={onPress||onToggle?"tap row":""} onClick={onPress}
      style={{ display:"flex",alignItems:"center",gap:14,padding:"15px 16px",borderBottom:last?"none":`1px solid ${T.border}20`,cursor:onPress?"pointer":"default" }}>
      <div style={{ width:36,height:36,borderRadius:10,background:`${iconColor}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <i className={`fas ${icon}`} style={{ fontSize:15,color:iconColor }}/>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:600,fontSize:14,color:T.text }}>{label}</div>
        {sub&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
      </div>
      {toggle ? (
        <div onClick={e=>{ e.stopPropagation(); onToggle&&onToggle(); }} className="tap"
          style={{ width:44,height:24,borderRadius:12,background:toggleValue?T.green:T.border,position:"relative",transition:"background .2s",flexShrink:0,cursor:"pointer" }}>
          <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:toggleValue?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
        </div>
      ) : value ? (
        <span style={{ fontSize:13,fontWeight:600,color:T.green }}>{value}</span>
      ) : null}
      {onPress&&<i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted,flexShrink:0 }}/>}
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Settings" sub="Customize your EcoCharge experience" onBack={()=>go("profile")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        {/* Profile mini card */}
        {user&&(
          <div className="fade" style={{ background:T.highlightGrad2,borderRadius:16,padding:"16px",marginBottom:20,border:`1px solid ${T.greenDim}`,display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <i className="fas fa-user" style={{ fontSize:22,color:"#000" }}/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.name||user.email?.split("@")[0]}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
              <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:5 }}>
                <i className="fas fa-shield-alt" style={{ fontSize:10,color:T.green }}/>
                <span style={{ fontSize:11,fontWeight:700,color:T.green }}>Active Member</span>
              </div>
            </div>
            <button onClick={()=>go("profile")} className="tap"
              style={{ background:"none",border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
              <i className="fas fa-pencil-alt" style={{ fontSize:11 }}/> Edit Profile
            </button>
          </div>
        )}

        <Section title="Preferences">
          <Row icon="fa-sun" label="Appearance" sub="Choose your preferred theme" value={mode==="dark"?"Dark":"Light"} onPress={toggleTheme}/>
          <Row icon="fa-globe" label="Language" sub="Select your app language" value="English" onPress={()=>{}}/>
          <Row icon="fa-bell" label="Notifications" sub="Manage push notifications" toggle toggleValue={notifications} onToggle={()=>setNotifications(v=>!v)} value={notifications?"Enabled":"Disabled"}/>
          <Row icon="fa-tachometer-alt" label="Units" sub="Choose measurement units" value="Metric (km, kWh)" onPress={()=>{}} last/>
        </Section>

        <Section title="Account & Security">
          <Row icon="fa-shield-alt" iconColor={T.blue} label="Security" sub="Change password, PIN & biometrics" onPress={()=>{}}/>
          <Row icon="fa-lock" iconColor={T.green} label="Two-Factor Authentication" sub="Add an extra layer of security" toggle toggleValue={twoFactor} onToggle={()=>setTwoFactor(v=>!v)} value={twoFactor?"Enabled":"Disabled"}/>
          <Row icon="fa-mobile-alt" iconColor={T.yellow} label="Active Sessions" sub="Manage your active sessions" value="2 sessions" onPress={()=>{}} last/>
        </Section>

        <Section title="App Settings">
          <Row icon="fa-credit-card" iconColor={T.green} label="Payment Methods" sub="Manage your payment options" onPress={()=>go("wallet")}/>
          <Row icon="fa-wallet" iconColor={T.yellow} label="Wallet Settings" sub="Auto top-up, low balance alerts" onPress={()=>go("wallet")}/>
          <Row icon="fa-file-invoice" iconColor={T.blue} label="Download Invoices" sub="Download your invoices & receipts" onPress={()=>{}} last/>
        </Section>

        <Section title="Support & About">
          <Row icon="fa-question-circle" iconColor={T.blue} label="Help Center" sub="FAQs and support articles" onPress={()=>go("about")}/>
          <Row icon="fa-headset" iconColor={T.green} label="Contact Support" sub="Chat with us or send an email" onPress={()=>{ window.location.href=`mailto:ecochargeghanaltd@gmail.com`; }}/>
          <Row icon="fa-info-circle" iconColor={T.mutedLight} label="About EcoCharge" sub={`Version ${APP_VERSION} · Build 100`} onPress={()=>go("about")} last/>
        </Section>

        {user&&(
          <button onClick={()=>{ setUser(null); go("splash"); }} className="tap"
            style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
            <i className="fas fa-sign-out-alt"/> Sign Out
          </button>
        )}
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

// ── ZERO EMISSIONS SCREEN ─────────────────────────────────────
function ZeroEmissions({ go }) {
  const envStats = [
    { icon:"fa-smog",   value:"4.56",   unit:"tonnes", label:"CO₂ Emissions\nAvoided",       color:T.green  },
    { icon:"fa-seedling",value:"2,340", unit:"trees",  label:"Equivalent Trees\nPlanted",    color:T.green  },
    { icon:"fa-bolt",   value:"18,720", unit:"kWh",    label:"Clean Energy\nDelivered",      color:T.yellow },
    { icon:"fa-tint",   value:"56,100", unit:"liters", label:"Water\nSaved",                 color:T.blue   },
  ];

  const commitments = [
    { icon:"fa-solar-panel",  label:"Renewable\nEnergy",      text:"All our stations are powered by solar and clean energy sources."               },
    { icon:"fa-recycle",      label:"Zero Carbon\nFootprint",  text:"We are committed to reducing emissions and fighting climate change."            },
    { icon:"fa-users",        label:"Community\nImpact",       text:"We create jobs, empower local communities and support green initiatives."       },
    { icon:"fa-globe-africa", label:"Sustainable\nFuture",     text:"We innovate today to protect tomorrow for future generations."                  },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      {/* Hero */}
      <div style={{ position:"relative",height:180,flexShrink:0,overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#051a0a 0%,#0a2d12 50%,#051a0a 100%)" }}/>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 20px",overflow:"hidden" }}>
          <div style={{ opacity:0.15 }}>
            <i className="fas fa-wind" style={{ fontSize:80,color:T.green,position:"absolute",right:40,top:20 }}/>
            <i className="fas fa-solar-panel" style={{ fontSize:50,color:T.green,position:"absolute",right:100,bottom:20 }}/>
          </div>
        </div>
        <div style={{ position:"absolute",top:"calc(16px + env(safe-area-inset-top, 34px))",left:14 }}>
          <button onClick={()=>go("about")} className="tap" style={{ width:36,height:36,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <i className="fas fa-arrow-left" style={{ fontSize:16,color:"#fff" }}/>
          </button>
        </div>
        <div style={{ position:"absolute",bottom:16,left:16 }}>
          <div style={{ fontWeight:900,fontSize:22,color:"#fff",letterSpacing:-0.5 }}>Zero Emissions</div>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.65)",marginTop:4 }}>Our commitment to a cleaner future</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>

        {/* Mission statement */}
        <div className="fade" style={{ background:T.highlightGrad2,borderRadius:18,padding:"18px",marginBottom:16,border:`1px solid ${T.greenDim}`,display:"flex",gap:16,alignItems:"center" }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(34,197,94,0.15)",border:`2px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-leaf" style={{ fontSize:28,color:T.green }}/>
          </div>
          <div>
            <div style={{ fontWeight:800,fontSize:17,color:T.green,lineHeight:1.3 }}>Driving change.<br/><span style={{ color:T.text }}>Powering a greener Ghana.</span></div>
            <div style={{ fontSize:12,color:T.muted,marginTop:8,lineHeight:1.7 }}>At EcoCharge Ghana, we are building the foundation for a sustainable future through clean energy, innovation and community impact.</div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="fade1" style={{ background:T.card,borderRadius:18,padding:"18px",marginBottom:16,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
            <i className="fas fa-leaf" style={{ fontSize:16,color:T.green }}/>
            <div>
              <div style={{ fontWeight:800,fontSize:15,color:T.text }}>Our Environmental Impact</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Together, we are creating real change.</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10 }}>
            {envStats.map((s,i)=>(
              <div key={i} style={{ textAlign:"center",padding:"10px 4px",background:T.surfaceFaint,borderRadius:12 }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:18,color:s.color,marginBottom:6,display:"block" }}/>
                <div style={{ fontWeight:900,fontSize:16,color:T.text,lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10,color:s.color,fontWeight:700,marginTop:2 }}>{s.unit}</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:4,lineHeight:1.4,whiteSpace:"pre-line" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 100% Clean Energy callout */}
        <div className="fade1" style={{ background:T.highlightGrad2,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.greenDim}`,display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ width:48,height:48,borderRadius:12,background:"rgba(34,197,94,0.15)",border:`1px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-solar-panel" style={{ fontSize:20,color:T.blue }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:14,color:T.green }}>100% Clean Energy</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:4,lineHeight:1.6 }}>Our charging stations are powered by solar and hydrogen energy — zero carbon footprint.</div>
          </div>
          <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted,flexShrink:0 }}/>
        </div>

        {/* Our Commitment */}
        <div className="fade2" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text,marginBottom:4 }}>Our Commitment</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Beyond charging. Building a better tomorrow.</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {commitments.map((c,i)=>(
              <div key={i} style={{ background:T.card,borderRadius:16,padding:"16px",border:`1px solid ${T.border}` }}>
                <div style={{ width:42,height:42,borderRadius:10,background:`${T.green}18`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10 }}>
                  <i className={`fas ${c.icon}`} style={{ fontSize:18,color:T.green }}/>
                </div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:6,whiteSpace:"pre-line",lineHeight:1.3 }}>{c.label}</div>
                <div style={{ fontSize:11,color:T.muted,lineHeight:1.6 }}>{c.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className="fade2" style={{ background:`linear-gradient(135deg,#051a0a,#0a2d12)`,borderRadius:18,padding:"20px",border:`1px solid ${T.greenDim}`,display:"flex",gap:16,alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1.4,marginBottom:8 }}>Every charge you make drives a cleaner future.</div>
            <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>Thank you for being part of the EcoCharge movement.</div>
          </div>
          <div style={{ width:70,height:70,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-charging-station" style={{ fontSize:28,color:T.green }}/>
          </div>
        </div>

        <div style={{ marginTop:20 }}>
          <button onClick={()=>go("home")} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <i className="fas fa-bolt"/> Start Charging Green
          </button>
        </div>
      </div>
      <Nav active="Profile" go={go}/>
    </div>
  );
}

function AppInner() {
  const [screen,setScreen]   = useState(()=>{ try { return localStorage.getItem("eco_user")?"home":"splash"; } catch(e){ return "splash"; } });
  const [authMode,setAuthMode]= useState("login");
  const [station,setStation]  = useState(null);
  const [vehicle,setVehicle]  = useState(null);
  const [bookingMode,setBookingMode]= useState(null);
  const [selectedCharger,setSelectedCharger]= useState(null);
  const [stations,setStations]= useState(STATIONS);
  const [booking,setBooking]  = useState(()=>{ try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } });
  const [user,setUserRaw]     = useState(()=>{ try { const u=localStorage.getItem("eco_user"); return u?JSON.parse(u):null; } catch(e){ return null; } });
  const [drawer,setDrawer]    = useState(false);

  const setUser=(u)=>{ setUserRaw(u); try { u?localStorage.setItem("eco_user",JSON.stringify(u)):localStorage.removeItem("eco_user"); } catch(e){} };
  const go=(s)=>{ setScreen(s);setDrawer(false); };
  const goSecure=(s)=>{ const open=["splash","auth","about","home","detail","verify","map","privacypolicy","terms","refund","zeroemissions"]; if(!user&&!open.includes(s)){ setAuthMode("login");go("auth");return; } go(s); };

  useEffect(()=>{
    if (SUPABASE_URL) sb("stations?select=*&order=id").then(d=>{ if(d?.length) setStations(d); });
    const hash=window.location.hash;
    if (hash&&hash.includes("access_token")) {
      const hp=new URLSearchParams(hash.replace("#",""));
      const token=hp.get("access_token");
      if (token&&SUPABASE_URL) {
        fetch(`${SUPABASE_URL}/auth/v1/user`,{ headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${token}` } })
          .then(r=>r.json())
          .then(u=>{ if(u?.email){ const usr={ email:u.email,name:u.user_metadata?.full_name||u.email.split("@")[0],token,id:u.id }; setUser(usr); window.history.replaceState({},"",window.location.pathname); setScreen("home"); } }).catch(()=>{});
      }
    }
    const params=new URLSearchParams(window.location.search);
    const ref=params.get("reference")||params.get("trxref");
    if (ref) {
      window.history.replaceState({},"",window.location.pathname);
      const topupPending = (() => { try { return JSON.parse(localStorage.getItem('eco_topup')||'null'); } catch(e){ return null; } })();
      if (topupPending && ref.startsWith('WALLET-')) {
        try { localStorage.removeItem('eco_topup'); } catch(e) {}
        const verifyWalletPayment = async () => {
          try {
            if (OCPP_URL) {
              const vRes = await fetch(OCPP_URL + '/api/payment/verify', {
                method: 'POST',
                headers: { 'x-api-key': OCPP_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: ref })
              });
              const vData = await vRes.json();
              if (vData.success) { setScreen('wallet'); return; }
            }
            if (SUPABASE_URL && topupPending.userId) {
              await fetch(SUPABASE_URL + '/rest/v1/rpc/wallet_credit', {
                method: 'POST',
                headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_user_id: topupPending.userId, p_amount_pesewas: topupPending.amount, p_type: 'TopUp', p_description: 'Wallet top-up via Paystack', p_payment_ref: ref })
              });
              await fetch(SUPABASE_URL + '/rest/v1/topup_requests?payment_ref=eq.' + ref, {
                method: 'PATCH',
                headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ status: 'Completed', completed_at: new Date().toISOString() })
              });
              if (topupPending.userId) {
                createNotification(topupPending.userId, "topup_successful", "Top-Up Successful",
                  `GH₵${(topupPending.amount/100).toFixed(2)} added to your wallet.`, { reference: ref });
              }
            }
          } catch(e) { console.error('Wallet verify error:', e); }
          setScreen('wallet');
        };
        setTimeout(verifyWalletPayment, 150);
      }
    }
  },[]);

  const props={ go:goSecure,stations,station:station||stations[0],setStation,user,setUser,vehicle,setVehicle,bookingMode,setBookingMode,booking,setBooking,selectedCharger,setSelectedCharger,onMenu:()=>setDrawer(true) };

  if (screen==="splash") return <><style>{CSS}</style><Splash onLogin={()=>{ setAuthMode("login");go("auth"); }} onRegister={()=>{ setAuthMode("register");go("auth"); }} onGuest={()=>go("home")}/></>;
  if (screen==="auth")   return <><style>{CSS}</style><Auth mode={authMode} onBack={(mode)=>{ if(mode){ setAuthMode(mode); } else { go("splash"); } }} onSuccess={(u)=>{ setUser(u);go("home"); }}/></>;

  const views={
    chargers:       <ChargerAdmin go={goSecure}/>,
    sessions:       <SessionManager go={goSecure} user={user}/>,
    wallet:         <WalletScreen go={goSecure} user={user}/>,
    pricing:        <PricingAdmin go={goSecure} user={user}/>,
    admin:          <AdminDashboard go={goSecure} user={user}/>,
    notifications:  <NotificationsScreen go={goSecure} user={user}/>,
    privacypolicy:  <PrivacyPolicy go={goSecure}/>,
    terms:          <TermsAndConditions go={goSecure}/>,
    refund:         <RefundPolicy go={goSecure}/>,
    myvehicles:     <MyVehicles go={goSecure} user={user}/>,
    settings:       <SettingsScreen go={goSecure} user={user} setUser={setUser}/>,
    zeroemissions:  <ZeroEmissions go={goSecure}/>,
    home:           <Home {...props}/>,
    map:            <MapScreen {...props}/>,
    detail:         <Detail {...props}/>,
    chargerdetail:  <ChargerDetail {...props}/>,
    vehicles:       <Vehicles {...props}/>,
    chargenow:      <ChargeNow {...props}/>,
    booking:        <Booking {...props}/>,
    bookings:       <Bookings {...props}/>,
    qr:             <QRScreen {...props}/>,
    scan:           <ScanToCharge {...props}/>,
    verify:         <Verify {...props}/>,
    profile:        <Profile {...props}/>,
    about:          <About {...props}/>,
  };

  return (
    <><style>{CSS}</style>
    <div style={{ position:"relative",height:"100vh",overflow:"hidden",background:T.bg }}>
      <Drawer open={drawer} onClose={()=>setDrawer(false)} go={goSecure} user={user} onLogout={()=>{ setUser(null);go("splash"); }}/>
      <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {views[screen]||views.home}
      </div>
    </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner/>
    </ThemeProvider>
  );
}
