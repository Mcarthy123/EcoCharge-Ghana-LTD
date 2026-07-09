// ============================================================
// EcoCharge Ghana — ReservationSystem.jsx
// Standalone "Reserve a Charger" flow, reachable from the drawer.
// Reuses the same `bookings` table as the rest of the app
// (booking_mode:"later") so it shows up alongside normal bookings.
// Self-contained: does not import anything from App.jsx to avoid
// circular imports — takes T (theme), getToken, and Supabase
// config as props instead.
// ============================================================
import { useState, useEffect } from "react";

const genRef = () => `ECO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
const fmtEndTime = (d, mins) => fmtTime(new Date(new Date(d).getTime() + mins * 60000));
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" });

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
];

const Spinner = ({ color }) => (
  <span
    style={{
      width: 18, height: 18, borderRadius: "50%",
      border: `2px solid ${color}`, borderTopColor: "transparent",
      display: "inline-block", animation: "rsspin .8s linear infinite",
    }}
  />
);

export default function ReservationSystem({ go, user, stations = [], T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [tab, setTab] = useState("new"); // "new" | "mine"
  const [selectedStation, setSelectedStation] = useState(stations[0] || null);
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 1 = tomorrow
  const [slotIdx, setSlotIdx] = useState(0);
  const [durIdx, setDurIdx] = useState(1);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [myReservations, setMyReservations] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const sbHeaders = () => ({
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  // Build slot list for the selected day (every 30 min, 06:00–22:00)
  const buildSlots = (offsetDays) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    const start = new Date(base);
    const end = new Date(base);
    if (offsetDays === 0) {
      start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0);
      if (start.getHours() < 6) start.setHours(6, 0, 0, 0);
    } else {
      start.setHours(6, 0, 0, 0);
    }
    end.setHours(22, 0, 0, 0);
    const arr = [];
    const t = new Date(start);
    while (t <= end) {
      arr.push(new Date(t));
      t.setMinutes(t.getMinutes() + 30);
    }
    return arr;
  };

  const slots = buildSlots(dayOffset);
  const dur = DURATIONS[durIdx];

  const loadMine = async () => {
    if (!SUPABASE_URL || !user?.id) { setMyReservations([]); return; }
    setLoadingMine(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?user_id=eq.${user.id}&booking_mode=eq.later&order=slot_time.desc&limit=30`,
        { headers: sbHeaders() }
      );
      const data = await res.json();
      if (Array.isArray(data)) setMyReservations(data);
    } catch (e) {}
    setLoadingMine(false);
  };

  useEffect(() => {
    if (tab === "mine") loadMine();
  }, [tab, user]);

  useEffect(() => {
    if (!selectedStation && stations.length) setSelectedStation(stations[0]);
  }, [stations]);

  const cancelReservation = async (r) => {
    if (!SUPABASE_URL) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?reference=eq.${r.reference}`, {
        method: "PATCH",
        headers: { ...sbHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setMyReservations((prev) =>
        prev.map((b) => (b.reference === r.reference ? { ...b, status: "cancelled" } : b))
      );
    } catch (e) {}
  };

  const submit = async () => {
    if (!selectedStation) { setError("Select a station first"); return; }
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!phone.trim() || phone.length < 10) { setError("Enter a valid phone number"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email"); return; }
    if (!slots[slotIdx]) { setError("Select a time slot"); return; }

    setLoading(true);
    setError("");
    const ref = genRef();
    const payload = {
      reference: ref,
      station: selectedStation.name,
      city: selectedStation.city,
      vehicle: "Car",
      slot_time: slots[slotIdx].toISOString(),
      duration_min: dur.value,
      amount: null,
      name,
      phone,
      email,
      user_id: user?.id || null,
      pay_method: "wallet",
      booking_mode: "later",
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    let ok = true;
    if (SUPABASE_URL) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: "POST",
          headers: { ...sbHeaders(), Prefer: "return=minimal" },
          body: JSON.stringify(payload),
        });
        ok = res.ok;
      } catch (e) { ok = false; }
    }

    if (!ok) {
      setError("Could not save reservation. Check your connection and try again.");
      setLoading(false);
      return;
    }

    try { localStorage.setItem("eco_booking", JSON.stringify(payload)); } catch (e) {}
    setSuccess(payload);
    setLoading(false);
  };

  const card = { background: T.card, borderRadius: 16, border: `1px solid ${T.border}` };

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
        <style>{`@keyframes rsspin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ padding: "calc(14px + env(safe-area-inset-top, 34px)) 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <i className="fas fa-arrow-left" style={{ fontSize: 20, color: T.text }} />
          </button>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Reservation Confirmed</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 18px 100px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${T.green},${T.greenDark})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="fas fa-check" style={{ fontSize: 30, color: "#000" }} />
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: T.green }}>Bay Reserved!</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{success.station}</div>
          </div>
          <div style={{ ...card, padding: 16, marginBottom: 20 }}>
            {[
              { label: "Reference", value: success.reference },
              { label: "Date", value: fmtDate(success.slot_time) },
              { label: "Time", value: `${fmtTime(success.slot_time)} – ${fmtEndTime(success.slot_time, success.duration_min)}` },
              { label: "Duration", value: `${success.duration_min} min` },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>{r.label}</span>
                <span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{r.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSuccess(null); setTab("mine"); }}
            style={{ width: "100%", background: `linear-gradient(135deg,${T.green},${T.greenDark})`, border: "none", borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 800, color: "#000", cursor: "pointer", marginBottom: 10 }}
          >
            View My Reservations
          </button>
          <button
            onClick={() => go("home")}
            style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 600, color: T.text, cursor: "pointer" }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <style>{`@keyframes rsspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ padding: "calc(14px + env(safe-area-inset-top, 34px)) 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 20, color: T.text }} />
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Reserve a Charger</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Book a bay ahead of time</div>
        </div>
      </div>

      <div style={{ display: "flex", background: T.card, margin: "12px 14px 0", borderRadius: 12, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "new", label: "New Reservation" }, { id: "mine", label: "My Reservations" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: tab === t.id ? `linear-gradient(135deg,${T.green},${T.greenDark})` : "none",
              border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
              color: tab === t.id ? "#000" : T.muted, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 120px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 10 }}>
            <i className="fas fa-map-marker-alt" style={{ marginRight: 8, color: T.green }} /> Select Station
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStation(s)}
                style={{
                  flexShrink: 0, minWidth: 140, textAlign: "left", padding: "12px 14px", borderRadius: 12,
                  background: selectedStation?.id === s.id ? "rgba(74,222,128,0.1)" : T.card,
                  border: `1px solid ${selectedStation?.id === s.id ? T.green : T.border}`, cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{s.name}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.city} · {s.open}/{s.bays} open</div>
              </button>
            ))}
          </div>

          <div style={{ ...card, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>
              <i className="fas fa-calendar-day" style={{ marginRight: 8, color: T.green }} /> Day
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((d) => {
                const day = new Date();
                day.setDate(day.getDate() + d);
                return (
                  <button
                    key={d}
                    onClick={() => { setDayOffset(d); setSlotIdx(0); }}
                    style={{
                      flex: 1, padding: "10px 6px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: dayOffset === d ? T.green : T.bg,
                      border: `1px solid ${dayOffset === d ? T.green : T.border}`,
                      color: dayOffset === d ? "#000" : T.text, cursor: "pointer",
                    }}
                  >
                    {d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDate(day)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...card, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>
              <i className="fas fa-clock" style={{ marginRight: 8, color: T.green }} /> Select Time
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {slots.slice(0, 20).map((sl, i) => (
                <button
                  key={i}
                  onClick={() => setSlotIdx(i)}
                  style={{
                    flexShrink: 0, padding: "8px 14px", borderRadius: 10,
                    background: slotIdx === i ? T.green : T.bg,
                    border: `1px solid ${slotIdx === i ? T.green : T.border}`,
                    color: slotIdx === i ? "#000" : T.text, fontSize: 13,
                    fontWeight: slotIdx === i ? 700 : 500, cursor: "pointer",
                  }}
                >
                  {fmtTime(sl)}
                </button>
              ))}
              {slots.length === 0 && (
                <div style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>No slots available for this day</div>
              )}
            </div>
          </div>

          <div style={{ ...card, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>
              <i className="fas fa-hourglass-half" style={{ marginRight: 8, color: T.green }} /> Duration
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DURATIONS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDurIdx(i)}
                  style={{
                    padding: 12, borderRadius: 12, textAlign: "left",
                    background: durIdx === i ? "rgba(74,222,128,0.08)" : T.bg,
                    border: `1px solid ${durIdx === i ? T.green : T.border}`, cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: durIdx === i ? T.green : T.text }}>{d.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>
              <i className="fas fa-id-card" style={{ marginRight: 8, color: T.green }} /> Your Details
            </div>
            {[
              { ph: "Full name", val: name, set: setName, icon: "fa-user" },
              { ph: "Phone number", val: phone, set: setPhone, icon: "fa-phone", type: "tel" },
              { ph: "Email address", val: email, set: setEmail, icon: "fa-envelope", type: "email" },
            ].map((f) => (
              <div key={f.ph} style={{ position: "relative", marginBottom: 10 }}>
                <i className={`fas ${f.icon}`} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 13 }} />
                <input
                  type={f.type || "text"}
                  placeholder={f.ph}
                  value={f.val}
                  onChange={(e) => { f.set(e.target.value); setError(""); }}
                  style={{ width: "100%", background: T.inputBg || T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px 12px 40px", color: T.text, fontSize: 14, fontFamily: "inherit" }}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 12, color: T.red, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fas fa-exclamation-triangle" /> {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{ width: "100%", background: `linear-gradient(135deg,${T.green},${T.greenDark})`, border: "none", borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, color: "#000", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (<><Spinner color="#000" /> Reserving…</>) : (<><i className="fas fa-calendar-check" /> Reserve Bay</>)}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 100px" }}>
          {!user ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="fas fa-user-lock" style={{ fontSize: 48, color: T.muted, marginBottom: 14, display: "block" }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 6 }}>Sign in to view your reservations</div>
              <button onClick={() => go("auth")} style={{ background: `linear-gradient(135deg,${T.green},${T.greenDark})`, border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer", marginTop: 10 }}>
                Sign In
              </button>
            </div>
          ) : loadingMine ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner color={T.green} /></div>
          ) : myReservations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="fas fa-calendar-times" style={{ fontSize: 48, color: T.muted, marginBottom: 14, display: "block" }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 6 }}>No reservations yet</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Book a bay in advance so it's ready when you arrive.</div>
              <button onClick={() => setTab("new")} style={{ background: `linear-gradient(135deg,${T.green},${T.greenDark})`, border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer" }}>
                Make a Reservation
              </button>
            </div>
          ) : (
            myReservations.map((r) => {
              const isPast = new Date(r.slot_time).getTime() + (r.duration_min || 0) * 60000 < Date.now();
              const cancelled = r.status === "cancelled";
              const statusColor = cancelled ? T.red : isPast ? T.muted : T.green;
              const statusLabel = cancelled ? "Cancelled" : isPast ? "Completed" : "Upcoming";
              return (
                <div key={r.reference} style={{ ...card, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{r.station}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmtDate(r.slot_time)} · {fmtTime(r.slot_time)} – {fmtEndTime(r.slot_time, r.duration_min)}</div>
                    </div>
                    <div style={{ background: `${statusColor}22`, borderRadius: 8, padding: "3px 10px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Ref: {r.reference} · {r.duration_min} min</div>
                  {!cancelled && !isPast && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => go("qr")}
                        style={{ flex: 1, background: T.green, border: "none", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: "#04130a", cursor: "pointer" }}
                      >
                        View Pass
                      </button>
                      <button
                        onClick={() => cancelReservation(r)}
                        style={{ flex: 1, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: T.red, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
