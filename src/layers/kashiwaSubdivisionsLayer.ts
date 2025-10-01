// src/layers/kashiwaSubdivisionsLayer.ts
import type maplibregl from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  Point,
  Polygon,
  MultiPolygon,
  GeoJsonProperties,
} from "geojson";

const SRC_ID = "kashiwa-subdiv-src";
const SRC_ID_LABELPTS = "kashiwa-subdiv-labelpts-src"; // point source for labels
const LYR_OUTLINE_CASING = "kashiwa-subdiv-outline-casing";
const LYR_OUTLINE = "kashiwa-subdiv-outline";
const LYR_LABELS = "kashiwa-subdiv-labels";

// Put your data at: public/data/kashiwa_partition.geojson
const DATA_URL = "/data/administration_mie.geojson";

/* -------------------- Geometry helpers (for label points) -------------------- */
// WebMercator helpers (approx) to compute area/centroid reliably in meters
const R = 6378137;
const toMercX = (lon: number) => R * (lon * Math.PI) / 180;
const toMercY = (lat: number) => {
  const rad = (lat * Math.PI) / 180;
  // clamp to avoid infinities at poles
  const clamped = Math.max(Math.min(rad, Math.PI / 2 - 1e-6), -Math.PI / 2 + 1e-6);
  return R * Math.log(Math.tan(Math.PI / 4 + clamped / 2));
};
type Ring = [number, number][];

function ringAreaCentroid(ring: Ring) {
  // Shoelace in WebMercator
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i++) {
    const [lon1, lat1] = ring[j];
    const [lon2, lat2] = ring[i];
    const x1 = toMercX(lon1), y1 = toMercY(lat1);
    const x2 = toMercX(lon2), y2 = toMercY(lat2);
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) return { area: 0, cx: 0, cy: 0 };
  cx /= (6 * a);
  cy /= (6 * a);
  return { area: Math.abs(a), cx, cy };
}

function mercToLngLat(x: number, y: number): [number, number] {
  const lon = (x / R) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
  return [lon, lat];
}

function polygonLargestRingCentroid(coords: any): { area: number; lng: number; lat: number } {
  // coords is [outerRing, hole1, hole2, ...]; use the outer ring (index 0)
  const outer: Ring = coords[0] as Ring;
  const { area, cx, cy } = ringAreaCentroid(outer);
  const [lng, lat] = mercToLngLat(cx, cy);
  return { area, lng, lat };
}

function multiPolygonRepresentativePoint(coords: any): { area: number; lng: number; lat: number } {
  // pick the largest polygon in the MultiPolygon
  let best = { area: 0, lng: 0, lat: 0 };
  for (const poly of coords as any[]) {
    const c = polygonLargestRingCentroid(poly);
    if (c.area > best.area) best = c;
  }
  return best;
}

/* ------------------------------- Sources ---------------------------------- */
async function ensureSource(map: maplibregl.Map) {
  if (map.getSource(SRC_ID) && map.getSource(SRC_ID_LABELPTS)) return;

  const resp = await fetch(DATA_URL, { cache: "force-cache" });
  if (!resp.ok) throw new Error(`Failed to load ${DATA_URL}`);

  // Base polygon source
  const data = (await resp.json()) as FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  if (!map.getSource(SRC_ID)) {
    map.addSource(SRC_ID, { type: "geojson", data, promoteId: "id" });
  }

  // ---- Derive a point per PT_NAME for labeling ----
  // Group by PT_NAME (fallback to feature id)
  const groups = new Map<string, Feature<Polygon | MultiPolygon, GeoJsonProperties>[]>();
  for (const f of data.features || []) {
    const name = (f.properties?.PT_NAME ?? f.id ?? "").toString();
    const arr = groups.get(name);
    if (arr) arr.push(f); else groups.set(name, [f]);
  }

  const labelFeatures: Feature<Point, GeoJsonProperties>[] = [];
  for (const [name, feats] of groups.entries()) {
    let best = { area: 0, lng: 0, lat: 0 };
    let props: GeoJsonProperties = {};

    for (const f of feats) {
      if (!f?.geometry) continue;
      const g = f.geometry;
      if (g.type === "Polygon") {
        const c = polygonLargestRingCentroid(g.coordinates);
        if (c.area > best.area) { best = c; props = f.properties ?? {}; }
      } else if (g.type === "MultiPolygon") {
        const c = multiPolygonRepresentativePoint(g.coordinates);
        if (c.area > best.area) { best = c; props = f.properties ?? {}; }
      }
    }

    if (best.area > 0) {
      labelFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [best.lng, best.lat] as [number, number] },
        properties: { PT_NAME: name, ...(props ?? {}) } as GeoJsonProperties,
      });
    }
  }

  const labelFC: FeatureCollection<Point, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: labelFeatures,
  };

  if (!map.getSource(SRC_ID_LABELPTS)) {
    map.addSource(SRC_ID_LABELPTS, { type: "geojson", data: labelFC });
  }
}

/* ------------------------------ Label BG Icon ------------------------------ */
function ensureLabelBgImage(map: maplibregl.Map) {
  try {
    if ((map as any).hasImage?.("subdiv-label-bg")) return;

    const w = 72, h = 30, r = 8; // slightly larger for readability
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // solid white fill, darker border for contrast on busy maps
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 1.2;

    const x = 0.5, y = 0.5, ww = w - 1, hh = h - 1;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    (map as any).addImage?.("subdiv-label-bg", canvas, { pixelRatio: 2 });
  } catch {
    /* no-op */
  }
}

/* --------------------------- Label Priority/Order -------------------------- */
function prioritizeSubdivisionLabels(map: maplibregl.Map) {
  // Try to insert our labels BEFORE common label layers so they get placed first.
  const candidateLabelIds = [
    "poi-label", "poi-labels", "place-label", "place_labels",
    "road-label", "road_labels", "water-label", "admin-label"
  ];

  const target = candidateLabelIds.find((id) => map.getLayer(id));
  if (target && map.getLayer(LYR_LABELS)) {
    map.moveLayer(LYR_LABELS, target);
  }

  // Also ensure we are placed before Kashiwa chome labels to avoid collisions hiding ours.
  const chomeLabelsId = "kashiwa-chome-labels"; // matches exported id in kashiwaChomePopulationLayer
  if (map.getLayer(chomeLabelsId) && map.getLayer(LYR_LABELS)) {
    map.moveLayer(LYR_LABELS, chomeLabelsId);
  }
}

/* --------------------------------- Layers --------------------------------- */
function addLayers(map: maplibregl.Map, opts?: { color?: string; dash?: number[] }) {
  const color = opts?.color ?? "#000000"; // slate-800
  const dash = opts?.dash ?? [2, 2];

  if (!map.getLayer(LYR_OUTLINE_CASING)) {
    map.addLayer({
      id: LYR_OUTLINE_CASING,
      type: "line",
      source: SRC_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      layout: { "line-join": "round", "line-cap": "round", visibility: "visible" },
      paint: {
        "line-color": "#000000",
        "line-opacity": 0.55,
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          9, 2.5, 12, 4, 14, 6, 16, 8
        ],
      },
    });
  }

  if (!map.getLayer(LYR_OUTLINE)) {
    map.addLayer({
      id: LYR_OUTLINE,
      type: "line",
      source: SRC_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      layout: { "line-join": "round", "line-cap": "round", visibility: "visible" },
      paint: {
        "line-color": color,
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          9, 1.2, 12, 2, 14, 3, 16, 4.5
        ],
        "line-dasharray": dash, // comment for solid line
      },
    });
  }

  // Labels drawn from the POINT source so you get exactly one centered label per subdivision
  ensureLabelBgImage(map);
  if (!map.getLayer(LYR_LABELS)) {
    map.addLayer({
      id: LYR_LABELS,
      type: "symbol",
      source: SRC_ID_LABELPTS, // <-- point source
      layout: {
        "symbol-placement": "point",
        "text-anchor": "center",

        "text-field": ["to-string", ["get", "PT_NAME"]],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-z-order": "auto",
        "symbol-sort-key": 2000,

        "text-font": [
          "Noto Sans Bold",
          "Noto Sans CJK JP Bold",
          "Noto Sans Regular",
          "Noto Sans CJK JP Regular"
        ],

        // Keep centered, no variable anchors
        "text-offset": [0, 0],
        "text-justify": "center",
        "text-max-width": 10,
        "text-line-height": 1.1,
        "text-letter-spacing": 0.01,

        // White pill background that grows with text
        "icon-image": "subdiv-label-bg",
        "icon-text-fit": "both",
        "icon-text-fit-padding": [4, 12, 4, 12],
        "icon-allow-overlap": false,
        "icon-optional": false,

        // Slightly larger sizes so it's clearly readable
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          10, 12, 12, 14, 14, 16, 16, 18
        ],
        "text-padding": 6
      },
      paint: {
        "text-color": "#000000",
        // No halo (we have white pill), keep zeros to avoid blur
        "text-halo-color": "#FFFFFF",
        "text-halo-width": 0,
        "text-halo-blur": 0
      },
    });
  }
}

/* --------------------------- Visibility & Ordering ------------------------- */
function setVisible(map: maplibregl.Map, visible: boolean) {
  const v = visible ? "visible" : "none";
  for (const id of [LYR_OUTLINE_CASING, LYR_OUTLINE, LYR_LABELS]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
  }
}

function bringToFront(map: maplibregl.Map) {
  // Move in this order so labels end up at the absolute top (and thus yield to collisions)
  for (const id of [LYR_OUTLINE_CASING, LYR_OUTLINE, LYR_LABELS]) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
}

/* --------------------------------- Toggle --------------------------------- */
/** Public toggle, matches the calling style of your other layers */
export async function toggleKashiwaSubdivisionsLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisibleState: (b: boolean) => void
) {
  try {
    setIsLoading(true);
    if (!currentlyVisible) {
      await ensureSource(map);
      addLayers(map);
      setVisible(map, true);
      bringToFront(map);             // keep boundary/labels above thematic fills
      prioritizeSubdivisionLabels(map);
      setVisibleState(true);
    } else {
      setVisible(map, false);
      setVisibleState(false);
    }
  } finally {
    // tiny defer to let style updates settle, same spirit as other layer toggles
    setTimeout(() => setIsLoading(false), 80);
  }
}
