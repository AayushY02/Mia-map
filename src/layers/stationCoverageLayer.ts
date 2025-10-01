// src/layers/stationCoverageLayer.ts
import maplibregl from "maplibre-gl";
import type {
    Feature,
    FeatureCollection,
    MultiPolygon,
    Point,
    Polygon,
    Geometry,
    Position,
} from "geojson";
import { buffer, featureCollection, multiPoint, point, union } from "@turf/turf";
// import { blobUrl } from "@/lib/blobUrl";

/** Caches */
let __stationsPointsCache: FeatureCollection<Point> | null = null;
let __indiBuffersCache: Record<string, FeatureCollection<Polygon | MultiPolygon>> = {};
let __mergedCache: Record<string, FeatureCollection<Polygon | MultiPolygon>> = {};

/** Data URL */
const STATIONS_URL = "/data/railway_station.geojson";
// const STATIONS_URL = blobUrl("railway_station.geojson");

/** IDs (mirrors bus layer naming) */
const IDS = {
    srcStations: "station-coverage-stations-src",
    srcBuffers: "station-coverage-buffers-src",
    srcMerged: "station-coverage-merged-src",
    lyrBuffersFill: "station-coverage-buffers-fill",
    lyrBuffersLine: "station-coverage-buffers-line",
    lyrMergedFill: "station-coverage-merged-fill",
    lyrMergedLine: "station-coverage-merged-line",
} as const;

// find the first mask layer so we can insert *before* it
function findFirstCityMaskLayerId(map: maplibregl.Map): string | null {
    const style = map.getStyle();
    if (!style?.layers) return null;

    const indices: Array<{ id: string; idx: number }> = [];
    for (let i = 0; i < style.layers.length; i++) {
        const id = style.layers[i].id.toLowerCase();
        // Adjust these heuristics if your mask ids are different
        if (id.includes("city-mask") || id.includes("mask")) {
            indices.push({ id: style.layers[i].id, idx: i });
        }
    }
    if (!indices.length) return null;
    indices.sort((a, b) => a.idx - b.idx);
    return indices[0].id;
}

// move station-coverage layers under the city mask
function moveCoverageBelowMask(map: maplibregl.Map, explicitIds?: string[]) {
    const beforeId = findFirstCityMaskLayerId(map);
    if (!beforeId) return;

    // Use explicit ids if you know them; otherwise, auto-detect common names.
    const candidateIds =
        explicitIds && explicitIds.length
            ? explicitIds
            : (map.getStyle()?.layers ?? [])
                .map(l => l.id)
                .filter(id =>
                    /coverage/i.test(id) && /(station|rail)/i.test(id) // e.g., "station-coverage-fill"
                );

    for (const id of candidateIds) {
        if (map.getLayer(id)) {
            try { map.moveLayer(id, beforeId); } catch { }
        }
    }
}

/** Helpers (same style as busCoverageLayer.ts) */
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
    moveCoverageBelowMask(map, [
        IDS.lyrBuffersFill, // lowest
        IDS.lyrMergedFill,
        IDS.lyrBuffersLine,
        IDS.lyrMergedLine,  // topmost coverage stroke
    ]);
}
function removeLayerIfExists(map: maplibregl.Map, id: string) {
    if (map.getLayer(id)) map.removeLayer(id);
}
function setVisibility(map: maplibregl.Map, id: string, v: "visible" | "none") {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
}

/** Name extraction (jp/romaji tolerant) */
function getStationName(props: Record<string, any>): string {
    return (
        props?.name ??
        props?.NAME ??
        props?.駅名 ??
        props?.N02_005 ??
        props?.title ??
        ""
    );
}

/** Convert raw station geometries → Point features */
async function loadStationsAsPoints(): Promise<FeatureCollection<Point>> {
    if (__stationsPointsCache) return __stationsPointsCache;
    const res = await fetch(STATIONS_URL);
    if (!res.ok) throw new Error(`Failed to load station data: ${res.status} ${res.statusText}`);
    const raw = (await res.json()) as FeatureCollection<Geometry, Record<string, any>>;

    const pts: Feature<Point>[] = [];
    for (const f of raw.features) {
        const g = f.geometry;
        if (!g) continue;

        let coord: Position | null = null;
        if (g.type === "Point") coord = g.coordinates as Position;
        else if (g.type === "MultiPoint") coord = (g.coordinates[0] as Position) || null;
        else if (g.type === "LineString") coord = (g.coordinates[0] as Position) || null;
        else if (g.type === "MultiLineString") coord = (g.coordinates[0]?.[0] as Position) || null;
        else if (g.type === "Polygon") coord = (g.coordinates[0]?.[0] as Position) || null;
        else if (g.type === "MultiPolygon") coord = (g.coordinates[0]?.[0]?.[0] as Position) || null;
        if (!coord) continue;

        pts.push(point(coord, { ...(f.properties || {}) }) as Feature<Point>);
    }

    __stationsPointsCache = featureCollection(pts);
    return __stationsPointsCache;
}

/** 1km対象: 柏駅 / 柏の葉キャンパス駅 (+ romaji fallbacks) */
function isOneKmStation(name: string): boolean {
    const n = String(name);
    if (n === "柏" || n === "柏の葉キャンパス") return true;

    // Romaji variants
    if (/^kashiwa$/.test(n)) return true;
    if (/^kashiwanoha(?:-?campus)?$/.test(n)) return true;
    return false;
}

/** Individual buffers with per-station radius (for optional QA view) */
function buildIndividualBuffers(
    stationsPts: FeatureCollection<Point>,
    defaultRadius = 800,
    steps = 32
): FeatureCollection<Polygon | MultiPolygon> {
    const key = `${defaultRadius}`;
    if (__indiBuffersCache[key]) return __indiBuffersCache[key];

    const buffered = stationsPts.features
        .filter((f) => f && f.geometry)
        .map((f) => {
            const name = getStationName(f.properties || {});
            const radius = isOneKmStation(name) ? 1000 : defaultRadius;
            return buffer(f as Feature<Point>, radius, { units: "meters", steps }) as Feature<
                Polygon | MultiPolygon
            >;
        });

    const out = featureCollection(buffered);
    __indiBuffersCache[key] = out;
    return out;
}

/**
 * Dissolved coverage:
 * - Split stations into two MultiPoints (800m group & 1km group)
 * - Buffer each once
 * - Union the two dissolved polygons → single merged polygon (like bus layer)
 */
function buildMergedCoverage(
    stationsPts: FeatureCollection<Point>,
    defaultRadius = 800,
    steps = 32
): FeatureCollection<Polygon | MultiPolygon> {
    const key = `merged-${defaultRadius}`;
    if (__mergedCache[key]) return __mergedCache[key];

    const coords800: Position[] = [];
    const coords1k: Position[] = [];

    for (const f of stationsPts.features) {
        const name = getStationName(f.properties || {});
        const is1k = isOneKmStation(name);
        const c = (f.geometry as Point).coordinates;
        if (is1k) coords1k.push(c);
        else coords800.push(c);
    }

    const features: Feature<Polygon | MultiPolygon>[] = [];

    if (coords800.length) {
        const mp800 = multiPoint(coords800);
        const buf800 = buffer(mp800, defaultRadius, { units: "meters", steps }) as Feature<
            Polygon | MultiPolygon
        >;
        features.push(buf800);
    }
    if (coords1k.length) {
        const mp1k = multiPoint(coords1k);
        const buf1k = buffer(mp1k, 1000, { units: "meters", steps }) as Feature<
            Polygon | MultiPolygon
        >;
        features.push(buf1k);
    }

    if (features.length === 0) return featureCollection([]);

    let dissolved: Feature<Polygon | MultiPolygon>;
    if (features.length === 1) {
        dissolved = features[0];
    } else {
        try {
            const u = union(features[0] as any, features[1] as any) as Feature<Polygon | MultiPolygon> | null;
            dissolved = u ?? features[0];
        } catch {
            // If union hiccups, keep both; still a merged-style layer visually.
            return featureCollection(features);
        }
    }

    const out = featureCollection([dissolved]);
    __mergedCache[key] = out;
    return out;
}

/** MAIN: toggle (merged by default, supports showIndividual like bus layer) */
export async function toggleStationCoverageLayer(
    map: maplibregl.Map,
    currentlyVisible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    opts?: {
        defaultRadiusMeters?: number; // default 800
        showIndividual?: boolean;     // default false
        buffersColor?: string;        // default #2ecc71 (match bus)
        mergedColor?: string;         // default #8a2be2 (match bus)
        opacity?: number;             // default 0.35
        before?: string;              // insert before this layer id
    }
) {
    const nextVisible = !currentlyVisible;

    // Fast flip if already created
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

    moveCoverageBelowMask(map, [
        IDS.lyrBuffersFill, // lowest
        IDS.lyrMergedFill,
        IDS.lyrBuffersLine,
        IDS.lyrMergedLine,  // topmost coverage stroke
    ]);

    if (!nextVisible) {
        setVisible(false);
        return;
    }

    const defaultRadius = opts?.defaultRadiusMeters ?? 800;
    const buffersColor = opts?.buffersColor ?? "#4F200D";
    const mergedColor = opts?.mergedColor ?? "#FFE100";
    const opacity = opts?.opacity ?? 0.35;

    try {
        setIsLoading(true);

        // Data
        const stationsPts = await loadStationsAsPoints();
        const merged = buildMergedCoverage(stationsPts, defaultRadius);
        upsertGeoJsonSource(map, IDS.srcMerged, merged);
        if (opts?.showIndividual) {
            const indi = buildIndividualBuffers(stationsPts, defaultRadius);
            upsertGeoJsonSource(map, IDS.srcBuffers, indi);
        }

        // Layers
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
                paint: { "line-color": "#4F200D", "line-width": 1.5 },
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
                    paint: { "line-color": "#23995b", "line-width": 1.2 },
                },
                opts?.before
            );
        }

        map.once("idle", () => {
            setVisible(true);
            setIsLoading(false);
        });
    } catch (err) {
        console.error("[stationCoverageLayer] failed:", err);
        setIsLoading(false);
    }
}

/** Optional reset if you swap datasets dynamically */
export function resetStationCoverageCaches() {
    __stationsPointsCache = null;
    __indiBuffersCache = {};
    __mergedCache = {};
}