// api/vehicle-image.js — Vercel Serverless Proxy
// Calls CarsXE server-side (bypasses browser CORS block)
// Falls back gracefully if CarsXE has no image

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { make, model, year } = req.query;
  const key = process.env.VITE_CARSXE_API_KEY;

  if (!make || !model || !year) {
    return res.status(400).json({ error: "make, model and year required" });
  }
  if (!key) {
    return res.status(500).json({ error: "CARSXE API key not configured" });
  }

  try {
    const params = new URLSearchParams({ key, make, model, year });

    const [specsRes, imgRes] = await Promise.allSettled([
      fetch(`https://api.carsxe.com/specs?${params}`),
      fetch(`https://api.carsxe.com/images?${params}`),
    ]);

    // Parse specs
    let specsData = null;
    if (specsRes.status === "fulfilled" && specsRes.value.ok) {
      try { specsData = await specsRes.value.json(); } catch(e) {}
    }

    // Parse images — try multiple field names CarsXE uses
    let imageUrl = null;
    if (imgRes.status === "fulfilled" && imgRes.value.ok) {
      try {
        const imgData = await imgRes.value.json();
        const imgs = imgData?.images || imgData?.data || imgData?.result || [];
        if (Array.isArray(imgs) && imgs.length > 0) {
          // Prefer front/exterior angle
          const best = imgs.find(i =>
            /front|exterior|main|side/i.test(i.angle || i.perspective || i.view || "")
          ) || imgs[0];
          imageUrl = best?.link || best?.url || best?.src || best?.image || null;
        }
      } catch(e) {}
    }

    const s = specsData || {};
    return res.status(200).json({
      imageUrl,
      battery:   parseFloat(s.battery_capacity_kwh || s.battery_kwh || s.battery_ev_kwh || s.battery || 0) || null,
      connector: s.charge_connector || s.connector_type || s.plug_type || s.charging_type || null,
      range:     parseFloat(s.range_km || s.electric_range_km || s.ev_range || s.range || 0) || null,
      maxPower:  parseFloat(s.charge_power_kw || s.max_charge_kw || s.charging_power_kw || 0) || null,
      bodyType:  s.body_style || s.body_type || s.style || null,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
