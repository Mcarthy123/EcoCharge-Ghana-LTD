// ============================================================
// EcoCharge Ghana — Home+ Dashboard
// Phase 1: Shell & UI (sample data)
// Phase 2: Smart Charging controls + real scheduling
//
// HONESTY NOTES:
// - Start/Stop/Pause/Resume charger actions are SIMULATED. No home
//   charger hardware is connected yet (that's Phase 5 — Charger
//   Management + real OCPP telemetry).
// - Schedules ARE real — saved to Supabase (charging_schedules table)
//   and will be ready to drive real hardware once Phase 5 lands.
// - Dashboard stats (battery %, kWh, cost) remain sample data until
//   a real charger is connected.
// ============================================================
import { useState, useEffect } from "react";

// ── MOCK SESSION DATA (replaced by real telemetry in Phase 5) ──
const MOCK_SESSION_BASE = {
  batteryPct: 62,
  targetPct: 80,
  powerKw: 7.4,
  energyKwh: 12.6,
  costGHS: 10.71,
  remainingMin: 48,
  rangeKm: 312,
  batteryTempC: null,
  chargerOnline: true,
  monthlyKwh: 184.2,
  monthlyCostGHS: 156.57,
};

const MOCK_VEHICLE = {
  nickname: "My EV",
  manufacturer: "Hyundai",
  model: "Kona Electric",
};

const DAYS = [
  { key:"MO", label:"M" }, { key:"TU", label:"T" }, { key:"WE", label:"W" },
  { key:"TH", label:"T" }, { key:"FR", label:"F" }, { key:"SA", label:"S" }, { key:"SU", label:"S" },
];

// ── SUPABASE REST HELPERS ─────────────────────────────────────
const sbGet = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` } });
    return await res.json();
  } catch(e) { return null; }
};
const sbPost = async (SUPABASE_URL, SUPABASE_ANON, getToken, path, body) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"POST",
      headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
};
const sbPatch = async (SUPABASE_URL, SUPABASE_ANON, getToken, path, body) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"PATCH",
      headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch(e) { return false; }
};
const sbDelete = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"DELETE",
      headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` },
    });
    return res.ok;
  } catch(e) { return false; }
};

// ── SCHEDULE SERVICE (real Supabase-backed data) ───────────────
const ScheduleService = {
  async list(userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_schedules?user_id=eq.${userId}&order=created_at.desc`);
    return Array.isArray(data) ? data : [];
  },
  async create(userId, schedule, ctx) {
    const saved = await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "charging_schedules", {
      user_id: userId, label: schedule.label, start_time: schedule.startTime, stop_time: schedule.stopTime,
      off_peak_only: schedule.offPeakOnly, repeat_days: schedule.repeatDays, active: true,
    });
    return saved?.[0] || null;
  },
  async toggle(id, active, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_schedules?id=eq.${id}`, { active });
  },
  async remove(id, ctx) {
    return sbDelete(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_schedules?id=eq.${id}`);
  },
};

// ── UI PRIMITIVES ───────────────────────────────────────────────
const Card = ({ T, children, style }) => (
  <div className="fade" style={{
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

const STATUS_COLOR = { Charging:"#38bdf8", Scheduled:"#fbbf24", Completed:"#4ade80", Paused:"#f97316", Idle:"#9ca3af" };
const STATUS_ICON  = { Charging:"fa-bolt", Scheduled:"fa-clock", Completed:"fa-check-circle", Paused:"fa-pause-circle", Idle:"fa-power-off" };

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" });

// ── NEW SCHEDULE MODAL ──────────────────────────────────────────
function ScheduleModal({ T, onClose, onSave, saving }) {
  const [startTime, setStartTime] = useState("23:00");
  const [stopTime, setStopTime] = useState("06:00");
  const [offPeakOnly, setOffPeakOnly] = useState(false);
  const [repeatDays, setRepeatDays] = useState(["MO","TU","WE","TH","FR","SA","SU"]);

  const toggleDay = (key) => setRepeatDays(prev => prev.includes(key) ? prev.filter(d=>d!==key) : [...prev, key]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ background:T.card,borderRadius:"20px 20px 0 0",padding:"22px 20px 36px",width:"100%",maxWidth:480,border:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>New Charging Schedule</div>
          <button onClick={onClose} className="tap" style={{ background:"none",border:"none",color:T.muted,fontSize:18,cursor:"pointer" }}><i className="fas fa-times"/></button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Start</div>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
          </div>
          <div>
            <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Stop</div>
            <input type="time" value={stopTime} onChange={e=>setStopTime(e.target.value)}
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
          </div>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:T.surfaceFaint,borderRadius:14,marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600,fontSize:13,color:T.text }}>Off-Peak Hours Only</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Only charge when electricity is cheaper</div>
          </div>
          <div onClick={()=>setOffPeakOnly(v=>!v)} className="tap"
            style={{ width:44,height:24,borderRadius:12,background:offPeakOnly?T.green:T.border,position:"relative",cursor:"pointer",flexShrink:0 }}>
            <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:offPeakOnly?23:3,transition:"left .2s" }}/>
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:8 }}>Repeat</div>
          <div style={{ display:"flex",gap:6 }}>
            {DAYS.map(d=>(
              <button key={d.key} onClick={()=>toggleDay(d.key)} className="tap"
                style={{ flex:1,aspectRatio:"1",background:repeatDays.includes(d.key)?T.green:T.inputBg,border:`1px solid ${repeatDays.includes(d.key)?T.green:T.border}`,borderRadius:"50%",fontSize:12,fontWeight:700,color:repeatDays.includes(d.key)?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={()=>onSave({ startTime, stopTime, offPeakOnly, repeatDays, label:`${startTime} – ${stopTime}` })} disabled={saving} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1 }}>
          {saving ? "Saving…" : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}

export default function HomePlusDashboard({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const ctx = { SUPABASE_URL, SUPABASE_ANON, getToken };
  const [session, setSession] = useState({ ...MOCK_SESSION_BASE, status:"Idle" });
  const [vehicle] = useState(MOCK_VEHICLE);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [estCompletion, setEstCompletion] = useState(null);

  const statusColor = STATUS_COLOR[session.status] || T.muted;
  const statusIcon = STATUS_ICON[session.status] || "fa-bolt";

  const loadSchedules = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoadingSchedules(false); return; }
    setLoadingSchedules(true);
    const data = await ScheduleService.list(user.id, ctx);
    setSchedules(data);
    setLoadingSchedules(false);
  };
  useEffect(()=>{ loadSchedules(); }, [user?.id]);

  // ── Simulated charger controls (no real hardware connected yet) ──
  const startCharging = () => {
    const d = new Date(); d.setMinutes(d.getMinutes()+48);
    setEstCompletion(d);
    setSession(s => ({ ...s, status:"Charging" }));
  };
  const pauseCharging = () => setSession(s => ({ ...s, status:"Paused" }));
  const resumeCharging = () => setSession(s => ({ ...s, status:"Charging" }));
  const stopCharging = () => setSession(s => ({ ...s, status:"Idle" }));

  const saveSchedule = async (schedule) => {
    setSavingSchedule(true);
    const saved = await ScheduleService.create(user.id, schedule, ctx);
    if (saved) setSchedules(prev => [saved, ...prev]);
    setSavingSchedule(false);
    setShowScheduleModal(false);
    if (saved) setSession(s => (s.status==="Idle" ? { ...s, status:"Scheduled" } : s));
  };

  const toggleSchedule = async (sch) => {
    const next = !sch.active;
    setSchedules(prev => prev.map(s => s.id===sch.id ? { ...s, active:next } : s));
    await ScheduleService.toggle(sch.id, next, ctx);
  };

  const deleteSchedule = async (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    await ScheduleService.remove(id, ctx);
  };

  const fmtRepeat = (days) => {
    if (!days || days.length === 0) return "One-time";
    if (days.length === 7) return "Every day";
    const weekday = ["MO","TU","WE","TH","FR"];
    if (days.length===5 && weekday.every(d=>days.includes(d))) return "Weekdays";
    return days.join(", ");
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="EcoCharge Home+" sub="Smart charging dashboard"
        onBack={()=>go("home")}
        right={<Badge label="PREMIUM" color={T.green}/>}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        <div style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <i className="fas fa-flask" style={{ color:T.blue,fontSize:14 }}/>
          <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.6 }}>
            Charger controls are simulated — no home charger is connected yet. Schedules you save here are real.
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
                {session.status==="Charging" && estCompletion ? (
                  <>{session.remainingMin} min remaining<br/>Est. completion {fmtTime(estCompletion)}</>
                ) : session.status==="Paused" ? "Charging paused" : session.status==="Scheduled" ? "Waiting for scheduled window" : "Not charging"}
              </div>
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
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

          {/* Charging controls */}
          <div style={{ display:"grid",gridTemplateColumns: session.status==="Idle"||session.status==="Scheduled" ? "1fr" : "1fr 1fr", gap:8 }}>
            {(session.status==="Idle" || session.status==="Scheduled") && (
              <button onClick={startCharging} className="tap"
                style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                <i className="fas fa-bolt" style={{ marginRight:8 }}/>Start Charging
              </button>
            )}
            {session.status==="Charging" && (
              <>
                <button onClick={pauseCharging} className="tap"
                  style={{ background:"rgba(251,191,36,0.15)",border:`1px solid ${T.yellow}44`,borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:T.yellow,cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-pause" style={{ marginRight:8 }}/>Pause
                </button>
                <button onClick={stopCharging} className="tap"
                  style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-stop" style={{ marginRight:8 }}/>Stop
                </button>
              </>
            )}
            {session.status==="Paused" && (
              <>
                <button onClick={resumeCharging} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-play" style={{ marginRight:8 }}/>Resume
                </button>
                <button onClick={stopCharging} className="tap"
                  style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-stop" style={{ marginRight:8 }}/>Stop
                </button>
              </>
            )}
          </div>
        </Card>

        {/* Schedules */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
          <div style={{ fontWeight:800,fontSize:14,color:T.text }}>Charging Schedules</div>
          <button onClick={()=>setShowScheduleModal(true)} className="tap"
            style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
            <i className="fas fa-plus" style={{ marginRight:6 }}/>New
          </button>
        </div>

        {loadingSchedules && (
          <div style={{ textAlign:"center",padding:"20px 0",color:T.muted,fontSize:12 }}>Loading…</div>
        )}
        {!loadingSchedules && schedules.length===0 && (
          <Card T={T} style={{ padding:18, marginBottom:16, textAlign:"center" }}>
            <i className="fas fa-calendar-plus" style={{ fontSize:22,color:T.muted,marginBottom:8,display:"block" }}/>
            <div style={{ fontSize:12,color:T.muted }}>No schedules yet. Add one to charge automatically overnight or during off-peak hours.</div>
          </Card>
        )}
        {schedules.map(sch=>(
          <Card key={sch.id} T={T} style={{ padding:16, marginBottom:10, opacity:sch.active?1:0.55 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{sch.start_time} – {sch.stop_time}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:3 }}>{fmtRepeat(sch.repeat_days)}{sch.off_peak_only?" · Off-peak only":""}</div>
              </div>
              <div onClick={()=>toggleSchedule(sch)} className="tap"
                style={{ width:40,height:22,borderRadius:11,background:sch.active?T.green:T.border,position:"relative",cursor:"pointer",flexShrink:0 }}>
                <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:sch.active?21:3,transition:"left .2s" }}/>
              </div>
            </div>
            <button onClick={()=>deleteSchedule(sch.id)} className="tap"
              style={{ background:"none",border:"none",color:T.red,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:0 }}>
              <i className="fas fa-trash" style={{ marginRight:5 }}/>Delete
            </button>
          </Card>
        ))}

        {/* Monthly usage */}
        <Card T={T} style={{ padding:18, marginTop:6, marginBottom:14 }}>
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

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Coming Soon</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          {[
            { label:"Battery Protection", icon:"fa-shield-alt" },
            { label:"AI Assistant", icon:"fa-robot" },
            { label:"Charger Management", icon:"fa-charging-station" },
            { label:"Family Sharing", icon:"fa-users" },
          ].map(f=>(
            <Card key={f.label} T={T} style={{ padding:14,display:"flex",alignItems:"center",gap:10,opacity:0.6 }}>
              <i className={`fas ${f.icon}`} style={{ fontSize:14,color:T.muted }}/>
              <span style={{ fontSize:12,color:T.mutedLight,fontWeight:600 }}>{f.label}</span>
            </Card>
          ))}
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleModal T={T} saving={savingSchedule} onClose={()=>setShowScheduleModal(false)} onSave={saveSchedule}/>
      )}
    </div>
  );
}
