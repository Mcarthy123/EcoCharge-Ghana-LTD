// ============================================================
// EcoCharge Ghana — Fleet Dashboard (Phase 6 extension)
//
// This screen used to live as a "Fleet" tab inside the AI Route
// Planner's Driver Assistant Hub. It's been pulled out into its
// own standalone, paywalled page behind the "fleet" subscription
// tier — matching the marketing plan structure.
//
// HONESTY NOTES (carried over from the original Fleet tab):
// - Data is aggregated from real charging_sessions where they can
//   be matched to a vehicle. charging_sessions has no vehicle_id
//   column today for most rows, so most figures fall back to
//   capacity-based ESTIMATES, clearly labeled as such per vehicle.
// - This is single-user "my vehicles" fleet visibility, not a
//   true multi-driver fleet management system (driver accounts,
//   assignment, etc. aren't built yet).
// ============================================================
import { useState, useEffect } from "react";

const Card = ({ T, children, style }) => (
  <div className="fade" style={{
    background:T.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${T.surfaceBorder}`, borderRadius:20,
    boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
    ...style,
  }}>{children}</div>
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

const VehicleService = {
  async loadUserVehicles(userId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!SUPABASE_URL || !userId) return [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_vehicles?user_id=eq.${userId}&order=created_at.asc`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch(e) { return []; }
  },
  batteryCapacity(vehicle) { return vehicle?.battery_capacity || 50; },
};

const FleetService = {
  async loadFleetSnapshot(vehicles, userId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!vehicles?.length) return [];
    let sessionsByVehicleId = {};
    let hasVehicleIdColumn = false;
    if (SUPABASE_URL && userId) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${userId}&status=eq.Completed&select=vehicle_id,energy_kwh,cost_total&order=created_at.desc&limit=200`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(s => {
            if (s.vehicle_id) {
              hasVehicleIdColumn = true;
              if (!sessionsByVehicleId[s.vehicle_id]) sessionsByVehicleId[s.vehicle_id] = { kwh:0, cost:0, count:0 };
              sessionsByVehicleId[s.vehicle_id].kwh += s.energy_kwh || 0;
              sessionsByVehicleId[s.vehicle_id].cost += s.cost_total || 0;
              sessionsByVehicleId[s.vehicle_id].count += 1;
            }
          });
        }
      } catch(e) {}
    }
    return vehicles.map(v => ({
      vehicle: v,
      capacityKWh: VehicleService.batteryCapacity(v),
      dataSource: hasVehicleIdColumn && sessionsByVehicleId[v.id] ? "linked_sessions" : "estimate_only",
      totalKwh: sessionsByVehicleId[v.id]?.kwh || 0,
      totalCostPesewas: sessionsByVehicleId[v.id]?.cost || 0,
      sessionCount: sessionsByVehicleId[v.id]?.count || 0,
    }));
  },
};

export default function FleetDashboard({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [subLoading, setSubLoading] = useState(true);
  const [hasFleetSub, setHasFleetSub] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [fleetSnapshot, setFleetSnapshot] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) { setSubLoading(false); return; }
    (async()=>{
      setSubLoading(true);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&status=eq.active&tier=eq.fleet&order=created_at.desc&limit=1`,
          { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }});
        const data = await res.json();
        setHasFleetSub(Array.isArray(data) && data.length > 0);
      } catch(e) { setHasFleetSub(false); }
      setSubLoading(false);
    })();
  }, [user?.id]);

  useEffect(()=>{
    if (!user?.id || !hasFleetSub) { setLoadingFleet(false); return; }
    (async()=>{
      setLoadingFleet(true);
      const v = await VehicleService.loadUserVehicles(user.id, SUPABASE_URL, SUPABASE_ANON, getToken);
      setVehicles(v);
      const snap = await FleetService.loadFleetSnapshot(v, user.id, SUPABASE_URL, SUPABASE_ANON, getToken);
      setFleetSnapshot(snap);
      setLoadingFleet(false);
    })();
  }, [user?.id, hasFleetSub]);

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
        <Header T={T} title="Fleet Dashboard" sub="Manage your vehicles" onBack={()=>go("home")}/>
        <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
            <i className="fas fa-layer-group" style={{ fontSize:28,color:T.green }}/>
          </div>
          <div style={{ fontWeight:800,fontSize:18,color:T.text,marginBottom:10 }}>Fleet Dashboard is a Business Feature</div>
          <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:28,maxWidth:320 }}>
            Manage all your vehicles from one intelligent dashboard — real-time tracking, reports, and cost monitoring across your fleet.
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
      <Header T={T} title="Fleet Dashboard" sub={`${vehicles.length} vehicle${vehicles.length!==1?"s":""}`} onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        {loadingFleet && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Loading fleet data…</div>}

        {!loadingFleet && vehicles.length === 0 && (
          <Card T={T} style={{ padding:24,textAlign:"center" }}>
            <i className="fas fa-car" style={{ fontSize:32,color:T.muted,marginBottom:12,display:"block" }}/>
            <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:6 }}>No vehicles yet</div>
            <div style={{ fontSize:12,color:T.muted,marginBottom:16 }}>Add vehicles to start tracking fleet-wide charging.</div>
            <button onClick={()=>go("myvehicles")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Add a Vehicle
            </button>
          </Card>
        )}

        {!loadingFleet && vehicles.length > 0 && (
          <>
            <div style={{ fontSize:12,color:T.muted,marginBottom:14,lineHeight:1.7 }}>
              Aggregated across your {vehicles.length} registered vehicles.
              {fleetSnapshot.some(f=>f.dataSource==="estimate_only") && " Some figures are capacity-based estimates until charging sessions are linked to individual vehicles."}
            </div>
            {fleetSnapshot.map(f=>(
              <Card key={f.vehicle.id} T={T} style={{ padding:16, marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{f.vehicle.nickname}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{f.vehicle.manufacturer} {f.vehicle.model}</div>
                  </div>
                  <div style={{ fontSize:9,fontWeight:700,color:T.muted,background:T.surfaceFaint,borderRadius:6,padding:"3px 8px" }}>
                    {f.dataSource==="linked_sessions" ? "Live data" : "Estimate"}
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                  {[
                    { label:"Capacity", value:`${f.capacityKWh} kWh` },
                    { label:"Sessions", value: f.sessionCount },
                    { label:"Total Cost", value:`GH₵${(f.totalCostPesewas/100).toFixed(0)}` },
                  ].map(r=>(
                    <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px",textAlign:"center" }}>
                      <div style={{ fontWeight:700,fontSize:12,color:T.text }}>{r.value}</div>
                      <div style={{ fontSize:8,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
