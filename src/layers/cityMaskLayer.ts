


// src/layers/cityMaskLayer.ts
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { featureCollection, union as turfUnion } from "@turf/turf";

let __kashiwaCache: FeatureCollection<Polygon | MultiPolygon> | null = null;
let __dimOpacityCurrent = 0.85;

const IDS = {
    srcCity: "kashiwa-boundary-src",
    srcMask: "kashiwa-world-mask-src",
    lyrMask: "kashiwa-world-mask-fill",          // very dark overlay outside Kashiwa
    lyrCityFill: "kashiwa-highlight-fill",       // soft tint inside Kashiwa
    lyrCityGlow: "kashiwa-highlight-glow",       // wide blurred line glow
    lyrCityLine: "kashiwa-highlight-line",       // crisp outline
} as const;

const KASHIWA_URL =
    (import.meta as any).env?.VITE_KASHIWA_BOUNDARY_URL ??
    "/data/boundary.geojson";

/** ---------- geometry helpers (hole mask; no boolean ops needed) ---------- */
function worldOuterRing(): [number, number][] {
    const w = -180, e = 180, s = -85, n = 85;
    return [[w, s], [w, n], [e, n], [e, s], [w, s]];
}
function ringSignedArea(r: [number, number][]) {
    let sum = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        sum += (xj * yi - xi * yj);
    }
    return sum / 2;
}
const ensureCCW = (r: [number, number][]) => (ringSignedArea(r) > 0 ? r : r.slice().reverse());
const ensureCW = (r: [number, number][]) => (ringSignedArea(r) < 0 ? r : r.slice().reverse());

async function loadKashiwa(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
    if (__kashiwaCache) return __kashiwaCache;
    const res = await fetch(KASHIWA_URL);
    if (!res.ok) throw new Error(`Failed to load Kashiwa boundary: ${res.status} ${res.statusText}`);
    __kashiwaCache = (await res.json()) as FeatureCollection<Polygon | MultiPolygon>;
    return __kashiwaCache;
}

function unionAllCity(features: Feature<(Polygon | MultiPolygon)>[]): Feature<Polygon | MultiPolygon> {
    let acc = features[0] as Feature<Polygon | MultiPolygon>;
    for (let i = 1; i < features.length; i++) {
        const u = turfUnion(acc as any, features[i] as any);
        if (u) acc = u as Feature<Polygon | MultiPolygon>;
    }
    return acc;
}

/** Build a single mask polygon with a HOLE over Kashiwa */
async function buildMask(): Promise<FeatureCollection<Polygon>> {
    const cityFC = await loadKashiwa();
    const cityFeatures = cityFC.features.filter(
        (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
    ) as Feature<(Polygon | MultiPolygon)>[];

    const worldRing = ensureCCW(worldOuterRing());
    if (cityFeatures.length === 0) {
        return featureCollection<Polygon>([{
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [worldRing] },
        }]);
    }

    const cityUnion = unionAllCity(cityFeatures);
    const holes: [number, number][][] = [];
    if (cityUnion.geometry.type === "Polygon") {
        holes.push(ensureCW(cityUnion.geometry.coordinates[0] as [number, number][]));
    } else {
        for (const poly of cityUnion.geometry.coordinates) {
            holes.push(ensureCW(poly[0] as [number, number][]));
        }
    }
    return featureCollection<Polygon>([{
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [worldRing, ...holes] },
    }]);
}

/** ---------------- layer helpers ---------------- */
function upsertSource(map: maplibregl.Map, id: string, data: any) {
    const s = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
    if (s) s.setData(data);
    else map.addSource(id, { type: "geojson", data });
}
function ensureLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification, beforeId?: string) {
    if (!map.getLayer(layer.id)) map.addLayer(layer, beforeId);
}
function setVisibility(map: maplibregl.Map, id: string, v: "visible" | "none") {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
}

/** Move app overlays above the mask so they remain visible */
function raiseOverlays(map: maplibregl.Map, ids: string[] = []) {
    // Put them above the crisp city line (top of our mask stack)
    const anchor = IDS.lyrCityLine;
    ids.forEach((id) => {
        if (map.getLayer(id)) map.moveLayer(id, anchor);
    });
}

/** ---------------- public toggle ---------------- */
export async function toggleCityMaskLayer(
    map: maplibregl.Map,
    currentlyVisible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    opts?: {
        dimColor?: string;          // very dark outside
        dimOpacity?: number;        // 0.85 default -> almost hides basemap
        highlightColor?: string;    // warm tint inside
        highlightOpacity?: number;  // 0.10–0.18 is nice
        outlineColor?: string;      // crisp boundary color
        overlaysToRaise?: string[]; // layer IDs you want above the mask
    }
) {
    const nextVisible = !currentlyVisible;

    if (!nextVisible) {
        setVisible(false);
        [IDS.lyrMask, IDS.lyrCityFill, IDS.lyrCityGlow, IDS.lyrCityLine].forEach((id) =>
            setVisibility(map, id, "none")
        );
        return;
    }

    setIsLoading(true);
    try {
        const [maskFC, cityFC] = await Promise.all([buildMask(), loadKashiwa()]);
        upsertSource(map, IDS.srcMask, maskFC);
        upsertSource(map, IDS.srcCity, cityFC);

        const dimColor = opts?.dimColor ?? "#808080"; // deep slate
        // If caller passes a value, adopt it; otherwise keep the last used.
        __dimOpacityCurrent = opts?.dimOpacity ?? __dimOpacityCurrent ?? 0.85;
        const dimOpacity = __dimOpacityCurrent;         // use the current value
        const highlightColor = opts?.highlightColor ?? "#fff3b0";
        const highlightOpacity = opts?.highlightOpacity ?? 0.14;
        const outlineColor = opts?.outlineColor ?? "#f59e0b"; // amber-500

        // IMPORTANT: append at TOP so it covers basemap & labels
        ensureLayer(map, {
            id: IDS.lyrMask,
            type: "fill",
            source: IDS.srcMask,
            paint: {
                "fill-color": dimColor,
                "fill-opacity": dimOpacity,
                "fill-antialias": true,
            },
        });

        // Soft highlight inside Kashiwa (below your overlays but above mask)
        ensureLayer(map, {
            id: IDS.lyrCityFill,
            type: "fill",
            source: IDS.srcCity,
            paint: {
                "fill-color": highlightColor,
                "fill-opacity": highlightOpacity,
            },
        });

        // Glow: wide blurred line under crisp outline
        ensureLayer(map, {
            id: IDS.lyrCityGlow,
            type: "line",
            source: IDS.srcCity,
            paint: {
                "line-color": outlineColor,
                "line-width": 12,
                "line-opacity": 0.25,
                "line-blur": 6,
            },
        });

        // Crisp outline
        ensureLayer(map, {
            id: IDS.lyrCityLine,
            type: "line",
            source: IDS.srcCity,
            paint: {
                "line-color": outlineColor,
                "line-width": 1.8,
                "line-opacity": 0.9,
            },
        });

        // Make all four visible
        [IDS.lyrMask, IDS.lyrCityFill, IDS.lyrCityGlow, IDS.lyrCityLine].forEach((id) =>
            setVisibility(map, id, "visible")
        );

        // Ensure YOUR overlays sit above this stack (so they aren't dimmed)
        raiseOverlays(map, opts?.overlaysToRaise ?? [
            // add/adjust to your app’s layer ids
            "bus-coverage-merged-fill",
            "bus-coverage-merged-line",
            "bus-coverage-stops-circle",
            // "rail-station-pax",
            // "rail-station",
            // "rail-jr-base",
            // "rail-jr-dash",
            // "rail-tx-base"

            // e.g. "od-grid-lines", "mesh-1km", "mesh-500m", "mesh-250m"
        ]);

        setVisible(true);
    } catch (e) {
        console.error("[cityMaskLayer] failed:", e);
    } finally {
        setIsLoading(false);
    }
}

/** Live-update the opacity of the outside dim layer (0..1). Safe to call anytime. */
export function setCityMaskOpacity(map: maplibregl.Map, opacity: number) {
    const v = Math.max(0, Math.min(1, Number(opacity) || 0));
    __dimOpacityCurrent = v;
    if (map.getLayer(IDS.lyrMask)) {
        map.setPaintProperty(IDS.lyrMask, "fill-opacity", v);
    }
}

/** (Optional) read the current mask opacity to initialize your slider */
export function getCityMaskOpacity(): number {
    return __dimOpacityCurrent;
}
