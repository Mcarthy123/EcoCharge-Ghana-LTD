// ============================================================
// EcoCharge Ghana — Fleet Dashboard (real implementation)
//
// This replaces the earlier "aggregate my own vehicles" view with
// an actual fleet system:
// - A fleet is a business entity separate from the owner's personal
//   account (fleets table)
// - Drivers are invited by email and accept, exactly like Family
//   Sharing (fleet_drivers table)
// - Vehicles the owner has already registered under My Vehicles can
//   be added to the fleet and assigned to a driver
// - The fleet has its own wallet (fleet_wallets), funded by the
//   owner via Paystack, and drivers' charging sessions on fleet
//   vehicles debit THIS wallet, not their personal one
// - Analytics are real: they read charging_sessions.vehicle_id via
//   the get_fleet_vehicle_stats() function, not capacity estimates
//
// HONESTY NOTE: for a vehicle's charging cost to appear here, the
// charging session that used it must have vehicle_id set. That
// requires the App.jsx charging flow to capture it (see the
// integration notes that came with this file) — sessions created
// before that wiring won't retroactively show up here.
// ============================================================
import { useState, useEffect } from "react";

const OCPP_URL = import.meta.env.VITE_OCPP_SERVER_URL || "";
const OCPP_KEY = import.meta.env.VITE_OCPP_API_KEY    || "";

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
const Header = ({ T, title, sub, onBack }) => (
  <div style={{ position:"sticky",top:0,zIndex:10,padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.surfaceBorder}`,background:T.navBg,backdropFilter:"blur(16px)" }}>
    <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
      <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
    </button>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:800,fontSize:16,color:T.text,letterSpacing:-0.2 }}>{title}</div>
      {sub && <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

const fmtGHS = (p) => p != null ? `GH₵${(p/100).toFixed(2)}` : "GH₵0.00";
const toPesewas = (g) => Math.round(parseFloat(g) * 100);

const sbGet = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` } });
    return await res.json();
  } catch(e) { return null; }
};
const sbPost = async (SUPABASE_URL, SUPABASE_ANON, getToken, path, body) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
};
const sbPatch = async (SUPABASE_URL, SUPABASE_ANON, getToken, path, body) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method:"PATCH", headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch(e) { return false; }
};
const sbDelete = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method:"DELETE", headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` } });
    return res.ok;
  } catch(e) { return false; }
};
const sbRpc = async (SUPABASE_URL, SUPABASE_ANON, getToken, fn, args) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
};

export default function FleetDashboard({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const ctx = [SUPABASE_URL, SUPABASE_ANON, getToken];
  const [subLoading, setSubLoading] = useState(true);
  const [hasFleetSub, setHasFleetSub] = useState(false);

  const [fleet, setFleet] = useState(null);
  const [fleetName, setFleetName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [drivers, setDrivers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [myVehicles, setMyVehicles] = useState([]);
  const [stats, setStats] = useState({});
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [fleetTier, setFleetTier] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topupAmt, setTopupAmt] = useState("");
  const [payingTopUp, setPayingTopUp] = useState(false);
  const [error, setError] = useState("");

 const FLEET_TIER_LIMITS = { fleet_starter:5, fleet_business:15, fleet_pro:30, fleet_enterprise:Infinity };
  const FLEET_TIER_NAMES  = { fleet_starter:"Fleet Starter", fleet_business:"Fleet Business", fleet_pro:"Fleet Pro", fleet_enterprise:"Fleet Enterprise" };

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) { setSubLoading(false); return; }
    (async()=>{
      const data = await sbGet(...ctx, `subscriptions?user_id=eq.${user.id}&status=eq.active&tier=in.(fleet_starter,fleet_business,fleet_pro,fleet_enterprise)&order=created_at.desc&limit=1`);
      const row = Array.isArray(data) && data[0] ? data[0] : null;
      setHasFleetSub(!!row);
      setFleetTier(row?.tier || null);
      setSubLoading(false);
    })();
  }, [user?.id]);

  const loadAll = async () => {
    if (!user?.id || !hasFleetSub) { setLoading(false); return; }
    setLoading(true);
    const owned = await sbGet(...ctx, `fleets?owner_id=eq.${user.id}&limit=1`);
    const f = Array.isArray(owned) && owned[0] ? owned[0] : null;
    setFleet(f);

    if (f) {
      const [d, v, w] = await Promise.all([
        sbGet(...ctx, `fleet_drivers?fleet_id=eq.${f.id}&order=invited_at.asc`),
        sbGet(...ctx, `user_vehicles?user_id=eq.${user.id}&order=created_at.asc`),
        sbGet(...ctx, `fleet_wallets?fleet_id=eq.${f.id}&limit=1`),
      ]);
      setDrivers(Array.isArray(d) ? d : []);
      setMyVehicles(Array.isArray(v) ? v : []);

      let walletRow = Array.isArray(w) && w[0] ? w[0] : null;
      if (!walletRow) {
        const created = await sbPost(...ctx, "fleet_wallets", { fleet_id: f.id, balance_pesewas: 0 });
        walletRow = created?.[0] || null;
      }
      setWallet(walletRow);

      const t = await sbGet(...ctx, `fleet_wallet_transactions?fleet_id=eq.${f.id}&order=created_at.desc&limit=20`);
      setTxns(Array.isArray(t) ? t : []);

      const s = await sbRpc(...ctx, "get_fleet_vehicle_stats", { p_fleet_id: f.id });
      const statMap = {};
      (Array.isArray(s) ? s : []).forEach(row => { statMap[row.vehicle_id] = row; });
      setStats(statMap);
    }
    setLoading(false);
  };
  useEffect(()=>{ loadAll(); }, [user?.id, hasFleetSub]);

  const createFleet = async () => {
    if (!fleetName.trim()) { setError("Enter a fleet name"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fleets`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ owner_id: user.id, name: fleetName.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(`Failed (${res.status}): ${text.slice(0, 300)}`);
      } else {
        const saved = JSON.parse(text);
        if (saved?.[0]) { setFleet(saved[0]); loadAll(); } else setError("Insert succeeded but returned no row.");
      }
    } catch(e) {
      setError("Network error: " + String(e));
    }
    setCreating(false);
  };

  const inviteDriver = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) { setError("Enter a valid email"); return; }
    if (drivers.some(d => d.invited_email.toLowerCase() === inviteEmail.trim().toLowerCase())) { setError("Already invited"); return; }
    setInviting(true); setError("");
    const saved = await sbPost(...ctx, "fleet_drivers", { fleet_id: fleet.id, invited_email: inviteEmail.trim().toLowerCase(), role:"driver", status:"pending" });
    if (saved?.[0]) { setDrivers(prev => [...prev, saved[0]]); setInviteEmail(""); }
    else setError("Could not send invite.");
    setInviting(false);
  };

  const removeDriver = async (id) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
    await sbDelete(...ctx, `fleet_drivers?id=eq.${id}`);
  };

  const toggleVehicleInFleet = async (v) => {
    const inFleet = v.fleet_id === fleet.id;
    if (!inFleet) {
      const limit = FLEET_TIER_LIMITS[fleetTier] ?? 0;
      if (fleetVehicles.length >= limit) {
        setError(`Your ${FLEET_TIER_NAMES[fleetTier] || "plan"} allows up to ${limit} vehicles. Upgrade to add more.`);
        return;
      }
    }
    const ok = await sbPatch(...ctx, `user_vehicles?id=eq.${v.id}`, { fleet_id: inFleet ? null : fleet.id, assigned_driver_id: inFleet ? null : v.assigned_driver_id });
    if (ok) setMyVehicles(prev => prev.map(x => x.id===v.id ? { ...x, fleet_id: inFleet ? null : fleet.id } : x));
  };

  const assignDriver = async (vehicleId, driverUserId) => {
    const ok = await sbPatch(...ctx, `user_vehicles?id=eq.${vehicleId}`, { assigned_driver_id: driverUserId || null });
    if (ok) setMyVehicles(prev => prev.map(x => x.id===vehicleId ? { ...x, assigned_driver_id: driverUserId || null } : x));
  };

  const topUpFleetWallet = async () => {
    const amount = toPesewas(topupAmt);
    if (!amount || amount < 500) { setError("Minimum top-up is GH₵5.00"); return; }
    setPayingTopUp(true); setError("");
    const ref = `FLEETTOPUP-${fleet.id.slice(0,8)}-${Date.now()}`;
    try {
      try { localStorage.setItem("eco_fleet_topup_pending", JSON.stringify({ ref, fleetId: fleet.id, amount })); } catch(e) {}
      if (OCPP_URL) {
        const initRes = await fetch(`${OCPP_URL}/api/payment/initialize`, {
          method:"POST", headers:{ "x-api-key":OCPP_KEY, "Content-Type":"application/json" },
          body: JSON.stringify({ email:user.email, amount_pesewas:amount, type:"fleet_topup", metadata:{ fleet_id: fleet.id, reference: ref } }),
        });
        const initData = await initRes.json();
        if (initData.reference && initData.authorization_url) { window.location.href = initData.authorization_url; return; }
      }
      window.location.href = `https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(user.email)}&amount=${amount}&reference=${ref}`;
    } catch(e) { setError("Could not start checkout."); setPayingTopUp(false); }
  };

  const activeDrivers = drivers.filter(d => d.status === "active");
  const fleetVehicles = myVehicles.filter(v => v.fleet_id === fleet?.id);
  const availableVehicles = myVehicles.filter(v => v.fleet_id !== fleet?.id);

  if (subLoading) {
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",animation:"spin .8s linear infinite" }}/>
      </div>
    );
  }

  if (!hasFleetSub) {
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <Header T={T} title="Fleet Dashboard" sub="Manage your fleet" onBack={()=>go("home")}/>
        <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
            <i className="fas fa-layer-group" style={{ fontSize:28,color:T.green }}/>
          </div>
          <div style={{ fontWeight:800,fontSize:18,color:T.text,marginBottom:10 }}>Fleet Dashboard is a Business Feature</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:28,maxWidth:320 }}>
            Register drivers, assign vehicles, and fund a centralized fleet wallet so your business pays for charging — not each driver personally.
          </div>
          <button onClick={()=>go("subscription")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px 32px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
            View Fleet Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Fleet Dashboard" sub={fleet?.name || "Set up your fleet"} onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        {loading && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Loading…</div>}

        {!loading && !fleet && (
          <Card T={T} style={{ padding:22 }}>
            <div style={{ textAlign:"center",marginBottom:18 }}>
              <i className="fas fa-layer-group" style={{ fontSize:32,color:T.green,marginBottom:10,display:"block" }}/>
              <div style={{ fontWeight:800,fontSize:15,color:T.text,marginBottom:6 }}>Set Up Your Fleet</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>Create your fleet, then invite drivers and assign vehicles.</div>
            </div>
            <input value={fleetName} onChange={e=>{ setFleetName(e.target.value); setError(""); }} placeholder="e.g. Accra Logistics Fleet"
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",color:T.text,fontSize:14,fontFamily:"inherit",marginBottom:12 }}/>
            {error && <div style={{ fontSize:12,color:T.red,marginBottom:12 }}>{error}</div>}
            <button onClick={createFleet} disabled={creating} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:creating?0.7:1 }}>
              {creating ? "Creating…" : "Create Fleet"}
            </button>
          </Card>
        )}

        {!loading && fleet && (
          <>
            {/* Fleet Wallet */}
           <Card T={T} style={{ padding:16, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4 }}>Current Plan</div>
                <div style={{ fontWeight:800,fontSize:15,color:T.text }}>{FLEET_TIER_NAMES[fleetTier] || "—"}</div>
                <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>
                  {fleetVehicles.length} of {FLEET_TIER_LIMITS[fleetTier]===Infinity ? "unlimited" : FLEET_TIER_LIMITS[fleetTier]} vehicles used
                </div>
              </div>
              <button onClick={()=>go("subscription")} className="tap"
                style={{ background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                Manage
              </button>
            </Card>
                  <div style={{ fontWeight:900,fontSize:28,color:T.text }}>{fmtGHS(wallet?.balance_pesewas)}</div>
                </div>
                <button onClick={()=>setShowTopUp(v=>!v)} className="tap"
                  style={{ background:T.green,border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:800,color:"#04130a",cursor:"pointer",fontFamily:"inherit" }}>
                  Top Up
                </button>
              </div>
              <div style={{ fontSize:11,color:T.muted,lineHeight:1.6 }}>Charging done on fleet-assigned vehicles is billed here, not from each driver's personal wallet.</div>

              {showTopUp && (
                <div className="fade" style={{ marginTop:16,paddingTop:16,borderTop:`1px solid ${T.surfaceBorder}` }}>
                  <div style={{ display:"flex",gap:8 }}>
                    <input value={topupAmt} onChange={e=>setTopupAmt(e.target.value)} placeholder="Amount (GH₵)" type="number"
                      style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 12px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
                    <button onClick={topUpFleetWallet} disabled={payingTopUp} className="tap"
                      style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px 18px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:payingTopUp?0.7:1 }}>
                      {payingTopUp ? "…" : "Pay"}
                    </button>
                  </div>
                </div>
              )}
              {error && <div style={{ fontSize:12,color:T.red,marginTop:10 }}>{error}</div>}
            </Card>

            {/* Drivers */}
            <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Drivers</div>
            <Card T={T} style={{ padding:16, marginBottom:12 }}>
              <div style={{ display:"flex",gap:8 }}>
                <input value={inviteEmail} onChange={e=>{ setInviteEmail(e.target.value); setError(""); }} placeholder="driver@email.com" type="email"
                  style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 12px",color:T.text,fontSize:13,fontFamily:"inherit" }}/>
                <button onClick={inviteDriver} disabled={inviting} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px 18px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:inviting?0.7:1 }}>
                  {inviting ? "…" : "Invite"}
                </button>
              </div>
            </Card>
            {drivers.length === 0 && (
              <Card T={T} style={{ padding:16, marginBottom:16, textAlign:"center" }}>
                <div style={{ fontSize:12,color:T.muted }}>No drivers yet — invite one above.</div>
              </Card>
            )}
            {drivers.map(d=>(
              <Card key={d.id} T={T} style={{ padding:14, marginBottom:8, display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{d.invited_email}</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{d.status==="active" ? "Active driver" : "Invite pending"}</div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <Badge label={d.status==="active"?"Active":"Pending"} color={d.status==="active"?T.green:T.yellow}/>
                  <button onClick={()=>removeDriver(d.id)} className="tap" style={{ background:"none",border:"none",color:T.red,cursor:"pointer",padding:4 }}>
                    <i className="fas fa-times-circle"/>
                  </button>
                </div>
              </Card>
            ))}

            {/* Vehicles */}
            <div style={{ fontWeight:800,fontSize:14,color:T.text,margin:"20px 0 10px" }}>Fleet Vehicles</div>
            {fleetVehicles.length === 0 && (
              <Card T={T} style={{ padding:16, marginBottom:12, textAlign:"center" }}>
                <div style={{ fontSize:12,color:T.muted }}>No vehicles in this fleet yet. Add one from below.</div>
              </Card>
            )}
            {fleetVehicles.map(v=>{
              const stat = stats[v.id];
              return (
                <Card key={v.id} T={T} style={{ padding:16, marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{v.nickname}</div>
                      <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{v.manufacturer} {v.model}</div>
                    </div>
                    <button onClick={()=>toggleVehicleInFleet(v)} className="tap"
                      style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>
                      Remove
                    </button>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10,color:T.muted,marginBottom:5 }}>Assigned Driver</div>
                    <select value={v.assigned_driver_id || ""} onChange={e=>assignDriver(v.id, e.target.value)}
                      style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 10px",color:T.text,fontSize:12,fontFamily:"inherit" }}>
                      <option value="">Unassigned</option>
                      {activeDrivers.map(d=>(<option key={d.id} value={d.user_id}>{d.invited_email}</option>))}
                    </select>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                    {[
                      { label:"Sessions", value: stat?.session_count || 0 },
                      { label:"kWh", value: stat ? Number(stat.total_kwh).toFixed(1) : "0.0" },
                      { label:"Cost", value: fmtGHS(stat?.total_cost_pesewas || 0) },
                    ].map(r=>(
                      <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px",textAlign:"center" }}>
                        <div style={{ fontWeight:700,fontSize:12,color:T.text }}>{r.value}</div>
                        <div style={{ fontSize:8,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}

            {availableVehicles.length > 0 && (
              <>
                <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,margin:"16px 0 8px" }}>Add From Your Vehicles</div>
                {availableVehicles.map(v=>(
                  <Card key={v.id} T={T} style={{ padding:14, marginBottom:8, display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{v.nickname}</div>
                      <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{v.manufacturer} {v.model}</div>
                    </div>
                    <button onClick={()=>toggleVehicleInFleet(v)} className="tap"
                      style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:8,padding:"7px 14px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                      Add to Fleet
                    </button>
                  </Card>
                ))}
              </>
            )}
            {myVehicles.length === 0 && (
              <Card T={T} style={{ padding:16, textAlign:"center" }}>
                <div style={{ fontSize:12,color:T.muted,marginBottom:10 }}>No vehicles registered on your account yet.</div>
                <button onClick={()=>go("myvehicles")} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"10px 20px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                  Add a Vehicle
                </button>
              </Card>
            )}

            {/* Recent transactions */}
            {txns.length > 0 && (
              <>
                <div style={{ fontWeight:800,fontSize:14,color:T.text,margin:"20px 0 10px" }}>Recent Wallet Activity</div>
                {txns.map(t=>(
                  <Card key={t.id} T={T} style={{ padding:14, marginBottom:8, display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12,color:T.text,fontWeight:600 }}>{t.description || t.type}</div>
                      <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{new Date(t.created_at).toLocaleDateString("en-GH",{day:"numeric",month:"short"})}</div>
                    </div>
                    <div style={{ fontWeight:800,fontSize:13,color: t.type==="TopUp" ? T.green : T.red }}>
                      {t.type==="TopUp" ? "+" : "-"}{fmtGHS(t.amount_pesewas)}
                    </div>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
