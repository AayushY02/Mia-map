// src/layers/railwayLayer.ts
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
// import { blobUrl } from "@/lib/blobUrl";
type StationProps = {
  name: string;
  station_group: string | null;
  merged_count: number;
  operators: string[];
  lines: string[];
};

/* ---------- Data paths ---------- */

// const DATA_RAIL_LINES = blobUrl("railroad_section.geojson"); ;
const DATA_RAIL_LINES = "/data/railroad_section.geojson"; 
// const DATA_RAIL_STATIONS = blobUrl("railway_station.geojson");
const DATA_RAIL_STATIONS = "/data/railway_station.geojson";
// const DATA_STATION_PAX = blobUrl("S12-24_NumberOfPassengers.geojson");

/* ---------- Keys for interaction state ---------- */
const HOVER_POPUP_KEY = "__rail_hover_popup";
const CLICK_POPUP_KEY = "__rail_click_popup";
const ATTACHED_SET_KEY = "__rail_interactions_attached"; // Set<string> of layerIds

/* ---------- Utilities ---------- */
function getOrCreatePopup(
  map: maplibregl.Map,
  key: string,
  opts: maplibregl.PopupOptions = {
    closeButton: false,
    closeOnClick: true,
    className: "ai-popup-2",
  }
) {
  const M = map as any;
  if (!M[key]) M[key] = new maplibregl.Popup(opts);
  return M[key] as maplibregl.Popup;
}

function getProp(props: any, keys: string[], fallback = ""): string {
  if (!props) return fallback;
  for (const k of keys) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== "") {
      return String(props[k]);
    }
  }
  return fallback;
}

function lineTitle(props: any) {
  const line = getProp(props, ["路線名", "line", "LINE", "N02_003", "name", "NAME"]);
  const operator = getProp(props, ["N02_004", "事業者名", "operator", "OPERATOR", "N02_002"]);
  return { title: line || "Railway line", subtitle: operator || "" };
}

function stationTitle(props: any) {
  const station = getProp(props, ["駅名", "name", "NAME", "N02_005", "title"]);
  const line = getProp(props, ["路線名", "line", "LINE", "N02_003"]);
  const operator = getProp(props, ["N02_004", "事業者名", "operator", "OPERATOR", "N02_002"]);
  return { title: station || "Railway station", subtitle: [line, operator].filter(Boolean).join(" · ") };
}

/* --- Popup markup (styled by your .ai-popup-2 CSS) --- */
function renderTooltipHTML(h: { title: string; subtitle?: string }, props: any) {
  const keys = Object.keys(props || {});
  const rows = keys.slice(0, 6).map((k) => {
    const v = props[k];
    const text = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `<div class="ai-pop-row"><span class="k">${k}:</span><span>${text}</span></div>`;
  });
  return `
    <div class="ai-pop-card">
      <div class="ai-pop-title">${h.title}</div>
      ${h.subtitle ? `<div class="ai-pop-sub">${h.subtitle}</div>` : ""}
      ${rows.length ? `<div class="ai-pop-rows">${rows.join("")}</div>` : ""}
      <div class="ai-pop-footer">Click for details</div>
    </div>
  `;
}

function renderClickHTML(h: { title: string; subtitle?: string }, props: any) {
  const keys = Object.keys(props || {});
  const rows = keys.map((k) => {
    const v = props[k];
    const text =
      typeof v === "object"
        ? `<pre class="ai-pre">${JSON.stringify(v, null, 2)}</pre>`
        : String(v);
    return `<tr><td class="k">${k}</td><td>${text}</td></tr>`;
  });
  return `
    <div class="ai-pop-card lg">
      <div class="ai-pop-title">${h.title}</div>
      ${h.subtitle ? `<div class="ai-pop-sub">${h.subtitle}</div>` : ""}
      <table class="ai-pop-table">${rows.join("")}</table>
    </div>
  `;
}

/* ---------- Icons for overlays ---------- */
function registerRailTickIcon(map: maplibregl.Map) {
  const M = map as any;
  if (M.__rail_tick_img) return;

  // Horizontal bar; we rotate 90° in the symbol layer to make it perpendicular to the line
  const w = 12, h = 3; // long x short
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  map.addImage("rail-tick", imgData, { pixelRatio: 2 });
  M.__rail_tick_img = true;
}

function findFirstCityMaskLayerId(map: maplibregl.Map): string | null {
  const style = map.getStyle();
  if (!style?.layers) return null;

  // Heuristics: treat any layer id that contains "mask" or "city-mask" as part of the mask group.
  const layers = style.layers;
  const indices: Array<{ id: string; idx: number }> = [];
  for (let i = 0; i < layers.length; i++) {
    const id = layers[i].id.toLowerCase();
    if (id.includes("city-mask") || id.includes("mask")) {
      indices.push({ id: layers[i].id, idx: i });
    }
  }
  if (!indices.length) return null;

  // We want the earliest one so that moving "before" it puts us below the whole mask group.
  indices.sort((a, b) => a.idx - b.idx);
  return indices[0].id;
}

function moveRailwayBelowMask(map: maplibregl.Map, layerIds: string[]) {
  const beforeId = findFirstCityMaskLayerId(map);
  if (!beforeId) return; // mask not present (yet) — safe no-op

  for (const id of layerIds) {
    if (map.getLayer(id)) {
      try { map.moveLayer(id, beforeId); } catch { }
    }
  }
}

function registerRailDotIcon(map: maplibregl.Map) {
  const M = map as any;
  if (M.__rail_dot_img) return;

  const size = 10;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Draw a white circle (dot)
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const imgData = ctx.getImageData(0, 0, size, size);
  map.addImage("rail-dot", imgData, { pixelRatio: 2 });
  M.__rail_dot_img = true;
}

/* ---------- Sources ---------- */
function ensureRailSources(map: maplibregl.Map) {
  if (!map.getSource("rail-lines-src")) {
    map.addSource("rail-lines-src", { type: "geojson", data: DATA_RAIL_LINES });
  }
  if (!map.getSource("rail-stations-src")) {
    map.addSource("rail-stations-src", { type: "geojson", data: DATA_RAIL_STATIONS });
  }
}

/* ---------- Line categories: JR / TX / Other (created hidden) ---------- */
function ensureRailLineLayers(map: maplibregl.Map) {
  registerRailTickIcon(map);
  registerRailDotIcon(map);

  // Robust operator/line extraction (string)
  const operatorExpr: any = [
    "downcase",
    [
      "to-string",
      [
        "coalesce",
        ["get", "N02_004"],
        ["get", "operator"],
        ["get", "OPERATOR"],
        ["get", "事業者名"],
        ["get", "N02_002"],
        "",
      ],
    ],
  ];
  const lineNameExpr: any = [
    "downcase",
    [
      "to-string",
      [
        "coalesce",
        ["get", "N02_003"],
        ["get", "line"],
        ["get", "LINE"],
        ["get", "路線名"],
        "",
      ],
    ],
  ];

  // JR terms
  const jrTerms = [
    "jr",
    "ｊｒ",
    "東日本旅客鉄道",
    "西日本旅客鉄道",
    "東海旅客鉄道",
    "九州旅客鉄道",
    "北海道旅客鉄道",
    "四国旅客鉄道",
    "日本貨物鉄道",
  ];
  const isJR: any = ["any", ...jrTerms.map((t) => [">=", ["index-of", t, operatorExpr], 0])];

  // Tsukuba Express (TX) terms — matches your file:
  // - operator: 首都圏新都市鉄道
  // - line: 常磐新線 (N02 historical name)
  // plus fallbacks: つくばエクスプレス / tsukuba express / metropolitan intercity
  const txOperatorTerms = ["首都圏新都市鉄道", "metropolitan intercity railway"];
  const txLineTerms = ["常磐新線", "つくばエクスプレス", "tsukuba express", "tx"]; // defensive
  const isTXByOperator: any = ["any", ...txOperatorTerms.map((t) => [">=", ["index-of", t, operatorExpr], 0])];
  const isTXByLine: any = ["any", ...txLineTerms.map((t) => [">=", ["index-of", t, lineNameExpr], 0])];
  const isTX: any = ["any", isTXByOperator, isTXByLine];

  // Non-JR & non-TX
  const isOTHER: any = ["all", ["!", isJR], ["!", isTX]];

  /* ---- JR: base + white dash overlay ---- */
  if (!map.getLayer("rail-jr-base")) {
    map.addLayer({
      id: "rail-jr-base",
      type: "line",
      source: "rail-lines-src",
      layout: { visibility: "none" },
      filter: isJR,
      paint: {
        "line-color": "#38b000",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 16, 9],
        "line-opacity": 1,
      },
    });
  }

  if (!map.getLayer("rail-jr-dash")) {
    map.addLayer({
      id: "rail-jr-dash",
      type: "line",
      source: "rail-lines-src",
      layout: { visibility: "none", "line-cap": "butt", "line-join": "bevel" },
      filter: isJR,
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 4, 16, 7],
        "line-opacity": 1,
        "line-dasharray": [
          "step",
          ["zoom"],
          ["literal", [1.2, 3.6]], // z<11
          11,
          ["literal", [2, 6]],
          13,
          ["literal", [3, 9]],
        ],
      },
    } as any);
  }

  /* ---- TX: deep-blue base + white dots overlay ---- */
  if (!map.getLayer("rail-tx-base")) {
    map.addLayer({
      id: "rail-tx-base",
      type: "line",
      source: "rail-lines-src",
      layout: { visibility: "none" },
      filter: isTX,
      paint: {
        "line-color": "#1b4ae0",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.2, 12, 6.4, 16, 9.6],
        "line-opacity": 1,
      },
    });
  }

  if (!map.getLayer("rail-tx-dots")) {
    map.addLayer({
      id: "rail-tx-dots",
      type: "symbol",
      source: "rail-lines-src",
      layout: {
        visibility: "none",
        "symbol-placement": "line",
        "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 8, 64, 12, 48, 16, 40],
        "icon-image": "rail-dot",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.75, 12, 0.95, 16, 1.1],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-keep-upright": false,
        "symbol-z-order": "auto",
      },
      filter: isTX,
      paint: {},
    });
  }

  /* ---- Non-JR (excluding TX): thin dark-green + perpendicular ticks ---- */
  if (!map.getLayer("rail-njr-line")) {
    map.addLayer({
      id: "rail-njr-line",
      type: "line",
      source: "rail-lines-src",
      layout: { visibility: "none" },
      filter: isOTHER,
      paint: {
        "line-color": "#004b23",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.6, 12, 2.6, 16, 3.4],
        "line-opacity": 1,
      },
    });
  }

  if (!map.getLayer("rail-njr-ticks")) {
    map.addLayer({
      id: "rail-njr-ticks",
      type: "symbol",
      source: "rail-lines-src",
      layout: {
        visibility: "none",
        "symbol-placement": "line",
        "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 8, 72, 12, 56, 16, 44],
        "icon-image": "rail-tick",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.9, 12, 1.2, 16, 1.5],
        "icon-rotate": 90,
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-keep-upright": false,
        "symbol-z-order": "auto",
      },
      filter: isOTHER,
      paint: {},
    });
  }
}

// /* ---------- Stations layer (created hidden) ---------- */
// function ensureRailStationLayer(map: maplibregl.Map) {
//   if (!map.getLayer("rail-stations")) {
//     map.addLayer({
//       id: "rail-stations",
//       type: "circle",
//       source: "rail-stations-src",
//       layout: { visibility: "none" },
//       paint: {
//         "circle-radius": 4,
//         "circle-color": "#f72585",
//         "circle-stroke-color": "#ffffff",
//         "circle-stroke-width": 1,
//         "circle-opacity": 0.9,
//       },
//     });
//   }
// }

/* ---------- Stations layer (created hidden, with client-side de-dup) ---------- */
function ensureRailStationLayer(map: maplibregl.Map) {
  const SRC_ID = "rail-stations-src";
  const LYR_ID = "rail-stations";

  // Remove any pre-existing raw source to avoid conflicts
  if (map.getLayer(LYR_ID)) {
    try { map.removeLayer(LYR_ID); } catch { }
  }
  if (map.getSource(SRC_ID)) {
    try { map.removeSource(SRC_ID); } catch { }
  }

  // Small helpers
  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversineMeters = (a: [number, number], b: [number, number]) => {
    const R = 6371000;
    const [lon1, lat1] = a, [lon2, lat2] = b;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s1 + s2));
  };

  const normName = (s: unknown) =>
    String(s ?? "")
      .replace(/\s+/g, "")
      .replace(/駅$/, ""); // drop trailing "駅" for better grouping

  // Convert any geometry to representative point (fast):
  function featureToPointCoord(f: any): [number, number] | null {
    const g = f?.geometry;
    if (!g) return null;
    if (g.type === "Point") return g.coordinates as [number, number];
    if (g.type === "MultiPoint") return (g.coordinates?.[0] as [number, number]) ?? null;
    if (g.type === "LineString" || g.type === "MultiLineString") {
      const coords: [number, number][] =
        g.type === "LineString" ? g.coordinates : g.coordinates.flat();
      if (!coords?.length) return null;
      let minX = coords[0][0], maxX = coords[0][0];
      let minY = coords[0][1], maxY = coords[0][1];
      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      return [(minX + maxX) / 2, (minY + maxY) / 2];
    }
    return null;
  }

  type Rec = {
    name: string;
    gcode?: string;
    center: [number, number];
    ops: Set<string>;
    lines: Set<string>;
    rawCount: number;
  };

  async function buildDedupFC(): Promise<GeoJSON.FeatureCollection> {
    const res = await fetch(DATA_RAIL_STATIONS);
    if (!res.ok) throw new Error(`Failed to load ${DATA_RAIL_STATIONS}`);
    const gj = await res.json();

    // 1) First, collapse by N02_005g (station group code)
    const byGroup = new Map<string, Rec>();
    const noGroup: Rec[] = [];

    for (const f of gj.features as any[]) {
      const name = normName(f?.properties?.N02_005);
      const gcode = f?.properties?.N02_005g; // group code
      const op = String(f?.properties?.N02_004 ?? "");
      const line = String(f?.properties?.N02_003 ?? "");
      const pt = featureToPointCoord(f);
      if (!name || !pt) continue;

      if (gcode) {
        let rec = byGroup.get(gcode);
        if (!rec) {
          rec = { name, gcode, center: pt, ops: new Set(), lines: new Set(), rawCount: 0 };
          byGroup.set(gcode, rec);
        } else {
          // update running centroid (mean of coords)
          const cx = (rec.center[0] * rec.rawCount + pt[0]) / (rec.rawCount + 1);
          const cy = (rec.center[1] * rec.rawCount + pt[1]) / (rec.rawCount + 1);
          rec.center = [cx, cy];
        }
        rec.ops.add(op);
        rec.lines.add(line);
        rec.rawCount += 1;
      } else {
        noGroup.push({
          name, gcode: undefined, center: pt,
          ops: new Set(op ? [op] : []), lines: new Set(line ? [line] : []), rawCount: 1
        });
      }
    }

    // 2) Now we have one record per group-code. Some mega-hubs (e.g., 東京) may have
    //    more than one group code; merge group records by same name within 650 m.
    const RADIUS_M = 650; // aggressive to ensure a single dot for very large complexes
    const groupedByName = new Map<string, Rec[]>();
    for (const rec of [...byGroup.values(), ...noGroup]) {
      const arr = groupedByName.get(rec.name) ?? [];
      arr.push(rec);
      groupedByName.set(rec.name, arr);
    }

    const mergedRecs: Rec[] = [];
    for (const [name, arr] of groupedByName) {
      const clusters: Rec[] = [];
      console.log(name)
      for (const r of arr) {
        let placed = false;
        for (const c of clusters) {
          if (haversineMeters(r.center, c.center) < RADIUS_M) {
            // merge r into c
            const total = c.rawCount + r.rawCount;
            c.center = [
              (c.center[0] * c.rawCount + r.center[0] * r.rawCount) / total,
              (c.center[1] * c.rawCount + r.center[1] * r.rawCount) / total,
            ];
            r.ops.forEach((v) => c.ops.add(v));
            r.lines.forEach((v) => c.lines.add(v));
            c.rawCount = total;
            c.gcode = c.gcode || r.gcode; // keep first available
            placed = true;
            break;
          }
        }
        if (!placed) clusters.push({ ...r, ops: new Set(r.ops), lines: new Set(r.lines) });
      }
      mergedRecs.push(...clusters);
    }

    // 3) Emit features
    const features: Feature<Point, StationProps>[] = mergedRecs.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: r.center },
      properties: {
        name: r.name,
        station_group: r.gcode ?? null,
        merged_count: r.rawCount,
        operators: Array.from(r.ops).filter(Boolean).sort(),
        lines: Array.from(r.lines).filter(Boolean).sort(),
      },
    }));

    return { type: "FeatureCollection", features };
  }

  // Create empty source and fill async
  map.addSource(SRC_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  buildDedupFC()
    .then((fc) => {
      const src = map.getSource(SRC_ID) as any;
      if (src) src.setData(fc);
    })
    .catch((e) => console.error(e));

  // Add the layer
  map.addLayer({
    id: LYR_ID,
    type: "circle",
    source: SRC_ID,
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 4,
      "circle-color": "#4F200D",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
      "circle-opacity": 0.9,
    },
  });
}

/* ---------- Interactions (per-layer attach) ---------- */
function attachInteractionsFor(
  map: maplibregl.Map,
  layerId: AnyInteractLayerId
) {
  const M = map as any;
  if (!M[ATTACHED_SET_KEY]) M[ATTACHED_SET_KEY] = new Set<string>();
  const attached: Set<string> = M[ATTACHED_SET_KEY];
  if (attached.has(layerId)) return;

  const hoverPopup = getOrCreatePopup(map, HOVER_POPUP_KEY, {
    closeButton: false,
    closeOnClick: false,
    anchor: "bottom",
    offset: 10,
    maxWidth: "360px",
    className: "ai-popup-2",
  });
  const clickPopup = getOrCreatePopup(map, CLICK_POPUP_KEY, {
    closeButton: true,
    closeOnClick: true,
    anchor: "bottom",
    maxWidth: "480px",
    className: "ai-popup-2",
  });

  const isLineLayer =
    layerId === "rail-jr-base" ||
    layerId === "rail-jr-dash" ||
    layerId === "rail-njr-line" ||
    layerId === "rail-njr-ticks" ||
    layerId === "rail-tx-base" ||
    layerId === "rail-tx-dots";

  const onMove = (e: any) => {
    const f = e.features?.[0];
    if (!f) return;
    map.getCanvas().style.cursor = "pointer";
    const header = isLineLayer ? lineTitle(f.properties) : stationTitle(f.properties);
    hoverPopup.setLngLat(e.lngLat).setHTML(renderTooltipHTML(header, f.properties)).addTo(map as any);
  };
  const onLeave = () => {
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  };
  const onClick = (e: any) => {
    const f = e.features?.[0];
    if (!f) return;
    const header = isLineLayer ? lineTitle(f.properties) : stationTitle(f.properties);
    clickPopup.setLngLat(e.lngLat).setHTML(renderClickHTML(header, f.properties)).addTo(map as any);
  };

  if (map.getLayer(layerId)) {
    map.on("mousemove", layerId, onMove);
    map.on("mouseleave", layerId, onLeave);
    map.on("click", layerId, onClick);
    attached.add(layerId);
  }
}

/* ---------- Visibility helper ---------- */
function setVis(map: maplibregl.Map, id: string, on: boolean) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

// function featureToPointCoordLoose(g: any): [number, number] | null {
//   if (!g) return null;
//   if (g.type === "Point") return g.coordinates as [number, number];
//   if (g.type === "MultiPoint") return (g.coordinates?.[0] as [number, number]) ?? null;
//   if (g.type === "LineString" || g.type === "MultiLineString") {
//     const coords: [number, number][] = g.type === "LineString" ? g.coordinates : g.coordinates.flat();
//     if (!coords?.length) return null;
//     let minX = coords[0][0], maxX = coords[0][0], minY = coords[0][1], maxY = coords[0][1];
//     for (const [x, y] of coords) {
//       if (x < minX) minX = x;
//       if (x > maxX) maxX = x;
//       if (y < minY) minY = y;
//       if (y > maxY) maxY = y;
//     }
//     return [(minX + maxX) / 2, (minY + maxY) / 2];
//   }
//   return null;
// }

type AnyInteractLayerId =
  | "rail-jr-base" | "rail-jr-dash"
  | "rail-njr-line" | "rail-njr-ticks"
  | "rail-tx-base" | "rail-tx-dots"
  | "rail-stations"
  | "rail-station-pax";

// function ensureRailStationPassengersLayer(map: maplibregl.Map) {
//   const SRC_ID = "rail-station-pax-src";
//   const LYR_ID = "rail-station-pax";

//   // drop old
//   if (map.getLayer(LYR_ID)) { try { map.removeLayer(LYR_ID); } catch { } }
//   if (map.getSource(SRC_ID)) { try { map.removeSource(SRC_ID); } catch { } }

//   map.addSource(SRC_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } as FeatureCollection });

//   // known “latest” columns (right-most ≈ newest). If your file vintage differs, just tweak this list.
//   const YEAR_FIELDS: Array<{ key: string; year: number }> = [
//     { key: "S12_057", year: 2023 },
//     { key: "S12_053", year: 2022 },
//     { key: "S12_049", year: 2021 },
//     { key: "S12_045", year: 2020 },
//     { key: "S12_041", year: 2019 },
//     { key: "S12_037", year: 2018 },
//   ];

//   type PaxRec = {
//     name: string;
//     gcode: string;
//     operator?: string;
//     line?: string;
//     center: [number, number];
//     n: number;
//     passengers?: number;
//     passengers_year?: number;
//   };

//   (async () => {
//     const res = await fetch(DATA_STATION_PAX);
//     if (!res.ok) throw new Error(`Failed to load ${DATA_STATION_PAX}`);
//     const gj = await res.json();

//     const byG: Map<string, PaxRec> = new Map();

//     for (const f of gj.features as any[]) {
//       const p = f?.properties ?? {};
//       const gcode = String(p.S12_001g ?? "");
//       const name = String(p.S12_001 ?? "");
//       if (!gcode || !name) continue;

//       // get a rep point
//       const pt = featureToPointCoordLoose(f.geometry);
//       if (!pt) continue;

//       // find latest value
//       let val: number | undefined;
//       let year: number | undefined;
//       for (const { key, year: y } of YEAR_FIELDS) {
//         const v = p[key];
//         if (typeof v === "number" && isFinite(v)) { val = v; year = y; break; }
//       }

//       const op = p.S12_002 ? String(p.S12_002) : undefined;
//       const line = p.S12_003 ? String(p.S12_003) : undefined;

//       const rec = byG.get(gcode);
//       if (!rec) {
//         byG.set(gcode, {
//           name, gcode,
//           operator: op, line,
//           center: pt,
//           n: 1,
//           passengers: val, passengers_year: year,
//         });
//       } else {
//         // running mean for center
//         rec.center = [(rec.center[0] * rec.n + pt[0]) / (rec.n + 1), (rec.center[1] * rec.n + pt[1]) / (rec.n + 1)];
//         rec.n += 1;
//         // keep first non-null passengers if none yet
//         if (rec.passengers == null && val != null) { rec.passengers = val; rec.passengers_year = year; }
//         // prefer any present operator/line
//         if (!rec.operator && op) rec.operator = op;
//         if (!rec.line && line) rec.line = line;
//       }
//     }

//     const features: Feature<Point>[] = Array.from(byG.values()).map((r) => ({
//       type: "Feature",
//       geometry: { type: "Point", coordinates: r.center },
//       properties: {
//         name: r.name,
//         station_group: r.gcode,
//         operator: r.operator ?? "",
//         line: r.line ?? "",
//         passengers: r.passengers ?? 0,
//         passengers_year: r.passengers_year ?? null,
//       },
//     }));

//     const fc: FeatureCollection = { type: "FeatureCollection", features };
//     (map.getSource(SRC_ID) as any)?.setData(fc);
//   })().catch(console.error);

//   // stylize circles by passenger magnitude
//   map.addLayer({
//     id: LYR_ID,
//     type: "circle",
//     source: SRC_ID,
//     layout: { visibility: "none" },
//     paint: {
//       // piecewise linear scale (px) – tune to taste
//       "circle-radius": [
//         "interpolate", ["linear"], ["coalesce", ["get", "passengers"], 0],
//         0, 0,
//         100, 4,
//         500, 6,
//         2_000, 9,
//         10_000, 14,
//         25_000, 18,
//         60_000, 24
//       ],
//       "circle-color": "#4361ee",
//       "circle-opacity": 0.75,
//       "circle-stroke-color": "#ffffff",
//       "circle-stroke-width": 1.2,
//     },
//   });
// }

function ensureRailStationPassengersLayer(map: maplibregl.Map) {
  const SRC_ID = "rail-station-pax-src";
  const LYR_ID = "rail-station-pax";

  if (map.getLayer(LYR_ID)) { try { map.removeLayer(LYR_ID); } catch { } }
  if (map.getSource(SRC_ID)) { try { map.removeSource(SRC_ID); } catch { } }

  map.addSource(SRC_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] } as FeatureCollection
  });

  // S12 spec (2023):
  // const FIELD_2023 = {
  //   value: "S12_057",  // 乗降客数2023（人/日）
  //   avail: "S12_055",  // データ有無コード2023
  //   dup: "S12_054",  // 重複コード2023
  //   note: "S12_056",  // 備考2023
  // } as const;

  // type PaxRec = {
  //   name: string;
  //   gcode: string;
  //   operator?: string;
  //   line?: string;
  //   center: [number, number];
  //   n: number;
  //   passengers: number;       // 2023 only
  //   passengers_year: 2023;
  };

  // (async () => {
  //   const res = await fetch(DATA_STATION_PAX);
  //   if (!res.ok) throw new Error(`Failed to load ${DATA_STATION_PAX}`);
  //   const gj = await res.json();

  //   const byG: Map<string, PaxRec> = new Map();

  //   for (const f of gj.features as any[]) {
  //     const p = f?.properties ?? {};
  //     const gcode = String(p.S12_001g ?? "");
  //     const name = String(p.S12_001 ?? "");
  //     if (!gcode || !name) continue;

  //     // Use 2023 ONLY
  //     const vRaw = p[FIELD_2023.value];
  //     const v = typeof vRaw === "number" ? vRaw : Number(vRaw);
  //     if (!Number.isFinite(v)) continue; // skip if 2023 data not present

  //     const pt = featureToPointCoordLoose(f.geometry);
  //     if (!pt) continue;

  //     const op = p.S12_002 ? String(p.S12_002) : undefined;
  //     const line = p.S12_003 ? String(p.S12_003) : undefined;

  //     const rec = byG.get(gcode);
  //     if (!rec) {
  //       byG.set(gcode, {
  //         name, gcode,
  //         operator: op, line,
  //         center: pt,
  //         n: 1,
  //         passengers: v,
  //         passengers_year: 2023,
  //       });
  //     } else {
  //       rec.center = [
  //         (rec.center[0] * rec.n + pt[0]) / (rec.n + 1),
  //         (rec.center[1] * rec.n + pt[1]) / (rec.n + 1),
  //       ];
  //       rec.n += 1;
  //       // keep the first seen 2023 value; or use max/mean if you prefer
  //       if (!Number.isFinite(rec.passengers)) rec.passengers = v;
  //       if (!rec.operator && op) rec.operator = op;
  //       if (!rec.line && line) rec.line = line;
  //     }
  //   }

  //   const features: Feature<Point>[] = Array.from(byG.values()).map((r) => ({
  //     type: "Feature",
  //     geometry: { type: "Point", coordinates: r.center },
  //     properties: {
  //       name: r.name,
  //       station_group: r.gcode,
  //       operator: r.operator ?? "",
  //       line: r.line ?? "",
  //       passengers: r.passengers,        // 2023 value
  //       passengers_year: r.passengers_year, // 2023
  //     },
  //   }));

  //   const fc: FeatureCollection = { type: "FeatureCollection", features };
  //   (map.getSource(SRC_ID) as any)?.setData(fc);
  // })().catch(console.error);

  // map.addLayer({
  //   id: LYR_ID,
  //   type: "circle",
  //   source: SRC_ID,
  //   layout: { visibility: "none" },
  //   // Only draw if we actually have a 2023 value
  //   filter: [">", ["get", "passengers"], 0],
  //   paint: {
  //     "circle-radius": [
  //       "interpolate", ["linear"], ["get", "passengers"],
  //       100, 4,
  //       500, 6,
  //       2_000, 9,
  //       10_000, 14,
  //       25_000, 18,
  //       60_000, 24
  //     ],
  //     "circle-color": "#4361ee",
  //     "circle-opacity": 0.75,
  //     "circle-stroke-color": "#ffffff",
  //     "circle-stroke-width": 1.2,
  //   },
  // });
// }

/* ---------- Public toggles (independent) ---------- */
export function toggleRailwayLinesLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  const next = !currentlyVisible;
  setIsLoading(true);

  if (next) {
    ensureRailSources(map);
    ensureRailLineLayers(map);

    ([
      "rail-jr-base",
      "rail-jr-dash",
      "rail-tx-base",
      "rail-tx-dots",
      "rail-njr-line",
      "rail-njr-ticks",
    ] as const).forEach((id) => attachInteractionsFor(map, id));

    // Layer order: base lines first, then overlays on top
    moveRailwayBelowMask(map, [
      "rail-njr-line",
      "rail-jr-base",
      "rail-tx-base",
      "rail-jr-dash",
      "rail-njr-ticks",
      "rail-tx-dots",
    ]);
  }

  ([
    "rail-jr-base",
    "rail-jr-dash",
    "rail-tx-base",
    "rail-tx-dots",
    "rail-njr-line",
    "rail-njr-ticks",
  ] as const).forEach((id) => setVis(map, id, next));

  map.once("idle", () => {
    setIsLoading(false);
    setVisible(next);
  });
}

export function toggleRailwayStationsLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  const next = !currentlyVisible;
  setIsLoading(true);

  if (next) {
    ensureRailSources(map);
    ensureRailStationLayer(map);
    attachInteractionsFor(map, "rail-stations");
    moveRailwayBelowMask(map, ["rail-stations"]);
  }
  setVis(map, "rail-stations", next);

  map.once("idle", () => {
    setIsLoading(false);
    setVisible(next);
  });
}

export function toggleRailwayStationPassengersLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void
) {
  const next = !currentlyVisible;
  setIsLoading(true);

  if (next) {
    ensureRailStationPassengersLayer(map);
    attachInteractionsFor(map, "rail-station-pax");
    moveRailwayBelowMask(map, ["rail-station-pax"]);
  }
  setVis(map, "rail-station-pax", next);

  map.once("idle", () => {
    setIsLoading(false);
    setVisible(next);
  });
}