import maplibregl from "maplibre-gl";
import type { ExpressionSpecification, Map, GeoJSONSourceSpecification } from "maplibre-gl";

/** ===== Public types & defaults ===== */

export type FrequencyDay = "weekday" | "saturday" | "holiday";

export type FreqStyleConfig = {
  /** Range cut points. Color bands are: <t0, [t0,t1), [t1,t2), ... , >=t{n-1} */
  thresholds: number[];
  /** Colors for each band (length = thresholds.length + 1) */
  colors: string[];
  /** Thinness controller (px). min applies at 0, max applies at >= last threshold */
  widthRange: { min: number; max: number };
};

export const DEFAULT_FREQ_STYLE: FreqStyleConfig = {
  // Thinner than before (your request), tune freely in UI
  thresholds: [1, 10, 20, 30, 40],
  colors: [
    "#000000", // < 1
    "#91bfdb", // 1–9
    "#4575b4", // 10–19
    "#fee090", // 20–29
    "#fc8d59", // 30–39
    "#d73027", // >= 40
  ],
  widthRange: { min: 1.0, max: 4.2 }, // thinner lines
};

/** ===== Internal config ===== */

const ROUTES_FREQ_URL = "/data/bus_frequency_layer.geojson"; // <-- your uploaded file
const SRC_ID = "bus-routes-freq-src";
const LAYER_LINE_ID = "bus-routes-freq";
const LAYER_CASING_ID = "bus-routes-freq-casing";
const POPUP_KEY = `${LAYER_LINE_ID}-popup`;

/** ===== Small helpers ===== */

const asExpr = (v: unknown) => v as unknown as ExpressionSpecification;
const addExpr = (a: number | ExpressionSpecification, b: number | ExpressionSpecification): ExpressionSpecification =>
  asExpr(["+", a as any, b as any]);

/** Use exactly 平日 / 土曜 / 日祝 based on selected day */
function getFreqExpression(day: FrequencyDay): ExpressionSpecification {
  const key = day === "weekday" ? "平日" : day === "saturday" ? "土曜" : "日祝";
  return asExpr(["case", ["has", key], ["to-number", ["get", key]], 0]);
}

/** Build a ["step", freq, ...] color expression from thresholds & colors. */
function colorStep(day: FrequencyDay, cfg: FreqStyleConfig): ExpressionSpecification {
  const f = getFreqExpression(day);

  // Ensure colors length = thresholds.length + 1
  const colors = normalizeColors(cfg);
  const t = cfg.thresholds;

  // ["step", f, colors[0], t0, colors[1], t1, colors[2], ...]
  const expr: any[] = ["step", f, colors[0]];
  for (let i = 0; i < t.length; i++) {
    expr.push(t[i], colors[i + 1]);
  }
  return asExpr(expr);
}

/** Build a width ramp from 0->min and lastThreshold->max */
function widthRamp(day: FrequencyDay, cfg: FreqStyleConfig): ExpressionSpecification {
  const f = getFreqExpression(day);
  const lastT = cfg.thresholds.length ? cfg.thresholds[cfg.thresholds.length - 1] : 1;
  const minW = cfg.widthRange.min;
  const maxW = cfg.widthRange.max;

  return asExpr([
    "interpolate",
    ["linear"],
    f,
    0, minW,
    lastT, maxW,
  ]);
}

function normalizeColors(cfg: FreqStyleConfig): string[] {
  const need = cfg.thresholds.length + 1;
  const out = [...cfg.colors];
  if (out.length < need) {
    // pad with last color
    while (out.length < need) out.push(out[out.length - 1] ?? "#000000");
  } else if (out.length > need) {
    out.length = need;
  }
  return out;
}

/** ===== Source & layers ===== */

async function ensureSource(map: Map) {
  if (map.getSource(SRC_ID)) return;

  const raw = await fetch(ROUTES_FREQ_URL).then((r) => r.json());
  const src: GeoJSONSourceSpecification = { type: "geojson", data: raw };
  map.addSource(SRC_ID, src);
}

function ensureLayers(map: Map, day: FrequencyDay, style: FreqStyleConfig) {
  // Casing first (thin white halo to separate from basemap)
  if (!map.getLayer(LAYER_CASING_ID)) {
    map.addLayer({
      id: LAYER_CASING_ID,
      type: "line",
      source: SRC_ID,
      layout: { visibility: "none" },
      paint: {
        "line-color": "#ffffff",
        "line-width": addExpr(widthRamp(day, style), 0.9), // casing thinner now
        "line-opacity": 0.45,
      },
    });
  }

  if (!map.getLayer(LAYER_LINE_ID)) {
    map.addLayer({
      id: LAYER_LINE_ID,
      type: "line",
      source: SRC_ID,
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": colorStep(day, style),
        "line-width": widthRamp(day, style),
        "line-opacity": 0.95,
      },
    });

    // Pretty hover tooltip (rounded corners + shadow)
    if (!(map as any)[POPUP_KEY]) {
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "320px", className: "ai-popup" });
      (map as any)[POPUP_KEY] = popup;

      map.on("mousemove", LAYER_LINE_ID, (e: any) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        const wk = p["平日"] ?? "-";
        const sa = p["土曜"] ?? "-";
        const ho = p["日祝"] ?? "-";

        const active = day === "weekday" ? "平日" : day === "saturday" ? "土曜" : "日祝";

        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="
                font-family: ui-sans-serif, system-ui; font-size: 12px; 
                background: white; color: #111827; 
                border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                padding: 10px 12px; border: 1px solid rgba(0,0,0,0.06);
              ">
               <div style="font-weight:600; margin-bottom:6px;">運行本数</div>
               <div style="display:grid; grid-template-columns:90px auto; gap:4px;">
                 <div>平日</div><div><b${active==="平日" ? ' style="background:#111827;color:white;border-radius:6px;padding:2px 6px;"' : ""}>${wk}</b></div>
                 <div>土曜</div><div><b${active==="土曜" ? ' style="background:#111827;color:white;border-radius:6px;padding:2px 6px;"' : ""}>${sa}</b></div>
                 <div>日祝</div><div><b${active==="日祝" ? ' style="background:#111827;color:white;border-radius:6px;padding:2px 6px;"' : ""}>${ho}</b></div>
               </div>
             </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", LAYER_LINE_ID, () => {
        popup.remove();
      });
    }
  }
}

/** ===== Public API ===== */

/** Toggle ON/OFF (creates layers if missing) */
export async function toggleBusRoutesFrequencyLayer(
  map: Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void,
  day: FrequencyDay,
  style: FreqStyleConfig = DEFAULT_FREQ_STYLE
) {
  setIsLoading(true);
  try {
    await ensureSource(map);
    ensureLayers(map, day, style);

    const to = currentlyVisible ? "none" : "visible";
    map.setLayoutProperty(LAYER_CASING_ID, "visibility", to);
    map.setLayoutProperty(LAYER_LINE_ID, "visibility", to);

    map.once("idle", () => {
      setVisible(!currentlyVisible);
      setIsLoading(false);
    });
  } catch (e) {
    console.error("busRoutesFrequencyLayer toggle failed:", e);
    setVisible(!currentlyVisible);
    setIsLoading(false);
  }
}

/** Switch day (rebuilds color & width using current style config) */
export function updateBusRoutesFrequencyDay(
  map: Map,
  day: FrequencyDay,
  style: FreqStyleConfig = DEFAULT_FREQ_STYLE
) {
  if (!map.getLayer(LAYER_LINE_ID)) return;
  map.setPaintProperty(LAYER_LINE_ID, "line-color", colorStep(day, style));
  map.setPaintProperty(LAYER_LINE_ID, "line-width", widthRamp(day, style));
  map.setPaintProperty(LAYER_CASING_ID, "line-width", addExpr(widthRamp(day, style), 0.9));
}

/** Update style config live (thresholds/colors/width) */
export function updateBusRoutesFrequencyStyle(
  map: Map,
  day: FrequencyDay,
  style: FreqStyleConfig
) {
  updateBusRoutesFrequencyDay(map, day, style);
}
