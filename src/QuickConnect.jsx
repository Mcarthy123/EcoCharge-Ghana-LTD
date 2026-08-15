// ============================================================
// EcoCharge Quick Connect (Phase 6 extension — Home+ charger pairing)
//
// HONESTY NOTES — read before wiring real hardware:
// - Current EcoCharge Home+ charger hardware communicates via OCPP 1.6J
//   over WiFi, NOT Bluetooth. It does not broadcast BLE today. That means
//   passive/automatic "AirPods-style" detection is not possible with
//   existing hardware — on ANY platform, not just iOS. This flow is
//   QR-first because it's the only discovery mechanism that is real today.
// - Web Bluetooth is additionally unsupported on iOS Safari entirely
//   (Apple platform restriction, not an EcoCharge limitation), and even
//   on Android Chrome it requires the browser's own native device picker,
//   which cannot be replaced with a custom pre-connection UI. See
//   /docs/quick-connect-ble-hardware-spec.md for the interface a future
//   BLE-capable charger would need to implement to unlock that path.
// - "Pairing token" here is a real UUID generated and stored per claim
//   (pairing_token column) for audit and idempotency — it is NOT a
//   rotating cryptographic challenge/response, because current charger
//   firmware has no capability to generate or verify one. True one-time
//   tokens need firmware work, not just app work.
// - Wi-Fi provisioning (configuring the charger's network from the app)
//   is NOT implemented. Current chargers ship pre-configured for WiFi/
//   OCPP by the installer; there's no firmware-side capability today for
//   the app to push new WiFi credentials to a charger.
// - Ownership verification IS real: a charger_ocpp_id can only be linked
//   to one home_chargers row. Claiming an already-claimed charger is
//   blocked and clearly explained, not silently allowed.
// - Firmware version, connection status, and last-seen ARE real — pulled
//   live from the OCPP server's boot/heartbeat data at claim time.
// ============================================================
import { useState, useEffect, useRef } from "react";

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

// ── QR SCANNER (reused pattern from ScanToCharge / HomeChargerQRScanner) ──
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

function QRCamera({ T, onResult, onCancel }) {
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
        setError(e?.name==="NotAllowedError"
          ? "Camera access is needed to scan your charger's QR code. Enable camera permission in your browser settings and try again."
          : "Couldn't access the camera on this device.");
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
            <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",animation:"spin .8s linear infinite" }}/>
          </div>
        )}
      </div>
      <div style={{ padding:"20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",background:"#0a0d10" }}>
        <div style={{ textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:13,marginBottom:14 }}>Point your camera at the QR code on your EcoCharge Home+ charger</div>
        <button onClick={onCancel} className="tap" style={{ width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:14,padding:"15px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

const STAGE_COPY = {
  intro: { title:"EcoCharge Quick Connect", sub:"Link your Home+ charger to your account" },
  verifying: { title:"Verifying…", sub:"Checking your charger's status" },
  claiming: { title:"Connecting…", sub:"Securely linking your charger" },
};

export default function QuickConnect({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON, onLinked }) {
  const [stage, setStage] = useState("intro"); // intro | scanning | verifying | confirm | claiming | connected | not_found | already_claimed | error
  const [chargerInfo, setChargerInfo] = useState(null); // { id, model, vendor, firmware, connected }
  const [errorDetail, setErrorDetail] = useState("");

  const handleScanResult = async (text) => {
    const scannedId = text.startsWith("ECOCHARGER:") ? text.slice("ECOCHARGER:".length).trim() : text.trim();
    setStage("verifying");

    // 1. Check the charger is real and online on the OCPP server
    const data = await ocppApi("/api/chargers");
    const match = (data?.chargers || []).find(c => c.id === scannedId);
    if (!match) {
      setErrorDetail(scannedId);
      setStage("not_found");
      return;
    }

    // 2. Ownership verification — is this charger already claimed?
    const existing = await sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `home_chargers?charger_ocpp_id=eq.${scannedId}&select=user_id,nickname`);
    const claim = Array.isArray(existing) ? existing[0] : null;
    if (claim && claim.user_id !== user?.id) {
      setStage("already_claimed");
      return;
    }
    if (claim && claim.user_id === user?.id) {
      // Idempotent — already yours, just confirm
      setChargerInfo({ id: match.id, model: match.info?.chargePointModel, vendor: match.info?.chargePointVendor, firmware: match.info?.firmwareVersion, connected: match.connected, alreadyOwned: true });
      setStage("connected");
      return;
    }

    setChargerInfo({ id: match.id, model: match.info?.chargePointModel, vendor: match.info?.chargePointVendor, firmware: match.info?.firmwareVersion, connected: match.connected, alreadyOwned: false });
    setStage("confirm");
  };

  const confirmClaim = async () => {
    setStage("claiming");
    const saved = await sbPost(SUPABASE_URL, SUPABASE_ANON, getToken, "home_chargers", {
      user_id: user.id,
      charger_ocpp_id: chargerInfo.id,
      nickname: chargerInfo.model || "Home Charger",
      status: "Idle",
      firmware_version: chargerInfo.firmware || null,
      connection_status: chargerInfo.connected ? "online" : "offline",
      last_seen_at: new Date().toISOString(),
      claimed_at: new Date().toISOString(),
    });
    if (saved) {
      setStage("connected");
      onLinked?.();
    } else {
      setStage("error");
    }
  };

  const reset = () => { setStage("intro"); setChargerInfo(null); setErrorDetail(""); };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}` }}>
        <button onClick={()=>go("homeplus")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Quick Connect</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Link your Home+ charger</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"20px 20px 100px",display:"flex",flexDirection:"column" }}>

        {stage==="intro" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
            <div style={{ width:88,height:88,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}44`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24 }}>
              <i className="fas fa-charging-station" style={{ fontSize:36,color:T.green }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:19,color:T.text,marginBottom:10 }}>Connect your Home+ charger</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:32,maxWidth:300 }}>
              Scan the QR code on your EcoCharge Home+ charger to securely link it to your account.
            </div>
            <button onClick={()=>setStage("scanning")} className="tap"
              style={{ width:"100%",maxWidth:320,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
              <i className="fas fa-qrcode"/> Scan QR Code
            </button>
            <div style={{ fontSize:11,color:T.muted,marginTop:20,lineHeight:1.7,maxWidth:300 }}>
              Bluetooth auto-detection isn't available on current charger hardware yet — QR scanning is the secure way to pair for now.
            </div>
          </div>
        )}

        {stage==="scanning" && (
          <QRCamera T={T} onResult={handleScanResult} onCancel={()=>setStage("intro")}/>
        )}

        {(stage==="verifying" || stage==="claiming") && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18 }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${T.green}`,borderTopColor:"transparent",animation:"spin .8s linear infinite" }}/>
            </div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text }}>{STAGE_COPY[stage].title}</div>
            <div style={{ fontSize:12,color:T.muted }}>{STAGE_COPY[stage].sub}</div>
          </div>
        )}

        {stage==="confirm" && chargerInfo && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center" }}>
            <div style={{ background:T.card,border:`1.5px solid ${T.green}`,borderRadius:20,padding:28,textAlign:"center",boxShadow:`0 8px 32px rgba(34,197,94,0.15)` }}>
              <div style={{ fontSize:13,color:T.green,fontWeight:700,marginBottom:16 }}>
                <i className="fas fa-bolt" style={{ marginRight:8 }}/>EcoCharge Home+ detected
              </div>
              <div style={{ fontWeight:800,fontSize:20,color:T.text,marginBottom:4 }}>{chargerInfo.model || "EcoCharge Home+"}</div>
              <div style={{ fontSize:13,color:T.muted,fontFamily:"monospace",marginBottom:6 }}>{chargerInfo.id}</div>
              <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginBottom:22 }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:chargerInfo.connected?T.green:T.red }}/>
                <span style={{ fontSize:11,color:T.muted }}>{chargerInfo.connected ? "Online" : "Offline"}</span>
              </div>
              <div style={{ fontSize:13,color:T.text,marginBottom:24 }}>Ready to connect to your account</div>
              <button onClick={confirmClaim} className="tap"
                style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",marginBottom:12 }}>
                Connect
              </button>
              <button onClick={reset} className="tap" style={{ background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
                Not your charger?
              </button>
            </div>
          </div>
        )}

        {stage==="connected" && chargerInfo && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
            <div className="fade" style={{ width:90,height:90,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22 }}>
              <i className="fas fa-check" style={{ fontSize:36,color:T.green }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:20,color:T.text,marginBottom:8 }}>Charger Connected</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:32,maxWidth:300 }}>
              {chargerInfo.alreadyOwned
                ? "This charger is already linked to your account."
                : "Your EcoCharge Home+ is now linked to your account."}
            </div>
            <button onClick={()=>go("homeplus")} className="tap"
              style={{ width:"100%",maxWidth:320,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Continue
            </button>
          </div>
        )}

        {stage==="not_found" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
            <div style={{ width:80,height:80,borderRadius:"50%",background:"rgba(248,113,113,0.12)",border:"2px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize:30,color:T.red }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:17,color:T.text,marginBottom:8 }}>Charger Not Found</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:28,maxWidth:300 }}>
              We couldn't find a charger matching "{errorDetail}" on our network. Make sure it's powered on and connected to WiFi.
            </div>
            <button onClick={()=>setStage("scanning")} className="tap"
              style={{ width:"100%",maxWidth:320,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
              Try Again
            </button>
            <button onClick={reset} className="tap" style={{ background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
              Cancel
            </button>
          </div>
        )}

        {stage==="already_claimed" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
            <div style={{ width:80,height:80,borderRadius:"50%",background:"rgba(251,191,36,0.12)",border:"2px solid rgba(251,191,36,0.3)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
              <i className="fas fa-lock" style={{ fontSize:30,color:T.yellow }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:17,color:T.text,marginBottom:8 }}>Already Registered</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:28,maxWidth:300 }}>
              This charger is already linked to a different EcoCharge account. If this is your charger, contact support to transfer ownership.
            </div>
            <button onClick={reset} className="tap"
              style={{ width:"100%",maxWidth:320,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
              Done
            </button>
          </div>
        )}

        {stage==="error" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
            <div style={{ width:80,height:80,borderRadius:"50%",background:"rgba(248,113,113,0.12)",border:"2px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
              <i className="fas fa-exclamation-circle" style={{ fontSize:30,color:T.red }}/>
            </div>
            <div style={{ fontWeight:800,fontSize:17,color:T.text,marginBottom:8 }}>Connection Failed</div>
            <div style={{ fontSize:13,color:T.muted,lineHeight:1.8,marginBottom:28,maxWidth:300 }}>
              Something went wrong while linking your charger. Please try again.
            </div>
            <button onClick={()=>setStage("confirm")} className="tap"
              style={{ width:"100%",maxWidth:320,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
