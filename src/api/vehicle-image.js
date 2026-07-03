// api/vehicle-image.js  — Vercel Serverless Function
// Proxies CarsXE API calls server-side (no CORS issues)
// Deploy by creating this file at: /api/vehicle-image.js in your repo root

export default async function handler(req, res) {
  // CORS headers so the browser can call this
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
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const params = new URLSearchParams({ key, make, model, year });

    // Fetch specs and image in parallel
    const [specsRes, imgRes] = await Promise.all([
      fetch(`https://api.carsxe.com/specs?${params}`),
      fetch(`https://api.carsxe.com/images?${params}`),
    ]);

    const specsData = specsRes.ok ? await specsRes.json() : null;
    const imgData   = imgRes.ok  ? await imgRes.json()   : null;

    // Extract image URL — CarsXE returns {images:[{link,angle},...]}
    const imgs = imgData?.images || imgData?.data || [];
    const best = imgs.find(i => /front|exterior|side/i.test(i.angle||i.perspective||""))
               || imgs[0];
    const imageUrl = best?.link || best?.url || best?.src || null;

    // Normalise specs
    const s = specsData || {};
    return res.status(200).json({
      imageUrl,
      battery:   parseFloat(s.battery_capacity_kwh || s.battery_kwh || s.battery || 0) || null,
      connector: s.charge_connector || s.connector || s.plug_type || null,
      range:     parseFloat(s.range_km || s.electric_range_km || s.range || 0) || null,
      maxPower:  parseFloat(s.charge_power_kw || s.max_charge_kw || s.charging_power || 0) || null,
      bodyType:  s.body_style || s.body_type || null,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
