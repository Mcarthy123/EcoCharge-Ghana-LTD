import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://zgylidlhznlxciyoourd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneWxpZGxoem5seGNpeW9vdXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTMwODEsImV4cCI6MjA5NTEyOTA4MX0.8REdXTIxHLCvMOtLMWP5v-S92x7Rw_7u-WcepsJdPBI";
const PAYSTACK_KEY = "pk_test_693bf3194bc8e8cf5024fac5cd8f23ac566e1199";

const teal = "#00E5A0";
const bg = "#0a0f0d";
const card = "#111a15";

const stationCoords = {
  "Accra Central Hub": [5.6037, -0.187],
  "Kumasi North": [6.6885, -1.6244],
  "Tema Coastal Hub": [5.6698, 0.0166],
  "Madina Solar Point": [5.6720, -0.1711],
};

const VEHICLE_IMAGES = {
  Car: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=200&q=80",
  Scooter: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80",
  Tricycle: "https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=200&q=80",
};

async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  return res.json();
}

function MapView({ stations, onSelectStation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!window.L || mapInstance.current) return;
    const map = window.L.map(mapRef.current).setView([6.2, -0.8], 8);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    stations.forEach((s) => {
      const coords = stationCoords[s.name];
      if (!coords) return;
      const marker = window.L.circleMarker(coords, {
        radius: 12, fillColor: teal, color: "#000", weight: 2, fillOpacity: 0.9,
      }).addTo(map);
      marker.bindPopup(`<b>${s.name}</b><br>${s.bays} bays • ${s.solar}% solar`);
      marker.on("click", () => onSelectStation(s));
    });
    mapInstance.current = map;
  }, [stations]);

  return <div ref={mapRef} id="map" />;
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("map");
  const [view, setView] = useState("map");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (screen === "home") {
      fetch(`${SUPABASE_URL}/rest/v1/Stations?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }).then((r) => r.json()).then(setStations);
    }
  }, [screen]);

  useEffect(() => {
    if (tab === "history" && user) {
      fetch(`${SUPABASE_URL}/rest/v1/history?user_id=eq.${user.id}&order=id.desc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }).then((r) => r.json()).then(setHistory);
    }
  }, [tab, user]);

  const handleSignup = async () => {
    setError("");
    const data = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user) { setUser(data.user); setScreen("home"); }
    else setError(data.msg || "Signup failed. Try a stronger password.");
  };

  const handleLogin = async () => {
    setError("");
    const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user) { setUser(data.user); setScreen("home"); }
    else setError("Invalid email or password. Try signing up.");
  };

  const prices = { Car: 165, Scooter: 12, Tricycle: 23 };

  const saveToHistory = async (station, v, amount) => {
    await fetch(`${SUPABASE_URL}/rest/v1/history`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: user.id,
        station: station.name,
        vehicle: v,
        amount,
        date: new Date().toLocaleDateString("en-GH"),
      }),
    });
  };

  const handlePay = () => {
    if (!vehicle || !user) return;
    setPaying(true);
    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: user.email,
        amount: prices[vehicle] * 100,
        currency: "GHS",
        ref: "ECO" + Date.now(),
        channels: ["mobile_money", "card"],
        metadata: {
          custom_fields: [
            { display_name: "Station", value: selected.name },
            { display_name: "Vehicle", value: vehicle },
          ]
        },
        callback: function (response)  {
          setPaying(false);
          await saveToHistory(selected, vehicle, prices[vehicle]);
          alert("✅ Payment successful!\nRef: " + response.reference);
          setSelected(null);
      setSelected(null);
      setVehicle(null);
    },
    onClose: function() {
      setPaying(false);
    },
  }).openIframe();
};
  };

  const inputStyle = {
    width: "100%", padding: 12, background: card,
    border: "1px solid #1e2e24", borderRadius: 10,
    color: "#fff", fontSize: 15, marginBottom: 12,
    boxSizing: "border-box",
  };

  if (screen === "login" || screen === "signup") {
    return (
      <div style={{ background: bg, minHeight: "100vh", color: "#fff", fontFamily: "sans-serif", padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1 style={{ color: teal, textAlign: "center", marginBottom: 4, fontSize: 28 }}>⚡ EcoChargeCar</h1>
        <p style={{ color: "#7a9a85", textAlign: "center", marginBottom: 32, fontSize: 13 }}>Solar Charging • Clean Water • Zero Emissions</p>
        <div style={{ background: card, borderRadius: 16, padding: 24, border: "1px solid #1e2e24" }}>
          <h2 style={{ color: "#fff", marginBottom: 20, textAlign: "center" }}>
            {screen === "login" ? "Welcome Back 👋" : "Create Account ✨"}
          </h2>
          <input style={inputStyle} type="email" placeholder="Email address"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Password (min 6 chars)"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={screen === "login" ? handleLogin : handleSignup}
            style={{ width: "100%", padding: 14, background: teal, color: "#000", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
            {screen === "login" ? "Login" : "Sign Up"}
          </button>
          <p style={{ color: "#7a9a85", textAlign: "center", fontSize: 13 }}>
            {screen === "login" ? "No account? " : "Already have one? "}
            <span onClick={() => { setScreen(screen === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: teal, cursor: "pointer" }}>
              {screen === "login" ? "Sign up" : "Login"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", color: "#fff", fontFamily: "sans-serif", paddingBottom: 70 }}>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ color: teal, margin: 0, fontSize: 20 }}>⚡ EcoChargeCar</h1>
          <p style={{ color: "#7a9a85", margin: 0, fontSize: 10 }}>Solar • Water • Zero Emissions</p>
        </div>
        <span onClick={() => { setUser(null); setScreen("login"); }}
          style={{ color: teal, fontSize: 12, cursor: "pointer" }}>Logout</span>
      </div>

      {tab === "map" && !selected && (
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", background: card, borderRadius: 12, padding: 4, marginBottom: 16, border: "1px solid #1e2e24" }}>
            {["map", "list"].map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ flex: 1, padding: 8, background: view === v ? teal : "transparent", color: view === v ? "#000" : "#7a9a85", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
                {v === "map" ? "🗺️ Map" : "📋 List"}
              </button>
            ))}
          </div>
          {view === "map" ? (
            <div>
              <MapView stations={stations} onSelectStation={setSelected} />
              <p style={{ color: "#7a9a85", fontSize: 12, textAlign: "center", marginTop: 8 }}>👆 Tap a pin to select a station</p>
            </div>
          ) : (
            stations.map((s) => (
              <div key={s.id} onClick={() => setSelected(s)}
                style={{ background: card, border: "1px solid #1e2e24", borderRadius: 16, padding: 16, marginBottom: 12, cursor: "pointer" }}>
                <h3 style={{ color: "#fff", margin: "0 0 8px" }}>{s.name}</h3>
                <p style={{ color: "#7a9a85", margin: "0 0 8px", fontSize: 13 }}>📍 {s.address}</p>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: teal, fontSize: 13 }}>🟢 {s.bays} bays</span>
                  <span style={{ color: teal, fontSize: 13 }}>☀️ {s.solar}% solar</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "map" && selected && (
        <div style={{ padding: "0 20px" }}>
          <button onClick={() => { setSelected(null); setVehicle(null); }}
            style={{ background: "none", border: "none", color: teal, cursor: "pointer", fontSize: 16, marginBottom: 16, padding: 0 }}>
            ← Back
          </button>
          <div style={{ background: card, borderRadius: 16, padding: 16, marginBottom: 20, border: "1px solid #1e2e24" }}>
            <h2 style={{ color: "#fff", margin: "0 0 8px" }}>{selected.name}</h2>
            <p style={{ color: "#7a9a85", margin: "0 0 12px", fontSize: 13 }}>📍 {selected.address}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: teal, fontSize: 13 }}>🟢 {selected.bays} bays</span>
              <span style={{ color: teal, fontSize: 13 }}>☀️ {selected.solar}% solar</span>
            </div>
          </div>

          <h3 style={{ color: "#fff", marginBottom: 12 }}>Select Vehicle</h3>
          {["Car", "Scooter", "Tricycle"].map((v) => (
            <div key={v} onClick={() => setVehicle(v)}
              style={{ background: vehicle === v ? "#0d2018" : card, border: `1.5px solid ${vehicle === v ? teal : "#1e2e24"}`, borderRadius: 14, padding: "12px 16px", marginBottom: 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={VEHICLE_IMAGES[v]} alt={v}
                  style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 8 }} />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{v}</span>
              </div>
              <span style={{ color: teal, fontWeight: 700 }}>GH₵{prices[v]}</span>
            </div>
          ))}

          {vehicle && (
            <div style={{ marginTop: 20 }}>
              <div style={{ background: "#0d2018", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a9a85" }}>Total</span>
                <span style={{ color: teal, fontWeight: 700 }}>GH₵{prices[vehicle]}</span>
              </div>
              <button onClick={handlePay} disabled={paying}
                style={{ width: "100%", padding: 16, background: paying ? "#555" : teal, color: "#000", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: paying ? "not-allowed" : "pointer" }}>
                {paying ? "Processing..." : "Pay with Mobile Money 💳"}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div style={{ padding: "0 20px" }}>
          <h2 style={{ color: "#fff", marginBottom: 16 }}>Charging History ⚡</h2>
          {history.length === 0 ? (
            <div style={{ background: card, borderRadius: 16, padding: 24, textAlign: "center", border: "1px solid #1e2e24" }}>
              <p style={{ fontSize: 40 }}>🔋</p>
              <p style={{ color: "#7a9a85" }}>No charges yet!</p>
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} style={{ background: card, border: "1px solid #1e2e24", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{h.station}</span>
                  <span style={{ color: teal, fontWeight: 700 }}>GH₵{h.amount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#7a9a85", fontSize: 13 }}>{h.vehicle}</span>
                  <span style={{ color: "#555", fontSize: 13 }}>{h.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#080f0a", borderTop: "1px solid #1e2e24", display: "flex", padding: "8px 0" }}>
        {[
          { id: "map", icon: "⚡", label: "Stations" },
          { id: "history", icon: "📋", label: "History" },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); }}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? teal : "#7a9a85", padding: "4px 0" }}>
            <div style={{ fontSize: 20 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
