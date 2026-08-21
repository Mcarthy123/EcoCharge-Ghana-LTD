// ============================================================
// EcoCharge Ghana — Home+ Dashboard
// Phase 1: Shell & UI (sample data)
// Phase 2: Smart Charging controls + real scheduling
// Phase 3: Battery Protection + Battery Tips
// Phase 4: AI Assistant (rule-based — no LLM key configured yet)
// Phase 5: Charger Management + real OCPP telemetry
// Phase 6: Multi-protocol charger adapter layer (see chargerAdapters.js)
//
// HONESTY NOTES:
// - If you LINK a real charger (via your existing OCPP simulator/
//   Railway setup), Start/Stop send REAL OCPP RemoteStart/RemoteStop
//   commands, and online/offline + firmware/serial are REAL data
//   pulled from that charger's OCPP boot info.
// - If no charger is linked, the dashboard falls back to the same
//   simulated hero card as Phases 1–4, clearly labeled as such.
// - Live kWh/power *during* a session is still sample data — it
//   depends on your OCPP server forwarding meter values, which
//   isn't guaranteed with every simulator. This will read real once
//   confirmed.
// - Wi-Fi signal strength is NOT part of standard OCPP 1.6J boot
//   data, so it's honestly shown as "Not available" rather than
//   invented.
// - Schedules ARE real — saved to Supabase (charging_schedules table).
// - Charge limit (80/90/100%) is REAL — reads/writes the vehicle's
//   own preferred_charge_limit field in user_vehicles.
// - The "AI Assistant" is RULE-BASED off real data, not a live LLM.
// - Battery health is only shown if self-reported when adding the
//   vehicle. Battery Stress is not available from any source yet.
// - Start/Stop now route through a protocol adapter layer
//   (see chargerAdapters.js). Only OCPP is real today — linking a
//   charger with any other protocol value surfaces a clear
//   "not built yet" error instead of pretending to work. Status
//   polling and charger discovery in Charger Management remain
//   OCPP-specific for now (they call your proven-working
//   /api/chargers list endpoint) — a generic multi-protocol
//   discovery/status system isn't built yet.
// ============================================================
import { useState, useEffect, useRef } from "react";
import { getAdapter } from "./chargerAdapters";

const OCPP_URL = import.meta.env.VITE_OCPP_SERVER_URL || "";
const OCPP_KEY = import.meta.env.VITE_OCPP_API_KEY    || "";

const ocppApi = async (path, method="GET", body=null) => {
  if (!OCPP_URL) return null;
  try {
    const res = await fetch(`${OCPP_URL}${path}`, {
      method, headers:{ "x-api-key":OCPP_KEY, "Content-Type":"application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
};

// ── MOCK SESSION DATA (fallback when no home charger is linked) ──
const MOCK_SESSION_BASE = {
  batteryPct: 62,
  targetPct: 80,
  powerKw: 7.4,
  energyKwh: 12.6,
  costGHS: 10.71,
  remainingMin: 48,
  rangeKm: 312,
  batteryTempC: null,
  monthlyKwh: 184.2,
  monthlyCostGHS: 156.57,
};

const DAYS = [
  { key:"MO", label:"M" }, { key:"TU", label:"T" }, { key:"WE", label:"W" },
  { key:"TH", label:"T" }, { key:"FR", label:"F" }, { key:"SA", label:"S" }, { key:"SU", label:"S" },
];

const CHARGE_LIMIT_EXPLANATIONS = {
  80: "Charging to 80% daily may help reduce long-term battery wear. Reserve full charges for long trips.",
  90: "90% is a middle ground — a bit more range each day with only a small extra impact on long-term battery health.",
  100: "Charging to 100% gives maximum range but doing this daily may accelerate battery wear over time.",
};

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

const HomeVehicleService = {
  async loadPrimary(userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `user_vehicles?user_id=eq.${userId}&order=is_default.desc,created_at.asc&limit=1`);
    return Array.isArray(data) && data[0] ? data[0] : null;
  },
  async setChargeLimit(vehicleId, limit, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `user_vehicles?id=eq.${vehicleId}`, { preferred_charge_limit: limit, updated_at: new Date().toISOString() });
  },
};

const HomeWalletService = {
  async getBalance(userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}&select=balance_pesewas`);
    return Array.isArray(data) && data[0] ? data[0].balance_pesewas : null;
  },
};

// ── HOME CHARGER SERVICE (links a real OCPP charger to this user) ──
const HomeChargerService = {
  async loadMine(userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `home_chargers?user_id=eq.${userId}&order=created_at.asc`);
    return Array.isArray(data) ? data : [];
  },
  async link(userId, chargerOcppId, nickname, ctx) {
    const saved = await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "home_chargers", {
      user_id: userId, charger_ocpp_id: chargerOcppId, nickname: nickname || "Home Charger", status:"Idle",
      charger_protocol: "ocpp", // every charger linked through this flow is discovered on your OCPP server
    });
    return saved?.[0] || null;
  },
  async rename(id, nickname, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `home_chargers?id=eq.${id}`, { nickname });
  },
  async unlink(id, ctx) {
    return sbDelete(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `home_chargers?id=eq.${id}`);
  },
};

const HomeAIService = {
  isOffPeakNow() {
    const h = new Date().getHours();
    return h >= 23 || h < 5;
  },
  nextOffPeakLabel() {
    const h = new Date().getHours();
    if (h >= 23 || h < 5) return "now";
    return "at 11:00 PM tonight";
  },
  recommendations({ vehicle, chargeLimit, schedules, walletBalancePesewas, sessionBatteryPct }) {
    const notes = [];
    const hasActiveSchedule = schedules.some(s => s.active);
    if (!hasActiveSchedule) {
      notes.push({ tone:"info", text:`Electricity is typically cheaper overnight. You don't have an active schedule — want to charge ${this.nextOffPeakLabel()}?` });
    } else {
      notes.push({ tone:"good", text:"You have an active charging schedule set up." });
    }
    if (vehicle?.estimated_range && vehicle?.daily_distance_km) {
      const projectedRangeKm = vehicle.estimated_range * (chargeLimit/100);
      const covers = projectedRangeKm >= vehicle.daily_distance_km * 1.3;
      notes.push(covers
        ? { tone:"good", text:`Charging to ${chargeLimit}% gives about ${Math.round(projectedRangeKm)} km — comfortably covers your typical ${vehicle.daily_distance_km} km/day.` }
        : { tone:"caution", text:`Your typical ${vehicle.daily_distance_km} km/day is close to what ${chargeLimit}% provides (~${Math.round(projectedRangeKm)} km). Consider a higher limit before a busy day.` });
    }
    if (walletBalancePesewas != null && walletBalancePesewas < 500) {
      notes.push({ tone:"caution", text:`Wallet balance is low (GH₵${(walletBalancePesewas/100).toFixed(2)}) — top up before your next charge.` });
    }
    if (this.isOffPeakNow() && sessionBatteryPct < chargeLimit) {
      notes.push({ tone:"good", text:"It's currently off-peak — a good time to charge if you're plugged in." });
    }
    return notes;
  },
  answer(key, { vehicle, chargeLimit, schedules, walletBalancePesewas }) {
    if (key === "charge_tonight") {
      const hasActiveSchedule = schedules.some(s => s.active);
      if (hasActiveSchedule) return "You already have an active schedule set up — it'll handle tonight's charging automatically.";
      return `Electricity is typically cheaper overnight. You don't have a schedule yet — tap "New" under Charging Schedules to set one for tonight.`;
    }
    if (key === "range_tomorrow") {
      if (!vehicle?.estimated_range) return "Add your vehicle's estimated range in My Vehicles so I can answer this accurately.";
      const projectedRangeKm = Math.round(vehicle.estimated_range * (chargeLimit/100));
      if (vehicle.daily_distance_km) {
        return projectedRangeKm >= vehicle.daily_distance_km * 1.3
          ? `Yes — charging to ${chargeLimit}% gives about ${projectedRangeKm} km, well above your typical ${vehicle.daily_distance_km} km/day.`
          : `It'll be close — ${chargeLimit}% gives about ${projectedRangeKm} km against your typical ${vehicle.daily_distance_km} km/day. Consider raising your limit for tomorrow.`;
      }
      return `Charging to ${chargeLimit}% gives you about ${projectedRangeKm} km of range.`;
    }
    if (key === "good_time_now") {
      return this.isOffPeakNow()
        ? "Yes — it's currently off-peak, typically the cheaper time to charge."
        : `Not the cheapest window right now. Off-peak pricing typically starts ${this.nextOffPeakLabel()}.`;
    }
    if (key === "wallet_check") {
      if (walletBalancePesewas == null) return "Sign in to check your wallet balance.";
      return walletBalancePesewas < 500
        ? `Your wallet balance is GH₵${(walletBalancePesewas/100).toFixed(2)} — you may want to top up before your next charge.`
        : `Your wallet balance is GH₵${(walletBalancePesewas/100).toFixed(2)} — should be enough for a typical home charge.`;
    }
    return "I don't have enough real data yet to answer that.";
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
const TONE_COLOR = (T, tone) => tone==="caution" ? T.yellow : tone==="good" ? T.green : T.blue;

const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" });

const PRESET_QUESTIONS = [
  { key:"charge_tonight", label:"Should I charge tonight?" },
  { key:"range_tomorrow", label:"Enough range tomorrow?" },
  { key:"good_time_now", label:"Is now a good time?" },
  { key:"wallet_check", label:"Check my wallet balance" },
];

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
// ── QR SCANNER FOR HOME CHARGER LINKING ─────────────────────
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

function HomeChargerQRScanner({ T, onResult, onClose }) {
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
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
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
        setError(e?.name==="NotAllowedError" ? "Camera permission was denied. Enable camera access to scan." : "Couldn't access the camera on this device.");
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
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",animation:"spin .8s linear infinite" }}/>
          </div>
        )}
      </div>
      <div style={{ padding:"20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",background:"#0a0d10" }}>
        <div style={{ textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:13,marginBottom:14 }}>Point your camera at the QR code on your home charger</div>
        <button onClick={onClose} className="tap" style={{ width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:14,padding:"15px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── CHARGER MANAGEMENT SCREEN ────────────────────────────────────
function ChargerManagement({ T, go, user, ctx, onBack, linkedChargers, onLinkedChanged }) {
  const [ocppChargers, setOcppChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cmdLoading, setCmdLoading] = useState("");
  const [cmdMsg, setCmdMsg] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  const handleScanResult = async (text) => {
    setScanning(false);
    const scannedId = text.startsWith("ECOCHARGER:") ? text.slice("ECOCHARGER:".length).trim() : text.trim();
    const match = ocppChargers.find(c => c.id === scannedId);
    if (!match) { setScanMsg(`No charger found matching "${scannedId}". Make sure it's powered on and try again.`); setTimeout(()=>setScanMsg(""),4000); return; }
    if (isLinked(match.id)) { setScanMsg(`"${scannedId}" is already linked.`); setTimeout(()=>setScanMsg(""),4000); return; }
    const rec = await HomeChargerService.link(user.id, match.id, match.id, ctx);
    if (rec) { setScanMsg("Charger linked! ✅"); onLinkedChanged(); }
    else setScanMsg("Could not link charger. Try again.");
    setTimeout(()=>setScanMsg(""), 4000);
  };

  const loadOcpp = async () => {
    setLoading(true);
    const data = await ocppApi("/api/chargers");
    setOcppChargers(Array.isArray(data?.chargers) ? data.chargers : []);
    setLoading(false);
  };
  useEffect(()=>{ loadOcpp(); const t=setInterval(loadOcpp,10000); return ()=>clearInterval(t); }, []);

  const linkedIds = new Set(linkedChargers.map(c=>c.charger_ocpp_id));
  const isLinked = (id) => linkedIds.has(id);
  const linkedRecord = (id) => linkedChargers.find(c=>c.charger_ocpp_id===id);

  const linkCharger = async (c) => {
    const rec = await HomeChargerService.link(user.id, c.id, c.id, ctx);
    if (rec) onLinkedChanged();
  };
  const unlinkCharger = async (id) => {
    const rec = linkedRecord(id);
    if (!rec) return;
    await HomeChargerService.unlink(rec.id, ctx);
    onLinkedChanged();
  };
  const saveRename = async (rec) => {
    await HomeChargerService.rename(rec.id, renameValue || rec.nickname, ctx);
    setRenamingId(null);
    onLinkedChanged();
  };

  const sendCmd = async (chargerId, action, body={}) => {
    setCmdLoading(chargerId+action);
    const pathMap = {
      Reset: `/api/chargers/${chargerId}/reset`,
      Unlock: `/api/chargers/${chargerId}/unlock`,
    };
    const result = await ocppApi(pathMap[action], "POST", body);
    setCmdMsg(result?.success ? "Command sent ✅" : "Command failed — charger may be offline");
    setCmdLoading("");
    setTimeout(()=>setCmdMsg(""), 3000);
    loadOcpp();
  };

  if (!OCPP_URL) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Charger Management" onBack={onBack}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
        <div>
          <i className="fas fa-server" style={{ fontSize:48,color:T.muted,marginBottom:14,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:8 }}>No OCPP server configured</div>
          <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>Set VITE_OCPP_SERVER_URL and VITE_OCPP_API_KEY to connect real or simulated chargers.</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Charger Management" sub="Real OCPP connection" onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>
        {cmdMsg && (
          <div style={{ background:"rgba(74,222,128,0.08)",border:`1px solid ${T.greenDim||T.green}44`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:T.green }}>{cmdMsg}</div>
        )}
        {scanMsg && (
          <div style={{ background:"rgba(74,222,128,0.08)",border:`1px solid ${T.green}44`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:T.green }}>{scanMsg}</div>
        )}
        <button onClick={()=>go("quickconnect")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16 }}>
          <i className="fas fa-qrcode"/> Quick Connect
        </button>
        {loading && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Connecting to OCPP server…</div>}
        {!loading && ocppChargers.length===0 && (
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>No chargers found on your OCPP server yet.</div>
        )}
        {ocppChargers.map(c=>{
          const linked = isLinked(c.id);
          const rec = linkedRecord(c.id);
          return (
            <Card key={c.id} T={T} style={{ padding:16, marginBottom:12, border:linked?`1px solid ${T.green}66`:undefined }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div style={{ flex:1,minWidth:0 }}>
                  {renamingId===rec?.id ? (
                    <div style={{ display:"flex",gap:6 }}>
                      <input value={renameValue} onChange={e=>setRenameValue(e.target.value)} autoFocus
                        style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit" }}/>
                      <button onClick={()=>saveRename(rec)} className="tap" style={{ background:T.green,border:"none",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Save</button>
                    </div>
                  ) : (
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{linked ? rec.nickname : c.id}</div>
                  )}
                  <div style={{ fontSize:11,color:T.muted,marginTop:3 }}>{c.info?.chargePointModel||"Unknown model"} · {c.info?.chargePointVendor||""}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0,marginLeft:10 }}>
                  <Badge label={c.connected?"Online":"Offline"} color={c.connected?T.green:T.red}/>
                  {linked && <Badge label="Linked" color={T.blue}/>}
                </div>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
                {[
                  { label:"Firmware", value:c.info?.firmwareVersion || "Not available" },
                  { label:"Serial", value:c.info?.chargePointSerialNumber || "Not available" },
                  { label:"Wi-Fi Signal", value:"Not available" },
                  { label:"Last Heartbeat", value:c.lastHeartbeat ? new Date(c.lastHeartbeat).toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"}) : "—" },
                ].map(r=>(
                  <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px 10px" }}>
                    <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>{r.label}</div>
                    <div style={{ fontWeight:600,fontSize:12,color:T.text,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid",gridTemplateColumns:linked?"1fr 1fr 1fr":"1fr",gap:8 }}>
                {!linked && (
                  <button onClick={()=>linkCharger(c)} className="tap"
                    style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                    <i className="fas fa-link" style={{ marginRight:6 }}/>Link as My Home Charger
                  </button>
                )}
                {linked && (
                  <>
                    <button onClick={()=>{ setRenamingId(rec.id); setRenameValue(rec.nickname); }} className="tap"
                      style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 4px",fontSize:11,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                      <i className="fas fa-pencil-alt"/>
                    </button>
                    <button onClick={()=>sendCmd(c.id,"Reset",{type:"Soft"})} disabled={!!cmdLoading} className="tap"
                      style={{ background:"rgba(251,191,36,0.12)",border:`1px solid ${T.yellow}44`,borderRadius:10,padding:"10px 4px",fontSize:11,fontWeight:700,color:T.yellow,cursor:"pointer",fontFamily:"inherit" }}>
                      {cmdLoading===c.id+"Reset" ? "…" : <><i className="fas fa-redo"/> Restart</>}
                    </button>
                    <button onClick={()=>unlinkCharger(c.id)} className="tap"
                      style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 4px",fontSize:11,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
                      <i className="fas fa-unlink"/>
                    </button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {scanning && <HomeChargerQRScanner T={T} onResult={handleScanResult} onClose={()=>setScanning(false)}/>}
    </div> 
    
  );
}

export default function HomePlusDashboard({ go: goApp, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const ctx = { SUPABASE_URL, SUPABASE_ANON, getToken };
  const [screen, setScreen] = useState("dashboard"); // dashboard | chargers
  const [session, setSession] = useState({ ...MOCK_SESSION_BASE, status:"Idle" });
  const [vehicle, setVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [chargeLimit, setChargeLimit] = useState(80);
  const [savingLimit, setSavingLimit] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [estCompletion, setEstCompletion] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [linkedChargers, setLinkedChargers] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(true);
  const [liveCharger, setLiveCharger] = useState(null); // real OCPP state for the linked charger, if any
  const [sendingCmd, setSendingCmd] = useState(false);
  const [chargerCmdError, setChargerCmdError] = useState(""); // surfaced when a charger's protocol isn't supported yet

  const statusColor = STATUS_COLOR[session.status] || T.muted;
  const statusIcon = STATUS_ICON[session.status] || "fa-bolt";
  const primaryLinked = linkedChargers[0] || null;

  const loadVehicle = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoadingVehicle(false); return; }
    setLoadingVehicle(true);
    const v = await HomeVehicleService.loadPrimary(user.id, ctx);
    setVehicle(v);
    setChargeLimit(v?.preferred_charge_limit || 80);
    setLoadingVehicle(false);
  };
  useEffect(()=>{ loadVehicle(); }, [user?.id]);

  const loadSchedules = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoadingSchedules(false); return; }
    setLoadingSchedules(true);
    const data = await ScheduleService.list(user.id, ctx);
    setSchedules(data);
    setLoadingSchedules(false);
  };
  useEffect(()=>{ loadSchedules(); }, [user?.id]);

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) return;
    HomeWalletService.getBalance(user.id, ctx).then(setWalletBalance);
  }, [user?.id]);

  const loadLinked = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoadingLinked(false); return; }
    setLoadingLinked(true);
    const data = await HomeChargerService.loadMine(user.id, ctx);
    setLinkedChargers(data);
    setLoadingLinked(false);
  };
  useEffect(()=>{ loadLinked(); }, [user?.id]);

  // Poll real OCPP status for the linked charger, if one exists
  useEffect(()=>{
    if (!primaryLinked || !OCPP_URL || primaryLinked.charger_protocol && primaryLinked.charger_protocol !== "ocpp") { setLiveCharger(null); return; }
    let cancelled = false;
    const poll = async () => {
      const data = await ocppApi("/api/chargers");
      const found = (data?.chargers || []).find(c => c.id === primaryLinked.charger_ocpp_id);
      if (!cancelled) setLiveCharger(found || null);
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, [primaryLinked?.id]);

  // ── Charging controls: routed through the protocol adapter layer ──
  // Only OCPP is real today. Any other charger_protocol value will
  // throw a clear "not built yet" error via the adapter, surfaced
  // below rather than silently failing or pretending to succeed.
  const startCharging = async () => {
    if (primaryLinked) {
      setSendingCmd(true);
      setChargerCmdError("");
      try {
        const adapter = getAdapter(primaryLinked.charger_protocol || "ocpp");
        const result = await adapter.remoteStart({ ...primaryLinked, ocpp_charger_id: primaryLinked.charger_ocpp_id });
        if (result?.success !== false) setSession(s => ({ ...s, status:"Charging" }));
      } catch (e) {
        setChargerCmdError(e.message || "Could not start charging.");
      }
      setSendingCmd(false);
      return;
    }
    const d = new Date(); d.setMinutes(d.getMinutes()+48);
    setEstCompletion(d);
    setSession(s => ({ ...s, status:"Charging" }));
  };
  const stopCharging = async () => {
    if (primaryLinked) {
      setSendingCmd(true);
      setChargerCmdError("");
      try {
        const adapter = getAdapter(primaryLinked.charger_protocol || "ocpp");
        await adapter.remoteStop({ ...primaryLinked, ocpp_charger_id: primaryLinked.charger_ocpp_id });
        setSession(s => ({ ...s, status:"Idle" }));
      } catch (e) {
        setChargerCmdError(e.message || "Could not stop charging.");
      }
      setSendingCmd(false);
      return;
    }
    setSession(s => ({ ...s, status:"Idle" }));
  };
  const pauseCharging = () => setSession(s => ({ ...s, status:"Paused" }));
  const resumeCharging = () => setSession(s => ({ ...s, status:"Charging" }));

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
  const changeChargeLimit = async (limit) => {
    setChargeLimit(limit);
    if (!vehicle?.id) return;
    setSavingLimit(true);
    await HomeVehicleService.setChargeLimit(vehicle.id, limit, ctx);
    setVehicle(v => v ? { ...v, preferred_charge_limit: limit } : v);
    setSavingLimit(false);
  };
  const askQuestion = (key) => {
    setActiveQuestion(key);
    setAnswerText(HomeAIService.answer(key, { vehicle, chargeLimit, schedules, walletBalancePesewas: walletBalance }));
  };

  const fmtRepeat = (days) => {
    if (!days || days.length === 0) return "One-time";
    if (days.length === 7) return "Every day";
    const weekday = ["MO","TU","WE","TH","FR"];
    if (days.length===5 && weekday.every(d=>days.includes(d))) return "Weekdays";
    return days.join(", ");
  };

  const tips = [
    "Use scheduled overnight charging where possible.",
    "Charge to 100% only before long trips — daily 80% charging is gentler on the battery.",
    "Avoid repeatedly letting your battery drop below 10%.",
  ];
  if (vehicle?.dc_fast_charge_frequency === "Frequently") tips.unshift("You've noted frequent DC fast charging — where possible, mix in slower AC charging to ease long-term battery wear.");
  if (vehicle?.charge_above_90_frequency === "Frequently") tips.unshift("You've noted charging above 90% often — consider lowering your daily charge limit below for typical driving.");

  const hasBatteryHealth = vehicle?.battery_health_pct != null;
  const aiRecommendations = !loadingVehicle && !loadingSchedules
    ? HomeAIService.recommendations({ vehicle, chargeLimit, schedules, walletBalancePesewas: walletBalance, sessionBatteryPct: session.batteryPct })
    : [];

  // Real online/offline badge if linked, otherwise a generic "not connected" state
  const chargerOnlineReal = primaryLinked ? !!liveCharger?.connected : null;

  if (screen === "chargers") {
    return (
      <ChargerManagement T={T} go={goApp} user={user} ctx={ctx} onBack={()=>setScreen("dashboard")}
        linkedChargers={linkedChargers} onLinkedChanged={loadLinked}/>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="EcoCharge Home+" sub="Smart charging dashboard"
        onBack={()=>goApp("home")}
        right={<Badge label="PREMIUM" color={T.green}/>}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        <div style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <i className="fas fa-flask" style={{ color:T.blue,fontSize:14 }}/>
          <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.6 }}>
            {primaryLinked ? "A real charger is linked — status and Start/Stop use real OCPP commands. Live kWh/cost during a session is still sample data." : "No charger linked yet — dashboard is simulated. Link one in Charger Management for real control."}
          </div>
        </div>

        <button onClick={()=>setScreen("chargers")} className="tap"
          style={{ width:"100%",background:T.surface,border:`1px solid ${T.surfaceBorder}`,borderRadius:16,padding:"14px 16px",marginBottom:16,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:`${T.green}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-charging-station" style={{ fontSize:15,color:T.green }}/>
          </div>
          <div style={{ flex:1,textAlign:"left" }}>
            <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Charger Management</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{primaryLinked ? `Linked: ${primaryLinked.nickname}` : "No charger linked"}</div>
          </div>
          <i className="fas fa-chevron-right" style={{ fontSize:13,color:T.muted }}/>
        </button>

        <Card T={T} style={{ padding:22, marginBottom:16, background:T.highlightGrad2 || "linear-gradient(135deg,#0a1f12,#0d2d1a)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>{vehicle?.nickname || "No vehicle on file"}</div>
              <div style={{ fontSize:13,color:T.mutedLight }}>{vehicle ? `${vehicle.manufacturer||""} ${vehicle.model||""}`.trim() : "Add a vehicle for personalized charging"}</div>
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
                <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>→ {chargeLimit}%</div>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <i className={`fas ${statusIcon}`} style={{ color:statusColor,fontSize:14 }}/>
                <span style={{ fontWeight:700,fontSize:14,color:T.text }}>{session.status}</span>
              </div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>
                {session.status==="Charging" && estCompletion ? (
                  <>{session.remainingMin} min remaining (est.)<br/>Est. completion {fmtTime(estCompletion)}</>
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

          {primaryLinked && (
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:11,color:T.muted }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:chargerOnlineReal?T.green:T.red }}/>
              {chargerOnlineReal ? "Home charger online" : "Home charger offline"} · {primaryLinked.nickname}
            </div>
          )}

          {chargerCmdError && (
            <div style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"9px 12px",marginBottom:12,fontSize:11,color:T.red,lineHeight:1.5 }}>
              {chargerCmdError}
            </div>
          )}

          <div style={{ display:"grid",gridTemplateColumns: session.status==="Idle"||session.status==="Scheduled" ? "1fr" : "1fr 1fr", gap:8 }}>
            {(session.status==="Idle" || session.status==="Scheduled") && (
              <button onClick={startCharging} disabled={sendingCmd} className="tap"
                style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:sendingCmd?0.7:1 }}>
                <i className="fas fa-bolt" style={{ marginRight:8 }}/>{sendingCmd?"Sending…":"Start Charging"}
              </button>
            )}
            {session.status==="Charging" && (
              <>
                <button onClick={pauseCharging} className="tap"
                  style={{ background:"rgba(251,191,36,0.15)",border:`1px solid ${T.yellow}44`,borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:T.yellow,cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-pause" style={{ marginRight:8 }}/>Pause
                </button>
                <button onClick={stopCharging} disabled={sendingCmd} className="tap"
                  style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"13px",fontSize:13,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit",opacity:sendingCmd?0.7:1 }}>
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

        <Card T={T} style={{ padding:18, marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
            <div style={{ fontWeight:800,fontSize:14,color:T.text }}><i className="fas fa-robot" style={{ marginRight:8,color:T.blue }}/>AI Assistant</div>
            <Badge label="Rule-based" color={T.blue}/>
          </div>
          <div style={{ fontSize:11,color:T.muted,marginBottom:14,lineHeight:1.6 }}>Answers use your real wallet, vehicle, and schedule data — not a live conversational AI yet.</div>
          {(loadingVehicle || loadingSchedules) ? (
            <div style={{ textAlign:"center",padding:"14px 0",color:T.muted,fontSize:12 }}>Loading…</div>
          ) : (
            <>
              {aiRecommendations.map((r,i)=>(
                <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<aiRecommendations.length-1?10:14 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:TONE_COLOR(T,r.tone),marginTop:6,flexShrink:0 }}/>
                  <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.7 }}>{r.text}</div>
                </div>
              ))}
              <div style={{ height:1,background:T.surfaceBorder,margin:"4px 0 14px" }}/>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10 }}>Ask a question</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:activeQuestion?14:0 }}>
                {PRESET_QUESTIONS.map(q=>(
                  <button key={q.key} onClick={()=>askQuestion(q.key)} className="tap"
                    style={{ background:activeQuestion===q.key?`${T.blue}22`:T.inputBg,border:`1px solid ${activeQuestion===q.key?T.blue:T.border}`,borderRadius:20,padding:"8px 14px",fontSize:11,fontWeight:700,color:activeQuestion===q.key?T.blue:T.mutedLight,cursor:"pointer",fontFamily:"inherit" }}>
                    {q.label}
                  </button>
                ))}
              </div>
              {activeQuestion && (
                <div className="fade" style={{ background:"rgba(56,189,248,0.06)",border:`1px solid ${T.blue}33`,borderRadius:12,padding:"12px 14px" }}>
                  <div style={{ fontSize:12,color:T.text,lineHeight:1.7 }}>{answerText}</div>
                </div>
              )}
            </>
          )}
        </Card>

        <Card T={T} style={{ padding:18, marginBottom:16 }}>
          <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:4 }}><i className="fas fa-shield-alt" style={{ marginRight:8,color:T.green }}/>Battery Protection</div>
          {!vehicle && !loadingVehicle && (
            <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>Add a vehicle to save a personal charge limit. Using 80% as a default for now.</div>
          )}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12,marginBottom:12 }}>
            {[80,90,100].map(p=>(
              <button key={p} onClick={()=>changeChargeLimit(p)} disabled={savingLimit} className="tap"
                style={{ background:chargeLimit===p?T.green:T.inputBg,border:`1px solid ${chargeLimit===p?T.green:T.border}`,borderRadius:12,padding:"14px 4px",fontSize:15,fontWeight:800,color:chargeLimit===p?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {p}%
              </button>
            ))}
          </div>
          <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.7,marginBottom:16 }}>{CHARGE_LIMIT_EXPLANATIONS[chargeLimit]}</div>
          <div style={{ height:1,background:T.surfaceBorder,marginBottom:16 }}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:5 }}>Battery Health</div>
              <div style={{ fontWeight:700,fontSize:14,color:hasBatteryHealth?T.text:T.muted }}>
                {hasBatteryHealth ? `${vehicle.battery_health_pct}%` : "Not available from your vehicle"}
              </div>
              {hasBatteryHealth && <div style={{ fontSize:9,color:T.muted,marginTop:3 }}>Self-reported</div>}
            </div>
            <div style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:5 }}>Battery Stress</div>
              <div style={{ fontWeight:700,fontSize:14,color:T.muted }}>Not available</div>
            </div>
          </div>
        </Card>

        <Card T={T} style={{ padding:18, marginBottom:16 }}>
          <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-lightbulb" style={{ marginRight:8,color:T.yellow }}/>Battery Tips</div>
          {tips.map((tip,i)=>(
            <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<tips.length-1?10:0 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:T.green,marginTop:6,flexShrink:0 }}/>
              <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.7 }}>{tip}</div>
            </div>
          ))}
        </Card>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
          <div style={{ fontWeight:800,fontSize:14,color:T.text }}>Charging Schedules</div>
          <button onClick={()=>setShowScheduleModal(true)} className="tap"
            style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
            <i className="fas fa-plus" style={{ marginRight:6 }}/>New
          </button>
        </div>
        {loadingSchedules && <div style={{ textAlign:"center",padding:"20px 0",color:T.muted,fontSize:12 }}>Loading…</div>}
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

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Home+ Features</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
        {[
            { label:"Subscription", icon:"fa-star", screen:"subscription" },
            { label:"Compatible Chargers", icon:"fa-plug", screen:"compatiblechargers" },
            { label:"Family Sharing", icon:"fa-users", screen:"familysharing" },
          ].map(f=>(
            <button key={f.label} onClick={()=>goApp(f.screen)} className="tap"
              style={{ background:T.surface,border:`1px solid ${T.surfaceBorder}`,borderRadius:20,padding:14,display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
              <i className={`fas ${f.icon}`} style={{ fontSize:14,color:T.green }}/>
              <span style={{ fontSize:12,color:T.text,fontWeight:700,flex:1 }}>{f.label}</span>
              <i className="fas fa-chevron-right" style={{ fontSize:11,color:T.muted }}/>
            </button>
          ))}
        </div>

        <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Coming Soon</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
         {[
            { label:"Solar Integration", icon:"fa-sun" },
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
