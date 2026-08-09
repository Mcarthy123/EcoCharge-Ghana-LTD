// ============================================================
// EcoCharge Ghana — Subscription Screen (Phase 6)
//
// HONESTY NOTES:
// - Subscribing is REAL: it charges via Paystack (same infra as
//   your Wallet top-up — OCPP proxy if configured, else the
//   paystack.shop fallback link) and writes a row to the
//   `subscriptions` table.
// - The discount perks listed (10%/20% off per-kWh, etc.) are
//   NOT automatically applied at checkout yet. They need to be
//   wired into your Pricing Engine (tariffs table) — e.g. a tariff
//   with is_active tied to subscription status. Until then, this
//   page is honest about that gap via the banner below.
// - This is a single payment per billing period, not a Paystack
//   recurring "Plan" subscription (which needs server-side plan
//   creation with your secret key). Renewal is manual for now —
//   the user re-subscribes when current_period_end passes.
// ============================================================
import { useState, useEffect } from "react";

const OCPP_URL = import.meta.env.VITE_OCPP_SERVER_URL || "";
const OCPP_KEY = import.meta.env.VITE_OCPP_API_KEY    || "";

const TIERS = [
  {
    id: "free",
    name: "Standard",
    priceGHS: 0,
    tagline: "For every EV driver",
    perks: [
      "Find chargers & view live map",
      "Live availability",
      "Basic reservations (limited)",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "EcoCharge Pro",
    priceGHS: 49,
    tagline: "For smart EV drivers",
    highlight: true,
    perks: [
      "AI Route Planner",
      "Unlimited reservations",
      "Battery intelligence & tips",
      "Charging history & analytics",
      "Cost tracking & savings",
      "Priority support",
    ],
  },
  {
    id: "home_plus",
    name: "EcoCharge Home+",
    priceGHS: 69,
    tagline: "For home charger owners",
    perks: [
      "All Pro features",
      "Home charger connection",
      "Remote start/stop",
      "Smart scheduling",
      "Energy tracking & insights",
      "Alerts & notifications",
    ],
  },
  {
    id: "fleet",
    name: "EcoCharge Fleet",
    priceGHS: null,
    custom: true,
    tagline: "For businesses & fleets",
    perks: [
      "All Pro features",
      "Fleet dashboard",
      "Driver & vehicle management",
      "Smart charging schedules",
      "Reports & analytics",
      "Dedicated account manager",
    ],
  },
];

const fmtGHS = (n) => n === 0 ? "Free" : `GH₵${n}/mo`;
const fmtPesewasGHS = (p) => p != null ? `GH₵${(p/100).toFixed(2)}` : "—";

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

export default function SubscriptionScreen({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null); // tier id currently processing
  const [error, setError] = useState("");

  const loadSub = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&status=eq.active&order=created_at.desc&limit=1`,
        { headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}` }}
      );
      const data = await res.json();
      setSub(Array.isArray(data) && data[0] ? data[0] : null);
    } catch(e) {}
    setLoading(false);
  };
  useEffect(()=>{ loadSub(); }, [user?.id]);

  const currentTierId = sub?.tier || "free";

  const subscribe = async (tier) => {
    if (tier.id === "free") return;
    if (!user?.id || !user?.email) { setError("Please sign in first."); return; }
    setError("");
    setSubscribing(tier.id);
    const amountPesewas = tier.priceGHS * 100;
    const ref = `SUB-${tier.id.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    try {
      // Record the intent as "pending" before redirecting to Paystack —
      // same pattern your Wallet top-up uses for topup_requests.
      if (SUPABASE_URL) {
        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
          method: "POST",
          headers: { apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
          body: JSON.stringify({
            user_id: user.id, tier: tier.id, status: "pending",
            amount_pesewas: amountPesewas, payment_ref: ref,
          }),
        });
      }
      try { localStorage.setItem("eco_sub_pending", JSON.stringify({ ref, tier: tier.id, userId: user.id, amount: amountPesewas })); } catch(e) {}

      if (OCPP_URL) {
        const initRes = await fetch(`${OCPP_URL}/api/payment/initialize`, {
          method: "POST",
          headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email, amount_pesewas: amountPesewas, type: "subscription",
            metadata: { user_id: user.id, tier: tier.id, type: "subscription", reference: ref },
          }),
        });
        const initData = await initRes.json();
        if (initData.reference && initData.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        }
      }
      // Fallback: same public Paystack payment page your wallet top-up uses
      window.location.href = `https://paystack.shop/pay/bldaqwywt5?email=${encodeURIComponent(user.email)}&amount=${amountPesewas}&reference=${ref}`;
    } catch(e) {
      setError("Could not start checkout. Please try again.");
      setSubscribing(null);
    }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Subscription" sub="Choose your EcoCharge plan" onBack={()=>go("homeplus")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        <div style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <i className="fas fa-info-circle" style={{ color:T.blue,fontSize:14,flexShrink:0 }}/>
          <div style={{ fontSize:11,color:T.mutedLight,lineHeight:1.6 }}>
            Checkout is real and charges your card/mobile money. Discount perks (10%/20% off per-kWh) aren't automatically applied at charging stations yet — that needs to be wired into the Pricing Engine.
          </div>
        </div>

        {loading && (
          <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Loading your plan…</div>
        )}

        {!loading && sub && sub.status==="active" && (
          <Card T={T} style={{ padding:16,marginBottom:16,border:`1px solid ${T.green}66` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5 }}>Current Plan</div>
                <div style={{ fontWeight:800,fontSize:16,color:T.text,marginTop:3 }}>
                  {TIERS.find(t=>t.id===sub.tier)?.name || sub.tier}
                </div>
              </div>
              <span style={{ background:`${T.green}1f`,color:T.green,fontSize:10,fontWeight:700,borderRadius:20,padding:"4px 10px",border:`1px solid ${T.green}44` }}>ACTIVE</span>
            </div>
          </Card>
        )}

        {error && (
          <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"11px 14px",marginBottom:14,color:T.red,fontSize:12 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight:6 }}/>{error}
          </div>
        )}

        {TIERS.map(tier=>{
          const isCurrent = currentTierId === tier.id;
          return (
            <Card key={tier.id} T={T} style={{
              padding:20, marginBottom:14,
              border: tier.highlight ? `1.5px solid ${T.green}` : isCurrent ? `1px solid ${T.green}66` : undefined,
            }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ fontWeight:800,fontSize:17,color:T.text }}>{tier.name}</div>
                    {tier.highlight && (
                      <span style={{ background:`${T.green}1f`,color:T.green,fontSize:9,fontWeight:800,borderRadius:20,padding:"3px 8px",border:`1px solid ${T.green}44` }}>POPULAR</span>
                    )}
                  </div>
                  <div style={{ fontSize:12,color:T.muted,marginTop:3 }}>{tier.tagline}</div>
                </div>
              <div style={{ fontWeight:900,fontSize:20,color: tier.priceGHS===0 ? T.mutedLight : T.green,whiteSpace:"nowrap" }}>
                  {tier.custom ? "Custom" : fmtGHS(tier.priceGHS)}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                {tier.perks.map((p,i)=>(
                  <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<tier.perks.length-1?9:0 }}>
                    <i className="fas fa-check" style={{ fontSize:11,color:T.green,marginTop:3,flexShrink:0 }}/>
                    <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.6 }}>{p}</div>
                  </div>
                ))}
              </div>

             {isCurrent ? (
                <div style={{ width:"100%",background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",textAlign:"center",fontSize:13,fontWeight:700,color:T.muted }}>
                  <i className="fas fa-check-circle" style={{ marginRight:6,color:T.green }}/>Your Current Plan
                </div>
              ) : tier.id === "free" ? (
                <div style={{ width:"100%",background:"none",border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",textAlign:"center",fontSize:13,fontWeight:600,color:T.muted }}>
                  Default plan — no signup needed
                </div>
              ) : tier.custom ? (
                <a href="mailto:ecochargeghanaltd@gmail.com?subject=EcoCharge%20Fleet%20Enquiry" className="tap"
                  style={{ display:"flex",alignItems:"center",justifyContent:"center",width:"100%",background:T.surface,border:`1px solid ${T.green}66`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:T.green,cursor:"pointer",textDecoration:"none" }}>
                  Contact Sales
                </a>
              ) : (
                <button onClick={()=>subscribe(tier)} disabled={subscribing===tier.id} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:subscribing===tier.id?0.7:1 }}>
                  {subscribing===tier.id ? "Redirecting to payment…" : `Subscribe — ${fmtGHS(tier.priceGHS)}`}
                </button>
              )}
            </Card>
          );
        })}

        {sub?.status==="pending" && (
          <div style={{ textAlign:"center",fontSize:11,color:T.muted,marginTop:10 }}>
            A payment for {TIERS.find(t=>t.id===sub.tier)?.name} is pending confirmation.
          </div>
        )}
      </div>
    </div>
  );
}
