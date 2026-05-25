import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://zgylidlhznlxciyoourd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneWxpZGxoem5seGNpeW9vdXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTMwODEsImV4cCI6MjA5NTEyOTA4MX0.8REdXTIxHLCvMOtLMWP5v-S92x7Rw_7u-WcepsJdPBI";
const PAYSTACK_URL = "https://paystack.shop/pay/bldaqwywt5";

const teal = "#00E5A0";
const bg = "#0a0f0d";
const card = "#111a15";
const border = "#1e2e24";

const stationCoords = {
  "Accra Central Hub": [5.6037, -0.187],
  "Kumasi North": [6.6885, -1.6244],
  "Tema Coastal Hub": [5.6698, 0.0166],
  "Madina Solar Point": [5.6720, -0.1711],
};

const VEHICLES = [
  {
    name: "Car",
    price: 165,
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&q=90",
    desc: "Electric SUV / Sedan",
    icon: "🚗",
  },
  {
    name: "Scooter",
    price: 12,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=90",
    desc: "Electric Scooter",
    icon: "🛵",
  },
  {
    name: "Tricycle",
    price: 23,
    image: "https://images.unsplash.com/photo-1609516362917-a4bf18671a4d?w=400&q=90",
    desc: "Electric Tricycle (Aboboyaa)",
    icon: "🛺",
  },
];

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
        radius: 14, fillColor: teal, color: "#000", weight: 2, fillOpacity: 0.9,
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
  const [view, setView] = useState("list");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);

  // Restore session on load
  useEffect(() => {
    const savedUser = localStorage.getItem("ecoUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setScreen("home");
    }
  }, []);

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

  const handleLogin = async () => {
    setError("");
    const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user) {
      localStorage.setItem("ecoUser", JSON.stringify(data.user));
      setUser(data.user);
      setScreen("home");
    } else {
      setError("Invalid email or password.");
    }
  };

  const handleSignup = async () => {
    setError("");
    const data = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user) {
      localStorage.setItem("ecoUser", JSON.stringify(data.user));
      setUser(data.user);
      setScreen("home");
    } else {
      setError("Signup failed. Use a stronger password.");
    }
  };

  const handleLogout = function() {
    localStorage.removeItem("ecoUser");
    setUser(null);
    setScreen("login");
  };

  const saveToHistory = function(station, v, amount) {
    fetch(`${SUPABASE_URL}/rest/v1/history`, {
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
        amount: amount,
        date: new Date().toLocaleDateString("en-GH"),
      }),
    });
  };

  const handlePay = function() {
    if (!vehicle || !user) return;
    saveToHistory(selected, vehicle.name, vehicle.price);
    setTimeout(function() {
      window.location.href = PAYSTACK_URL;
    }, 1000);
  };

  const inputStyle = {
    width: "100%", padding: 14, background: "#0d1a12",
    border: `1px solid ${border}`, borderRadius: 12,
    color: "#fff", fontSize: 15, marginBottom: 14,
    boxSizing: "border-box", outline: "none",
  };

  // LOGIN / SIGNUP SCREEN
  if (screen === "login" || screen === "signup") {
    return (
      <div style={{ background: bg, minHeight: "100vh", color: "#fff", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
          <h1 style={{ color: teal, margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>EcoCharge Ghana Ltd</h1>
          <p style={{ color: "#7a9a85", margin: "8px 0 0", fontSize: 13 }}>Solar Charging • Clean Water • Zero Emissions</p>
        </div>

        {/* Form */}
        <div style={{ background: card, borderRadius: 20, padding: 24, border: `1px solid ${border}` }}>
          <h2 style={{ color: "#fff", marginBottom: 6, textAlign: "center", fontSize: 20 }}>
            {screen === "login" ? "Welcome Back 👋" : "Create Account ✨"}
          </h2>
          <p style={{ color: "#7a9a85", textAlign: "center", fontSize: 13, marginBottom: 20 }}>
            {screen === "login" ? "Sign in to continue charging" : "Join Ghana's green energy network"}
          </p>

          <input style={inputStyle} type="email" placeholder="Email address"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Password (min 6 chars)"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && (
            <div style={{ background: "#2a0a0a", border: "1px solid #ff4444", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          <button onClick={screen === "login" ? handleLogin : handleSignup}
            style={{ width: "100%", padding: 16, background: teal, color: "#000", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 14, letterSpacing: "0.3px" }}>
            {screen === "login" ? "Login →" : "Create Account →"}
          </button>

          <p style={{ color: "#7a9a85", textAlign: "center", fontSize: 13, margin: 0 }}>
            {screen === "login" ? "No account? " : "Already have one? "}
            <span onClick={() => { setScreen(screen === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: teal, cursor: "pointer", fontWeight: 600 }}>
              {screen === "login" ? "Sign up free" : "Login"}
            </span>
          </p>
        </div>

        {/* Footer */}
        <p style={{ color: "#333", textAlign: "center", fontSize: 11, marginTop: 24 }}>
          🇬🇭 Proudly serving Ghana's EV community
        </p>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={{ background: bg, minHeight: "100vh", color: "#fff", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ color: teal, fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>EcoCharge Ghana Ltd</span>
          </div>
          <p style={{ color: "#7a9a85", margin: 0, fontSize: 10 }}>Solar • Water • Zero Emissions</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#7a9a85", fontSize: 10, margin: "0 0 4px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
          <span onClick={handleLogout}
            style={{ color: "#ff6b6b", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Logout</span>
        </div>
      </div>

      {/* STATIONS TAB */}
      {tab === "map" && !selected && (
        <div style={{ padding: "16px 16px 0" }}>
          {/* Map/List Toggle */}
          <div style={{ display: "flex", background: "#0d1a12", borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${border}` }}>
            {["list", "map"].map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ flex: 1, padding: "10px 8px", background: view === v ? teal : "transparent", color: view === v ? "#000" : "#7a9a85", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>
                {v === "map" ? "🗺️ Map View" : "📋 Station List"}
              </button>
            ))}
          </div>

          {view === "map" ? (
            <div>
              <MapView stations={stations} onSelectStation={setSelected} />
              <p style={{ color: "#7a9a85", fontSize: 12, textAlign: "center", marginTop: 8 }}>👆 Tap a green pin to select a station</p>
            </div>
          ) : (
            <div>
              <p style={{ color: "#7a9a85", fontSize: 13, marginBottom: 12 }}>🟢 {stations.length} stations available near you</p>
              {stations.map((s) => (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 16, marginBottom: 12, cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <h3 style={{ color: "#fff", margin: 0, fontSize: 15, fontWeight: 700 }}>{s.name}</h3>
                    <span style={{ background: "#0d2018", color: teal, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>OPEN</span>
                  </div>
                  <p style={{ color: "#7a9a85", margin: "0 0 10px", fontSize: 12 }}>📍 {s.address}</p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ background: "#0d2018", color: teal, fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>🟢 {s.bays} bays</span>
                    <span style={{ background: "#0d2018", color: teal, fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>☀️ {s.solar}% solar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATION DETAIL */}
      {tab === "map" && selected && (
        <div>
          {/* Station Hero */}
          <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: "12px 16px" }}>
            <button onClick={() => { setSelected(null); setVehicle(null); }}
              style={{ background: "none", border: "none", color: teal, cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 10, fontWeight: 600 }}>
              ← Back to stations
            </button>
            <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{selected.name}</h2>
            <p style={{ color: "#7a9a85", margin: "0 0 12px", fontSize: 13 }}>📍 {selected.address}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: "#0d2018", borderRadius: 12, padding: "10px 14px", flex: 1, textAlign: "center" }}>
                <div style={{ color: teal, fontWeight: 800, fontSize: 20 }}>{selected.bays}</div>
                <div style={{ color: "#7a9a85", fontSize: 11 }}>Bays Open</div>
              </div>
              <div style={{ background: "#0d2018", borderRadius: 12, padding: "10px 14px", flex: 1, textAlign: "center" }}>
                <div style={{ color: teal, fontWeight: 800, fontSize: 20 }}>{selected.solar}%</div>
                <div style={{ color: "#7a9a85", fontSize: 11 }}>Solar Power</div>
              </div>
              <div style={{ background: "#0d2018", borderRadius: 12, padding: "10px 14px", flex: 1, textAlign: "center" }}>
                <div style={{ color: teal, fontWeight: 800, fontSize: 20 }}>~15</div>
                <div style={{ color: "#7a9a85", fontSize: 11 }}>Min Wait</div>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div style={{ padding: "16px 16px 0" }}>
            <h3 style={{ color: "#fff", marginBottom: 4, fontSize: 16, fontWeight: 700 }}>Select Your Vehicle</h3>
            <p style={{ color: "#7a9a85", fontSize: 13, marginBottom: 14 }}>Choose vehicle type to see pricing</p>

            {VEHICLES.map((v) => (
              <div key={v.name} onClick={() => setVehicle(v)}
                style={{ borderRadius: 16, marginBottom: 12, cursor: "pointer", overflow: "hidden", border: `2px solid ${vehicle?.name === v.name ? teal : border}`, transition: "all 0.2s" }}>
                <div style={{ position: "relative", height: 150 }}>
                  <img src={v.image} alt={v.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />
                  <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>{v.icon} {v.name}</div>
                      <div style={{ color: "#bbb", fontSize: 12 }}>{v.desc}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: teal, fontWeight: 800, fontSize: 20 }}>GH₵{v.price}</div>
                      <div style={{ color: "#888", fontSize: 11 }}>per charge</div>
                    </div>
                  </div>
                  {vehicle?.name === v.name && (
                    <div style={{ position: "absolute", top: 12, right: 12, background: teal, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 14 }}>✓</div>
                  )}
                </div>
              </div>
            ))}

            {vehicle && (
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ background: "#0d2018", border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#7a9a85", fontSize: 13 }}>Station</span>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{selected.name}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#7a9a85", fontSize: 13 }}>Vehicle</span>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{vehicle.icon} {vehicle.name}</span>
                  </div>
                  <div style={{ height: 1, background: border, margin: "10px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontWeight: 700 }}>Total</span>
                    <span style={{ color: teal, fontWeight: 800, fontSize: 18 }}>GH₵{vehicle.price}</span>
                  </div>
                </div>
                <button onClick={handlePay}
                  style={{ width: "100%", padding: 18, background: teal, color: "#000", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "0.3px" }}>
                  💳 Pay with Mobile Money
                </button>
                <p style={{ color: "#555", textAlign: "center", fontSize: 11, marginTop: 8 }}>
                  Secured by Paystack • MTN • Vodafone • AirtelTigo
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div style={{ padding: "16px" }}>
          <h2 style={{ color: "#fff", marginBottom: 4, fontSize: 18, fontWeight: 800 }}>Charging History</h2>
          <p style={{ color: "#7a9a85", fontSize: 13, marginBottom: 16 }}>Your past EcoCharge sessions</p>
          {history.length === 0 ? (
            <div style={{ background: card, borderRadius: 16, padding: 32, textAlign: "center", border: `1px solid ${border}` }}>
              <p style={{ fontSize: 48, marginBottom: 8 }}>🔋</p>
              <p style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>No charges yet!</p>
              <p style={{ color: "#7a9a85", fontSize: 13 }}>Your charging history will appear here</p>
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{h.station}</span>
                  <span style={{ color: teal, fontWeight: 800, fontSize: 15 }}>GH₵{h.amount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ background: "#0d2018", color: teal, fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>{h.vehicle}</span>
                  <span style={{ color: "#555", fontSize: 12 }}>{h.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: card, borderTop: `1px solid ${border}`, display: "flex", padding: "10px 0 14px" }}>
        {[
          { id: "map", icon: "⚡", label: "Stations" },
          { id: "history", icon: "📋", label: "History" },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); setVehicle(null); }}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? teal : "#555", padding: "4px 0", transition: "all 0.2s" }}>
            <div style={{ fontSize: 22 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, marginTop: 2 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
