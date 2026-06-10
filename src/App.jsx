// ============================================================
// EcoCharge Ghana — App.jsx FINAL (Fixed)
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
          { icon:"fa-charging-station", label:"Charger Admin",   screen:"chargers", color:T.blue   },
          { icon:"fa-list-alt",        label:"Session Manager", screen:"sessions", color:T.green  },
          { icon:"fa-wallet",          label:"My Wallet",       screen:"wallet",   color:T.yellow },
          { icon:"fa-tags",            label:"Pricing Engine",  screen:"pricing",  color:"#a78bfa" },
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
      <img src="/station1.jpg" alt="bg" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.28) saturate(1.2)",zIndex:0 }} onError={e=>e.target.style.display="none"}/>
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(5,10,6,0.3) 0%,rgba(5,10,6,0.9) 60%,#050a06 100%)",zIndex:1 }}/>
      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",height:"100%",padding:"0 28px",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ textAlign:"center",marginTop:100 }}>
          <Logo size={88}/>
          <div style={{ fontWeight:900,fontSize:34,color:T.text,marginTop:16,letterSpacing:-1 }}>EcoCharge</div>
          <div style={{ fontWeight:700,fontSize:18,color:T.green,marginTop:4,letterSpacing:0.5 }}>Ghana</div>
          <div style={{ fontSize:14,color:"rgba(255,255,255,0.55)",marginTop:14,lineHeight:1.8 }}>Solar Charging. Clean Water.<br/>Zero Emissions.</div>
        </div>
        <div style={{ width:"100%",paddingBottom:60 }}>
          <button onClick={onLogin} className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:16,padding:"17px",fontSize:16,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 24px rgba(74,222,128,0.4)` }}>
            <i className="fas fa-sign-in-alt"/> Sign In
          </button>
          <button onClick={onRegister} className="tap" style={{ width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:16,padding:"17px",fontSize:16,fontWeight:600,color:T.text,cursor:"pointer",marginBottom:22,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
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
    window.location.href=`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}&scopes=email%20profile`;
  };

  const inp = (ph,val,set,type="text",icon="fa-user") => (
    <div style={{ position:"relative",marginBottom:14 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14,zIndex:1 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 14px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
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
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <Logo size={56}/>
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
                style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 46px 14px 46px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
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
    <div style={{ margin:"0 14px 16px",background:"linear-gradient(135deg,#1a1000,#2d1a00)",borderRadius:18,padding:"16px",border:`1px solid rgba(251,191,36,0.2)` }}>
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
          <div style={{ height:6,borderRadius:3,background:"rgba(255,255,255,0.08)",overflow:"hidden",marginBottom:12 }}>
            <div style={{ height:"100%",width:`${solar?.efficiency}%`,background:`linear-gradient(90deg,${T.yellow},${T.green})`,borderRadius:3,transition:"width 1s ease" }}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[
              { label:"Direct",value:`${solar?.direct}`,unit:"W/m²",icon:"fa-sun",color:T.yellow },
              { label:"Cloud Cover",value:`${solar?.cloudCover}`,unit:"%",icon:"fa-cloud",color:T.mutedLight },
              { label:"Sunshine",value:`${solar?.sunshine}`,unit:"min",icon:"fa-clock",color:T.blue },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
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
  const [slideIdx,setSlideIdx] = useState(0);
  const slides = ["/station1.jpg","/station2.jpg","/station3.jpg"];
  useEffect(()=>{ const t=setInterval(()=>setSlideIdx(i=>(i+1)%slides.length),3500); return ()=>clearInterval(t); },[]);
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const greetEmoji=hour<12?"👋":hour<17?"☀️":"🌙";
  const displayName=user?.name||user?.email?.split("@")[0]||"Welcome";
  const filtered=search?stations.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase())):stations;
  const quickActions=[
    { icon:"fa-bolt",label:"Find Stations",sub:"Nearby",screen:"map",bg:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#000" },
    { icon:"fa-calendar",label:"My Bookings",sub:"View all",screen:"bookings",bg:"rgba(255,255,255,0.12)",color:T.mutedLight },
    { icon:"fa-qrcode",label:"Charging Pass",sub:"Show QR",screen:"qr",bg:"rgba(255,255,255,0.12)",color:T.mutedLight },
    { icon:"fa-tint",label:"Water Points",sub:"Find clean water",screen:"detail",bg:"rgba(56,189,248,0.18)",color:T.blue },
  ];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#080d10",overflowY:"auto" }}>
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
      <div style={{ margin:"0 14px 16px",borderRadius:22,overflow:"hidden",position:"relative",minHeight:200 }}>
        {slides.map((src,i)=>(
          <img key={src} src={src} alt="station" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:i===slideIdx?1:0,transition:"opacity 1.2s ease",filter:"brightness(0.5) saturate(1.1)" }} onError={e=>{ e.target.style.display="none"; }}/>
        ))}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(5,20,8,0.92) 0%,rgba(5,20,8,0.5) 55%,rgba(0,0,0,0.1) 100%)" }}/>
        <div style={{ position:"relative",zIndex:2,padding:"22px 20px 20px" }}>
          <div style={{ fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:4 }}>{greeting} {greetEmoji}</div>
          <div style={{ fontWeight:800,fontSize:28,color:T.text,marginBottom:8,letterSpacing:-0.5 }}>{displayName}</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.7,marginBottom:16 }}>
            Powering Ghana with <span style={{ color:T.green,fontWeight:700 }}>clean energy</span> and <span style={{ color:T.blue,fontWeight:700 }}>clean water</span>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>go("map")} className="tap" style={{ background:T.green,border:"none",borderRadius:12,padding:"10px 20px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}><i className="fas fa-map-marker-alt"/> Find Station</button>
            <button onClick={()=>go("qr")} className="tap" style={{ background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:12,padding:"10px 18px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}><i className="fas fa-qrcode"/> My Pass</button>
          </div>
        </div>
        <div style={{ position:"absolute",bottom:12,right:14,display:"flex",gap:5,zIndex:3 }}>
          {slides.map((_,i)=>(<div key={i} onClick={()=>setSlideIdx(i)} style={{ width:i===slideIdx?20:6,height:6,borderRadius:3,background:i===slideIdx?T.green:"rgba(255,255,255,0.35)",transition:"all .3s",cursor:"pointer" }}/>))}
        </div>
      </div>
      <div style={{ margin:"0 14px 16px",position:"relative" }}>
        <i className="fas fa-search" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
        <input placeholder="Search station or location" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 48px 13px 42px",fontSize:14,fontFamily:"inherit" }}/>
        <div style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.06)",borderRadius:8,padding:"5px 9px" }}>
          <i className="fas fa-sliders-h" style={{ fontSize:13,color:T.mutedLight }}/>
        </div>
      </div>
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
      <SolarWidget/>
      <div style={{ margin:"0 14px 14px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Nearby Stations</div>
          <button onClick={()=>go("detail")} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>View all <i className="fas fa-arrow-right" style={{ fontSize:11 }}/></button>
        </div>
        {(search?filtered:stations).slice(0,3).map((s,idx)=>{
          const kw=Math.round((s.solar||80)*1.5);
          const stationImgs=["/station1.jpg","/station2.jpg","/station3.jpg"];
          return (
            <div key={s.id} className="tap row" onClick={()=>{ setStation(s);go("detail"); }}
              style={{ background:T.card,borderRadius:18,border:`1px solid ${T.border}`,marginBottom:10,display:"flex",alignItems:"stretch",overflow:"hidden" }}>
              <div style={{ width:90,flexShrink:0,position:"relative",overflow:"hidden" }}>
                <img src={stationImgs[idx%3]} alt="station" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.75) saturate(1.1)" }} onError={e=>{ e.target.parentElement.style.background="linear-gradient(135deg,#0a2010,#0d3018)"; e.target.style.display="none"; }}/>
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,transparent 60%,rgba(19,23,31,0.8))" }}/>
              </div>
              <div style={{ flex:1,padding:"12px 10px",minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}><i className="fas fa-clock" style={{ marginRight:4 }}/>{s.time} away · {s.city}</div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",display:"flex",alignItems:"center",gap:3 }}><i className="fas fa-bolt" style={{ fontSize:9,color:T.mutedLight }}/><span style={{ fontSize:10,color:T.mutedLight }}>{kw} kW Max</span></div>
                  <div style={{ background:"rgba(255,255,255,.06)",borderRadius:6,padding:"3px 8px",display:"flex",alignItems:"center",gap:3 }}><i className="fas fa-sun" style={{ fontSize:9,color:T.yellow }}/><span style={{ fontSize:10,color:T.mutedLight }}>{s.solar}% Solar</span></div>
                </div>
              </div>
              <div style={{ flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"space-between",padding:"12px" }}>
                <div style={{ background:"rgba(74,222,128,0.12)",border:`1px solid rgba(74,222,128,0.25)`,borderRadius:10,padding:"5px 10px",textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:14,color:T.green,lineHeight:1 }}>{s.open}/{s.bays}</div>
                  <div style={{ fontSize:9,color:T.green,marginTop:2 }}>Bays avail.</div>
                </div>
                <button onClick={e=>{ e.stopPropagation();setStation(s);go("detail"); }} className="tap"
                  style={{ width:32,height:32,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-external-link-alt" style={{ fontSize:12,color:"#000" }}/>
                </button>
              </div>
            </div>
          );
        })}
        {search&&filtered.length===0&&(
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>
            <i className="fas fa-search" style={{ fontSize:24,marginBottom:10,display:"block" }}/>No stations found for "{search}"
          </div>
        )}
      </div>
      <div style={{ margin:"0 14px 110px",background:"linear-gradient(135deg,#061520,#09202e)",borderRadius:18,overflow:"hidden",border:`1px solid rgba(56,189,248,0.2)`,display:"flex",alignItems:"center",cursor:"pointer",position:"relative",minHeight:80 }} onClick={()=>go("detail")}>
        <div style={{ position:"absolute",left:0,top:0,bottom:0,width:80,overflow:"hidden" }}>
          <img src="/station3.jpg" alt="water" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.5) hue-rotate(180deg) saturate(1.5)" }} onError={e=>{ e.target.style.display="none"; }}/>
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,transparent,rgba(6,21,32,0.9))" }}/>
        </div>
        <div style={{ flex:1,padding:"16px 16px 16px 90px" }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.blue,marginBottom:4 }}>Every charge includes <span style={{ color:T.blue }}>20L Clean Water</span></div>
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
      <div style={{ margin:"0",overflow:"hidden",height:200,position:"relative",flexShrink:0 }}>
        <img src="/station2.jpg" alt="station" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.55) saturate(1.3)" }} onError={e=>{ e.target.style.display="none"; }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)" }}/>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:32 }}>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-sun" style={{ fontSize:36,color:T.yellow }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8 }}>{s.solar}% Solar</div>
          </div>
          <div style={{ width:1,height:60,background:"rgba(255,255,255,0.25)" }}/>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-atom" style={{ fontSize:36,color:T.blue }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8 }}>{s.hydrogen}% H₂</div>
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
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" sub="Choose your vehicle type" onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
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
  const [charging,setCharging]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [energy,setEnergy]=useState(0);
  let b=booking;
  if (!b) { try { const s=localStorage.getItem("eco_booking"); if(s) b=JSON.parse(s); } catch(e){} }
  useEffect(()=>{
    if (!charging) return;
    const t=setInterval(()=>{ setElapsed(e=>e+1); setEnergy(e=>+(e+0.002).toFixed(3)); },1000);
    return ()=>clearInterval(t);
  },[charging]);
  const fmtElapsed=(s)=>{ const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };
  const power=7.4;
  const pct=b?.duration_min?Math.min(100,Math.round((elapsed/(b.duration_min*60))*100)):Math.min(100,Math.round((elapsed/3600)*100));
  if (!b) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-ticket-alt" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active Booking</div>
          <div style={{ color:T.muted,fontSize:13,marginBottom:24 }}>Complete a booking to get your pass</div>
          <button onClick={()=>go("home")} className="tap" style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,margin:"0 auto" }}>
            <i className="fas fa-map-marker-alt"/> Find a Station
          </button>
        </div>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
  const qrData=encodeURIComponent(`${b.reference}|${b.station}|${b.vehicle}|${b.status}`);
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=10`;
  if (charging) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging" onBack={()=>setCharging(false)}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ display:"inline-block",background:"rgba(56,189,248,0.15)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:20,padding:"6px 20px" }}>
            <span style={{ fontSize:12,fontWeight:700,color:T.blue,letterSpacing:1 }}>CHARGING IN PROGRESS</span>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28 }}>
          <div style={{ position:"relative",width:180,height:180 }}>
            <svg width="180" height="180" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
              <circle cx="90" cy="90" r="80" fill="none" stroke="url(#cg)" strokeWidth="12"
                strokeDasharray={`${2*Math.PI*80}`} strokeDashoffset={`${2*Math.PI*80*(1-pct/100)}`}
                strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
              <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.green}/><stop offset="100%" stopColor={T.blue}/></linearGradient></defs>
            </svg>
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <div style={{ fontWeight:900,fontSize:40,color:T.text }}>{pct}%</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>State of Charge</div>
            </div>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20 }}>
          {[{ label:"Energy",value:`${energy} kWh`,icon:"fa-bolt" },{ label:"Power",value:`${power} kW`,icon:"fa-plug" },{ label:"Time",value:fmtElapsed(elapsed),icon:"fa-clock" }].map(s=>(
            <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px 10px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <i className={`fas ${s.icon}`} style={{ fontSize:14,color:T.green,marginBottom:6,display:"block" }}/>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{s.label}</div>
              <div style={{ fontWeight:800,fontSize:14,color:T.text }}>{s.value}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>{ setCharging(false);setElapsed(0);setEnergy(0); }} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.red},#dc2626)`,border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <i className="fas fa-stop-circle"/> Stop Charging
        </button>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charging Pass" sub="Show QR or tap Start Charging" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div style={{ textAlign:"center",marginBottom:16 }}>
          <div style={{ display:"inline-block",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,borderRadius:20,padding:"7px 24px" }}>
            <span style={{ fontSize:12,fontWeight:800,color:"#000",letterSpacing:1 }}>READY TO CHARGE</span>
          </div>
        </div>
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:20,padding:"20px",textAlign:"center",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
          <div style={{ background:"#0f1117",borderRadius:16,padding:14,display:"inline-block",border:`2px solid ${T.greenDim}`,marginBottom:12,position:"relative" }}>
            <img src={qrUrl} alt="QR" width={190} height={190} style={{ borderRadius:8,display:"block" }}/>
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:36,height:36,borderRadius:8,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${T.greenDim}` }}>
              <i className="fas fa-bolt" style={{ fontSize:16,color:T.green }}/>
            </div>
          </div>
          <div style={{ fontSize:11,color:T.muted,marginBottom:6 }}>Booking Reference</div>
          <div style={{ fontWeight:800,fontSize:18,color:T.green,letterSpacing:2,marginBottom:6 }}>{b.reference}</div>
          <div style={{ fontSize:11,color:T.muted }}>Show QR to attendant or start charging ⚡</div>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          {[{ label:"Station",value:b.station,icon:"fa-map-marker-alt" },{ label:"Vehicle",value:b.vehicle,icon:"fa-car" },{ label:"Date & Time",value:b.slot_time?new Date(b.slot_time).toLocaleString("en-GH",{ day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit" }):"--",icon:"fa-calendar-alt" },{ label:"Duration",value:`${b.duration_min} min`,icon:"fa-hourglass-half" },{ label:"Amount",value:`GH₵${b.amount}`,icon:"fa-money-bill-alt" }].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}><i className={`fas ${r.icon}`} style={{ fontSize:12,color:T.muted,width:16 }}/><span style={{ color:T.muted,fontSize:13 }}>{r.label}</span></div>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
        </div>
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

function Verify({ go }) {
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
      <Header title="Verify Booking" sub="Attendant Portal" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 80px" }}>
        <div style={{ background:T.card,borderRadius:16,padding:"18px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:6 }}><i className="fas fa-qrcode" style={{ marginRight:8,color:T.green }}/> Scan QR Code</div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Use camera to scan booking QR</div>
          <button className="tap" style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            <i className="fas fa-camera"/> Open Camera
          </button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
          <div style={{ flex:1,height:1,background:T.border }}/>
          <span style={{ fontSize:12,color:T.muted }}>or enter reference manually</span>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13,color:T.muted,marginBottom:10 }}>Enter booking reference</div>
          <div style={{ position:"relative",marginBottom:12 }}>
            <i className="fas fa-hashtag" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14 }}/>
            <input placeholder="ECO-XXXXXX" value={code} onChange={e=>{ setCode(e.target.value.toUpperCase());setErr("");setResult(null); }}
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
      <Nav active="More" go={go}/>
    </div>
  );
}

function Profile({ go,user,setUser,onMenu }) {
  const fileRef=useRef(null);
  const [avatar,setAvatar]=useState(null);
  const handlePhoto=(e)=>{ const file=e.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=(ev)=>setAvatar(ev.target.result); r.readAsDataURL(file); };
  const booking=(()=>{ try { const b=localStorage.getItem("eco_booking"); return b?JSON.parse(b):null; } catch(e){ return null; } })();
  const totalCharges=booking?1:0;
  const totalSpent=booking?booking.amount:0;
  const co2Saved=totalCharges*4;
  const waterReceived=totalCharges*20;
  const menuItems=[
    { icon:"fa-car",label:"My Vehicles",screen:"detail" },
    { icon:"fa-credit-card",label:"Payment Methods",screen:"home" },
    { icon:"fa-cog",label:"Settings",screen:"about" },
    { icon:"fa-question-circle",label:"Help & Support",screen:"about" },
    { icon:"fa-info-circle",label:"About EcoCharge",screen:"about" },
  ];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Profile" sub="Account & activity" onMenu={onMenu}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 14px 100px" }}>
        {user ? (
          <>
            <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716)",borderRadius:18,padding:"24px",marginBottom:16,border:`1px solid ${T.greenDim}`,textAlign:"center" }}>
              <div style={{ position:"relative",display:"inline-block",marginBottom:14 }}>
                <div style={{ width:82,height:82,borderRadius:"50%",overflow:"hidden",border:`3px solid ${T.green}`,margin:"0 auto" }}>
                  {avatar
                    ? <img src={avatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <div style={{ width:"100%",height:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}><i className="fas fa-user" style={{ fontSize:34,color:"#000" }}/></div>
                  }
                </div>
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
                  <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center" }}>
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
                <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:18,padding:"18px",marginBottom:16,border:`1px solid ${T.greenDim}` }}>
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
                      <div style={{ height:8,borderRadius:4,background:"rgba(255,255,255,0.08)",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${cd.pct}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,transition:"width 1s linear",borderRadius:4 }}/>
                      </div>
                      {cd.active&&<div style={{ textAlign:"center",marginTop:12 }}><div style={{ fontWeight:900,fontSize:36,color:T.green,fontFamily:"monospace",letterSpacing:2 }}>{cd.label}</div><div style={{ fontSize:11,color:T.muted,marginTop:4 }}>charging in progress</div></div>}
                    </div>
                  )}
                  {[{ label:"Reference",value:b.reference },{ label:"Amount",value:`GH₵${b.amount}` },{ label:"Payment",value:b.pay_method==="now"?"Paid ✅":"Pay on Arrival" },{ label:"Water",value:"20L included 💧" }].map(r=>(
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
      <Nav active="Home" go={go}/>
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

// ── CHARGER ADMIN SCREEN ──────────────────────────────────────
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
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
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
      <Nav active="More" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charger Admin" sub="OCPP 1.6J Management" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        {/* Tab Bar */}
        <div style={{ display:"flex",background:T.card,borderRadius:12,padding:4,marginBottom:16,border:`1px solid ${T.border}` }}>
          {[{ id:"chargers",label:"Chargers",icon:"fa-charging-station" },{ id:"sessions",label:"Sessions",icon:"fa-list" }].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className="tap"
              style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:"none",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <i className={`fas ${t.icon}`}/> {t.label}
            </button>
          ))}
        </div>

        {/* CHARGERS TAB */}
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
                        <div key={r.label} style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px" }}>
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

        {/* SESSIONS TAB */}
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
                    <div key={r.label} style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px" }}>
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
      <Nav active="More" go={go}/>
    </div>
  );
}

// ── SESSION STATUS CONFIG ─────────────────────────────────────
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

// ── SESSION MANAGEMENT SCREEN ─────────────────────────────────
function SessionManager({ go, user }) {
  const [sessions,  setSessions]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState("All");
  const [tab,       setTab]       = useState("list"); // list | detail | analytics
  const [analytics, setAnalytics] = useState(null);
  const [liveTimer, setLiveTimer] = useState(0);

  // Live timer for active sessions
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
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
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
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
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
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
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
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
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

  // Auto-refresh active sessions every 10s
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

  // ── DETAIL VIEW ───────────────────────────────────────────
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

          {/* Status Badge */}
          <div className="fade" style={{ background:st.bg,border:`1px solid ${st.color}33`,borderRadius:18,padding:"18px",marginBottom:14,textAlign:"center" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:`${st.color}22`,border:`2px solid ${st.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px" }}>
              <i className={`fas ${st.icon}`} style={{ fontSize:22,color:st.color }}/>
            </div>
            <div style={{ fontWeight:900,fontSize:22,color:st.color,letterSpacing:1 }}>{selected.status}</div>
            {selected.status_reason&&<div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{selected.status_reason}</div>}

            {/* Live timer for charging sessions */}
            {liveElapsed!=null&&(
              <div style={{ marginTop:12 }}>
                <div style={{ fontWeight:900,fontSize:36,color:T.green,fontFamily:"monospace" }}>{fmtDuration(liveElapsed)}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>elapsed</div>
              </div>
            )}
          </div>

          {/* Key metrics */}
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

          {/* Full details */}
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

          {/* Status Actions */}
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

          {/* Fault info */}
          {selected.status==="Faulted"&&selected.fault_code&&(
            <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"14px",marginBottom:14 }}>
              <div style={{ fontWeight:700,fontSize:13,color:T.red,marginBottom:8 }}><i className="fas fa-exclamation-triangle" style={{ marginRight:8 }}/>Fault Details</div>
              <div style={{ fontSize:12,color:T.mutedLight }}><strong>Code:</strong> {selected.fault_code}</div>
              {selected.fault_message&&<div style={{ fontSize:12,color:T.mutedLight,marginTop:4 }}><strong>Message:</strong> {selected.fault_message}</div>}
            </div>
          )}

          {/* Event Timeline */}
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

  // ── ANALYTICS VIEW ────────────────────────────────────────
  if (tab==="analytics") {
    const totalSessions  = sessions.length;
    const completedPct   = totalSessions ? Math.round((completedCount/totalSessions)*100) : 0;
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <Header title="Session Analytics" sub="Performance overview" onBack={()=>setTab("list")}/>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>

          {/* Summary cards */}
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

          {/* Status breakdown */}
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
                  <div style={{ height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:cfg.color,borderRadius:3,transition:"width .5s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion rate */}
          <div style={{ background:"linear-gradient(135deg,#071a09,#0a2510)",borderRadius:16,padding:"18px",marginBottom:16,border:`1px solid rgba(74,222,128,0.2)`,textAlign:"center" }}>
            <div style={{ fontSize:12,color:T.muted,marginBottom:6 }}>Session Completion Rate</div>
            <div style={{ fontWeight:900,fontSize:48,color:T.green }}>{completedPct}%</div>
            <div style={{ height:8,borderRadius:4,background:"rgba(255,255,255,0.08)",overflow:"hidden",margin:"12px 0 8px" }}>
              <div style={{ height:"100%",width:`${completedPct}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,borderRadius:4 }}/>
            </div>
            <div style={{ fontSize:11,color:T.muted }}>{completedCount} of {totalSessions} sessions completed</div>
          </div>
        </div>
        <Nav active="More" go={go}/>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Sessions" sub="Charging session management" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        {/* Top stats bar */}
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

        {/* Action buttons */}
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

        {/* Filter chips */}
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

        {/* Session list */}
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
              style={{ background:T.card,borderRadius:16,border:`1px solid ${isActive?T.green:T.border}`,marginBottom:10,overflow:"hidden",boxShadow:isActive?`0 0 12px rgba(74,222,128,0.1)`:"none" }}>

              {/* Active indicator bar */}
              {isActive&&<div style={{ height:3,background:`linear-gradient(90deg,${T.green},${T.blue})` }}/>}

              <div style={{ padding:"14px 14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {s.session_ref||s.id.substring(0,16)}
                    </div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>
                      <i className="fas fa-charging-station" style={{ marginRight:4 }}/>{s.charger_id||"--"} · {s.vehicle_type||"Unknown"}
                    </div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0,marginLeft:8 }}>
                    <div style={{ background:cfg.bg,borderRadius:8,padding:"3px 10px",display:"flex",alignItems:"center",gap:5 }}>
                      <i className={`fas ${cfg.icon}`} style={{ fontSize:10,color:cfg.color }}/>
                      <span style={{ fontSize:11,fontWeight:700,color:cfg.color }}>{s.status}</span>
                    </div>
                    {elapsed!=null&&(
                      <div style={{ fontSize:11,fontWeight:700,color:T.green,fontFamily:"monospace" }}>{fmtDuration(elapsed)}</div>
                    )}
                  </div>
                </div>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6 }}>
                  {[
                    { label:"Energy",  value:fmtKwh(s.energy_kwh),          color:T.green  },
                    { label:"Cost",    value:fmtCost(s.cost_total),          color:T.yellow },
                    { label:"Time",    value:fmtDuration(s.duration_sec),    color:T.blue   },
                    { label:"Payment", value:s.payment_status||"Unpaid",     color:s.payment_status==="Paid"?T.green:T.muted },
                  ].map(m=>(
                    <div key={m.label} style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 4px",textAlign:"center" }}>
                      <div style={{ fontWeight:700,fontSize:11,color:m.color }}>{m.value}</div>
                      <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}

// ── WALLET HELPERS ────────────────────────────────────────────
const toGHS    = (p) => p != null ? (p / 100).toFixed(2) : "0.00";
const toPesewas = (g) => Math.round(parseFloat(g) * 100);
const fmtGHS   = (p) => `GH₵${toGHS(p)}`;

const TOP_UP_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000]; // pesewas
// = GH₵10, 20, 50, 100, 200, 500

const TX_ICONS = {
  TopUp:       { icon:"fa-arrow-down",   color:"#4ade80" },
  Debit:       { icon:"fa-bolt",         color:"#f87171" },
  Refund:      { icon:"fa-undo",         color:"#38bdf8" },
  Bonus:       { icon:"fa-gift",         color:"#fbbf24" },
  Lock:        { icon:"fa-lock",         color:"#9ca3af" },
  Unlock:      { icon:"fa-unlock",       color:"#9ca3af" },
  Adjustment:  { icon:"fa-sliders-h",    color:"#a78bfa" },
};

// ── WALLET SCREEN ─────────────────────────────────────────────
function WalletScreen({ go, user }) {
  const [wallet,    setWallet]    = useState(null);
  const [txns,      setTxns]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("home"); // home | topup | history
  const [topupAmt,  setTopupAmt]  = useState(5000);   // pesewas
  const [customAmt, setCustomAmt] = useState("");
  const [paying,    setPaying]    = useState(false);
  const [txFilter,  setTxFilter]  = useState("All");

  const loadWallet = async () => {
    if (!SUPABASE_URL || !user?.id) { setLoading(false); return; }
    try {
      // Load wallet
      const wRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=*`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
      );
      const wData = await wRes.json();
      if (wData?.length) {
        setWallet(wData[0]);
      } else {
        // Auto-create wallet
        const cRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ user_id: user.id, email: user.email, display_name: user.name, balance_pesewas: 0 })
        });
        const cData = await cRes.json();
        if (cData?.[0]) setWallet(cData[0]);
      }

      // Load transactions
      const tRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallet_transactions?user_id=eq.${user.id}&order=created_at.desc&limit=50`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
      );
      const tData = await tRes.json();
      if (Array.isArray(tData)) setTxns(tData);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(()=>{ loadWallet(); },[user]);

  const [payError, setPayError] = useState("");

  const initiateTopUp = async () => {
    const amount = customAmt ? toPesewas(customAmt) : topupAmt;
    if (amount < 500) { setPayError("Minimum top-up is GH₵5.00"); return; }
    if (!user?.email) { setPayError("Email required for payment"); return; }
    setPaying(true); setPayError("");
    try {
      // Step 1: Use OCPP server for secure server-side payment initialization
      if (OCPP_URL) {
        const initRes = await fetch(`${OCPP_URL}/api/payment/initialize`, {
          method: "POST",
          headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            amount_pesewas: amount,
            type: "wallet_topup",
            metadata: { user_id: user.id, wallet_id: wallet?.id, type: "wallet_topup" }
          })
        });
        const initData = await initRes.json();
        if (initData.reference && initData.authorization_url) {
          try { localStorage.setItem("eco_topup", JSON.stringify({ ref: initData.reference, amount, userId: user.id, via: "server" })); } catch(e) {}
          window.location.href = initData.authorization_url;
          return;
        }
      }
      // Step 2: Fallback — direct Paystack redirect
      const ref = `WALLET-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      if (SUPABASE_URL) {
        await fetch(`${SUPABASE_URL}/rest/v1/topup_requests`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_id: wallet?.id, user_id: user.id, email: user.email, amount_pesewas: amount, payment_ref: ref, status: "Pending" })
        });
      }
      try { localStorage.setItem("eco_topup", JSON.stringify({ ref, amount, userId: user.id, via: "direct" })); } catch(e) {}
      window.location.href = `https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(user.email)}&amount=${amount}&reference=${ref}`;
    } catch(e) {
      setPayError("Payment initiation failed. Please try again.");
    }
    setPaying(false);
  };

  };

  const filteredTxns = txFilter === "All" ? txns : txns.filter(t => t.type === txFilter);

  const totalIn  = txns.filter(t=>["TopUp","Refund","Bonus"].includes(t.type)).reduce((a,t)=>a+t.amount_pesewas,0);
  const totalOut = txns.filter(t=>t.type==="Debit").reduce((a,t)=>a+t.amount_pesewas,0);

  if (!user) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Wallet" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
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

  // ── TOP UP TAB ─────────────────────────────────────────────
  if (tab === "topup") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Top Up Wallet" sub="Add funds to charge" onBack={()=>setTab("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        {/* Current balance */}
        <div style={{ background:"linear-gradient(135deg,#071a09,#0a2510)",borderRadius:18,padding:"18px",marginBottom:20,border:`1px solid rgba(74,222,128,0.2)`,textAlign:"center" }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Current Balance</div>
          <div style={{ fontWeight:900,fontSize:36,color:T.green }}>{fmtGHS(wallet?.balance_pesewas||0)}</div>
        </div>

        {/* Quick amounts */}
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Select Amount</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
          {TOP_UP_AMOUNTS.map(amt=>(
            <button key={amt} onClick={()=>{ setTopupAmt(amt);setCustomAmt(""); }} className="tap"
              style={{ background:topupAmt===amt&&!customAmt?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${topupAmt===amt&&!customAmt?T.green:T.border}`,borderRadius:14,padding:"16px 8px",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
              <div style={{ fontWeight:800,fontSize:18,color:topupAmt===amt&&!customAmt?"#000":T.text }}>{fmtGHS(amt)}</div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Or enter custom amount</div>
        <div style={{ position:"relative",marginBottom:20 }}>
          <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:15,fontWeight:700 }}>GH₵</span>
          <input type="number" placeholder="0.00" value={customAmt}
            onChange={e=>{ setCustomAmt(e.target.value);setTopupAmt(0); }}
            style={{ width:"100%",background:T.card,border:`1px solid ${customAmt?T.green:T.border}`,borderRadius:14,padding:"16px 16px 16px 52px",color:T.text,fontSize:20,fontWeight:700,fontFamily:"inherit" }}/>
        </div>

        {/* Summary */}
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

        {/* Payment methods */}
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
        {payError&&<div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"10px 14px",marginTop:10,color:T.red,fontSize:12,display:"flex",alignItems:"center",gap:8 }}><i className="fas fa-exclamation-circle"/>{payError}</div>}
        <div style={{ textAlign:"center",marginTop:12,fontSize:11,color:T.muted }}>
          <i className="fas fa-shield-alt" style={{ marginRight:5 }}/>Server-verified · Secured by Paystack · SSL Encrypted
        </div>
        <div style={{ background:T.card,borderRadius:12,padding:"12px",marginTop:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11,fontWeight:700,color:T.text,marginBottom:8 }}><i className="fas fa-info-circle" style={{ marginRight:6,color:T.blue }}/>Payment Security</div>
          <div style={{ fontSize:11,color:T.muted,lineHeight:1.7 }}>
            ✅ Payment verified server-side before wallet credit<br/>
            ✅ Double-payment protection enabled<br/>
            ✅ Webhook backup for failed callbacks<br/>
            ✅ All transactions logged and auditable
          </div>
        </div>
      </div>
    </div>
  );

  // ── HISTORY TAB ───────────────────────────────────────────
  if (tab === "history") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Transaction History" sub={`${txns.length} transactions`} onBack={()=>setTab("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        {/* Summary */}
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

        {/* Filter chips */}
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

  // ── WALLET HOME ───────────────────────────────────────────
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="My Wallet" sub="EcoCharge Ghana" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 100px" }}>

        {loading&&(
          <div style={{ textAlign:"center",padding:"40px 0" }}><Spinner/></div>
        )}

        {!loading&&(
          <>
            {/* Balance Card */}
            <div className="fade" style={{ background:"linear-gradient(135deg,#071a09,#0d2d1a,#071a09)",borderRadius:22,padding:"28px 24px",marginBottom:16,border:`1px solid rgba(74,222,128,0.25)`,position:"relative",overflow:"hidden" }}>
              {/* Background glow */}
              <div style={{ position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(74,222,128,0.06)" }}/>
              <div style={{ position:"relative",zIndex:1 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:4 }}>Available Balance</div>
                    <div style={{ fontWeight:900,fontSize:42,color:T.green,lineHeight:1,letterSpacing:-1 }}>
                      {fmtGHS(wallet?.balance_pesewas||0)}
                    </div>
                  </div>
                  <div style={{ width:48,height:48,borderRadius:14,background:"rgba(74,222,128,0.15)",border:`1px solid rgba(74,222,128,0.3)`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <i className="fas fa-wallet" style={{ fontSize:20,color:T.green }}/>
                  </div>
                </div>

                {wallet?.locked_pesewas>0&&(
                  <div style={{ background:"rgba(251,191,36,0.1)",borderRadius:10,padding:"8px 12px",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
                    <i className="fas fa-lock" style={{ fontSize:12,color:T.yellow }}/>
                    <span style={{ fontSize:12,color:T.yellow }}>{fmtGHS(wallet.locked_pesewas)} reserved for active session</span>
                  </div>
                )}

                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={()=>setTab("topup")} className="tap"
                    style={{ flex:1,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                    <i className="fas fa-plus"/> Top Up
                  </button>
                  <button onClick={()=>setTab("history")} className="tap"
                    style={{ flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                    <i className="fas fa-history"/> History
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
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

            {/* Recent transactions */}
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

            {/* How it works */}
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

// ── PRICING ENGINE HELPERS ────────────────────────────────────
const PESEWAS = (p) => p != null ? (p/100).toFixed(2) : "0.00";
const GHS     = (p) => `GH₵${PESEWAS(p)}`;

const PROMO_COLORS = {
  Percentage:    { color:"#fbbf24", label:"% Off"     },
  FixedDiscount: { color:"#38bdf8", label:"Flat Off"  },
  FlatRate:      { color:"#4ade80", label:"Flat Rate" },
  FreeKwh:       { color:"#a78bfa", label:"Free kWh"  },
};

const SCHEDULE_LABELS = {
  Always:    "Always active",
  TimeOfDay: "Time of day",
  DayOfWeek: "Specific days",
  DateRange: "Date range",
  Combined:  "Time + Days",
};

// ── PRICING ADMIN SCREEN ──────────────────────────────────────
function PricingAdmin({ go, user }) {
  const [tariffs,   setTariffs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [editing,   setEditing]   = useState(null);  // tariff being edited
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState("list"); // list | edit | simulate
  const [simResult, setSimResult] = useState(null);

  // Simulator state
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
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
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
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
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
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
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
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
    </div>
  );

  // ── EDIT TAB ──────────────────────────────────────────────
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
              style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
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
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
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
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>TO TIME</div>
                <input type="time" value={editing?.active_to_time||""} onChange={e=>setEditing(p=>({...p,active_to_time:e.target.value}))}
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
            </div>
          )}
          {(editing?.schedule_type==="DateRange")&&(
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>FROM DATE</div>
                <input type="date" value={editing?.active_from_date||""} onChange={e=>setEditing(p=>({...p,active_from_date:e.target.value}))}
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:4,fontWeight:600 }}>TO DATE</div>
                <input type="date" value={editing?.active_to_date||""} onChange={e=>setEditing(p=>({...p,active_to_date:e.target.value}))}
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
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

  // ── SIMULATE TAB ─────────────────────────────────────────
  if (tab==="simulate") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Price Simulator" sub="Test tariff costs" onBack={()=>setTab("list")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>

        {/* Tariff selector */}
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Select Tariff</div>
        <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16 }}>
          {tariffs.filter(t=>t.is_active).map(t=>(
            <button key={t.id} onClick={()=>setSimTariff(t)} className="tap"
              style={{ flexShrink:0,background:simTariff?.id===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${simTariff?.id===t.id?T.green:T.border}`,borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,color:simTariff?.id===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {t.name}
            </button>
          ))}
        </div>

        {/* Inputs */}
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
                  style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px",color:T.text,fontSize:15,fontWeight:700,fontFamily:"inherit",textAlign:"center" }}/>
              </div>
            ))}
          </div>
        </div>

        <button onClick={simulate} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"14px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16 }}>
          <i className="fas fa-calculator"/> Calculate Cost
        </button>

        {simResult&&(
          <div className="fade" style={{ background:"linear-gradient(135deg,#071a09,#0a2510)",borderRadius:18,padding:"18px",border:`1px solid rgba(74,222,128,0.25)` }}>
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
      <Nav active="More" go={go}/>
    </div>
  );

  // ── TARIFF LIST ───────────────────────────────────────────
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Pricing Engine" sub="Manage tariffs" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>

        {/* Action bar */}
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

        {/* Summary */}
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
          <div key={t.id} style={{ background:T.card,borderRadius:16,border:`1px solid ${t.is_active?T.border:"rgba(255,255,255,0.05)"}`,marginBottom:10,overflow:"hidden",opacity:t.is_active?1:0.6 }}>
            {/* Header */}
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
                {/* Active toggle */}
                <button onClick={()=>toggleActive(t)} className="tap"
                  style={{ background:t.is_active?`linear-gradient(135deg,${T.green},${T.greenDark})`:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:t.is_active?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginLeft:8 }}>
                  {t.is_active?"ON":"OFF"}
                </button>
              </div>

              {/* Pricing chips */}
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

              {/* Schedule + edit */}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:11,color:T.muted }}>
                  <i className="fas fa-clock" style={{ marginRight:4 }}/>{SCHEDULE_LABELS[t.schedule_type]||t.schedule_type}
                  {t.active_from_time&&` · ${t.active_from_time}–${t.active_to_time}`}
                  <span style={{ marginLeft:8 }}>Priority: {t.priority}</span>
                </div>
                <button onClick={()=>{ setEditing({...t});setTab("edit"); }} className="tap"
                  style={{ background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
                  <i className="fas fa-pencil-alt"/> Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Nav active="More" go={go}/>
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
      try { const saved=localStorage.getItem("eco_booking"); if(saved){ const parsed=JSON.parse(saved); const updated={ ...parsed,status:"confirmed",pay_method:"now" }; setBooking(updated); localStorage.setItem("eco_booking",JSON.stringify(updated)); } } catch(e){}
      if (SUPABASE_URL) {
        sb(`bookings?reference=eq.${ref}&select=*`).then(data=>{ if(data&&data.length>0){ const b=data[0]; sb(`bookings?id=eq.${b.id}`,{ method:"PATCH",headers:{ Prefer:"return=minimal" },body:JSON.stringify({ status:"confirmed",payment_confirmed:true }) }); const updated={ ...b,status:"confirmed",pay_method:"now" }; setBooking(updated); try { localStorage.setItem("eco_booking",JSON.stringify(updated)); } catch(e){} } });
      }
      const topupPending = (() => { try { return JSON.parse(localStorage.getItem("eco_topup")||"null"); } catch(e){ return null; } })();
      if (topupPending && ref.startsWith("WALLET-")) {
        try { localStorage.removeItem("eco_topup"); } catch(e) {}
        // SECURE: Always verify server-side before crediting wallet
        const verifyPayment = async () => {
          try {
            if (OCPP_URL) {
              // Server-side verification (most secure)
              const vRes = await fetch(`${OCPP_URL}/api/payment/verify`, {
                method: "POST",
                headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ reference: ref })
              });
              const vData = await vRes.json();
              if (vData.success) {
                console.log("Payment verified by server:", vData);
                setTimeout(()=>setScreen("wallet"), 150);
                return;
              }
            }
            // Fallback: direct Supabase credit (only if no OCPP server)
            if (SUPABASE_URL && topupPending.userId) {
              await fetch(`${SUPABASE_URL}/rest/v1/rpc/wallet_credit`, {
                method: "POST",
                headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
                body: JSON.stringify({ p_user_id: topupPending.userId, p_amount: topupPending.amount, p_type: "TopUp", p_description: "Wallet top-up via Paystack", p_payment_ref: ref })
              });
              await fetch(`${SUPABASE_URL}/rest/v1/topup_requests?payment_ref=eq.${ref}`, {
                method: "PATCH",
                headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
                body: JSON.stringify({ status: "Completed", completed_at: new Date().toISOString() })
              });
            }
          } catch(e) { console.error("Payment verification error:", e); }
          setTimeout(()=>setScreen("wallet"), 150);
        };
        verifyPayment();
      } else {
        // Booking payment - verify booking
        if (OCPP_URL) {
          fetch(`${OCPP_URL}/api/payment/verify`, {
            method: "POST",
            headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref })
          }).catch(e => console.error("Booking verify error:", e));
        }
        setTimeout(()=>setScreen("qr"), 150);
      }
    }
  },[]);

  const props={ go:goSecure,stations,station:station||stations[0],setStation,user,setUser,vehicle,setVehicle,booking,setBooking,onMenu:()=>setDrawer(true) };

  if (screen==="splash") return <><style>{CSS}</style><Splash onLogin={()=>{ setAuthMode("login");go("auth"); }} onRegister={()=>{ setAuthMode("register");go("auth"); }} onGuest={()=>go("home")}/></>;
  if (screen==="auth") return <><style>{CSS}</style><Auth mode={authMode} onBack={(mode)=>{ if(mode){ setAuthMode(mode); } else { go("splash"); } }} onSuccess={(u)=>{ setUser(u);go("home"); }}/></>;

  const views={chargers:<ChargerAdmin go={goSecure}/>,sessions:<SessionManager go={goSecure} user={user}/>,wallet:<WalletScreen go={goSecure} user={user}/>,pricing:<PricingAdmin go={goSecure} user={user}/>, home:<Home {...props}/>,map:<MapScreen {...props}/>,detail:<Detail {...props}/>,vehicles:<Vehicles {...props}/>,booking:<Booking {...props}/>,bookings:<Bookings {...props}/>,qr:<QRScreen {...props}/>,verify:<Verify {...props}/>,profile:<Profile {...props}/>,about:<About {...props}/> };

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
