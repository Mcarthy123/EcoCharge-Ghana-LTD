// ============================================================
// EcoCharge Ghana — Charger Protocol Adapter Layer
//
// PURPOSE: Home+ should eventually support smart chargers beyond
// OCPP (some brands use WiFi with their own proprietary API, some
// use Ethernet, etc.). Rather than hard-coding OCPP calls throughout
// the app, every charger action goes through this adapter layer,
// which picks the right implementation based on the charger's
// `charger_protocol` field.
//
// HONESTY NOTE: only the OCPP adapter is real right now — it wraps
// your actual Railway OCPP server calls. The other adapters below
// are STUBS. They exist so the architecture is ready, but they throw
// a clear "not yet supported" error instead of pretending to control
// a charger. Do not remove these errors to "make it work" — a fake
// success here would mean the app tells a user their charger started
// charging when nothing happened.
//
// HOW TO ADD A REAL BRAND LATER: once you have API docs/credentials
// for a specific charger brand (e.g. a WiFi charger with its own
// cloud API), implement that brand's functions in a new adapter
// object below, following the same shape as ocppAdapter, then add
// it to the `adapters` registry at the bottom.
// ============================================================

const OCPP_URL = import.meta.env.VITE_OCPP_SERVER_URL || "";
const OCPP_KEY = import.meta.env.VITE_OCPP_API_KEY    || "";

// ---- Real, working adapter: OCPP over WiFi/Ethernet ----
const ocppAdapter = {
  protocol: "ocpp",
  label: "OCPP",

  async getStatus(charger) {
    try {
      const res = await fetch(`${OCPP_URL}/api/chargers/${charger.ocpp_charger_id}/status`, {
        headers: { "x-api-key": OCPP_KEY },
      });
      if (!res.ok) return { online: false, state: "unknown" };
      return await res.json();
    } catch (e) {
      return { online: false, state: "unknown" };
    }
  },

  async remoteStart(charger) {
    const res = await fetch(`${OCPP_URL}/api/chargers/${charger.ocpp_charger_id}/remote-start`, {
      method: "POST",
      headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Remote start failed");
    return await res.json();
  },

  async remoteStop(charger) {
    const res = await fetch(`${OCPP_URL}/api/chargers/${charger.ocpp_charger_id}/remote-stop`, {
      method: "POST",
      headers: { "x-api-key": OCPP_KEY, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Remote stop failed");
    return await res.json();
  },
};

// ---- Stub adapter: generic WiFi charger with its own cloud API ----
// Fill this in once a specific brand + API docs are known. Until then
// it must fail loudly, not silently pretend to work.
const wifiApiAdapter = {
  protocol: "wifi_api",
  label: "WiFi (brand-specific)",

  async getStatus(charger) {
    throw new Error(`WiFi API support for this charger brand isn't built yet.`);
  },
  async remoteStart(charger) {
    throw new Error(`Remote start for this charger brand isn't built yet.`);
  },
  async remoteStop(charger) {
    throw new Error(`Remote stop for this charger brand isn't built yet.`);
  },
};

// ---- Stub adapter: Ethernet-connected charger with its own API ----
const ethernetApiAdapter = {
  protocol: "ethernet_api",
  label: "Ethernet (brand-specific)",

  async getStatus(charger) {
    throw new Error(`Ethernet API support for this charger brand isn't built yet.`);
  },
  async remoteStart(charger) {
    throw new Error(`Remote start for this charger brand isn't built yet.`);
  },
  async remoteStop(charger) {
    throw new Error(`Remote stop for this charger brand isn't built yet.`);
  },
};

// ---- Stub adapter: OCPP 2.0.1 ----
// Distinct from the 1.6J adapter above because 2.0.1 uses different
// message schemas. Your current Railway OCPP server speaks 1.6J —
// this stub exists so a future charger requiring 2.0.1 has a clear
// place to be wired in, without touching the working 1.6J path.
const ocpp201Adapter = {
  protocol: "ocpp_2_0_1",
  label: "OCPP 2.0.1",

  async getStatus(charger) {
    throw new Error(`OCPP 2.0.1 support isn't built yet — your server currently speaks OCPP 1.6J.`);
  },
  async remoteStart(charger) {
    throw new Error(`OCPP 2.0.1 support isn't built yet — your server currently speaks OCPP 1.6J.`);
  },
  async remoteStop(charger) {
    throw new Error(`OCPP 2.0.1 support isn't built yet — your server currently speaks OCPP 1.6J.`);
  },
};

// ---- Stub adapter: generic REST/HTTP API ----
// For brands that expose a plain HTTP API rather than OCPP.
const restApiAdapter = {
  protocol: "rest_api",
  label: "REST API (brand-specific)",

  async getStatus(charger) {
    throw new Error(`REST API support for this charger brand isn't built yet.`);
  },
  async remoteStart(charger) {
    throw new Error(`Remote start for this charger brand isn't built yet.`);
  },
  async remoteStop(charger) {
    throw new Error(`Remote stop for this charger brand isn't built yet.`);
  },
};

// ---- Stub adapter: WebSocket-based live push updates ----
// For brands that push live status over a persistent WebSocket
// connection instead of the app polling a REST endpoint.
const webSocketAdapter = {
  protocol: "websocket",
  label: "WebSocket (brand-specific)",

  async getStatus(charger) {
    throw new Error(`WebSocket support for this charger brand isn't built yet.`);
  },
  async remoteStart(charger) {
    throw new Error(`Remote start for this charger brand isn't built yet.`);
  },
  async remoteStop(charger) {
    throw new Error(`Remote stop for this charger brand isn't built yet.`);
  },
};

// ---- Stub adapter: MQTT ----
// For brands whose chargers publish/subscribe over MQTT rather than
// exposing a REST API. Would need an MQTT broker/bridge on the
// backend (e.g. on Railway) — not something the mobile app connects
// to directly.
const mqttAdapter = {
  protocol: "mqtt",
  label: "MQTT (brand-specific)",

  async getStatus(charger) {
    throw new Error(`MQTT support for this charger brand isn't built yet.`);
  },
  async remoteStart(charger) {
    throw new Error(`Remote start for this charger brand isn't built yet.`);
  },
  async remoteStop(charger) {
    throw new Error(`Remote stop for this charger brand isn't built yet.`);
  },
};

// ---- Registry: charger_protocol value -> adapter ----
const adapters = {
  ocpp: ocppAdapter,
  wifi_api: wifiApiAdapter,
  ethernet_api: ethernetApiAdapter,
  ocpp_2_0_1: ocpp201Adapter,
  rest_api: restApiAdapter,
  websocket: webSocketAdapter,
  mqtt: mqttAdapter,
};

// ---- Public API used by the rest of the app ----
// Usage: import { getAdapter } from "./chargerAdapters";
//        const adapter = getAdapter(charger.charger_protocol);
//        await adapter.remoteStart(charger);
export function getAdapter(protocol) {
  const adapter = adapters[protocol || "ocpp"];
  if (!adapter) {
    throw new Error(`Unknown charger protocol: ${protocol}`);
  }
  return adapter;
}

export function listSupportedProtocols() {
  // Only OCPP is truly functional right now — surface that honestly
  // in any UI that lets a user pick a protocol when pairing a charger.
  return Object.values(adapters).map(a => ({
    value: a.protocol,
    label: a.label,
    working: a.protocol === "ocpp",
  }));
}
