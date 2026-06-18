// ============================================================
// EcoCharge Ghana — App.jsx FINAL (Fixed)
// Font Awesome Free icons + Inter font
// Paystack, Supabase, QR, Booking, Verify, Map
// ============================================================
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL        || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY   || "";
const PAYSTACK_KEY  = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

const sb = async (path, opts = {}) => {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey:SUPABASE_ANON, Authorization:`Bearer ${SUPABASE_ANON}`, "Content-Type":"application/json", ...opts.headers },
      ...opts,
    });
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
};

const T = {
  bg:"#0a0d10", card:"#13171f", card2:"#1a1f2a", border:"#222632",
  green:"#4ade80", greenDark:"#22c55e", greenDim:"#166534",
  text:"#ffffff", muted:"#6b7280", mutedLight:"#9ca3af",
  blue:"#38bdf8", yellow:"#fbbf24", red:"#f87171",
};

const STATIONS = [
  { id:1, name:"Accra Central",  city:"Accra",      bays:6, open:6, solar:85, hydrogen:15, time:"23 mins", lat:5.6037,  lng:-0.1870 },
  { id:2, name:"Kumasi Hub",     city:"Kumasi",     bays:4, open:3, solar:90, hydrogen:10, time:"12 mins", lat:6.6885,  lng:-1.6244 },
  { id:3, name:"Tema Station",   city:"Tema",       bays:8, open:8, solar:75, hydrogen:25, time:"18 mins", lat:5.6698,  lng:-0.0166 },
  { id:4, name:"Takoradi",       city:"Takoradi",   bays:3, open:2, solar:80, hydrogen:20, time:"25 mins", lat:4.8845,  lng:-1.7554 },
  { id:5, name:"Tamale North",   city:"Tamale",     bays:5, open:5, solar:95, hydrogen:5,  time:"45 mins", lat:9.4034,  lng:-0.8424 },
  { id:6, name:"Sunyani East",   city:"Sunyani",    bays:2, open:1, solar:70, hydrogen:30, time:"30 mins", lat:7.3349,  lng:-2.3123 },
  { id:7, name:"Cape Coast",     city:"Cape Coast", bays:6, open:6, solar:88, hydrogen:12, time:"35 mins", lat:5.1053,  lng:-1.2466 },
  { id:8, name:"Ho District",    city:"Ho",         bays:4, open:3, solar:82, hydrogen:18, time:"40 mins", lat:6.6011,  lng:0.4712  },
];

const VEHICLES = [
  { type:"Car",      price:"GH₵140–210", amount:175, desc:"Full EV sedan — solar powered"  },
  { type:"Scooter",  price:"GH₵8–15",   amount:12,  desc:"Electric scooter fast charge"    },
  { type:"Tricycle", price:"GH₵18–28",  amount:23,  desc:"Cargo tricycle — station charge" },
];

const DURATIONS = [
  { label:"30 min",  value:30,  extra:0  },
  { label:"1 hour",  value:60,  extra:5  },
  { label:"2 hours", value:120, extra:10 },
  { label:"3 hours", value:180, extra:15 },
];

const useSolarData = (lat=7.9465, lng=-1.0232) => {
  const [solar, setSolar] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    const fetchSolar = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=shortwave_radiation,direct_radiation,diffuse_radiation,sunshine_duration,cloud_cover&timezone=Africa%2FAccra&forecast_days=1`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current;
        setSolar({
          radiation:  Math.round(c.shortwave_radiation||0),
          direct:     Math.round(c.direct_radiation||0),
          diffuse:    Math.round(c.diffuse_radiation||0),
          cloudCover: Math.round(c.cloud_cover||0),
          sunshine:   Math.round(c.sunshine_duration||0),
          efficiency: Math.min(100,Math.round((c.shortwave_radiation||0)/10)),
          updated:    new Date().toLocaleTimeString("en-GH",{ hour:"2-digit",minute:"2-digit" }),
        });
      } catch(e) {
        setSolar({ radiation:650,direct:500,diffuse:150,cloudCover:20,sunshine:45,efficiency:65,updated:"--:--" });
      }
      setLoading(false);
    };
    fetchSolar();
    const interval = setInterval(fetchSolar, 600000);
    return ()=>clearInterval(interval);
  },[]);
  return { solar, loading };
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%;-webkit-text-size-adjust:100%}
  body{font-family:'Inter',sans-serif;background:#0a0d10;color:#fff;-webkit-font-smoothing:antialiased;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade{animation:fadeUp .3s ease both}
  .fade1{animation:fadeUp .3s .06s ease both}
  .fade2{animation:fadeUp .3s .12s ease both}
  .fade3{animation:fadeUp .3s .18s ease both}
  .tap{transition:opacity .15s,transform .15s;cursor:pointer;-webkit-tap-highlight-color:transparent;}
  .tap:active{opacity:.7;transform:scale(.97)}
  .row{transition:background .15s;cursor:pointer}
  .row:active{background:#1e2330}
  input,button,textarea{font-family:'Inter',sans-serif;outline:none}
