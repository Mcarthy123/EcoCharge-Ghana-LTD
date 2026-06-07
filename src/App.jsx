// ============================================================
// EcoCharge Ghana — App.jsx FINAL
// Font Awesome Free icons + Inter font
// Paystack, Supabase, QR, Booking, Verify, Map
// ============================================================
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL        || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY   || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

const sb = async (path, opts = {}) => {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey:SUPABASE_ANON, Authorization:`Bearer ${SUPABASE_ANON}`, "Content-Type":"application/json", ...opts.headers },
      ...opts,
    });
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
};

const T = {
  bg:"#0a0d10", card:"#13171f", card2:"#1a1f2a", border:"#222632",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
};

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

// ── LIVE SOLAR DATA (Open-Meteo API — Free, no key needed) ────
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
  body{font-family:'Inter',sans-serif;background:#0a0d10;color:#fff;-webkit-font-smoothing:antialiased;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade{animation:fadeUp .3s ease both}
  .fade1{animation:fadeUp .3s .06s ease both}
  .fade2{animation:fadeUp .3s .12s ease both}
  .fade3{animation:fadeUp .3s .18s ease both}
  .tap{transition:opacity .15s,transform .15s;cursor:pointer;-webkit-tap-highlight-color:transparent;}
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

const NewNav = ({ active, go }) => (
  <div style={{ position:"fixed",bottom:0,left:0,right:0,display:"flex",justifyContent:"space-around",alignItems:"flex-end",padding:"10px 0 26px",borderTop:`1px solid ${T.border}`,background:"rgba(10,13,16,.97)",backdropFilter:"blur(16px)",zIndex:100 }}>
    {[
      { label:"Home",     screen:"home",    icon:"fa-home"     },
      { label:"Stations", screen:"detail",  icon:"fa-plug"     },
      { label:"Scan",     screen:"qr",      icon:"fa-qrcode",   center:true },
      { label:"Bookings", screen:"bookings",icon:"fa-calendar" },
      { label:"Profile",  screen:"profile", icon:"fa-user"     },
    ].map(({ label,screen,icon,center })=>(
      <button key={label} onClick={()=>go(screen)} className="tap"
        style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:56,fontFamily:"inherit" }}>
        {center ? (
          <div style={{ width:54,height:54,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",marginTop:-22,marginBottom:2,boxShadow:`0 4px 24px rgba(74,222,128,.45)` }}>
            <i className={`fas ${icon}`} style={{ fontSize:20,color:"#000" }}/>
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

const Nav = ({ active, go }) => (
  <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 26px",borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0,position:"sticky",bottom:0,zIndex:50 }}>
    {[
      { label:"Home",     screen:"home",   icon:"fa-home"    },
      { label:"Stations", screen:"detail", icon:"fa-plug"    },
      { label:"Profile",  screen:"profile",icon:"fa-user"   },
      { label:"More",     screen:"about",  icon:"fa-ellipsis-h" },
    ].map(({ label,screen,icon })=>(
      <button key={label} onClick={()=>go(screen)} className="tap"
        style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:56,fontFamily:"inherit" }}>
        <i className={`fas ${icon}`} style={{ fontSize:20,color:active===label?T.green:T.muted }}/>
        <span style={{ fontSize:10,fontWeight:active===label?700:500,color:active===label?T.green:T.muted }}>{label}</span>
        {active===label&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
      </button>
    ))}
  </div>
);

const Header = ({ title,sub,onBack,onMenu }) => (
  <div style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg }}>
    {onBack
      ? <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/></button>
      : <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><i className="fas fa-bars" style={{ fontSize:20,color:T.mutedLight }}/></button>
    }
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,letterSpacing:-0.3 }}>{title}</div>
      {sub&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
    <Logo size={34}/>
  </div>
);

const Drawer = ({ open,onClose,go,user,onLogout }) => (
  <>
    {open&&<div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:200 }}/>}
    <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,background:T.card,zIndex:201,borderRight:`1px solid ${T.border}`,transform:open?"translateX(0)":"translateX(-100%)",transition:"transform .3s cubic-bezier(.4,0,.2,1)",display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"52px 20px 20px",background:"linear-gradient(135deg,#0a1f12,#0f2b18)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <Logo size={48}/>
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
        {[
          { icon:"fa-home",         label:"Find Stations",   screen:"home"    },
          { icon:"fa-plug",         label:"All Stations",    screen:"detail"  },
          { icon:"fa-user",         label:"My Profile",      screen:"profile" },
          { icon:"fa-info-circle",  label:"About EcoCharge", screen:"about"   },
          { icon:"fa-bolt",         label:"Verify Booking",  screen:"verify", color:T.yellow },
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

function Splash({ onLogin, onRegister, onGuest }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#050a06",position:"relative",overflow:"hidden" }}>
      {/* Background station image */}
      <img src="/station1.jpg" alt="bg"
        style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.3) saturate(1.2)",zIndex:0 }}
        onError={e=>e.target.style.display="none"}/>
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(5,10,6,0.4) 0%,rgba(5,10,6,0.85) 50%,rgba(5,10,6,1) 100%)",zIndex:1 }}/>
      {/* Content */}
      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",height:"100%",padding:"60px 28px 50px",alignItems:"center",justifyContent:"space-between" }}>
        {/* Top logo */}
        <div style={{ textAlign:"center",marginTop:40 }}>
          <Logo size={90}/>
          <div style={{ fontWeight:900,fontSize:34,color:T.text,marginTop:16,letterSpacing:-1 }}>EcoCharge</div>
          <div style={{ fontWeight:700,fontSize:18,color:T.green,marginTop:4,letterSpacing:1 }}>Ghana</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:12,lineHeight:1.8 }}>
            Solar Charging. Clean Water.<br/>Zero Emissions.
          </div>
        </div>
        {/* Buttons */}
        <div style={{ width:"100%" }}>
          <button onClick={onLogin} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:16,padding:"17px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 20px rgba(74,222,128,0.4)` }}>
            <i className="fas fa-sign-in-alt"/> Sign In
          </button>
          <button onClick={onRegister} className="tap"
            style={{ width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:16,padding:"17px",fontSize:16,fontWeight:600,color:T.text,cursor:"pointer",marginBottom:20,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-user-plus"/> Create Account
          </button>
          <button onClick={onGuest} className="tap"
            style={{ width:"100%",background:"none",border:"none",fontSize:13,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit" }}>
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}

) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,alignItems:"center",justifyContent:"center",padding:"40px 28px" }}>
      <div className="fade" style={{ textAlign:"center",marginBottom:40 }}>
        <Logo size={90}/>
        <div style={{ fontWeight:900,fontSize:32,color:T.text,marginTop:16,letterSpacing:-1 }}>EcoCharge</div>
        <div style={{ fontWeight:700,fontSize:17,color:T.green,marginTop:4,letterSpacing:1 }}>GHANA</div>
        <div style={{ fontSize:13,color:T.muted,marginTop:12,lineHeight:1.8 }}>Solar EV Charging · Clean Water<br/>Zero Emissions</div>
      </div>
      <div className="fade1" style={{ width:"100%" }}>
        <button onClick={onLogin} className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <i className="fas fa-sign-in-alt"/> Sign In
        </button>
        <button onClick={onRegister} className="tap" style={{ width:"100%",background:"transparent",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px",fontSize:16,fontWeight:600,color:T.text,cursor:"pointer",marginBottom:16,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <i className="fas fa-user-plus"/> Create Account
        </button>
        <button onClick={onGuest} className="tap" style={{ width:"100%",background:"none",border:"none",fontSize:13,color:T.muted,cursor:"pointer",fontFamily:"inherit" }}>
          Continue as Guest →
        </button>
      </div>
      <div className="fade2" style={{ marginTop:36,display:"flex",gap:32 }}>
        {[{ icon:"fa-sun",label:"Solar",color:T.yellow },{ icon:"fa-tint",label:"Water",color:T.blue },{ icon:"fa-leaf",label:"Green",color:T.green }].map(f=>(
          <div key={f.label} style={{ textAlign:"center" }}>
            <i className={`fas ${f.icon}`} style={{ fontSize:22,color:f.color }}/>
            <div style={{ fontSize:10,color:T.muted,marginTop:6 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Auth({ mode, onBack, onSuccess }) {
  const [tab,setTab]         = useState("email");
  const [name,setPname]      = useState("");
  const [email,setEmail]     = useState("");
  const [password,setPass]   = useState("");
  const [showPass,setShowPass]= useState(false);
  const [phone,setPhone]     = useState("");
  const [otp,setOtp]         = useState("");
  const [otpSent,setOtpSent] = useState(false);
  const [loading,setLoad]    = useState(false);
  const [error,setErr]       = useState("");
  const [success,setSuccess] = useState("");

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
    } else {
      setErr(d.error_description||d.msg||"Something went wrong. Try again.");
    }
    setLoad(false);
  };

  const sendOtp = async () => {
    if (!phone||phone.length<9) { setErr("Enter a valid Ghana phone number"); return; }
    setLoad(true); setErr("");
    const intl = phone.startsWith("+") ? phone : `+233${phone.replace(/^0/,"")}`;
    const d = await call("otp",{ phone:intl });
    if (d.error) { setErr(d.error_description||"Could not send OTP."); }
    else { setOtpSent(true); setSuccess(`OTP sent to ${intl}`); }
    setLoad(false);
  };

  const verifyOtp = async () => {
    if (!otp||otp.length<6) { setErr("Enter the 6-digit OTP code"); return; }
    setLoad(true); setErr("");
    const intl = phone.startsWith("+") ? phone : `+233${phone.replace(/^0/,"")}`;
    const d = await call("verify",{ phone:intl,token:otp,type:"sms" });
    if (d.access_token||d.user) {
      onSuccess({ phone:intl,name:intl,token:d.access_token||"demo",id:d.user?.id||"demo" });
    } else { setErr(d.error_description||"Invalid OTP. Try again."); }
    setLoad(false);
  };

  const googleSignIn = () => {
    if (!SUPABASE_URL) { setErr("Supabase not configured"); return; }
    const redirectTo = encodeURIComponent(window.location.origin);
    window.location.href=`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&scopes=email%20profile`;
  };

  const inp = (ph,val,set,type="text",icon="fa-user",extra=null) => (
    <div style={{ position:"relative",marginBottom:14 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14,zIndex:1 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 44px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
      {extra}
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"52px 18px 14px",display:"flex",alignItems:"center",gap:12 }}>
        <button onClick={()=>onBack(null)} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 24px 40px" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <Logo size={56}/>
          <div style={{ fontWeight:800,fontSize:24,color:T.text,marginTop:14 }}>
            {mode==="login"?"Welcome Back":"Create Account"}
          </div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>
            {mode==="login"?"Sign in to your account":"Join EcoCharge Ghana today"}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex",background:T.card,borderRadius:12,padding:4,marginBottom:20,border:`1px solid ${T.border}` }}>
          {[{ id:"email",label:"Email",icon:"fa-envelope" },{ id:"phone",label:"Phone",icon:"fa-phone" }].map(t=>(
            <button key={t.id} onClick={()=>{ setTab(t.id);setErr("");setSuccess(""); }} className="tap"
              style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:"none",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <i className={`fas ${t.icon}`}/> {t.label}
            </button>
          ))}
        </div>

        {/* Email form */}
        {tab==="email" && (
          <>
            {mode==="register" && inp("Full name",name,setPname,"text","fa-user")}
            {inp("Email address",email,setEmail,"email","fa-envelope")}
            <div style={{ position:"relative",marginBottom:14 }}>
              <i className="fas fa-lock" style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14,zIndex:1 }}/>
              <input type={showPass?"text":"password"} placeholder="Password" value={password} onChange={e=>{ setPass(e.target.value);setErr(""); }}
                style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 46px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:14 }}>
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

        {/* Phone form */}
        {tab==="phone" && !otpSent && (
          <div style={{ position:"relative",marginBottom:14 }}>
            <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:6,zIndex:1 }}>
              <span style={{ fontSize:16 }}>🇬🇭</span>
              <span style={{ fontSize:13,color:T.muted,fontWeight:600 }}>+233</span>
              <div style={{ width:1,height:16,background:T.border }}/>
            </div>
            <input type="tel" placeholder="XX XXX XXXX" value={phone} onChange={e=>{ setPhone(e.target.value);setErr(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 95px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
          </div>
        )}
        {tab==="phone" && otpSent && (
          <>
            {success&&<div style={{ color:T.green,fontSize:12,marginBottom:12,background:"rgba(74,222,128,.08)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-check-circle"/> {success}</div>}
            <div style={{ fontSize:13,color:T.muted,marginBottom:12,textAlign:"center" }}>Enter the 6-digit code sent to your phone</div>
            <input type="number" placeholder="000000" value={otp} onChange={e=>{ setOtp(e.target.value);setErr(""); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"16px",color:T.text,fontSize:28,fontFamily:"monospace",letterSpacing:10,textAlign:"center",marginBottom:14 }}/>
          </>
        )}

        {error&&<div style={{ color:T.red,fontSize:12,marginBottom:14,background:"rgba(248,113,113,.08)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/> {error}</div>}

        {/* Main CTA */}
        <button onClick={tab==="email"?submitEmail:otpSent?verifyOtp:sendOtp} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16,opacity:loading?.7:1,boxShadow:`0 4px 16px rgba(74,222,128,0.35)` }}>
          {loading?<Spinner/>:
            tab==="phone"?otpSent?<><i className="fas fa-shield-alt"/> Verify OTP</>:<><i className="fas fa-sms"/> Send OTP</>
            :mode==="login"?<><i className="fas fa-sign-in-alt"/> Sign In</>:<><i className="fas fa-user-plus"/> Create Account</>
          }
        </button>

        {tab==="phone"&&otpSent&&(
          <button onClick={()=>{ setOtpSent(false);setOtp("");setErr("");setSuccess(""); }} className="tap"
            style={{ width:"100%",background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:16 }}>← Change number</button>
        )}

        {/* Divider */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <div style={{ flex:1,height:1,background:T.border }}/>
          <span style={{ fontSize:12,color:T.muted }}>or continue with</span>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>

        {/* Google + Phone side by side */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24 }}>
          <button onClick={googleSignIn} className="tap"
            style={{ background:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button onClick={()=>setTab("phone")} className="tap"
            style={{ background:"rgba(255,255,255,0.07)",border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
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

) {
  const [tab,setTab]         = useState("email"); // email | phone
  const [name,setPname]      = useState("");
  const [email,setEmail]     = useState("");
  const [password,setPass]   = useState("");
  const [phone,setPhone]     = useState("");
  const [otp,setOtp]         = useState("");
  const [otpSent,setOtpSent] = useState(false);
  const [loading,setLoad]    = useState(false);
  const [error,setErr]       = useState("");
  const [success,setSuccess] = useState("");

  const call = async (ep,body) => {
    if (!SUPABASE_URL) return { access_token:"demo",id:"demo" };
    const r = await fetch(`${SUPABASE_URL}/auth/v1/${ep}`,{
      method:"POST",
      headers:{ apikey:SUPABASE_ANON,"Content-Type":"application/json" },
      body:JSON.stringify(body),
    });
    return r.json();
  };

  // Email/Password submit
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
    } else {
      setErr(d.error_description||d.msg||"Something went wrong. Try again.");
    }
    setLoad(false);
  };

  // Phone OTP — send
  const sendOtp = async () => {
    if (!phone||phone.length<10) { setErr("Enter a valid Ghana phone number"); return; }
    setLoad(true); setErr("");
    // Format phone to international
    const intl = phone.startsWith("+") ? phone : `+233${phone.replace(/^0/,"")}`;
    const d = await call("otp",{ phone:intl });
    if (d.error) {
      setErr(d.error_description||"Could not send OTP. Check your number.");
    } else {
      setOtpSent(true);
      setSuccess(`OTP sent to ${intl}`);
    }
    setLoad(false);
  };

  // Phone OTP — verify
  const verifyOtp = async () => {
    if (!otp||otp.length<6) { setErr("Enter the 6-digit OTP code"); return; }
    setLoad(true); setErr("");
    const intl = phone.startsWith("+") ? phone : `+233${phone.replace(/^0/,"")}`;
    const d = await call("verify",{ phone:intl,token:otp,type:"sms" });
    if (d.access_token||d.user) {
      onSuccess({ phone:intl,name:intl,token:d.access_token||"demo",id:d.user?.id||"demo" });
    } else {
      setErr(d.error_description||"Invalid OTP. Try again.");
    }
    setLoad(false);
  };

  // Google Sign In
  const googleSignIn = async () => {
    if (!SUPABASE_URL) { setErr("Supabase not configured"); return; }
    setLoad(true); setErr("");
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`,{
        headers:{ apikey:SUPABASE_ANON },
      });
      // Redirect to Google
      window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
    } catch(e) {
      setErr("Google sign in failed. Try again.");
      setLoad(false);
    }
  };

  const inp = (ph,val,set,type="text",icon="fa-user") => (
    <div style={{ position:"relative",marginBottom:12 }}>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 44px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={mode==="login"?"Welcome Back":"Create Account"} sub="EcoCharge Ghana" onBack={()=>onBack(null)}/>
      <div style={{ flex:1,overflowY:"auto",padding:"24px 20px 40px" }}>

        {/* Logo */}
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <Logo size={64}/>
          <div style={{ fontWeight:800,fontSize:20,color:T.text,marginTop:12 }}>
            {mode==="login"?"Sign in to EcoCharge":"Join EcoCharge Ghana"}
          </div>
          <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>
            {mode==="login"?"Access your charging account":"Start charging clean energy"}
          </div>
        </div>

        {/* Google Button */}
        <button onClick={googleSignIn} disabled={loading} className="tap"
          style={{ width:"100%",background:"#fff",border:"none",borderRadius:14,padding:"14px",fontSize:15,fontWeight:700,color:"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <div style={{ flex:1,height:1,background:T.border }}/>
          <span style={{ fontSize:12,color:T.muted }}>or continue with</span>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex",background:T.card,borderRadius:12,padding:4,marginBottom:16,border:`1px solid ${T.border}` }}>
          {[{ id:"email",label:"Email",icon:"fa-envelope" },{ id:"phone",label:"Phone",icon:"fa-phone" }].map(t=>(
            <button key={t.id} onClick={()=>{ setTab(t.id);setErr("");setSuccess(""); }} className="tap"
              style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:"none",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <i className={`fas ${t.icon}`}/> {t.label}
            </button>
          ))}
        </div>

        {/* Email form */}
        {tab==="email" && (
          <div style={{ background:T.card,borderRadius:16,padding:"18px",border:`1px solid ${T.border}` }}>
            {mode==="register" && inp("Full name",name,setPname,"text","fa-user")}
            {inp("Email address",email,setEmail,"email","fa-envelope")}
            {inp("Password (min 6 chars)",password,setPass,"password","fa-lock")}
            {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,background:"rgba(248,113,113,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/>{error}</div>}
            <button onClick={submitEmail} disabled={loading} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
              {loading?<Spinner/>:<><i className={`fas ${mode==="login"?"fa-sign-in-alt":"fa-user-plus"}`}/> {mode==="login"?"Sign In":"Create Account"}</>}
            </button>
          </div>
        )}

        {/* Phone OTP form */}
        {tab==="phone" && (
          <div style={{ background:T.card,borderRadius:16,padding:"18px",border:`1px solid ${T.border}` }}>
            {!otpSent ? (
              <>
                <div style={{ position:"relative",marginBottom:12 }}>
                  <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ fontSize:13,color:T.muted,fontWeight:600 }}>🇬🇭</span>
                    <span style={{ fontSize:13,color:T.muted }}>+233</span>
                    <div style={{ width:1,height:16,background:T.border,marginLeft:4 }}/>
                  </div>
                  <input type="tel" placeholder="XX XXX XXXX" value={phone} onChange={e=>{ setPhone(e.target.value);setErr(""); }}
                    style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 90px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
                </div>
                {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,background:"rgba(248,113,113,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/> {error}</div>}
                <button onClick={sendOtp} disabled={loading} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
                  {loading?<Spinner/>:<><i className="fas fa-sms"/> Send OTP Code</>}
                </button>
              </>
            ) : (
              <>
                {success&&<div style={{ color:T.green,fontSize:12,marginBottom:12,background:"rgba(74,222,128,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-check-circle"/> {success}</div>}
                <div style={{ fontSize:13,color:T.muted,marginBottom:12 }}>Enter the 6-digit code sent to your phone</div>
                <input type="number" placeholder="000000" value={otp} onChange={e=>{ setOtp(e.target.value);setErr(""); }}
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",color:T.text,fontSize:24,fontFamily:"monospace",letterSpacing:8,textAlign:"center",marginBottom:12 }}/>
                {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,background:"rgba(248,113,113,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/> {error}</div>}
                <button onClick={verifyOtp} disabled={loading} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1,marginBottom:10 }}>
                  {loading?<Spinner/>:<><i className="fas fa-shield-alt"/> Verify OTP</>}
                </button>
                <button onClick={()=>{ setOtpSent(false);setOtp("");setErr("");setSuccess(""); }} className="tap"
                  style={{ width:"100%",background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
                  ← Change number
                </button>
              </>
            )}
          </div>
        )}

        {/* Switch mode */}
        <div style={{ textAlign:"center",marginTop:20 }}>
          <span style={{ color:T.muted,fontSize:13 }}>{mode==="login"?"No account? ":"Already registered? "}</span>
          <button onClick={()=>onBack(mode==="login"?"register":"login")}
            style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            {mode==="login"?"Register free":"Sign In"}
          </button>
        </div>

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
      <NewNav active="Stations" go={go}/>
    </div>
  );
}


// ── SOLAR WIDGET COMPONENT ────────────────────────────────────
function SolarWidget() {
  const { solar, loading } = useSolarData(7.9465, -1.0232); // Ghana center

  const getStrength = (r) => {
    if (r > 700) return { label:"Excellent", color:"#4ade80" };
    if (r > 400) return { label:"Good",      color:"#fbbf24" };
    if (r > 200) return { label:"Moderate",  color:"#f97316" };
    return { label:"Low", color:"#6b7280" };
  };

  const strength = solar ? getStrength(solar.radiation) : null;

  return (
    <div style={{ margin:"0 14px 16px", background:"linear-gradient(135deg,#1a1000,#2d1a00)", borderRadius:18, padding:"16px", border:`1px solid rgba(251,191,36,0.2)` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(251,191,36,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="fas fa-sun" style={{ fontSize:16, color:T.yellow }}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:T.text }}>Live Solar Radiation</div>
            <div style={{ fontSize:10, color:T.muted }}>Ghana · Updated {solar?.updated||"--:--"}</div>
          </div>
        </div>
        {strength && (
          <div style={{ background:`${strength.color}22`, borderRadius:10, padding:"4px 10px", border:`1px solid ${strength.color}44` }}>
            <span style={{ fontSize:11, fontWeight:700, color:strength.color }}>{strength.label}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"10px 0", color:T.muted, fontSize:13 }}>
          <Spinner/> <span style={{ marginLeft:8 }}>Fetching live data...</span>
        </div>
      ) : (
        <>
          {/* Main radiation value */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, marginBottom:12 }}>
            <div style={{ fontWeight:900, fontSize:36, color:T.yellow, lineHeight:1 }}>{solar?.radiation}</div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>W/m²</div>
            <div style={{ flex:1 }}/>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:T.muted }}>Efficiency</div>
              <div style={{ fontWeight:800, fontSize:18, color:T.green }}>{solar?.efficiency}%</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", width:`${solar?.efficiency}%`, background:`linear-gradient(90deg,${T.yellow},${T.green})`, borderRadius:3, transition:"width 1s ease" }}/>
          </div>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              { label:"Direct",     value:`${solar?.direct}`,    unit:"W/m²", icon:"fa-sun",   color:T.yellow },
              { label:"Cloud Cover",value:`${solar?.cloudCover}`,unit:"%",    icon:"fa-cloud", color:T.mutedLight },
              { label:"Sunshine",   value:`${solar?.sunshine}`,  unit:"min",  icon:"fa-clock", color:T.blue },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:12, color:s.color, marginBottom:4, display:"block" }}/>
                <div style={{ fontWeight:800, fontSize:14, color:T.text }}>{s.value}<span style={{ fontSize:10, color:T.muted, fontWeight:400 }}> {s.unit}</span></div>
                <div style={{ fontSize:9, color:T.muted, marginTop:2, textTransform:"uppercase", letterSpacing:0.3 }}>{s.label}</div>
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
  const [slideIdx,setSlideIdx] = useState(0);
  const slides = ["/station1.jpg","/station2.jpg","/station3.jpg"];
  useEffect(()=>{
    const timer = setInterval(()=>{ setSlideIdx(i=>(i+1)%slides.length); },3500);
    return ()=>clearInterval(timer);
  },[]);
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const greetEmoji=hour<12?"👋":hour<17?"☀️":"🌙";
  const displayName=user?.name||user?.email?.split("@")[0]||"Welcome";
  const filtered=search?stations.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase())):stations;

  const quickActions=[
    { icon:"fa-bolt",      label:"Find Stations", sub:"Nearby",          screen:"map",     bg:`linear-gradient(135deg,${T.green},${T.greenDark})`,  color:"#000" },
    { icon:"fa-calendar",  label:"My Bookings",   sub:"View all",        screen:"bookings",bg:"rgba(255,255,255,0.12)",                               color:T.mutedLight },
    { icon:"fa-qrcode",    label:"Charging Pass", sub:"Show QR",         screen:"qr",      bg:"rgba(255,255,255,0.12)",                               color:T.mutedLight },
    { icon:"fa-tint",      label:"Water Points",  sub:"Find clean water",screen:"detail",  bg:"rgba(56,189,248,0.18)",                               color:T.blue },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#080d10",overflowY:"auto" }}>

      {/* HEADER */}
      <div style={{ padding:"48px 18px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
        <button onClick={onMenu} className="tap" style={{ background:"rgba(255,255,255,.07)",border:`1px solid ${T.border}`,borderRadius:12,width:40,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <i className="fas fa-bars" style={{ fontSize:16,color:T.mutedLight }}/>
        </button>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <Logo size={30}/>
          <div>
            <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1.1,letterSpacing:-0.3 }}>EcoCharge</div>
            <div style={{ fontSize:10,color:T.green,fontWeight:700,letterSpacing:1 }}>Ghana</div>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <button className="tap" style={{ background:"rgba(255,255,255,.07)",border:`1px solid ${T.border}`,borderRadius:12,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className="fas fa-bell" style={{ fontSize:16,color:T.mutedLight }}/>
          </button>
          <div style={{ position:"absolute",top:-2,right:-2,width:10,height:10,borderRadius:"50%",background:T.green,border:`2px solid #080d10` }}/>
        </div>
      </div>

      {/* HERO — full bleed image with text overlay */}
      <div style={{ margin:"0 14px 16px",borderRadius:22,overflow:"hidden",position:"relative",minHeight:200 }}>
        {/* Sliding images */}
        {slides.map((src,i)=>(
          <img key={src} src={src} alt="station"
            style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:i===slideIdx?1:0,transition:"opacity 1.2s ease",filter:"brightness(0.5) saturate(1.1)" }}
            onError={e=>{ e.target.style.display="none"; }}/>
        ))}
        {/* Dark gradient overlay */}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(5,20,8,0.92) 0%,rgba(5,20,8,0.5) 55%,rgba(0,0,0,0.1) 100%)" }}/>
        {/* Text content */}
        <div style={{ position:"relative",zIndex:2,padding:"22px 20px 20px" }}>
          <div style={{ fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:4 }}>
            {greeting} {greetEmoji}
          </div>
          <div style={{ fontWeight:800,fontSize:28,color:T.text,marginBottom:8,letterSpacing:-0.5 }}>
            {displayName}
          </div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.7,marginBottom:16 }}>
            Powering Ghana with{" "}
            <span style={{ color:T.green,fontWeight:700 }}>clean energy</span>
            {" "}and{" "}
            <span style={{ color:T.blue,fontWeight:700 }}>clean water</span>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>go("map")} className="tap"
              style={{ background:T.green,border:"none",borderRadius:12,padding:"10px 20px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
              <i className="fas fa-map-marker-alt"/> Find Station
            </button>
            <button onClick={()=>go("qr")} className="tap"
              style={{ background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:12,padding:"10px 18px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
              <i className="fas fa-qrcode"/> My Pass
            </button>
          </div>
        </div>
        {/* Slide dots */}
        <div style={{ position:"absolute",bottom:12,right:14,display:"flex",gap:5,zIndex:3 }}>
          {slides.map((_,i)=>(
            <div key={i} onClick={()=>setSlideIdx(i)}
              style={{ width:i===slideIdx?20:6,height:6,borderRadius:3,background:i===slideIdx?T.green:"rgba(255,255,255,0.35)",transition:"all .3s",cursor:"pointer" }}/>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ margin:"0 14px 16px",position:"relative" }}>
        <i className="fas fa-search" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
        <input placeholder="Search station or location" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 48px 13px 42px",fontSize:14,fontFamily:"inherit" }}/>
        <div style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.06)",borderRadius:8,padding:"5px 9px" }}>
          <i className="fas fa-sliders-h" style={{ fontSize:13,color:T.mutedLight }}/>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ margin:"0 14px 16px",background:T.card,borderRadius:18,border:`1px solid ${T.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        {quickActions.map((a,i)=>(
          <button key={a.label} onClick={()=>go(a.screen)} className="tap"
            style={{ background:"none",border:"none",cursor:"pointer",padding:"16px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,borderRight:i<3?`1px solid ${T.border}`:"none",fontFamily:"inherit" }}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:i===0?`0 4px 12px rgba(74,222,128,0.4)`:"none" }}>
              <i className={`fas ${a.icon}`} style={{ fontSize:18,color:a.color }}/>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.text,lineHeight:1.3 }}>{a.label}</div>
              <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* IMPACT CARD */}
      <div style={{ margin:"0 14px 16px",background:"linear-gradient(135deg,#071a09,#0a2510)",borderRadius:18,padding:"16px",border:`1px solid rgba(74,222,128,0.2)`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <div style={{ width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-leaf" style={{ fontSize:18,color:"#000" }}/>
          </div>
          <div>
            <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:5 }}>You're making impact!</div>
            <div style={{ fontSize:12,color:T.mutedLight }}><strong style={{ color:T.text }}>12 charges</strong>{" · "}<strong style={{ color:T.text }}>48 kg CO₂</strong> saved</div>
            <div style={{ fontSize:12,color:T.mutedLight,marginTop:3 }}><i className="fas fa-tint" style={{ color:T.blue,marginRight:4 }}/><strong style={{ color:T.blue }}>240 L</strong> clean water received</div>
          </div>
        </div>
        <i className="fas fa-globe-africa" style={{ fontSize:40,color:T.green,opacity:0.6 }}/>
      </div>

      {/* LIVE SOLAR DATA */}
      <SolarWidget/>

      {/* NEARBY STATIONS */}
      <div style={{ margin:"0 14px 14px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Nearby Stations</div>
          <button onClick={()=>go("detail")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
            View all <i className="fas fa-arrow-right" style={{ fontSize:11 }}/>
          </button>
        </div>
        {(search?filtered:stations).slice(0,3).map((s,idx)=>{
          const kw=Math.round((s.solar||80)*1.5);
          const stationImgs=["/station1.jpg","/station2.jpg","/station3.jpg"];
          return (
            <div key={s.id} className="tap row" onClick={()=>{ setStation(s);go("detail"); }}
              style={{ background:T.card,borderRadius:18,border:`1px solid ${T.border}`,marginBottom:10,display:"flex",gap:0,alignItems:"stretch",overflow:"hidden" }}>
              {/* Station photo */}
              <div style={{ width:90,flexShrink:0,position:"relative",overflow:"hidden" }}>
                <img src={stationImgs[idx%3]} alt="station"
                  style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.75) saturate(1.1)" }}
                  onError={e=>{ e.target.parentElement.style.background="linear-gradient(135deg,#0a2010,#0d3018)"; e.target.style.display="none"; }}/>
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,transparent 60%,rgba(19,23,31,0.8))" }}/>
              </div>
              {/* Info */}
              <div style={{ flex:1,padding:"12px 10px",minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}><i className="fas fa-clock" style={{ marginRight:4 }}/>{s.time} away · {s.city}</div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",display:"flex",alignItems:"center",gap:3 }}>
                    <i className="fas fa-bolt" style={{ fontSize:9,color:T.mutedLight }}/><span style={{ fontSize:10,color:T.mutedLight }}>{kw} kW Max</span>
                  </div>
                  <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",display:"flex",alignItems:"center",gap:3 }}>
                    <i className="fas fa-sun" style={{ fontSize:9,color:T.yellow }}/><span style={{ fontSize:10,color:T.mutedLight }}>{s.solar}% Solar</span>
                  </div>
                </div>
              </div>
              {/* Right */}
              <div style={{ flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"space-between",padding:"12px 12px" }}>
                <div style={{ background:"rgba(74,222,128,0.12)",border:`1px solid rgba(74,222,128,0.25)`,borderRadius:10,padding:"5px 10px",textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:14,color:T.green,lineHeight:1 }}>{s.open}/{s.bays}</div>
                  <div style={{ fontSize:9,color:T.green,marginTop:2 }}>Bays avail.</div>
                </div>
                <button onClick={e=>{ e.stopPropagation();setStation(s);go("detail"); }} className="tap"
                  style={{ width:32,height:32,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px rgba(74,222,128,.3)` }}>
                  <i className="fas fa-external-link-alt" style={{ fontSize:12,color:"#000" }}/>
                </button>
              </div>
            </div>
          );
        })}
        {search&&filtered.length===0&&(
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>
            <i className="fas fa-search" style={{ fontSize:24,marginBottom:10,display:"block" }}/>
            No stations found for "{search}"
          </div>
        )}
      </div>

      {/* WATER BANNER */}
      <div style={{ margin:"0 14px 110px",background:"linear-gradient(135deg,#061520,#09202e)",borderRadius:18,overflow:"hidden",border:`1px solid rgba(56,189,248,0.2)`,display:"flex",alignItems:"center",cursor:"pointer",position:"relative",minHeight:80 }}
        onClick={()=>go("detail")}>
        <div style={{ position:"absolute",left:0,top:0,bottom:0,width:80,overflow:"hidden" }}>
          <img src="/station3.jpg" alt="water" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.5) hue-rotate(180deg) saturate(1.5)" }}
            onError={e=>{ e.target.style.display="none"; }}/>
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,transparent,rgba(6,21,32,0.9))" }}/>
        </div>
        <div style={{ flex:1,padding:"16px 16px 16px 90px" }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.blue,marginBottom:4 }}>
            Every charge includes <span style={{ color:T.blue }}>20L Clean Water</span>
          </div>
          <div style={{ fontSize:12,color:T.muted }}>Clean energy for your ride. Clean water for life.</div>
        </div>
        <i className="fas fa-chevron-right" style={{ color:T.muted,fontSize:14,marginRight:16 }}/>
      </div>

      <NewNav active="Home" go={go}/>
    </div>
  );
}


function Detail({ go,station,stations,setStation }) {
  const s=station||stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} sub={`${s.city} · Solar & Hydrogen`} onBack={()=>go("home")}/>
      <div style={{ margin:"0",borderRadius:0,overflow:"hidden",height:200,position:"relative",flexShrink:0 }}>
        <img src="/station2.jpg" alt="station"
          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",filter:"brightness(0.55) saturate(1.3)" }}
          onError={e=>{ e.target.style.display="none"; }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)" }}/>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:32 }}>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-sun" style={{ fontSize:36,color:T.yellow,filter:"drop-shadow(0 2px 8px rgba(251,191,36,0.5))" }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8,textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}>{s.solar}% Solar</div>
          </div>
          <div style={{ width:1,height:60,background:"rgba(255,255,255,0.25)" }}/>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-atom" style={{ fontSize:36,color:T.blue,filter:"drop-shadow(0 2px 8px rgba(56,189,248,0.5))" }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8,textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}>{s.hydrogen}% H₂</div>
          </div>
        </div>
        <div style={{ position:"absolute",bottom:12,left:16,display:"flex",gap:8 }}>
          <Badge label={`${s.open}/${s.bays} Open`} color={T.green}/>
          <Badge label={`Wait: ${s.time}`} color={T.yellow}/>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
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
        <button onClick={()=>go("vehicles")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:14,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-bolt"/> Charge Here — Select Vehicle
        </button>
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
              <button className="tap" onClick={e=>{ e.stopPropagation();setStation(st);go("booking"); }}
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

function Vehicles({ go,setVehicle }) {
  const [sel,setSel] = useState(null);
  const vehicleImages={ Car:"/car-charging.jpg",Scooter:"/scooter-charging.jpg",Tricycle:"/tricycle-charging.jpg" };
  const vehicleColors={ Car:T.green,Scooter:T.blue,Tricycle:T.yellow };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" sub="Choose your vehicle type" onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`} onClick={()=>setSel(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",border:`2px solid ${sel?.type===v.type?T.green:T.border}`,transition:"border-color .2s" }}>
            <div style={{ height:180,position:"relative",overflow:"hidden" }}>
              <img src={vehicleImages[v.type]} alt={v.type} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.8)" }}
                onError={e=>{ e.target.style.display="none"; }}/>
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
        <button onClick={()=>{ if(sel){ setVehicle(sel);go("booking"); } }} className="tap"
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
  const [payHow,setPayHow]=useState("now");
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
    const data={ reference:ref,station:s.name,city:s.city,vehicle:vehicle?.type||"Car",slot_time:slots[slotIdx].toISOString(),duration_min:dur.value,amount:total,name,phone,email,pay_method:payHow,status:payHow==="now"?"pending_payment":"confirmed",created_at:new Date().toISOString() };
    if (SUPABASE_URL) await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.stringify(data) });
    setBooking(data);
    try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
    if (payHow==="now") {
      window.location.href=`https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(email)}&amount=${total*100}&reference=${ref}`;
    } else { setLoad(false);go("qr"); }
  };

  const inp=(ph,val,set,type="text",icon="fa-user")=>(
    <div style={{ position:"relative",marginBottom:10 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px 12px 40px",color:T.text,fontSize:14 }}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Book a Slot" sub={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 120px" }}>
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <i className={`fas ${vehicle?.type==="Scooter"?"fa-motorcycle":vehicle?.type==="Tricycle"?"fa-truck":"fa-car"}`} style={{ fontSize:40,color:T.green,opacity:0.7 }}/>
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
            <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>Total</span>
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
          {[{ id:"now",label:"Pay now to confirm",sub:"Instant booking via Paystack",icon:"fa-lock" },{ id:"arrive",label:"Pay on arrival",sub:"Reserve now, pay at station",icon:"fa-store" }].map(m=>(
            <div key={m.id} className="tap row" onClick={()=>setPayHow(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRadius:12,marginBottom:8,cursor:"pointer",background:payHow===m.id?"#132010":"transparent",border:`1px solid ${payHow===m.id?T.greenDim:T.border}` }}>
              <i className={`fas ${m.icon}`} style={{ fontSize:16,color:payHow===m.id?T.green:T.muted }}/>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>{m.label}</div>
                <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.sub}</div>
              </div>
              <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,border:`2px solid ${payHow===m.id?T.green:T.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {payHow===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",background:T.green }}/>}
              </div>
            </div>
          ))}
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}
        <button onClick={book} disabled={loading} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,color:"#000",cursor:loading?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1 }}>
          {loading?<><Spinner/> Processing…</>:payHow==="now"?<><i className="fas fa-lock"/> Pay GH₵{total} & Confirm</>:<><i className="fas fa-calendar-check"/> Reserve Slot — Pay on Arrival</>}
        </button>
      </div>
    </div>
  );
}

function QRScreen({ go, booking, setBooking }) {
  const [charging,setCharging] = useState(false);
  const [elapsed,setElapsed]   = useState(0);
  const [energy,setEnergy]     = useState(0);

  let b = booking;
  if (!b) { try { const s=localStorage.getItem("eco_booking"); if(s) b=JSON.parse(s); } catch(e){} }

  useEffect(()=>{
    if (!charging) return;
    const t = setInterval(()=>{
      setElapsed(e=>e+1);
      setEnergy(e=>+(e+0.002).toFixed(3));
    },1000);
    return ()=>clearInterval(t);
  },[charging]);

  const fmtElapsed = (s) => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const power = 7.4;
  const pct   = b?.duration_min ? Math.min(100,Math.round((elapsed/(b.duration_min*60))*100)) : Math.min(100,Math.round((elapsed/3600)*100));

  if (!b) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-ticket-alt" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active Booking</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:24 }}>Complete a booking to get your pass</div>
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

  // CHARGING ACTIVE SCREEN
  if (charging) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging" onBack={()=>setCharging(false)}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        {/* Status badge */}
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ display:"inline-block",background:"rgba(56,189,248,0.15)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:20,padding:"6px 20px" }}>
            <span style={{ fontSize:12,fontWeight:700,color:T.blue,letterSpacing:1 }}>CHARGING IN PROGRESS</span>
          </div>
        </div>

        {/* Circular progress */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28 }}>
          <div style={{ position:"relative",width:180,height:180 }}>
            <svg width="180" height="180" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
              <circle cx="90" cy="90" r="80" fill="none" stroke="url(#chargeGrad)" strokeWidth="12"
                strokeDasharray={`${2*Math.PI*80}`}
                strokeDashoffset={`${2*Math.PI*80*(1-pct/100)}`}
                strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
              <defs>
                <linearGradient id="chargeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={T.green}/>
                  <stop offset="100%" stopColor={T.blue}/>
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <div style={{ fontWeight:900,fontSize:40,color:T.text }}>{pct}%</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>State of Charge</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20 }}>
          {[
            { label:"Energy",   value:`${energy} kWh`, icon:"fa-bolt"  },
            { label:"Power",    value:`${power} kW`,   icon:"fa-plug"  },
            { label:"Time",     value:fmtElapsed(elapsed), icon:"fa-clock" },
          ].map(s=>(
            <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px 10px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <i className={`fas ${s.icon}`} style={{ fontSize:14,color:T.green,marginBottom:6,display:"block" }}/>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{s.label}</div>
              <div style={{ fontWeight:800,fontSize:14,color:T.text }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Session info */}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",marginBottom:20,border:`1px solid ${T.border}` }}>
          {[
            { label:"Session ID", value:b.reference },
            { label:"End Time",   value:b.slot_time ? new Date(new Date(b.slot_time).getTime()+(b.duration_min||60)*60000).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" }) : "--:--" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13,fontFamily:"monospace" }}>{r.value}</span>
            </div>
          ))}
          <div style={{ fontSize:11,color:T.muted,textAlign:"center",marginTop:4 }}>
            <i className="fas fa-sun" style={{ color:T.yellow,marginRight:6 }}/>Thank you for using solar energy ⚡
          </div>
        </div>

        {/* Stop button */}
        <button onClick={()=>{ setCharging(false);setElapsed(0);setEnergy(0); }} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.red},#dc2626)`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <i className="fas fa-stop-circle"/> Stop Charging
        </button>
      </div>
    </div>
  );

  // CHARGING PASS SCREEN
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" sub="Show QR or tap Start Charging" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>

        {/* Ready badge */}
        <div style={{ textAlign:"center",marginBottom:16 }}>
          <div style={{ display:"inline-block",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,borderRadius:20,padding:"7px 24px" }}>
            <span style={{ fontSize:12,fontWeight:800,color:"#000",letterSpacing:1 }}>READY TO CHARGE</span>
          </div>
        </div>

        {/* QR Card */}
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:20,padding:"20px",textAlign:"center",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ background:"#0f1117",borderRadius:16,padding:14,display:"inline-block",border:`2px solid ${T.greenDim}`,marginBottom:12,position:"relative" }}>
            <img src={qrUrl} alt="QR" width={190} height={190} style={{ borderRadius:8,display:"block" }}/>
            {/* Center logo overlay */}
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:36,height:36,borderRadius:8,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${T.greenDim}` }}>
              <i className="fas fa-bolt" style={{ fontSize:16,color:T.green }}/>
            </div>
          </div>
          <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}>Booking Reference</div>
          <div style={{ fontWeight:800,fontSize:18,color:T.green,letterSpacing:2 }}>{b.reference}</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:6 }}>Show QR to attendant or start charging ⚡</div>
        </div>

        {/* Session details */}
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          {[
            { label:"Station",  value:b.station,  icon:"fa-map-marker-alt" },
            { label:"Vehicle",  value:b.vehicle,  icon:"fa-car"            },
            { label:"Date & Time", value:b.slot_time?new Date(b.slot_time).toLocaleString("en-GH",{ day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit" }):"--", icon:"fa-calendar-alt" },
            { label:"Duration", value:`${b.duration_min} min`, icon:"fa-hourglass-half" },
            { label:"Amount",   value:`GH₵${b.amount}`, icon:"fa-money-bill-alt" },
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

        {/* START CHARGING button */}
        <button onClick={()=>setCharging(true)} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"17px",fontSize:16,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,boxShadow:`0 4px 20px rgba(74,222,128,0.4)` }}>
          <i className="fas fa-bolt"/> Start Charging
        </button>

        <button onClick={()=>go("map")} className="tap"
          style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-map-marker-alt"/> View Station Directions
        </button>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

) {
  let b=booking;
  if (!b) { try { const s=localStorage.getItem("eco_booking"); if(s) b=JSON.parse(s); } catch(e){} }
  if (!b) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-ticket-alt" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active Booking</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:24 }}>Complete a booking to get your pass</div>
          <button onClick={()=>go("home")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,margin:"0 auto" }}>
            <i className="fas fa-map-marker-alt"/> Find a Station
          </button>
        </div>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
  const qrData=encodeURIComponent(`${b.reference}|${b.station}|${b.vehicle}|${b.status}`);
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=10`;
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" sub="Show this to the attendant" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:20,padding:24,textAlign:"center",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Booking Reference</div>
          <div style={{ fontWeight:800,fontSize:22,color:T.green,letterSpacing:2,marginBottom:16 }}>{b.reference}</div>
          <div style={{ background:"#0f1117",borderRadius:16,padding:12,display:"inline-block",border:`2px solid ${T.greenDim}`,marginBottom:12 }}>
            <img src={qrUrl} alt="QR" width={180} height={180} style={{ borderRadius:8,display:"block" }}/>
          </div>
          <div style={{ fontSize:12,color:T.muted }}>Attendant scans to activate your charger</div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-info-circle" style={{ marginRight:8,color:T.green }}/> Session Details</div>
          {[{ label:"Station",value:b.station,icon:"fa-plug" },{ label:"Vehicle",value:b.vehicle,icon:"fa-car" },{ label:"Duration",value:`${b.duration_min} min`,icon:"fa-clock" },{ label:"Amount",value:`GH₵${b.amount}`,icon:"fa-money-bill-alt" },{ label:"Payment",value:b.pay_method==="now"?"Paid ✅":"Pay on Arrival",icon:"fa-credit-card" }].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <i className={`fas ${r.icon}`} style={{ fontSize:12,color:T.muted,width:14 }}/>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              </div>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>go("verify")} className="tap"
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px",fontSize:13,fontWeight:600,color:T.mutedLight,cursor:"pointer",marginBottom:10,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-shield-alt"/> Attendant Verification Portal
        </button>
        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-home"/> Back to Home
        </button>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function Verify({ go }) {
  const [code,setCode]     = useState("");
  const [result,setResult] = useState(null);
  const [loading,setLoad]  = useState(false);
  const [error,setErr]     = useState("");

  const verify = async () => {
    if (!code.trim()) { setErr("Enter a booking reference"); return; }
    setLoad(true); setErr(""); setResult(null);
    try {
      const raw = code.trim().toUpperCase();
      const ref = raw.includes("|")?raw.split("|")[0].trim():raw;
      const data = await sb(`bookings?reference=eq.${ref}&select=*`);
      if (!data||data.length===0) { setErr(`Booking "${ref}" not found.`); }
      else {
        const b = data[0];
        if (SUPABASE_URL) await sb(`bookings?id=eq.${b.id}`,{ method:"PATCH",headers:{ Prefer:"return=minimal" },body:JSON.stringify({ verified:true,verified_at:new Date().toISOString() }) });
        setResult(b);
      }
    } catch(e) { setErr("Verification failed. Check internet connection."); }
    setLoad(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Verify Booking" sub="Attendant Portal" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 80px" }}>

        {/* Scan QR */}
        <div style={{ background:T.card,borderRadius:16,padding:"18px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:6 }}>
            <i className="fas fa-qrcode" style={{ marginRight:8,color:T.green }}/> Scan QR Code
          </div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Use camera to scan booking QR</div>
          <button className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-camera"/> Open Camera
          </button>
        </div>

        {/* Divider */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
          <div style={{ flex:1,height:1,background:T.border }}/>
          <span style={{ fontSize:12,color:T.muted }}>or enter reference manually</span>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>

        {/* Manual entry */}
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13,color:T.muted,marginBottom:10 }}>Enter booking reference</div>
          <div style={{ position:"relative",marginBottom:12 }}>
            <i className="fas fa-hashtag" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
            <input placeholder="ECO-BK-XXXXXX" value={code} onChange={e=>{ setCode(e.target.value.toUpperCase());setErr("");setResult(null); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 14px 14px 40px",color:T.text,fontSize:16,fontFamily:"monospace",letterSpacing:1 }}/>
          </div>
          <button onClick={verify} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            {loading?<><Spinner/> Verifying…</>:<><i className="fas fa-search"/> Verify</>}
          </button>
        </div>

        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"12px 16px",marginBottom:12,color:T.red,fontSize:13,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}

        {result&&(
          <div className="fade" style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,borderRadius:16,padding:"18px",marginBottom:12 }}>
            {/* Verification Result header */}
            <div style={{ textAlign:"center",marginBottom:16 }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px" }}>
                <i className="fas fa-check" style={{ fontSize:26,color:"#000" }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:18,color:T.green }}>Booking Verified</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>This booking is valid</div>
            </div>
            {[
              { label:"Name",     value:result.name    },
              { label:"Vehicle",  value:result.vehicle },
              { label:"Station",  value:result.station },
              { label:"Date & Time",value:result.slot_time?new Date(result.slot_time).toLocaleString("en-GH",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" }):"--" },
              { label:"Amount",   value:`GH₵${result.amount}` },
            ].map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
              </div>
            ))}
            {/* Authorize button */}
            <button className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"15px",textAlign:"center",marginTop:8,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:15,fontWeight:800,color:"#000" }}>
              <i className="fas fa-bolt"/> Authorize & Start Charging
            </button>
          </div>
        )}
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}

) {
  const [code,setCode]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoad]=useState(false);
  const [error,setErr]=useState("");
  const verify=async()=>{
    if (!code.trim()) { setErr("Enter a booking reference");return; }
    setLoad(true);setErr("");setResult(null);
    try {
      const raw=code.trim().toUpperCase();
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
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Verify Booking" sub="Attendant portal" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 80px" }}>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-search" style={{ marginRight:8,color:T.green }}/> Enter Booking Reference</div>
          <div style={{ position:"relative",marginBottom:12 }}>
            <i className="fas fa-hashtag" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
            <input placeholder="e.g. ECO-ABC123" value={code} onChange={e=>{ setCode(e.target.value.toUpperCase());setErr("");setResult(null); }}
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 14px 14px 40px",color:T.text,fontSize:16,fontFamily:"monospace",letterSpacing:1 }}/>
          </div>
          <button onClick={verify} disabled={loading} className="tap"
            style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            {loading?<><Spinner/> Verifying…</>:<><i className="fas fa-shield-alt"/> Verify Booking</>}
          </button>
        </div>
        {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"12px 16px",marginBottom:12,color:T.red,fontSize:13,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-triangle"/> {error}</div>}
        {result&&(
          <div className="fade" style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}`,borderRadius:16,padding:"16px",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
              <div style={{ width:48,height:48,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <i className="fas fa-check" style={{ fontSize:22,color:"#000" }}/>
              </div>
              <div>
                <div style={{ fontWeight:800,fontSize:16,color:T.green }}>Verified — Activate Charger</div>
                <div style={{ fontSize:12,color:T.muted }}>Booking confirmed and valid</div>
              </div>
            </div>
            {[{ label:"Name",value:result.name,icon:"fa-user" },{ label:"Phone",value:result.phone,icon:"fa-phone" },{ label:"Vehicle",value:result.vehicle,icon:"fa-car" },{ label:"Duration",value:`${result.duration_min} min`,icon:"fa-clock" },{ label:"Amount",value:`GH₵${result.amount}`,icon:"fa-money-bill-alt" },{ label:"Payment",value:result.pay_method==="now"?"PAID ✅":`Collect GH₵${result.amount}`,icon:"fa-credit-card" }].map(r=>(
              <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <i className={`fas ${r.icon}`} style={{ fontSize:12,color:T.muted,width:14 }}/>
                  <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                </div>
                <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
              </div>
            ))}
            <div style={{ background:T.green,borderRadius:12,padding:"14px",textAlign:"center",marginTop:8 }}>
              <i className="fas fa-bolt" style={{ fontSize:18,color:"#000",marginRight:8 }}/>
              <span style={{ fontWeight:800,fontSize:16,color:"#000" }}>ACTIVATE CHARGER NOW</span>
            </div>
          </div>
        )}
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}

function Profile({ go, user, setUser, onMenu }) {
  const [imgErr,setImgErr] = useState(false);
  const fileRef = useRef(null);
  const [avatar,setAvatar] = useState(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Pull real stats from booking history
  const booking = (() => { try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } })();
  const totalCharges = booking ? 1 : 0;
  const totalSpent   = booking ? booking.amount : 0;
  const co2Saved     = totalCharges * 4; // ~4kg per charge
  const waterReceived= totalCharges * 20; // 20L per charge

  const menuItems = [
    { icon:"fa-car",            label:"My Vehicles",     screen:"detail",  color:T.mutedLight },
    { icon:"fa-credit-card",    label:"Payment Methods", screen:"home",    color:T.mutedLight },
    { icon:"fa-cog",            label:"Settings",        screen:"about",   color:T.mutedLight },
    { icon:"fa-question-circle",label:"Help & Support",  screen:"about",   color:T.mutedLight },
    { icon:"fa-info-circle",    label:"About EcoCharge", screen:"about",   color:T.mutedLight },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" sub="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {user ? (
          <>
            {/* Profile card */}
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",borderRadius:18,padding:"24px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              {/* Avatar with upload */}
              <div style={{ position:"relative",display:"inline-block",marginBottom:14 }}>
                <div style={{ width:80,height:80,borderRadius:"50%",overflow:"hidden",border:`3px solid ${T.green}`,margin:"0 auto" }}>
                  {avatar ? (
                    <img src={avatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  ) : (
                    <div style={{ width:"100%",height:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <i className="fas fa-user" style={{ fontSize:32,color:"#000" }}/>
                    </div>
                  )}
                </div>
                {/* Camera button */}
                <button onClick={()=>fileRef.current?.click()} className="tap"
                  style={{ position:"absolute",bottom:-2,right:-2,width:28,height:28,borderRadius:"50%",background:T.green,border:`2px solid ${T.bg}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                  <i className="fas fa-camera" style={{ fontSize:11,color:"#000" }}/>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:20,color:T.text }}>{user.name||user.email?.split("@")[0]}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4,marginBottom:12 }}>{user.email||user.phone}</div>
              <Badge label="Active Member" color={T.green}/>
            </div>

            {/* Stats row */}
            <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:16,border:`1px solid ${T.border}` }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8 }}>
                {[
                  { label:"Charges",  value:totalCharges,          color:T.green,  icon:"fa-bolt"          },
                  { label:"CO₂ Saved",value:`${co2Saved}kg`,       color:T.green,  icon:"fa-leaf"          },
                  { label:"Water",    value:`${waterReceived}L`,   color:T.blue,   icon:"fa-tint"          },
                  { label:"Spent",    value:`GH₵${totalSpent}`,    color:T.yellow, icon:"fa-money-bill-alt"},
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <i className={`fas ${s.icon}`} style={{ fontSize:16,color:s.color,marginBottom:6,display:"block" }}/>
                    <div style={{ fontWeight:800,fontSize:16,color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:9,color:T.muted,marginTop:2,textTransform:"uppercase",letterSpacing:0.3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu items */}
            <div className="fade2" style={{ background:T.card,borderRadius:16,border:`1px solid ${T.border}`,marginBottom:16,overflow:"hidden" }}>
              {menuItems.map((item,i)=>(
                <div key={item.label} className="tap row" onClick={()=>go(item.screen)}
                  style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 16px",borderBottom:i<menuItems.length-1?`1px solid ${T.border}20`:"none",cursor:"pointer" }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <i className={`fas ${item.icon}`} style={{ fontSize:15,color:item.color }}/>
                  </div>
                  <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</span>
                  <i className="fas fa-chevron-right" style={{ fontSize:12,color:T.muted }}/>
                </div>
              ))}
            </div>

            {/* Sign out */}
            <button onClick={()=>setUser(null)} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
              <i className="fas fa-sign-out-alt"/> Sign Out
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"40px 16px" }}>
            <i className="fas fa-user-circle" style={{ fontSize:80,color:T.muted,marginBottom:16,display:"block" }}/>
            <div style={{ fontWeight:800,fontSize:22,color:T.text,marginBottom:8 }}>Your Profile</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.8 }}>
              Track charges, view bookings,<br/>and see your environmental impact.
            </div>
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

) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" sub="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {user?(
          <>
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",borderRadius:18,padding:"22px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              <div style={{ width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                <i className="fas fa-user" style={{ fontSize:28,color:"#000" }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:20,color:T.text }}>{user.name||user.email}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:4,marginBottom:12 }}>{user.email}</div>
              <Badge label="Active Member" color={T.green}/>
            </div>
            <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
              {[{ label:"Total Charges",value:"0",color:T.green,icon:"fa-bolt" },{ label:"CO₂ Saved",value:"0 kg",color:T.green,icon:"fa-leaf" },{ label:"Water Received",value:"0 L",color:T.blue,icon:"fa-tint" },{ label:"Total Spent",value:"GH₵0",color:T.yellow,icon:"fa-money-bill-alt" }].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <i className={`fas ${s.icon}`} style={{ fontSize:20,color:s.color,marginBottom:8,display:"block" }}/>
                  <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
                  <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setUser(null)} className="tap"
              style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit" }}>
              <i className="fas fa-sign-out-alt"/> Sign Out
            </button>
          </>
        ):(
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

function About({ go,onMenu }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="About EcoCharge" sub="Our mission" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        <div className="fade" style={{ textAlign:"center",marginBottom:24 }}>
          <Logo size={82}/>
          <div style={{ fontWeight:900,fontSize:24,color:T.text,marginTop:14,letterSpacing:-0.5 }}>EcoCharge Ghana</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>Solar Charging · Clean Water · Zero Emissions</div>
        </div>
        {[{ icon:"fa-sun",color:T.yellow,title:"Solar EV Charging",text:"100% solar-powered stations across Ghana providing clean, affordable EV charging." },{ icon:"fa-tint",color:T.blue,title:"Clean Water Access",text:"Every charging session includes 20L of clean desalinated water for you and your family." },{ icon:"fa-leaf",color:T.green,title:"Zero Emissions",text:"Our stations run on solar and hydrogen energy — zero carbon footprint." },{ icon:"fa-users",color:T.mutedLight,title:"Local Employment",text:"We train and employ local Ghanaians at every station across the country." }].map((item,i)=>(
          <div key={i} style={{ background:T.card,borderRadius:14,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ width:44,height:44,borderRadius:12,flexShrink:0,background:`${item.color}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <i className={`fas ${item.icon}`} style={{ fontSize:18,color:item.color }}/>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:5 }}>{item.title}</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{item.text}</div>
            </div>
          </div>
        ))}
        <button onClick={()=>go("home")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-bolt"/> Find a Station
        </button>
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}


function Bookings({ go, booking, user }) {
  const [now, setNow] = useState(new Date());

  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()), 1000);
    return ()=>clearInterval(t);
  },[]);

  // Try localStorage
  let b = booking;
  if (!b) {
    try {
      const s = localStorage.getItem("eco_booking");
      if (s) b = JSON.parse(s);
    } catch(e){}
  }

  // Countdown calculation
  const getCountdown = (b) => {
    if (!b?.slot_time || !b?.duration_min) return null;
    const start = new Date(b.slot_time);
    const end   = new Date(start.getTime() + b.duration_min * 60000);
    const diff  = end - now;
    if (diff <= 0) return { done:true, pct:100 };
    const started = now >= start;
    if (!started) {
      const wait = start - now;
      const wm = Math.floor(wait/60000);
      const ws = Math.floor((wait%60000)/1000);
      return { waiting:true, label:`Starts in ${wm}m ${ws}s`, pct:0 };
    }
    const elapsed = now - start;
    const total   = b.duration_min * 60000;
    const pct     = Math.min(100, Math.round((elapsed/total)*100));
    const rem     = end - now;
    const rm = Math.floor(rem/60000);
    const rs = Math.floor((rem%60000)/1000);
    return { active:true, label:`${rm}m ${rs}s remaining`, pct };
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Bookings" sub="Your charging sessions" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {b ? (
          <>
            {/* Active booking card */}
            {(()=>{
              const cd = getCountdown(b);
              return (
                <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:18,padding:"18px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Active Booking</div>
                      <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{b.station}</div>
                      <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{b.vehicle} · {b.duration_min} min session</div>
                    </div>
                    <div style={{ background:b.status==="confirmed"?"rgba(74,222,128,0.15)":"rgba(251,191,36,0.15)",borderRadius:10,padding:"5px 12px" }}>
                      <span style={{ fontSize:11,fontWeight:700,color:b.status==="confirmed"?T.green:T.yellow }}>
                        {b.status==="confirmed"?"✓ Confirmed":"Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Countdown */}
                  {cd && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                        <span style={{ fontSize:12,color:T.muted }}>
                          {cd.done?"Session complete":cd.waiting?cd.label:"Time remaining"}
                        </span>
                        <span style={{ fontSize:12,fontWeight:700,color:T.green }}>
                          {cd.done?"Done ✅":cd.active?cd.label:""}
                        </span>
                      </div>
                      <div style={{ height:8,borderRadius:4,background:"rgba(255,255,255,0.08)",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${cd.pct}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,transition:"width 1s linear",borderRadius:4 }}/>
                      </div>
                      {cd.active && (
                        <div style={{ textAlign:"center",marginTop:12 }}>
                          <div style={{ fontWeight:900,fontSize:36,color:T.green,fontFamily:"monospace",letterSpacing:2 }}>{cd.label}</div>
                          <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>charging in progress</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details */}
                  {[
                    { label:"Reference", value:b.reference },
                    { label:"Amount",    value:`GH₵${b.amount}` },
                    { label:"Payment",   value:b.pay_method==="now"?"Paid ✅":"Pay on Arrival" },
                    { label:"Water",     value:"20L included 💧" },
                  ].map(r=>(
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

            {/* Rewards teaser */}
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
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>
                Every charge earns you points. Redeem for <span style={{ color:T.yellow,fontWeight:600 }}>airtime</span>, <span style={{ color:T.green,fontWeight:600 }}>discounted charging</span>, and more!
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign:"center",padding:"50px 20px" }}>
            <i className="fas fa-calendar-times" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
            <div style={{ fontWeight:700,fontSize:18,color:T.text,marginBottom:8 }}>No Bookings Yet</div>
            <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.8 }}>
              Find a station and book your<br/>first charging session
            </div>
            <button onClick={()=>go("map")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"14px 28px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,margin:"0 auto" }}>
              <i className="fas fa-map-marker-alt"/> Find a Station
            </button>
          </div>
        )}
      </div>
      <Nav active="Home" go={go}/>
    </div>
  );
}

export default function App() {
  const [screen,setScreen]   = useState(()=>{ try { return localStorage.getItem("eco_user")?"home":"splash"; } catch(e){ return "splash"; } });
  const [authMode,setAuthMode]= useState("login");
  const [station,setStation]  = useState(null);
  const [vehicle,setVehicle]  = useState(null);
  const [stations,setStations]= useState(STATIONS);
  const [booking,setBooking]  = useState(()=>{ try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } });
  const [user,setUserRaw]     = useState(()=>{ try { const u=localStorage.getItem("eco_user"); return u?JSON.parse(u):null; } catch(e){ return null; } });
  const [drawer,setDrawer]    = useState(false);

  const setUser=(u)=>{ setUserRaw(u); try { u?localStorage.setItem("eco_user",JSON.stringify(u)):localStorage.removeItem("eco_user"); } catch(e){} };
  const go=(s)=>{ setScreen(s);setDrawer(false); };
  const goSecure=(s)=>{ const open=["splash","auth","about","home","detail","verify","map"]; if(!user&&!open.includes(s)){ setAuthMode("login");go("auth");return; } go(s); };

  useEffect(()=>{
    if (SUPABASE_URL) sb("stations?select=*&order=id").then(d=>{ if(d?.length) setStations(d); });

    // Handle Google OAuth callback
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const hp = new URLSearchParams(hash.replace("#",""));
      const token = hp.get("access_token");
      if (token && SUPABASE_URL) {
        fetch(`${SUPABASE_URL}/auth/v1/user`,{ headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${token}` } })
          .then(r=>r.json())
          .then(u=>{ 
            if (u?.email) {
              const usr = { email:u.email, name:u.user_metadata?.full_name||u.email.split("@")[0], token, id:u.id };
              setUser(usr);
              window.history.replaceState({},"",window.location.pathname);
              setScreen("home");
            }
          }).catch(()=>{});
      }
    }

    // Handle Paystack redirect after payment
    const params=new URLSearchParams(window.location.search);
    const ref=params.get("reference")||params.get("trxref");
    if (ref) {
      window.history.replaceState({},"",window.location.pathname);
      try {
        const saved=localStorage.getItem("eco_booking");
        if (saved) {
          const parsed=JSON.parse(saved);
          const updated={ ...parsed,status:"confirmed",pay_method:"now" };
          setBooking(updated);
          localStorage.setItem("eco_booking",JSON.stringify(updated));
        }
      } catch(e){}
      if (SUPABASE_URL) {
        sb(`bookings?reference=eq.${ref}&select=*`).then(data=>{
          if (data&&data.length>0) {
            const b=data[0];
            sb(`bookings?id=eq.${b.id}`,{ method:"PATCH",headers:{ Prefer:"return=minimal" },body:JSON.stringify({ status:"confirmed",payment_confirmed:true }) });
            const updated={ ...b,status:"confirmed",pay_method:"now" };
            setBooking(updated);
            try { localStorage.setItem("eco_booking",JSON.stringify(updated)); } catch(e){}
          }
        });
      }
      setTimeout(()=>{ setScreen("qr"); },150);
    }
  },[]);

  const props={ go:goSecure,stations,station:station||stations[0],setStation,user,setUser,vehicle,setVehicle,booking,setBooking,onMenu:()=>setDrawer(true) };

  if (screen==="splash") return <><style>{CSS}</style><Splash onLogin={()=>{ setAuthMode("login");go("auth"); }} onRegister={()=>{ setAuthMode("register");go("auth"); }} onGuest={()=>go("home")}/></>;
  if (screen==="auth") return <><style>{CSS}</style><Auth mode={authMode} onBack={(mode)=>{ if(mode){ setAuthMode(mode); } else { go("splash"); } }} onSuccess={(u)=>{ setUser(u);go("home"); }}/></>;

  const views={ home:<Home {...props}/>,map:<MapScreen {...props}/>,detail:<Detail {...props}/>,vehicles:<Vehicles {...props}/>,booking:<Booking {...props}/>,bookings:<Bookings {...props}/>,qr:<QRScreen {...props}/>,verify:<Verify {...props}/>,profile:<Profile {...props}/>,about:<About {...props}/> };

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
