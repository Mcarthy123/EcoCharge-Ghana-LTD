<div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Total Revenue</div>
              <div style={{ fontWeight:900,fontSize:36,color:T.green }}>GH₵{(overview.totalRevenue/100).toFixed(2)}</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>{overview.totalSessions} sessions · {overview.totalEnergy.toFixed(1)} kWh delivered</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10 }}>
              <StatCard label="Active Now"   value={overview.activeSessions} icon="fa-bolt"    color={T.green}/>
              <StatCard label="Today"        value={overview.todaySes}       icon="fa-calendar" color={T.blue}/>
              <StatCard label="Wallets"      value={overview.totalWallets}   icon="fa-wallet"   color={T.yellow}/>
            </div>
            <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Total Wallet Balances</div>
              <div style={{ fontWeight:800,fontSize:22,color:T.yellow }}>GH₵{(overview.totalBalance/100).toFixed(2)}</div>
            </div>
          </div>
        )}
        {tab==="chargers"&&(
          <div>
            {chargers.length===0&&<div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}><i className="fas fa-charging-station" style={{ fontSize:40,display:"block",marginBottom:12,opacity:0.3 }}/>No chargers found</div>}
            {chargers.map(c=>(
              <div key={c.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"14px",marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{c.id}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{c.status||"Unknown"}</div>
                  </div>
                  <div style={{ fontSize:10,color:c.connected?T.green:T.muted }}><i className="fas fa-circle" style={{ marginRight:4 }}/>{c.connected?"Online":"Offline"}</div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
                  {[
                    { label:"Reset",  action:"reset",   body:{type:"Soft"}, color:T.yellow },
                    { label:"Unlock", action:"unlock",  body:{connectorId:1}, color:T.blue },
                    { label:"Disable",action:"change-availability",body:{connectorId:0,type:"Inoperative"},color:T.muted },
                  ].map(cmd=>(
                    <button key={cmd.action} onClick={()=>sendOcpp(c.id,cmd.action,cmd.body)} className="tap"
                      style={{ background:`${cmd.color}10`,border:`1px solid ${cmd.color}25`,borderRadius:8,padding:"8px",fontSize:10,fontWeight:700,color:cmd.color,cursor:"pointer",fontFamily:"inherit" }}>
                      {cmd.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="sessions"&&(
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{sessions.length} Sessions</div>
              <button onClick={()=>load("charging_sessions",setSessions,"?select=*&order=created_at.desc&limit=100")} className="tap"
                style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",fontSize:11,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                <i className="fas fa-sync"/> Refresh
              </button>
            </div>
            {sessions.map(s=>{
              const sc=s.status==="Charging"?T.blue:s.status==="Completed"?T.green:s.status==="Faulted"?T.red:T.muted;
              return (
                <div key={s.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px",marginBottom:8 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:12,color:T.text,fontFamily:"monospace" }}>{s.session_ref||s.id?.slice(0,16)}</div>
                      <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{s.charger_id||"--"} · {s.vehicle_type||"--"}</div>
                    </div>
                    <div style={{ background:`${sc}15`,borderRadius:8,padding:"3px 10px" }}>
                      <span style={{ fontSize:10,fontWeight:700,color:sc }}>{s.status}</span>
                    </div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6 }}>
                    {[
                      { label:"kWh",  value:s.energy_kwh!=null?s.energy_kwh.toFixed(3):"--" },
                      { label:"Min",  value:s.duration_min!=null?s.duration_min.toFixed(0):"--" },
                      { label:"Cost", value:s.cost_total?`₵${(s.cost_total/100).toFixed(0)}`:"--" },
                      { label:"Pay",  value:s.payment_status||"--" },
                    ].map(r=>(
                      <div key={r.label} style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px",textAlign:"center" }}>
                        <div style={{ fontWeight:700,fontSize:11,color:T.text }}>{r.value}</div>
                        <div style={{ fontSize:9,color:T.muted }}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="wallets"&&(
          <div>
            {wallets.map(w=>(
              <div key={w.id} style={{ background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px",marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{w.display_name||w.email||"Anonymous"}</div>
                    <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{w.email||"No email"}</div>
                  </div>
                  <div style={{ fontWeight:800,fontSize:16,color:T.green }}>GH₵{((w.balance_pesewas||0)/100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="revenue"&&(
          <div>
            <div style={{ background:"linear-gradient(135deg,#071a09,#0a2510)",borderRadius:16,padding:"18px",marginBottom:14,border:"1px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Total Revenue</div>
              <div style={{ fontWeight:900,fontSize:36,color:T.green }}>GH₵{(revenue.filter(s=>s.status==="Completed").reduce((a,s)=>a+(s.cost_total||0),0)/100).toFixed(2)}</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>{revenue.filter(s=>s.status==="Completed").length} completed sessions</div>
            </div>
          </div>
        )}
        {tab==="faults"&&(
          <div>
            {faults.length===0&&(
              <div style={{ textAlign:"center",padding:"40px 0" }}>
                <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(74,222,128,0.1)",border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                  <i className="fas fa-check" style={{ fontSize:26,color:T.green }}/>
                </div>
                <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:6 }}>All Systems Normal</div>
                <div style={{ fontSize:12,color:T.muted }}>No active faults detected</div>
              </div>
            )}
            {faults.map(f=>(
              <div key={f.id} style={{ background:"rgba(248,113,113,0.06)",borderRadius:14,border:"1px solid rgba(248,113,113,0.2)",padding:"14px",marginBottom:10 }}>
                <div style={{ fontWeight:700,fontSize:13,color:T.text,marginBottom:4 }}>{f.id}</div>
                {f.error_code&&<div style={{ fontSize:12,color:T.red,marginBottom:8 }}><i className="fas fa-exclamation-circle" style={{ marginRight:6 }}/>{f.error_code}</div>}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <button onClick={()=>sendOcpp(f.id,"reset",{type:"Hard"})} className="tap"
                    style={{ background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.yellow,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                    <i className="fas fa-redo"/> Hard Reset
                  </button>
                  <button onClick={async()=>{ await fetch(`${SUPABASE_URL}/rest/v1/chargers?id=eq.${f.id}`,{ method:"PATCH",headers:{ apikey:SUPABASE_ANON,Authorization:`Bearer ${SUPABASE_ANON}`,"Content-Type":"application/json",Prefer:"return=minimal" },body:JSON.stringify({ has_fault:false,status:"Available",error_code:null }) }); load("chargers",setFaults,"?select=*&has_fault=eq.true"); }} className="tap"
                    style={{ background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                    <i className="fas fa-check"/> Clear Fault
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}

// ── CHARGER ADMIN ─────────────────────────────────────────────
function ChargerAdmin({ go }) {
  const [chargers,setChargers]=useState([]);
  const [sessions,setSessions]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(false);
  const [cmdLoading,setCmdLoading]=useState("");
  const [cmdResult,setCmdResult]=useState(null);
  const [tab,setTab]=useState("chargers");

  const loadChargers=async()=>{ setLoading(true); const data=await ocppApi("/api/chargers"); if(data?.chargers) setChargers(data.chargers); setLoading(false); };
  const loadSessions=async()=>{ const data=await ocppApi("/api/sessions"); if(data?.sessions) setSessions(data.sessions); };

  useEffect(()=>{ loadChargers(); loadSessions(); const t=setInterval(()=>loadChargers(),10000); return()=>clearInterval(t); },[]);

  const sendCmd=async(chargerId,action,body={})=>{
    setCmdLoading(action); setCmdResult(null);
    const pathMap={ "RemoteStart":`/api/chargers/${chargerId}/remote-start`,"RemoteStop":`/api/chargers/${chargerId}/remote-stop`,"Reset":`/api/chargers/${chargerId}/reset`,"Unlock":`/api/chargers/${chargerId}/unlock`,"ChangeAvailability":`/api/chargers/${chargerId}/change-availability`,"ClearCache":`/api/chargers/${chargerId}/clear-cache` };
    const result=await ocppApi(pathMap[action],"POST",body);
    setCmdResult(result); setCmdLoading("");
    if (result?.success) loadChargers();
  };

  const statusColor=(s)=>{ if(s==="Available") return T.green; if(s==="Charging") return T.blue; if(s==="Faulted") return T.red; if(s==="Unavailable") return T.muted; return T.yellow; };
  const statusIcon=(s)=>{ if(s==="Available") return "fa-check-circle"; if(s==="Charging") return "fa-bolt"; if(s==="Faulted") return "fa-exclamation-triangle"; if(s==="Unavailable") return "fa-times-circle"; return "fa-circle"; };

  if (!OCPP_URL) return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charger Admin" sub="OCPP Management" onBack={()=>go("home")}/>
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ textAlign:"center" }}>
          <i className="fas fa-server" style={{ fontSize:56,color:T.muted,marginBottom:16,display:"block" }}/>
          <div style={{ fontWeight:700,fontSize:16,color:T.text,marginBottom:8 }}>OCPP Server Not Configured</div>
          <div style={{ color:T.muted,fontSize:13 }}>Add VITE_OCPP_SERVER_URL to your environment variables.</div>
        </div>
      </div>
      <Nav active="More" go={go}/>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Charger Admin" sub="OCPP 1.6J Management" onBack={()=>go("home")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 100px" }}>
        <div style={{ display:"flex",background:T.card,borderRadius:12,padding:4,marginBottom:16,border:`1px solid ${T.border}` }}>
          {[{ id:"chargers",label:"Chargers",icon:"fa-charging-station" },{ id:"sessions",label:"Sessions",icon:"fa-list" }].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className="tap"
              style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:"none",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <i className={`fas ${t.icon}`}/> {t.label}
            </button>
          ))}
        </div>
        {tab==="chargers"&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{chargers.length} Charger{chargers.length!==1?"s":""}</div>
              <button onClick={loadChargers} className="tap" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:T.green,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
                <i className={`fas fa-sync${loading?" fa-spin":""}`}/> Refresh
              </button>
            </div>
            {chargers.map(c=>(
              <div key={c.id} style={{ background:T.card,borderRadius:16,border:`1px solid ${selected?.id===c.id?T.green:T.border}`,marginBottom:12,overflow:"hidden" }}>
                <div className="tap" onClick={()=>setSelected(selected?.id===c.id?null:c)} style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:`${statusColor(c.status)}18`,border:`1px solid ${statusColor(c.status)}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className={`fas ${statusIcon(c.status)}`} style={{ fontSize:18,color:statusColor(c.status) }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{c.id}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{c.info?.chargePointModel||"Unknown model"}</div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                    <div style={{ background:`${statusColor(c.status)}18`,borderRadius:8,padding:"3px 10px" }}>
                      <span style={{ fontSize:11,fontWeight:700,color:statusColor(c.status) }}>{c.status||"Unknown"}</span>
                    </div>
                    <div style={{ fontSize:10,color:c.connected?T.green:T.muted }}>
                      <div style={{ width:6,height:6,borderRadius:"50%",background:c.connected?T.green:T.muted,display:"inline-block",marginRight:4 }}/>
                      {c.connected?"Online":"Offline"}
                    </div>
                  </div>
                </div>
                {selected?.id===c.id&&(
                  <div style={{ borderTop:`1px solid ${T.border}`,padding:"14px 16px" }}>
                    {cmdResult&&(
                      <div style={{ background:cmdResult.success?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)",border:`1px solid ${cmdResult.success?T.greenDim:"rgba(248,113,113,0.2)"}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:cmdResult.success?T.green:T.red }}>
                        {cmdResult.success?"Command accepted ✓":"Failed: "+(cmdResult.error||"Unknown error")}
                      </div>
                    )}
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      {[
                        { action:"RemoteStart",label:"Start Charge",icon:"fa-play",    color:T.green,  body:{ idTag:`APP-${Date.now()}`,connectorId:1 } },
                        { action:"RemoteStop", label:"Stop Charge", icon:"fa-stop",    color:T.red,    body:{ transactionId:0 } },
                        { action:"Reset",      label:"Soft Reset",  icon:"fa-redo",    color:T.yellow, body:{ type:"Soft" } },
                        { action:"Unlock",     label:"Unlock Cable",icon:"fa-unlock",  color:T.blue,   body:{ connectorId:1 } },
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
              </div>
            )}
          </>
        )}
        {tab==="sessions"&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{sessions.length} Session{sessions.length!==1?"s":""}</div>
              <button onClick={loadSessions} className="tap" style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:T.green,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                <i className="fas fa-sync"/> Refresh
              </button>
            </div>
            {sessions.length===0&&(<div style={{ textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13 }}>No sessions yet</div>)}
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
              </div>
            ))}
          </>
        )}
      </div>
      <Nav active="More" go={go}/>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]    = useState(()=>{ try { return localStorage.getItem("eco_user")?"home":"splash"; } catch(e){ return "splash"; } });
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
      try { const saved=localStorage.getItem("eco_booking"); if(saved){ const parsed=JSON.parse(saved); const updated={...parsed,status:"confirmed",pay_method:"now"}; setBooking(updated); localStorage.setItem("eco_booking",JSON.stringify(updated)); } } catch(e){}
      if (SUPABASE_URL) {
        sb(`bookings?reference=eq.${ref}&select=*`).then(data=>{ if(data&&data.length>0){ const b=data[0]; sb(`bookings?id=eq.${b.id}`,{ method:"PATCH",headers:{ Prefer:"return=minimal" },body:JSON.stringify({ status:"confirmed",payment_confirmed:true }) }); const updated={...b,status:"confirmed",pay_method:"now"}; setBooking(updated); try { localStorage.setItem("eco_booking",JSON.stringify(updated)); } catch(e){} } });
      }
      const topupPending=(()=>{ try { return JSON.parse(localStorage.getItem('eco_topup')||'null'); } catch(e){ return null; } })();
      if (topupPending&&ref.startsWith('WALLET-')) {
        try { localStorage.removeItem('eco_topup'); } catch(e){}
        const verifyWalletPayment=async()=>{
          try {
            if (OCPP_URL) {
              const vRes=await fetch(OCPP_URL+'/api/payment/verify',{ method:'POST',headers:{ 'x-api-key':OCPP_KEY,'Content-Type':'application/json' },body:JSON.stringify({ reference:ref }) });
              const vData=await vRes.json();
              if (vData.success) { setScreen('wallet'); return; }
            }
            if (SUPABASE_URL&&topupPending.userId) {
              await fetch(SUPABASE_URL+'/rest/v1/rpc/wallet_credit',{ method:'POST',headers:{ apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON,'Content-Type':'application/json' },body:JSON.stringify({ p_user_id:topupPending.userId,p_amount:topupPending.amount,p_type:'TopUp',p_description:'Wallet top-up via Paystack',p_payment_ref:ref }) });
              await fetch(SUPABASE_URL+'/rest/v1/topup_requests?payment_ref=eq.'+ref,{ method:'PATCH',headers:{ apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON,'Content-Type':'application/json',Prefer:'return=minimal' },body:JSON.stringify({ status:'Completed',completed_at:new Date().toISOString() }) });
            }
            // ── NOTIFICATION: Top-up successful ──
            const u=(()=>{ try { return JSON.parse(localStorage.getItem('eco_user')||'null'); } catch(e){ return null; } })();
            createNotification(topupPending.userId,"topup_successful","Wallet Topped Up 💚",`GH₵${(topupPending.amount/100).toFixed(2)} has been added to your EcoCharge wallet.`,{ amount:topupPending.amount,reference:ref });
          } catch(e) {}
          setScreen('wallet');
        };
        setTimeout(verifyWalletPayment,150);
      } else {
        if (OCPP_URL) { fetch(OCPP_URL+'/api/payment/verify',{ method:'POST',headers:{ 'x-api-key':OCPP_KEY,'Content-Type':'application/json' },body:JSON.stringify({ reference:ref }) }).catch(e=>{}); }
        setTimeout(()=>setScreen('qr'),150);
      }
    }
  },[]);

  const props={ go:goSecure,stations,station:station||stations[0],setStation,user,setUser,vehicle,setVehicle,booking,setBooking,onMenu:()=>setDrawer(true) };

  if (screen==="splash") return <><style>{CSS}</style><Splash onLogin={()=>{ setAuthMode("login");go("auth"); }} onRegister={()=>{ setAuthMode("register");go("auth"); }} onGuest={()=>go("home")}/></>;
  if (screen==="auth")   return <><style>{CSS}</style><Auth mode={authMode} onBack={(mode)=>{ if(mode){ setAuthMode(mode); } else { go("splash"); } }} onSuccess={(u)=>{ setUser(u);go("home"); }}/></>;

  const views={
    notifications: <NotificationsScreen go={goSecure} user={user}/>,
    chargers:      <ChargerAdmin go={goSecure}/>,
    sessions:      <SessionManager go={goSecure} user={user}/>,
    wallet:        <WalletScreen go={goSecure} user={user}/>,
    pricing:       <PricingAdmin go={goSecure} user={user}/>,
    admin:         <AdminDashboard go={goSecure} user={user}/>,
    home:          <Home {...props}/>,
    map:           <MapScreen {...props}/>,
    detail:        <Detail {...props}/>,
    vehicles:      <Vehicles {...props}/>,
    booking:       <Booking {...props}/>,
    bookings:      <Bookings {...props}/>,
    qr:            <QRScreen {...props}/>,
    verify:        <Verify {...props}/>,
    profile:       <Profile {...props}/>,
    about:         <About {...props}/>,
  };

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
