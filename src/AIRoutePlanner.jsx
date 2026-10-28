// ============================================================
// EcoCharge Ghana — AI Intelligence System
// (formerly AI Route Planner — extended, not replaced)
// Self-contained module. Does not modify existing App.jsx architecture.
// App.jsx still imports this file as `AIRoutePlanner` — no App.jsx changes needed.
//
// TWO MODES, ONE ASSISTANT:
//   Mode 1 — Smart Trip Planner   (destination outside current city)
//   Mode 2 — Smart Driver Assistant (default landing / local driving)
//
// HONESTY NOTES (read before wiring real hardware later):
// - "Current battery %" is manual input, persisted locally. No EV in this
//   app reports live state-of-charge over a network connection (that needs
//   an OCPP/CAN telemetry link this project doesn't have yet).
// - Queue/wait messaging is present-tense only (based on the `open` bay
//   count snapshot). Trend claims like "queue reducing in 8 minutes" would
//   need time-series queue history, which isn't collected anywhere yet.
// - Fleet analytics aggregate real data where charging_sessions can be
//   matched to a vehicle, and fall back to vehicle-level estimates
//   otherwise, because charging_sessions has no vehicle_id column today.
// - GoogleMapsService uses OSRM + Nominatim (no Google Maps key configured).
// - All "AI recommendations" are rule-based off real numbers, not an LLM call.
// ============================================================
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

// ── SHARED CONSTANTS ─────────────────────────────────────────
const CONSUMPTION_DEFAULTS = {
  "Electric Car": 0.18,
  "Electric Motorcycle": 0.045,
  "Electric Tricycle": 0.07,
  "Electric Bus": 1.0,
  "Electric Van": 0.22,
  "Other": 0.18,
};
const RESERVE_PCT = 12;
const CHARGE_TARGET_PCT = 80;
const DEFAULT_CHARGER_KW = 60;
const STATION_CORRIDOR_KM = 20;
const LOCAL_CITY_RADIUS_KM = 15; // destinations inside this radius = Mode 2 territory, not a "trip"
const BATTERY_STORAGE_KEY = "eco_ai_battery_state";
const NOTIF_COOLDOWN_MS = 2 * 60 * 60 * 1000; // don't repeat the same nudge more than once per 2h
const NOTIF_LOG_KEY = "eco_ai_notif_log";

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
    return { coords, cumulative, distanceKm: r.distance / 1000, durationMin: r.duration / 60 };
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

  batteryCapacity(vehicle) { return vehicle?.battery_capacity || 50; },

  remainingRangeKm(vehicle, batteryPct) {
    const cap = this.batteryCapacity(vehicle);
    const rate = this.consumptionPerKm(vehicle);
    return Math.max(0, (cap * (batteryPct/100)) / rate);
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

  nearestStations(stations, point, limit=6) {
    return stations
      .filter(s => s.lat && s.lng)
      .map(s => ({ ...s, distanceKm: haversine(point.lat, point.lng, s.lat, s.lng) }))
      .sort((a,b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  },

  async chargerInfo(stationId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    const fallback = { powerKw: DEFAULT_CHARGER_KW, pricePerKwh: 0.85, powerIsDefault: true, priceIsDefault: true };
    if (!SUPABASE_URL) return fallback;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chargers?station_id=eq.${stationId}&select=power_kw,max_power_kw,price_per_kwh,rate_per_kwh&limit=1`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const c = data?.[0];
      const kw = c?.power_kw || c?.max_power_kw;
      const price = c?.price_per_kwh || c?.rate_per_kwh;
      return {
        powerKw: kw || DEFAULT_CHARGER_KW,
        pricePerKwh: price || 0.85,
        powerIsDefault: !kw,     // true = placeholder, not a real figure
        priceIsDefault: !price,
      };
    } catch(e) { return fallback; }
  },

  // present-tense only — no queue history exists to predict trends
  queueEstimate(station) {
    if (station.open <= 0) return { level:"busy", label:"No bays open right now — expect a wait", minutes:15 };
    const ratio = station.open / (station.bays || station.open || 1);
    if (ratio < 0.34) return { level:"tight", label:`${station.open} of ${station.bays} bays open — short wait possible`, minutes:5 };
    return { level:"clear", label:`${station.open} of ${station.bays} bays open`, minutes:0 };
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

  // simple, honest heuristics — not a real battery-health model (needs cycle-count/temperature telemetry for that)
  healthTips(fastChargesToday) {
    const tips = [];
    if (fastChargesToday >= 2) tips.push("Two or more fast charges today — where possible, let the battery cool between sessions to help long-term battery health.");
    tips.push("Charging to 80% instead of 100% for daily driving is generally gentler on battery lifespan; reserve full charges for long trips.");
    return tips;
  },

  recommendedChargingWindow() {
    const hour = new Date().getHours();
    if (hour>=22 || hour<5) return "Now is typically a low-traffic window — good time to charge if you're near a station.";
    if (hour>=7 && hour<=9) return "You're in the morning rush window — stations may be busier than usual.";
    if (hour>=16 && hour<=19) return "Evening rush hour — expect higher demand at nearby stations.";
    return "Current conditions look normal for charging.";
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

// ── TRIP LOG SERVICE (real trip logging — powers EcoRewards trip_completed points) ──
const TripLogService = {
  async start({ userId, vehicleId, originLabel, destinationLabel, distanceKm, stopsCount, SUPABASE_URL, SUPABASE_ANON, getToken }) {
    if (!SUPABASE_URL || !userId) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_trips`, {
        method:"POST",
        headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=representation" },
        body: JSON.stringify({ user_id:userId, vehicle_id:vehicleId||null, origin_label:originLabel, destination_label:destinationLabel, distance_km:distanceKm, stops_count:stopsCount, status:"in_progress" }),
      });
      const data = await res.json();
      return Array.isArray(data) ? data[0] : null;
    } catch(e) { return null; }
  },
  // arrived=true only when GPS confirms proximity to the destination — no
  // points are awarded for simply tapping "End Trip" from somewhere else.
  async finish({ tripId, userId, arrived, SUPABASE_URL, SUPABASE_ANON, getToken }) {
    if (!SUPABASE_URL || !tripId) return null;
    const status = arrived ? "completed" : "ended_early";
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ai_trips?id=eq.${tripId}`, {
        method:"PATCH",
        headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify({ status, completed_at:new Date().toISOString() }),
      });
      if (arrived && userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/award_points`, {
          method:"POST",
          headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json" },
          body: JSON.stringify({ p_user_id:userId, p_action_key:"trip_completed", p_source_type:"trip", p_source_id:tripId }),
        });
      }
    } catch(e) {}
    return null;
  },
};

// ── NOTIFICATION SERVICE (writes to the same `notifications` table the rest of the app uses) ──
const NotificationService = {
  _readLog() {
    try { return JSON.parse(localStorage.getItem(NOTIF_LOG_KEY) || "{}"); } catch(e) { return {}; }
  },
  _writeLog(log) {
    try { localStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(log)); } catch(e) {}
  },
  canSend(key) {
    const log = this._readLog();
    const last = log[key];
    return !last || (Date.now() - last) > NOTIF_COOLDOWN_MS;
  },
  markSent(key) {
    const log = this._readLog();
    log[key] = Date.now();
    this._writeLog(log);
  },
  async send(userId, type, title, body, metadata, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!SUPABASE_URL || !userId) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, type, category: type, title, body, metadata: metadata||{}, is_read: false, sent_at: new Date().toISOString() }),
      });
      return res.ok;
    } catch(e) { return false; }
  },
};

// ── FLEET SERVICE (backend scaffold — aggregates what's real, estimates what isn't yet) ──
const FleetService = {
  async loadFleetSnapshot(vehicles, userId, SUPABASE_URL, SUPABASE_ANON, getToken) {
    if (!vehicles?.length) return [];
    let sessionsByVehicleId = {};
    let hasVehicleIdColumn = false;
    if (SUPABASE_URL && userId) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${userId}&status=eq.Completed&select=vehicle_id,energy_kwh,cost_total&order=created_at.desc&limit=200`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(s => {
            if (s.vehicle_id) {
              hasVehicleIdColumn = true;
              if (!sessionsByVehicleId[s.vehicle_id]) sessionsByVehicleId[s.vehicle_id] = { kwh:0, cost:0, count:0 };
              sessionsByVehicleId[s.vehicle_id].kwh += s.energy_kwh || 0;
              sessionsByVehicleId[s.vehicle_id].cost += s.cost_total || 0;
              sessionsByVehicleId[s.vehicle_id].count += 1;
            }
          });
        }
      } catch(e) {}
    }
    return vehicles.map(v => ({
      vehicle: v,
      capacityKWh: VehicleService.batteryCapacity(v),
      dataSource: hasVehicleIdColumn && sessionsByVehicleId[v.id] ? "linked_sessions" : "estimate_only",
      totalKwh: sessionsByVehicleId[v.id]?.kwh || 0,
      totalCostPesewas: sessionsByVehicleId[v.id]?.cost || 0,
      sessionCount: sessionsByVehicleId[v.id]?.count || 0,
    }));
  },
};

// ── DRIVER ASSISTANT SERVICE (Mode 2 orchestration) ─────────────
const DriverAssistantService = {
  loadBatteryState() {
    try {
      const raw = localStorage.getItem(BATTERY_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { pct: 70, updatedAt: null };
  },
  saveBatteryState(pct) {
    const state = { pct, updatedAt: Date.now() };
    try { localStorage.setItem(BATTERY_STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
    return state;
  },
};

// ── AI ENGINE (top-level recommendation orchestrator — one voice for both modes) ──
const AIEngine = {
  driverAssistantRecommendations({ batteryPct, remainingRangeKm, nearestStations, traffic, walletBalancePesewas, chargerInfoByStation }) {
    const notes = [];
    if (batteryPct <= 15) {
      notes.push({ tone:"urgent", text:"Charge now — battery is low." });
    } else if (batteryPct <= 35) {
      notes.push({ tone:"caution", text:"Consider charging soon, before your next long stretch of driving." });
    } else {
      notes.push({ tone:"good", text:"Battery is sufficient for now." });
    }

    if (nearestStations?.[0]) {
      const near = nearestStations[0];
      notes.push({ tone:"info", text:`Nearest station is ${near.name} — ${near.distanceKm.toFixed(1)} km away.` });
      const q = ChargingStationService.queueEstimate(near);
      notes.push({ tone: q.level==="busy" ? "caution" : "info", text: q.label + ` at ${near.name}.` });
    }

    if (nearestStations?.length >= 2 && chargerInfoByStation) {
      const a = nearestStations[0], b = nearestStations[1];
      const priceA = chargerInfoByStation[a.id]?.pricePerKwh;
      const priceB = chargerInfoByStation[b.id]?.pricePerKwh;
      if (priceA != null && priceB != null && Math.abs(priceA - priceB) > 0.05) {
        const cheaper = priceA < priceB ? a : b;
        const pricier = priceA < priceB ? b : a;
        notes.push({ tone:"info", text:`${cheaper.name} is cheaper per kWh than ${pricier.name} right now.` });
      }
    }

    if (traffic?.label === "Heavy") {
      notes.push({ tone:"caution", text:"Heavy traffic conditions may increase energy consumption by roughly 8%." });
    }

    if (remainingRangeKm != null) {
      notes.push({ tone:"info", text:`Estimated remaining range: about ${remainingRangeKm.toFixed(0)} km on current battery.` });
    }

    notes.push({ tone:"info", text: BatteryPredictionService.recommendedChargingWindow() });

    if (walletBalancePesewas != null && walletBalancePesewas < 500) {
      notes.push({ tone:"caution", text:`Wallet balance is low (GH₵${(walletBalancePesewas/100).toFixed(2)}) — top up before your next charge.` });
    }

    return notes;
  },

  // Honest "at a glance" snapshot for the hub hero card.
  // Deliberately avoids fabricated precision (no fake confidence %, no fake exact clock time)
  // — everything here is directly derivable from real battery/distance/station data.
  statusSnapshot({ batteryPct, remainingRangeKm, nearestStations }) {
    const status = batteryPct >= 60 ? { label:"Excellent", color:"green" }
      : batteryPct >= 35 ? { label:"Good", color:"green" }
      : batteryPct >= 15 ? { label:"Fair", color:"yellow" }
      : { label:"Low", color:"red" };

    const nearest = nearestStations?.[0];
    let risk = { label:"Unknown", color:"muted" };
    if (remainingRangeKm != null && nearest) {
      if (remainingRangeKm < nearest.distanceKm) risk = { label:"High", color:"red" };
      else if (remainingRangeKm < nearest.distanceKm * 3) risk = { label:"Medium", color:"yellow" };
      else risk = { label:"Low", color:"green" };
    } else if (remainingRangeKm != null) {
      risk = remainingRangeKm < 20 ? { label:"Medium", color:"yellow" } : { label:"Low", color:"green" };
    }

    let action;
    if (batteryPct <= 15) action = "Charge now.";
    else if (risk.label === "High") action = "Charge soon — you're close to your safe range limit.";
    else if (batteryPct <= 35) action = "No urgent need, but plan a charge in the next few hours.";
    else action = "No charging needed for now — battery comfortably covers typical local driving.";

    return { status, risk, action, nearestChargerName: nearest?.name || null };
  },

  tripRecommendations(trip, walletBalancePesewas) {
    if (!trip.feasible) return [{ tone:"urgent", text:trip.reason }];
    const notes = [];
    if (trip.stops.length === 0) {
      notes.push({ tone:"good", text:"No charging stop required — your battery comfortably covers this trip." });
    } else {
      const avgPrice = trip.stops.reduce((a,s)=>a+s.pricePerKwh,0)/trip.stops.length;
      trip.stops.forEach(s => {
        if (s.pricePerKwh < avgPrice - 0.05) {
          const savings = ((avgPrice - s.pricePerKwh) * s.energyAddedKWh).toFixed(2);
          notes.push({ tone:"info", text:`Charging at ${s.name} could save about GH₵${savings} versus the average rate on this route.` });
        }
      });
      if (trip.batteryAtArrivalPct < 15) {
        notes.push({ tone:"caution", text:`Battery is projected to arrive around ${trip.batteryAtArrivalPct}% — consider a short top-up at your last stop.` });
      }
    }
    if (trip.traffic.label === "Heavy") {
      notes.push({ tone:"caution", text:"Heavy traffic conditions may increase energy consumption by roughly 8% on this route." });
    }
    if (walletBalancePesewas != null && trip.totalChargingCost > 0) {
      const balGHS = walletBalancePesewas/100;
      if (balGHS < trip.totalChargingCost) {
        notes.push({ tone:"caution", text:`Wallet balance (GH₵${balGHS.toFixed(2)}) is below the estimated charging cost (GH₵${trip.totalChargingCost.toFixed(2)}) — top up before you go.` });
      }
    }
    return notes;
  },
};

// ── TRIP PLANNER SERVICE (Mode 1 core algorithm — unchanged from previous version) ──
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

    // Real-world ETA tracking — converts route distance into actual clock times,
    // not just km. avgSpeedKmh comes from OSRM's own distance/duration for this
    // route, so it reflects real road conditions, not a guessed constant.
    const startedAt = new Date();
    const avgSpeedKmh = route.distanceKm / (route.durationMin / 60);
    let elapsedMin = 0;

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

      // Real ETA for this stop — drive time for this leg only, layered on top
      // of everything driven/charged so far, so each stop's clock time reflects
      // actual cumulative travel, not a flat guess.
      const legDriveMin = (legKm / avgSpeedKmh) * 60 * traffic.multiplier;
      elapsedMin += legDriveMin;
      const arrivalClockTime = new Date(startedAt.getTime() + elapsedMin*60000);

      stops.push({ ...chosen, arrivalBatteryPct: arrivalPct, chargeToPct: targetPct, energyAddedKWh: +energyAdded.toFixed(2), chargeMinutes, cost, waitMinutes: 0, arrivalClockTime, driveMinToReach: Math.round(legDriveMin) });

      elapsedMin += chargeMinutes;
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

    const finalLegDriveMin = (finalLegKm / avgSpeedKmh) * 60 * traffic.multiplier;
    const estimatedArrivalTime = new Date(startedAt.getTime() + elapsedMin*60000 + finalLegDriveMin*60000);

    return {
      feasible: true, route, distanceKm: route.distanceKm, durationMin: route.durationMin + totalChargingTime,
      driveDurationMin: route.durationMin, traffic, stops, totalChargingTime,
      totalChargingCost: +totalChargingCost.toFixed(2), batteryAtArrivalPct, consumptionPerKm, capacityKWh,
      startedAt, estimatedArrivalTime,
    };
  },
};

// ── SMALL UI PRIMITIVES ─────────────────────────────────────────
const Spinner = ({ color }) => (
  <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${color}`,borderTopColor:"transparent",display:"inline-block",animation:"spin .8s linear infinite" }}/>
);

const GlassCard = ({ T, children, style }) => (
  <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, backdropFilter:"blur(10px)", ...style }}>{children}</div>
);
const Badge = ({ label, color }) => (
  <span style={{ background:`${color}1f`,color,fontSize:10,fontWeight:700,borderRadius:20,padding:"4px 10px",border:`1px solid ${color}44`,whiteSpace:"nowrap" }}>{label}</span>
);

const TONE_COLOR = (T, tone) => tone==="urgent" ? T.red : tone==="caution" ? T.yellow : tone==="good" ? T.green : T.blue;

const RecommendationList = ({ T, items }) => (
  <>
    {items.map((r,i)=>(
      <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<items.length-1?10:0 }}>
        <div style={{ width:6,height:6,borderRadius:"50%",background:TONE_COLOR(T,r.tone),marginTop:6,flexShrink:0 }}/>
        <div style={{ fontSize:12,color:T.mutedLight,lineHeight:1.7 }}>{r.text}</div>
      </div>
    ))}
  </>
);

// ── ANIMATION STYLES (pulsing live markers, glowing route) ───────
let aiStylesInjected = false;
const ensureAIStyles = () => {
  if (aiStylesInjected || document.getElementById("ai-route-styles")) return;
  const s = document.createElement("style");
  s.id = "ai-route-styles";
  s.textContent = `
    @keyframes aiPulseRing { 0%{ transform:scale(0.8); opacity:0.9; } 70%{ transform:scale(2.2); opacity:0; } 100%{ opacity:0; } }
    @keyframes aiDash { to { stroke-dashoffset: -24; } }
    .ai-pulse-wrap { position:relative; width:18px; height:18px; }
    .ai-pulse-ring { position:absolute; inset:0; border-radius:50%; background:rgba(56,189,248,0.55); animation:aiPulseRing 1.8s ease-out infinite; }
    .ai-pulse-dot { position:absolute; inset:0; margin:auto; width:16px; height:16px; border-radius:50%; background:#38bdf8; border:3px solid #fff; box-shadow:0 0 10px rgba(56,189,248,0.9); }
    .ai-stop-pulse { animation:aiPulseRing 2.4s ease-out infinite; }
  `;
  document.head.appendChild(s);
  aiStylesInjected = true;
};

// ── LEAFLET LOADER ───────────────────────────────────────────────
const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) { resolve(); return; }
  if (!document.getElementById("lcss")) {
    const l=document.createElement("link"); l.id="lcss"; l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
  }
  const s=document.createElement("script"); s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload=resolve; document.head.appendChild(s);
});

const MAP_BLUE = "#2563eb";
// Key-free OpenStreetMap tiles by default. To use a keyed provider later (MapTiler,
// Stadia, etc.) set VITE_MAP_TILE_URL in Vercel, e.g. https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=...
const MAP_TILE_URL = (import.meta.env && import.meta.env.VITE_MAP_TILE_URL) || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_TILE_FILTER = (import.meta.env && import.meta.env.VITE_MAP_TILE_URL) ? "none" : "grayscale(0.9) contrast(0.9) brightness(1.07)";

const carSvg = `<svg width="44" height="22" viewBox="0 0 44 22"><ellipse cx="22" cy="20" rx="18" ry="2" fill="rgba(0,0,0,0.25)"/><path d="M3 15c0-3 1-4 4-5l5-4c1-1 3-2 5-2h8c3 0 5 1 7 3l5 2c3 1 4 2 4 5v2c0 1-1 2-2 2H5c-1 0-2-1-2-2z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/><path d="M14 9l4-3h6c2 0 3 1 5 3z" fill="#334155"/><circle cx="12" cy="18" r="3" fill="#1e293b"/><circle cx="32" cy="18" r="3" fill="#1e293b"/></svg>`;
const boltSvg = (fill) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="${fill}"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
const fmtGHS = (n) => `GH₵${Number(n).toFixed(2)}`;
const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s/60))} min ago`;
  if (s < 86400) return `${Math.round(s/3600)} h ago`;
  if (s < 86400*30) return `${Math.round(s/86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
};

// ── STATION INFO (ratings, reviews, amenities, connectors) ──────
// All real data from Supabase. If the tables don't exist yet the UI says so
// instead of showing made-up numbers. SQL: station_reviews_amenities.sql
const AMENITY_LABELS = {
  wifi:"Free Wi-Fi", cafe:"Café", shop:"Shop", restroom:"Restroom", security:"24/7 Security",
  parking:"Parking", solar:"Solar powered", lounge:"Waiting lounge", food:"Food",
};
const StationInfoService = {
  headers(ctx) { return { apikey: ctx.SUPABASE_ANON, Authorization: `Bearer ${ctx.getToken()}` }; },
  async _get(ctx, path) {
    try {
      const r = await fetch(`${ctx.SUPABASE_URL}/rest/v1/${path}`, { headers: this.headers(ctx) });
      return r.ok ? await r.json() : null;
    } catch(e) { return null; }
  },
  async summaries(ids, ctx) {
    if (!ctx?.SUPABASE_URL || !ids?.length) return {};
    const list = ids.map(i => `"${String(i).replace(/"/g, "")}"`).join(",");
    const rows = await this._get(ctx, `station_rating_summary?station_id=in.(${encodeURIComponent(list)})`);
    const out = {};
    (Array.isArray(rows) ? rows : []).forEach(r => { out[String(r.station_id)] = r; });
    return out;
  },
  async detail(stationId, ctx) {
    const sid = encodeURIComponent(stationId);
    const [reviews, amenities, chargers, summary] = await Promise.all([
      this._get(ctx, `station_reviews?station_id=eq.${sid}&order=created_at.desc&limit=20&select=id,user_id,rating,comment,author_name,created_at`),
      this._get(ctx, `station_amenities?station_id=eq.${sid}&select=amenity`),
      this._get(ctx, `chargers?station_id=eq.${sid}&select=*`),
      this._get(ctx, `station_rating_summary?station_id=eq.${sid}`),
    ]);
    return {
      reviewsAvailable: Array.isArray(reviews),   // false = reviews table not set up yet
      reviews: Array.isArray(reviews) ? reviews : [],
      amenities: Array.isArray(amenities) ? amenities.map(a => a.amenity) : [],
      chargers: Array.isArray(chargers) ? chargers : [],
      summary: Array.isArray(summary) && summary[0] ? summary[0] : null,
    };
  },
  async submitReview(stationId, userId, rating, comment, authorName, ctx) {
    try {
      const res = await fetch(`${ctx.SUPABASE_URL}/rest/v1/station_reviews?on_conflict=station_id,user_id`, {
        method: "POST",
        headers: { ...this.headers(ctx), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ station_id: String(stationId), user_id: userId, rating, comment: (comment || "").trim() || null, author_name: authorName || null, updated_at: new Date().toISOString() }),
      });
      return { ok: res.ok };
    } catch(e) { return { ok: false }; }
  },
  async deleteReview(id, ctx) {
    try {
      const res = await fetch(`${ctx.SUPABASE_URL}/rest/v1/station_reviews?id=eq.${id}`, { method: "DELETE", headers: this.headers(ctx) });
      return res.ok;
    } catch(e) { return false; }
  },
};

// Real connector rows from the chargers table. Column names vary, so read what exists.
const connectorRows = (chargers, station) => {
  const rows = (chargers || []).map((c, i) => {
    const type = c.connector_type || c.connector || c.plug_type || c.socket_type || null;
    const kw = c.power_kw || c.max_power_kw || null;
    const raw = String(c.status || "").toLowerCase();
    let state = null;
    if (/avail|idle|free/.test(raw)) state = "Available";
    else if (/charg|busy|occup|prepar|reserv/.test(raw)) state = "Busy";
    else if (/fault|unavail|offline|out/.test(raw)) state = "Unavailable";
    else if (raw) state = c.status;
    return { key: c.id ?? i, type: type || "Connector type not listed", kw, state };
  });
  if (rows.length) return rows;
  return [];
};
const stateColor = (st) => st === "Available" ? "#16a34a" : st === "Busy" ? "#dc2626" : "#64748b";

const Stars = ({ value, size = 13 }) => (
  <span style={{ color:"#f59e0b", fontSize:size, letterSpacing:1 }}>
    {[1,2,3,4,5].map(n => <span key={n} style={{ opacity: n <= Math.round(value) ? 1 : 0.25 }}>★</span>)}
  </span>
);

function StationDetailSheet({ stop, onClose, data }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const stopId = stop?.id;

  const load = async () => {
    if (!stopId || !data?.SUPABASE_URL) { setInfo(null); return; }
    setLoading(true);
    const d = await StationInfoService.detail(stopId, data);
    setInfo(d);
    const mine = d.reviews.find(r => r.user_id === data.user?.id);
    if (mine) { setMyRating(mine.rating); setMyComment(mine.comment || ""); }
    else { setMyRating(0); setMyComment(""); }
    setLoading(false);
  };
  useEffect(() => { setMsg(""); load(); }, [stopId]);

  if (!stop) return null;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
  const hasBays = Number.isFinite(stop.open) && Number.isFinite(stop.bays) && stop.bays > 0;
  const connectors = connectorRows(info?.chargers, stop);
  const sum = info?.summary;
  const total = sum ? Number(sum.review_count) : 0;
  const bars = sum ? [5,4,3,2,1].map(n => ({ n, c: Number(sum[["","one","two","three","four","five"][n]] || 0) })) : [];
  const tripRows = [
    Number.isFinite(stop.arrivalBatteryPct) && { l:"Battery on arrival", v:`${stop.arrivalBatteryPct}%`, est:true },
    Number.isFinite(stop.chargeToPct) && { l:"Charge to", v:`${stop.chargeToPct}%` },
    Number.isFinite(stop.chargeMinutes) && { l:"Charging time", v:`~${stop.chargeMinutes} min`, est:true },
    Number.isFinite(stop.cost) && { l:"Estimated cost", v:fmtGHS(stop.cost), est:true },
  ].filter(Boolean);

  const submit = async () => {
    if (!myRating) { setMsg("Tap a star to rate."); return; }
    setBusy(true); setMsg("");
    const first = String(data.user?.name || data.user?.full_name || data.user?.email?.split("@")[0] || "EcoCharge driver").split(" ")[0];
    const r = await StationInfoService.submitReview(stop.id, data.user.id, myRating, myComment, first, data);
    setBusy(false);
    if (r.ok) { setMsg("Thanks — your review is saved."); load(); }
    else setMsg("Couldn't save your review. Try again.");
  };
  const removeMine = async () => {
    const mine = info?.reviews.find(r => r.user_id === data.user?.id);
    if (!mine) return;
    setBusy(true);
    const ok = await StationInfoService.deleteReview(mine.id, data);
    setBusy(false);
    if (ok) { setMsg("Review removed."); setMyRating(0); setMyComment(""); load(); }
  };

  const section = { fontWeight:800, fontSize:15, margin:"20px 0 10px" };
  return createPortal(
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:5000,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,height:"90%",display:"flex",flexDirection:"column",color:"#0f172a",fontFamily:"inherit" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"14px 16px 8px" }}>
          <button onClick={onClose} aria-label="Back" style={{ background:"#f1f5f9",border:"none",borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:700,color:"#0f172a",cursor:"pointer" }}>← Details</button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"0 18px 12px" }}>
          <div style={{ fontWeight:800,fontSize:20 }}>{stop.name}</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:10 }}>
            {[
              Number.isFinite(stop.alongKm) ? `${stop.alongKm.toFixed(1)} km along route` : Number.isFinite(stop.distanceKm) ? `${stop.distanceKm.toFixed(1)} km away` : null,
              Number.isFinite(stop.driveMinToReach) ? `${stop.driveMinToReach} min drive` : null,
              hasBays ? `${stop.open}/${stop.bays} plugs free` : null,
              sum && total ? `★ ${Number(sum.avg_rating).toFixed(1)} (${total})` : null,
            ].filter(Boolean).map(t => <span key={t} style={{ background:"#f1f5f9",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600 }}>{t}</span>)}
          </div>

          {tripRows.length > 0 && (<>
            <div style={section}>Your trip here</div>
            <div style={{ background:"#f8fafc",borderRadius:14,padding:"4px 14px" }}>
              {tripRows.map((r,i)=>(
                <div key={r.l} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<tripRows.length-1?"1px solid #e2e8f0":"none",fontSize:13 }}>
                  <span style={{ color:"#64748b" }}>{r.l}</span>
                  <span style={{ fontWeight:700 }}>{r.v}{r.est ? <span style={{ fontWeight:500,color:"#94a3b8" }}> (est.)</span> : null}</span>
                </div>
              ))}
            </div>
          </>)}

          <div style={section}>Connectors</div>
          {loading && <div style={{ fontSize:12,color:"#94a3b8" }}>Loading…</div>}
          {!loading && connectors.length === 0 && (
            <div style={{ background:"#f8fafc",borderRadius:14,padding:"12px 14px",fontSize:12,color:"#64748b",lineHeight:1.6 }}>
              Connector details aren't listed for this station yet.{Number.isFinite(stop.powerKw) && !stop.powerIsDefault ? ` Rated power: ${stop.powerKw} kW.` : ""}
            </div>
          )}
          {connectors.map(c => (
            <div key={c.key} style={{ background:"#f8fafc",borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{/* bolt */}<span dangerouslySetInnerHTML={{ __html: boltSvg(MAP_BLUE) }}/></div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:14 }}>{c.type}</div>
                <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{c.kw ? `${c.kw} kW` : "Power not listed"}</div>
              </div>
              {c.state && <span style={{ fontSize:11,fontWeight:700,color:stateColor(c.state) }}>● {c.state}</span>}
            </div>
          ))}

          <div style={section}>Amenities</div>
          {info && info.amenities.length > 0 ? (
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {info.amenities.map(a => <span key={a} style={{ background:"#f1f5f9",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600 }}>{AMENITY_LABELS[a] || a}</span>)}
            </div>
          ) : (
            <div style={{ fontSize:12,color:"#94a3b8" }}>{loading ? "Loading…" : "No amenities listed for this station yet."}</div>
          )}

          <div style={section}>Reviews</div>
          {info && !info.reviewsAvailable ? (
            <div style={{ background:"#f8fafc",borderRadius:14,padding:"12px 14px",fontSize:12,color:"#64748b" }}>Reviews aren't available yet.</div>
          ) : (<>
            {sum && total > 0 ? (
              <div style={{ background:"#f8fafc",borderRadius:16,padding:16,display:"flex",gap:18,alignItems:"center",marginBottom:12 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:34,lineHeight:1 }}>{Number(sum.avg_rating).toFixed(1)}</div>
                  <Stars value={Number(sum.avg_rating)} size={12}/>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:4 }}>{total} review{total===1?"":"s"}</div>
                </div>
                <div style={{ flex:1 }}>
                  {bars.map(b => (
                    <div key={b.n} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontSize:10,color:"#64748b",width:8 }}>{b.n}</span>
                      <div style={{ flex:1,height:5,borderRadius:3,background:"#e2e8f0" }}><div style={{ width:`${total ? (b.c/total)*100 : 0}%`,height:"100%",borderRadius:3,background:"#0f172a" }}/></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (!loading && <div style={{ fontSize:12,color:"#94a3b8",marginBottom:12 }}>No reviews yet. Be the first to review this station.</div>)}

            {(info?.reviews || []).map(r => (
              <div key={r.id} style={{ background:"#f8fafc",borderRadius:16,padding:"12px 14px",marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:32,height:32,borderRadius:"50%",background:`${MAP_BLUE}1a`,color:MAP_BLUE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12 }}>{(r.author_name || "E").slice(0,1).toUpperCase()}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:13 }}>{r.author_name || "EcoCharge driver"}</div>
                    <div style={{ fontSize:10,color:"#94a3b8" }}>{timeAgo(r.created_at)}</div>
                  </div>
                  <Stars value={r.rating} size={12}/>
                </div>
                {r.comment && <div style={{ fontSize:12,color:"#334155",lineHeight:1.6,marginTop:8 }}>{r.comment}</div>}
              </div>
            ))}

            <div style={{ fontWeight:700,fontSize:13,margin:"14px 0 8px" }}>{info?.reviews.some(r=>r.user_id===data?.user?.id) ? "Your review" : "Rate this station"}</div>
            {data?.user?.id ? (
              <div style={{ background:"#f8fafc",borderRadius:16,padding:14 }}>
                <div style={{ display:"flex",gap:6,marginBottom:10 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={()=>setMyRating(n)} aria-label={`${n} star`}
                      style={{ background:"none",border:"none",fontSize:28,cursor:"pointer",padding:0,color:n<=myRating?"#f59e0b":"#cbd5e1" }}>★</button>
                  ))}
                </div>
                <textarea value={myComment} onChange={e=>setMyComment(e.target.value)} maxLength={500} rows={3} placeholder="Share how charging went (optional)"
                  style={{ width:"100%",boxSizing:"border-box",border:"1px solid #e2e8f0",borderRadius:12,padding:10,fontSize:13,fontFamily:"inherit",resize:"none",background:"#fff",color:"#0f172a" }}/>
                <div style={{ display:"flex",gap:8,marginTop:10,alignItems:"center" }}>
                  <button onClick={submit} disabled={busy} style={{ background:MAP_BLUE,color:"#fff",border:"none",borderRadius:20,padding:"10px 20px",fontWeight:800,fontSize:13,cursor:"pointer",opacity:busy?0.7:1 }}>{busy?"Saving…":"Submit"}</button>
                  {info?.reviews.some(r=>r.user_id===data.user.id) && <button onClick={removeMine} disabled={busy} style={{ background:"none",border:"none",color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer" }}>Delete</button>}
                  {msg && <span style={{ fontSize:11,color:"#64748b" }}>{msg}</span>}
                </div>
              </div>
            ) : <div style={{ fontSize:12,color:"#94a3b8" }}>Sign in to leave a review.</div>}
          </>)}
        </div>

        <div style={{ borderTop:"1px solid #e2e8f0",padding:"12px 18px calc(14px + env(safe-area-inset-bottom,0px))",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:20 }}>{Number.isFinite(stop.pricePerKwh) ? fmtGHS(stop.pricePerKwh) : "Price not listed"}{Number.isFinite(stop.pricePerKwh) && <span style={{ fontSize:12,fontWeight:500,color:"#64748b" }}> /kWh{stop.priceIsDefault ? " (est.)" : ""}</span>}</div>
            {Number.isFinite(stop.cost) && <div style={{ fontSize:11,color:"#64748b" }}>≈ {fmtGHS(stop.cost)} for this charge (est.)</div>}
          </div>
          <a href={navUrl} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex",alignItems:"center",gap:8,background:MAP_BLUE,color:"#fff",borderRadius:30,padding:"13px 24px",fontWeight:800,fontSize:14,textDecoration:"none" }}>
            Directions <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M3 11 21 3l-8 18-2-8z"/></svg>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Clean light map like the reference: bold blue road-following route, a car at the start,
// bolt pins for stations, and a swipeable station-card carousel (tap a card for details).
// Used for trip stops (route given) and for "nearest stations" (onSelectStop loads the route).
function RouteMap({ T, route, stops, currentPos, destination, origin, data, title, onSelectStop }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const routeLayer = useRef(null);
  const stopLayer = useRef(null);
  const markersRef = useRef({});
  const carouselRef = useRef(null);
  const scrollTimer = useRef(null);
  const lastRouteKey = useRef("");
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ratings, setRatings] = useState({});
  const stopsKey = (stops || []).map(s => `${s.id}:${s.pricePerKwh}:${s.open}`).join("|");

  const pinHtml = (st, active) => {
    const lab = Number.isFinite(st.alongKm) ? st.alongKm : st.distanceKm;
    const km = Number.isFinite(lab) ? `<div style="position:absolute;left:50%;top:-22px;transform:translateX(-50%);background:#0f172a;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap;font-family:inherit;">${lab < 10 ? lab.toFixed(1) : Math.round(lab)} km</div>` : "";
    return `<div style="position:relative;width:34px;height:34px;">${km}<div style="width:34px;height:34px;border-radius:12px;background:${active?MAP_BLUE:"#fff"};border:2px solid ${MAP_BLUE};box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">${boltSvg(active?"#fff":MAP_BLUE)}</div></div>`;
  };

  // 1) create the map once
  useEffect(()=>{
    ensureAIStyles();
    let cancelled = false;
    loadLeaflet().then(()=>{
      if (cancelled || !mapRef.current || mapInst.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { attributionControl:false, zoomControl:false, zoomSnap:0.25 });
      const tiles = L.tileLayer(MAP_TILE_URL, { maxZoom:19 }).addTo(map);
      if (tiles.getContainer && tiles.getContainer()) tiles.getContainer().style.filter = MAP_TILE_FILTER;
      L.control.zoom({ position:"topright" }).addTo(map);
      L.control.attribution({ position:"bottomleft", prefix:false }).addAttribution("© OpenStreetMap contributors").addTo(map);
      routeLayer.current = L.layerGroup().addTo(map);
      stopLayer.current = L.layerGroup().addTo(map);
      map.setView([5.6, -0.19], 11);
      mapInst.current = map;
      setReady(true);
    });
    return ()=>{ cancelled = true; if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, []);

  // 2) route line, start car, destination dot
  useEffect(()=>{
    if (!ready) return;
    const L = window.L, map = mapInst.current;
    routeLayer.current.clearLayers();
    if (route?.coords?.length) {
      L.polyline(route.coords, { color:"#ffffff", weight:10, opacity:1, lineCap:"round", lineJoin:"round" }).addTo(routeLayer.current);
      L.polyline(route.coords, { color:MAP_BLUE, weight:5, opacity:1, lineCap:"round", lineJoin:"round" }).addTo(routeLayer.current);
      const key = `${route.coords.length}:${route.coords[0]}:${route.coords[route.coords.length-1]}`;
      if (key !== lastRouteKey.current) {
        lastRouteKey.current = key;
        map.invalidateSize();
        map.fitBounds(L.latLngBounds(route.coords), { paddingTopLeft:[40,50], paddingBottomRight:[40, stops?.length ? 150 : 40] });
      }
    }
    const start = origin || (route?.coords?.length ? null : null);
    if (start) L.marker([start.lat,start.lng],{ icon:L.divIcon({ html:carSvg, className:"", iconSize:[44,22], iconAnchor:[22,11] }), interactive:false, zIndexOffset:300 }).addTo(routeLayer.current);
    if (destination) {
      const dIcon = L.divIcon({ html:`<div style="width:28px;height:28px;border-radius:50%;background:${T.red};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div></div>`, className:"", iconSize:[28,28], iconAnchor:[14,14] });
      L.marker([destination.lat,destination.lng],{ icon:dIcon, zIndexOffset:600, interactive:false }).addTo(routeLayer.current);
    }
  }, [ready, route, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  // 3) station pins
  useEffect(()=>{
    if (!ready) return;
    const L = window.L;
    stopLayer.current.clearLayers();
    markersRef.current = {};
    (stops || []).forEach(st => {
      const m = L.marker([st.lat, st.lng], { icon:L.divIcon({ html:pinHtml(st, false), className:"", iconSize:[34,34], iconAnchor:[17,17] }), zIndexOffset:500 })
        .on("click", ()=>{ chooseStop(st.id, true); })
        .addTo(stopLayer.current);
      markersRef.current[st.id] = m;
    });
    if (stops?.length && !stops.some(s => s.id === selectedId)) chooseStop(stops[0].id, false);
    updatePins(selectedId && stops?.some(s=>s.id===selectedId) ? selectedId : stops?.[0]?.id);
  }, [ready, stopsKey]);

  const updatePins = (activeId) => {
    if (!window.L) return;
    (stops || []).forEach(st => {
      const m = markersRef.current[st.id];
      if (m) m.setIcon(window.L.divIcon({ html:pinHtml(st, st.id===activeId), className:"", iconSize:[34,34], iconAnchor:[17,17] }));
    });
  };

  const chooseStop = (id, scroll) => {
    setSelectedId(id);
    updatePins(id);
    const st = (stops || []).find(s => s.id === id);
    if (st && onSelectStop) onSelectStop(st);
    if (scroll) {
      const el = carouselRef.current?.querySelector(`[data-stop="${id}"]`);
      if (el) el.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
    }
  };

  // 4) station ratings for the cards
  useEffect(()=>{
    if (!data?.SUPABASE_URL || !stops?.length) return;
    let off = false;
    StationInfoService.summaries(stops.map(s => s.id), data).then(r => { if (!off) setRatings(r); });
    return ()=>{ off = true; };
  }, [stopsKey]);

  // swipe the carousel → select the centred card
  const onCarouselScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(()=>{
      const box = carouselRef.current; if (!box) return;
      const mid = box.getBoundingClientRect().left + box.clientWidth/2;
      let best=null, bestD=Infinity;
      box.querySelectorAll("[data-stop]").forEach(el=>{
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width/2 - mid);
        if (d < bestD) { bestD=d; best=el.getAttribute("data-stop"); }
      });
      const st = (stops||[]).find(x=>String(x.id)===best);
      if (st && st.id !== selectedId) {
        chooseStop(st.id, false);
        if (mapInst.current && !route) mapInst.current.panTo([st.lat, st.lng], { animate:true });
      }
    }, 120);
  };

  // live position (trip in progress)
  const posMarker = useRef(null);
  useEffect(()=>{
    if (!ready || !currentPos) return;
    const L = window.L;
    if (posMarker.current) posMarker.current.setLatLng([currentPos.lat,currentPos.lng]);
    else {
      const icon = L.divIcon({ html:`<div class="ai-pulse-wrap"><div class="ai-pulse-ring"></div><div class="ai-pulse-dot"></div></div>`, className:"", iconSize:[18,18], iconAnchor:[9,9] });
      posMarker.current = L.marker([currentPos.lat,currentPos.lng],{ icon, zIndexOffset:700 }).addTo(mapInst.current);
      mapInst.current.panTo([currentPos.lat,currentPos.lng]);
    }
  }, [ready, currentPos]);

  return (
    <div style={{ position:"relative",width:"100%",height:"100%" }}>
      <div ref={mapRef} style={{ width:"100%",height:"100%" }}/>
      {title && <div style={{ position:"absolute",top:10,left:10,zIndex:1000,background:"#fff",borderRadius:20,padding:"8px 14px",fontSize:12,fontWeight:700,color:"#0f172a",boxShadow:"0 4px 14px rgba(0,0,0,0.2)" }}>{title}</div>}
      {stops?.length > 0 && (
        <div ref={carouselRef} onScroll={onCarouselScroll}
          style={{ position:"absolute",left:0,right:0,bottom:10,zIndex:1000,display:"flex",gap:10,overflowX:"auto",scrollSnapType:"x mandatory",padding:"0 10px",scrollbarWidth:"none" }}>
          {stops.map((st, idx)=>{
            const hasBays = Number.isFinite(st.open) && Number.isFinite(st.bays) && st.bays > 0;
            const rt = ratings[String(st.id)];
            const rc = rt ? Number(rt.review_count) : 0;
            return (
              <div key={st.id} data-stop={st.id} onClick={()=>{ chooseStop(st.id, false); setDetail(st); }}
                style={{ flex:"0 0 86%",scrollSnapAlign:"center",background:"#fff",borderRadius:18,padding:"12px 12px 12px 14px",boxShadow:"0 10px 28px rgba(0,0,0,0.28)",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:st.id===selectedId?`2px solid ${MAP_BLUE}`:"2px solid transparent",boxSizing:"border-box" }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${MAP_BLUE}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,color:MAP_BLUE,fontSize:15 }}>{idx+1}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:14,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{st.name}</div>
                  <div style={{ fontSize:11,color:"#475569",marginTop:3,lineHeight:1.5 }}>
                    {Number.isFinite(st.pricePerKwh) && <span style={{ color:MAP_BLUE,fontWeight:700 }}>{fmtGHS(st.pricePerKwh)}/kWh{st.priceIsDefault?" (est.)":""}</span>}
                    {hasBays ? `${Number.isFinite(st.pricePerKwh) ? " · " : ""}${st.open}/${st.bays} plugs` : ""}
                  </div>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:1 }}>
                    {rc > 0 ? <><span style={{ color:"#f59e0b" }}>★</span> {Number(rt.avg_rating).toFixed(1)} ({rc}) · </> : null}
                    {Number.isFinite(st.driveMinToReach) ? `${st.driveMinToReach} min drive` : Number.isFinite(st.distanceKm) ? `${st.distanceKm.toFixed(1)} km away` : ""}
                    {Number.isFinite(st.arrivalBatteryPct) ? ` · arrive ${st.arrivalBatteryPct}% (est.)` : ""}
                  </div>
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`} target="_blank" rel="noopener noreferrer" aria-label="Navigate" onClick={e=>e.stopPropagation()}
                  style={{ width:42,height:42,borderRadius:"50%",background:MAP_BLUE,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,textDecoration:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M3 11 21 3l-8 18-2-8z"/></svg>
                </a>
              </div>
            );
          })}
        </div>
      )}
      <StationDetailSheet stop={detail} onClose={()=>setDetail(null)} data={data}/>
    </div>
  );
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

// ── BATTERY UPDATE MODAL (manual input — see honesty note at top of file) ──
function BatteryUpdateModal({ T, currentPct, onClose, onSave }) {
  const [pct, setPct] = useState(currentPct);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ background:T.card,borderRadius:"20px 20px 0 0",padding:"22px 20px 36px",width:"100%",maxWidth:480,border:`1px solid ${T.border}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Update Battery Level</div>
          <button onClick={onClose} className="tap" style={{ background:"none",border:"none",color:T.muted,fontSize:18,cursor:"pointer" }}><i className="fas fa-times"/></button>
        </div>
        <div style={{ textAlign:"center",fontWeight:900,fontSize:40,color:T.green,marginBottom:16 }}>{pct}%</div>
        <input type="range" min={0} max={100} value={pct} onChange={e=>setPct(parseInt(e.target.value))} style={{ width:"100%",accentColor:T.green,marginBottom:20 }}/>
        <button onClick={()=>onSave(pct)} className="tap"
          style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit" }}>
          Save
        </button>
      </div>
    </div>
  );
}

// ── MODE 2 — SMART DRIVER ASSISTANT HUB (default landing) ─────────
function DriverAssistantHub({ go, user, stations, T, getToken, SUPABASE_URL, SUPABASE_ANON, vehicles, selectedVehicle, setSelectedVehicle, onPlanTrip, onReserve }) {
  const [battery, setBattery] = useState(DriverAssistantService.loadBatteryState());
  const [showBatteryModal, setShowBatteryModal] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [locError, setLocError] = useState("");
  const [nearby, setNearby] = useState([]);
  const [chargerInfoByStation, setChargerInfoByStation] = useState({});
  const [nearRoute, setNearRoute] = useState(null);
  const nearReq = useRef(0);
  const nearStops = useMemo(()=> nearby.map(st => ({ ...st, ...(chargerInfoByStation[st.id] || {}) })), [nearby, chargerInfoByStation]);
  const onSelectNearest = async (st) => {
    if (!currentPos) return;
    const id = ++nearReq.current;
    try {
      const r = await GoogleMapsService.getRoute(currentPos, { lat: st.lat, lng: st.lng });
      if (id === nearReq.current) setNearRoute(r);
    } catch(e) { if (id === nearReq.current) setNearRoute(null); }
  };
  const [walletBal, setWalletBal] = useState(null);
  const [todayStats, setTodayStats] = useState({ sessions:0, kwh:0, costPesewas:0 });
 
  const [tab, setTab] = useState("assistant"); // assistant | commercial | fleet

  useEffect(()=>{
    GoogleMapsService.getCurrentPosition().then(setCurrentPos).catch(()=>setLocError("Enable location access to see nearby stations."));
  }, []);

  useEffect(()=>{
    if (!user?.id) return;
    WalletService.getBalance(user.id, SUPABASE_URL, SUPABASE_ANON, getToken).then(setWalletBal);
  }, [user]);

  useEffect(()=>{
    if (!currentPos) return;
    const near = ChargingStationService.nearestStations(stations, currentPos, 5);
    setNearby(near);
    (async ()=>{
      const infoMap = {};
      for (const s of near) {
        infoMap[s.id] = await ChargingStationService.chargerInfo(s.id, SUPABASE_URL, SUPABASE_ANON, getToken);
      }
      setChargerInfoByStation(infoMap);
    })();
  }, [currentPos, stations]);

  useEffect(()=>{
    if (!user?.id || !SUPABASE_URL) return;
    (async ()=>{
      try {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/charging_sessions?user_id=eq.${user.id}&status=eq.Completed&created_at=gte.${todayStart.toISOString()}&select=energy_kwh,cost_total`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setTodayStats({
            sessions: data.length,
            kwh: data.reduce((a,s)=>a+(s.energy_kwh||0),0),
            costPesewas: data.reduce((a,s)=>a+(s.cost_total||0),0),
          });
        }
      } catch(e) {}
    })();
 }, [user]);

  const remainingRangeKm = selectedVehicle ? VehicleService.remainingRangeKm(selectedVehicle, battery.pct) : null;
  const traffic = BatteryPredictionService.trafficFactor();
  const recs = AIEngine.driverAssistantRecommendations({
    batteryPct: battery.pct, remainingRangeKm, nearestStations: nearby, traffic, walletBalancePesewas: walletBal, chargerInfoByStation,
  });

  // Proactive notification — battery low, cooldown-guarded so it doesn't spam
  useEffect(()=>{
    if (!user?.id) return;
    if (battery.pct <= 15 && NotificationService.canSend("low_battery")) {
      NotificationService.send(user.id, "low_battery", "Low Battery", `Your battery is at ${battery.pct}%. Consider charging soon.`, { pct:battery.pct }, SUPABASE_URL, SUPABASE_ANON, getToken)
        .then(ok => { if (ok) NotificationService.markSent("low_battery"); });
    }
  }, [battery.pct, user]);

  const saveBattery = (pct) => {
    const state = DriverAssistantService.saveBatteryState(pct);
    setBattery(state);
    setShowBatteryModal(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
      {showBatteryModal && <BatteryUpdateModal T={T} currentPct={battery.pct} onClose={()=>setShowBatteryModal(false)} onSave={saveBattery}/>}

      <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}` }}>
        <button onClick={()=>go("home")} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>EcoCharge AI</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Your intelligent charging assistant</div>
        </div>
      </div>

      <div style={{ display:"flex",gap:6,padding:"12px 16px 0" }}>
        {[
          { id:"assistant", label:"Assistant", icon:"fa-robot" },
          { id:"commercial", label:"Driver Stats", icon:"fa-car-side" },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="tap"
            style={{ flex:1,background:tab===t.id?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.card,border:`1px solid ${tab===t.id?T.green:T.border}`,borderRadius:10,padding:"9px 6px",fontSize:11,fontWeight:700,color:tab===t.id?"#000":T.muted,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
            <i className={`fas ${t.icon}`}/> {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 16px 110px" }}>

        {tab==="assistant" && (
          <>
            {(() => {
              const snap = AIEngine.statusSnapshot({ batteryPct: battery.pct, remainingRangeKm, nearestStations: nearby });
              const colorMap = { green:T.green, yellow:T.yellow, red:T.red, muted:T.muted };
              return (
                <GlassCard T={T} style={{ padding:20, marginBottom:16 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:T.text,marginBottom:16 }}>EcoCharge AI</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6 }}>Battery Status</div>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <div style={{ width:9,height:9,borderRadius:"50%",background:colorMap[snap.status.color] }}/>
                        <span style={{ fontWeight:800,fontSize:16,color:colorMap[snap.status.color] }}>{snap.status.label}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6 }}>Charging Risk</div>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <div style={{ width:9,height:9,borderRadius:"50%",background:colorMap[snap.risk.color] }}/>
                        <span style={{ fontWeight:800,fontSize:16,color:colorMap[snap.risk.color] }}>{snap.risk.label}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ background:T.surfaceFaint,borderRadius:12,padding:"12px 14px",marginBottom:snap.nearestChargerName?12:0 }}>
                    <div style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:5 }}>Suggested Action</div>
                    <div style={{ fontSize:13,color:T.text,fontWeight:600,lineHeight:1.6 }}>{snap.action}</div>
                  </div>
                  {snap.nearestChargerName && (
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <i className="fas fa-bolt" style={{ fontSize:12,color:T.green }}/>
                      <span style={{ fontSize:12,color:T.mutedLight }}>Nearest available fast charger: <strong style={{ color:T.text }}>{snap.nearestChargerName}</strong></span>
                    </div>
                  )}
                </GlassCard>
              );
            })()}

            <GlassCard T={T} style={{ padding:20, marginBottom:16, background:T.highlightGrad2 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>Battery Level</div>
                  <div style={{ fontWeight:900,fontSize:40,color:T.green,lineHeight:1 }}>{battery.pct}%</div>
                  {remainingRangeKm != null && <div style={{ fontSize:12,color:T.muted,marginTop:6 }}>~{remainingRangeKm.toFixed(0)} km remaining range</div>}
                </div>
                <button onClick={()=>setShowBatteryModal(true)} className="tap"
                  style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                  <i className="fas fa-pencil-alt" style={{ marginRight:6 }}/>Update
                </button>
              </div>
              <div style={{ height:8,borderRadius:4,background:T.track,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${battery.pct}%`,background:battery.pct<=15?T.red:battery.pct<=35?T.yellow:T.green,borderRadius:4,transition:"width .4s ease" }}/>
              </div>
              {!selectedVehicle && vehicles?.length > 0 && (
                <div style={{ marginTop:14,display:"flex",gap:8,overflowX:"auto" }}>
                  {vehicles.map(v=>(
                    <button key={v.id} onClick={()=>setSelectedVehicle(v)} className="tap"
                      style={{ flexShrink:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",fontSize:11,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                      {v.nickname}
                    </button>
                  ))}
                </div>
              )}
              {!vehicles?.length && (
                <div style={{ marginTop:12,fontSize:11,color:T.muted }}>
                  <span onClick={()=>go("myvehicles")} style={{ color:T.green,fontWeight:700,cursor:"pointer" }}>Add a vehicle</span> for accurate range predictions.
                </div>
              )}
            </GlassCard>

            <GlassCard T={T} style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontWeight:800,fontSize:13,color:T.green,marginBottom:12 }}><i className="fas fa-brain" style={{ marginRight:8 }}/>Smart Recommendations</div>
              <RecommendationList T={T} items={recs}/>
            </GlassCard>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontWeight:800,fontSize:14,color:T.text }}>Nearby Stations</div>
              {locError && <span style={{ fontSize:11,color:T.red }}>{locError}</span>}
            </div>
            {!currentPos && !locError && (
              <div style={{ textAlign:"center",padding:"14px 0",color:T.muted,fontSize:12 }}><Spinner color={T.green}/> Finding your location…</div>
            )}
            {nearStops.length > 0 && currentPos && (
              <div style={{ height:340,borderRadius:18,overflow:"hidden",marginBottom:14,border:`1px solid ${T.border}` }}>
                <RouteMap T={T} route={nearRoute} stops={nearStops} origin={currentPos} title="Nearest stations" onSelectStop={onSelectNearest}
                  data={{ SUPABASE_URL, SUPABASE_ANON, getToken, user }}/>
              </div>
            )}
            {nearby.map(s=>{
              const q = ChargingStationService.queueEstimate(s);
              const info = chargerInfoByStation[s.id];
              return (
                <GlassCard key={s.id} T={T} style={{ padding:14, marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{s.name}</div>
                      <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{s.city} · {s.distanceKm.toFixed(1)} km away</div>
                    </div>
                    <div style={{ background:q.level==="clear"?`${T.green}18`:q.level==="tight"?`${T.yellow}18`:`${T.red}18`,borderRadius:8,padding:"3px 10px" }}>
                      <span style={{ fontSize:10,fontWeight:700,color:q.level==="clear"?T.green:q.level==="tight"?T.yellow:T.red }}>{s.open}/{s.bays}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:11,color:T.mutedLight,marginBottom:10 }}>{q.label}{info?.pricePerKwh?` · GH₵${info.pricePerKwh.toFixed(2)}/kWh`:""}</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    <button onClick={()=>go("map")} className="tap" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                      <i className="fas fa-directions" style={{ marginRight:6 }}/>Navigate
                    </button>
                    <button onClick={()=>onReserve?.({ station: s, vehicle: selectedVehicle })} className="tap" style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"9px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                      <i className="fas fa-calendar-check" style={{ marginRight:6 }}/>Reserve
                    </button>
                  </div>
                </GlassCard>
              );
            })}

            <button onClick={onPlanTrip} className="tap"
              style={{ width:"100%",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginTop:6 }}>
              <i className="fas fa-route"/> Plan a Long-Distance Trip
            </button>
            {vehicles?.length > 1 && (
              <GlassCard T={T} style={{ padding:16, marginTop:12, display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:`${T.green}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <i className="fas fa-layer-group" style={{ fontSize:16,color:T.green }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:13,color:T.text }}>Managing multiple vehicles?</div>
                  <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Unlock the Fleet Dashboard</div>
                </div>
                <button onClick={()=>go("fleetdashboard")} className="tap"
                  style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                  View
                </button>
              </GlassCard>
            )}
          </>
        )}

        {tab==="commercial" && (
          <>
            <div style={{ fontSize:12,color:T.muted,marginBottom:14,lineHeight:1.7 }}>For ride-hailing, taxi, delivery, and courier drivers — today's snapshot from your real charging history.</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
              {[
                { label:"Today's Battery",   value:`${battery.pct}%`,                             color:T.green  },
                { label:"Est. Remaining Range", value: remainingRangeKm!=null?`${remainingRangeKm.toFixed(0)} km`:"—", color:T.blue },
                { label:"Today's Charges",   value: todayStats.sessions,                          color:T.yellow },
                { label:"Today's Energy",    value:`${todayStats.kwh.toFixed(1)} kWh`,             color:T.blue   },
                { label:"Today's Charging Cost", value:`GH₵${(todayStats.costPesewas/100).toFixed(2)}`, color:T.yellow },
                { label:"Wallet Balance",    value: walletBal!=null?`GH₵${(walletBal/100).toFixed(2)}`:"—", color:T.green },
              ].map(s=>(
                <div key={s.label} style={{ background:T.card,borderRadius:14,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center" }}>
                  <div style={{ fontWeight:800,fontSize:18,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:9,color:T.muted,marginTop:5,textTransform:"uppercase",letterSpacing:0.4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <GlassCard T={T} style={{ padding:16, opacity:0.6 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
                <i className="fas fa-coins" style={{ color:T.muted }}/>
                <span style={{ fontWeight:700,fontSize:13,color:T.mutedLight }}>Estimated Earnings</span>
                <span style={{ marginLeft:"auto",fontSize:10,fontWeight:700,color:T.muted,background:T.surfaceFaint,borderRadius:6,padding:"2px 8px" }}>Coming soon</span>
              </div>
              <div style={{ fontSize:11,color:T.muted,lineHeight:1.7 }}>Earnings tracking needs a connected trip/ride-income source — not yet wired into EcoCharge.</div>
            </GlassCard>
          </>
        )}

      </div>
    </div>
  );
}

// ── MODE 1 — TRIP PLANNER FLOW (unchanged behaviour from previous version) ──
function TripPlannerFlow({ go, onBack, user, stations, T, getToken, SUPABASE_URL, SUPABASE_ANON, vehicles, initialVehicle, onReserve }) {
  const [step, setStep] = useState("input");
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [usingCurrentLoc, setUsingCurrentLoc] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicle || null);
  const [batteryPct, setBatteryPct] = useState(DriverAssistantService.loadBatteryState().pct);
  const [preference, setPreference] = useState("Fastest");
  const [error, setError] = useState("");
  const [trip, setTrip] = useState(null);
  const [walletBal, setWalletBal] = useState(null);
   const [currentPos, setCurrentPos] = useState(null);
  const [nextStopIdx, setNextStopIdx] = useState(0);
  const [tripRecordId, setTripRecordId] = useState(null);
  const watchIdRef = useRef(null);
  useEffect(()=>{
    if (!user?.id) return;
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
    watchIdRef.current = GoogleMapsService.watchPosition((pos) => setCurrentPos(pos), () => {});
    TripLogService.start({
      userId: user?.id, vehicleId: selectedVehicle?.id,
      originLabel: fromPlace?.label, destinationLabel: toPlace?.label,
      distanceKm: trip?.distanceKm, stopsCount: trip?.stops?.length || 0,
      SUPABASE_URL, SUPABASE_ANON, getToken,
    }).then(row => { if (row) setTripRecordId(row.id); });
  };

   const endTrip = () => {
    GoogleMapsService.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (tripRecordId) {
      const arrivedAtDestination = currentPos && toPlace
        ? haversine(currentPos.lat, currentPos.lng, toPlace.lat, toPlace.lng) <= 2
        : false;
      TripLogService.finish({ tripId: tripRecordId, userId: user?.id, arrived: arrivedAtDestination, SUPABASE_URL, SUPABASE_ANON, getToken });
      setTripRecordId(null);
    }
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
        <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
          <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800,fontSize:16,color:T.text }}>Plan a Trip</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Smart trip planning with charging stops</div>
        </div>
        <button onClick={()=>go("__assistant_mode")} className="tap"
          style={{ background:"none",border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
          <i className="fas fa-robot"/> Driver Assistant
        </button>
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
          {(!vehicles || vehicles.length === 0) ? (
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
          <input type="range" min={5} max={100} value={batteryPct} onChange={e=>setBatteryPct(parseInt(e.target.value))} style={{ width:"100%",accentColor:T.green }}/>
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

        {error && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,padding:"11px 14px",marginBottom:14,color:T.red,fontSize:12,lineHeight:1.6 }}>{error}</div>}

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
    const recs = AIEngine.tripRecommendations(trip, walletBal);

    // Real per-leg distance/time, derived from the stops already computed by
    // TripPlannerService — no invented numbers, just reshaped for the timeline.
    const legs = trip.feasible ? (() => {
      let prevKm = 0;
      const arr = trip.stops.map(s => {
        const leg = { km: s.alongKm - prevKm, min: s.driveMinToReach };
        prevKm = s.alongKm;
        return leg;
      });
      const lastKm = trip.distanceKm - prevKm;
      const usedMin = trip.stops.reduce((a,s)=>a+(s.driveMinToReach||0),0);
      const lastMin = Math.max(0, trip.driveDurationMin - usedMin);
      return { arr, lastKm, lastMin };
    })() : null;

    const batteryColor = (pct) => pct <= 15 ? T.red : pct <= 35 ? T.yellow : T.green;

    return (
      <div style={{ display:"flex",flexDirection:"column",height:"100%",background:T.bg }}>
        <div style={{ padding:"calc(14px + env(safe-area-inset-top,34px)) 18px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}` }}>
          <button onClick={onBack} className="tap" style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
            <i className="fas fa-arrow-left" style={{ fontSize:20,color:T.text }}/>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ fontWeight:800,fontSize:16,color:T.text }}>AI Route Planner</div>
              <Badge label="BETA" color={T.green}/>
            </div>
            <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Optimized charging stops for your trip</div>
          </div>
          <button onClick={()=>setStep("input")} className="tap"
            style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",fontSize:11,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
            <i className="fas fa-sliders-h"/> Edit
          </button>
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
              {/* From / To summary */}
              <GlassCard T={T} style={{ padding:14, marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                  <i className="fas fa-circle" style={{ fontSize:9,color:T.green }}/>
                  <span style={{ fontSize:13,color:T.text,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fromPlace?.label||"Origin"}</span>
                </div>
                <div style={{ width:1,height:14,background:T.border,marginLeft:4,marginBottom:6 }}/>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <i className="fas fa-map-marker-alt" style={{ fontSize:11,color:T.red }}/>
                  <span style={{ fontSize:13,color:T.text,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{toPlace?.label||"Destination"}</span>
                </div>
              </GlassCard>

              <div style={{ height:320,borderRadius:18,overflow:"hidden",marginBottom:14,border:`1px solid ${T.border}` }}>
                <RouteMap T={T} route={trip.route} stops={trip.stops} destination={toPlace} origin={fromPlace} data={{ SUPABASE_URL, SUPABASE_ANON, getToken, user }}/>
              </div>

              {/* Summary stats — matches the 4-metric row from the mockup */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14 }}>
                {[
                  { label:"Total Distance",     value:`${trip.distanceKm.toFixed(0)} km`, icon:"fa-road" },
                  { label:"Est. Travel Time",    value:`${Math.floor(trip.driveDurationMin/60)}h ${Math.round(trip.driveDurationMin%60)}m`, icon:"fa-clock" },
                  { label:"Est. Charging Time",  value: trip.totalChargingTime>0?`${trip.totalChargingTime} min`:"0 min", icon:"fa-bolt" },
                  { label:"Total Stops",         value: trip.stops.length, icon:"fa-map-marker-alt" },
                ].map(s=>(
                  <div key={s.label} style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"12px 6px",textAlign:"center" }}>
                    <i className={`fas ${s.icon}`} style={{ fontSize:14,color:T.green,marginBottom:6,display:"block" }}/>
                    <div style={{ fontWeight:800,fontSize:13,color:T.text }}>{s.value}</div>
                    <div style={{ fontSize:8,color:T.muted,marginTop:4,textTransform:"uppercase",letterSpacing:0.3,lineHeight:1.3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Route Overview — vertical timeline with real battery levels at each point */}
              <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Route Overview</div>
              <GlassCard T={T} style={{ padding:16, marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:6 }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:T.green }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fromPlace?.label||"Origin"}</div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
                    <i className="fas fa-battery-full" style={{ fontSize:11,color:batteryColor(batteryPct) }}/>
                    <span style={{ fontSize:12,fontWeight:800,color:batteryColor(batteryPct) }}>{batteryPct}%</span>
                  </div>
                </div>

                {trip.stops.map((s,i)=>(
                  <div key={s.id}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 0 6px 10px" }}>
                      <div style={{ width:1,height:20,background:T.border }}/>
                      <div style={{ fontSize:11,color:T.muted }}>
                        <i className="fas fa-car-side" style={{ marginRight:6 }}/>Drive {legs.arr[i].km.toFixed(0)} km · {Math.round(legs.arr[i].min)} min
                      </div>
                    </div>
                    <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:6 }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",background:T.green,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800 }}>{i+1}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700,fontSize:13,color:T.text }}>{s.name}</span>
                          <Badge label="Fast Charger" color={T.green}/>
                        </div>
                        <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Charge for {s.chargeMinutes} min ({s.arrivalBatteryPct}% → {s.chargeToPct}%)</div>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
                        <i className="fas fa-battery-three-quarters" style={{ fontSize:11,color:batteryColor(s.chargeToPct) }}/>
                        <span style={{ fontSize:12,fontWeight:800,color:batteryColor(s.chargeToPct) }}>{s.chargeToPct}%</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 0 6px 10px" }}>
                  <div style={{ width:1,height:20,background:T.border }}/>
                  <div style={{ fontSize:11,color:T.muted }}>
                    <i className="fas fa-car-side" style={{ marginRight:6 }}/>Drive {legs.lastKm.toFixed(0)} km · {Math.round(legs.lastMin)} min
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:T.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <i className="fas fa-flag-checkered" style={{ fontSize:9,color:"#fff" }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{toPlace?.label||"Destination"}</div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
                    <i className="fas fa-battery-quarter" style={{ fontSize:11,color:batteryColor(trip.batteryAtArrivalPct) }}/>
                    <span style={{ fontSize:12,fontWeight:800,color:batteryColor(trip.batteryAtArrivalPct) }}>{trip.batteryAtArrivalPct}%</span>
                  </div>
                </div>
              </GlassCard>

              {/* Your Vehicle */}
              <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Your Vehicle</div>
              <GlassCard T={T} style={{ padding:16, marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
                  <div style={{ width:64,height:64,borderRadius:14,overflow:"hidden",flexShrink:0,background:T.surfaceFaint,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {selectedVehicle?.image_url
                      ? <img src={selectedVehicle.image_url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>e.target.style.display="none"}/>
                      : <i className="fas fa-car" style={{ fontSize:26,color:T.green,opacity:0.5 }}/>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{selectedVehicle?.nickname||"—"}</div>
                    <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{selectedVehicle?.manufacturer} {selectedVehicle?.model}</div>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
                  <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                    <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Est. Range</div>
                    <div style={{ fontWeight:800,fontSize:15,color:T.text,marginTop:3 }}>{selectedVehicle?.estimated_range ? `${selectedVehicle.estimated_range} km` : "—"}</div>
                  </div>
                  <div style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px" }}>
                    <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase" }}>Consumption</div>
                    <div style={{ fontWeight:800,fontSize:15,color:T.text,marginTop:3 }}>{Math.round(trip.consumptionPerKm*1000)} Wh/km</div>
                  </div>
                </div>
                <div style={{ fontSize:11,color:T.muted,marginBottom:6,display:"flex",justifyContent:"space-between" }}>
                  <span>Battery (at trip start)</span><span style={{ fontWeight:700,color:batteryColor(batteryPct) }}>{batteryPct}%</span>
                </div>
                <div style={{ height:8,borderRadius:4,background:T.track,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${batteryPct}%`,background:batteryColor(batteryPct),borderRadius:4 }}/>
                </div>
              </GlassCard>

              {/* Wallet + Traffic — kept, just re-homed below the new sections */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
                {[
                  { label:"Wallet Balance", value: walletBal!=null?`GH₵${(walletBal/100).toFixed(0)}`:"—" },
                  { label:"Traffic", value: trip.traffic.label, color: trip.traffic.label==="Heavy"?T.yellow:T.green },
                ].map(r=>(
                  <div key={r.label} style={{ background:T.surfaceFaint,borderRadius:10,padding:"10px 12px",textAlign:"center" }}>
                    <div style={{ fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:0.4 }}>{r.label}</div>
                    <div style={{ fontWeight:800,fontSize:14,color:r.color||T.text,marginTop:3 }}>{r.value}</div>
                  </div>
                ))}
              </div>

              {recs.length>0 && (
                <GlassCard T={T} style={{ padding:16, marginBottom:14, background:T.highlightGrad2 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:T.green,marginBottom:10 }}><i className="fas fa-brain" style={{ marginRight:8 }}/>Smart Recommendations</div>
                  <RecommendationList T={T} items={recs}/>
                </GlassCard>
              )}

              {trip.stops.length === 0 ? (
                <GlassCard T={T} style={{ padding:16, marginBottom:14, textAlign:"center" }}>
                  <i className="fas fa-check-circle" style={{ fontSize:22,color:T.green,marginBottom:8,display:"block" }}/>
                  <div style={{ fontWeight:700,fontSize:13,color:T.green }}>No charging stop required</div>
                </GlassCard>
              ) : (
                <>
                  <div style={{ fontWeight:800,fontSize:14,color:T.text,marginBottom:10 }}>Charging Stop Details</div>
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
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                        <button onClick={()=>go("map")} className="tap" style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit" }}>
                          <i className="fas fa-directions" style={{ marginRight:6 }}/>Navigate
                        </button>
                       <button onClick={()=>onReserve?.({ station: s, vehicle: selectedVehicle, suggestedArrivalTime: s.arrivalClockTime, suggestedDurationMin: s.chargeMinutes })} className="tap" style={{ background:`${T.green}18`,border:`1px solid ${T.green}44`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,color:T.green,cursor:"pointer",fontFamily:"inherit" }}>
                          <i className="fas fa-calendar-check" style={{ marginRight:6 }}/>Reserve
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </>
              )}

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6 }}>
                <button className="tap"
                  style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px",fontSize:14,fontWeight:700,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  <i className="fas fa-star"/> Save Route
                </button>
                <button onClick={startTrip} className="tap"
                  style={{ background:`linear-gradient(135deg,${T.green},${T.greenDark})`,border:"none",borderRadius:14,padding:"16px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  <i className="fas fa-paper-plane"/> Start Navigation
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ position:"fixed",bottom:0,left:0,right:0,display:"flex",justifyContent:"space-around",padding:"10px 0 calc(10px + env(safe-area-inset-bottom,0px))",borderTop:`1px solid ${T.border}`,background:T.bg,zIndex:50 }}>
          {[
            { label:"Home",      icon:"fa-home",          action:()=>go("home") },
            { label:"Stations",  icon:"fa-map-marker-alt", action:()=>go("map") },
            { label:"AI Planner",icon:"fa-route",          action:()=>{}, active:true },
            { label:"Bookings",  icon:"fa-calendar-alt",   action:()=>go("reservations") },
            { label:"Account",   icon:"fa-user",           action:()=>go("profile") },
          ].map(item=>(
            <button key={item.label} onClick={item.action} className="tap"
              style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontFamily:"inherit",minWidth:56 }}>
              <i className={`fas ${item.icon}`} style={{ fontSize:18,color:item.active?T.green:T.muted }}/>
              <span style={{ fontSize:10,fontWeight:item.active?700:500,color:item.active?T.green:T.muted }}>{item.label}</span>
            </button>
          ))}
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

        <div style={{ height:340,flexShrink:0 }}>
          <RouteMap T={T} route={trip.route} stops={trip.stops} currentPos={currentPos} destination={toPlace} data={{ SUPABASE_URL, SUPABASE_ANON, getToken, user }}/>
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

// ── TOP-LEVEL ENTRY — routes between Mode 2 (default) and Mode 1 ─────
export default function AIRoutePlanner({ go: goApp, user, stations, T, getToken, SUPABASE_URL, SUPABASE_ANON, onReserve }) {
  const [mode, setMode] = useState("planner"); // assistant | planner — planner (trip input) is now the default landing screen
  // Intercepts the "__assistant_mode" pseudo-screen used by the Driver
  // Assistant toggle button, so it switches modes locally instead of
  // trying to navigate the whole app to a screen that doesn't exist.
  const go = (screen) => screen === "__assistant_mode" ? setMode("assistant") : goApp(screen);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(()=>{
    if (!user?.id) return;
    VehicleService.loadUserVehicles(user.id, SUPABASE_URL, SUPABASE_ANON, getToken).then(v=>{
      setVehicles(v);
      const def = v.find(x=>x.is_default) || v[0];
      if (def) setSelectedVehicle(def);
    });
  }, [user]);

  if (mode === "planner") {
    return (
      <TripPlannerFlow
        go={go} onBack={()=>setMode("assistant")} user={user} stations={stations}
        T={T} getToken={getToken} SUPABASE_URL={SUPABASE_URL} SUPABASE_ANON={SUPABASE_ANON}
        vehicles={vehicles} initialVehicle={selectedVehicle} onReserve={onReserve}
      />
    );
  }

  return (
    <DriverAssistantHub
      go={go} user={user} stations={stations} T={T} getToken={getToken}
      SUPABASE_URL={SUPABASE_URL} SUPABASE_ANON={SUPABASE_ANON}
      vehicles={vehicles} selectedVehicle={selectedVehicle} setSelectedVehicle={setSelectedVehicle}
      onPlanTrip={()=>setMode("planner")} onReserve={onReserve}
    />
  );
}
