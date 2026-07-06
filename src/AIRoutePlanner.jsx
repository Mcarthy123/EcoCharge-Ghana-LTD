// ============================================================
// EcoCharge Ghana — AI Route Planner (Premium Feature)
// Self-contained module. Does not modify existing App.jsx architecture.
//
// NOTE ON DATA SOURCES:
// - GoogleMapsService below uses OSRM (routing) + Nominatim (geocoding)
//   because no VITE_GOOGLE_MAPS_KEY is configured. Swap the two fetch
//   calls inside GoogleMapsService for real Google Directions/Places
//   calls later — everything downstream (BatteryPredictionService,
//   TripPlannerService, UI) is source-agnostic and won't need changes.
// - AIRecommendationService is rule-based (computed from real trip
//   numbers), not an LLM call. Your FBC analyzer already has a
//   Supabase Edge Function -> Anthropic pattern if you want to upgrade
//   this to real generated narrative text later.
// ============================================================
import { useState, useEffect, useRef } from "react";

// ── SHARED CONSTANTS ─────────────────────────────────────────
const CONSUMPTION_DEFAULTS = { // kWh per km, used only if vehicle has no battery/range on file
  "Electric Car": 0.18,
  "Electric Motorcycle": 0.045,
  "Electric Tricycle": 0.07,
  "Electric Bus": 1.0,
  "Electric Van": 0.22,
  "Other": 0.18,
};
const RESERVE_PCT = 12;        // never plan to arrive below this battery %
const CHARGE_TARGET_PCT = 80;  // default fast-charge target at a stop
const DEFAULT_CHARGER_KW = 60; // assumed DC fast charger power if unknown
const STATION_CORRIDOR_KM = 20; // how far off-route a station can be and still count

// ── GEO HELPERS ───────────────────────────────────────────────
const toRad = (d) => (d * Math.PI) / 180;
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const projectOntoRoute = (routeCoords, cumulative, point) => {
  let best = { dist: Infinity, alongKm: 0, idx: 0 };
  for (let i = 0; i < routeCoords.length; i++) {
    const [lat, lng] = routeCoords[i];
    const d = haversine(lat, lng, point.lat, point.lng);
    if (d < best.dist) best = { dist: d, alongKm: cumulative[i], idx: i };
  }
  return best;
};

// ── GOOGLE MAPS SERVICE (OSRM + Nominatim backend) ────────────
const GoogleMapsService = {
  async geocodeSearch(query) {
    if (!query || query.trim().length < 3) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=gh&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      return Array.isArray(data) ? data.map(d => ({
        label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon),
      })) : [];
    } catch(e) { return []; }
  },

  async getRoute(origin, destination) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data?.routes?.length) throw new Error("No route found between these locations.");
    const r = data.routes[0];
    const coords = r.geometry.coordinates.map(([lng,lat]) => [lat,lng]);
    const cumulative = [0];
    for (let i = 1; i < coords.length; i++) {
      cumulative.push(cumulative[i-1] + haversine(coords[i-1][0],coords[i-1][1],coords[i][0],coords[i][1]));
    }
    return {
      coords, cumulative,
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  },

  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },

  watchPosition(onUpdate, onError) {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      pos => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => onError?.(err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  },

  clearWatch(id) { if (id != null) navigator.geolocation.clearWatch(id); },
};

// ── VEHICLE SERVICE ────────────────────────────────────────────
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

  consumptionPerKm(vehicle) {
    if (vehicle?.battery_capacity && vehicle?.estimated_range) {
      const rate = vehicle.battery_capacity / vehicle.estimated_range;
      if (rate > 0 && rate < 5) return rate;
    }
    return CONSUMPTION_DEFAULTS[vehicle?.vehicle_type] || CONSUMPTION_DEFAULTS.Other;
  },

  batteryCapacity(vehicle) {
    return vehicle?.battery_capacity || 50;
  },
};

// ── CHARGING STATION SERVICE ──────────────────────────────────
const ChargingStationService = {
  candidatesAlongRoute(stations, route) {
    return stations
      .filter(s => s.lat && s.lng)
      .map(s => {
        const proj = projectOntoRoute(route.coords, route.cumulative, { lat:s.lat, lng:s.lng });
        return { ...s, alongKm: proj.alongKm, offRouteKm: proj.dist };
      })
      .filter(s => s.offRouteKm <= STATION_CORRIDOR_KM)
      .filter(s => s.open > 0)
      .sort((a,b) => a.alongKm - b.alongKm);
  },

  async chargerInfo(stationId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!SUPABASE_URL) return { powerKw: DEFAULT_CHARGER_KW, pricePerKwh: 0.85 };
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chargers?station_id=eq.${stationId}&select=power_kw,max_power_kw,price_per_kwh,rate_per_kwh&limit=1`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const c = data?.[0];
      return {
        powerKw: c?.power_kw || c?.max_power_kw || DEFAULT_CHARGER_KW,
        pricePerKwh: c?.price_per_kwh || c?.rate_per_kwh || 0.85,
      };
    } catch(e) { return { powerKw: DEFAULT_CHARGER_KW, pricePerKwh: 0.85 }; }
  },
};

// ── BATTERY PREDICTION SERVICE ─────────────────────────────────
const BatteryPredictionService = {
  trafficFactor() {
    const hour = new Date().getHours();
    const rush = (hour>=7 && hour<=9) || (hour>=16 && hour<=19);
    return { label: rush ? "Heavy" : "Low", multiplier: rush ? 1.08 : 1.0 };
  },

  energyForLegKWh(distanceKm, consumptionPerKm, trafficMultiplier) {
    return distanceKm * consumptionPerKm * trafficMultiplier;
  },
};

// ── WALLET SERVICE ─────────────────────────────────────────────
const WalletService = {
  async getBalance(userId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!SUPABASE_URL || !userId) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&select=balance_pesewas`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      return data?.[0]?.balance_pesewas ?? null;
    } catch(e) { return null; }
  },
};

// ── TRIP PLANNER SERVICE (the core algorithm) ──────────────────
const TripPlannerService = {
  async planTrip({ origin, destination, vehicle, batteryPct, preference, stations, SUPABASE_URL, SUPABASE_ANON, getToken }) {
    const route = await GoogleMapsService.getRoute(origin, destination);
    const candidates = ChargingStationService.candidatesAlongRoute(stations, route);
    const capacityKWh = VehicleService.batteryCapacity(vehicle);
    const consumptionPerKm = VehicleService.consumptionPerKm(vehicle);
    const traffic = BatteryPredictionService.trafficFactor();

    let remainingKWh = capacityKWh * (batteryPct/100);
    const reserveKWh = capacityKWh * (RESERVE_PCT/100);
    let lastKm = 0;
    const stops = [];
    let totalChargingTime = 0;
    let totalChargingCost = 0;

    const scoreStation = async (s) => {
      const info = await ChargingStationService.chargerInfo(s.id, SUPABASE_URL, SUPABASE_ANON, getToken);
      let score = 0;
      if (preference === "Cheapest") score = -info.pricePerKwh;
      else if (preference === "Fastest") score = info.powerKw;
      else if (preference === "Eco-Friendly") score = s.solar || 0;
      else if (preference === "Least Charging Stops") score = s.alongKm;
      return { ...s, ...info, score };
    };

    let unvisited = candidates.slice();

    while (true) {
      const legToDestKm = route.distanceKm - lastKm;
      const energyToDest = BatteryPredictionService.energyForLegKWh(legToDestKm, consumptionPerKm, traffic.multiplier);

      if (remainingKWh - energyToDest >= reserveKWh) break;

      const maxReachKm = remainingKWh > reserveKWh
        ? ((remainingKWh - reserveKWh) / (consumptionPerKm * traffic.multiplier))
        : 0;
      const reachable = unvisited.filter(s => s.alongKm > lastKm && (s.alongKm - lastKm) <= maxReachKm);

      if (reachable.length === 0) {
        return {
          feasible: false,
          reason: "No available charging station is reachable from your current battery level along this route.",
          route, distanceKm: route.distanceKm, durationMin: route.durationMin, traffic,
        };
      }

      const scored = await Promise.all(reachable.map(scoreStation));
      scored.sort((a,b) => b.score - a.score);
      const chosen = preference === "Least Charging Stops"
        ? scored.reduce((a,b)=> b.alongKm > a.alongKm ? b : a)
        : scored[0];

      const legKm = chosen.alongKm - lastKm;
      const energyUsed = BatteryPredictionService.energyForLegKWh(legKm, consumptionPerKm, traffic.multiplier);
      remainingKWh -= energyUsed;
      const arrivalPct = Math.max(0, Math.round((remainingKWh/capacityKWh)*100));

      const targetPct = Math.max(CHARGE_TARGET_PCT, RESERVE_PCT + 15);
      const targetKWh = capacityKWh * (targetPct/100);
      const energyAdded = Math.max(0, targetKWh - remainingKWh);
      const chargeMinutes = Math.round((energyAdded / chosen.powerKw) * 60);
      const cost = +(energyAdded * chosen.pricePerKwh).toFixed(2);

      stops.push({
        ...chosen,
        arrivalBatteryPct: arrivalPct,
        chargeToPct: targetPct,
        energyAddedKWh: +energyAdded.toFixed(2),
        chargeMinutes,
        cost,
        waitMinutes: 0,
      });

      totalChargingTime += chargeMinutes;
      totalChargingCost += cost;
      remainingKWh = targetKWh;
      lastKm = chosen.alongKm;
      unvisited = unvisited.filter(s => s.id !== chosen.id);
    }

    const finalLegKm = route.distanceKm - lastKm;
    const finalEnergy = BatteryPredictionService.energyForLegKWh(finalLegKm, consumptionPerKm, traffic.multiplier);
    remainingKWh -= finalEnergy;
    const batteryAtArrivalPct = Math.max(0, Math.round((remainingKWh/capacityKWh)*100));

    return {
      feasible: true,
      route, distanceKm: route.distanceKm, durationMin: route.durationMin + totalChargingTime,
      driveDurationMin: route.durationMin, traffic,
      stops, totalChargingTime, totalChargingCost: +totalChargingCost.toFixed(2),
      batteryAtArrivalPct, consumptionPerKm, capacityKWh,
    };
  },
};

// ── AI RECOMMENDATION SERVICE (rule-based) ─────────────────────
const AIRecommendationService = {
  generate(trip, walletBalancePesewas) {
    if (!trip.feasible) return [`Warning: ${trip.reason}`];
    const notes = [];
    if (trip.stops.length === 0) {
      notes.push("No charging stop required — your battery comfortably covers this trip.");
    } else {
      const avgPrice = trip.stops.reduce((a,s)=>a+s.pricePerKwh,0)/trip.stops.length;
      trip.stops.forEach(s => {
        if (s.pricePerKwh < avgPrice - 0.05) {
          const savings = ((avgPrice - s.pricePerKwh) * s.energyAddedKWh).toFixed(2);
          notes.push(`Charging at ${s.name} could save about GH₵${savings} versus the average rate on this route.`);
        }
      });
      if (trip.batteryAtArrivalPct < 15) {
        notes.push(`Your battery is projected to arrive around ${trip.batteryAtArrivalPct}% — consider adding a short top-up at your last stop.`);
      }
    }
    if (trip.traffic.label === "Heavy") {
      notes.push("Heavy traffic conditions may increase energy consumption by roughly 8% on this route.");
    }
    if (walletBalancePesewas != null && trip.totalChargingCost > 0) {
      const balGHS = walletBalancePesewas/100;
      if (balGHS < trip.totalChargingCost) {
        notes.push(`Your wallet balance (GH₵${balGHS.toFixed(2)}) is below the estimated charging cost (GH₵${trip.totalChargingCost.toFixed(2)}) — top up before you go.`);
      }
    }
    return notes;
  },
};

// ── SMALL UI PRIMITIVES ─────────────────────────────────────────
const Spinner = ({ color }) => (
  <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${color}`,borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite" }}/>
);

const GlassCard = ({ T, children, style }) => (
  <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, backdropFilter:"blur(10px)", ...style }}>
    {children}
  </div>
);

// ── LEAFLET LOADER ───────────────────────────────────────────────
const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) { resolve(); return; }
  if (!document.getElementById("lcss")) {
    const l=document.createElement("link"); l.id="lcss"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
  }
  const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=resolve; document.head.appendChild(s);
});

function RouteMap({ T, route, stops, currentPos, destination }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(()=>{
    let cancelled = false;
    loadLeaflet().then(()=>{
      if (cancelled || !mapRef.current || mapInst.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { attributionControl:false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{ maxZoom:18 }).addTo(map);
      mapInst.current = map;

      if (route?.coords?.length) {
        const line = L.polyline(route.coords, { color:T.green, weight:4, opacity:0.85 }).addTo(map);
        map.fitBounds(line.getBounds(), { padding:[24,24] });
      }
      stops?.forEach(s=>{
        const icon = L.divIcon({ html:`<div style="width:30px;height:30px;border-radius:50%;background:${T.yellow};display:flex;align-items:center;justify-content:center;border:2px solid #000;font-size:14px;">⚡</div>`, className:"", iconSize:[30,30] });
        L.marker([s.lat,s.lng],{ icon }).addTo(map).bindPopup(`${s.name} · charge to ${s.chargeToPct}%`);
      });
      if (destination) {
        const dIcon = L.divIcon({ html:`<div style="width:26px;height:26px;border-radius:50%;background:${T.red};border:2px solid #fff;"></div>`, className:"", iconSize:[26,26] });
        L.marker([destination.lat,destination.lng],{ icon:dIcon }).addTo(map);
      }
    });
    return ()=>{ cancelled = true; if (mapInst.current) { mapInst.current.remove(); mapInst.current=null; } };
  }, [route]);

  const posMarker = useRef(null);
  useEffect(()=>{
    if (!mapInst.current || !currentPos || !window.L) return;
    const L = window.L;
    if (posMarker.current) posMarker.current.setLatLng([currentPos.lat,currentPos.lng]);
    else {
      const icon = L.divIcon({ html:`<div style="width:18px;height:18px;border-radius:50%;background:${T.blue};border:3px solid #fff;box-shadow:0 0 0 4px rgba(56,189,248,0.3);"></div>`, className:"", iconSize:[18,18] });
      posMarker.current = L.marker([currentPos.lat,currentPos.lng],{ icon }).addTo(mapInst.current);
    }
  }, [currentPos]);

  return <div ref={mapRef} style={{ width:"100%",height:"100%" }}/>;
}

// ── SEARCH INPUT (Nominatim autocomplete) ──────────────────────
function PlaceSearchInput({ T, label, icon, value, onSelect, placeholder }) {
  const [query, setQuery] = useState(value?.label || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (v) => {
    setQuery(v);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async ()=>{
      const r = await GoogleMapsService.geocodeSearch(v);
      setResults(r);
    }, 400);
  };

  return (
    <div style={{ marginBottom:14, position:"relative" }}>
      <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>{label}</div>
      <div style={{ position:"relative" }}>
        <i className={`fas ${icon}`} style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:13 }}/>
        <input value={query} placeholder={placeholder} onChange={e=>handleChange(e.target.value)} onFocus={()=>setOpen(true)}
          style={{ width:"100%",background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px 13px 40px",color:T.text,fontSize:14,fontFamily:"inherit" }}/>
      </div>
      {open && results.length > 0 && (
        <div style={{ position:"absolute",top:"100%",left:0,right:0,zIndex:20,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,marginTop:4,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
          {results.map((r,i)=>(
            <div key={i} className="tap row" onClick={()=>{ onSelect(r); setQuery(r.label); setOpen(false); }}
              style={{ padding:"10px 14px",fontSize:12,color:T.text,borderBottom:i<results.length-1?`1px solid ${T.border}20`:"none",cursor:"pointer" }}>
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────
export default function AIRoutePlanner({ go, user, stations, T, getToken, SUPABASE_URL, SUPABASE_ANON }) {
  const [step, setStep] = useState("input");
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [usingCurrentLoc, setUsingCurrentLoc] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [batteryPct, setBatteryPct] = useState(70);
  const [preference, setPreference] = useState("Fastest");
  const [error, setError] = useState("");
  const [trip, setTrip] = useState(null);
  const [walletBal, setWalletBal] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [nextStopIdx, setNextStopIdx] = useState(0);
  const watchIdRef = useRef(null);

  useEffect(()=>{
    if (!user?.id) return;
    VehicleService.loadUserVehicles(user.id, SUPABASE_URL, SUPABASE_ANON, getToken).then(v=>{
      setVehicles(v);
      const def = v.find(x=>x.is_default) || v[0];
      if (def) setSelectedVehicle(def);
    });
    WalletService.getBalance(user.id, SUPABASE_URL, SUPABASE_ANON, getToken).then(setWalletBal);
  }, [user]);

  const useMyLocation = async () => {
    try {
      const pos = await GoogleMapsService.getCurrentPosition();
      setFromPlace({ label:"Current Location", lat:pos.lat, lng:pos.lng });
      setUsingCurrentLoc(true);
    } catch(e) { setError("Couldn't get your current location. Enable location access or search manually."); }
  };

  const planJourney = async () => {
    if (!fromPlace) { setError("Please set your starting point."); return; }
    if (!toPlace) { setError("Please set your destination."); return; }
    if (!selectedVehicle) { setError("Please select a vehicle."); return; }
    setError(""); setStep("planning");
    try {
      const result = await TripPlannerService.planTrip({
        origin: fromPlace, destination: toPlace, vehicle: selectedVehicle,
        batteryPct, preference, stations, SUPABASE_URL, SUPABASE_ANON, getToken,
      });
      setTrip(result);
      setStep("results");
    } catch(e) {
      setError(e.message || "Could not plan this route. Please check both locations and try again.");
      setStep("input");
    }
  };

  const startTrip = () => {
    setStep("trip");
    setNextStopIdx(0);
    watchIdRef.current = GoogleMapsService.watchPosition(
      (pos) => setCurrentPos(pos),
      () => {}
    );
  };

  const endTrip = () => {
    GoogleMapsService.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setStep("results");
  };

  useEffect(()=>()=>{ GoogleMapsService.clearWatch(watchIdRef.current); }, []);

  const distToNextStop = (() => {
    if (!trip?.stops?.[nextStopIdx] || !currentPos) return null;
    const s = trip.stops[nextStopIdx];
    return haversine(currentPos.lat, currentPos.lng, s.lat, s.lng);
  })();

  const arrivedAtStop = distToNextStop != null && distToNextStop < 0.3;

  if (step === "input") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,background:T.bg }}>
        <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>AI Route Planner</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Smart trip planning with charging stops</div>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"18px 16px 100px" }}>
        <GlassCard T={T} style={{ padding:16, marginBottom:16 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
            <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5 }}>From</div>
            <button onClick={useMyLocation} className="tap" style={{ background:"none",border:"none",color:T.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              <i className="fas fa-location-crosshairs" style={{ marginRight:5 }}/>Use current location
            </button>
          </div>
          {usingCurrentLoc && fromPlace ? (
            <div style={{ background:T.inputBg,border:`1px solid ${T.green}44`,borderRadius:12,padding:"13px 14px",display:"flex",alignItems:"center",gap:10 }}>
              <i className="fas fa-location-crosshairs" style={{ color:T.green,fontSize:13 }}/>
              <span style={{ fontSize:13,color:T.text,fontWeight:600 }}>Current Location</span>
              <button onClick={()=>{ setFromPlace(null); setUsingCurrentLoc(false); }} className="tap" style={{ marginLeft:"auto",background:"none",border:"none",color:T.muted,cursor:"pointer" }}><i className="fas fa-times"/></button>
            </div>
          ) : (
            <PlaceSearchInput T={T} label="" icon="fa-map-marker-alt" value={fromPlace} placeholder="Search starting point" onSelect={setFromPlace}/>
          )}
        </GlassCard>

        <GlassCard T={T} style={{ padding:16, marginBottom:16 }}>
          <PlaceSearchInput T={T} label="Destination" icon="fa-flag-checkered" value={toPlace} placeholder="Where are you going?" onSelect={setToPlace}/>
        </GlassCard>

        <GlassCard T={T} style={{ padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Vehicle</div>
          {vehicles.length === 0 ? (
            <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>
              No vehicles on file. <span onClick={()=>go("myvehicles")} style={{ color:T.green,fontWeight:700,cursor:"pointer" }}>Add a vehicle</span> to get accurate range predictions.
            </div>
          ) : (
            <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:2 }}>
              {vehicles.map(v=>(
                <button key={v.id} onClick={()=>setSelectedVehicle(v)} className="tap"
                  style={{ flexShrink:0,background:selectedVehicle?.id===v.id?`${T.green}18`:T.inputBg,border:`1.5px solid ${selectedVehicle?.id===v.id?T.green:T.border}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                  <div style={{ fontWeight:700,fontSize:12,color:T.text }}>{v.nickname}</div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{v.manufacturer} {v.model}</div>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard T={T} style={{ padding:16, marginBottom:16 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5 }}>Current Battery</span>
            <span style={{ fontSize:16,fontWeight:800,color:T.green }}>{batteryPct}%</span>
          </div>
          <input type="range" min={5} max={100} value={batteryPct} onChange={e=>setBatteryPct(parseInt(e.target.value))}
            style={{ width:"100%", accentColor:T.green }}/>
        </GlassCard>

        <GlassCard T={T} style={{ padding:16, marginBottom:20 }}>
          <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Preferred Route</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {["Fastest","Cheapest","Least Charging Stops","Eco-Friendly"].map(p=>(
              <button key={p} onClick={()=>setPreference(p)} className="tap"
                style={{ background:preference===p?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.inputBg,border:`1px solid ${preference===p?T.green:T.border}`,borderRadius:10,padding:"11px 8px",fontSize:12,fontWeight:700,color:preference===p?"#000":T.muted,cursor:"pointer",fontFamily:"inherit" }}>
                {p}
              </button>
            ))}
          </div>
        </GlassCard>

        {error && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:14,color:T.red,fontSize:12 }}>{error}</div>}

        <button onClick={planJourney} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"17px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 20px rgba(34,197,94,0.35)` }}>
          <i className="fas fa-route"/> Plan My Journey
        </button>
      </div>
    </div>
  );

  if (step === "planning") return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,alignItems:"center",justifyContent:"center",gap:18 }}>
      <div style={{ width:70,height:70,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Spinner color={T.green}/>
      </div>
      <div style={{ fontWeight:700,fontSize:15,color:T.text }}>Calculating your route…</div>
      <div style={{ fontSize:12,color:T.muted }}>Routing · battery prediction · charging stops</div>
    </div>
  );

  if (step === "results" && trip) {
    const recs = AIRecommendationService.generate(trip, walletBal);
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}` }}>
          <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
            <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
          </button>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Trip Plan</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 110px" }}>
          {!trip.feasible ? (
            <GlassCard T={T} style={{ padding:20, textAlign:"center" }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize:32,color:T.red,marginBottom:12,display:"block" }}/>
              <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:8 }}>Route Not Feasible</div>
              <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>{trip.reason}</div>
            </GlassCard>
          ) : (
            <>
              <div style={{ height:220,borderRadius:18,overflow:"hidden",marginBottom:14,border:`1px solid ${T.border}` }}>
                <RouteMap T={T} route={trip.route} stops={trip.stops} destination={toPlace}/>
              </div>

              <GlassCard T={T} style={{ padding:18, marginBottom:14 }}>
                <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:14 }}>Trip Summary</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  {[
                    { label:"Distance", value:`${trip.distanceKm.toFixed(0)} km` },
                    { label:"Estimated Drive", value:`${Math.floor(trip.driveDurationMin/60)}h ${Math.round(trip.driveDurationMin%60)}m` },
                    { label:"Battery at Arrival", value:`${trip.batteryAtArrivalPct}%`, color: trip.batteryAtArrivalPct<15?T.red:T.green },
                    { label:"Charging Stops", value: trip.stops.length },
                    { label:"Charging Time", value: trip.totalChargingTime>0?`${trip.totalChargingTime} min`:"—" },
                    { label:"Estimated Cost", value:`GH₵${trip.totalChargingCost.toFixed(2)}` },
                    { label:"Wallet Balance", value: walletBal!=null?`GH₵${(walletBal/100).toFixed(2)}`:"—" },
                    { label:"Traffic", value: trip.traffic.label },
                  ].map(r=>(
                    <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                      <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>{r.label}</div>
                      <div style={{ fontWeight:800,fontSize:15,color:r.color||T.text,marginTop:3 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {recs.length>0 && (
                <GlassCard T={T} style={{ padding:16, marginBottom:14, background:T.highlightGrad2 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:T.green,marginBottom:10 }}><i className="fas fa-brain" style={{ marginRight:8 }}/>Smart Recommendations</div>
                  {recs.map((r,i)=>(
                    <div key={i} style={{ fontSize:12,color:T.mutedLight,lineHeight:1.7,marginBottom:i<recs.length-1?8:0,paddingLeft:14,position:"relative" }}>
                      <span style={{ position:"absolute",left:0 }}>•</span>{r}
                    </div>
                  ))}
                </GlassCard>
              )}

              {trip.stops.length === 0 ? (
                <GlassCard T={T} style={{ padding:16, marginBottom:14, textAlign:"center" }}>
                  <i className="fas fa-check-circle" style={{ fontSize:22,color:T.green,marginBottom:8,display:"block" }}/>
                  <div style={{ fontWeight:700,fontSize:13,color:T.green }}>No charging stop required</div>
                </GlassCard>
              ) : (
                <>
                  <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Charging Stops</div>
                  {trip.stops.map((s,i)=>(
                    <GlassCard key={s.id} T={T} style={{ padding:16, marginBottom:10 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                        <div>
                          <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{i+1}. {s.name}</div>
                          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{s.city} · {s.open}/{s.bays} bays open</div>
                        </div>
                        <div style={{ background:`${T.green}18`,borderRadius:8,padding:"3px 10px" }}>
                          <span style={{ fontSize:10,fontWeight:700,color:T.green }}>Open</span>
                        </div>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10 }}>
                        {[
                          { label:"Charge Speed", value:`${s.powerKw} kW` },
                          { label:"Charging Time", value:`${s.chargeMinutes} min` },
                          { label:"Price/kWh", value:`GH₵${s.pricePerKwh.toFixed(2)}` },
                          { label:"Battery on Arrival", value:`${s.arrivalBatteryPct}%` },
                          { label:"Charging to", value:`${s.chargeToPct}%` },
                          { label:"Est. Cost", value:`GH₵${s.cost.toFixed(2)}` },
                        ].map(r=>(
                          <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:8,padding:"8px",textAlign:"center" }}>
                            <div style={{ fontWeight:700,fontSize:12,color:T.text }}>{r.value}</div>
                            <div style={{ fontSize:8,color:T.muted,marginTop:3,textTransform:"uppercase" }}>{r.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:11,color:T.muted,marginBottom:10 }}>
                        <i className="fas fa-plug" style={{ marginRight:5 }}/>Compatible with {selectedVehicle?.connector_type || "your vehicle's connector"}
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                        <button onClick={()=>go("map")} className="tap" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                          <i className="fas fa-directions" style={{ marginRight:6 }}/>Navigate
                        </button>
                        <button onClick={()=>go("booking")} className="tap" style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                          <i className="fas fa-calendar-check" style={{ marginRight:6 }}/>Reserve
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </>
              )}

              <button onClick={startTrip} className="tap"
                style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"17px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginTop:6 }}>
                <i className="fas fa-play"/> Start Trip
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === "trip") {
    const nextStop = trip.stops[nextStopIdx];
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}` }}>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:T.text }}>Trip in Progress</div>
            <div style={{ fontSize:11,color:T.green,marginTop:2 }}><i className="fas fa-circle" style={{ fontSize:6,marginRight:6 }}/>Live tracking</div>
          </div>
          <button onClick={endTrip} className="tap" style={{ background:"none",border:`1px solid ${T.red}`,borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,color:T.red,cursor:"pointer",fontFamily:"inherit" }}>End Trip</button>
        </div>

        <div style={{ height:260,flexShrink:0 }}>
          <RouteMap T={T} route={trip.route} stops={trip.stops} currentPos={currentPos} destination={toPlace}/>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 100px" }}>
          {!currentPos && (
            <div style={{ textAlign:"center",padding:"10px 0",color:T.muted,fontSize:12,marginBottom:10 }}><Spinner color={T.green}/> Acquiring GPS signal…</div>
          )}

          {nextStop ? (
            <GlassCard T={T} style={{ padding:18, marginBottom:14 }}>
              <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>Next Charging Stop</div>
              <div style={{ fontWeight:800,fontSize:17,color:T.text,marginBottom:4 }}>{nextStop.name}</div>
              <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>
                {distToNextStop!=null ? `${distToNextStop.toFixed(1)} km away` : "Calculating distance…"}
              </div>
              {arrivedAtStop ? (
                <button onClick={()=>setStep("arrived")} className="tap"
                  style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-map-pin" style={{ marginRight:8 }}/>I've Arrived
                </button>
              ) : (
                <div style={{ fontSize:11,color:T.muted }}>You'll be prompted automatically when you're within 300m.</div>
              )}
            </GlassCard>
          ) : (
            <GlassCard T={T} style={{ padding:18, marginBottom:14, textAlign:"center" }}>
              <i className="fas fa-flag-checkered" style={{ fontSize:22,color:T.green,marginBottom:8,display:"block" }}/>
              <div style={{ fontWeight:700,fontSize:13,color:T.text }}>No further stops — heading to destination</div>
            </GlassCard>
          )}

          <GlassCard T={T} style={{ padding:16 }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Distance Remaining</div>
                <div style={{ fontWeight:800,fontSize:15,color:T.text,marginTop:3 }}>{(trip.distanceKm - (nextStop?.alongKm||trip.distanceKm)).toFixed(0)} km</div>
              </div>
              <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Battery Target</div>
                <div style={{ fontWeight:800,fontSize:15,color:T.green,marginTop:3 }}>{trip.batteryAtArrivalPct}% at arrival</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (step === "arrived") {
    const stop = trip.stops[nextStopIdx];
    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg,alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ width:90,height:90,borderRadius:"50%",background:`${T.green}18`,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20 }}>
          <i className="fas fa-charging-station" style={{ fontSize:36,color:T.green }}/>
        </div>
        <div style={{ fontWeight:800,fontSize:19,color:T.text,marginBottom:6,textAlign:"center" }}>You've arrived at {stop.name}</div>
        <div style={{ fontSize:13,color:T.muted,marginBottom:24,textAlign:"center" }}>
          {selectedVehicle?.nickname} · {selectedVehicle?.connector_type || "Standard connector"}
        </div>
        <div style={{ width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:10 }}>
          <button onClick={()=>go("chargenow")} className="tap"
            style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
            <i className="fas fa-bolt" style={{ marginRight:8 }}/>Start Charging
          </button>
          <button onClick={()=>go("scan")} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
            <i className="fas fa-qrcode" style={{ marginRight:8 }}/>Scan QR Instead
          </button>
          <button onClick={()=>{ setNextStopIdx(i=>i+1); setStep("trip"); }} className="tap"
            style={{ background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:8 }}>
            Continue trip without charging here
          </button>
        </div>
      </div>
    );
  }

  return null;
}
