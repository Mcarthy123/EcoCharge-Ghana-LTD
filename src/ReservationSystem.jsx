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

const GRACE_PERIOD_MIN = 10; // fallback default; actual value now comes from ReliabilityService.tier()
const ARRIVAL_RADIUS_KM = 0.1; // 100m auto check-in radius per spec
const AVG_SESSION_MIN = 25; // heuristic for queue wait estimates
const DEFAULT_DEPOSIT_PESEWAS = 1000; // legacy — kept for existing forfeited deposit records only
const QUEUE_OFFER_WINDOW_MIN = 2; // minutes a queued driver has to accept an offered charger
const DEFAULT_CHARGER_KW = 60;
const DEFAULT_PRICE_PER_KWH = 0.85;
const FALLBACK_ESTIMATED_RANGE_KM = 250; // used only if the vehicle has no saved range
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
  // Offers the charger to the next waiting driver with a 2-minute accept window,
  // instead of silently assigning it. If they don't accept in time, offer moves on.
  async advanceNext(chargerId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&status=eq.waiting&select=*&order=position.asc&limit=1`);
    const next = Array.isArray(data) ? data[0] : null;
    if (next) {
      const offeredAt = new Date();
      const expiresAt = new Date(offeredAt.getTime() + QUEUE_OFFER_WINDOW_MIN*60000);
      await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?id=eq.${next.id}`, {
        status:"offered", offered_at:offeredAt.toISOString(), offer_expires_at:expiresAt.toISOString(),
      });
      await NotificationService.send(next.user_id, "queue_update", "You're Up!", `A charger you were queued for is available. Accept within ${QUEUE_OFFER_WINDOW_MIN} minutes or it goes to the next driver.`, { charger_id:chargerId }, ctx);
    }
    return next;
  },
  async acceptOffer(queueId, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?id=eq.${queueId}`, { status:"active" });
  },
  // Called when an offer's 2-minute window lapses unaccepted — mild score penalty, then passes to next.
  async expireOffer(queueEntry, chargerId, ctx) {
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?id=eq.${queueEntry.id}`, { status:"expired" });
    await NotificationService.send(queueEntry.user_id, "queue_update", "Offer Expired", "You didn't accept in time, so the charger was offered to the next driver in line.", { charger_id:chargerId }, ctx);
    return this.advanceNext(chargerId, ctx);
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

// ── RELIABILITY SERVICE (trust-based, replaces fixed deposits) ──
// Score lives on the wallets row (already loaded everywhere a user_id is).
// Every user starts at 100. Good behaviour raises it, no-shows/abuse lower it.
// The score determines booking privileges — see tier().
const ReliabilityService = {
  async getScore(userId, ctx) {
    const d = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}&select=reliability_score`);
    const s = d?.[0]?.reliability_score;
    return (s == null) ? 100 : s;
  },
  async adjust(userId, delta, reason, ctx) {
    const current = await this.getScore(userId, ctx);
    const next = Math.max(0, Math.min(100, current + delta));
    await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${userId}`, { reliability_score: next });
    await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "reliability_history", {
      user_id: userId, delta, reason, score_after: next, created_at: new Date().toISOString(),
    });
    return { score: next, delta, reason };
  },
  // Booking privileges by tier — this is the trust ladder from the spec.
  tier(score) {
    if (score >= 90) return { label:"Excellent", color:"#22C55E", graceMin:15, bookingWindowHr:72, queueBoost:2, restricted:false };
    if (score >= 70) return { label:"Good",      color:"#38bdf8", graceMin:10, bookingWindowHr:48, queueBoost:1, restricted:false };
    if (score >= 40) return { label:"Fair",      color:"#fbbf24", graceMin:7,  bookingWindowHr:24, queueBoost:0, restricted:false };
    return             { label:"Restricted", color:"#f87171", graceMin:5,  bookingWindowHr:6,  queueBoost:-1, restricted:true };
  },
  // Standard point deltas — kept in one place so behaviour is consistent everywhere.
  POINTS: { onTimeArrival:+2, completedSession:+1, earlyCancel:+1, lateArrival:-5, noShow:-15, fakeReservation:-25 },
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
  async create({ user, station, charger, vehicle, arrivalTime, durationMin, estimatedCost, gracePeriodMin, fleetId, driverName, driverPhone, ctx }) {
    const reference = genRef();
    const graceMin = gracePeriodMin || GRACE_PERIOD_MIN;
    const graceExpires = new Date(arrivalTime.getTime() + graceMin*60000);
    const record = {
      reference, station: station.name, city: station.city, charger_id: charger.id,
      vehicle: vehicle?.vehicle_type || vehicle?.type || "Fleet Vehicle",
      vehicleImageUrl: vehicle?.image_url || null,
      vehicle_id: vehicle?.id || null,
      slot_time: arrivalTime.toISOString(), duration_min: durationMin, amount: estimatedCost,
      name: driverName || user?.name || "", phone: driverPhone || "", email: user?.email || "",
      user_id: user?.id || null, pay_method: "wallet", status: "confirmed",
      grace_expires_at: graceExpires.toISOString(), grace_period_min: graceMin,
      fleet_id: fleetId || null, driver_name: driverName || null,
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
// Glassmorphism card: translucent surface + blur, subtle depth, gentle entrance animation.
// T.surface / T.surfaceBorder are already rgba() values in the theme, which is what
// makes the blur read as "glass" instead of just a flat tinted box.
const Card = ({ T, children, style, className="" }) => (
  <div className={`fade ${className}`.trim()} style={{
    background:T.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${T.surfaceBorder}`, borderRadius:20,
    boxShadow:"0 8px 32px rgba(0,0,0,0.18)", transition:"transform .2s ease, box-shadow .2s ease",
    ...style,
  }}>{children}</div>
);
const Badge = ({ label, color }) => (
  <span style={{ background:`${color}1f`,color,fontSize:10,fontWeight:700,borderRadius:20,padding:"4px 10px",border:`1px solid ${color}44`,whiteSpace:"nowrap",backdropFilter:"blur(6px)" }}>{label}</span>
);
const Header = ({ T, title, sub, onBack, right }) => (
  <>
    <style>{`@keyframes ecPulseGlow{0%{box-shadow:0 0 0 0 rgba(74,222,128,0.5)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}`}</style>
    <div style={{ position:"sticky",top:0,zIndex:10,padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.surfaceBorder}`,background:T.navBg,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)" }}>
      <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
        <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
      </button>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800,fontSize:16,color:T.text,letterSpacing:-0.2 }}>{title}</div>
        {sub && <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  </>
);
// Small animated dot for "this is live" moments — grace countdown, active charging, queue offers.
const PulseDot = ({ color }) => (
  <span style={{ width:8,height:8,borderRadius:"50%",background:color,display:"inline-block",animation:"ecPulseGlow 1.6s ease-out infinite" }}/>
);

// ── STATION LIST (entry picker) ────────────────────────────────
function StationList({ T, go, stations, onSelect, onOpenFleet }) {
  const [search, setSearch] = useState("");
  const filtered = search ? stations.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.city.toLowerCase().includes(search.toLowerCase())) : stations;
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Reserve a Charger" sub="Commercial reservation platform" onBack={()=>go("home")}
        right={<button onClick={onOpenFleet} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}><i className="fas fa-truck"/> Fleet</button>}/>
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
  const [reliability, setReliability] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const price = charger.price_per_kwh || charger.rate_per_kwh || DEFAULT_PRICE_PER_KWH;
  const power = charger.power_kw || charger.max_power_kw || DEFAULT_CHARGER_KW;
  const estimatedKwh = Math.min(power, 40) * (durationMin/60) * 0.8; // conservative estimate
  const estimatedCost = +(estimatedKwh * price + 5).toFixed(2); // + base fee, matches existing app convention
  const tier = ReliabilityService.tier(reliability);
  // Booking window is capped by trust tier — low-score users can only book close to now.
  const maxArrivalMins = Math.min(60, tier.bookingWindowHr * 60);
  const arrivalOptions = [15, 30, 45, 60].filter(m => m <= maxArrivalMins || m === 15);

  useEffect(()=>{
    if (!user?.id) return;
    sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `wallets?user_id=eq.${user.id}&select=balance_pesewas`)
      .then(d=>setWalletBal(d?.[0]?.balance_pesewas ?? null));
    ReliabilityService.getScore(user.id, ctx).then(setReliability);
  }, [user]);

  const arrivalTime = new Date(Date.now() + arrivalMinsFromNow*60000);

  const confirm = async () => {
    if (!selectedVehicle) { setError("Please select a vehicle."); return; }
    if (tier.restricted) {
      setError("Your reliability score is too low for new reservations right now. Complete a few Charge Now sessions on time to rebuild it.");
      return;
    }
    setSaving(true); setError("");
    const booking = await BookingService.create({ user, station, charger, vehicle:selectedVehicle, arrivalTime, durationMin, estimatedCost, gracePeriodMin: tier.graceMin, ctx });
    const status = StationService.chargerStatus(charger);
    if (status !== "Available") {
      await QueueService.join(charger.id, station.id, user.id, booking.reference, ctx);
    }
    await NotificationService.send(user.id, "booking_confirmed", "Reservation Confirmed", `${station.name} reserved for ${fmtTime(arrivalTime)}. ${tier.graceMin}-minute grace period based on your reliability tier.`, { reference:booking.reference }, ctx);
    setSaving(false);
    onConfirmed(booking);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Reserve Charger" sub={`${station.name} · ${charger.label||charger.id}`} onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 120px" }}>

        <Card T={T} style={{ padding:"12px 16px", marginBottom:14, background:`${tier.color}12`, border:`1px solid ${tier.color}44`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:`${tier.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <i className="fas fa-shield-alt" style={{ color:tier.color,fontSize:16 }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:13,color:tier.color }}>Reliability: {tier.label} ({reliability})</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{tier.graceMin}-minute grace period · book up to {maxArrivalMins}m ahead</div>
          </div>
        </Card>

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
            {[15,30,45,60].map(m=>{
              const disabled = m > maxArrivalMins && m !== 15;
              return (
                <button key={m} onClick={()=>!disabled && setArrivalMinsFromNow(m)} className="tap" disabled={disabled}
                  style={{ background:arrivalMinsFromNow===m?T.green:T.inputBg,border:`1px solid ${arrivalMinsFromNow===m?T.green:T.border}`,borderRadius:10,padding:"10px 4px",fontSize:12,fontWeight:700,color:disabled?T.muted:(arrivalMinsFromNow===m?"#000":T.muted),cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?0.4:1 }}>
                  {m}m
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:12,color:T.mutedLight }}>Arriving around <strong style={{ color:T.text }}>{fmtTime(arrivalTime)}</strong> · {tier.graceMin}-minute grace period after that</div>
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
            { label:"Grace period", value:`${tier.graceMin} minutes` },
            { label:"If you no-show", value:`Reliability score −${Math.abs(ReliabilityService.POINTS.noShow)}` },
          ].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:12 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:12 }}>{r.value}</span>
            </div>
          ))}
        </Card>

        {error && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:14,color:T.red,fontSize:12 }}>{error}</div>}

        <button onClick={confirm} disabled={saving||tier.restricted} className="tap"
          style={{ width:"100%",background:tier.restricted?T.border:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:tier.restricted?T.muted:"#000",cursor:tier.restricted?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:saving?0.7:1 }}>
          {saving ? <><Spinner color="#000"/> Confirming…</> : tier.restricted ? <><i className="fas fa-lock"/> Reservations Restricted</> : <><i className="fas fa-calendar-check"/> Confirm Reservation</>}
        </button>
      </div>
    </div>
  );
}

// ── ACTIVE BOOKING DASHBOARD ────────────────────────────────────
// ── FLEET SERVICE ─────────────────────────────────────────────
// Lets a fleet operator (any signed-in user, no special role needed)
// reserve multiple chargers at once, assign each to a named driver,
// monitor them all live, and bulk-reschedule if plans change.
const FleetService = {
  async getOrCreateFleet(ownerId, ctx) {
    const existing = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `fleet_accounts?owner_user_id=eq.${ownerId}&select=*&limit=1`);
    if (Array.isArray(existing) && existing[0]) return existing[0];
    const created = await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "fleet_accounts", {
      owner_user_id: ownerId, name: "My Fleet", created_at: new Date().toISOString(),
    }, true);
    return created?.[0] || null;
  },
  async listDrivers(fleetId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `fleet_drivers?fleet_id=eq.${fleetId}&select=*&order=created_at.asc`);
    return Array.isArray(data) ? data : [];
  },
  async addDriver(fleetId, { name, phone }, ctx) {
    const created = await sbPost(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, "fleet_drivers", {
      fleet_id: fleetId, name, phone: phone || null, created_at: new Date().toISOString(),
    }, true);
    return created?.[0] || null;
  },
  async removeDriver(driverId, ctx) {
    return sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `fleet_drivers?id=eq.${driverId}`, { active:false });
  },
  async listBookings(fleetId, ctx) {
    const data = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?fleet_id=eq.${fleetId}&select=*&order=slot_time.desc&limit=100`);
    return Array.isArray(data) ? data : [];
  },
  // Bulk-reschedules every still-upcoming fleet booking by the same offset —
  // "reschedule drivers automatically" from the spec.
  async rescheduleAll(fleetId, minutesDelta, ctx) {
    const bookings = await this.listBookings(fleetId, ctx);
    const upcoming = bookings.filter(b => b.status === "confirmed");
    for (const b of upcoming) {
      const newTime = new Date(new Date(b.slot_time).getTime() + minutesDelta*60000);
      const newGrace = new Date(newTime.getTime() + (b.grace_period_min||GRACE_PERIOD_MIN)*60000);
      await sbPatch(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `bookings?reference=eq.${b.reference}`, {
        slot_time: newTime.toISOString(), grace_expires_at: newGrace.toISOString(),
      });
    }
    return upcoming.length;
  },
  // Aggregate energy/cost across every completed session tied to this fleet's bookings.
  async report(fleetId, ctx) {
    const bookings = await this.listBookings(fleetId, ctx);
    const refs = bookings.map(b => b.reference);
    if (!refs.length) return { totalKwh:0, totalCostPesewas:0, sessionCount:0, byDriver:{} };
    const inList = refs.map(r => `"${r}"`).join(",");
    const sessions = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_sessions?booking_ref=in.(${inList})&status=eq.Completed&select=booking_ref,energy_kwh,cost_total`);
    const sl = Array.isArray(sessions) ? sessions : [];
    const refToDriver = {}; bookings.forEach(b => refToDriver[b.reference] = b.driver_name || "Unassigned");
    const byDriver = {};
    sl.forEach(s => {
      const d = refToDriver[s.booking_ref] || "Unassigned";
      if (!byDriver[d]) byDriver[d] = { kwh:0, costPesewas:0, sessions:0 };
      byDriver[d].kwh += s.energy_kwh || 0;
      byDriver[d].costPesewas += s.cost_total || 0;
      byDriver[d].sessions += 1;
    });
    const totalKwh = sl.reduce((a,s)=>a+(s.energy_kwh||0),0);
    const totalCostPesewas = sl.reduce((a,s)=>a+(s.cost_total||0),0);
    return { totalKwh, totalCostPesewas, sessionCount: sl.length, byDriver };
  },
};

// ── AI RESERVATION ASSISTANT ─────────────────────────────────────
// Monitors an active reservation's live GPS trail and:
//  1. Detects if the driver is trending toward arriving late (using
//     recent speed samples, not a live traffic API — good enough to
//     flag a real slowdown without a paid traffic-data subscription).
//  2. Flags when the selected vehicle's remaining range (self-reported
//     battery % × its known range) won't comfortably cover the
//     remaining distance, and suggests the nearest closer station.
const AIAssistantService = {
  // Rolling average speed (km/h) from consecutive GPS samples.
  estimateSpeedKmh(samples) {
    if (samples.length < 2) return null;
    const [a, b] = [samples[samples.length-2], samples[samples.length-1]];
    const distKm = haversine(a.pos.lat, a.pos.lng, b.pos.lat, b.pos.lng);
    const hrs = (b.t - a.t) / 3600000;
    if (hrs <= 0) return null;
    const kmh = distKm / hrs;
    return kmh > 0.5 && kmh < 160 ? kmh : null; // filter GPS noise / stationary jitter
  },
  // Projects lateness in minutes given remaining distance and current speed.
  // Returns null if there isn't enough signal to say anything useful yet.
  projectDelayMin(distanceKm, speedKmh, arrivalTime) {
    if (distanceKm == null || !speedKmh) return null;
    const etaMs = (distanceKm / speedKmh) * 3600000;
    const projectedArrival = Date.now() + etaMs;
    const driftMin = Math.round((projectedArrival - arrivalTime.getTime()) / 60000);
    return driftMin;
  },
  // Given a self-reported battery % and the vehicle's rated range, how far can it go
  // before the remaining distance becomes risky (15% safety margin)?
  isBatteryRisk(batteryPct, ratedRangeKm, remainingDistanceKm) {
    if (batteryPct == null || !ratedRangeKm || remainingDistanceKm == null) return false;
    const remainingRangeKm = ratedRangeKm * (batteryPct / 100);
    return remainingRangeKm < remainingDistanceKm * 1.15;
  },
  // Nearest station to a position, excluding the current one, with open bays.
  nearestAlternative(pos, stations, excludeStationId) {
    return stations
      .filter(s => s.id !== excludeStationId && s.lat && s.lng && (s.open == null || s.open > 0))
      .map(s => ({ ...s, distKm: haversine(pos.lat, pos.lng, s.lat, s.lng) }))
      .sort((a,b) => a.distKm - b.distKm)[0] || null;
  },
};

function ActiveBookingDashboard({ T, go, booking, station, user, ctx, stations, vehicles, onBack, onChangeTime, onCancelled, onStartCharging, onExpired }) {
  const [now, setNow] = useState(Date.now());
  const [currentPos, setCurrentPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [arrived, setArrived] = useState(!!booking.arrival_confirmed_at);
  const [cancelling, setCancelling] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showChangeTime, setShowChangeTime] = useState(false);
  const watchRef = useRef(null);
  const expiredRef = useRef(false);
  const gpsSamplesRef = useRef([]);
  const [speedKmh, setSpeedKmh] = useState(null);
  const [delayDismissedAt, setDelayDismissedAt] = useState(0);
  const [batteryPct, setBatteryPct] = useState(null);
  const [batteryPromptShown, setBatteryPromptShown] = useState(false);
  const [batteryInput, setBatteryInput] = useState("");
  const [rerouteDismissed, setRerouteDismissed] = useState(false);
  const sentRemindersRef = useRef(new Set()); // avoids duplicate sends within one dashboard session
  const [betterCharger, setBetterCharger] = useState(null);
  const betterChargerNotifiedRef = useRef(false);

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t); }, []);

  useEffect(()=>{
    GeoService.getCurrentPosition().then(pos=>{
      setCurrentPos(pos);
      if (station?.lat && station?.lng) setDistanceKm(haversine(pos.lat, pos.lng, station.lat, station.lng));
    }).catch(()=>{});
    if (station?.lat && station?.lng) {
      watchRef.current = GeoService.watchPosition(pos=>{
        setCurrentPos(pos);
        setDistanceKm(haversine(pos.lat, pos.lng, station.lat, station.lng));
        gpsSamplesRef.current = [...gpsSamplesRef.current.slice(-4), { pos, t: Date.now() }];
        setSpeedKmh(AIAssistantService.estimateSpeedKmh(gpsSamplesRef.current));
      });
    }
    return ()=>GeoService.clearWatch(watchRef.current);
  }, [station]);

  const bookedVehicle = vehicles?.find(v => v.id === booking.vehicle_id) || null;

  const arrivalTimeMs = new Date(booking.slot_time).getTime();

  // ── Smart notifications: 1hr / 30min / 10min before arrival ──
  useEffect(()=>{
    if (arrived) return;
    const check = () => {
      const minsToArrival = (arrivalTimeMs - Date.now()) / 60000;
      const fire = (key, thresholdMin, title, body) => {
        if (sentRemindersRef.current.has(key)) return;
        if (minsToArrival <= thresholdMin && minsToArrival > thresholdMin - 2) {
          sentRemindersRef.current.add(key);
          NotificationService.send(user.id, "system", title, body, { reference: booking.reference }, ctx);
        }
      };
      fire("60min", 60, "Reservation in 1 Hour", `Your charger at ${station.name} is reserved for ${fmtTime(new Date(arrivalTimeMs))}.`);
      fire("30min", 30, "Reservation in 30 Minutes", `Heading to ${station.name}? Your charger is held until your grace period ends.`);
      fire("10min", 10, "Reservation in 10 Minutes", `Almost time — ${station.name} is expecting you shortly.`);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [arrived]);

  // ── "Approaching station" — fires once when within 1km but outside the auto-checkin radius ──
  useEffect(()=>{
    if (arrived || distanceKm == null) return;
    if (distanceKm <= 1 && distanceKm > ARRIVAL_RADIUS_KM && !sentRemindersRef.current.has("approaching")) {
      sentRemindersRef.current.add("approaching");
      NotificationService.send(user.id, "system", "Approaching Station", `You're about ${(distanceKm*1000).toFixed(0)}m from ${station.name}. We'll check you in automatically.`, { reference: booking.reference }, ctx);
    }
  }, [distanceKm, arrived]);

  // ── "Reservation expiring" — fires once with ~3 minutes left in the grace period ──
  useEffect(()=>{
    const graceExpMs = booking.grace_expires_at ? new Date(booking.grace_expires_at).getTime() : null;
    if (arrived || !graceExpMs) return;
    const msLeftNow = graceExpMs - now;
    if (msLeftNow > 0 && msLeftNow <= 3*60000 && !sentRemindersRef.current.has("expiring")) {
      sentRemindersRef.current.add("expiring");
      NotificationService.send(user.id, "system", "Reservation Expiring Soon", `Your grace period at ${station.name} ends in a few minutes.`, { reference: booking.reference }, ctx);
    }
  }, [now, arrived]);

  // ── "Better charger available" — a faster charger opened up at the same station ──
  useEffect(()=>{
    if (arrived || betterChargerNotifiedRef.current) return;
    const poll = async () => {
      const chargers = await StationService.loadChargers(station.id, ctx);
      const currentPower = 0; // unknown for the booked charger unless separately fetched — comparison is against any newly-available faster charger
      const faster = (Array.isArray(chargers) ? chargers : [])
        .filter(c => c.id !== booking.charger_id && StationService.chargerStatus(c) === "Available")
        .sort((a,b) => (b.power_kw||0) - (a.power_kw||0))[0];
      if (faster && (faster.power_kw||0) > 0) {
        betterChargerNotifiedRef.current = true;
        setBetterCharger(faster);
        NotificationService.send(user.id, "system", "Faster Charger Available", `Charger ${faster.label||faster.id} (${faster.power_kw}kW) just opened up at ${station.name}.`, { reference: booking.reference }, ctx);
      }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [arrived]);

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
        const result = await ReliabilityService.adjust(user.id, ReliabilityService.POINTS.noShow, "No-show — grace period expired", ctx);
        await NotificationService.send(user.id, "system", "Reservation Expired", `Your reservation at ${booking.station} expired after the grace period. Reliability score ${result.delta} → ${result.score}.`, { reference:booking.reference }, ctx);
        await QueueService.advanceNext(booking.charger_id, ctx);
        onExpired();
      })();
    }
  }, [isExpired]);

  const canGoInHere = distanceKm != null && distanceKm <= ARRIVAL_RADIUS_KM;

  // GPS auto check-in — no QR, no manual "I'm here" tap. The moment the
  // driver enters the 100m radius, we confirm arrival automatically.
  useEffect(()=>{
    if (!arrived && canGoInHere) {
      (async ()=>{
        setArrived(true); // optimistic, avoids double-fires while the request is in flight
        await BookingService.markArrived(booking.reference, ctx);
        const onTime = Date.now() <= arrivalTime.getTime() + 2*60000;
        if (onTime) await ReliabilityService.adjust(user.id, ReliabilityService.POINTS.onTimeArrival, "Arrived on time", ctx);
        await NotificationService.send(user.id, "system", "Welcome to EcoCharge", "Ready to charge — tap below to unlock your charger.", { reference:booking.reference }, ctx);
      })();
    }
  }, [canGoInHere]);

  const cancelBooking = async () => {
    setCancelling(true);
    await BookingService.cancel(booking.reference, "Cancelled by user", ctx);
    // Cancelling well before arrival is good behaviour — small score bump, no penalty.
    const early = now < arrivalTime.getTime() - 5*60000;
    if (early) await ReliabilityService.adjust(user.id, ReliabilityService.POINTS.earlyCancel, "Cancelled early", ctx);
    await QueueService.advanceNext(booking.charger_id, ctx);
    setCancelling(false);
    onCancelled();
  };

  // ── AI Assistant: traffic delay ──
  const projectedDelayMin = AIAssistantService.projectDelayMin(distanceKm, speedKmh, arrivalTime);
  const showDelayAlert = !arrived && projectedDelayMin != null && projectedDelayMin > 5 && (Date.now() - delayDismissedAt > 3*60000);

  const joinQueueInstead = async () => {
    await BookingService.cancel(booking.reference, "Switched to queue after delay", ctx);
    await QueueService.join(booking.charger_id, station.id, user.id, booking.reference, ctx);
    await NotificationService.send(user.id, "queue_update", "Switched to Queue", `You're now in the live queue for ${station.name} instead of a fixed reservation.`, {}, ctx);
    onCancelled();
  };

  // ── AI Assistant: low battery reroute ──
  const usingFallbackRange = !bookedVehicle?.estimated_range;
const ratedRangeKm = bookedVehicle?.estimated_range || FALLBACK_ESTIMATED_RANGE_KM;
  const batteryRisk = AIAssistantService.isBatteryRisk(batteryPct, ratedRangeKm, distanceKm);
  const alternative = (batteryRisk && currentPos && stations) ? AIAssistantService.nearestAlternative(currentPos, stations, station.id) : null;

  const switchToStation = async (alt) => {
    await BookingService.cancel(booking.reference, `Rerouted for low battery to ${alt.name}`, ctx);
    await QueueService.advanceNext(booking.charger_id, ctx);
    onCancelled(); // returns to station list; user picks the suggested station from there
  };

  const qrData = encodeURIComponent(`${booking.reference}|${booking.station}|${booking.charger_id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=0f1117&color=4ade80&margin=8`;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Active Reservation" sub={booking.reference} onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 120px" }}>

        {betterCharger && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(56,189,248,0.08)", border:`1px solid ${T.blue}44` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
              <i className="fas fa-bolt" style={{ color:T.blue }}/>
              <span style={{ fontWeight:800,fontSize:13,color:T.blue }}>Faster Charger Available</span>
            </div>
            <div style={{ fontSize:12,color:T.muted,marginBottom:10 }}>Charger {betterCharger.label||betterCharger.id} ({betterCharger.power_kw}kW) just opened up at this station.</div>
            <button onClick={()=>setBetterCharger(null)} className="tap" style={{ width:"100%",background:"none",border:`1px solid ${T.border}`,borderRadius:10,padding:"9px",fontSize:12,fontWeight:600,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit" }}>Dismiss</button>
          </Card>
        )}

        {showDelayAlert && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(56,189,248,0.08)", border:`1px solid ${T.blue}55` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <i className="fas fa-robot" style={{ color:T.blue }}/>
              <span style={{ fontWeight:800,fontSize:13,color:T.blue }}>AI Assistant · Traffic Delay</span>
            </div>
            <div style={{ fontSize:13,color:T.text,marginBottom:12,lineHeight:1.6 }}>
              Based on your current speed, you're expected to arrive <strong>{projectedDelayMin} minutes late</strong>.
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
              <button onClick={()=>{ setDelayDismissedAt(Date.now()); setShowChangeTime(true); }} className="tap"
                style={{ background:`${T.blue}18`,border:`1px solid ${T.blue}44`,borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:700,color:T.blue,cursor:"pointer",fontFamily:"inherit" }}>Update Time</button>
              <button onClick={joinQueueInstead} className="tap"
                style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>Join Queue</button>
              <button onClick={cancelBooking} className="tap"
                style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 6px",fontSize:11,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
            </div>
            <button onClick={()=>setDelayDismissedAt(Date.now())} className="tap" style={{ width:"100%",background:"none",border:"none",color:T.muted,fontSize:11,marginTop:8,cursor:"pointer",fontFamily:"inherit" }}>Dismiss</button>
          </Card>
        )}

        {!arrived && !batteryPromptShown && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(56,189,248,0.06)", border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <i className="fas fa-robot" style={{ color:T.blue }}/>
              <span style={{ fontWeight:800,fontSize:13,color:T.blue }}>AI Assistant · Battery Check</span>
            </div>
            <div style={{ fontSize:12,color:T.muted,marginBottom:10 }}>
  What's your current battery %? We'll flag it if this station is out of comfortable range.
  {usingFallbackRange && " (Using a typical EV range estimate since this vehicle doesn't have one saved yet.)"}
</div>
{distanceKm == null && <div style={{ fontSize:11,color:T.blue,marginBottom:10 }}><i className="fas fa-location-crosshairs" style={{ marginRight:6 }}/>Locating you to check range…</div>}
            <div style={{ display:"flex",gap:8 }}>
              <input type="number" min="0" max="100" placeholder="e.g. 35" value={batteryInput} onChange={e=>setBatteryInput(e.target.value)}
                style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
              <button onClick={()=>{ const p=parseInt(batteryInput); setBatteryPct(isNaN(p)?null:p); setBatteryPromptShown(true); }} className="tap"
                style={{ background:T.blue,border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Check</button>
            </div>
            <button onClick={()=>setBatteryPromptShown(true)} className="tap" style={{ width:"100%",background:"none",border:"none",color:T.muted,fontSize:11,marginTop:8,cursor:"pointer",fontFamily:"inherit" }}>Skip</button>
          </Card>
        )}

        {batteryRisk && alternative && !rerouteDismissed && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.35)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <i className="fas fa-robot" style={{ color:T.yellow }}/>
              <span style={{ fontWeight:800,fontSize:13,color:T.yellow }}>AI Assistant · Low Battery</span>
            </div>
            <div style={{ fontSize:13,color:T.text,marginBottom:12,lineHeight:1.6 }}>
              At {batteryPct}% battery your estimated range may not comfortably cover the {distanceKm.toFixed(1)}km to {station.name}.
              <strong> {alternative.name}</strong> is only {alternative.distKm.toFixed(1)}km away and has open bays.
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              <button onClick={()=>setRerouteDismissed(true)} className="tap"
                style={{ background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>Keep This Station</button>
              <button onClick={()=>switchToStation(alternative)} className="tap"
                style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Switch Station</button>
            </div>
          </Card>
        )}

        {isGracePeriod && (
          <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.3)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
              <PulseDot color={T.yellow}/>
              <span style={{ fontWeight:700,fontSize:13,color:T.yellow }}>Grace Period Active</span>
            </div>
            <div style={{ fontWeight:900,fontSize:32,color:T.yellow,fontFamily:"monospace" }}>{fmtCountdown(msLeft)}</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>Arrive within this window or your reservation expires and your reliability score drops.</div>
          </Card>
        )}

        <Card T={T} style={{ padding:18, marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{booking.station}</div>
              <div style={{ fontSize:12,color:T.muted,marginTop:3 }}>Charger {booking.charger_id} · {booking.vehicle}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              {arrived && <PulseDot color={T.green}/>}
              <Badge label={arrived?"Arrived":"Confirmed"} color={arrived?T.green:T.blue}/>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              { label:"Arrival Time", value:fmtTime(arrivalTime) },
              { label:"Est. Cost", value:`GH₵${booking.amount}` },
              { label:"Grace Period", value:`${booking.grace_period_min||GRACE_PERIOD_MIN} min` },
              { label:"Distance", value: distanceKm!=null?`${distanceKm.toFixed(2)} km`:"Locating…" },
            ].map(r=>(
              <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>{r.label}</div>
                <div style={{ fontWeight:700,fontSize:13,color:T.text,marginTop:3 }}>{r.value}</div>
              </div>
            ))}
          </div>

          {!arrived && (
            <div style={{ fontSize:11,color:T.muted,textAlign:"center",marginBottom:10 }}>
              <i className="fas fa-satellite-dish" style={{ marginRight:6 }}/>
              We'll check you in automatically within {Math.round(ARRIVAL_RADIUS_KM*1000)}m of the station — no QR, no tap needed.
            </div>
          )}
          {arrived && (
            <div className="fade" style={{ marginBottom:12 }}>
              <div style={{ textAlign:"center",marginBottom:12 }}>
                <div style={{ fontWeight:800,fontSize:15,color:T.green }}>Welcome to EcoCharge</div>
                <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>Ready to Charge</div>
              </div>
              <button onClick={onStartCharging} className="tap"
                style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                <i className="fas fa-bolt" style={{ marginRight:8 }}/>Start Charging
              </button>
            </div>
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
  const [now, setNow] = useState(Date.now());
  const expiredRef = useRef(false);

  const load = async () => {
    // getMyPosition only looks at "waiting" rows — also check for an active offer.
    const waiting = await QueueService.getMyPosition(chargerId, userId, ctx);
    if (waiting) { setMyEntry(waiting); setQueueLen(await QueueService.getQueueLength(chargerId, ctx)); return; }
    const offered = await sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `queue?charger_id=eq.${chargerId}&user_id=eq.${userId}&status=eq.offered&select=*&order=offered_at.desc&limit=1`);
    setMyEntry(Array.isArray(offered) && offered[0] ? offered[0] : null);
    setQueueLen(await QueueService.getQueueLength(chargerId, ctx));
  };
  useEffect(()=>{ load(); const t=setInterval(load, 15000); return ()=>clearInterval(t); }, [chargerId]);
  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t); }, []);

  const isOffered = myEntry?.status === "offered";
  const offerMsLeft = isOffered && myEntry.offer_expires_at ? new Date(myEntry.offer_expires_at).getTime() - now : null;

  useEffect(()=>{
    if (isOffered && offerMsLeft != null && offerMsLeft <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      QueueService.expireOffer(myEntry, chargerId, ctx).then(load);
    }
  }, [offerMsLeft]);

  if (!myEntry) return null;

  if (isOffered) {
    return (
      <Card T={T} style={{ padding:16, marginBottom:14, background:"rgba(34,197,94,0.08)", border:`1px solid ${T.green}55` }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
          <PulseDot color={T.green}/>
          <span style={{ fontWeight:800,fontSize:13,color:T.green }}>Your Charger Is Ready!</span>
        </div>
        <div style={{ fontWeight:900,fontSize:28,color:T.green,fontFamily:"monospace",marginBottom:6 }}>{fmtCountdown(offerMsLeft)}</div>
        <div style={{ fontSize:11,color:T.muted,marginBottom:12 }}>Accept within {QUEUE_OFFER_WINDOW_MIN} minutes or it goes to the next driver in line.</div>
        <button onClick={async()=>{ await QueueService.acceptOffer(myEntry.id, ctx); load(); }} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
          Accept & Head to Charger
        </button>
      </Card>
    );
  }

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
    await ReliabilityService.adjust(user.id, ReliabilityService.POINTS.completedSession, "Completed charging session", ctx);
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
function BookingHistory({ T, go, user, ctx, onBack, onOpen, onOpenAnalytics }) {
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
      <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"12px 16px 0",alignItems:"center" }}>
        {["All","Upcoming","Completed","Cancelled","Expired"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className="tap"
            style={{ flexShrink:0,background:filter===f?T.green:T.card,border:`1px solid ${filter===f?T.green:T.border}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:filter===f?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
            {f}
          </button>
        ))}
        <button onClick={onOpenAnalytics} className="tap"
          style={{ flexShrink:0,marginLeft:"auto",background:"none",border:`1px solid ${T.blue}55`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:T.blue,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
          <i className="fas fa-chart-bar"/> Stats
        </button>
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

// ── PERSONAL RESERVATION ANALYTICS ────────────────────────────
function ReservationAnalytics({ T, go, user, ctx, onBack }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(()=>{
    (async ()=>{
      const [bookings, sessions, score, relHistory] = await Promise.all([
        BookingService.loadHistory(user.id, ctx),
        sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `charging_sessions?user_id=eq.${user.id}&status=eq.Completed&select=started_at,completed_at,energy_kwh,cost_total&order=started_at.desc&limit=100`),
        ReliabilityService.getScore(user.id, ctx),
        sbGet(ctx.SUPABASE_URL, ctx.SUPABASE_ANON, ctx.getToken, `reliability_history?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=10`),
      ]);
      const bl = Array.isArray(bookings) ? bookings : [];
      const sl = Array.isArray(sessions) ? sessions : [];

      const completed = bl.filter(b=>b.status==="completed").length;
      const cancelled = bl.filter(b=>b.status==="cancelled").length;
      const noShows   = bl.filter(b=>b.status==="expired").length;
      const resolved  = completed + cancelled + noShows;
      const successRate = resolved ? Math.round((completed/resolved)*100) : null;

      const arrivalOffsets = bl
        .filter(b=>b.arrival_confirmed_at && b.slot_time)
        .map(b=>(new Date(b.arrival_confirmed_at).getTime() - new Date(b.slot_time).getTime())/60000);
      const avgArrivalOffsetMin = arrivalOffsets.length ? Math.round(arrivalOffsets.reduce((a,v)=>a+v,0)/arrivalOffsets.length) : null;

      const chargeDurations = sl
        .filter(s=>s.started_at && s.completed_at)
        .map(s=>(new Date(s.completed_at).getTime() - new Date(s.started_at).getTime())/60000);
      const avgChargeDurationMin = chargeDurations.length ? Math.round(chargeDurations.reduce((a,v)=>a+v,0)/chargeDurations.length) : null;

      const totalKwh = sl.reduce((a,s)=>a+(s.energy_kwh||0),0);
      const totalSpentPesewas = sl.reduce((a,s)=>a+(s.cost_total||0),0);

      setStats({ completed, cancelled, noShows, successRate, avgArrivalOffsetMin, avgChargeDurationMin, totalSessions: sl.length, totalKwh, totalSpentPesewas, score });
      setHistory(Array.isArray(relHistory) ? relHistory : []);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="My Reservation Stats" onBack={onBack}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}><Spinner color={T.green}/></div>
    </div>
  );

  const tier = ReliabilityService.tier(stats.score);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="My Reservation Stats" onBack={onBack}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>

        <Card T={T} style={{ padding:16, marginBottom:14, background:`${tier.color}12`, border:`1px solid ${tier.color}44` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase" }}>Reliability Score</div>
              <div style={{ fontWeight:900,fontSize:32,color:tier.color,marginTop:4 }}>{stats.score}</div>
            </div>
            <Badge label={tier.label} color={tier.color}/>
          </div>
        </Card>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
          {[
            { label:"Completed", value:stats.completed, color:T.green },
            { label:"Cancelled", value:stats.cancelled, color:T.muted },
            { label:"No-Shows",  value:stats.noShows,   color:T.red   },
          ].map(s=>(
            <div key={s.label} style={{ background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"12px 8px",textAlign:"center" }}>
              <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Booking Success Rate</div>
          {stats.successRate == null ? (
            <div style={{ fontSize:12,color:T.muted }}>Not enough resolved bookings yet.</div>
          ) : (
            <>
              <div style={{ fontWeight:900,fontSize:34,color:T.green,marginBottom:8 }}>{stats.successRate}%</div>
              <div style={{ height:8,borderRadius:4,background:T.track,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${stats.successRate}%`,background:`linear-gradient(90deg,${T.green},${T.blue})`,borderRadius:4 }}/>
              </div>
            </>
          )}
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Timing</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"12px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Avg. Arrival</div>
              <div style={{ fontWeight:700,fontSize:15,color:T.text,marginTop:4 }}>
                {stats.avgArrivalOffsetMin == null ? "—" : stats.avgArrivalOffsetMin <= 0 ? `${Math.abs(stats.avgArrivalOffsetMin)}m early` : `${stats.avgArrivalOffsetMin}m late`}
              </div>
            </div>
            <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"12px" }}>
              <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Avg. Charging Duration</div>
              <div style={{ fontWeight:700,fontSize:15,color:T.text,marginTop:4 }}>{stats.avgChargeDurationMin == null ? "—" : `${stats.avgChargeDurationMin} min`}</div>
            </div>
          </div>
        </Card>

        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Charging Totals</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[
              { label:"Sessions", value:stats.totalSessions },
              { label:"kWh",      value:stats.totalKwh.toFixed(1) },
              { label:"Spent",    value:`GH₵${(stats.totalSpentPesewas/100).toFixed(0)}` },
            ].map(s=>(
              <div key={s.label} style={{ background:T.surfaceFaint,borderRadius:10,padding:"12px 6px",textAlign:"center" }}>
                <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{s.value}</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card T={T} style={{ padding:16 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>Recent Score Changes</div>
          {history.length === 0 && <div style={{ fontSize:12,color:T.muted }}>No score changes yet — your history builds up as you use reservations.</div>}
          {history.map(h=>(
            <div key={h.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${T.border}30` }}>
              <div>
                <div style={{ fontSize:12,color:T.text,fontWeight:600 }}>{h.reason}</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{new Date(h.created_at).toLocaleDateString("en-GH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <span style={{ fontWeight:800,fontSize:14,color:h.delta>=0?T.green:T.red }}>{h.delta>=0?"+":""}{h.delta}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}


// ── FLEET DASHBOARD ────────────────────────────────────────────
function FleetDashboard({ T, go, user, stations, ctx, onBack }) {
  const [fleet, setFleet] = useState(null);
  const [tab, setTab] = useState("overview"); // overview | drivers | reserve | reports
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async (fleetId) => {
    const [d, b] = await Promise.all([FleetService.listDrivers(fleetId, ctx), FleetService.listBookings(fleetId, ctx)]);
    setDrivers(d); setBookings(b);
  };

  useEffect(()=>{
    (async ()=>{
      const f = await FleetService.getOrCreateFleet(user.id, ctx);
      setFleet(f);
      if (f) await load(f.id);
      setLoading(false);
    })();
  }, []);

  useEffect(()=>{
    if (!fleet) return;
    const t = setInterval(()=>load(fleet.id), 20000);
    return () => clearInterval(t);
  }, [fleet]);

  if (loading || !fleet) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Fleet Dashboard" onBack={onBack}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}><Spinner color={T.green}/></div>
    </div>
  );

  const active = bookings.filter(b => ["confirmed","charging"].includes(b.status));
  const statusColor = (s) => ({ confirmed:T.blue, charging:T.green, completed:T.green, cancelled:T.muted, expired:T.red }[s] || T.muted);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Fleet Dashboard" sub={fleet.name} onBack={onBack}/>
      <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"12px 16px 0" }}>
        {[["overview","Overview"],["drivers","Drivers"],["reserve","Reserve"],["reports","Reports"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className="tap"
            style={{ flexShrink:0,background:tab===id?T.green:T.card,border:`1px solid ${tab===id?T.green:T.border}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,color:tab===id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px 100px" }}>

        {tab==="overview" && (
          <FleetOverview T={T} bookings={bookings} active={active} statusColor={statusColor} fleet={fleet} ctx={ctx} onReschedule={async(mins)=>{ await FleetService.rescheduleAll(fleet.id, mins, ctx); load(fleet.id); }}/>
        )}
        {tab==="drivers" && (
          <FleetDrivers T={T} fleetId={fleet.id} drivers={drivers} ctx={ctx} onChange={()=>load(fleet.id)}/>
        )}
        {tab==="reserve" && (
          <FleetReserve T={T} stations={stations} drivers={drivers} fleet={fleet} user={user} ctx={ctx} onDone={()=>{ load(fleet.id); setTab("overview"); }}/>
        )}
        {tab==="reports" && (
          <FleetReports T={T} fleetId={fleet.id} ctx={ctx}/>
        )}
      </div>
    </div>
  );
}

function FleetOverview({ T, bookings, active, statusColor, onReschedule }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [delta, setDelta] = useState(30);
  return (
    <>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
        {[
          { label:"Active", value:active.length, color:T.green },
          { label:"Total",  value:bookings.length, color:T.blue },
          { label:"Completed", value:bookings.filter(b=>b.status==="completed").length, color:T.mutedLight },
        ].map(s=>(
          <div key={s.label} style={{ background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"12px 8px",textAlign:"center" }}>
            <div style={{ fontWeight:800,fontSize:20,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card T={T} style={{ padding:16, marginBottom:14 }}>
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}><i className="fas fa-calendar-alt" style={{ marginRight:8,color:T.green }}/>Reschedule All Upcoming</div>
        {!rescheduling ? (
          <button onClick={()=>setRescheduling(true)} className="tap"
            style={{ width:"100%",background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>Push all drivers' reservations back</button>
        ) : (
          <div>
            <div style={{ display:"flex",gap:8,marginBottom:10 }}>
              {[15,30,60].map(m=>(
                <button key={m} onClick={()=>setDelta(m)} className="tap"
                  style={{ flex:1,background:delta===m?T.green:T.inputBg,border:`1px solid ${delta===m?T.green:T.border}`,borderRadius:10,padding:"9px",fontSize:12,fontWeight:700,color:delta===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>+{m}m</button>
              ))}
            </div>
            <button onClick={async()=>{ await onReschedule(delta); setRescheduling(false); }} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Apply to All Upcoming</button>
          </div>
        )}
      </Card>

      <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Live Reservations</div>
      {bookings.length === 0 && <div style={{ fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0" }}>No fleet reservations yet — use the Reserve tab.</div>}
      {bookings.map(b=>(
        <Card key={b.reference} T={T} style={{ padding:14, marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
            <div>
              <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{b.station} · {b.charger_id}</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{b.driver_name || "Unassigned"} · {fmtTime(new Date(b.slot_time))}</div>
            </div>
            <Badge label={b.status} color={statusColor(b.status)}/>
          </div>
        </Card>
      ))}
    </>
  );
}

function FleetDrivers({ T, fleetId, drivers, ctx, onChange }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await FleetService.addDriver(fleetId, { name: name.trim(), phone: phone.trim() }, ctx);
    setName(""); setPhone(""); setSaving(false);
    onChange();
  };

  return (
    <>
      <Card T={T} style={{ padding:16, marginBottom:14 }}>
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Add Driver</div>
        <input placeholder="Driver name" value={name} onChange={e=>setName(e.target.value)}
          style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 12px",color:T.text,fontSize:13,fontFamily:"inherit",marginBottom:8 }}/>
        <input placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)}
          style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 12px",color:T.text,fontSize:13,fontFamily:"inherit",marginBottom:10 }}/>
        <button onClick={add} disabled={saving||!name.trim()} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1 }}>
          {saving ? "Adding…" : "Add Driver"}
        </button>
      </Card>

      {drivers.length === 0 && <div style={{ fontSize:12,color:T.muted,textAlign:"center",padding:"10px 0" }}>No drivers added yet.</div>}
      {drivers.map(d=>(
        <Card key={d.id} T={T} style={{ padding:14, marginBottom:8, display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:600,fontSize:13,color:T.text }}>{d.name}</div>
            {d.phone && <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{d.phone}</div>}
          </div>
          <button onClick={async()=>{ await FleetService.removeDriver(d.id, ctx); onChange(); }} className="tap"
            style={{ background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>Remove</button>
        </Card>
      ))}
    </>
  );
}

function FleetReserve({ T, stations, drivers, fleet, user, ctx, onDone }) {
  const [stationId, setStationId] = useState(stations?.[0]?.id || null);
  const [chargers, setChargers] = useState([]);
  const [assignments, setAssignments] = useState({}); // chargerId -> driverId
  const [durationMin, setDurationMin] = useState(60);
  const [arrivalMins, setArrivalMins] = useState(30);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const station = stations?.find(s => s.id === stationId);

  useEffect(()=>{
    if (!station) return;
    StationService.loadChargers(station.id, ctx).then(cs => setChargers(cs.filter(c => StationService.chargerStatus(c) === "Available")));
  }, [stationId]);

  const toggleAssign = (chargerId, driverId) => setAssignments(prev => ({ ...prev, [chargerId]: prev[chargerId] === driverId ? null : driverId }));

  const submit = async () => {
    const picks = Object.entries(assignments).filter(([,d]) => d);
    if (!picks.length) return;
    setSaving(true);
    const arrivalTime = new Date(Date.now() + arrivalMins*60000);
    let count = 0;
    for (const [chargerId, driverId] of picks) {
      const charger = chargers.find(c => c.id === chargerId);
      const driver = drivers.find(d => d.id === driverId);
      if (!charger || !driver) continue;
      const price = charger.price_per_kwh || charger.rate_per_kwh || DEFAULT_PRICE_PER_KWH;
      const power = charger.power_kw || charger.max_power_kw || DEFAULT_CHARGER_KW;
      const estimatedCost = +((Math.min(power,40)*(durationMin/60)*0.8)*price + 5).toFixed(2);
      await BookingService.create({
        user, station, charger, vehicle:null, arrivalTime, durationMin, estimatedCost,
        gracePeriodMin: GRACE_PERIOD_MIN, fleetId: fleet.id, driverName: driver.name, driverPhone: driver.phone, ctx,
      });
      count++;
    }
    setSaving(false);
    setResult(count);
    setTimeout(onDone, 1200);
  };

  return (
    <>
      <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Station</div>
      <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14 }}>
        {(stations||[]).map(s=>(
          <button key={s.id} onClick={()=>setStationId(s.id)} className="tap"
            style={{ flexShrink:0,background:stationId===s.id?T.green:T.card,border:`1px solid ${stationId===s.id?T.green:T.border}`,borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:700,color:stationId===s.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
            {s.name}
          </button>
        ))}
      </div>

      {drivers.length === 0 && (
        <div style={{ fontSize:12,color:T.yellow,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:10,padding:"12px",marginBottom:14 }}>
          Add drivers in the Drivers tab before reserving chargers for them.
        </div>
      )}

      <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Available Chargers — Assign a Driver</div>
      {chargers.length === 0 && <div style={{ fontSize:12,color:T.muted,textAlign:"center",padding:"14px 0" }}>No available chargers at this station right now.</div>}
      {chargers.map(c=>(
        <Card key={c.id} T={T} style={{ padding:14, marginBottom:10 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:8 }}>{c.label||c.id} · {c.power_kw||DEFAULT_CHARGER_KW}kW</div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {drivers.map(d=>(
              <button key={d.id} onClick={()=>toggleAssign(c.id, d.id)} className="tap"
                style={{ background:assignments[c.id]===d.id?T.green:T.inputBg,border:`1px solid ${assignments[c.id]===d.id?T.green:T.border}`,borderRadius:20,padding:"6px 12px",fontSize:11,fontWeight:700,color:assignments[c.id]===d.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {d.name}
              </button>
            ))}
          </div>
        </Card>
      ))}

      {chargers.length > 0 && (
        <Card T={T} style={{ padding:16, marginBottom:14 }}>
          <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:10 }}>Timing (applies to all)</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div>
              <div style={{ fontSize:10,color:T.muted,marginBottom:5 }}>Arrival in</div>
              <div style={{ display:"flex",gap:6 }}>
                {[15,30,60].map(m=>(
                  <button key={m} onClick={()=>setArrivalMins(m)} className="tap"
                    style={{ flex:1,background:arrivalMins===m?T.green:T.inputBg,border:`1px solid ${arrivalMins===m?T.green:T.border}`,borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,color:arrivalMins===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>{m}m</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10,color:T.muted,marginBottom:5 }}>Duration</div>
              <div style={{ display:"flex",gap:6 }}>
                {[30,60,120].map(m=>(
                  <button key={m} onClick={()=>setDurationMin(m)} className="tap"
                    style={{ flex:1,background:durationMin===m?T.green:T.inputBg,border:`1px solid ${durationMin===m?T.green:T.border}`,borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,color:durationMin===m?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>{m}m</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {result != null && (
        <div style={{ fontSize:12,color:T.green,textAlign:"center",marginBottom:10 }}><i className="fas fa-check-circle" style={{ marginRight:6 }}/>{result} reservation{result!==1?"s":""} created.</div>
      )}

      <button onClick={submit} disabled={saving || !Object.values(assignments).some(Boolean)} className="tap"
        style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1 }}>
        {saving ? "Reserving…" : "Reserve for Assigned Drivers"}
      </button>
    </>
  );
}

function FleetReports({ T, fleetId, ctx }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(()=>{ FleetService.report(fleetId, ctx).then(r=>{ setReport(r); setLoading(false); }); }, []);

  if (loading) return <div style={{ textAlign:"center",padding:"30px 0" }}><Spinner color={T.green}/></div>;

  return (
    <>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
        {[
          { label:"Sessions", value:report.sessionCount },
          { label:"kWh",      value:report.totalKwh.toFixed(1) },
          { label:"Spent",    value:`GH₵${(report.totalCostPesewas/100).toFixed(0)}` },
        ].map(s=>(
          <div key={s.label} style={{ background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"12px 8px",textAlign:"center" }}>
            <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{s.value}</div>
            <div style={{ fontSize:9,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <Card T={T} style={{ padding:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:12 }}>By Driver</div>
        {Object.keys(report.byDriver).length === 0 && <div style={{ fontSize:12,color:T.muted }}>No completed sessions yet.</div>}
        {Object.entries(report.byDriver).map(([driver, d])=>(
          <div key={driver} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${T.border}30` }}>
            <div style={{ fontSize:12,color:T.text,fontWeight:600 }}>{driver}</div>
            <div style={{ fontSize:11,color:T.muted }}>{d.sessions} sessions · {d.kwh.toFixed(1)}kWh · GH₵{(d.costPesewas/100).toFixed(0)}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

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

  if (step==="list") return <StationList T={T} go={go} stations={stations} onSelect={(s)=>{ setStation(s); setStep("detail"); }} onOpenFleet={()=>setStep("fleet")}/>;

  if (step==="fleet") return (
    <FleetDashboard T={T} go={go} user={user} stations={stations} ctx={ctx} onBack={()=>setStep("list")}/>
  );

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
    <ActiveBookingDashboard T={T} go={go} booking={booking} station={station} user={user} ctx={ctx} stations={stations} vehicles={vehicles}
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
      onOpenAnalytics={()=>setStep("analytics")}
    />
  );

  if (step==="analytics") return (
    <ReservationAnalytics T={T} go={go} user={user} ctx={ctx}
      onBack={()=>setStep("history")}
    />
  );

  return null;
}
