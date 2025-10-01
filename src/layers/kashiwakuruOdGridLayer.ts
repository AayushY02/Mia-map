import maplibregl from 'maplibre-gl';
import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
  Geometry,
} from "geojson";
import { blobUrl } from '@/lib/blobUrl';

export type TimeBand = [number, number] | null;

const IDS = {
  // OD aggregation
  srcLines: "kashiwa-od-grid-lines",
  srcBubbles: "kashiwa-od-grid-bubbles",
  layerLines: "kashiwa-od-grid-lines-layer",
  layerLinesHL: "kashiwa-od-grid-lines-layer-hl",
  layerBubbles: "kashiwa-od-grid-bubbles-layer",
  layerBubblesHL: "kashiwa-od-grid-bubbles-layer-hl",

  // Visual grid overlay (lines)
  srcGrid: "kashiwa-od-grid-overlay",
  layerGrid: "kashiwa-od-grid-overlay-layer",

  // Interactive cells (used cells only)
  srcCells: "kashiwa-od-grid-cells",
  layerCellsFill: "kashiwa-od-grid-cells-fill",
  layerCellsOutline: "kashiwa-od-grid-cells-outline",

  // Interactive cells for ALL visible grid cells (when showGrid = true)
  srcCellsAll: "kashiwa-od-grid-cells-all",
  layerCellsAllFill: "kashiwa-od-grid-cells-all-fill",
  layerCellsAllOutline: "kashiwa-od-grid-cells-all-outline",

  // Highlight (works for either used/all cells)
  layerCellsHL: "kashiwa-od-grid-cells-hl",

  // Stops (O/D/OD)
  srcStops: "kashiwa-od-grid-stops",
  layerStopsO: "kashiwa-od-grid-stops-o",
  layerStopsD: "kashiwa-od-grid-stops-d",
  layerStopsOD: "kashiwa-od-grid-stops-od",
  layerStopsFocusHL: "kashiwa-od-grid-stops-focus-hl",
};

type GLFeature = maplibregl.MapGeoJSONFeature;
type FilterExpr = maplibregl.FilterSpecification;

// --- hide base meshes when showing this layer ---
function hideMeshLayers(map: maplibregl.Map) {
  [
    "mesh-1km-fill",
    "mesh-1km-outline",
    "mesh-500m-fill",
    "mesh-500m-outline",
    "mesh-250m-fill",
    "mesh-250m-outline",
  ].forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  });
}

// ---------- Curves ----------
function hash01(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function quadPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}
function curvedCoords(
  A: [number, number],
  B: [number, number],
  seedKey: string,
  steps = 16
): [number, number][] {
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const dist = Math.hypot(dx, dy) || 1e-9;
  const nx = -dy / dist,
    ny = dx / dist;
  const mid: [number, number] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const r = hash01(seedKey);
  const sign = r < 0.5 ? -1 : 1;
  const amp = dist * (0.2 + 0.18 * ((r * 2) % 1));
  const ctrl: [number, number] = [mid[0] + sign * nx * amp, mid[1] + sign * ny * amp];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) out.push(quadPoint(A, ctrl, B, i / steps));
  return out;
}

// ---------- Grid & stats ----------
function computeStatsFromOD(od: FeatureCollection<LineString, any>) {
  let minLon = +Infinity,
    minLat = +Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity,
    sumLat = 0,
    n = 0;
  for (const f of od.features) {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    const o = c[0] as [number, number];
    const d = c[c.length - 1] as [number, number];
    for (const [lon, lat] of [o, d]) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
      sumLat += lat;
      n++;
    }
  }
  return { minLon, minLat, maxLon, maxLat, meanLat: n ? sumLat / n : 35.86 };
}
function gridStepDegrees(meanLatDeg: number) {
  const meanLatRad = (meanLatDeg * Math.PI) / 180;
  const dLat = 0.1 / 110.574;
  const dLon = 0.1 / (111.32 * Math.cos(meanLatRad));
  return { dLat, dLon };
}
function idxForPoint(
  lon: number,
  lat: number,
  minLon: number,
  minLat: number,
  dLon: number,
  dLat: number
) {
  return { j: Math.floor((lon - minLon) / dLon), i: Math.floor((lat - minLat) / dLat) };
}
function centroidForCell(
  i: number,
  j: number,
  minLon: number,
  minLat: number,
  dLon: number,
  dLat: number
) {
  return [minLon + (j + 0.5) * dLon, minLat + (i + 0.5) * dLat] as [number, number];
}
function cellPolygon(
  i: number,
  j: number,
  minLon: number,
  minLat: number,
  dLon: number,
  dLat: number
): [number, number][][] {
  const x0 = minLon + j * dLon;
  const y0 = minLat + i * dLat;
  const x1 = x0 + dLon;
  const y1 = y0 + dLat;
  return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
}

// ---------- Time parsing & filtering ----------
function parseHour(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim();
  const m = s.match(/^(\d{1,2})(?::\d{2})?$/);
  if (m) return Number(m[1]);
  if (/^\d{3,4}$/.test(s)) return Number(s.slice(0, s.length - 2));
  return NaN;
}
function extractBand(props: any): [number, number] | null {
  if (!props) return null;
  const hs = parseHour(props.hour_start);
  const he = parseHour(props.hour_end);
  if (!Number.isNaN(hs) && !Number.isNaN(he)) return [hs, he];
  const tb = String(props.timeband ?? props.time ?? "").trim();
  const mm = tb.match(/^(\d{1,2})(?::?\d{2})?\s*-\s*(\d{1,2})(?::?\d{2})?$/);
  if (mm) {
    const a = Number(mm[1]),
      b = Number(mm[2]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
  }
  return null;
}
function bandsOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && b0 < a1;
}
function filterByTimeBand(
  od: FeatureCollection<LineString, any>,
  band: TimeBand
): Feature<LineString, any>[] {
  if (!band) return od.features;
  const [hs, he] = band;
  return od.features.filter((f) => {
    const b = extractBand(f.properties);
    return b ? bandsOverlap(hs, he, b[0], b[1]) : false;
  });
}

// ---------- Aggregation ----------
export type Aggregated = {
  lines: FeatureCollection<
    LineString,
    { pid: string; vol: number; oI: number; oJ: number; dI: number; dJ: number }
  >;
  bubbles: FeatureCollection<Point, { cid: string; vol: number; i: number; j: number }>;
  stops: FeatureCollection<Point, { role: "O" | "D" | "OD"; i: number; j: number }>;
  cells: FeatureCollection<
    Polygon,
    { i: number; j: number; outVol: number; inVol: number; total: number }
  >;
};
function makePairKey(
  oI: number,
  oJ: number,
  dI: number,
  dJ: number,
  undirected: boolean
) {
  if (!undirected) return `${oJ}:${oI}>${dJ}:${dI}`;
  const a = `${oJ}:${oI}`,
    b = `${dJ}:${dI}`;
  return a < b ? `${a}>${b}` : `${b}>${a}`;
}
function aggregateODTo100m(
  od: FeatureCollection<LineString, any>,
  band: TimeBand,
  undirected: boolean
) {
  const { minLon, minLat, maxLon, maxLat, meanLat } = computeStatsFromOD(od);
  const { dLat, dLon } = gridStepDegrees(meanLat);

  const totals = new Map<string, number>();
  const selfTotals = new Map<string, number>();
  const outMap = new Map<string, number>();
  const inMap = new Map<string, number>();
  const usedCells = new Set<string>();

  type StopRec = { lon: number; lat: number; i: number; j: number; roleMask: number };
  const stops = new Map<string, StopRec>();
  const R_O = 1,
    R_D = 2;

  for (const f of filterByTimeBand(od, band)) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const o = coords[0] as [number, number];
    const d = coords[coords.length - 1] as [number, number];
    const vol = Number((f.properties || {}).count || 0);
    if (!vol || !isFinite(vol)) continue;

    const { i: oI, j: oJ } = idxForPoint(o[0], o[1], minLon, minLat, dLon, dLat);
    const { i: dI, j: dJ } = idxForPoint(d[0], d[1], minLon, minLat, dLon, dLat);

    const oKey = `${oJ}:${oI}`;
    const dKey = `${dJ}:${dI}`;
    outMap.set(oKey, (outMap.get(oKey) || 0) + vol);
    inMap.set(dKey, (inMap.get(dKey) || 0) + vol);
    usedCells.add(oKey);
    usedCells.add(dKey);

    if (oI === dI && oJ === dJ) {
      selfTotals.set(oKey, (selfTotals.get(oKey) || 0) + vol);
    } else {
      const key = makePairKey(oI, oJ, dI, dJ, undirected);
      totals.set(key, (totals.get(key) || 0) + vol);
    }

    // collect stop points & roles (deduped by lon/lat)
    const soKey = `${o[0].toFixed(6)},${o[1].toFixed(6)}`;
    const sdKey = `${d[0].toFixed(6)},${d[1].toFixed(6)}`;
    const so = stops.get(soKey);
    if (so) so.roleMask |= R_O;
    else stops.set(soKey, { lon: o[0], lat: o[1], i: oI, j: oJ, roleMask: R_O });
    const sd = stops.get(sdKey);
    if (sd) sd.roleMask |= R_D;
    else stops.set(sdKey, { lon: d[0], lat: d[1], i: dI, j: dJ, roleMask: R_D });
  }

  const lineFeatures: Feature<LineString, any>[] = [];
  totals.forEach((vol: number, key: string) => {
    const [oPart, dPart] = key.split(">");
    const [oJ, oI] = oPart.split(":").map(Number);
    const [dJ, dI] = dPart.split(":").map(Number);
    const A = centroidForCell(oI, oJ, minLon, minLat, dLon, dLat);
    const B = centroidForCell(dI, dJ, minLon, minLat, dLon, dLat);
    lineFeatures.push({
      type: "Feature",
      properties: { pid: key, vol, oI, oJ, dI, dJ },
      geometry: { type: "LineString", coordinates: curvedCoords(A, B, key) },
    });
  });

  const bubbleFeatures: Feature<Point, any>[] = [];
  selfTotals.forEach((vol: number, k: string) => {
    const [j, i] = k.split(":").map(Number);
    const c = centroidForCell(i, j, minLon, minLat, dLon, dLat);
    bubbleFeatures.push({
      type: "Feature",
      properties: { cid: k, vol, i, j },
      geometry: { type: "Point", coordinates: c },
    });
  });

  const stopFeatures: Feature<Point, any>[] = [];
  for (const rec of stops.values()) {
    const role: "O" | "D" | "OD" =
      rec.roleMask === (R_O | R_D) ? "OD" : rec.roleMask === R_O ? "O" : "D";
    stopFeatures.push({
      type: "Feature",
      properties: { role, i: rec.i, j: rec.j },
      geometry: { type: "Point", coordinates: [rec.lon, rec.lat] },
    });
  }

  const cellFeatures: Feature<Polygon, any>[] = [];
  const allKeys = new Set<string>([...usedCells]);
  for (const key of allKeys) {
    const [j, i] = key.split(":").map(Number);
    const outVol = outMap.get(key) || 0;
    const inVol = inMap.get(key) || 0;
    const total = outVol + inVol;
    cellFeatures.push({
      type: "Feature",
      properties: { i, j, outVol, inVol, total },
      geometry: { type: "Polygon", coordinates: cellPolygon(i, j, minLon, minLat, dLon, dLat) },
    });
  }

  const linesFC: FeatureCollection<LineString, any> = { type: "FeatureCollection", features: lineFeatures };
  const bubblesFC: FeatureCollection<Point, any> = { type: "FeatureCollection", features: bubbleFeatures };
  const stopsFC: FeatureCollection<Point, any> = { type: "FeatureCollection", features: stopFeatures };
  const cellsFC: FeatureCollection<Polygon, any> = { type: "FeatureCollection", features: cellFeatures };

  // Build an ALL-CELLS layer across the full bounding box for selection even if volume=0
  const nCols = Math.ceil((maxLon - minLon) / dLon);
  const nRows = Math.ceil((maxLat - minLat) / dLat);
  const cellsAll: Feature<Polygon, any>[] = [];
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      const key = `${j}:${i}`;
      const outVol = outMap.get(key) || 0;
      const inVol = inMap.get(key) || 0;
      const total = outVol + inVol;
      cellsAll.push({
        type: "Feature",
        properties: { i, j, outVol, inVol, total },
        geometry: { type: "Polygon", coordinates: cellPolygon(i, j, minLon, minLat, dLon, dLat) },
      });
    }
  }
  const cellsAllFC: FeatureCollection<Polygon, any> = { type: "FeatureCollection", features: cellsAll };

  return {
    agg: { lines: linesFC, bubbles: bubblesFC, stops: stopsFC, cells: cellsFC },
    meta: { minLon, minLat, maxLon, maxLat, dLon, dLat, cellsAll: cellsAllFC },
  };
}

// ---------- Module-scoped UI state ----------
type FocusMode = "all" | "out" | "in";
let _minVol = 1;
let _focusCell: { i: number; j: number } | null = null;
let _focusMode: FocusMode = "all";
let _hoverPid: string | null = null;
let _hoverCid: string | null = null;
let _hoverCell: { i: number; j: number } | null = null;
let _singleODPid: string | null = null; // <-- single-OD isolation
let _popup: maplibregl.Popup | null = null;
let _eventsBound = false;
let _showStops = true;

let _handlers: {
  move?: (e: maplibregl.MapMouseEvent) => void;
  leaveLines?: (e: maplibregl.MapLayerMouseEvent) => void;
  leaveBubbles?: (e: maplibregl.MapLayerMouseEvent) => void;
  leaveCells?: (e: maplibregl.MapLayerMouseEvent) => void;
  clickLine?: (e: maplibregl.MapLayerMouseEvent) => void;
  clickBubble?: (e: maplibregl.MapLayerMouseEvent) => void;
  clickCell?: (e: maplibregl.MapLayerMouseEvent) => void;
  mapClick?: (e: maplibregl.MapMouseEvent) => void;
} = {};

// ---------- Filters ----------
function buildLinesFilter(): FilterExpr {
  const volExpr = [">=", ["get", "vol"], _minVol] as unknown as FilterExpr;

  // single-OD isolation overrides focus/cell filters
  if (_singleODPid) {
    return ["all", volExpr, ["==", ["get", "pid"], _singleODPid]] as unknown as FilterExpr;
  }

  if (!_focusCell) return volExpr;

  const oMatch = ["all", ["==", ["get", "oI"], _focusCell.i], ["==", ["get", "oJ"], _focusCell.j]] as unknown as FilterExpr;
  const dMatch = ["all", ["==", ["get", "dI"], _focusCell.i], ["==", ["get", "dJ"], _focusCell.j]] as unknown as FilterExpr;

  const dir =
    _focusMode === "out" ? oMatch :
      _focusMode === "in" ? dMatch :
        (["any", oMatch, dMatch] as unknown as FilterExpr);

  return ["all", volExpr, dir] as unknown as FilterExpr;
}
function buildBubblesFilter(): FilterExpr {
  const volExpr = [">=", ["get", "vol"], _minVol] as unknown as FilterExpr;
  if (!_focusCell) return volExpr;

  const cellMatch = ["all", ["==", ["get", "i"], _focusCell.i], ["==", ["get", "j"], _focusCell.j]] as unknown as FilterExpr;
  return ["all", volExpr, cellMatch] as unknown as FilterExpr;
}
function buildStopsFocusFilter(): FilterExpr {
  if (!_focusCell) return ["==", ["get", "i"], -9999] as unknown as FilterExpr;
  return (["all", ["==", ["get", "i"], _focusCell.i], ["==", ["get", "j"], _focusCell.j]] as unknown) as FilterExpr;
}
function buildCellsHLFilter(): FilterExpr {
  const target = _hoverCell || _focusCell;
  if (!target) return ["==", ["get", "i"], -9999] as unknown as FilterExpr;
  return (["all", ["==", ["get", "i"], target.i], ["==", ["get", "j"], target.j]] as unknown) as FilterExpr;
}
function applyFilters(map: maplibregl.Map) {
  if (map.getLayer(IDS.layerLines)) map.setFilter(IDS.layerLines, buildLinesFilter());

  if (map.getLayer(IDS.layerLinesHL)) {
    const hlTarget = _singleODPid ?? _hoverPid ?? "__none__";
    const hlFilter = ["all", buildLinesFilter(), ["==", ["get", "pid"], hlTarget]] as unknown as FilterExpr;
    map.setFilter(IDS.layerLinesHL, hlFilter);
  }

  if (map.getLayer(IDS.layerBubbles)) map.setFilter(IDS.layerBubbles, buildBubblesFilter());
  if (map.getLayer(IDS.layerBubblesHL)) {
    const hlBubs = ["all", buildBubblesFilter(), ["==", ["get", "cid"], _hoverCid ?? "__none__"]] as unknown as FilterExpr;
    map.setFilter(IDS.layerBubblesHL, hlBubs);
  }
  if (map.getLayer(IDS.layerStopsFocusHL)) map.setFilter(IDS.layerStopsFocusHL, buildStopsFocusFilter());
  if (map.getLayer(IDS.layerCellsHL)) map.setFilter(IDS.layerCellsHL, buildCellsHLFilter());
}

// ---------- Cursor & Popup ----------
function setCursor(map: maplibregl.Map, pointer: boolean) {
  map.getCanvas().style.cursor = pointer ? "pointer" : "";
}
function ensurePopup() {
  if (_popup) return _popup;
  _popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: "ai-popup-2",
  });
  return _popup;
}
function clearPopup() {
  if (_popup) {
    _popup.remove();
    _popup = null;
  }
}

const lineOpacityZoom: any = [
  "interpolate", ["linear"], ["zoom"],
  10, 0.40,   // far: most transparent
  12, 0.50,
  14, 0.62,
  16, 0.70    // near: still translucent
];

// ---------- Remove / Add ----------
function removeAggregatedLayers(map: maplibregl.Map) {
  [
    IDS.layerLinesHL,
    IDS.layerLines,
    IDS.layerBubblesHL,
    IDS.layerBubbles,
    IDS.layerStopsFocusHL,
    IDS.layerStopsOD,
    IDS.layerStopsD,
    IDS.layerStopsO,
    IDS.layerCellsHL,
    IDS.layerCellsFill,
    IDS.layerCellsOutline,
    IDS.layerCellsAllFill,
    IDS.layerCellsAllOutline,
    IDS.layerGrid,
  ].forEach((id) => map.getLayer(id) && map.removeLayer(id));

  [
    IDS.srcLines,
    IDS.srcBubbles,
    IDS.srcStops,
    IDS.srcCells,
    IDS.srcCellsAll,
    IDS.srcGrid,
  ].forEach((id) => map.getSource(id) && map.removeSource(id));

  clearPopup();
  _hoverPid = _hoverCid = null;
  _hoverCell = null;
  _focusCell = null;
  _singleODPid = null;
}

function setLayerVisibility(map: maplibregl.Map, id: string, visible: boolean) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

function addAggregatedODLayers(
  map: maplibregl.Map,
  agg: Aggregated,
  color = "#0f7282",
  showStops = true,
  cellsAll?: FeatureCollection<Polygon, any>
) {
  removeAggregatedLayers(map);

  // Sources
  map.addSource(IDS.srcLines, { type: "geojson", data: agg.lines as FeatureCollection<Geometry> });
  map.addSource(IDS.srcBubbles, { type: "geojson", data: agg.bubbles as FeatureCollection<Geometry> });
  map.addSource(IDS.srcStops, { type: "geojson", data: agg.stops as FeatureCollection<Geometry> });
  map.addSource(IDS.srcCells, { type: "geojson", data: agg.cells as FeatureCollection<Geometry> });

  if (cellsAll) {
    map.addSource(IDS.srcCellsAll, { type: "geojson", data: cellsAll as FeatureCollection<Geometry> });
  }

  // ---- ALL grid cells (darker + selectable) when provided ----
  if (cellsAll) {
    map.addLayer({
      id: IDS.layerCellsAllFill,
      type: "fill",
      source: IDS.srcCellsAll,
      paint: {
        "fill-color": "#111827",
        "fill-opacity": 0.06,
      },
    });
    map.addLayer({
      id: IDS.layerCellsAllOutline,
      type: "line",
      source: IDS.srcCellsAll,
      paint: {
        "line-color": "#111827",
        "line-opacity": 0.35,
        "line-width": 1.4,
      },
    });
  }

  // ---- Used cells (slightly stronger; sit above the ALL grid) ----
  map.addLayer({
    id: IDS.layerCellsFill,
    type: "fill",
    source: IDS.srcCells,
    paint: {
      "fill-color": "#111827",
      "fill-opacity": 0.10,
    },
  });
  map.addLayer({
    id: IDS.layerCellsOutline,
    type: "line",
    source: IDS.srcCells,
    paint: {
      "line-color": "#111827",
      "line-opacity": 0.5,
      "line-width": 1.6,
    },
  });

  // Highlight overlay for either used/all cells
  map.addLayer({
    id: IDS.layerCellsHL,
    type: "fill",
    source: cellsAll ? IDS.srcCellsAll : IDS.srcCells,
    filter: ["==", ["get", "i"], -9999],
    paint: {
      "fill-color": "#111827",
      "fill-opacity": 0.28,
    },
  });

  // ---- Lines ----
  const widthByVol: any = [
    "interpolate", ["exponential", 1.4], ["get", "vol"],
    1, 1.2,
    6, 3.0,
    10, 4.2,
    35, 7.2,
    100, 10.5,
    250, 14.0,
  ];
  const lineWidthZoom: any = [
    "interpolate", ["linear"], ["zoom"],
    10, ["*", widthByVol, 0.9],
    12, ["*", widthByVol, 1.0],
    14, ["*", widthByVol, 1.2],
    16, ["*", widthByVol, 1.4],
  ];
  const lineWidthZoomHL: any = [
    "interpolate", ["linear"], ["zoom"],
    10, ["*", widthByVol, 1.15],
    12, ["*", widthByVol, 1.3],
    14, ["*", widthByVol, 1.5],
    16, ["*", widthByVol, 1.7],
  ];
  map.addLayer({
    id: IDS.layerLines,
    type: "line",
    source: IDS.srcLines,
    layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "vol"] },
    paint: { "line-color": color, "line-opacity": lineOpacityZoom, "line-blur": 0.15, "line-width": lineWidthZoom },
  });
  map.addLayer({
    id: IDS.layerLinesHL,
    type: "line",
    source: IDS.srcLines,
    filter: ["==", ["get", "pid"], "__none__"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0ea5a3", "line-opacity": 1.0, "line-blur": 0.15, "line-width": lineWidthZoomHL },
  });

  // ---- Same-cell bubbles ----
  const radiusByVol: any = [
    "interpolate", ["exponential", 1.4], ["get", "vol"],
    1, 2.5,
    6, 5,
    10, 7,
    35, 10,
    100, 13,
    250, 18,
  ];
  map.addLayer({
    id: IDS.layerBubbles,
    type: "circle",
    source: IDS.srcBubbles,
    paint: {
      "circle-radius": radiusByVol,
      "circle-color": "#fb8c00",
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2,
      "circle-opacity": 0.9,
    },
  });
  map.addLayer({
    id: IDS.layerBubblesHL,
    type: "circle",
    source: IDS.srcBubbles,
    filter: ["==", ["get", "cid"], "__none__"],
    paint: {
      "circle-radius": ["+", radiusByVol, 2],
      "circle-color": "#ffb000",
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2,
      "circle-opacity": 1.0,
    },
  });

  // ---- Stops (O=green, D=red, OD=gray) – bigger + zoom scaling ----
  const stopRadius: any = [
    "interpolate", ["linear"], ["zoom"],
    10, 4.5,
    12, 6.0,
    14, 7.5,
    16, 9.0,
  ];

  const stopRadiusHL: any = [
    "interpolate", ["linear"], ["zoom"],
    10, 6.5,   // 4.5 + 2
    12, 8.0,   // 6.0 + 2
    14, 9.5,   // 7.5 + 2
    16, 11.0,  // 9.0 + 2
  ];
  map.addLayer({
    id: IDS.layerStopsO,
    type: "circle",
    source: IDS.srcStops,
    filter: ["==", ["get", "role"], "O"],
    layout: { visibility: showStops ? "visible" : "none" },
    paint: {
      "circle-radius": stopRadius,
      "circle-color": "#16a34a", // green
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.98,
    },
  });
  map.addLayer({
    id: IDS.layerStopsD,
    type: "circle",
    source: IDS.srcStops,
    filter: ["==", ["get", "role"], "D"],
    layout: { visibility: showStops ? "visible" : "none" },
    paint: {
      "circle-radius": stopRadius,
      "circle-color": "#ef4444", // red
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.98,
    },
  });
  map.addLayer({
    id: IDS.layerStopsOD,
    type: "circle",
    source: IDS.srcStops,
    filter: ["==", ["get", "role"], "OD"],
    layout: { visibility: showStops ? "visible" : "none" },
    paint: {
      "circle-radius": stopRadius,
      "circle-color": "#4b5563", // gray
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.98,
    },
  });
  map.addLayer({
    id: IDS.layerStopsFocusHL,
    type: "circle",
    source: IDS.srcStops,
    filter: ["==", ["get", "i"], -9999],
    layout: { visibility: showStops ? "visible" : "none" },
    paint: {
      "circle-radius": stopRadiusHL,
      "circle-color": "#111827",
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2,
      "circle-opacity": 0.25,
    },
  });

  // Initial filters
  applyFilters(map);
  _showStops = showStops;
}

// Visual grid overlay (lines)
function add100mGridOverlay(
  map: maplibregl.Map,
  meta: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
    dLon: number;
    dLat: number;
    cellsAll: FeatureCollection<Polygon, any>;
  }
) {
  if (map.getLayer(IDS.layerGrid)) map.removeLayer(IDS.layerGrid);
  if (map.getSource(IDS.srcGrid)) map.removeSource(IDS.srcGrid);

  const { minLon, minLat, maxLon, maxLat, dLon, dLat } = meta;
  const nCols = Math.ceil((maxLon - minLon) / dLon);
  const nRows = Math.ceil((maxLat - minLat) / dLat);

  const lines: Feature<LineString, any>[] = [];
  for (let j = 0; j <= nCols; j++) {
    const x = minLon + j * dLon;
    const major = j % 5 === 0;
    lines.push({ type: "Feature", properties: { major }, geometry: { type: "LineString", coordinates: [[x, minLat], [x, maxLat]] } });
  }
  for (let i = 0; i <= nRows; i++) {
    const y = minLat + i * dLat;
    const major = i % 5 === 0;
    lines.push({ type: "Feature", properties: { major }, geometry: { type: "LineString", coordinates: [[minLon, y], [maxLon, y]] } });
  }

  const gridFC: FeatureCollection<LineString, any> = { type: "FeatureCollection", features: lines };
  map.addSource(IDS.srcGrid, { type: "geojson", data: gridFC as FeatureCollection<Geometry> });
  map.addLayer({
    id: IDS.layerGrid,
    type: "line",
    source: IDS.srcGrid,
    paint: {
      "line-color": "#111827",
      "line-opacity": ["case", ["get", "major"], 0.75, 0.5],
      "line-width": ["case", ["get", "major"], 2.0, 1.2],
    },
  });

  // ensure ALL-cells selection layers exist (so *any* cell is clickable)
  if (!map.getSource(IDS.srcCellsAll)) {
    map.addSource(IDS.srcCellsAll, { type: "geojson", data: meta.cellsAll as any });
    map.addLayer({
      id: IDS.layerCellsAllFill,
      type: "fill",
      source: IDS.srcCellsAll,
      paint: {
        "fill-color": "#111827",
        "fill-opacity": 0.06,
      },
    });
    map.addLayer({
      id: IDS.layerCellsAllOutline,
      type: "line",
      source: IDS.srcCellsAll,
      paint: {
        "line-color": "#111827",
        "line-opacity": 0.35,
        "line-width": 1.4,
      },
    });
    // highlight should use ALL cells
    if (map.getLayer(IDS.layerCellsHL)) map.removeLayer(IDS.layerCellsHL);
    map.addLayer({
      id: IDS.layerCellsHL,
      type: "fill",
      source: IDS.srcCellsAll,
      filter: ["==", ["get", "i"], -9999],
      paint: { "fill-color": "#111827", "fill-opacity": 0.28 },
    });
  }
}

// ---------- Raw OD cache ----------
let _rawUrl: string | null = null;
let _rawOD: FeatureCollection<LineString, any> | null = null;
async function loadRawOD(url: string) {
  if (_rawOD && _rawUrl === url) return _rawOD;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  _rawUrl = url;
  _rawOD = (await res.json()) as FeatureCollection<LineString, any>;
  return _rawOD!;
}

// ---------- Events ----------
function bindEvents(map: maplibregl.Map) {
  if (_eventsBound) return;
  _eventsBound = true;

  // Hover lines/bubbles/stops or cells (all-cells preferred)
  _handlers.move = (e: maplibregl.MapMouseEvent) => {
    const feats = map.queryRenderedFeatures(e.point, {
      layers: [
        IDS.layerBubbles,
        IDS.layerLines,
        IDS.layerStopsO,
        IDS.layerStopsD,
        IDS.layerStopsOD,
      ].filter((id) => !!map.getLayer(id)),
    }) as GLFeature[];

    const fb = feats.find((f: GLFeature) => f.layer.id === IDS.layerBubbles);
    const fl = feats.find((f: GLFeature) => f.layer.id === IDS.layerLines);
    const fs =
      feats.find((f: GLFeature) => f.layer.id === IDS.layerStopsO) ||
      feats.find((f: GLFeature) => f.layer.id === IDS.layerStopsD) ||
      feats.find((f: GLFeature) => f.layer.id === IDS.layerStopsOD);

    if (fs && fs.properties) {
      _hoverPid = null;
      _hoverCid = null;
      applyFilters(map);
      setCursor(map, true);
      const { role, i, j } = fs.properties as any;
      ensurePopup().setLngLat(e.lngLat).setHTML(
        `<div><b>停留所</b> (${i},${j})<br/><b>役割</b> ${role}</div>`
      ).addTo(map);
      return;
    }

    if (fb && fb.properties) {
      _hoverPid = null;
      _hoverCid = String((fb.properties as any).cid);
      applyFilters(map);
      setCursor(map, true);
      const { vol, i, j } = fb.properties as any;
      ensurePopup().setLngLat(e.lngLat).setHTML(
        `<div><b>セル</b> ${i}, ${j}<br/><b>自己流動</b> ${vol}</div>`
      ).addTo(map);
      return;
    }

    if (fl && fl.properties) {
      _hoverCid = null;
      _hoverPid = String((fl.properties as any).pid);
      applyFilters(map);
      setCursor(map, true);
      const { vol, oI, oJ, dI, dJ } = fl.properties as any;
      ensurePopup().setLngLat(e.lngLat).setHTML(
        `<div><b>OD</b> (${oI},${oJ}) → (${dI},${dJ})<br/><b>量</b> ${vol}</div>`
      ).addTo(map);
      return;
    }

    _hoverPid = _hoverCid = null;
    applyFilters(map);
    setCursor(map, false);
    clearPopup();
  };

  _handlers.leaveCells = (_e: maplibregl.MapLayerMouseEvent) => {
    _hoverCell = null;
    applyFilters(map);
    setCursor(map, false);
    clearPopup();
  };
  _handlers.clickCell = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0] as GLFeature | undefined;
    if (!f?.properties) return;
    const { i, j, outVol, inVol, total } = f.properties as any;
    _focusCell = { i: Number(i), j: Number(j) };
    _singleODPid = null; // if single-OD was active, clear it
    applyFilters(map);
    ensurePopup().setLngLat(e.lngLat).setHTML(
      `<div><b>セル</b> (${i},${j}) フォーカス<br/>発: ${outVol} / 着: ${inVol} / 合計: ${total}<br/><i>（地図の空白をクリックで解除）</i></div>`
    ).addTo(map);
    (map as any).fire?.("odgrid:single-od", { active: false });
  };

  _handlers.leaveLines = (_e: maplibregl.MapLayerMouseEvent) => {
    _hoverPid = null;
    applyFilters(map);
    setCursor(map, false);
    clearPopup();
  };
  _handlers.leaveBubbles = (_e: maplibregl.MapLayerMouseEvent) => {
    _hoverCid = null;
    applyFilters(map);
    setCursor(map, false);
    clearPopup();
  };

  // Single-OD inspect: isolate clicked line
  _handlers.clickLine = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0] as GLFeature | undefined;
    if (!f?.properties) return;
    const { pid, vol, oI, oJ, dI, dJ } = f.properties as any;
    _singleODPid = String(pid);
    _focusCell = null; // focus not needed for single-OD
    applyFilters(map);
    ensurePopup().setLngLat(e.lngLat).setHTML(
      `<div><b>単一 OD 選択</b><br/>(${oI},${oJ}) → (${dI},${dJ})<br/><b>量</b> ${vol}<br/><i>（地図の空白をクリックで解除）</i></div>`
    ).addTo(map);
    (map as any).fire?.("odgrid:single-od", { active: true });
  };

  _handlers.clickBubble = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0] as GLFeature | undefined;
    if (!f?.properties) return;
    const { i, j, vol } = f.properties as any;
    _focusCell = { i: Number(i), j: Number(j) };
    _singleODPid = null;
    applyFilters(map);
    ensurePopup().setLngLat(e.lngLat).setHTML(
      `<div><b>セル</b> (${i},${j}) にフォーカス<br/><b>自己流動</b> ${vol}<br/><i>（クリック外で解除）</i></div>`
    ).addTo(map);
    (map as any).fire?.("odgrid:single-od", { active: false });
  };

  _handlers.mapClick = (e: maplibregl.MapMouseEvent) => {
    // clicking empty space clears both focus & single-OD
    const feats = map.queryRenderedFeatures(e.point, {
      layers: [
        IDS.layerCellsAllFill,
        IDS.layerCellsFill,
        IDS.layerBubbles,
        IDS.layerLines,
        IDS.layerStopsO,
        IDS.layerStopsD,
        IDS.layerStopsOD,
      ].filter((id) => !!map.getLayer(id)),
    }) as GLFeature[];
    if (!feats.length) {
      _focusCell = null;
      _singleODPid = null;
      applyFilters(map);
      clearPopup();
      (map as any).fire?.("odgrid:single-od", { active: false });
    }
  };

  // Combined mousemove to prefer ALL-cells if present
  map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
    const cellLayers = [IDS.layerCellsAllFill, IDS.layerCellsFill].filter((id) => !!map.getLayer(id));
    const feats = cellLayers.length
      ? (map.queryRenderedFeatures(e.point, { layers: cellLayers }) as GLFeature[])
      : ([] as GLFeature[]);
    if (feats.length && feats[0].properties) {
      const { i, j, outVol, inVol, total } = feats[0].properties as any;
      _hoverCell = { i: Number(i), j: Number(j) };
      applyFilters(map);
      setCursor(map, true);
      ensurePopup().setLngLat(e.lngLat).setHTML(
        `<div><b>セル</b> (${i},${j})<br/>発: ${outVol} / 着: ${inVol} / 合計: ${total}</div>`
      ).addTo(map);
      return;
    }
    _handlers.move!(e);
  });

  if (map.getLayer(IDS.layerCellsAllFill)) {
    map.on("mouseleave", IDS.layerCellsAllFill, _handlers.leaveCells!);
    map.on("click", IDS.layerCellsAllFill, _handlers.clickCell!);
  }
  map.on("mouseleave", IDS.layerCellsFill, _handlers.leaveCells!);
  map.on("click", IDS.layerCellsFill, _handlers.clickCell!);

  map.on("mouseleave", IDS.layerLines, _handlers.leaveLines!);
  map.on("mouseleave", IDS.layerBubbles, _handlers.leaveBubbles!);

  map.on("click", IDS.layerLines, _handlers.clickLine!);
  map.on("click", IDS.layerBubbles, _handlers.clickBubble!);
  map.on("click", _handlers.mapClick!);
}
function unbindEvents(map: maplibregl.Map) {
  if (!_eventsBound) return;
  _eventsBound = false;

  if (map.getLayer(IDS.layerCellsAllFill)) {
    map.off("mouseleave", IDS.layerCellsAllFill, _handlers.leaveCells!);
    map.off("click", IDS.layerCellsAllFill, _handlers.clickCell!);
  }
  if (map.getLayer(IDS.layerCellsFill)) {
    map.off("mouseleave", IDS.layerCellsFill, _handlers.leaveCells!);
    map.off("click", IDS.layerCellsFill, _handlers.clickCell!);
  }

  map.off("mouseleave", IDS.layerLines, _handlers.leaveLines!);
  map.off("mouseleave", IDS.layerBubbles, _handlers.leaveBubbles!);

  map.off("click", IDS.layerLines, _handlers.clickLine!);
  map.off("click", IDS.layerBubbles, _handlers.clickBubble!);
  map.off("click", _handlers.mapClick!);

  _handlers = {};
  clearPopup();
}

// ---------- Toggle / Update ----------
export async function toggleKashiwakuruOdGridLayer(
  map: maplibregl.Map,
  visible: boolean,
  setIsLoading: (v: boolean) => void,
  setVisible: (v: boolean) => void,
  opts?: {
    timeBand?: TimeBand;
    color?: string;
    showGrid?: boolean;
    undirected?: boolean;
    sourceUrl?: string;
    minVolThreshold?: number;
    focusMode?: "all" | "out" | "in";
    showStops?: boolean;
  }
) {
  const {
    timeBand = null,
    color = "#0f7282",
    showGrid = false,
    undirected = false,
    sourceUrl = blobUrl("kashiwa_od_lines.geojson"),
    minVolThreshold = 1,
    focusMode = "all",
    showStops = true,
  } = opts || {};

  setIsLoading(true);

  if (visible) {
    removeAggregatedLayers(map);
    unbindEvents(map);
    setVisible(false);
    map.once("idle", () => setIsLoading(false));
    return;
  }

  try {
    hideMeshLayers(map);
    _minVol = minVolThreshold;
    _focusMode = focusMode;
    _showStops = showStops;
    _singleODPid = null;

    const od = await loadRawOD(sourceUrl);
    const { agg, meta } = aggregateODTo100m(od, timeBand, undirected);

    addAggregatedODLayers(map, agg, color, showStops, showGrid ? meta.cellsAll : undefined);
    if (showGrid) add100mGridOverlay(map, meta as any);

    bindEvents(map);
    setVisible(true);
  } catch (e) {
    console.error("toggleKashiwakuruOdGridLayer failed:", e);
    removeAggregatedLayers(map);
    unbindEvents(map);
    setVisible(false);
  } finally {
    map.once("idle", () => setIsLoading(false));
  }
}

export async function updateKashiwakuruOdGridLayer(
  map: maplibregl.Map,
  setIsLoading: (v: boolean) => void,
  opts?: {
    timeBand?: TimeBand;
    color?: string;
    showGrid?: boolean;
    undirected?: boolean;
    sourceUrl?: string;
    minVolThreshold?: number;
    focusMode?: "all" | "out" | "in";
    showStops?: boolean;
  }
) {
  if (!map.getSource(IDS.srcLines) || !map.getSource(IDS.srcBubbles)) return;

  const {
    timeBand = null,
    color = "#0f7282",
    showGrid = false,
    undirected = false,
    sourceUrl = _rawUrl || blobUrl("kashiwa_od_lines.geojson"),
    minVolThreshold = _minVol,
    focusMode = _focusMode,
    showStops = _showStops,
  } = opts || {};

  setIsLoading(true);
  try {
    _minVol = minVolThreshold;
    _focusMode = focusMode;
    _showStops = showStops;

    const od = await loadRawOD(sourceUrl);
    const { agg, meta } = aggregateODTo100m(od, timeBand, undirected);

    (map.getSource(IDS.srcLines) as maplibregl.GeoJSONSource).setData(agg.lines as any);
    (map.getSource(IDS.srcBubbles) as maplibregl.GeoJSONSource).setData(agg.bubbles as any);

    if (map.getSource(IDS.srcStops)) {
      (map.getSource(IDS.srcStops) as maplibregl.GeoJSONSource).setData(agg.stops as any);
    } else {
      map.addSource(IDS.srcStops, { type: "geojson", data: agg.stops as any });
    }

    if (showGrid) {
      if (map.getSource(IDS.srcCellsAll)) {
        (map.getSource(IDS.srcCellsAll) as maplibregl.GeoJSONSource).setData(meta.cellsAll as any);
      } else {
        map.addSource(IDS.srcCellsAll, { type: "geojson", data: meta.cellsAll as any });
      }
      if (!map.getLayer(IDS.layerCellsAllFill)) {
        map.addLayer({
          id: IDS.layerCellsAllFill,
          type: "fill",
          source: IDS.srcCellsAll,
          paint: { "fill-color": "#111827", "fill-opacity": 0.06 },
        });
      }
      if (!map.getLayer(IDS.layerCellsAllOutline)) {
        map.addLayer({
          id: IDS.layerCellsAllOutline,
          type: "line",
          source: IDS.srcCellsAll,
          paint: { "line-color": "#111827", "line-opacity": 0.35, "line-width": 1.4 },
        });
      }
      if (map.getLayer(IDS.layerCellsHL)) map.removeLayer(IDS.layerCellsHL);
      map.addLayer({
        id: IDS.layerCellsHL,
        type: "fill",
        source: IDS.srcCellsAll,
        filter: ["==", ["get", "i"], -9999],
        paint: { "fill-color": "#111827", "fill-opacity": 0.28 },
      });

      add100mGridOverlay(map, meta as any);
    } else {
      if (map.getLayer(IDS.layerCellsAllFill)) map.removeLayer(IDS.layerCellsAllFill);
      if (map.getLayer(IDS.layerCellsAllOutline)) map.removeLayer(IDS.layerCellsAllOutline);
      if (map.getSource(IDS.srcCellsAll)) map.removeSource(IDS.srcCellsAll);

      if (map.getLayer(IDS.layerCellsHL)) map.removeLayer(IDS.layerCellsHL);
      map.addLayer({
        id: IDS.layerCellsHL,
        type: "fill",
        source: IDS.srcCells,
        filter: ["==", ["get", "i"], -9999],
        paint: { "fill-color": "#111827", "fill-opacity": 0.28 },
      });

      if (map.getLayer(IDS.layerGrid)) map.removeLayer(IDS.layerGrid);
      if (map.getSource(IDS.srcGrid)) map.removeSource(IDS.srcGrid);
    }

    if (map.getSource(IDS.srcCells)) {
      (map.getSource(IDS.srcCells) as maplibregl.GeoJSONSource).setData(agg.cells as any);
    }
    map.setPaintProperty(IDS.layerLines, "line-color", color);

    // Toggle stops visibility
    setLayerVisibility(map, IDS.layerStopsO, showStops);
    setLayerVisibility(map, IDS.layerStopsD, showStops);
    setLayerVisibility(map, IDS.layerStopsOD, showStops);
    setLayerVisibility(map, IDS.layerStopsFocusHL, showStops);

    applyFilters(map);
  } catch (e) {
    console.error("updateKashiwakuruOdGridLayer failed:", e);
  } finally {
    map.once("idle", () => setIsLoading(false));
  }
}

// ---------- Public helpers ----------
export function setOdGridMinVolume(map: maplibregl.Map, minVol: number) {
  _minVol = minVol;
  applyFilters(map);
}
export function focusOdGridCell(
  map: maplibregl.Map,
  cell: { i: number; j: number } | null,
  mode: FocusMode = "all"
) {
  _focusCell = cell;
  _focusMode = mode;
  _singleODPid = null;
  applyFilters(map);
}
export function clearOdGridFocus(map: maplibregl.Map) {
  _focusCell = null;
  applyFilters(map);
}
export function clearSingleOdSelection(map: maplibregl.Map) {
  _singleODPid = null;
  applyFilters(map);
}
