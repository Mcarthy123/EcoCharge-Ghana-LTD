// ============================================================
// EcoCharge Ghana — Compatible Chargers Screen (Phase 6)
//
// HONESTY NOTES:
// - This is a real filtered read: it pulls your primary vehicle's
//   connector_type from user_vehicles, pulls all chargers from the
//   chargers table, and matches on connector type (case-insensitive).
// - Station name/city are joined client-side against the `stations`
//   prop passed in from App.jsx (the same STATIONS data your Detail
//   screen uses), since chargers only store station_id.
// - If a charger has no connector_type set, it's shown in an
//   "Unspecified" group rather than silently hidden or guessed.
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

const sbGet = async (SUPABASE_URL, SUPABASE_ANON, getToken, path) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` } });
    return await res.json();
  } catch(e) { return null; }
};

export default function CompatibleChargers({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON, stations }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) { setLoading(false); return; }
    (async()=>{
      setLoading(true);
      const [vData, cData] = await Promise.all([
        sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `user_vehicles?user_id=eq.${user.id}&order=is_default.desc,created_at.asc`),
        sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `chargers?select=*`),
      ]);
      const vList = Array.isArray(vData) ? vData : [];
      setVehicles(vList);
      setSelectedVehicleId(vList[0]?.id || null);
      setChargers(Array.isArray(cData) ? cData : []);
      setLoading(false);
    })();
  }, [user?.id]);

  const selectedVehicle = vehicles.find(v=>v.id===selectedVehicleId) || null;
  const myConnector = selectedVehicle?.connector_type?.trim().toLowerCase() || null;

  const stationById = (id) => (stations||[]).find(s=>String(s.id)===String(id));

  const matched = myConnector ? chargers.filter(c => c.connector_type?.trim().toLowerCase() === myConnector) : [];
  const otherChargers = myConnector ? chargers.filter(c => c.connector_type?.trim().toLowerCase() !== myConnector && c.connector_type) : chargers.filter(c=>c.connector_type);
  const unspecified = chargers.filter(c => !c.connector_type);

  const chargerStatusColor = (c) => {
    if (c.status === "Charging") return T.blue;
    if (c.status === "Available") return T.green;
    return T.muted;
  };

  const renderChargerCard = (c, isMatch) => {
    const station = stationById(c.station_id);
    return (
      <Card key={c.id} T={T} style={{ padding:16, marginBottom:10, border: isMatch ? `1px solid ${T.green}66` : undefined }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{station?.name || "Unknown station"}</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{station?.city || ""} · Charger {c.id}</div>
          </div>
          {isMatch && <Badge label="Compatible" color={T.green}/>}
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {c.connector_type && <Badge label={c.connector_type} color={T.blue}/>}
          {(c.power_kw||c.max_power_kw) && <Badge label={`${c.power_kw||c.max_power_kw} kW`} color={T.yellow}/>}
          <Badge label={c.status || "Unknown"} color={chargerStatusColor(c)}/>
        </div>
        {station && (
          <button onClick={()=>go("detail")} className="tap"
            style={{ marginTop:12,width:"100%",background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
            View Station
          </button>
        )}
      </Card>
    );
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Compatible Chargers" sub="Matched to your vehicle's connector" onBack={()=>go("homeplus")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        {loading && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Loading…</div>}

        {!loading && vehicles.length===0 && (
          <Card T={T} style={{ padding:24,textAlign:"center",marginBottom:16 }}>
            <i className="fas fa-car" style={{ fontSize:32,color:T.muted,marginBottom:12,display:"block" }}/>
            <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:6 }}>No vehicle on file</div>
            <div style={{ fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:16 }}>Add a vehicle so we can match it against real charger connector types.</div>
            <button onClick={()=>go("myvehicles")} className="tap"
              style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Add a Vehicle
            </button>
          </Card>
        )}

        {!loading && vehicles.length > 0 && (
          <>
            {vehicles.length > 1 && (
              <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14 }}>
                {vehicles.map(v=>(
                  <button key={v.id} onClick={()=>setSelectedVehicleId(v.id)} className="tap"
                    style={{ flexShrink:0,background:selectedVehicleId===v.id?T.green:T.surface,border:`1px solid ${selectedVehicleId===v.id?T.green:T.surfaceBorder}`,borderRadius:20,padding:"8px 16px",fontSize:12,fontWeight:700,color:selectedVehicleId===v.id?"#000":T.mutedLight,cursor:"pointer",fontFamily:"inherit" }}>
                    {v.nickname}
                  </button>
                ))}
              </div>
            )}

            <Card T={T} style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>Checking compatibility for</div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800,fontSize:15,color:T.text }}>{selectedVehicle?.nickname}</div>
                  <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{selectedVehicle?.manufacturer} {selectedVehicle?.model}</div>
                </div>
                {myConnector ? <Badge label={selectedVehicle.connector_type} color={T.blue}/> : <Badge label="No connector set" color={T.yellow}/>}
              </div>
              {!myConnector && (
                <div style={{ fontSize:11,color:T.yellow,marginTop:10,lineHeight:1.6 }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight:6 }}/>
                  This vehicle has no connector type set — add one in My Vehicles to see real matches.
                </div>
              )}
            </Card>

            {myConnector && (
              <>
                <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>
                  <i className="fas fa-check-circle" style={{ marginRight:8,color:T.green }}/>
                  {matched.length} Compatible Charger{matched.length!==1?"s":""}
                </div>
                {matched.length===0 && (
                  <Card T={T} style={{ padding:18,textAlign:"center",marginBottom:16 }}>
                    <div style={{ fontSize:12,color:T.muted }}>No chargers matching {selectedVehicle.connector_type} found right now.</div>
                  </Card>
                )}
                {matched.map(c=>renderChargerCard(c, true))}
              </>
            )}

            {otherChargers.length > 0 && (
              <>
                <div style={{ fontWeight:800,fontSize:14,color:T.text,margin:"20px 0 10px" }}>
                  <i className="fas fa-plug" style={{ marginRight:8,color:T.muted }}/>Other Connector Types
                </div>
                {otherChargers.map(c=>renderChargerCard(c, false))}
              </>
            )}

            {unspecified.length > 0 && (
              <>
                <div style={{ fontWeight:800,fontSize:14,color:T.text,margin:"20px 0 10px" }}>
                  <i className="fas fa-question-circle" style={{ marginRight:8,color:T.muted }}/>Unspecified Connector
                </div>
                {unspecified.map(c=>renderChargerCard(c, false))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
