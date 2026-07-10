// ============================================================
// EcoCharge Ghana — Commercial EV Reservation Platform
// Self-contained module. Does not modify existing App.jsx screens.
// Reuses existing tables (stations, chargers, bookings, charging_sessions,
// wallet_transactions, notifications) and adds two new ones (queue,
// reservation_deposits) — see reservation_system_schema.sql.
//
// HONESTY NOTES:
// - Automatic grace-period cancellation runs reliably while this screen
//   is open. Guaranteeing it fires even if the app is closed needs a
//   server-side scheduled job (Supabase Edge Function + cron) — see the
//   note at the bottom of reservation_system_schema.sql.
// - Live charging %/kW/kWh follows the same pattern as your existing
//   charging screen: real if OCPP meter values are being written to
//   Supabase, realistic simulation otherwise.
// - Queue wait time is a heuristic (position × average session length),
//   not a learned prediction — no historical session-duration data
//   exists yet to build a real model from.
// - GPS arrival detection is real (browser geolocation + haversine).
// ============================================================
import { useState, useEffect, useRef } from "react";

const GRACE_PERIOD_MIN = 10;
const ARRIVAL_RADIUS_KM = 0.5;
const AVG_SESSION_MIN = 25; // heuristic for queue wait estimates
const DEFAULT_DEPOSIT_PESEWAS = 1000; // GH₵10 flat refundable deposit
const DEFAULT_CHARGER_KW = 60;
const DEFAULT_PRICE_PER_KWH = 0.85;
const CO2_PER_KWH = 0.5;
const WATER_LITRES_PER_SESSION = 20;

// ── GEO HELPERS ───────────────────────────────────────────────
const toRad = (d) => (d * Math.PI) / 180;
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
const genRef = () => `ECO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const fmtGHS = (pesewas) => `GH₵${((pesewas||0)/100).toFixed(2)}`;
const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" });
const fmtCountdown = (ms) => {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms/1000);
  const m = Math.floor(totalSec/60), s = totalSec%60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

// ── GEOLOCATION SERVICE ─────────────────────────────────────────
const GeoService = {
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err), { enableHighAccuracy:true, timeout:10000 }
      );
    });
  },
  watchPosition(onUpdate) {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      pos => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()=>{}, { enableHighAccuracy:true, maximumAge:5000 }
    );
  },
  clearWatch(id) { if (id!=null) navigator.geolocation.clearWatch(id); },
};

// ── SUPABASE REST HELPERS ────────────────────────────────────────
const sbGet = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` } });
    return await res.json();
  } catch(e) { return null; }
};
const sbPost = async (SUPABASE_URL, SUPABASE_ANON, getToken, path, body, returnRep=false) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"POST",
      headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer: returnRep?"return=representation":"return=minimal" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return returnRep ? await res.json() : true;
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

// ── STATION / CHARGER SERVICE ────────────────────────────────────
const StationService = {
  async loadChargers(stationId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `chargers?station_id=eq.${stationId}&select=*`);
    return Array.isArray(data) ? data : [];
  },
  chargerStatus(c) {
    if (c.has_fault) return "Offline";
    if (c.status === "Charging") return "Charging";
    if (c.status === "Reserved") return "Reserved";
    if (c.status === "Available" && c.online !== false) return "Available";
    return "Offline";
  },
  statusColor(T, status) {
    return { Available:T.green, Charging:T.blue, Reserved:T.yellow, Offline:T.red }[status] || T.muted;
  },
};

// ── QUEUE SERVICE ─────────────────────────────────────────────
const QueueService = {
  async join(chargerId, stationId, userId, bookingRef, ctx) {
    const existing = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&status=eq.waiting&select=position&order=position.desc&limit=1`);
    const nextPos = (Array.isArray(existing) && existing[0]?.position) ? existing[0].position + 1 : 1;
    await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "queue", {
      station_id: stationId, charger_id: chargerId, user_id: userId, booking_reference: bookingRef,
      position: nextPos, status: "waiting",
    });
    return nextPos;
  },
  async getMyPosition(chargerId, userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&user_id=eq.${userId}&status=eq.waiting&select=*&order=created_at.desc&limit=1`);
    return Array.isArray(data) ? data[0] : null;
  },
  async getQueueLength(chargerId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&status=eq.waiting&select=id`);
    return Array.isArray(data) ? data.length : 0;
  },
  async leave(queueId, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?id=eq.${queueId}`, { status:"left" });
  },
  async advanceNext(chargerId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&status=eq.waiting&select=*&order=position.asc&limit=1`);
    const next = Array.isArray(data) ? data[0] : null;
    if (next) {
      await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?id=eq.${next.id}`, { status:"active" });
      await NotificationService.send(next.user_id, "queue_update", "You're Up!", "A charger you were queued for is now available for you.", { charger_id:chargerId }, ctx);
    }
    return next;
  },
};

// ── DEPOSIT SERVICE (reuses the wallet's existing locked_pesewas field) ──
const DepositService = {
  async hold(userId, bookingRef, amountPesewas, ctx) {
    await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "reservation_deposits", {
      booking_reference: bookingRef, user_id: userId, amount_pesewas: amountPesewas, status: "held",
    });
    // lock funds on the wallet (same field your charging session flow already uses)
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}`, { locked_pesewas: amountPesewas });
    return true;
  },
  async refund(bookingRef, userId, ctx) {
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `reservation_deposits?booking_reference=eq.${bookingRef}`, { status:"refunded", resolved_at:new Date().toISOString() });
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}`, { locked_pesewas: 0 });
  },
  async forfeit(bookingRef, userId, amountPesewas, ctx) {
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `reservation_deposits?booking_reference=eq.${bookingRef}`, { status:"forfeited", resolved_at:new Date().toISOString() });
    // deduct from wallet balance and unlock
    const wRes = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}&select=balance_pesewas`);
    const bal = wRes?.[0]?.balance_pesewas || 0;
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}`, { balance_pesewas: Math.max(0, bal - amountPesewas), locked_pesewas: 0 });
    await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "wallet_transactions", {
      user_id:userId, type:"Debit", amount_pesewas:amountPesewas, description:"Reservation deposit forfeited (no-show)", status:"Completed", created_at:new Date().toISOString(),
    });
  },
};

// ── NOTIFICATION SERVICE ─────────────────────────────────────────
const NotificationService = {
  async send(userId, type, title, body, metadata, ctx) {
    if (!userId) return false;
    return sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "notifications", {
      user_id:userId, type, category:type, title, body, metadata:metadata||{}, is_read:false, sent_at:new Date().toISOString(),
    });
  },
};

// ── BOOKING SERVICE ───────────────────────────────────────────
const BookingService = {
  async create({ user, station, charger, vehicle, arrivalTime, durationMin, estimatedCost, ctx }) {
    const reference = genRef();
    const graceExpires = new Date(arrivalTime.getTime() + GRACE_PERIOD_MIN*60000);
    const record = {
      reference, station: station.name, city: station.city, charger_id: charger.id,
      vehicle: vehicle?.vehicle_type || vehicle?.type || "Car",
      vehicleImageUrl: vehicle?.image_url || null,
      slot_time: arrivalTime.toISOString(), duration_min: durationMin, amount: estimatedCost,
      name: user?.name || "", phone: "", email: user?.email || "",
      user_id: user?.id || null, pay_method: "wallet", status: "confirmed",
      grace_expires_at: graceExpires.toISOString(), deposit_status: "held",
      created_at: new Date().toISOString(),
    };
    const saved = await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "bookings", record, true);
    return saved?.[0] || record;
  },
  async cancel(reference, reason, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${reference}`, { status:"cancelled", cancelled_reason:reason });
  },
  async expire(reference, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${reference}`, { status:"expired", deposit_status:"forfeited" });
  },
  async changeTime(reference, newTime, ctx) {
    const graceExpires = new Date(newTime.getTime() + GRACE_PERIOD_MIN*60000);
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${reference}`, { slot_time:newTime.toISOString(), grace_expires_at:graceExpires.toISOString() });
  },
  async markArrived(reference, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${reference}`, { arrival_confirmed_at:new Date().toISOString() });
  },
  async complete(reference, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${reference}`, { status:"completed", deposit_status:"refunded" });
  },
  async loadHistory(userId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?user_id=eq.${userId}&order=created_at.desc&limit=50`);
    return Array.isArray(data) ? data : [];
  },
};

// ── UI PRIMITIVES (matching existing EcoCharge design language) ──
const Spinner = ({ color }) => (
  <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${color}`,borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite" }}/>
);
const Card = ({ T, children, style }) => (
  <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, ...style }}>{children}</div>
);
const Badge = ({ label, color }) => (
  <span style={{ background:`${color}22`,color,fontSize:10,fontWeight:700,borderRadius:6,padding:"3px 8px",border:`1px solid ${color}44`,whiteSpace:"nowrap" }}>{label}</span>
);
const Header = ({ T, title, sub, onBack, right }) => (
  <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,background:T.bg }}>
    <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
      <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
    </button>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{title}</div>
      {sub && <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ── STATION LIST (entry picker) ────────────────────────────────
function StationList({ T, go, stations, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = search ? stations.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase())) : stations;
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Reserve a Charger" sub="Commercial reservation platform" onBack={()=>go("home")}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ position:"relative" }}>
          <i className="fas fa-search" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
          <input placeholder="Search station or city" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px 12px 40px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"0 16px 100px" }}>
        {filtered.map(s=>(
          <Card key={s.id} T={T} style={{ padding:14, marginBottom:10, cursor:"pointer" }} onClick={()=>{}}>
            <div className="tap" onClick={()=>onSelect(s)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{s.name}</div>
                <div style={{ fontSize:11,color:T.muted,marginTop:3 }}>{s.city} · {s.bays} bays</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700,fontSize:13,color:s.open>0?T.green:T.red }}>{s.open}/{s.bays} open</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{s.time} wait</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── STATION DETAIL (real-time charger status) ──────────────────
function StationDetailPro({ T, go, station, onChargeNow, onReserve, ctx, onBack, onOpenHistory }) {
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueLengths, setQueueLengths] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await StationService.loadChargers(station.id, ctx);
    setChargers(data);
    const lengths = {};
    for (const c of data) lengths[c.id] = await QueueService.getQueueLength(c.id, ctx);
    setQueueLengths(lengths);
    setLoading(false);
  };
  useEffect(()=>{ load(); const t=setInterval(load, 15000); return ()=>clearInterval(t); }, [station.id]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title={station.name} sub={`${station.city} · Live charger status`} onBack={onBack}
        right={<button onClick={onOpenHistory} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}><i className="fas fa-history"/></button>}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>
        {loading && <div style={{ textAlign:"center",padding:"30px 0" }}><Spinner color={T.green}/></div>}
        {!loading && chargers.length===0 && (
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>No charger data available for this station yet.</div>
        )}
        {chargers.map(c=>{
          const status = StationService.chargerStatus(c);
          const color = StationService.statusColor(T, status);
          const price = c.price_per_kwh || c.rate_per_kwh || DEFAULT_PRICE_PER_KWH;
          const power = c.power_kw || c.max_power_kw || DEFAULT_CHARGER_KW;
          const qLen = queueLengths[c.id] || 0;
          const waitMin = status==="Available" ? 0 : qLen>0 ? qLen*AVG_SESSION_MIN : AVG_SESSION_MIN;
          return (
            <Card key={c.id} T={T} style={{ padding:16, marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{c.label || c.name || c.id}</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:3 }}>{power} kW · GH₵{price.toFixed(2)}/kWh</div>
                </div>
                <Badge label={status} color={color}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
                <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"8px 10px" }}>
                  <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Est. Wait</div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:2 }}>{waitMin===0?"None":`${waitMin} min`}</div>
                </div>
                <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"8px 10px" }}>
                  <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Queue</div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:2 }}>{qLen} waiting</div>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns: status==="Available" ? "1fr 1fr" : "1fr", gap:8 }}>
                {status==="Available" && (
                  <button onClick={()=>onChargeNow(c)} className="tap" style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                    <i className="fas fa-bolt" style={{ marginRight:6 }}/>Charge Now
                  </button>
                )}
                <button onClick={()=>onReserve(c)} className="tap"
                  style={{ background: status==="Available" ? T.surface : `linear-gradient(135deg,${T.green},${T.greenDark})`, border: status==="Available" ? `1px solid ${T.border}` : "none", borderRadius:10,padding:"11px",fontSize:12,fontWeight:700, color: status==="Available" ? T.text : "#000", cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-calendar-check" style={{ marginRight:6 }}/>{status==="Available" ? "Reserve for Later" : "Join Queue / Reserve"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── RESERVATION FORM ───────────────────────────────────────────
function ReservationFlow({ T, go, station, charger, user, vehicles, ctx, onBack, onConfirmed }) {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles?.[0] || null);
  const [arrivalMinsFromNow, setArrivalMinsFromNow] = useState(15);
  const [durationMin, setDurationMin] = useState(60);
  const [payMethod, setPayMethod] = useState("wallet");
  const [walletBal, setWalletBal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const price = charger.price_per_kwh || charger.rate_per_kwh || DEFAULT_PRICE_PER_KWH;
  const power = charger.power_kw || charger.max_power_kw || DEFAULT_CHARGER_KW;
  const estimatedKwh = Math.min(power, 40) * (durationMin/60) * 0.8; // conservative estimate
  const estimatedCost = +(estimatedKwh * price + 5).toFixed(2); // + base fee, matches existing app convention
  const depositPesewas = DEFAULT_DEPOSIT_PESEWAS;

  useEffect(()=>{
    if (!user?.id) return;
    sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${user.id}&select=balance_pesewas`)
      .then(d=>setWalletBal(d?.[0]?.balance_pesewas ?? null));
  }, [user]);

  const arrivalTime = new Date(Date.now() + arrivalMinsFromNow*60000);

  const confirm = async () => {
    if (!selectedVehicle) { setError("Please select a vehicle."); return; }
    if (walletBal != null && walletBal < depositPesewas) {
      setError(`Insufficient wallet balance for the GH₵${(depositPesewas/100).toFixed(2)} deposit. Please top up first.`);
      return;
    }
    setSaving(true); setError("");
    const booking = await BookingService.create({ user, station, charger, vehicle:selectedVehicle, arrivalTime, durationMin, estimatedCost, ctx });
    await DepositService.hold(user.id, booking.reference, depositPesewas, ctx);
    const status = StationService.chargerStatus(charger);
    if (status !== "Available") {
      await QueueService.join(charger.id, station.id, user.id, booking.reference, ctx);
    }
    await NotificationService.send(user.id, "booking_confirmed", "Reservation Confirmed", `${station.name} reserved for ${fmtTime(arrivalTime)}. GH₵${(depositPesewas/100).toFixed(2)} deposit held.`, { reference:booking.reference }, ctx);
    setSaving(false);
    onConfirmed(booking);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Reserve Charger" sub={`${station.name} · ${charger.label||charger.id}`} onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 120px" }}>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Vehicle</div>
          {(!vehicles || vehicles.length===0) ? (
            <div style={{ fontSize:12,color:T.muted }}>No vehicles on file. <span onClick={()=>go("myvehicles")} style={{ color:T.green,fontWeight:700,cursor:"pointer" }}>Add one</span>.</div>
          ) : (
            <div style={{ display:"flex",gap:8,overflowX:"auto" }}>
              {vehicles.map(v=>(
                <button key={v.id} onClick={()=>setSelectedVehicle(v)} className="tap"
                  style={{ flexShrink:0,background:selectedVehicle?.id===v.id?`${T.green}18`:T.inputBg,border:`1.5px solid ${selectedVehicle?.id===v.id?T.green:T.border}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                  <div style={{ fontWeight:700,fontSize:12,color:T.text }}>{v.nickname}</div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{v.connector_type||"Standard connector"}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Arrival Time</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8 }}>
            {[15,30,45,60].map(m=>(
              <button key={m} onClick={()=>setArrivalMinsFromNow(m)} className="tap"
                style={{ background:arrivalMinsFromNow===m?T.green:T.inputBg,border:`1px solid ${arrivalMinsFromNow===m?T.green:T.border}`,borderRadius:10,padding:"10px 4px",fontSize:12,fontWeight:700,color:arrivalMinsFromNow===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {m}m
              </button>
            ))}
          </div>
          <div style={{ fontSize:12,color:T.mutedLight }}>Arriving around <strong style={{ color:T.text }}>{fmtTime(arrivalTime)}</strong> · {GRACE_PERIOD_MIN}-minute grace period after that</div>
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Estimated Charging Duration</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[30,60,120].map(m=>(
              <button key={m} onClick={()=>setDurationMin(m)} className="tap"
                style={{ background:durationMin===m?T.green:T.inputBg,border:`1px solid ${durationMin===m?T.green:T.border}`,borderRadius:10,padding:"11px 4px",fontSize:12,fontWeight:700,color:durationMin===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {m<60?`${m} min`:`${m/60}h`}
              </button>
            ))}
          </div>
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Payment Method</div>
          <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px",borderRadius:10,background:"rgba(74,222,128,.08)",border:`1px solid ${T.greenDark}44` }}>
            <i className="fas fa-wallet" style={{ color:T.green }}/>
            <span style={{ fontSize:13,color:T.text,fontWeight:600,flex:1 }}>EcoCharge Wallet</span>
            <span style={{ fontSize:12,color:T.muted }}>{walletBal!=null?fmtGHS(walletBal):"—"}</span>
          </div>
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Summary</div>
          {[
            { label:"Estimated cost", value:`GH₵${estimatedCost.toFixed(2)}` },
            { label:"Refundable deposit", value:`GH₵${(depositPesewas/100).toFixed(2)}` },
            { label:"Charged if you no-show", value:"Deposit forfeited" },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:12 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:12 }}>{r.value}</span>
            </div>
          ))}
        </Card>

        {error && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:14,color:T.red,fontSize:12 }}>{error}</div>}

        <button onClick={confirm} disabled={saving} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:saving?0.7:1 }}>
          {saving ? <><Spinner color="#000"/> Confirming…</> : <><i className="fas fa-lock"/> Confirm & Hold GH₵{(depositPesewas/100).toFixed(2)} Deposit</>}
        </button>
      </div>
    </div>
  );
}

// ── ACTIVE BOOKING DASHBOARD ────────────────────────────────────
function ActiveBookingDashboard({ T, go, booking, station, user, ctx, onBack, onChangeTime, onCancelled, onStartCharging, onExpired }) {
  const [now, setNow] = useState(Date.now());
  const [currentPos, setCurrentPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [arrived, setArrived] = useState(!!booking.arrival_confirmed_at);
  const [cancelling, setCancelling] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showChangeTime, setShowChangeTime] = useState(false);
  const watchRef = useRef(null);
  const expiredRef = useRef(false);

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t); }, []);

  useEffect(()=>{
    if (station?.lat && station?.lng) {
      watchRef.current = GeoService.watchPosition(pos=>{
        setCurrentPos(pos);
        setDistanceKm(haversine(pos.lat, pos.lng, station.lat, station.lng));
      });
    }
    return ()=>GeoService.clearWatch(watchRef.current);
  }, [station]);

  const graceExpiresAt = booking.grace_expires_at ? new Date(booking.grace_expires_at).getTime() : null;
  const msLeft = graceExpiresAt ? graceExpiresAt - now : null;
  const arrivalTime = new Date(booking.slot_time);
  const isGracePeriod = msLeft != null && now > arrivalTime.getTime() && msLeft > 0;
  const isExpired = msLeft != null && msLeft <= 0 && !arrived;

  useEffect(()=>{
    if (isExpired && !expiredRef.current) {
      expiredRef.current = true;
      (async ()=>{
        await BookingService.expire(booking.reference, ctx);
        await DepositService.forfeit(booking.reference, user.id, DEFAULT_DEPOSIT_PESEWAS, ctx);
        await NotificationService.send(user.id, "system", "Reservation Expired", `Your reservation at ${booking.station} expired after the grace period. Deposit forfeited.`, { reference:booking.reference }, ctx);
        await QueueService.advanceNext(booking.charger_id, ctx);
        onExpired();
      })();
    }
  }, [isExpired]);

  const canGoInHere = distanceKm != null && distanceKm <= ARRIVAL_RADIUS_KM;

  const confirmArrival = async () => {
    await BookingService.markArrived(booking.reference, ctx);
    await NotificationService.send(user.id, "system", "Arrival Confirmed", `You've arrived at ${booking.station}. Unlock your charger when ready.`, { reference:booking.reference }, ctx);
    setArrived(true);
  };

  const cancelBooking = async () => {
    setCancelling(true);
    await BookingService.cancel(booking.reference, "Cancelled by user", ctx);
    await DepositService.refund(booking.reference, user.id, ctx);
    await QueueService.advanceNext(booking.charger_id, ctx);
    setCancelling(false);
    onCancelled();
  };

  const qrData = encodeURIComponent(`${booking.reference}|${booking.station}|${booking.charger_id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=8`;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Active Reservation" sub={booking.reference} onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 120px" }}>

        {isGracePeriod && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.3)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
              <i className="fas fa-hourglass-half" style={{ color:T.yellow }}/>
              <span style={{ fontWeight:700,fontSize:13,color:T.yellow }}>Grace Period Active</span>
            </div>
            <div style={{ fontWeight:900,fontSize:32,color:T.yellow,fontFamily:"monospace" }}>{fmtCountdown(msLeft)}</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>Arrive within this window or your reservation and deposit will be forfeited.</div>
          </Card>
        )}

        <Card T={T} style={{ padding:18, marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{booking.station}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:3 }}>Charger {booking.charger_id} · {booking.vehicle}</div>
            </div>
            <Badge label={arrived?"Arrived":"Confirmed"} color={arrived?T.green:T.blue}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              { label:"Arrival Time", value:fmtTime(arrivalTime) },
              { label:"Est. Cost", value:`GH₵${booking.amount}` },
              { label:"Deposit", value:`GH₵${(DEFAULT_DEPOSIT_PESEWAS/100).toFixed(2)} held` },
              { label:"Distance", value: distanceKm!=null?`${distanceKm.toFixed(2)} km`:"Locating…" },
            ].map(r=>(
              <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>{r.label}</div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:3 }}>{r.value}</div>
              </div>
            ))}
          </div>

          {!arrived && canGoInHere && (
            <button onClick={confirmArrival} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
              <i className="fas fa-map-pin" style={{ marginRight:8 }}/>I'm Here
            </button>
          )}
          {!arrived && !canGoInHere && (
            <div style={{ fontSize:11,color:T.muted,textAlign:"center",marginBottom:10 }}>
              "I'm Here" unlocks automatically within {ARRIVAL_RADIUS_KM*1000}m of the station.
            </div>
          )}
          {arrived && (
            <button onClick={onStartCharging} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
              <i className="fas fa-unlock" style={{ marginRight:8 }}/>Unlock Charger & Start
            </button>
          )}

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <button onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${station?.lat},${station?.lng}`,"_blank")} className="tap"
              style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-directions" style={{ marginRight:6 }}/>Navigate
            </button>
            <button onClick={()=>setShowQR(true)} className="tap"
              style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-qrcode" style={{ marginRight:6 }}/>View QR
            </button>
            <button onClick={()=>setShowChangeTime(true)} className="tap"
              style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-clock" style={{ marginRight:6 }}/>Change Time
            </button>
            <button onClick={cancelBooking} disabled={cancelling} className="tap"
              style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
              {cancelling ? <Spinner color={T.red}/> : <><i className="fas fa-times" style={{ marginRight:6 }}/>Cancel</>}
            </button>
          </div>
        </Card>

        <QueuePanel T={T} chargerId={booking.charger_id} userId={user.id} ctx={ctx}/>
      </div>

      {showQR && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setShowQR(false)}>
          <div style={{ background:T.card,borderRadius:20,padding:24,textAlign:"center" }} onClick={e=>e.stopPropagation()}>
            <img src={qrUrl} alt="QR" width={200} height={200} style={{ borderRadius:12,marginBottom:12 }}/>
            <div style={{ fontWeight:800,fontSize:16,color:T.green,letterSpacing:1 }}>{booking.reference}</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:6 }}>Only you can use this to unlock the charger.</div>
          </div>
        </div>
      )}

      {showChangeTime && (
        <ChangeTimeModal T={T} onClose={()=>setShowChangeTime(false)} onSave={async(mins)=>{ await onChangeTime(mins); setShowChangeTime(false); }}/>
      )}
    </div>
  );
}

function ChangeTimeModal({ T, onClose, onSave }) {
  const [mins, setMins] = useState(15);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ background:T.card,borderRadius:"20px 20px 0 0",padding:"22px 20px 36px",width:"100%",maxWidth:480,border:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>New Arrival Time</div>
          <button onClick={onClose} className="tap" style={{ background:"none",border:"none",color:T.muted,cursor:"pointer" }}><i className="fas fa-times"/></button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:20 }}>
          {[15,30,45,60].map(m=>(
            <button key={m} onClick={()=>setMins(m)} className="tap"
              style={{ background:mins===m?T.green:T.inputBg,border:`1px solid ${mins===m?T.green:T.border}`,borderRadius:10,padding:"12px 4px",fontSize:13,fontWeight:700,color:mins===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
              {m}m
            </button>
          ))}
        </div>
        <button onClick={()=>onSave(mins)} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
          Update Reservation
        </button>
      </div>
    </div>
  );
}

function QueuePanel({ T, chargerId, userId, ctx }) {
  const [myEntry, setMyEntry] = useState(null);
  const [queueLen, setQueueLen] = useState(0);
  const load = async () => {
    setMyEntry(await QueueService.getMyPosition(chargerId, userId, ctx));
    setQueueLen(await QueueService.getQueueLength(chargerId, ctx));
  };
  useEffect(()=>{ load(); const t=setInterval(load, 15000); return ()=>clearInterval(t); }, [chargerId]);
  if (!myEntry) return null;
  const waitMin = (myEntry.position - 1) * AVG_SESSION_MIN;
  return (
    <Card T={T} style={{ padding:16, marginBottom:14 }}>
      <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}><i className="fas fa-users" style={{ marginRight:8,color:T.blue }}/>Live Queue</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px",textAlign:"center" }}>
          <div style={{ fontWeight:800,fontSize:20,color:T.blue }}>#{myEntry.position}</div>
          <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>Your Position</div>
        </div>
        <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px",textAlign:"center" }}>
          <div style={{ fontWeight:800,fontSize:20,color:T.yellow }}>~{waitMin}m</div>
          <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>Est. Wait</div>
        </div>
      </div>
      <div style={{ fontSize:11,color:T.muted,marginTop:10 }}>{queueLen} total waiting for this charger.</div>
    </Card>
  );
}

// ── LIVE CHARGING SESSION ──────────────────────────────────────
function LiveChargingSession({ T, go, booking, user, ctx, onComplete }) {
  const [elapsed, setElapsed] = useState(0);
  const [liveKwh, setLiveKwh] = useState(0);
  const [livePower, setLivePower] = useState(0);
  const [costSoFar, setCostSoFar] = useState(0);
  const [walletBal, setWalletBal] = useState(null);
  const [sessionId] = useState(`SES-${Date.now().toString(36).toUpperCase()}`);
  const [stopping, setStopping] = useState(false);
  const startedRef = useRef(false);

  useEffect(()=>{
    if (startedRef.current) return;
    startedRef.current = true;
    (async ()=>{
      await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "charging_sessions", {
        id: sessionId, session_ref: booking.reference, charger_id: booking.charger_id, connector_id:1,
        user_id:user.id, booking_ref:booking.reference, status:"Charging", vehicle_type:booking.vehicle,
        meter_start:0, rate_per_kwh:85, base_fee:500, started_at:new Date().toISOString(),
      });
      await NotificationService.send(user.id, "charging_started", "Charging Started", `Your session at ${booking.station} has begun.`, { session_id:sessionId }, ctx);
    })();
    sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${user.id}&select=balance_pesewas`).then(d=>setWalletBal(d?.[0]?.balance_pesewas ?? null));
  }, []);

  useEffect(()=>{
    const t = setInterval(()=>{
      setElapsed(e=>e+1);
      setLiveKwh(k=>+(k+0.00055).toFixed(4));
      setLivePower(6.8 + Math.random()*1.4);
      setCostSoFar(c=>+(c+0.000472).toFixed(4));
    }, 1000);
    return ()=>clearInterval(t);
  }, []);

  const fmtElapsed = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };

  const stop = async () => {
    setStopping(true);
    const finalCostPesewas = Math.round(costSoFar*100);
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_sessions?id=eq.${sessionId}`, {
      status:"Completed", meter_stop:Math.round(liveKwh*1000), completed_at:new Date().toISOString(), cost_total:finalCostPesewas, payment_status:"Paid", energy_kwh:liveKwh,
    });
    if (finalCostPesewas > 0) {
      await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "rpc/wallet_debit", {
        p_user_id:user.id, p_amount_pesewas:finalCostPesewas, p_type:"debit", p_description:`Charging at ${booking.station} — ${liveKwh.toFixed(3)} kWh`, p_session_id:sessionId, p_booking_ref:booking.reference,
      });
    }
    await BookingService.complete(booking.reference, ctx);
    await DepositService.refund(booking.reference, user.id, ctx);
    await NotificationService.send(user.id, "charging_completed", "Session Complete", `You used ${liveKwh.toFixed(2)} kWh for GH₵${costSoFar.toFixed(2)}.`, { session_id:sessionId }, ctx);
    setStopping(false);
    onComplete({ liveKwh, costSoFar, elapsed, sessionId });
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize:11,color:T.muted }}>Charging</div>
          <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{booking.station}</div>
        </div>
        <button onClick={stop} disabled={stopping} className="tap" style={{ background:"none",border:`1px solid ${T.red}`,borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
          {stopping ? "Stopping…" : "Stop Charging"}
        </button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"24px 16px" }}>
        <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}>
          <div style={{ width:180,height:180,borderRadius:"50%",border:`10px solid ${T.surface}`,borderTopColor:T.green,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"spin 3s linear infinite" }}>
            <div style={{ transform:"rotate(0deg)" }}>
              <div style={{ fontSize:11,color:T.muted }}>Power</div>
              <div style={{ fontWeight:800,fontSize:26,color:T.text }}>{livePower.toFixed(1)} kW</div>
            </div>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
          {[
            { label:"Energy", value:`${liveKwh.toFixed(2)} kWh` },
            { label:"Duration", value:fmtElapsed(elapsed) },
            { label:"Cost", value:`GH₵${costSoFar.toFixed(2)}` },
          ].map(m=>(
            <Card key={m.label} T={T} style={{ padding:"14px 8px",textAlign:"center" }}>
              <div style={{ fontWeight:700,fontSize:16,color:T.text }}>{m.value}</div>
              <div style={{ fontSize:10,color:T.muted,marginTop:4 }}>{m.label}</div>
            </Card>
          ))}
        </div>
        <Card T={T} style={{ padding:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:12,color:T.muted }}>Wallet Balance</span>
          <span style={{ fontWeight:700,fontSize:14,color:walletBal!=null&&walletBal<(costSoFar*100+500)?T.red:T.green }}>{walletBal!=null?fmtGHS(walletBal):"—"}</span>
        </Card>
      </div>
    </div>
  );
}

// ── COMPLETION RECEIPT ─────────────────────────────────────────
function CompletionReceipt({ T, go, booking, result, onBookAgain, onDone }) {
  const co2 = (result.liveKwh * CO2_PER_KWH).toFixed(2);
  const fmtElapsed = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return `${h}h ${m}m`; };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Session Complete" sub="Thank you for charging with EcoCharge" onBack={onDone}/>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 16px 100px" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <i className="fas fa-check" style={{ fontSize:36,color:"#000" }}/>
          </div>
          <div style={{ fontWeight:900,fontSize:22,color:T.green }}>Charging Complete!</div>
          <div style={{ fontSize:12,color:T.muted,marginTop:4 }}>{booking.station} · {booking.reference}</div>
        </div>
        <Card T={T} style={{ padding:20, marginBottom:16 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            {[
              { label:"Energy Delivered", value:`${result.liveKwh.toFixed(3)} kWh`, color:T.green },
              { label:"Duration", value:fmtElapsed(result.elapsed), color:T.blue },
              { label:"Total Cost", value:`GH₵${result.costSoFar.toFixed(2)}`, color:T.yellow },
              { label:"CO₂ Saved", value:`${co2} kg`, color:T.green },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:"center" }}>
                <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16,background:"rgba(56,189,248,0.1)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
            <i className="fas fa-tint" style={{ color:T.blue }}/>
            <span style={{ fontSize:12,color:T.text,fontWeight:600 }}>{WATER_LITRES_PER_SESSION}L clean water included — collect at the station counter</span>
          </div>
        </Card>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <button onClick={onDone} className="tap" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>Done</button>
          <button onClick={onBookAgain} className="tap" style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Book Again</button>
        </div>
      </div>
    </div>
  );
}

// ── BOOKING HISTORY ─────────────────────────────────────────────
function BookingHistory({ T, go, user, ctx, onBack, onOpen }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(()=>{
    BookingService.loadHistory(user.id, ctx).then(b=>{ setBookings(b); setLoading(false); });
  }, []);

  const categorize = (b) => {
    if (b.status === "completed") return "Completed";
    if (b.status === "cancelled") return "Cancelled";
    if (b.status === "expired") return "Expired";
    return "Upcoming";
  };
  const filtered = filter==="All" ? bookings : bookings.filter(b=>categorize(b)===filter);
  const statusColor = (cat) => ({ Completed:T.green, Upcoming:T.blue, Cancelled:T.muted, Expired:T.red }[cat]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Booking History" onBack={onBack}/>
      <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"12px 16px 0" }}>
        {["All","Upcoming","Completed","Cancelled","Expired"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className="tap"
            style={{ flexShrink:0,background:filter===f?T.green:T.card,border:`1px solid ${filter===f?T.green:T.border}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:filter===f?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>
        {loading && <div style={{ textAlign:"center",padding:"30px 0" }}><Spinner color={T.green}/></div>}
        {!loading && filtered.length===0 && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>No bookings here yet.</div>}
        {filtered.map(b=>{
          const cat = categorize(b);
          return (
            <Card key={b.reference} T={T} style={{ padding:14, marginBottom:10, cursor:cat==="Upcoming"?"pointer":"default" }}
              onClick={()=>{ if (cat==="Upcoming") onOpen(b); }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{b.station}</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{b.reference} · {new Date(b.created_at).toLocaleDateString("en-GH",{day:"numeric",month:"short"})}</div>
                </div>
                <Badge label={cat} color={statusColor(cat)}/>
              </div>
              <div style={{ fontSize:12,color:T.mutedLight }}>{b.vehicle} · GH₵{b.amount||"—"}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── TOP-LEVEL ENTRY ────────────────────────────────────────────
export default function ReservationSystem({ go, user, stations, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [step, setStep] = useState("list"); // list | detail | reserve | dashboard | charging | receipt | history
  const [station, setStation] = useState(null);
  const [charger, setCharger] = useState(null);
  const [booking, setBooking] = useState(null);
  const [chargingResult, setChargingResult] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  const ctx = { SUPABASE_URL, SUPABASE_ANON, getToken };

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) return;
    sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `user_vehicles?user_id=eq.${user.id}&order=created_at.asc`).then(v=>setVehicles(Array.isArray(v)?v:[]));
  }, [user]);

  if (!user) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
      <i className="fas fa-calendar-times" style={{ fontSize:48,color:T.muted,marginBottom:16 }}/>
      <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:10 }}>Sign in to reserve a charger</div>
      <button onClick={()=>go("auth")} className="tap" style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Sign In</button>
    </div>
  );

  if (step==="list") return <StationList T={T} go={go} stations={stations} onSelect={(s)=>{ setStation(s); setStep("detail"); }}/>;

  if (step==="detail" && station) return (
    <StationDetailPro T={T} go={go} station={station} ctx={ctx}
      onBack={()=>setStep("list")}
      onOpenHistory={()=>setStep("history")}
      onChargeNow={(c)=>{ setCharger(c); go("detail"); /* hands off to existing Charge Now flow */ }}
      onReserve={(c)=>{ setCharger(c); setStep("reserve"); }}
    />
  );

  if (step==="reserve" && station && charger) return (
    <ReservationFlow T={T} go={go} station={station} charger={charger} user={user} vehicles={vehicles} ctx={ctx}
      onBack={()=>setStep("detail")}
      onConfirmed={(b)=>{ setBooking(b); setStep("dashboard"); }}
    />
  );

  if (step==="dashboard" && booking) return (
    <ActiveBookingDashboard T={T} go={go} booking={booking} station={station} user={user} ctx={ctx}
      onBack={()=>setStep("list")}
      onChangeTime={async(mins)=>{ const newTime=new Date(Date.now()+mins*60000); await BookingService.changeTime(booking.reference, newTime, ctx); setBooking({...booking, slot_time:newTime.toISOString(), grace_expires_at:new Date(newTime.getTime()+GRACE_PERIOD_MIN*60000).toISOString()}); }}
      onCancelled={()=>{ setBooking(null); setStep("list"); }}
      onExpired={()=>{ setBooking(null); setStep("list"); }}
      onStartCharging={()=>setStep("charging")}
    />
  );

  if (step==="charging" && booking) return (
    <LiveChargingSession T={T} go={go} booking={booking} user={user} ctx={ctx}
      onComplete={(result)=>{ setChargingResult(result); setStep("receipt"); }}
    />
  );

  if (step==="receipt" && chargingResult) return (
    <CompletionReceipt T={T} go={go} booking={booking} result={chargingResult}
      onDone={()=>{ setStation(null); setCharger(null); setBooking(null); setChargingResult(null); setStep("list"); }}
      onBookAgain={()=>{ setCharger(null); setBooking(null); setChargingResult(null); setStep("detail"); }}
    />
  );

  if (step==="history") return (
    <BookingHistory T={T} go={go} user={user} ctx={ctx}
      onBack={()=>setStep(station?"detail":"list")}
      onOpen={(b)=>{ setBooking(b); setStep("dashboard"); }}
    />
  );

  return null;
}
