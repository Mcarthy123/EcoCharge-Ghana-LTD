                <div style={{ background:"rgba(74,222,128,0.12)",border:`1px solid rgba(74,222,128,0.25)`,borderRadius:10,padding:"5px 10px",textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:14,color:T.green,lineHeight:1 }}>{s.open}/{s.bays}</div>
                  <div style={{ fontSize:9,color:T.green,marginTop:2 }}>Bays avail.</div>
                </div>
                <button onClick={e=>{ e.stopPropagation();setStation(s);go("detail"); }} className="tap"
                  style={{ width:32,height:32,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-external-link-alt" style={{ fontSize:12,color:"#000" }}/>
                </button>
              </div>
            </div>
          );
        })}
        {search&&filtered.length===0&&(
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13 }}>
            <i className="fas fa-search" style={{ fontSize:24,marginBottom:10,display:"block" }}/>No stations found for "{search}"
          </div>
        )}
      </div>
      <div style={{ margin:"0 14px 110px",background:"linear-gradient(135deg,#061520,#09202e)",borderRadius:18,overflow:"hidden",border:`1px solid rgba(56,189,248,0.2)`,display:"flex",alignItems:"center",cursor:"pointer",position:"relative",minHeight:80 }} onClick={()=>go("detail")}>
        <div style={{ position:"absolute",left:0,top:0,bottom:0,width:80,overflow:"hidden" }}>
          <img src="/station3.jpg" alt="water" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.5) hue-rotate(180deg) saturate(1.5)" }} onError={e=>{ e.target.style.display="none"; }}/>
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,transparent,rgba(6,21,32,0.9))" }}/>
        </div>
        <div style={{ flex:1,padding:"16px 16px 16px 90px" }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.blue,marginBottom:4 }}>Every charge includes <span style={{ color:T.blue }}>20L Clean Water</span></div>
          <div style={{ fontSize:12,color:T.muted }}>Clean energy for your ride. Clean water for life.</div>
        </div>
        <i className="fas fa-chevron-right" style={{ color:T.muted,fontSize:14,marginRight:16 }}/>
      </div>
      <NewNav active="Home" go={go}/>
    </div>
  );
}

function Detail({ go,station,stations,setStation }) {
  const s=station||stations[0];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title={s.name} sub={`${s.city} · Solar & Hydrogen`} onBack={()=>go("home")}/>
      <div style={{ margin:"0",overflow:"hidden",height:200,position:"relative",flexShrink:0 }}>
        <img src="/station2.jpg" alt="station" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.55) saturate(1.3)" }} onError={e=>{ e.target.style.display="none"; }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)" }}/>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:32 }}>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-sun" style={{ fontSize:36,color:T.yellow }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8 }}>{s.solar}% Solar</div>
          </div>
          <div style={{ width:1,height:60,background:"rgba(255,255,255,0.25)" }}/>
          <div style={{ textAlign:"center" }}>
            <i className="fas fa-atom" style={{ fontSize:36,color:T.blue }}/>
            <div style={{ fontSize:13,color:"#fff",fontWeight:800,marginTop:8 }}>{s.hydrogen}% H₂</div>
          </div>
        </div>
        <div style={{ position:"absolute",bottom:12,left:16,display:"flex",gap:8 }}>
          <Badge label={`${s.open}/${s.bays} Open`} color={T.green}/>
          <Badge label={`Wait: ${s.time}`} color={T.yellow}/>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 0" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          {[{ label:"Bays Open",value:`${s.open}/${s.bays}`,color:T.green,icon:"fa-plug" },{ label:"Est. Wait",value:s.time,color:T.yellow,icon:"fa-clock" },{ label:"Solar",value:`${s.solar}%`,color:T.blue,icon:"fa-sun" }].map(x=>(
            <div key={x.label} style={{ background:T.card,borderRadius:12,padding:"12px 8px",border:`1px solid ${T.border}`,textAlign:"center" }}>
              <i className={`fas ${x.icon}`} style={{ fontSize:14,color:x.color,marginBottom:6,display:"block" }}/>
              <div style={{ fontSize:9,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5 }}>{x.label}</div>
              <div style={{ fontWeight:800,fontSize:17,color:x.color }}>{x.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:T.card,borderRadius:14,padding:"13px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
            <span style={{ fontSize:13,fontWeight:600,color:T.text }}>Energy Mix</span>
            <span style={{ fontSize:11,color:T.muted }}>{s.solar}% Solar · {s.hydrogen}% H₂</span>
          </div>
          <div style={{ height:7,borderRadius:4,background:T.border,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${s.solar}%`,background:`linear-gradient(90deg,${T.green},${T.blue})` }}/>
          </div>
        </div>
        <button onClick={()=>go("vehicles")} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#000",cursor:"pointer",marginBottom:14,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <i className="fas fa-bolt"/> Charge Here — Select Vehicle
        </button>
        <div style={{ fontSize:11,color:T.muted,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8 }}>All Stations</div>
        {stations.map(st=>(
          <div key={st.id} className="row" onClick={()=>setStation(st)}
            style={{ background:st.id===s.id?"#152410":T.card,border:`1px solid ${st.id===s.id?T.greenDim:T.border}`,borderRadius:13,padding:"13px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,color:T.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{st.name}</div>
              <div style={{ color:T.muted,fontSize:11,marginTop:2 }}><i className="fas fa-map-marker-alt" style={{ marginRight:4 }}/>{st.city} · {st.bays} bays</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.green,fontWeight:700,fontSize:13 }}>{st.time}</div>
                <div style={{ color:T.muted,fontSize:10 }}>{st.open} open</div>
              </div>
              <button className="tap" onClick={e=>{ e.stopPropagation();setStation(st);go("booking"); }}
                style={{ background:T.green,border:"none",borderRadius:9,padding:"7px 13px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>Select</button>
            </div>
          </div>
        ))}
        <div style={{ height:18 }}/>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function Vehicles({ go,setVehicle }) {
  const [sel,setSel] = useState(null);
  const vehicleImages={ Car:"/car-charging.jpg",Scooter:"/scooter-charging.jpg",Tricycle:"/tricycle-charging.jpg" };
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Select Vehicle" sub="Choose your vehicle type" onBack={()=>go("detail")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 0" }}>
        {VEHICLES.map((v,i)=>(
          <div key={v.type} className={`tap fade${i}`} onClick={()=>setSel(v)}
            style={{ borderRadius:18,marginBottom:14,overflow:"hidden",border:`2px solid ${sel?.type===v.type?T.green:T.border}`,transition:"border-color .2s" }}>
            <div style={{ height:180,position:"relative",overflow:"hidden" }}>
              <img src={vehicleImages[v.type]} alt={v.type} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.8)" }} onError={e=>{ e.target.style.display="none"; }}/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 55%)" }}/>
              <div style={{ position:"absolute",bottom:10,left:14 }}>
                <div style={{ fontWeight:800,fontSize:18,color:T.text }}>{v.type}</div>
                <div style={{ fontSize:11,color:T.mutedLight,marginTop:2 }}>{v.desc}</div>
              </div>
              {sel?.type===v.type&&(
                <div style={{ position:"absolute",top:12,right:12,width:28,height:28,borderRadius:"50%",background:T.green,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <i className="fas fa-check" style={{ fontSize:14,color:"#000" }}/>
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px",background:T.card,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:800,fontSize:19,color:T.green }}>{v.price}</div>
              <Badge label="+ 20L Clean Water" color={T.blue}/>
            </div>
          </div>
        ))}
        <div style={{ background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:16 }}>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Included with every charge</div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}><i className="fas fa-bolt" style={{ color:T.green,fontSize:14 }}/><span style={{ fontSize:13,color:T.text }}>Full vehicle charge — solar powered</span></div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}><i className="fas fa-tint" style={{ color:T.blue,fontSize:14 }}/><span style={{ fontSize:13,color:T.text }}>20L clean desalinated water</span></div>
        </div>
        <button onClick={()=>{ if(sel){ setVehicle(sel);go("booking"); } }} className="tap"
          style={{ width:"100%",background:sel?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.border,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:sel?"#000":T.muted,cursor:sel?"pointer":"not-allowed",marginBottom:16,fontFamily:"inherit",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {sel?<><i className="fas fa-arrow-right"/> Continue with {sel.type}</>:"Select a vehicle to continue"}
        </button>
      </div>
      <Nav active="Stations" go={go}/>
    </div>
  );
}

function Booking({ go,station,vehicle,user,setBooking }) {
  const s=station||STATIONS[0];
  const slots=(()=>{ const arr=[],t=new Date(); t.setMinutes(Math.ceil(t.getMinutes()/30)*30,0,0); const end=new Date(); end.setHours(22,0,0,0); while(t<=end){ arr.push(new Date(t));t.setMinutes(t.getMinutes()+30); } return arr; })();
  const [slotIdx,setSlotIdx]=useState(0);
  const [durIdx,setDurIdx]=useState(1);
  const [payHow,setPayHow]=useState("now");
  const [name,setName]=useState(user?.name||"");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState(user?.email||"");
  const [loading,setLoad]=useState(false);
  const [error,setErr]=useState("");
  const dur=DURATIONS[durIdx];
  const total=(vehicle?.amount||175)+dur.extra;
  const book=async()=>{
    if (!name.trim()) { setErr("Enter your name");return; }
    if (!phone.trim()||phone.length<10) { setErr("Enter a valid phone number");return; }
    if (!email.trim()||!email.includes("@")) { setErr("Enter a valid email");return; }
    setLoad(true);setErr("");
    const ref=genRef();
    const data={ reference:ref,station:s.name,city:s.city,vehicle:vehicle?.type||"Car",slot_time:slots[slotIdx].toISOString(),duration_min:dur.value,amount:total,name,phone,email,pay_method:payHow,status:payHow==="now"?"pending_payment":"confirmed",created_at:new Date().toISOString() };
    if (SUPABASE_URL) await sb("bookings",{ method:"POST",headers:{ Prefer:"return=minimal" },body:JSON.stringify(data) });
    setBooking(data);
    try { localStorage.setItem("eco_booking",JSON.stringify(data)); } catch(e){}
    if (payHow==="now") {
      window.location.href=`https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(email)}&amount=${total*100}&reference=${ref}`;
    } else { setLoad(false);go("qr"); }
  };
  const inp=(ph,val,set,type="text",icon="fa-user")=>(
    <div style={{ position:"relative",marginBottom:10 }}>
      <i className={`fas ${icon}`} style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
      <input type={type} placeholder={ph} value={val} onChange={e=>{ set(e.target.value);setErr(""); }}
        style={{ width:"100%",background:"#0c0f18",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px 12px 40px",color:T.text,fontSize:14 }}/>
    </div>
  );
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header title="Book a Slot" sub={`${s.name} · ${s.city}`} onBack={()=>go("vehicles")}/>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 120px" }}>
        <div className="fade" style={{ background:"linear-gradient(135deg,#0a1f12,#0d2d1a)",borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.greenDim}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:T.muted,marginBottom:4 }}>Booking for</div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{s.name}</div>
            <div style={{ fontSize:12,color:T.muted,marginTop:2 }}>{vehicle?.type||"Car"} · {s.city}</div>
          </div>
          <i className={`fas ${vehicle?.type==="Scooter"?"fa-motorcycle":vehicle?.type==="Tricycle"?"fa-truck":"fa-car"}`} style={{ fontSize:40,color:T.green,opacity:0.7 }}/>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-clock" style={{ marginRight:8,color:T.green }}/> Select Time</div>
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
            {slots.slice(0,12).map((sl,i)=>(
              <button key={i} onClick={()=>setSlotIdx(i)} className="tap"
                style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,fontFamily:"inherit",background:slotIdx===i?T.green:T.bg,border:`1px solid ${slotIdx===i?T.green:T.border}`,color:slotIdx===i?"#000":T.text,fontSize:13,fontWeight:slotIdx===i?700:500,cursor:"pointer" }}>
                {fmtTime(sl)}
              </button>
            ))}
          </div>
        </div>
        <div className="fade1" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-hourglass-half" style={{ marginRight:8,color:T.green }}/> Duration</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {DURATIONS.map((d,i)=>(
              <button key={i} onClick={()=>setDurIdx(i)} className="tap"
                style={{ padding:"12px",borderRadius:12,fontFamily:"inherit",textAlign:"left",background:durIdx===i?"#0d2010":T.bg,border:`1px solid ${durIdx===i?T.green:T.border}`,cursor:"pointer" }}>
                <div style={{ fontWeight:700,fontSize:15,color:durIdx===i?T.green:T.text }}>{d.label}</div>
                {d.extra>0&&<div style={{ fontSize:11,color:T.muted,marginTop:2 }}>+GH₵{d.extra}</div>}
              </button>
            ))}
          </div>
        </div>
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:10 }}><i className="fas fa-receipt" style={{ marginRight:8,color:T.green }}/> Summary</div>
          <Divider/>
          {[{ label:"Time",value:`${fmtTime(slots[slotIdx])} — ${fmtEndTime(slots[slotIdx],dur.value)}` },{ label:"Duration",value:dur.label },{ label:"Vehicle",value:vehicle?.type||"Car" },{ label:"Water",value:"20L Clean Bundle" }].map(r=>(
            <div key={r.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ color:T.muted,fontSize:13 }}>{r.label}</span>
              <span style={{ color:T.text,fontWeight:600,fontSize:13 }}>{r.value}</span>
            </div>
          ))}
          <Divider/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:T.text,fontSize:14 }}>Total</span>
            <span style={{ fontWeight:800,fontSize:24,color:T.green }}>GH₵{total}</span>
          </div>
        </div>
        <div className="fade2" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-id-card" style={{ marginRight:8,color:T.green }}/> Your Details</div>
          {inp("Full name",name,setName,"text","fa-user")}
          {inp("Phone number",phone,setPhone,"tel","fa-phone")}
          {inp("Email address",email,setEmail,"email","fa-envelope")}
        </div>
        <div className="fade3" style={{ background:T.card,borderRadius:16,padding:"14px 16px",marginBottom:14,border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:12 }}><i className="fas fa-credit-card" style={{ marginRight:8,color:T.green }}/> Payment</div>
          {[{ id:"now",label:"Pay now to confirm",sub:"Instant booking via Paystack",icon:"fa-lock" },{ id:"arrive",label:"Pay on arrival",sub:"Reserve now, pay at station",icon:"fa-store" }].map(m=>(
            <div key={m.id} className="tap row" onClick={()=>setPayHow(m.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 12px",borderRadius:12,marginBottom:8,cursor:"pointer",background:payHow===m.id?"#132010":"transparent",border:`1px solid ${payHow===m.id?T.greenDim:T.border}` }}>
              <i className={`fas ${m.icon}`} style={{ fontSize:16,color:payHow===m.id?T.green:T.muted }}/>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text,fontSize:14,fontWeight:600 }}>{m.label}</div>
                <div style={{ color:T.muted,fontSize:11,marginTop:2 }}>{m.sub}</div>
              </div>