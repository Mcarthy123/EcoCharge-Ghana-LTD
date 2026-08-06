// ============================================================
// EcoCharge Ghana — Family Sharing Screen (Phase 6)
//
// HONESTY NOTES:
// - Creating a family, inviting by email, accepting invites, and
//   removing members are all REAL — backed by `families` and
//   `family_members` Supabase tables with RLS.
// - "Invite" just adds a row with the invited email — it does NOT
//   send an email or push notification. The invited person only
//   sees the invite if they open this screen while signed in with
//   that exact email address.
// - There is NO shared wallet or shared vehicle access yet. Family
//   members can see each other's names in the group, but cannot
//   spend from each other's wallets or book using each other's
//   vehicles. That would need new RLS policies letting one user's
//   wallet be debited by another — a bigger, separate piece of work.
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

export default function FamilySharing({ go, user, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null);       // family the user OWNS
  const [members, setMembers] = useState([]);        // members of owned family
  const [myInvites, setMyInvites] = useState([]);     // pending invites addressed to me
  const [myMemberships, setMyMemberships] = useState([]); // families I've joined (not own)
  const [inviteEmail, setInviteEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user?.id || !SUPABASE_URL) { setLoading(false); return; }
    setLoading(true);
    try {
      const [ownedFamilies, allMembership] = await Promise.all([
        sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `families?owner_id=eq.${user.id}&limit=1`),
        sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `family_members?select=*,families(name,owner_id)`),
      ]);
      const owned = Array.isArray(ownedFamilies) && ownedFamilies[0] ? ownedFamilies[0] : null;
      setFamily(owned);

      if (owned) {
        const mem = await sbGet(SUPABASE_URL, SUPABASE_ANON, getToken, `family_members?family_id=eq.${owned.id}&order=invited_at.asc`);
        setMembers(Array.isArray(mem) ? mem : []);
      } else {
        setMembers([]);
      }

      const rows = Array.isArray(allMembership) ? allMembership : [];
      setMyInvites(rows.filter(r => r.status === "pending" && r.invited_email === user.email && !owned));
      setMyMemberships(rows.filter(r => r.status === "active" && r.user_id === user.id && r.families?.owner_id !== user.id));
    } catch(e) {}
    setLoading(false);
  };
  useEffect(()=>{ load(); }, [user?.id]);

  const createFamily = async () => {
    if (!familyName.trim()) { setError("Enter a family name"); return; }
    setCreating(true); setError("");
    const saved = await sbPost(SUPABASE_URL, SUPABASE_ANON, getToken, "families", {
      owner_id: user.id, name: familyName.trim(),
    });
    if (saved?.[0]) { setFamily(saved[0]); setMembers([]); }
    else setError("Could not create family. Try again.");
    setCreating(false);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) { setError("Enter a valid email"); return; }
    if (inviteEmail.trim().toLowerCase() === user.email.toLowerCase()) { setError("That's your own email"); return; }
    if (members.some(m => m.invited_email.toLowerCase() === inviteEmail.trim().toLowerCase())) { setError("Already invited"); return; }
    setInviting(true); setError("");
    const saved = await sbPost(SUPABASE_URL, SUPABASE_ANON, getToken, "family_members", {
      family_id: family.id, invited_email: inviteEmail.trim().toLowerCase(), role: "member", status: "pending",
    });
    if (saved?.[0]) { setMembers(prev => [...prev, saved[0]]); setInviteEmail(""); }
    else setError("Could not send invite. Try again.");
    setInviting(false);
  };

  const removeMember = async (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    await sbDelete(SUPABASE_URL, SUPABASE_ANON, getToken, `family_members?id=eq.${id}`);
  };

  const acceptInvite = async (invite) => {
    const ok = await sbPatch(SUPABASE_URL, SUPABASE_ANON, getToken, `family_members?id=eq.${invite.id}`, {
      user_id: user.id, status: "active", joined_at: new Date().toISOString(),
    });
    if (ok) load();
  };

  const declineInvite = async (invite) => {
    setMyInvites(prev => prev.filter(i => i.id !== invite.id));
    await sbDelete(SUPABASE_URL, SUPABASE_ANON, getToken, `family_members?id=eq.${invite.id}`);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <Header T={T} title="Family Sharing" sub="Manage your EcoCharge family group" onBack={()=>go("homeplus")}/>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 100px" }}>

        <div style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <i className="fas fa-info-circle" style={{ color:T.blue,fontSize:14,flexShrink:0 }}/>
          <div style={{ fontSize:11,color:T.mutedLight,lineHeight:1.6 }}>
            Membership is real, but wallets and vehicles aren't shared between family members yet — that's a separate upcoming piece.
          </div>
        </div>

        {loading && <div style={{ textAlign:"center",padding:"30px 0",color:T.muted,fontSize:12 }}>Loading…</div>}

        {!loading && myInvites.length > 0 && (
          <>
            <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>
              <i className="fas fa-envelope-open-text" style={{ marginRight:8,color:T.yellow }}/>Pending Invites
            </div>
            {myInvites.map(inv=>(
              <Card key={inv.id} T={T} style={{ padding:16, marginBottom:10, border:`1px solid ${T.yellow}55` }}>
                <div style={{ fontWeight:700,fontSize:14,color:T.text,marginBottom:4 }}>{inv.families?.name || "A family"}</div>
                <div style={{ fontSize:12,color:T.muted,marginBottom:12 }}>invited you to join</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <button onClick={()=>declineInvite(inv)} className="tap"
                    style={{ background:T.surfaceFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:T.mutedLight,cursor:"pointer",fontFamily:"inherit" }}>
                    Decline
                  </button>
                  <button onClick={()=>acceptInvite(inv)} className="tap"
                    style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                    Accept
                  </button>
                </div>
              </Card>
            ))}
          </>
        )}

        {!loading && myMemberships.length > 0 && (
          <>
            <div style={{ fontWeight:800,fontSize:14,color:T.text,margin:"20px 0 10px" }}>
              <i className="fas fa-users" style={{ marginRight:8,color:T.green }}/>Families You've Joined
            </div>
            {myMemberships.map(m=>(
              <Card key={m.id} T={T} style={{ padding:16, marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{m.families?.name || "Family"}</div>
                  <Badge label="Member" color={T.blue}/>
                </div>
              </Card>
            ))}
          </>
        )}

        {!loading && !family && (
          <Card T={T} style={{ padding:22, marginTop: (myInvites.length||myMemberships.length) ? 20 : 0 }}>
            <div style={{ textAlign:"center",marginBottom:18 }}>
              <i className="fas fa-users" style={{ fontSize:32,color:T.green,marginBottom:10,display:"block" }}/>
              <div style={{ fontWeight:800,fontSize:15,color:T.text,marginBottom:6 }}>Start a Family Group</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>Create a group and invite family members by email. They'll see the invite when they open this screen signed in with that email.</div>
            </div>
            <input value={familyName} onChange={e=>{ setFamilyName(e.target.value); setError(""); }} placeholder="e.g. The Mensah Family"
              style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",color:T.text,fontSize:14,fontFamily:"inherit",marginBottom:12 }}/>
            {error && <div style={{ fontSize:12,color:T.red,marginBottom:12 }}>{error}</div>}
            <button onClick={createFamily} disabled={creating} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:creating?0.7:1 }}>
              {creating ? "Creating…" : "Create Family Group"}
            </button>
          </Card>
        )}

        {!loading && family && (
          <>
            <Card T={T} style={{ padding:18, marginTop: (myInvites.length||myMemberships.length) ? 20 : 0, marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                <div style={{ fontWeight:800,fontSize:16,color:T.text }}>{family.name}</div>
                <Badge label="Owner" color={T.green}/>
              </div>
              <div style={{ fontSize:12,color:T.muted }}>{members.filter(m=>m.status==="active").length} active · {members.filter(m=>m.status==="pending").length} pending</div>
            </Card>

            <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Invite a Member</div>
            <Card T={T} style={{ padding:16, marginBottom:16 }}>
              <div style={{ display:"flex",gap:8 }}>
                <input value={inviteEmail} onChange={e=>{ setInviteEmail(e.target.value); setError(""); }} placeholder="family.member@email.com" type="email"
                  style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 12px",color:T.text,fontSize:13,fontFamily:"inherit" }}/>
                <button onClick={inviteMember} disabled={inviting} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:10,padding:"11px 18px",fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",fontFamily:"inherit",opacity:inviting?0.7:1,whiteSpace:"nowrap" }}>
                  {inviting ? "…" : "Invite"}
                </button>
              </div>
              {error && <div style={{ fontSize:12,color:T.red,marginTop:10 }}>{error}</div>}
            </Card>

            <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Members</div>
            {members.length === 0 && (
              <Card T={T} style={{ padding:18,textAlign:"center" }}>
                <div style={{ fontSize:12,color:T.muted }}>No members yet — invite someone above.</div>
              </Card>
            )}
            {members.map(m=>(
              <Card key={m.id} T={T} style={{ padding:16, marginBottom:10, display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{m.invited_email}</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>
                    {m.status === "active" ? `Joined ${new Date(m.joined_at).toLocaleDateString("en-GH",{day:"numeric",month:"short"})}` : "Invite pending"}
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <Badge label={m.status === "active" ? "Active" : "Pending"} color={m.status === "active" ? T.green : T.yellow}/>
                  <button onClick={()=>removeMember(m.id)} className="tap"
                    style={{ background:"none",border:"none",color:T.red,cursor:"pointer",padding:4 }}>
                    <i className="fas fa-times-circle"/>
                  </button>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
