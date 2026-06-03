// ============================================================
//     EcoCharge Ghana — App.jsx (Clean Stable Version)
//     All features working: Map, Booking, Payment, QR, Verify
// ============================================================


import { useState, useEffect, useRef } from "react";


// ── CONFIG ────────────────────────────────────────────────────
const SUPABASE_URL        = import.meta.env.VITE_SUPABASE_URL   || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const PAYSTACK_KEY        = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";


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
     { id:1, name:"Accra Central",     city:"Accra",      bays:6, open:6, solar:85, hydrogen:15, ti
     { id:2, name:"Kumasi Hub",        city:"Kumasi",     bays:4, open:3, solar:90, hydrogen:10, ti
     { id:3, name:"Tema Station",      city:"Tema",       bays:8, open:8, solar:75, hydrogen:25, ti
     { id:4, name:"Takoradi",          city:"Takoradi",   bays:3, open:2, solar:80, hydrogen:20, ti
     { id:5, name:"Tamale North",      city:"Tamale",     bays:5, open:5, solar:95, hydrogen:5,   ti
     { id:6, name:"Sunyani East",      city:"Sunyani",    bays:2, open:1, solar:70, hydrogen:30, ti
     { id:7, name:"Cape Coast",        city:"Cape Coast", bays:6, open:6, solar:88, hydrogen:12, ti
     { id:8, name:"Ho District",       city:"Ho",           bays:4, open:3, solar:82, hydrogen:18, ti
];


const VEHICLES = [
     { type:"Car",       price:"GH₵140–210", amount:175, desc:"Full EV sedan — solar powered"      },
     { type:"Scooter",   price:"GH₵8–15",      amount:12,   desc:"Electric scooter fast charge"    },
     { type:"Tricycle", price:"GH₵18–28",      amount:23,   desc:"Cargo tricycle — station charge" },
];


const DURATIONS = [
     { label:"30 min",   value:30,   extra:0    },
     { label:"1 hour",   value:60,   extra:5    },
     { label:"2 hours", value:120, extra:10 },
     { label:"3 hours", value:180, extra:15 },
];


// ── CSS ───────────────────────────────────────────────────────
const CSS = `
     @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&displa
     *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
     html,body,#root{height:100%}
     body{font-family:'Inter',sans-serif;background:#0f1117;color:#fff}
     @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translat
     @keyframes fadeIn{from{opacity:0}to{opacity:1}}
     @keyframes spin{to{transform:rotate(360deg)}}
     .fade{animation:fadeUp .35s ease both}
     .fade1{animation:fadeUp .35s .07s ease both}
     .fade2{animation:fadeUp .35s .14s ease both}
     .fade3{animation:fadeUp .35s .21s ease both}
     .tap{transition:opacity .15s,transform .15s;cursor:pointer;-webkit-tap-highlight-color:tran
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
          borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite"
);


const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digi
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
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.5 }}>     </div>
     );
};


// ── ICONS ─────────────────────────────────────────────────────
const Ico = {
     home:          (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M10
     station: (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M19
     profile: (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12
     more:          (c=T.muted)=><svg width="22" height="22" viewBox="0 0 24 24" fill={c}><circle cx="
     bolt:          (c=T.green)=><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M13
     water:         (c=T.blue) =><svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12
     back:          ()=><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20 11H7.
     check:         (c=T.green)=><svg width="20" height="20" viewBox="0 0 24 24" fill={c}><path d="M9
     pin:           (c=T.green)=><svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0
     logout:        ()=><svg width="18" height="18" viewBox="0 0 24 24" fill={T.red}><path d="M17 7l-1
     arrow:         ()=><svg width="16" height="16" viewBox="0 0 24 24" fill={T.muted}><path d="M10 6L
};


// ── NAV ───────────────────────────────────────────────────────
const Nav = ({ active, go }) => (
     <div style={{ display:"flex",justifyContent:"space-around",padding:"10px 0 20px",
       borderTop:`1px solid ${T.border}`,background:T.bg,flexShrink:0 }}>
       {[
            { label:"Home",        screen:"home",     icon:Ico.home    },
            { label:"Stations", screen:"detail",      icon:Ico.station },
            { label:"Profile",     screen:"profile", icon:Ico.profile },
            { label:"More",        screen:"about",    icon:Ico.more    },
       ].map(({ label,screen,icon })=>(
            <button key={label} onClick={()=>go(screen)} className="tap"
              style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
                flexDirection:"column",alignItems:"center",gap:4,minWidth:56,
                color:active===label?T.green:T.muted,fontSize:10,
                fontWeight:active===label?700:500,fontFamily:"inherit" }}>
              {icon(active===label?T.green:T.muted)}
              {label}
              {active===label&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green
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
            { label:"Home",        screen:"home",    icon:"   " },
            { label:"Stations", screen:"detail", icon:"       " },
            { label:"Scan",        screen:"qr",      icon:"   ", center:true },
            { label:"Bookings", screen:"map",        icon:"   " },
            { label:"Profile",     screen:"profile",icon:"    " },
       ].map(({ label,screen,icon,center })=>(
            <button key={label} onClick={()=>go(screen)} className="tap"
              style={{ background:"none",border:"none",cursor:"pointer",display:"flex",
                flexDirection:"column",alignItems:"center",gap:4,minWidth:56,fontFamily:"inherit" }
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
                       {active===label&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.g
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
              ? <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cur
              : <button onClick={onMenu} className="tap" style={{ background:"none",border:"none",cur
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
          {open&&<div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.6
          <div style={{ position:"fixed",top:0,left:0,height:"100%",width:285,background:T.card,
              zIndex:201,borderRight:`1px solid ${T.border}`,
              transform:open?"translateX(0)":"translateX(-100%)",
              transition:"transform .3s cubic-bezier(.4,0,.2,1)",
              display:"flex",flexDirection:"column" }}>
              <div style={{ padding:"52px 20px 20px",background:"linear-gradient(135deg,#0a1f12,#0f2b
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                     <Logo size={48}/>
                     <div>
                       <div style={{ fontWeight:800,fontSize:18,color:T.text }}>EcoCharge</div>
                       <div style={{ fontSize:11,color:T.muted }}>Ghana · Clean Energy</div>
                     </div>
                </div>
                {user
                     ? <div style={{ background:"rgba(74,222,128,.08)",borderRadius:10,padding:"10px 14p
                         <div style={{ fontSize:11,color:T.muted }}>Signed in as</div>
                         <div style={{ fontWeight:600,color:T.text,fontSize:13,marginTop:2,overflow:"hid
                       </div>
                     : <button onClick={()=>{ go("auth"); onClose(); }} className="tap"
                         style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDa
                              border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,
                              color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Sign In / Register</but
                }
           </div>
           <div style={{ flex:1,overflowY:"auto" }}>
                {[
                     { icon:Ico.home(T.mutedLight),       label:"Find Stations",     screen:"home"      },
                     { icon:Ico.station(T.mutedLight), label:"All Stations",         screen:"detail"    },
                     { icon:Ico.profile(T.mutedLight), label:"My Profile",           screen:"profile" },
                     { icon:Ico.more(T.mutedLight),       label:"About EcoCharge",   screen:"about"     },
                     { icon:Ico.bolt("#fbbf24"),           label:"Verify Booking",    screen:"verify"    },
                ].map(item=>(
                     <div key={item.label} className="tap row" onClick={()=>{ go(item.screen); onClose()
                       style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBott
                       {item.icon}
                       <span style={{ color:T.text,fontSize:14,fontWeight:500,flex:1 }}>{item.label}</sp
                       {Ico.arrow()}
                     </div>
                ))}
           </div>
           {user&&(
                <div style={{ padding:"16px 20px",borderTop:`1px solid ${T.border}` }}>
                     <button onClick={()=>{ onLogout(); onClose(); }} className="tap"
                       style={{ width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(2
                         borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,color:T.red,cursor:"p
                         display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"in
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
               <div style={{ fontWeight:800,fontSize:30,color:T.text,marginTop:16,letterSpacing:-1 }
               <div style={{ fontWeight:600,fontSize:16,color:T.green,marginTop:4 }}>Ghana</div>
               <div style={{ fontSize:13,color:T.muted,marginTop:12,lineHeight:1.7 }}>
                  Solar EV Charging · Clean Water<br/>Zero Emissions
               </div>
           </div>
           <div className="fade1" style={{ width:"100%" }}>
               <button onClick={onLogin} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})
                    border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,
                    color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>Sign In</bu
               <button onClick={onRegister} className="tap"
                  style={{ width:"100%",background:"transparent",border:`1px solid ${T.border}`,
                    borderRadius:14,padding:"16px",fontSize:16,fontWeight:600,
                    color:T.text,cursor:"pointer",marginBottom:16,fontFamily:"inherit" }}>Create Acco
               <button onClick={onGuest} className="tap"
                  style={{ width:"100%",background:"none",border:"none",fontSize:13,
                    color:T.muted,cursor:"pointer",fontFamily:"inherit" }}>Continue as Guest →</butto
           </div>
           <div className="fade2" style={{ marginTop:32,display:"flex",gap:28 }}>
               {[{ icon:Ico.bolt(T.green),label:"Solar"},{icon:Ico.water(T.blue),label:"Water"},{ico
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
         <Header title={mode==="login"?"Sign In":"Create Account"} sub="EcoCharge Ghana" onBack=
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
           <div style={{ background:T.card,borderRadius:16,padding:"20px",border:`1px solid ${T.
             {mode==="register"&&inp("Full name",name,setPname)}
             {inp("Email address",email,setEmail,"email")}
             {inp("Password (min 6 chars)",password,setPass,"password")}
             {error&&<div style={{ color:T.red,fontSize:12,marginBottom:12,
                background:"rgba(248,113,113,.08)",borderRadius:8,padding:"8px 12px" }}>{error}</
             <button onClick={submit} disabled={loading} className="tap"
                style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark
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
             const map = L.map(mapRef.current,{ center:[7.9465,-1.0232],zoom:7,attributionControl:fa
             mapRef.current.style.zIndex = "0";
             L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{ maxZoom:1
             const icon = L.divIcon({
               html:`<div style="filter:drop-shadow(0 2px 6px rgba(74,222,128,.6))"><svg width="28"
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
              <div style={{ flex:1,position:"relative",margin:"12px",borderRadius:18,overflow:"hidden
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
                             style={{ background:"rgba(26,29,39,.95)",backdropFilter:"blur(8px)",borderRad
                               padding:"10px 14px",border:`1px solid ${T.border}`,flexShrink:0,minWidth:15
                             <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:3 }}>{s.na
                             <div style={{ fontSize:11,color:T.green,fontWeight:600 }}>{s.open}/{s.bays} b
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
  const displayName = user?.name || user?.email?.split("@")[0] || "Welcome";

  const filtered = search
    ? stations.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase())
      )
    : stations;

  const quickActions = [
    { icon:"⚡", label:"Find Stations", sub:"Nearby",          screen:"map",      bg:"rgba(74,222,128,0.12)" },
    { icon:"📅", label:"My Bookings",   sub:"View all",        screen:"bookings", bg:"rgba(255,255,255,0.06)" },
    { icon:"⊞",  label:"Charging Pass", sub:"Show QR",         screen:"qr",       bg:"rgba(255,255,255,0.06)" },
    { icon:"💧", label:"Water Points",  sub:"Find clean water", screen:"detail",   bg:"rgba(56,189,248,0.10)" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",
      background:"#080d10",overflowY:"auto",overflowX:"hidden" }}>

      {/* ── HEADER ── */}
      <div className="fade" style={{ padding:"48px 18px 12px",display:"flex",
        justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>

        {/* Hamburger */}
        <button onClick={onMenu} className="tap" style={{ background:"rgba(255,255,255,.07)",
          border:`1px solid ${T.border}`,borderRadius:12,width:40,height:40,cursor:"pointer",
          display:"flex",flexDirection:"column",gap:5,alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:18,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:14,height:2,background:T.mutedLight,borderRadius:1 }}/>
          <div style={{ width:18,height:2,background:T.mutedLight,borderRadius:1 }}/>
        </button>

        {/* Logo + Name */}
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,
            background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 0 12px rgba(74,222,128,0.4)`,fontSize:16 }}>⚡</div>
          <div>
            <div style={{ fontWeight:800,fontSize:16,color:T.text,lineHeight:1.1 }}>EcoCharge</div>
            <div style={{ fontSize:10,color:T.green,fontWeight:700,letterSpacing:0.5 }}>Ghana</div>
          </div>
        </div>

        {/* Bell */}
        <div style={{ position:"relative" }}>
          <button className="tap" style={{ background:"rgba(255,255,255,.07)",
            border:`1px solid ${T.border}`,borderRadius:12,width:40,height:40,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🔔</button>
          <div style={{ position:"absolute",top:-2,right:-2,width:10,height:10,
            borderRadius:"50%",background:T.green,border:"2px solid #080d10" }}/>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="fade" style={{ margin:"0 14px 16px",borderRadius:22,overflow:"hidden",
        position:"relative",minHeight:188,
        background:"linear-gradient(135deg,#071a09 0%,#0a2510 50%,#061f0c 100%)",
        border:`1px solid rgba(74,222,128,0.15)` }}>

        {/* Charging station visual on right */}
        <div style={{ position:"absolute",right:0,top:0,bottom:0,width:"52%",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,
            background:"radial-gradient(ellipse at 60% 50%,rgba(10,40,20,0.8) 0%,transparent 70%)" }}/>
          {/* Solar roof */}
          <div style={{ position:"absolute",top:18,right:-4,left:4,height:16,
            background:"rgba(74,222,128,0.07)",
            borderBottom:"1px solid rgba(74,222,128,0.2)",borderRadius:"4px 0 0 0" }}/>
          {/* Charger posts */}
          <div style={{ position:"absolute",bottom:0,right:14,display:"flex",gap:10,alignItems:"flex-end" }}>
            {[54,68,50].map((h,i)=>(
              <div key={i} style={{ width:13,height:h,background:"rgba(74,222,128,0.12)",
                borderRadius:"4px 4px 0 0",border:"1px solid rgba(74,222,128,0.22)",position:"relative" }}>
                <div style={{ position:"absolute",top:9,left:"50%",transform:"translateX(-50%)",
                  width:5,height:5,borderRadius:"50%",background:T.green,
                  boxShadow:`0 0 6px ${T.green}` }}/>
              </div>
            ))}
          </div>
          {/* Car silhouette */}
          <div style={{ position:"absolute",bottom:3,right:38,width:65,height:20,
            background:"rgba(30,40,35,0.6)",borderRadius:4 }}>
            <div style={{ position:"absolute",top:-9,left:8,right:8,height:11,
              background:"rgba(40,55,45,0.55)",borderRadius:"4px 4px 0 0" }}/>
          </div>
        </div>

        {/* Left text */}
        <div style={{ position:"relative",zIndex:2,padding:"22px 20px 20px" }}>
          <div style={{ fontSize:13,color:"rgba(255,255,255,.65)",marginBottom:4 }}>
            {greeting} {greetEmoji}
          </div>
          <div style={{ fontWeight:800,fontSize:26,color:T.text,marginBottom:8,letterSpacing:-0.5 }}>
            {displayName}
          </div>
          <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>
            Powering Ghana with{" "}
            <span style={{ color:T.green,fontWeight:700 }}>clean energy</span>
            {" "}and{" "}
            <span style={{ color:T.blue,fontWeight:700 }}>clean water</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="fade1" style={{ margin:"0 14px 16px",position:"relative" }}>
        <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
          fontSize:15,color:T.muted }}>🔍</div>
        <input placeholder="Search station or location" value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",background:T.card,border:`1px solid ${T.border}`,
            borderRadius:14,padding:"13px 48px 13px 42px",fontSize:14,fontFamily:"inherit" }}/>
        <div style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
          background:"rgba(255,255,255,.06)",borderRadius:8,padding:"5px 9px",fontSize:14 }}>⊟</div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="fade1" style={{ margin:"0 14px 16px",background:T.card,
        borderRadius:18,border:`1px solid ${T.border}`,
        display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        {quickActions.map((a,i)=>(
          <button key={a.label} onClick={()=>go(a.screen)} className="tap"
            style={{ background:"none",border:"none",cursor:"pointer",
              padding:"14px 6px",display:"flex",flexDirection:"column",
              alignItems:"center",gap:7,
              borderRight:i<3?`1px solid ${T.border}`:"none",fontFamily:"inherit" }}>
            <div style={{ width:40,height:40,borderRadius:12,background:a.bg,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>
              {a.icon}
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.text,lineHeight:1.2 }}>{a.label}</div>
              <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── IMPACT CARD ── */}
      <div className="fade2" style={{ margin:"0 14px 16px",
        background:"linear-gradient(135deg,#071a09,#0a2510)",
        borderRadius:18,padding:"16px",border:`1px solid rgba(74,222,128,0.2)`,
        display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <div style={{ width:42,height:42,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>🌿</div>
          <div>
            <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:5 }}>
              You're making impact!
            </div>
            <div style={{ fontSize:12,color:T.mutedLight }}>
              <strong style={{ color:T.text }}>12 charges</strong>
              {" · "}
              <strong style={{ color:T.text }}>48 kg CO₂</strong> saved
            </div>
            <div style={{ fontSize:12,color:T.mutedLight,marginTop:3 }}>
              <strong style={{ color:T.blue }}>240 L</strong> clean water received
            </div>
          </div>
        </div>
        {/* Globe icon */}
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" fill="#1a3a4a" stroke="#38bdf8" strokeWidth="1.5"/>
          <ellipse cx="32" cy="32" rx="13" ry="28" fill="none" stroke="#38bdf8" strokeWidth="1"/>
          <path d="M6 32h52M32 6a42 42 0 010 52" stroke="#38bdf8" strokeWidth="1"/>
          <circle cx="38" cy="36" r="9" fill="#166534" opacity="0.9"/>
          <circle cx="28" cy="28" r="7" fill="#166534" opacity="0.7"/>
          <circle cx="36" cy="34" r="5" fill="#4ade80" opacity="0.35"/>
        </svg>
      </div>

      {/* ── NEARBY STATIONS ── */}
      <div className="fade3" style={{ margin:"0 14px 14px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Nearby Stations</div>
          <button onClick={()=>go("detail")} className="tap"
            style={{ background:"none",border:"none",color:T.green,fontSize:13,
              fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",gap:4 }}>
            View all →
          </button>
        </div>

        {(search ? filtered : stations).slice(0,3).map((s,idx)=>{
          const kw = Math.round((s.solar||80)*1.5);
          const isAllOpen = s.open===s.bays;
          const stationBg = ["linear-gradient(135deg,#0a2010,#0d3018)",
            "linear-gradient(135deg,#0a1a30,#0d2a3d)",
            "linear-gradient(135deg,#1a1000,#2d1800)"];
          return (
            <div key={s.id} className="tap row"
              onClick={()=>{ setStation(s); go("detail"); }}
              style={{ background:T.card,borderRadius:18,border:`1px solid ${T.border}`,
                marginBottom:10,display:"flex",gap:12,alignItems:"flex-start",padding:14 }}>

              {/* Station photo placeholder */}
              <div style={{ width:80,height:80,borderRadius:12,flexShrink:0,
                background:stationBg[idx%3],
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:28,border:`1px solid ${T.border}`,overflow:"hidden",position:"relative" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:8,
                  background:"rgba(74,222,128,0.12)",borderBottom:"1px solid rgba(74,222,128,0.15)" }}/>
                <span style={{ position:"relative",zIndex:1 }}>⚡</span>
              </div>

              {/* Info */}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:3,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:8 }}>
                  {s.time} away · {s.city}
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:3,
                    background:"rgba(255,255,255,.05)",borderRadius:6,padding:"3px 8px" }}>
                    <span style={{ fontSize:10,color:T.mutedLight }}>ⓘ {kw} kW Max Power</span>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:3,
                    background:"rgba(255,255,255,.05)",borderRadius:6,padding:"3px 8px" }}>
                    <span style={{ fontSize:10,color:T.mutedLight }}>☀️ {s.solar}% Solar Powered</span>
                  </div>
                </div>
              </div>

              {/* Right: bays + button */}
              <div style={{ flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
                <div style={{ background:isAllOpen?"rgba(74,222,128,0.12)":"rgba(74,222,128,0.08)",
                  border:`1px solid rgba(74,222,128,0.25)`,
                  borderRadius:10,padding:"5px 10px",textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:14,color:T.green,lineHeight:1 }}>
                    {s.open}/{s.bays}
                  </div>
                  <div style={{ fontSize:9,color:T.green,marginTop:2 }}>Bays available</div>
                </div>
                <button onClick={e=>{ e.stopPropagation(); setStation(s); go("detail"); }}
                  className="tap"
                  style={{ width:32,height:32,
                    background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                    border:"none",borderRadius:9,cursor:"pointer",fontSize:14,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:`0 2px 8px rgba(74,222,128,0.3)` }}>↗</button>
              </div>
            </div>
          );
        })}

        {search && filtered.length===0 && (
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>
            No stations found for "{search}"
          </div>
        )}
      </div>

      {/* ── WATER BANNER ── */}
      <div style={{ margin:"0 14px 110px",
        background:"linear-gradient(135deg,#061520,#09202e)",
        borderRadius:18,padding:"16px",border:`1px solid rgba(56,189,248,0.2)`,
        display:"flex",alignItems:"center",gap:14,cursor:"pointer" }}
        onClick={()=>go("detail")}>
        <div style={{ display:"flex",gap:2,flexShrink:0 }}>
          <span style={{ fontSize:26 }}>⚡</span>
          <span style={{ fontSize:22 }}>💧</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.blue,marginBottom:4 }}>
            Every charge includes <span style={{ color:T.blue }}>20L Clean Water</span>
          </div>
          <div style={{ fontSize:12,color:T.muted }}>
            Clean energy for your ride. Clean water for life.
          </div>
        </div>
        <span style={{ color:T.muted,fontSize:18 }}>›</span>
      </div>

      {/* ── BOTTOM NAV (5-tab with raised Scan) ── */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,
        background:"rgba(8,13,16,.97)",backdropFilter:"blur(12px)",
        borderTop:`1px solid ${T.border}`,
        display:"flex",justifyContent:"space-around",alignItems:"flex-end",
        padding:"10px 0 24px",zIndex:100 }}>
        {[
          { label:"Home",     screen:"home",     emoji:"🏠", active:true  },
          { label:"Stations", screen:"detail",   emoji:"⚡", active:false },
          { label:"Scan",     screen:"qr",       emoji:"⊞",  center:true  },
          { label:"Bookings", screen:"bookings", emoji:"📅", active:false },
          { label:"Profile",  screen:"profile",  emoji:"👤", active:false },
        ].map(item=>(
          <button key={item.label}
            onClick={()=>!item.active && go(item.screen)}
            className="tap"
            style={{ background:"none",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",
              gap:4,minWidth:56,fontFamily:"inherit" }}>
            {item.center ? (
              <div style={{ width:52,height:52,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                marginTop:-20,marginBottom:2,fontSize:22,
                boxShadow:`0 4px 20px rgba(74,222,128,.45)` }}>{item.emoji}</div>
            ) : (
              <div style={{ fontSize:22,opacity:item.active?1:.45 }}>{item.emoji}</div>
            )}
            <span style={{ fontSize:10,fontWeight:item.active?700:500,
              color:item.active?T.green:T.muted }}>{item.label}</span>
            {item.active&&<div style={{ width:4,height:4,borderRadius:"50%",background:T.green }}/>}
          </button>
        ))}
      </div>

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
                  <div style={{ fontSize:36 }}>     </div>
                  <div style={{ fontSize:11,color:T.green,fontWeight:600,marginTop:4 }}>{s.solar}% So
             </div>
             <div style={{ width:1,height:50,background:T.border }}/>
             <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:36 }}>     </div>
                  <div style={{ fontSize:11,color:T.blue,fontWeight:600,marginTop:4 }}>{s.hydrogen}%
             </div>
             <div style={{ position:"absolute",bottom:10,left:14,display:"flex",gap:8 }}>
                  <Badge label={`${s.open}/${s.bays} Open`} color={T.green}/>
                  <Badge label={`Wait: ${s.time}`} color={T.yellow}/>
             </div>
           </div>
           <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
             <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12
                  {[
                       { label:"Bays Open",value:`${s.open}/${s.bays}`,color:T.green   },
                       { label:"Est. Wait",value:s.time,               color:T.yellow },
                       { label:"Solar",    value:`${s.solar}%`,        color:T.blue    },
                  ].map(x=>(
                       <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",
                         border:`1px solid ${T.border}`,textAlign:"center" }}>
                         <div style={{ fontSize:9,color:T.muted,marginBottom:4,textTransform:"uppercase"
                         <div style={{ fontWeight:800,fontSize:17,color:x.color }}>{x.value}</div>
                       </div>
                  ))}
             </div>
             <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:12,b
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:600,color:T.text }}>Energy Mix</span>
                    <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% H₂</
                  </div>
                  <div style={{ height:7,borderRadius:4,background:T.border,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${s.solar}%`,background:`linear-gradient(90deg
                  </div>
             </div>
             <button onClick={()=>go("vehicles")} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})
                    border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
                    color:"#000",cursor:"pointer",marginBottom:14,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  {Ico.bolt("#000")} Charge Here — Select Vehicle
             </button>
             <div style={{ fontSize:11,color:T.muted,fontWeight:600,letterSpacing:.5,textTransform
             {stations.map(st=>(
                  <div key={st.id} className="row" onClick={()=>setStation(st)}
                    style={{ background:st.id===s.id?"#152410":T.card,
                      border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,
                      borderRadius:13,padding:"13px 14px",marginBottom:8,
                      display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:600,color:T.text,fontSize:14,overflow:"hidden",textOve
                      <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{st.city} · {st.bays} ba
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
                      <div style={{ textAlign:"right" }}>
                           <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                           <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
                      </div>
                      <button className="tap" onClick={e=>{ e.stopPropagation(); setStation(st); go("
                           style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",
                             fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inheri
                           Select
                      </button>
                    </div>
                  </div>
             ))}
             <div style={{ height:18 }}/>
           </div>
           <Nav active="Stations" go={go}/>
         </div>
    );
}
// ── VEHICLES ──────────────────────────────────────────────────
function Vehicles({ go, setVehicle, user }) {
  const [sel,setSel] = useState(null);
  const icons = { Car:"             ", Scooter:"   ", Tricycle:"   " };
  const gradients = {
       Car:           "linear-gradient(135deg,#0a2e14,#0d3d1a)",
       Scooter:       "linear-gradient(135deg,#0a1f2e,#0d2a3d)",
       Tricycle: "linear-gradient(135deg,#1a1f0a,#252d0d)",
  };
  return (
       <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
         <Header title="Select Vehicle" sub="Choose your vehicle type" onBack={()=>go("detail")}
         <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
              {VEHICLES.map((v,i)=>(
                <div key={v.type} className={`tap fade${i}`} onClick={()=>setSel(v)}
                    style={{ borderRadius:18,marginBottom:14,overflow:"hidden",
                      border:`2px solid ${sel?.type===v.type?T.green:T.border}`,
                      transition:"border-color .2s" }}>
                    <div style={{ height:160,background:gradients[v.type],
                      display:"flex",alignItems:"center",justifyContent:"center",
                      position:"relative" }}>
                      <div style={{ fontSize:90,filter:`drop-shadow(0 4px 16px rgba(74,222,128,.3))`
                      <div style={{ position:"absolute",bottom:10,left:14 }}>
                           <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{v.type}</div>
                           <div style={{ fontSize:11,color:T.mutedLight,marginTop:2 }}>{v.desc}</div>
                      </div>
                      {sel?.type===v.type&&(
                           <div style={{ position:"absolute",top:12,right:12,width:28,height:28,
                             borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",ju
                             {Ico.check("#000")}
                           </div>
                      )}
                      <div style={{ position:"absolute",bottom:10,right:14 }}>
                           <div style={{ background:`${T.green}22`,border:`1px solid ${T.greenDim}`,bord
                             padding:"4px 10px",display:"flex",alignItems:"center",gap:4 }}>
                             {Ico.bolt(T.green)}
                             <span style={{ fontSize:10,color:T.green,fontWeight:600 }}>Solar</span>
                           </div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 16px",background:T.card,display:"flex",justifyContent
                      <div style={{ fontWeight:800,fontSize:19,color:T.green }}>{v.price}</div>
                      <Badge label="+ 20L Clean Water" color={T.blue}/>
                    </div>
                </div>
              ))}
             <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid
                  <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    {Ico.bolt(T.green)}<span style={{ fontSize:13,color:T.text }}>Full vehicle charge
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    {Ico.water(T.blue)}<span style={{ fontSize:13,color:T.text }}>20L clean desalinat
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
           <Nav active="Stations" go={go}/>
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


    const [slotIdx,setSlotIdx]         = useState(0);
    const [durIdx,setDurIdx]           = useState(1);
    const [payHow,setPayHow]           = useState("now");
    const [name,setName]               = useState(user?.name||"");
    const [phone,setPhone]             = useState("");
    const [email,setEmail]             = useState(user?.email||"");
    const [loading,setLoad]            = useState(false);
    const [error,setErr]               = useState("");


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
          await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.strin
     }
     setBooking(data);
     try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
     if (payHow==="now") {
          window.location.href=`https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(e
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
              borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
                <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
       <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {
  </div>
  <div style={{ fontSize:50 }}>{{ Car:"       ",Scooter:"    ",Tricycle:"   " }[vehicle?.type
</div>


{/* Time slots */}
<div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px"
  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Select Tim
  <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
       {slots.slice(0,12).map((sl,i)=>(
         <button key={i} onClick={()=>setSlotIdx(i)} className="tap"
             style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,fontFamily:"inherit"
               background:slotIdx===i?T.green:T.bg,
               border:`1px solid ${slotIdx===i?T.green:T.border}`,
               color:slotIdx===i?"#000":T.text,fontSize:13,fontWeight:slotIdx===i?700:500,
             {fmtTime(sl)}
         </button>
       ))}
  </div>
</div>


{/* Duration */}
<div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px"
  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Charging D
  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
       {DURATIONS.map((d,i)=>(
         <button key={i} onClick={()=>setDurIdx(i)} className="tap"
             style={{ padding:"12px",borderRadius:12,fontFamily:"inherit",textAlign:"left"
               background:durIdx===i?"#0d2010":T.bg,
               border:`1px solid ${durIdx===i?T.green:T.border}`,cursor:"pointer" }}>
             <div style={{ fontWeight:700,fontSize:15,color:durIdx===i?T.green:T.text }}>{
             {d.extra>0&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>+GH₵{d.ext
         </button>
       ))}
  </div>
</div>


{/* Order summary */}
<div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px"
  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}>Summary</d
  <Divider/>
  {[
       { label:"Time",       value:`${fmtTime(slots[slotIdx])} — ${fmtEndTime(slots[slotId
       { label:"Duration", value:dur.label },
       { label:"Vehicle",    value:vehicle?.type||"Car" },
       { label:"Water",      value:"20L Clean Bundle" },
  ].map(r=>(
       <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginB
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
<div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px"
  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Your Detai
  {inp("Full name",name,setName)}
  {inp("Phone number",phone,setPhone,"tel")}
  {inp("Email address",email,setEmail,"email")}
</div>


{/* Payment method */}
<div className="fade3" style={{ background:T.card,borderRadius:16,padding:"14px 16px"
  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Payment</d
  {[
       { id:"now",    label:"Pay now to confirm",   sub:"Instant booking via Paystack" },
       { id:"arrive", label:"Pay on arrival",       sub:"Reserve now, pay at station"   },
  ].map(m=>(
       <div key={m.id} className="tap row" onClick={()=>setPayHow(m.id)}
         style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRa
           background:payHow===m.id?"#132010":"transparent",
           border:`1px solid ${payHow===m.id?T.greenDim:T.border}` }}>
         <div style={{ flex:1 }}>
           <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>{m.label}</div>
           <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.sub}</div>
         </div>
         <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,
           border:`2px solid ${payHow===m.id?T.green:T.border}`,
           display:"flex",alignItems:"center",justifyContent:"center" }}>
           {payHow===m.id&&<div style={{ width:10,height:10,borderRadius:"50%",backgroun
         </div>
       </div>
  ))}
</div>


{error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,1
  borderRadius:10,padding:"11px 14px",marginBottom:12,color:T.red,fontSize:12 }}>{err
             <button onClick={book} disabled={loading} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})
                    border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
                    color:"#000",cursor:loading?"default":"pointer",marginBottom:20,fontFamily:"inher
                    display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading
                  {loading?<><Spinner/> Processing…</>:payHow==="now"?`Pay GH₵${total} & Confirm`:"Re
             </button>
           </div>
           <Nav active="Stations" go={go}/>
         </div>
    );
}


// ── QR SCREEN ─────────────────────────────────────────────────
function QRScreen({ go, booking }) {
    const b = booking;
    if (!b) return (
         <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
           <Header title="Charging Pass" onBack={()=>go("home")}/>
           <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding
             <div>
                  <div style={{ fontSize:48,marginBottom:14 }}>   </div>
                  <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>No Active B
                  <div style={{ color:T.muted,fontSize:13,marginBottom:20 }}>Complete a booking to ge
                  <button onClick={()=>go("home")} className="tap"
                    style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"n
                      borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:700,color:"#000",cur
                    Find a Station
                  </button>
             </div>
           </div>
           <Nav active="Stations" go={go}/>
         </div>
    );


    const qrData = encodeURIComponent(`${b.reference}|${b.station}|${b.vehicle}|${b.status}`);
    const qrUrl        = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgc


    return (
         <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
           <Header title="Charging Pass" sub="Show this to the attendant" onBack={()=>go("home")}/
           <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 0" }}>
             <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",
                  borderRadius:20,padding:24,textAlign:"center",marginBottom:16,border:`1px solid ${T
                  <div style={{ fontSize:12,color:T.muted,marginBottom:4 }}>Booking Reference</div>
                  <div style={{ fontWeight:800,fontSize:20,color:T.green,letterSpacing:1,marginBottom
                  <div style={{ background:"#0f1117",borderRadius:16,padding:12,display:"inline-block
                       border:`2px solid ${T.greenDim}`,marginBottom:12 }}>
                       <img src={qrUrl} alt="QR" width={180} height={180} style={{ borderRadius:8,displa
                  </div>
                  <div style={{ fontSize:12,color:T.muted }}>Attendant scans to activate your charger
             </div>
             <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border
                  <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Session De
                  {[
                       { label:"Station",   value:b.station   },
                       { label:"Vehicle",   value:b.vehicle   },
                       { label:"Duration", value:`${b.duration_min} min` },
                       { label:"Amount",    value:`GH₵${b.amount}` },
                       { label:"Payment",   value:b.pay_method==="now"?"Paid   ":"Pay on Arrival" },
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
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})
                       border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
                       color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit" }}>
                  Back to Home
             </button>
           </div>
           <Nav active="Stations" go={go}/>
         </div>
    );
}


// ── VERIFY ────────────────────────────────────────────────────
function Verify({ go }) {
    const [code,setCode]              = useState("");
    const [result,setResult] = useState(null);
    const [loading,setLoad]           = useState(false);
    const [error,setErr]              = useState("");


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
           <div style={{ background:T.card,borderRadius:16,padding:"16px",marginBottom:12,border
               <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}>Enter Book
               <input placeholder="e.g. ECO-ABC123" value={code}
                 onChange={e=>{ setCode(e.target.value.toUpperCase()); setErr(""); setResult(null)
                 style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,
                     borderRadius:10,padding:"14px",color:T.text,fontSize:16,
                     fontFamily:"monospace",letterSpacing:1,marginBottom:12 }}/>
               <button onClick={verify} disabled={loading} className="tap"
                 style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark
                     border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,
                     color:"#000",cursor:"pointer",fontFamily:"inherit",
                     display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                 {loading?<><Spinner/> Verifying…</>:"Verify Booking"}
               </button>
           </div>
           {error&&<div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,1
               borderRadius:12,padding:"12px 16px",marginBottom:12,color:T.red,fontSize:13 }}>{err
           {result&&(
               <div className="fade" style={{ background:"#0a1f12",border:`1px solid ${T.greenDim}
                 borderRadius:16,padding:"16px",marginBottom:12 }}>
                       <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                            <div style={{ width:48,height:48,borderRadius:"50%",background:T.green,
                              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexSh
                            <div>
                              <div style={{ fontWeight:800,fontSize:16,color:T.green }}>Verified — Activate
                              <div style={{ fontSize:12,color:T.muted }}>Booking confirmed and valid</div>
                            </div>
                       </div>
                       {[
                            { label:"Name",      value:result.name      },
                            { label:"Phone",     value:result.phone     },
                            { label:"Vehicle",   value:result.vehicle   },
                            { label:"Duration", value:`${result.duration_min} min` },
                            { label:"Amount",    value:`GH₵${result.amount}` },
                            { label:"Payment",   value:result.pay_method==="now"?"PAID   ":`Collect GH₵${res
                       ].map(r=>(
                            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",
                              marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}30` }}>
                              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
                              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
                            </div>
                       ))}
                       <div style={{ background:T.green,borderRadius:12,padding:"14px",textAlign:"center
                            <div style={{ fontWeight:800,fontSize:16,color:"#000" }}>    ACTIVATE CHARGER NO
                       </div>
                  </div>
             )}
           </div>
           <Nav active="More" go={go}/>
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
                       <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0e2716
                            borderRadius:18,padding:"22px",marginBottom:16,border:`1px solid ${T.greenDim}`
                            <div style={{ width:68,height:68,borderRadius:"50%",
                              background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
                              display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12p
                              {Ico.profile("#000")}
                        </div>
                        <div style={{ fontWeight:800,fontSize:19,color:T.text }}>{user.name||user.email
                        <div style={{ fontSize:12,color:T.muted,marginTop:5,marginBottom:10 }}>{user.em
                        <Badge label="Active Member" color={T.green}/>
                    </div>
                    <div className="fade1" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:
                        {[
                             { label:"Total Charges",   value:"0",    color:T.green    },
                             { label:"CO₂ Saved",       value:"0 kg", color:T.green    },
                             { label:"Water Received", value:"0 L",   color:T.blue     },
                             { label:"Total Spent",     value:"GH₵0", color:T.yellow },
                        ].map(s=>(
                             <div key={s.label} style={{ background:T.card,borderRadius:13,padding:"14px",
                               border:`1px solid ${T.border}`,textAlign:"center" }}>
                               <div style={{ fontSize:10,color:T.muted,marginBottom:5,textTransform:"upper
                               <div style={{ fontWeight:800,fontSize:22,color:s.color }}>{s.value}</div>
                             </div>
                        ))}
                    </div>
                    <button onClick={()=>setUser(null)} className="tap"
                        style={{ width:"100%",background:"rgba(248,113,113,.07)",border:"1px solid rgba
                             borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.red,cursor:
                             marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",ga
                        {Ico.logout()} Sign Out
                    </button>
                  </>
             ) : (
                  <div style={{ textAlign:"center",padding:"30px 16px" }}>
                    <Logo size={76}/>
                    <div style={{ fontWeight:800,fontSize:21,color:T.text,marginTop:16,marginBottom:8
                    <div style={{ color:T.muted,fontSize:13,marginBottom:28,lineHeight:1.7 }}>
                        Track charges, view bookings,<br/>and see your environmental impact.
                    </div>
                    <button onClick={()=>go("auth")} className="tap"
                        style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDa
                             border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,
                             color:"#000",cursor:"pointer",marginBottom:12,fontFamily:"inherit" }}>Sign In
                  </div>
             )}
           </div>
           <Nav active="Profile" go={go}/>
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
                  <div style={{ fontWeight:800,fontSize:22,color:T.text,marginTop:14 }}>EcoCharge Gha
                  <div style={{ fontSize:13,color:T.muted,marginTop:6 }}>Solar Charging · Clean Water
             </div>
             {[
                  { icon:Ico.bolt(T.yellow), title:"Solar EV Charging",     text:"100% solar-powered sta
                  { icon:Ico.water(T.blue),     title:"Clean Water Access", text:"Every session includes
                  { icon:Ico.bolt(T.green),     title:"Zero Emissions",     text:"Our stations run on so
                  { icon:Ico.profile(T.mutedLight), title:"Local Employment", text:"We train and empl
             ].map((item,i)=>(
                  <div key={i} className={`fade${i}`} style={{ background:T.card,borderRadius:14,padd
                    border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"flex-start" }}>
                    <div style={{ flexShrink:0,marginTop:2 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:5 }}>{item.t
                      <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{item.text}</div>
                    </div>
                  </div>
             ))}
             <button onClick={()=>go("home")} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})
                    border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,
                    color:"#000",cursor:"pointer",marginBottom:20,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  {Ico.bolt("#000")} Find a Station
             </button>
           </div>
           <Nav active="More" go={go}/>
         </div>
    );
}


// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
    const [screen,           setScreen]    = useState(()=>{ try { return localStorage.getItem("eco_user"
    const [authMode, setAuthMode] = useState("login");
    const [station,          setStation]   = useState(null);
    const [vehicle,          setVehicle]   = useState(null);
    const [stations, setStations] = useState(STATIONS);
    const [booking,          setBooking]   = useState(()=>{ try { const b=localStorage.getItem("eco_book
    const [user,             setUserRaw]   = useState(()=>{ try { const u=localStorage.getItem("eco_user
    const [drawer,           setDrawer]    = useState(false);
const setUser = (u) => {
     setUserRaw(u);
     try { u?localStorage.setItem("eco_user",JSON.stringify(u)):localStorage.removeItem("eco_u
};


const go = (s) => { setScreen(s); setDrawer(false); };


const goSecure = (s) => {
     const open = ["splash","auth","about","home","detail","verify"];
     if (!user&&!open.includes(s)) { setAuthMode("login"); go("auth"); return; }
     go(s);
};


useEffect(()=>{
     if (SUPABASE_URL) sb("stations?select=*&order=id").then(d=>{ if(d?.length) setStations(d)
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
         home:           <Home      {...props}/>,
         detail:         <Detail    {...props}/>,
         vehicles: <Vehicles {...props}/>,
         booking:        <Booking   {...props}/>,
         qr:             <QRScreen {...props}/>,
         verify:         <Verify    {...props}/>,
         profile:        <Profile   {...props}/>,
         about:          <About     {...props}/>,
    };


    return (
         <>
              <style>{CSS}</style>
              <div style={{ position:"relative",height:"100vh",overflow:"hidden",background:T.bg }}>
                <Drawer open={drawer} onClose={()=>setDrawer(false)}
                  go={goSecure} user={user}
                  onLogout={()=>{ setUser(null); go("splash"); }}/>
                <div style={{ height:"100%",display:"flex",flexDirection:"column",overflow:"hidden" }
                  {views[screen]||views.home}
                </div>
              </div>
         </>
    );
}
