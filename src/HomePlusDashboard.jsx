// ============================================================
// EcoCharge Ghana — Home+ Dashboard (Phase 1: Shell & UI)
// Self-contained module. Does not modify existing App.jsx screens.
//
// HONESTY NOTE: This phase renders with realistic SAMPLE DATA.
// No home charger integration exists yet — that's Phase 5 (Charger
// Management + real OCPP telemetry). Every number here is a preview
// so you can see the premium feel before real data is wired in.
// ============================================================
import { useState, useEffect } from "react";

// ── MOCK DATA (replaced by real Supabase + OCPP data in later phases) ──
const MOCK_SESSION = {
  status: "Charging", // Charging | Scheduled | Completed | Idle
  batteryPct: 62,
  targetPct: 80,
  powerKw: 7.4,
  energyKwh: 12.6,
  costGHS: 10.71,
  remainingMin: 48,
  estCompletion: (() => { const d = new Date(); d.setMinutes(d.getMinutes()+48); return d; })(),
  rangeKm: 312,
  batteryTempC: null, // not available from any connected hardware yet — shown honestly as "Not available"
  chargerOnline: true,
  monthlyKwh: 184.2,
  monthlyCostGHS: 156.57,
};

const MOCK_VEHICLE = {
  nickname: "My EV",
  manufacturer: "Hyundai",
  model: "Kona Electric",
  image_url: null,
};

// ── UI PRIMITIVES (matches ReservationSystem.jsx glass language) ──
const Card = ({ T, children, style, className="" }) => (
  <div className={`fade ${className}`.trim()} style={{
    background:T.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${T.surfaceBorder}`, borderRadius:20,
    boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
    ...style,
  }}>{children}</div>
);
const Badge = ({ label, color }) => (
  <span style={{ background:`${color}1f`,color,fontSize:10,fontWeight:700,borderRadius:20,padding:"4px 10px",border:`1px solid ${color}44`,whiteSpace:"nowrap" }}>{label}</span>
);
const Header = ({ T, title, sub, onBack, right }) => (
  <div style={{ position:"sticky",top:0,zIndex:10,padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.surfaceBorder}`,background:T.navBg,backdropFilter:"blur(16px)" }}>
    <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
      <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
    </button>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,letterSpacing:-0.2 }}>{title}</div>
      {sub && <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const STATUS_COLOR = { Charging:"#38bdf8", Scheduled:"#fbbf24", Completed:"#4ade80", Idle:"#9ca3af" };
const STATUS_ICON  = { Charging:"fa-bolt", Scheduled:"fa-clock", Completed:"fa-check-circle", Idle:"fa-power-off" };

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" });

export default function HomePlusDashboard({ go, user, T }) {
  const [session] = useState(MOCK_SESSION);
  const [vehicle] = useState(MOCK_VEHICLE);
  const statusColor = STATUS_COLOR[session.status] || T.muted;
  const statusIcon = STATUS_ICON[session.status] || "fa-bolt";

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="EcoCharge Home+" sub="Smart charging dashboard"
        onBack={()=>go("home")}
        right={<Badge label="PREMIUM" color={T.green}/>}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        {/* Preview-mode honesty banner */}
        <div style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <i className="fas fa-flask" style={{ color:T.blue,fontSize:14 }}/>
          <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.6 }}>
            Preview mode — showing sample data. Real charger connection isn't wired in yet.
          </div>
        </div>

        {/* Vehicle + battery hero */}
        <Card T={T} style={{ padding:22, marginBottom:16, background:T.highlightGrad2 || "linear-gradient(135deg,#0a1f12,#0d2d1a)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{vehicle.nickname}</div>
              <div style={{ fontSize:13,color:T.mutedLight }}>{vehicle.manufacturer} {vehicle.model}</div>
            </div>
            <Badge label={session.status} color={statusColor}/>
          </div>

          <div style={{ display:"flex",alignItems:"center",gap:20,marginBottom:18 }}>
            <div style={{ position:"relative",width:100,height:100,flexShrink:0 }}>
              <svg width="100" height="100" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke={T.track} strokeWidth="9"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke={statusColor} strokeWidth="9"
                  strokeDasharray={`${2*Math.PI*42}`} strokeDashoffset={`${2*Math.PI*42*(1-session.batteryPct/100)}`} strokeLinecap="round"
                  style={{ transition:"stroke-dashoffset 1s ease" }}/>
              </svg>
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                <div style={{ fontWeight:900,fontSize:24,color:T.text,lineHeight:1 }}>{session.batteryPct}%</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>→ {session.targetPct}%</div>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <i className={`fas ${statusIcon}`} style={{ color:statusColor,fontSize:14 }}/>
                <span style={{ fontWeight:700,fontSize:14,color:T.text }}>{session.status}</span>
              </div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>
                {session.remainingMin} min remaining<br/>
                Est. completion {fmtTime(session.estCompletion)}
              </div>
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[
              { label:"Power", value:`${session.powerKw} kW`, icon:"fa-bolt" },
              { label:"Energy", value:`${session.energyKwh} kWh`, icon:"fa-battery-three-quarters" },
              { label:"Cost", value:`GH₵${session.costGHS.toFixed(2)}`, icon:"fa-coins" },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(0,0,0,0.25)",borderRadius:12,padding:"10px 8px",textAlign:"center" }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:12,color:T.green,marginBottom:6,display:"block" }}/>
                <div style={{ fontWeight:800,fontSize:13,color:T.text }}>{s.value}</div>
                <div style={{ fontSize:8,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:0.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Charger status */}
        <Card T={T} style={{ padding:16, marginBottom:14, display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:session.chargerOnline?"rgba(34,197,94,0.15)":"rgba(248,113,113,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-charging-station" style={{ fontSize:16,color:session.chargerOnline?T.green:T.red }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Home Charger</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{session.chargerOnline?"Online and ready":"Offline"}</div>
          </div>
          <Badge label={session.chargerOnline?"Online":"Offline"} color={session.chargerOnline?T.green:T.red}/>
        </Card>

        {/* Range + battery temp */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
          <Card T={T} style={{ padding:16,textAlign:"center" }}>
            <i className="fas fa-road" style={{ fontSize:16,color:T.blue,marginBottom:8,display:"block" }}/>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{session.rangeKm} km</div>
            <div style={{ fontSize:10,color:T.muted,marginTop:4,textTransform:"uppercase",letterSpacing:0.4 }}>Est. Range</div>
          </Card>
          <Card T={T} style={{ padding:16,textAlign:"center" }}>
            <i className="fas fa-thermometer-half" style={{ fontSize:16,color:T.yellow,marginBottom:8,display:"block" }}/>
            <div style={{ fontWeight:800,fontSize:18,color:session.batteryTempC!=null?T.text:T.muted }}>
              {session.batteryTempC!=null ? `${session.batteryTempC}°C` : "Not available"}
            </div>
            <div style={{ fontSize:10,color:T.muted,marginTop:4,textTransform:"uppercase",letterSpacing:0.4 }}>Battery Temp</div>
          </Card>
        </div>

        {/* Monthly usage */}
        <Card T={T} style={{ padding:18, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:14 }}><i className="fas fa-calendar-alt" style={{ marginRight:8,color:T.green }}/>This Month</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>Energy Used</div>
              <div style={{ fontWeight:800,fontSize:16,color:T.text,marginTop:4 }}>{session.monthlyKwh} kWh</div>
            </div>
            <div style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>Electricity Cost</div>
              <div style={{ fontWeight:800,fontSize:16,color:T.text,marginTop:4 }}>GH₵{session.monthlyCostGHS.toFixed(2)}</div>
            </div>
          </div>
        </Card>

        {/* Coming soon teaser row */}
        <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Coming Soon</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          {[
            { label:"Smart Scheduling", icon:"fa-calendar-check" },
            { label:"Battery Protection", icon:"fa-shield-alt" },
            { label:"AI Assistant", icon:"fa-robot" },
            { label:"Family Sharing", icon:"fa-users" },
          ].map(f=>(
            <Card key={f.label} T={T} style={{ padding:14,display:"flex",alignItems:"center",gap:10,opacity:0.6 }}>
              <i className={`fas ${f.icon}`} style={{ fontSize:14,color:T.muted }}/>
              <span style={{ fontSize:12,color:T.mutedLight,fontWeight:600 }}>{f.label}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
