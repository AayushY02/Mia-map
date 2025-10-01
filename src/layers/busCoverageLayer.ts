

// src/layers/busCoverageLayer.ts
import maplibregl from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import { buffer, featureCollection, multiPoint } from "@turf/turf";
// import { blobUrl } from "@/lib/blobUrl";

/** simple caches */
let __busStopsCache: FeatureCollection<Point> | null = null;
let __buffersCache: Record<number, FeatureCollection<Polygon | MultiPolygon>> = {};
let __mergedCache: Record<number, FeatureCollection<Polygon | MultiPolygon>> = {};

/** hover state + popup for points */
let __hoveredStopId: number | null = null;
let __stopPopup: maplibregl.Popup | null = null;
let __handlersBound = false;

/** Configure your data path (or set VITE_BUS_STOPS_URL) */
const BUS_STOPS_URL = "/data/bus_stop.geojson";
// const BUS_STOPS_URL = blobUrl("bus_coverage.geojson");

/** IDs (shared across both toggles) */
const IDS = {
  // sources
  srcStops: "bus-coverage-stops-src",
  srcBuffers: "bus-coverage-buffers-src",
  srcMerged: "bus-coverage-merged-src",
  // layers (coverage)
  lyrBuffersFill: "bus-coverage-buffers-fill",
  lyrBuffersLine: "bus-coverage-buffers-line",
  lyrMergedFill: "bus-coverage-merged-fill",
  lyrMergedLine: "bus-coverage-merged-line",
  // layers (raw points)
  lyrStopsCircle: "bus-coverage-stops-circle",
} as const;

/** helpers */
function upsertGeoJsonSource(
  map: maplibregl.Map,
  id: string,
  data: any,
  opts?: { generateId?: boolean }
) {
  const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (existing) existing.setData(data);
  else
    map.addSource(id, {
      type: "geojson",
      data,
      ...(opts?.generateId ? { generateId: true } : {}),
    });
}

function ensureLayer(
  map: maplibregl.Map,
  layer: maplibregl.LayerSpecification,
  beforeId?: string
) {
  if (!map.getLayer(layer.id)) map.addLayer(layer, beforeId);
}
function removeLayerIfExists(map: maplibregl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}
function setVisibility(map: maplibregl.Map, id: string, v: "visible" | "none") {
  if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
}

async function loadBusStops(): Promise<FeatureCollection<Point>> {
  if (__busStopsCache) return __busStopsCache;
  const res = await fetch(BUS_STOPS_URL);
  if (!res.ok)
    throw new Error(`Failed to load bus stops: ${res.status} ${res.statusText}`);
  __busStopsCache = (await res.json()) as FeatureCollection<Point>;
  return __busStopsCache;
}

/** For QA: build separate 300m circles (kept for completeness) */
function buildIndividualBuffers(
  stops: FeatureCollection<Point>,
  radiusMeters = 300,
  steps = 32
): FeatureCollection<Polygon | MultiPolygon> {
  if (__buffersCache[radiusMeters]) return __buffersCache[radiusMeters];
  const buffered = stops.features
    .filter((f) => f && f.geometry)
    .map((f) =>
      buffer(f as Feature<Point>, radiusMeters, { units: "meters", steps })
    ) as Feature<Polygon | MultiPolygon>[];
  const out = featureCollection(buffered);
  __buffersCache[radiusMeters] = out;
  return out;
}

/** Dissolved coverage: MultiPoint -> buffer once */
function buildMergedCoverage(
  stops: FeatureCollection<Point>,
  radiusMeters = 300,
  steps = 32
): FeatureCollection<Polygon | MultiPolygon> {
  if (__mergedCache[radiusMeters]) return __mergedCache[radiusMeters];
  const coords = stops.features
    .filter((f) => f && f.geometry && f.geometry.type === "Point")
    .map((f) => (f.geometry as Point).coordinates);
  if (coords.length === 0) return featureCollection([]);
  const mp = multiPoint(coords);
  const dissolved = buffer(mp, radiusMeters, { units: "meters", steps }) as Feature<
    Polygon | MultiPolygon
  >;
  const out = featureCollection([dissolved]);
  __mergedCache[radiusMeters] = out;
  return out;
}

/** Utility: extract route strings from properties */
function stringifyRoutes(props: Record<string, any>): { list: string[]; count: number } {
  const keys = Object.keys(props).filter((k) => /^P11_003_/i.test(k));
  const items = keys
    .map((k) => (props[k] as string | null)?.trim())
    .filter((v): v is string => !!v);
  // Each field may contain comma-separated or "，" separated routes; split & flatten:
  const split = items.flatMap((s) =>
    s.split(/[、,，]\s*/g).map((x) => x.trim()).filter(Boolean)
  );
  const unique = Array.from(new Set(split));
  return { list: unique, count: unique.length };
}

/** MAIN: toggle dissolved 300m coverage */
export async function toggleBusCoverageLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void,
  opts?: {
    radiusMeters?: number; // default 300
    showIndividual?: boolean; // default false
    buffersColor?: string; // default #2ecc71
    mergedColor?: string; // default #8a2be2
    opacity?: number; // default 0.35
    before?: string; // insert before this layer id
  }
) {
  const nextVisible = !currentlyVisible;

  // quick flip if already created
  if (map.getSource(IDS.srcMerged) || map.getLayer(IDS.lyrMergedFill)) {
    setIsLoading(true);
    const vis = nextVisible ? "visible" : "none";
    setVisibility(map, IDS.lyrMergedFill, vis);
    setVisibility(map, IDS.lyrMergedLine, vis);
    if (opts?.showIndividual) {
      setVisibility(map, IDS.lyrBuffersFill, vis);
      setVisibility(map, IDS.lyrBuffersLine, vis);
    } else {
      removeLayerIfExists(map, IDS.lyrBuffersFill);
      removeLayerIfExists(map, IDS.lyrBuffersLine);
    }
    map.once("idle", () => {
      setVisible(nextVisible);
      setIsLoading(false);
    });
    return;
  }

  if (!nextVisible) {
    setVisible(false);
    return;
  }

  try {
    setIsLoading(true);
    const radiusMeters = opts?.radiusMeters ?? 300;
    const stops = await loadBusStops();

    // merged coverage
    const merged = buildMergedCoverage(stops, radiusMeters, 32);
    upsertGeoJsonSource(map, IDS.srcMerged, merged);

    if (opts?.showIndividual) {
      const buffers = buildIndividualBuffers(stops, radiusMeters, 32);
      upsertGeoJsonSource(map, IDS.srcBuffers, buffers);
    }

    const buffersColor = opts?.buffersColor ?? "#2ecc71";
    const mergedColor = opts?.mergedColor ?? "#8a2be2";
    const opacity = opts?.opacity ?? 0.35;

    ensureLayer(
      map,
      {
        id: IDS.lyrMergedFill,
        type: "fill",
        source: IDS.srcMerged,
        paint: { "fill-color": mergedColor, "fill-opacity": opacity },
      },
      opts?.before
    );
    ensureLayer(
      map,
      {
        id: IDS.lyrMergedLine,
        type: "line",
        source: IDS.srcMerged,
        paint: { "line-color": "#6c1fb2", "line-width": 1.5 },
      },
      opts?.before
    );

    if (opts?.showIndividual) {
      ensureLayer(
        map,
        {
          id: IDS.lyrBuffersFill,
          type: "fill",
          source: IDS.srcBuffers,
          paint: { "fill-color": buffersColor, "fill-opacity": opacity },
        },
        opts?.before
      );
      ensureLayer(
        map,
        {
          id: IDS.lyrBuffersLine,
          type: "line",
          source: IDS.srcBuffers,
          paint: { "line-color": "#27ae60", "line-width": 1 },
        },
        opts?.before
      );
    } else {
      removeLayerIfExists(map, IDS.lyrBuffersFill);
      removeLayerIfExists(map, IDS.lyrBuffersLine);
    }

    map.once("idle", () => {
      setVisible(true);
      setIsLoading(false);
    });
  } catch (err) {
    console.error("[busCoverageLayer] failed:", err);
    setIsLoading(false);
  }
}

/** NEW: independent toggle for raw bus-stop points (with hover popup) */
export async function toggleBusStopPointsLayer(
  map: maplibregl.Map,
  currentlyVisible: boolean,
  setIsLoading: (b: boolean) => void,
  setVisible: (b: boolean) => void,
  opts?: {
    size?: number; // default 4
    color?: string; // default #d00
    before?: string; // insert before this layer id
  }
) {
  const nextVisible = !currentlyVisible;

  // fast flip
  if (map.getLayer(IDS.lyrStopsCircle)) {
    setIsLoading(true);
    const vis = nextVisible ? "visible" : "none";
    setVisibility(map, IDS.lyrStopsCircle, vis);
    map.once("idle", () => {
      setVisible(nextVisible);
      setIsLoading(false);
    });
    return;
  }

  if (!nextVisible) {
    setVisible(false);
    return;
  }

  try {
    setIsLoading(true);
    const stops = await loadBusStops();
    // generateId so we can use feature-state hover highlight
    upsertGeoJsonSource(map, IDS.srcStops, stops, { generateId: true });

    const size = opts?.size ?? 4;
    const color = opts?.color ?? "#d00";

    ensureLayer(
      map,
      {
        id: IDS.lyrStopsCircle,
        type: "circle",
        source: IDS.srcStops,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            size + 2,
            size,
          ],
          "circle-color": color,
          "circle-opacity": 0.9,
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#111",
            "#ffffff",
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            1,
          ],
        },
      },
      opts?.before
    );

    bindStopHoverHandlers(map);

    map.once("idle", () => {
      setVisible(true);
      setIsLoading(false);
    });
  } catch (err) {
    console.error("[busCoverageLayer:points] failed:", err);
    setIsLoading(false);
  }
}

/** Hover bindings (idempotent) */
function bindStopHoverHandlers(map: maplibregl.Map) {
  if (__handlersBound) return;
  __handlersBound = true;

  map.on("mouseenter", IDS.lyrStopsCircle, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", IDS.lyrStopsCircle, () => {
    map.getCanvas().style.cursor = "";
    if (__hoveredStopId !== null) {
      map.setFeatureState({ source: IDS.srcStops, id: __hoveredStopId }, { hover: false });
      __hoveredStopId = null;
    }
    if (__stopPopup) __stopPopup.remove();
  });

  map.on("mousemove", IDS.lyrStopsCircle, (e) => {
    const f = e.features?.[0] as Feature<Point, any> | undefined;
    if (!f) return;

    // hover state
    if (__hoveredStopId !== null && __hoveredStopId !== f.id) {
      map.setFeatureState({ source: IDS.srcStops, id: __hoveredStopId }, { hover: false });
    }
    if (typeof f.id === "number" || typeof f.id === "string") {
      __hoveredStopId = f.id as number;
      map.setFeatureState({ source: IDS.srcStops, id: f.id }, { hover: true });
    }

    // popup content
    const name = f.properties?.P11_001 ?? "（名称不明）";
    const operator = f.properties?.P11_002 ?? "";
    const { list, count } = stringifyRoutes(f.properties ?? {});
    const routesText =
      list.length > 0
        ? list.slice(0, 5).join("、") + (list.length > 5 ? "、…" : "")
        : "—";

    const html = `
      <div class="text-[11px] leading-tight">
        <div class="font-semibold text-[12px]">${name}</div>
        ${operator ? `<div class="text-gray-600">${operator}</div>` : ""}
        <div class="mt-1 text-gray-700">
          <span class="font-medium">系統:</span> ${routesText}
        </div>
        <div class="text-gray-500">系統数: ${count}</div>
        <div class="text-gray-500">座標: ${f.geometry.coordinates[1].toFixed(5)}, ${f.geometry.coordinates[0].toFixed(5)}</div>
      </div>
    `;

    if (!__stopPopup) {
      __stopPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: ".ai-popup-2",
      });
    }
    __stopPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
}

/** Live-update the dissolved coverage radius */
export async function setBusCoverageRadius(
  map: maplibregl.Map,
  radiusMeters: number
) {
  const stops = await loadBusStops();
  const merged = buildMergedCoverage(stops, radiusMeters, 32);
  const src = map.getSource(IDS.srcMerged) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData(merged as any);
}

/** Quick export (downloads current dissolved coverage as a GeoJSON file) */
export function exportCoverageGeoJSON(map: maplibregl.Map, filename = "bus_coverage_merged.geojson") {
  const src = map.getSource(IDS.srcMerged) as maplibregl.GeoJSONSource | undefined;
  if (!src) return;
  // @ts-ignore: maplibre doesn't expose getData; keep our own cache:
  const data = __mergedCache ? Object.values(__mergedCache)[0] : null;
  const geojson = data ?? null;
  if (!geojson) return;

  const blob = new Blob([JSON.stringify(geojson)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Optional if you swap datasets at runtime */
export function resetBusCoverageCaches() {
  __busStopsCache = null;
  __buffersCache = {};
  __mergedCache = {};
}
