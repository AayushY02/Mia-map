// src/layers/busRoutesLinkedLayer.ts
// import { blobUrl } from "@/lib/blobUrl";
import type maplibregl from "maplibre-gl";

const SRC_ID = "bus-routes-linked-src";
const LYR_MATCHED = "bus-routes-common";
const LYR_OTHER = "bus-routes-other";

// NEW: a dedicated layer that renders only the listed route_ids
const LYR_HILITE = "bus-routes-highlighted";

// ⚠️ Put your file at: public/data/bus_routes_linked_p11.geojson
// const DATA_URL = blobUrl("bus_routes_linked_p11.geojson");
const DATA_URL = "/data/bus_route.geojson";


// Colors (feel free to adjust)
const COLOR_MATCHED = "#DB3A34"; // red-ish
const COLOR_OTHER = "#000000";   // gray
// NEW: color for the highlighted-only layer
const HIGHLIGHT_COLOR = "#FFD60A";

// NEW: the route_ids you want to render in the new toggle
const HIGHLIGHT_ROUTE_IDS = [
  492, 511, 596, 2404, 2488, 2494, 2495, 4500, 7395, 11706, 13024, 13239
];
const HIGHLIGHT_ROUTE_IDS_STR = HIGHLIGHT_ROUTE_IDS.map(String);
// filter that matches number or string route_id
const FILTER_HILITE = [
  "any",
  ["in", ["get", "route_id"], ["literal", HIGHLIGHT_ROUTE_IDS]],
  ["in", ["to-string", ["get", "route_id"]], ["literal", HIGHLIGHT_ROUTE_IDS_STR]]
] as const;

// Default paints
const MATCHED_WIDTH_BASE = ["interpolate", ["linear"], ["zoom"], 8, 1.0, 12, 2.0, 16, 3.0] as const;
const OTHER_WIDTH_BASE = ["interpolate", ["linear"], ["zoom"], 8, 0.8, 12, 1.6, 16, 2.4] as const;
const MATCHED_WIDTH_HI = ["interpolate", ["linear"], ["zoom"], 8, 3.0, 12, 4.0, 16, 6.0] as const;
const OTHER_WIDTH_HI = ["interpolate", ["linear"], ["zoom"], 8, 2.4, 12, 3.2, 16, 4.8] as const;

const MATCHED_OPACITY_DEFAULT = 0.95;
const OTHER_OPACITY_DEFAULT = 0.70;
const DIMMED_OPACITY = 0.15;

// ---- Selection helpers ------------------------------------------------------

function getStateBag(map: maplibregl.Map): any {
  const M = map as any;
  if (!M.__busRoutesLinkedState) {
    M.__busRoutesLinkedState = {
      selectedRouteId: null as number | null,
      // NEW: remember visibility of the two base layers when entering highlight-only mode
      __prevCommonVisible: false as boolean,
      __prevOtherVisible: false as boolean,
    };
  }
  return M.__busRoutesLinkedState;
}

/**
 * Apply (or clear) selection visuals by updating paint expressions.
 * Uses route_id stored in feature properties (no promoteId required).
 */
function applySelection(map: maplibregl.Map, selectedRouteId: number | null) {
  const ids = [LYR_MATCHED, LYR_OTHER] as const;

  // Build expressions that depend on selectedRouteId
  const makeOpacityExpr = (baseOpacity: number) =>
    selectedRouteId == null
      ? baseOpacity
      : ["case",
        ["==", ["get", "route_id"], selectedRouteId],
        baseOpacity,       // selected stays at its base opacity
        DIMMED_OPACITY     // others dim
      ];

  const matchedWidthExpr =
    selectedRouteId == null
      ? MATCHED_WIDTH_BASE
      : ["case",
        ["==", ["get", "route_id"], selectedRouteId],
        MATCHED_WIDTH_HI,
        MATCHED_WIDTH_BASE
      ];

  const otherWidthExpr =
    selectedRouteId == null
      ? OTHER_WIDTH_BASE
      : ["case",
        ["==", ["get", "route_id"], selectedRouteId],
        OTHER_WIDTH_HI,
        OTHER_WIDTH_BASE
      ];

  ids.forEach((id) => {
    if (!map.getLayer(id)) return;
    if (id === LYR_MATCHED) {
      map.setPaintProperty(id, "line-opacity", makeOpacityExpr(MATCHED_OPACITY_DEFAULT));
      map.setPaintProperty(id, "line-width", matchedWidthExpr as any);
    } else {
      map.setPaintProperty(id, "line-opacity", makeOpacityExpr(OTHER_OPACITY_DEFAULT));
      map.setPaintProperty(id, "line-width", otherWidthExpr as any);
    }
  });
}

function clearSelection(map: maplibregl.Map) {
  const st = getStateBag(map);
  st.selectedRouteId = null;
  applySelection(map, null);
}

// ----------------------------------------------------------------------------

async function ensureSource(map: maplibregl.Map): Promise<void> {
  if (map.getSource(SRC_ID)) return;

  // Simple in-memory cache on the map instance
  const M = map as any;
  if (!M.__busRoutesLinkedGeoJSON) {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Failed to load ${DATA_URL}`);
    M.__busRoutesLinkedGeoJSON = await resp.json();
  }

  map.addSource(SRC_ID, {
    type: "geojson",
    data: M.__busRoutesLinkedGeoJSON,
    lineMetrics: true,
    // We’re selecting by property with setPaintProperty expressions,
    // so promoteId is optional here. If you later want feature-state selection,
    // uncomment the next line after ensuring each feature has unique route_id.
    // promoteId: "route_id",
  } as any);
}

function ensureMatchedLayer(map: maplibregl.Map) {
  if (map.getLayer(LYR_MATCHED)) return;

  // has_common_code === true && start_stop_ids.length > 0 && end_stop_ids.length > 0
  const filter: any = [
    "all",
    ["==", ["get", "has_common_code"], true],
    [">", ["length", ["get", "start_stop_ids"]], 0],
    [">", ["length", ["get", "end_stop_ids"]], 0],
  ];

  map.addLayer({
    id: LYR_MATCHED,
    type: "line",
    source: SRC_ID,
    filter,
    paint: {
      "line-color": COLOR_MATCHED,
      "line-width": MATCHED_WIDTH_BASE as any,
      "line-opacity": MATCHED_OPACITY_DEFAULT
    },
    layout: { "line-cap": "round", "line-join": "round", visibility: "none" }
  });
}

function ensureOtherLayer(map: maplibregl.Map) {
  if (map.getLayer(LYR_OTHER)) return;

  // !(matched condition)  → either no common code OR missing start/end ids
  const filter: any = [
    "any",
    ["!=", ["get", "has_common_code"], true],
    ["<=", ["length", ["get", "start_stop_ids"]], 0],
    ["<=", ["length", ["get", "end_stop_ids"]], 0],
  ];

  map.addLayer({
    id: LYR_OTHER,
    type: "line",
    source: SRC_ID,
    filter,
    paint: {
      "line-color": COLOR_OTHER,
      "line-width": OTHER_WIDTH_BASE as any,
      "line-opacity": OTHER_OPACITY_DEFAULT
    },
    layout: { "line-cap": "round", "line-join": "round", visibility: "none" }
  });
}

// NEW: add a layer that renders ONLY the specified route_ids
function ensureHighlightedLayer(map: maplibregl.Map) {
  if (map.getLayer(LYR_HILITE)) return;

  map.addLayer({
    id: LYR_HILITE,
    type: "line",
    source: SRC_ID,
    filter: FILTER_HILITE as any,
    paint: {
      "line-color": HIGHLIGHT_COLOR,
      "line-width": MATCHED_WIDTH_HI as any,
      "line-opacity": 1.0
    },
    layout: { "line-cap": "round", "line-join": "round", visibility: "none" }
  });
}

function showLayer(map: maplibregl.Map, id: string, visible: boolean) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

function bumpOverBase(map: maplibregl.Map, ids: string[]) {
  // keep these above base strokes but under your passenger circles (you already bump circles to top)
  ids.forEach(id => { if (map.getLayer(id)) try { map.moveLayer(id); } catch { } });
}

/** Toggle: Matched (common code + both ends present) */
export async function toggleBusRoutesCommonLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  setIsLoading(true);
  try {
    [
      'mesh-1km-fill', 'mesh-1km-outline',
      'mesh-500m-fill', 'mesh-500m-outline',
      'mesh-250m-fill', 'mesh-250m-outline',
    ].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    await ensureSource(map);
    ensureMatchedLayer(map);
    showLayer(map, LYR_MATCHED, !currentlyVisible);
    bumpOverBase(map, [LYR_OTHER, LYR_MATCHED, LYR_HILITE]);

    // Reapply selection state if any (useful when toggling)
    const st = getStateBag(map);
    applySelection(map, st.selectedRouteId);

    setVisible(!currentlyVisible);
  } finally {
    map.once("idle", () => setIsLoading(false));
  }
}

/** Toggle: Other (no common code OR missing start/end) */
export async function toggleBusRoutesOtherLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  setIsLoading(true);
  try {
    [
      'mesh-1km-fill', 'mesh-1km-outline',
      'mesh-500m-fill', 'mesh-500m-outline',
      'mesh-250m-fill', 'mesh-250m-outline',
    ].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    await ensureSource(map);
    ensureOtherLayer(map);
    showLayer(map, LYR_OTHER, !currentlyVisible);
    bumpOverBase(map, [LYR_OTHER, LYR_MATCHED, LYR_HILITE]);

    // Reapply any selection
    const st = getStateBag(map);
    applySelection(map, st.selectedRouteId);

    setVisible(!currentlyVisible);
  } finally {
    map.once("idle", () => setIsLoading(false));
  }
}

/** NEW Toggle: only the specified route_ids */
export async function toggleBusRoutesHighlightedLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  setIsLoading(true);
  try {
    [
      'mesh-1km-fill', 'mesh-1km-outline',
      'mesh-500m-fill', 'mesh-500m-outline',
      'mesh-250m-fill', 'mesh-250m-outline',
    ].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    await ensureSource(map);
    ensureHighlightedLayer(map);

    const st = getStateBag(map);

    if (!currentlyVisible) {
      // turning ON highlight-only mode: remember & hide other layers
      st.__prevCommonVisible = (map.getLayer(LYR_MATCHED) && map.getLayoutProperty(LYR_MATCHED, "visibility") === "visible") as boolean;
      st.__prevOtherVisible = (map.getLayer(LYR_OTHER) && map.getLayoutProperty(LYR_OTHER, "visibility") === "visible") as boolean;

      showLayer(map, LYR_MATCHED, false);
      showLayer(map, LYR_OTHER, false);
      showLayer(map, LYR_HILITE, true);
    } else {
      // turning OFF: restore previous visibilities
      showLayer(map, LYR_HILITE, false);
      showLayer(map, LYR_MATCHED, !!st.__prevCommonVisible);
      showLayer(map, LYR_OTHER, !!st.__prevOtherVisible);
    }

    bumpOverBase(map, [LYR_HILITE]);

    setVisible(!currentlyVisible);
  } finally {
    map.once("idle", () => setIsLoading(false));
  }
}

/** Tooltip + click-to-highlight (attach once in MapView on load) */
export function wireBusRoutesHover(map: maplibregl.Map, popup: maplibregl.Popup) {
  // NEW: include the highlighted-only layer so hover/click work on it too
  const layers = [LYR_MATCHED, LYR_OTHER, LYR_HILITE];

  const onMove = (e: any) => {
    const f = e.features?.[0]; if (!f) return;
    map.getCanvas().style.cursor = "pointer";
    const p = f.properties || {};
    const namesStart = Array.isArray(p.start_stop_names) ? p.start_stop_names.join(" / ") : (p.start_stop_names ?? "");
    const namesEnd = Array.isArray(p.end_stop_names) ? p.end_stop_names.join(" / ") : (p.end_stop_names ?? "");
    const common = Array.isArray(p.common_codes) ? p.common_codes.join(", ") : (p.common_codes ?? "");

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="rounded-xl border bg-white p-3 shadow text-xs w-80">
          <div><strong>Route:</strong> ${p.N07_001 ?? "-"}</div>
          <div><strong>Start stops:</strong> ${namesStart || "-"}</div>
          <div><strong>End stops:</strong> ${namesEnd || "-"}</div>
          <div><strong>Common code(s):</strong> ${common || "-"}</div>
          <div><strong>Route Id:</strong> ${p.route_id ?? "-"}</div>
        </div>
      `)
      .addTo(map);
  };
  const onLeave = () => { map.getCanvas().style.cursor = ""; popup.remove(); };

  layers.forEach(id => {
    map.on("mousemove", id, onMove);
    map.on("mouseleave", id, onLeave);
  });

  // ---- Click to select/deselect -------------------------------------------

  // Select a route by clicking it
  const onClickRoute = (e: any) => {
    const f = e.features?.[0];
    const p = f?.properties;
    if (!p || p.route_id == null) return;

    const st = getStateBag(map);
    const newId = typeof p.route_id === "string" ? Number(p.route_id) : p.route_id as number;
    st.selectedRouteId = newId;
    applySelection(map, newId);
  };

  // Clear selection when clicking on empty map (no route under cursor)
  const onClickMap = (e: maplibregl.MapMouseEvent) => {
    if (map.getLayer('bus-routes-common')) {
      const features = map.queryRenderedFeatures(e.point, { layers });

      if (!features || features.length === 0) {
        clearSelection(map);
      }
    }
  };

  layers.forEach(id => map.on("click", id, onClickRoute));
  map.on("click", onClickMap);

  // Optional: ESC key to clear selection
  map.getCanvas().addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Escape") clearSelection(map);
  });
}
