import maplibregl from "maplibre-gl";
import type {
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";

type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;

const SRC_ID = "chiba-roads-src";
const LYR_GLOW = "chiba-roads-glow";
const LYR_CASING = "chiba-roads-casing";
const LYR_MAIN = "chiba-roads-main";

/** FeatureCollection of LineString/MultiLineString with property "N01_001" */
const DATA_URL = "/data/chiba_road_line.geojson";

// 1: 高速道路, 2: 一般道路, 3: 主要地方道
const COLOR_EXPRESS = "#911";     // green-ish you set earlier
const COLOR_GENERAL = "#519";     // yellow-ish you set earlier
const COLOR_PRIMARY = "#F98989";  // pink
const COLOR_OTHER = "#C8CBD0";    // fallback

// --- internal module state ---
let handlersBound = false;
let popup: maplibregl.Popup | null = null;
let selected: { id?: string | number; code?: number } | null = null;

// ---------- helpers ----------
const labelByCode = (code?: number) =>
  code === 1 ? "高速道路" : code === 2 ? "一般道路" : code === 3 ? "主要地方道" : "その他";

function ensureSource(map: maplibregl.Map) {
  if (map.getSource(SRC_ID)) return;
  map.addSource(SRC_ID, {
    type: "geojson",
    data: DATA_URL,
    attribution: "道路（千葉県）",
    // If your GeoJSON has a unique property (e.g., "fid"), uncomment promoteId to use precise per-feature selection:
    // promoteId: "fid",
  });
}

/** N01_001 → color (typed expression) */
function colorByType(): ExpressionSpecification {
  return [
    "match",
    ["to-number", ["get", "N01_001"]],
    1, COLOR_EXPRESS,
    2, COLOR_GENERAL,
    3, COLOR_PRIMARY,
    COLOR_OTHER,
  ];
}

/** Thicker zoom-based widths (in px) */
function widthByZoom(mult = 1): ExpressionSpecification {
  return [
    "interpolate", ["linear"], ["zoom"],
    8,  0.8 * mult,
    10, 1.8 * mult,
    12, 3.2 * mult,
    14, 5.0 * mult,
    16, 8.0 * mult,
    18, 14.0 * mult,
  ];
}

/** Slight blur grows with zoom for the glow layer */
function blurByZoom(): ExpressionSpecification {
  return [
    "interpolate", ["linear"], ["zoom"],
    8,  0.3,
    12, 0.8,
    14, 1.2,
    16, 1.8,
    18, 2.5,
  ];
}

// ---- selection handling ----
function applyFilterForSelection(map: maplibregl.Map) {
  let filter: FilterSpecification | null = null;

  if (selected?.id !== undefined) {
    // precise single-feature filter (requires feature.id or promoteId)
    filter = ["==", ["id"], selected.id] as FilterSpecification;
  } else if (Number.isFinite(selected?.code)) {
    // fallback: filter by category (shows all of that color)
    filter = ["==", ["to-number", ["get", "N01_001"]], selected!.code!] as FilterSpecification;
  } else {
    filter = null; // show all
  }

  map.setFilter(LYR_GLOW, filter as any);
  map.setFilter(LYR_CASING, filter as any);
  map.setFilter(LYR_MAIN, filter as any);
}

function clearSelection(map: maplibregl.Map) {
  selected = null;
  applyFilterForSelection(map);
}

function ensureInteractions(map: maplibregl.Map) {
  if (handlersBound) return;
  handlersBound = true;

  // create popup once
  popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 8,
    className: "roads-popup",
  });

  // Hover tooltip
  const onMove = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    const code = Number((f.properties as any)?.["N01_001"]);
    const html = `
      <div class="text-xs p-2">
        <div><strong>種別:</strong> ${labelByCode(code)}</div>
        <div class="opacity-70"><span class="font-mono">N01_001</span>: ${Number.isFinite(code) ? code : "N/A"}</div>
      </div>`;
    map.getCanvas().style.cursor = "pointer";
    popup!.setLngLat(e.lngLat).setHTML(html).addTo(map);
  };

  map.on("mousemove", LYR_MAIN, onMove);
  map.on("mouseleave", LYR_MAIN, () => {
    map.getCanvas().style.cursor = "";
    popup?.remove();
  });

  // Click to isolate
  map.on("click", LYR_MAIN, (e) => {
    const f = e.features?.[0];
    if (!f) return;

    const fid = (f.id as string | number | undefined) ?? undefined;
    const code = Number((f.properties as any)?.["N01_001"]);

    // prefer single-feature isolation if we have an id (source or promoteId)
    selected = fid !== undefined ? { id: fid } : Number.isFinite(code) ? { code } : null;
    applyFilterForSelection(map);
  });

  // Click empty space → clear selection
  map.on("click", (e) => {
    // If click didn't hit our line layer, clear
    const hits = map.queryRenderedFeatures(e.point, { layers: [LYR_MAIN] });
    if (!hits.length) clearSelection(map);
  });

  // Right-click anywhere → clear
  map.on("contextmenu", () => clearSelection(map));
}

function ensureLayers(map: maplibregl.Map) {
  // 1) Soft colored glow underneath everything else
  if (!map.getLayer(LYR_GLOW)) {
    map.addLayer({
      id: LYR_GLOW,
      type: "line",
      source: SRC_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": colorByType(),
        "line-width": widthByZoom(2.2), // widest
        "line-opacity": 0.35,
        "line-blur": blurByZoom(),
      },
    });
  }

  // 2) White casing
  if (!map.getLayer(LYR_CASING)) {
    map.addLayer({
      id: LYR_CASING,
      type: "line",
      source: SRC_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": widthByZoom(1.9),
        "line-opacity": 0.9,
      },
    });
  }

  // 3) Colored core
  if (!map.getLayer(LYR_MAIN)) {
    map.addLayer({
      id: LYR_MAIN,
      type: "line",
      source: SRC_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": colorByType(),
        "line-width": widthByZoom(1.2),
        "line-opacity": 0.98,
      },
    });
  }

  // Bind hover/click only once
  ensureInteractions(map);

  // Re-apply filter if user toggled layer off/on while selected
  if (selected) applyFilterForSelection(map);
}

function setVisibility(map: maplibregl.Map, visible: boolean) {
  const v = visible ? "visible" : "none";
  if (map.getLayer(LYR_GLOW)) map.setLayoutProperty(LYR_GLOW, "visibility", v);
  if (map.getLayer(LYR_CASING)) map.setLayoutProperty(LYR_CASING, "visibility", v);
  if (map.getLayer(LYR_MAIN)) map.setLayoutProperty(LYR_MAIN, "visibility", v);
}

export function toggleChibaRoadsLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setVisible: BoolSetter
) {
  const next = !currentlyVisible;
  setIsLoading(true);

  requestAnimationFrame(() => {
    if (next) {
      ensureSource(map);
      ensureLayers(map);
      setVisibility(map, true);
    } else {
      setVisibility(map, false);
    }
    map.once("idle", () => {
      setVisible(next);
      setIsLoading(false);
    });
  });
}
