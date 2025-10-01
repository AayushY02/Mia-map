// import { blobUrl } from "@/lib/blobUrl";

// ==== Chome population label: auto-switch text by metric ===================
export type ChomePopMode = "total" | "k" | "l" | "2040_total" | "2040_k";

type Metric = "total" | "aging" | "density" | "total_2040" | "aging_2040";
const ALL_METRICS: Metric[] = ["total", "aging", "density", "total_2040", "aging_2040"];

/** UI mode -> property name in GeoJSON */
const PROP_BY_MODE: Record<ChomePopMode, string> = {
    total: "総数",
    k: "高齢化率",
    l: "人口密度（人/km²）",
    "2040_total": "total_2040",
    "2040_k": "aging_rate_2040",
};

const METRIC_PROP: Record<Metric, string> = {
    total: "総数",
    aging: "高齢化率",
    density: "人口密度（人/km²）",
    total_2040: "total_2040",
    aging_2040: "aging_rate_2040",
};

export function areChomeLabelsInMetricMode() {
    return __labelMode === "metric";
}

// NEW: apply metric text ONLY if label mode is 'metric'
export function applyChomeMetricIfInMetricMode(map: maplibregl.Map, metric: Metric) {
    if (__labelMode !== "metric") return; // respect "name" mode
    const modeForLabel = METRIC_TO_MODE[metric]; // uses your existing mapping
    setChomePopulationLabelMetric(map, modeForLabel);
}

/** Build a MapLibre expression for label text of a property. Adds % for rate props. */
// function buildChomeTextExpr(propName: string): any {
//     const isAging2020 = propName === "高齢化率";          // 0..1 ratio
//     const isAging2040 = propName === "aging_rate_2040";  // 0..100 percent
//     const isPercent = isAging2020 || isAging2040;

//     if (isPercent) {
//         // Show 1 decimal + % ; empty when null
//         // NOTE: scale 2020 ratio by 100; leave 2040 as-is
//         const valueExpr =
//             isAging2020
//                 ? ["*", ["to-number", ["get", propName]], 100]
//                 : ["to-number", ["get", propName]];

//         return [
//             "case",
//             ["==", ["coalesce", ["get", propName], null], null],
//             "",
//             [
//                 "concat",
//                 ["to-string", ["/", ["round", ["*", valueExpr, 10]], 10]],
//                 "%"
//             ]
//         ];
//     }

//     // numbers (総数 / 人口密度 / total_2040); empty when null
//     return [
//         "case",
//         ["==", ["coalesce", ["get", propName], null], null],
//         "",
//         ["to-string", ["get", propName]]
//     ];
// }


function buildChomeTextExpr(propName: string): any {
    const isAging2020 = propName === "高齢化率";          // 0..1 ratio
    const isAging2040 = propName === "aging_rate_2040";  // 0..100 percent
    const isPercent = isAging2020 || isAging2040;

    if (isPercent) {
        const valueExpr =
            isAging2020
                ? ["*", ["to-number", ["get", propName]], 100]
                : ["to-number", ["get", propName]];

        return [
            "case",
            ["==", ["coalesce", ["get", propName], null], null],
            "",
            [
                "concat",
                ["to-string", ["/", ["round", ["*", valueExpr, 10]], 10]],
                "%"
            ]
        ];
    }

    // NEW: density branch — convert km² → ha, round to 2 decimals, append unit
    const isDensityKm2 = propName === "人口密度（人/km²）";
    if (isDensityKm2) {
        const perHa = ["/", ["to-number", ["get", propName]], 100];              // km² → ha
        const perHa2 = ["/", ["round", ["*", perHa, 100]], 100];                 // 2 decimals
        return [
            "case",
            ["==", ["coalesce", ["get", propName], null], null],
            "",
            ["concat", ["to-string", perHa2], ""]
        ];
    }

    // numbers (総数 / total_2040); empty when null
    return [
        "case",
        ["==", ["coalesce", ["get", propName], null], null],
        "",
        ["to-string", ["get", propName]]
    ];
}

/** Public: set the chome label to show the requested metric. Safe to call anytime. */
export function setChomePopulationLabelMetric(
    map: maplibregl.Map,
    mode: ChomePopMode
) {
    // Prefer your exported id; fall back to a legacy id if present.
    const labelId =
        map.getLayer(KASHIWA_CHOME_LABELS) ? KASHIWA_CHOME_LABELS :
            (map.getLayer("kashiwa-chome-pop-label") ? "kashiwa-chome-pop-label" : null);

    if (!labelId) return;

    const prop = PROP_BY_MODE[mode];
    if (!prop) return;

    try {
        map.setLayoutProperty(labelId, "text-field", buildChomeTextExpr(prop));
        __labelMode = "metric";
        __currentLabelMetric = MODE_TO_METRIC[mode];
    } catch (e) {
        console.warn("[kashiwaChomePopulationLayer] failed to set label text-field:", e);
    }
}

// --- keep runtime state for label behavior & style ---
let __labelMode: "name" | "metric" = "name";
let __currentLabelMetric: Metric = "total";

// NEW: persist per-metric base opacity & active range so updates remain consistent
const __opacityByMetric: Partial<Record<Metric, number>> = {};
const __rangeByMetric: Partial<Record<Metric, { min?: number | null; max?: number | null }>> = {};

const MODE_TO_METRIC: Record<ChomePopMode, Metric> = {
    total: "total",
    k: "aging",
    l: "density",
    "2040_total": "total_2040",
    "2040_k": "aging_2040",
};
const METRIC_TO_MODE: Record<Metric, ChomePopMode> = {
    total: "total",
    aging: "k",
    density: "l",
    total_2040: "2040_total",
    aging_2040: "2040_k",
};

function metricFillId(metric: Metric) {
    return metric === "total"
        ? KASHIWA_CHOME_TOTAL_FILL
        : metric === "aging"
            ? KASHIWA_CHOME_AGING_FILL
            : metric === "density"
                ? KASHIWA_CHOME_DENSITY_FILL
                : metric === "total_2040"
                    ? KASHIWA_CHOME_TOTAL_2040_FILL
                    : KASHIWA_CHOME_AGING_2040_FILL;
}
function metricLineId(metric: Metric) {
    return metric === "total"
        ? KASHIWA_CHOME_TOTAL_OUTLINE
        : metric === "aging"
            ? KASHIWA_CHOME_AGING_OUTLINE
            : metric === "density"
                ? KASHIWA_CHOME_DENSITY_OUTLINE
                : metric === "total_2040"
                    ? KASHIWA_CHOME_TOTAL_2040_OUTLINE
                    : KASHIWA_CHOME_AGING_2040_OUTLINE;
}

function isLayerVisible(map: maplibregl.Map, id: string): boolean {
    return !!map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none";
}
function isMetricVisible(map: maplibregl.Map, metric: Metric): boolean {
    return isLayerVisible(map, metricFillId(metric));
}
function pickVisibleMetric(map: maplibregl.Map, preferred?: Metric): Metric | null {
    const order: Metric[] = ["total", "aging", "density", "total_2040", "aging_2040"];
    if (preferred && isMetricVisible(map, preferred)) return preferred;
    for (const m of order) if (isMetricVisible(map, m)) return m;
    return null;
}

/** Ensure labels (in metric mode) show a metric that is currently visible,
 *  otherwise hide the labels to avoid "orphan" label values. */
export function syncChomeLabelsWithVisibleLayers(map: maplibregl.Map) {
    if (!map.getLayer(KASHIWA_CHOME_LABELS)) return;
    const labelsAreVisible = map.getLayoutProperty(KASHIWA_CHOME_LABELS, "visibility") !== "none";
    if (!labelsAreVisible) return;
    if (__labelMode === "name") return; // names are independent of fills

    // We are in metric mode:
    const chosen = pickVisibleMetric(map, __currentLabelMetric);
    if (!chosen) {
        // No metric layers visible => hide labels to prevent dangling values
        map.setLayoutProperty(KASHIWA_CHOME_LABELS, "visibility", "none");
        return;
    }
    __currentLabelMetric = chosen;
    const mode = METRIC_TO_MODE[chosen];
    map.setLayoutProperty(
        KASHIWA_CHOME_LABELS,
        "text-field",
        buildChomeTextExpr(PROP_BY_MODE[mode]) as any
    );
}

/* -------------------- IDs & data -------------------- */
export const KASHIWA_CHOME_SOURCE_ID = "kashiwa-chome-pop";
export const KASHIWA_CHOME_TOTAL_FILL = "kashiwa-chome-total-fill";
export const KASHIWA_CHOME_TOTAL_OUTLINE = "kashiwa-chome-total-outline";
export const KASHIWA_CHOME_AGING_FILL = "kashiwa-chome-aging-fill";
export const KASHIWA_CHOME_AGING_OUTLINE = "kashiwa-chome-aging-outline";
export const KASHIWA_CHOME_DENSITY_FILL = "kashiwa-chome-density-fill";
export const KASHIWA_CHOME_DENSITY_OUTLINE = "kashiwa-chome-density-outline";
export const KASHIWA_CHOME_LABELS = "kashiwa-chome-labels";

export const KASHIWA_CHOME_TOTAL_2040_FILL = "kashiwa-chome-total-2040-fill";
export const KASHIWA_CHOME_TOTAL_2040_OUTLINE = "kashiwa-chome-total-2040-outline";
export const KASHIWA_CHOME_AGING_2040_FILL = "kashiwa-chome-aging-2040-fill";
export const KASHIWA_CHOME_AGING_2040_OUTLINE = "kashiwa-chome-aging-2040-outline";

// const DATA_URL = blobUrl("kashiwa_population_with_estimate.geojson");
const DATA_URL = "/data/kashiwa_population_with_estimates_updated.geojson";

type PaletteName = "Blues" | "Greens" | "Oranges" | "Purples" | "OrangeRed";
const PALETTES: Record<PaletteName, string[]> = {
    Blues: ["#f1eef6", "#bdc9e1", "#74a9cf", "#2b8cbe", "#045a8d"],
    Greens: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
    Oranges: ["#fff5eb", "#fdd0a2", "#f16913", "#d94801", "#7f2704"],
    Purples: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
    OrangeRed: ["#fee8c8", "#fdbb84", "#fc8d59", "#e34a33", "#b30000"],
};

/* -------------------- cached data -------------------- */
// Don’t rely on private source._data — keep our own cache.
let CACHED_DATA: GeoJSON.FeatureCollection | null = null;

/* -------------------- utilities -------------------- */
function isAging(metric: Metric) {
    return metric === "aging" || metric === "aging_2040";
}

function defaultAnchorsFor(metric: Metric): number[] {
    // sensible defaults if you haven’t computed breaks yet
    if (isAging(metric)) return [0.10, 0.20, 0.30, 0.40]; // for 0-1 ratios
    // counts/density – safely low to high (tweak as needed)
    return [1000, 5000, 10000, 20000];
}

function samplePalette(base: string[], bins: number): string[] {
    // Resample a 5-color base palette to exactly `bins` colors.
    if (bins <= 0) return [];
    if (bins === base.length) return base.slice();
    const out: string[] = [];
    for (let i = 0; i < bins; i++) {
        const t = bins === 1 ? 0 : i / (bins - 1);
        const idx = Math.round(t * (base.length - 1));
        out.push(base[idx]);
    }
    return out;
}

/* -------------------- mesh cleanup -------------------- */
function removeAllMeshes(map: maplibregl.Map) {
    const L = [
        "mesh-1km-fill", "mesh-1km-outline", "1km-mesh-fill", "1km-mesh-line", "grid-1km",
        "mesh-500m-fill", "mesh-500m-outline", "grid-500m",
        "mesh-250m-fill", "mesh-250m-outline", "grid-250m",
        "mesh-100m-fill", "mesh-100m-outline", "grid-100m",
        "population-mesh-fill", "population-mesh-line",
    ];
    const S = [
        "mesh1km", "1km-mesh", "grid-1km",
        "mesh500m", "grid-500m",
        "mesh250m", "grid-250m",
        "mesh100m", "grid-100m",
        "population-mesh", "kashiwa-mesh-100m",
    ];
    L.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });

    const style = map.getStyle?.();
    if (style?.layers?.length) {
        const pat = [/mesh(?:\b|[-_])/i, /\bgrid\b/i, /\b1\s*km\b/i, /\b1000m\b/i, /\b500m\b/i, /\b250m\b/i, /\b100m\b/i];
        for (const lyr of style.layers) {
            const id = lyr.id;
            const src = (lyr as any).source as string | undefined;
            // Be a bit stricter to avoid nuking unrelated things
            if (pat.some((rx) => rx.test(id)) || (src && pat.some((rx) => rx.test(src)))) {
                try { if (map.getLayer(id)) map.removeLayer(id); } catch { }
            }
        }
    }

    S.forEach((sid) => {
        if (!map.getSource(sid)) return;
        const stillUsed = (map.getStyle()?.layers ?? []).some((l) => (l as any).source === sid);
        if (!stillUsed) map.removeSource(sid);
    });
}

/* -------------------- source & base layers -------------------- */
async function ensureSource(map: maplibregl.Map) {
    // If we already have the source and cached data, we’re good
    const hasSource = !!map.getSource(KASHIWA_CHOME_SOURCE_ID);
    if (!CACHED_DATA) {
        const resp = await fetch(DATA_URL);
        const raw: GeoJSON.FeatureCollection = await resp.json();
        // normalize numerics (handles "1,234" strings etc.)
        CACHED_DATA = {
            ...raw,
            features: raw.features.map((f: any) => {
                const p = { ...(f.properties ?? {}) };
                const fix = (k: string) => {
                    if (p[k] == null) return;
                    if (typeof p[k] === "number") return;
                    if (typeof p[k] === "string") {
                        const s = p[k].replace?.(/,/g, "");
                        const n = Number(s);
                        if (!Number.isNaN(n)) p[k] = n;
                    }
                };
                fix("総数");
                fix("人口密度（人/km²）");
                fix("高齢化率");
                fix("total_2040");
                fix("aging_rate_2040");
                return { ...f, properties: p };
            }),
        };
    }

    if (!hasSource) {
        map.addSource(KASHIWA_CHOME_SOURCE_ID, {
            type: "geojson",
            data: CACHED_DATA,
            promoteId: "KEYCODE2",
        } as any);
    } else {
        (map.getSource(KASHIWA_CHOME_SOURCE_ID) as maplibregl.GeoJSONSource).setData(CACHED_DATA);
    }
}

function buildStep(prop: string, breaks: number[], colors: string[]): any[] {
    // colors.length = bins; breaks.length = bins - 1
    const bins = colors.length;
    const neededStops = Math.max(0, bins - 1);
    const usedBreaks = breaks.slice(0, neededStops);
    const expr: any[] = ["step", ["to-number", ["get", prop]], colors[0]];
    for (let i = 0; i < usedBreaks.length; i++) expr.push(usedBreaks[i], colors[i + 1]);
    return expr;
}

function getValues(metric: Metric): number[] {
    if (!CACHED_DATA) return [];
    const prop = METRIC_PROP[metric];
    const vals: number[] = [];
    for (const f of CACHED_DATA.features as any[]) {
        const v = Number(f?.properties?.[prop]);
        if (!Number.isNaN(v)) vals.push(v);
    }
    return vals.sort((a, b) => a - b);
}

function quantileBreaks(values: number[], bins = 5): number[] {
    if (!values.length) return defaultAnchorsFor("total");
    const br: number[] = [];
    for (let i = 1; i < bins; i++) br.push(values[Math.floor((i / bins) * (values.length - 1))]);
    return br;
}
function equalBreaks(values: number[], bins = 5): number[] {
    if (!values.length) return defaultAnchorsFor("total");
    const min = values[0], max = values[values.length - 1];
    const step = (max - min) / bins;
    const br: number[] = [];
    for (let i = 1; i < bins; i++) br.push(Number((min + step * i).toFixed(6)));
    return br;
}
function jenksBreaks(values: number[], bins = 5): number[] {
    if (values.length < bins) return quantileBreaks(values, bins);
    const mat1 = Array(values.length + 1).fill(0).map(() => Array(bins + 1).fill(0));
    const mat2 = Array(values.length + 1).fill(0).map(() => Array(bins + 1).fill(0));
    for (let i = 1; i <= bins; i++) { mat1[0][i] = 1; mat2[0][i] = 0; for (let j = 1; j <= values.length; j++) mat2[j][i] = Infinity; }
    for (let l = 2; l <= values.length; l++) {
        let s1 = 0, s2 = 0, w = 0;
        for (let m = 1; m <= l; m++) {
            const i3 = l - m + 1; const val = values[i3 - 1];
            s2 += val * val; s1 += val; w++;
            const v = s2 - (s1 * s1) / w;
            if (i3 !== 1) for (let j = 2; j <= bins; j++) if (mat2[l][j] >= (v + mat2[i3 - 1][j - 1])) { mat1[l][j] = i3; mat2[l][j] = v + mat2[i3 - 1][j - 1]; }
        }
        mat1[l][1] = 1; mat2[l][1] = s2 - (s1 * s1) / w;
    }
    const kclass = Array(bins).fill(0); let k = values.length;
    for (let j = bins; j >= 2; j--) { const id = mat1[k][j] - 1; kclass[j - 2] = values[id]; k = mat1[k][j] - 1; }
    return kclass;
}

// Build a reusable opacity expression that also gates by range (if provided)
function buildOpacityExpr(baseOpacity: number, prop?: string, range?: { min?: number | null; max?: number | null }) {
    const hoverOpacity = Math.min(1, baseOpacity + 0.2);
    const conds: any[] = [];
    if (prop && range) {
        if (range.min != null) conds.push([">=", ["get", prop], range.min]);
        if (range.max != null) conds.push(["<=", ["get", prop], range.max]);
    }
    const visibleCond = conds.length ? (["all", ...conds] as any) : ["literal", true];

    // If hover -> higher opacity; else if in range -> base; else -> 0 (hidden)
    return ["case",
        ["boolean", ["feature-state", "hover"], false], hoverOpacity,
        visibleCond, baseOpacity,
        0
    ];
}

function defaultPaint(metric: Metric, palette: PaletteName): { [key: string]: any } {
    const prop = METRIC_PROP[metric];
    const values = getValues(metric);
    const bins = 5;
    const colors = samplePalette(PALETTES[palette], bins);
    const breaks = values.length ? quantileBreaks(values, bins) : defaultAnchorsFor(metric);
    const baseOpacity = __opacityByMetric[metric] ?? 0.7;
    const range = __rangeByMetric[metric];

    return {
        "fill-color": buildStep(prop, breaks, colors) as any,
        "fill-opacity": buildOpacityExpr(baseOpacity, prop, range),
    };
}

function addBaseLayers(map: maplibregl.Map) {
    const addFillLine = (
        metric: Metric,
        paint: { [key: string]: any },
        hidden = false
    ) => {
        const fillId = metricFillId(metric);
        const lineId = metricLineId(metric);

        if (!map.getLayer(fillId)) {
            const fillSpec: any = { id: fillId, type: "fill", source: KASHIWA_CHOME_SOURCE_ID, paint };
            if (hidden) fillSpec.layout = { visibility: "none" };
            map.addLayer(fillSpec);
        }
        if (!map.getLayer(lineId)) {
            const lineSpec: any = {
                id: lineId,
                type: "line",
                source: KASHIWA_CHOME_SOURCE_ID,
                paint: { "line-color": "#555", "line-width": 0.6, "line-opacity": 0.8 },
            };
            if (hidden) lineSpec.layout = { visibility: "none" };
            map.addLayer(lineSpec);
        }
    };

    addFillLine("total", defaultPaint("total", "Purples"), true);
    addFillLine("aging", defaultPaint("aging", "Greens"), true);
    addFillLine("density", defaultPaint("density", "Oranges"), true);
    addFillLine("total_2040", defaultPaint("total_2040", "Blues"), true);
    // FIX: aging_2040 uses aging anchors
    addFillLine("aging_2040", defaultPaint("aging_2040", "OrangeRed"), true);

    enforceLayerOrder(map);
}

/* -------------------- interactions & labels -------------------- */
const boundMaps = new WeakSet<maplibregl.Map>();
function bindInteractions(map: maplibregl.Map, popup?: maplibregl.Popup) {
    if (!popup || boundMaps.has(map)) return;
    boundMaps.add(map);

    const ids = ALL_METRICS.map(metricFillId);

    let hoveredId: string | number | null = null;
    let raf = 0;
    const ensurePopup = () => { try { popup.addTo(map); } catch { } };

    ids.forEach((id) => {
        // If layer is added later, Mapbox will throw; guard it
        if (!map.getLayer(id)) return;

        map.on("mousemove", id, (e) => {
            if (!e.features?.length) return;
            const f = e.features[0] as any;
            if (hoveredId !== null) map.setFeatureState({ source: KASHIWA_CHOME_SOURCE_ID, id: hoveredId }, { hover: false });
            hoveredId = f.id ?? f.properties?.KEYCODE2;
            if (hoveredId !== null) map.setFeatureState({ source: KASHIWA_CHOME_SOURCE_ID, id: hoveredId }, { hover: true });
            map.getCanvas().style.cursor = "pointer";

            const p = f.properties || {};
            const name = p["町丁字名"] ?? p["S_NAME"] ?? "N/A";
            const total = p["総数"] ?? "N/A";
            const aging = p["高齢化率"];
            const agingPct = (aging != null) ? `${(Number(aging) * 100).toFixed(1)}%` : "N/A";
            const densityKm2 = p["人口密度（人/km²）"];
            const densityHa = densityKm2 != null ? Number(densityKm2) / 100 : null;
            const densityHaText = densityHa != null && isFinite(densityHa) ? densityHa.toFixed(2) : "N/A";
            const total_2040 = p["total_2040"];
            const aging_2040 = p["aging_rate_2040"] != null ? `${(Number(p["aging_rate_2040"]) * 100).toFixed(1)}%` : "N/A";

            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                ensurePopup();
                popup
                    .setLngLat(e.lngLat)
                    .setHTML(`
            <div class="rounded-xl border bg-white p-3 shadow-xl space-y-1 w-64 text-xs">
              <div class="font-semibold">${name}</div>
              <div><strong>総数:</strong> ${total}</div>
              <div><strong>高齢化率:</strong> ${agingPct}</div>
              <div><strong>人口密度:</strong> ${densityHaText ?? "N/A"} 人/km²</div>
              <div><strong>2040年_総数:</strong> ${total_2040 ?? "N/A"}</div>
              <div><strong>2040年_高齢化率:</strong> ${aging_2040}</div>
            </div>
          `);
            });
        });

        map.on("mouseleave", id, () => {
            if (hoveredId !== null) map.setFeatureState({ source: KASHIWA_CHOME_SOURCE_ID, id: hoveredId }, { hover: false });
            hoveredId = null;
            map.getCanvas().style.cursor = "";
            popup?.remove();
        });
    });
}

function ensureLabels(map: maplibregl.Map) {
    if (map.getLayer(KASHIWA_CHOME_LABELS)) return;
    map.addLayer({
        id: KASHIWA_CHOME_LABELS,
        type: "symbol",
        source: KASHIWA_CHOME_SOURCE_ID,
        layout: {
            "text-field": buildChomeTextExpr(PROP_BY_MODE["total"]),
            "text-size": 11,
            "text-allow-overlap": false,
            "text-padding": 2,
            "visibility": "none",
        },
        paint: { "text-color": "#111", "text-halo-color": "rgba(255,255,255,.9)", "text-halo-width": 1.2 },
    });
}

/* -------------------- ordering & visibility -------------------- */
function enforceLayerOrder(map: maplibregl.Map) {
    const order = [
        // bottom -> top
        KASHIWA_CHOME_TOTAL_FILL,
        KASHIWA_CHOME_AGING_FILL,
        KASHIWA_CHOME_DENSITY_FILL,
        KASHIWA_CHOME_TOTAL_2040_FILL,
        KASHIWA_CHOME_AGING_2040_FILL,
        KASHIWA_CHOME_TOTAL_OUTLINE,
        KASHIWA_CHOME_AGING_OUTLINE,
        KASHIWA_CHOME_DENSITY_OUTLINE,
        KASHIWA_CHOME_TOTAL_2040_OUTLINE,
        KASHIWA_CHOME_AGING_2040_OUTLINE,
        KASHIWA_CHOME_LABELS,
    ].filter((id) => map.getLayer(id));

    // Place top-down for a stable stack
    let before: string | undefined = undefined;
    for (let i = order.length - 1; i >= 0; i--) {
        const id = order[i];
        try { map.moveLayer(id, before); } catch { }
        before = id;
    }
}

function setMetricVisibility(map: maplibregl.Map, metric: Metric, visible: boolean) {
    const ids = { fill: metricFillId(metric), line: metricLineId(metric) };
    const v = visible ? "visible" : "none";
    if (map.getLayer(ids.fill)) map.setLayoutProperty(ids.fill, "visibility", v);
    if (map.getLayer(ids.line)) map.setLayoutProperty(ids.line, "visibility", v);
}

function sanitizeManualBreaks(metric: Metric, raw?: number[]): number[] {
    if (!raw || !raw.length) return [];
    const cleaned = raw
        .filter((n) => typeof n === "number" && isFinite(n))
        .sort((a, b) => a - b);

    // NOTE: 2020 aging ratio column is 0..1. If users typed percentages (e.g., 20, 30),
    // convert only for the 2020 metric. 2040 column appears to be already % in data.
    if (metric === "aging") {
        return cleaned.map((v) => (v > 1 ? v / 100 : v));
    }
    return cleaned;
}

/* -------------------- public togglers (independent stacking) -------------------- */
function clearLoadingSoon(map: maplibregl.Map, setIsLoading: (b: boolean) => void) {
    const done = () => setIsLoading(false);
    let cleared = false;
    map.once("idle", () => { if (!cleared) { cleared = true; done(); } });
    // Fallback: ensure spinner clears even if idle timing is quirky
    setTimeout(() => { if (!cleared) { cleared = true; done(); } }, 120);
}

export async function toggleKashiwaChomeTotalLayer(
    map: maplibregl.Map,
    visible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    popup?: maplibregl.Popup
) {
    try {
        setIsLoading(true);
        if (!visible) {
            removeAllMeshes(map);
            await ensureSource(map);
            addBaseLayers(map);
            bindInteractions(map, popup);
            setMetricVisibility(map, "total", true);
            applyChomeMetricIfInMetricMode(map, "total");
            syncChomeLabelsWithVisibleLayers(map);
            enforceLayerOrder(map);
            setVisible(true);
        } else {
            setMetricVisibility(map, "total", false);
            setVisible(false);
            syncChomeLabelsWithVisibleLayers(map);
        }
    } finally { clearLoadingSoon(map, setIsLoading); }
}

export async function toggleKashiwaChomeAgingLayer(
    map: maplibregl.Map,
    visible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    popup?: maplibregl.Popup
) {
    try {
        setIsLoading(true);
        if (!visible) {
            removeAllMeshes(map);
            await ensureSource(map);
            addBaseLayers(map);
            bindInteractions(map, popup);
            setMetricVisibility(map, "aging", true);
            applyChomeMetricIfInMetricMode(map, "aging");
            syncChomeLabelsWithVisibleLayers(map);
            enforceLayerOrder(map);
            setVisible(true);
        } else {
            setMetricVisibility(map, "aging", false);
            setVisible(false);
            syncChomeLabelsWithVisibleLayers(map);
        }
    } finally { clearLoadingSoon(map, setIsLoading); }
}

export async function toggleKashiwaChomeDensityLayer(
    map: maplibregl.Map,
    visible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    popup?: maplibregl.Popup
) {
    try {
        setIsLoading(true);
        if (!visible) {
            removeAllMeshes(map);
            await ensureSource(map);
            addBaseLayers(map);
            bindInteractions(map, popup);
            setMetricVisibility(map, "density", true);
            applyChomeMetricIfInMetricMode(map, "density");
            syncChomeLabelsWithVisibleLayers(map);
            enforceLayerOrder(map);
            setVisible(true);
        } else {
            setMetricVisibility(map, "density", false);
            setVisible(false);
            syncChomeLabelsWithVisibleLayers(map);
        }
    } finally { clearLoadingSoon(map, setIsLoading); }
}

export async function toggleKashiwaChomeTotal2040Layer(
    map: maplibregl.Map,
    visible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    popup?: maplibregl.Popup
) {
    try {
        setIsLoading(true);
        if (!visible) {
            removeAllMeshes(map);
            await ensureSource(map);
            addBaseLayers(map);
            bindInteractions(map, popup);
            setMetricVisibility(map, "total_2040", true);
            applyChomeMetricIfInMetricMode(map, "total_2040");
            syncChomeLabelsWithVisibleLayers(map);
            enforceLayerOrder(map);
            setVisible(true);
        } else {
            setMetricVisibility(map, "total_2040", false);
            setVisible(false);
            syncChomeLabelsWithVisibleLayers(map);
        }
    } finally { clearLoadingSoon(map, setIsLoading); }
}

export async function toggleKashiwaChomeAging2040Layer(
    map: maplibregl.Map,
    visible: boolean,
    setIsLoading: (b: boolean) => void,
    setVisible: (b: boolean) => void,
    popup?: maplibregl.Popup
) {
    try {
        setIsLoading(true);
        if (!visible) {
            removeAllMeshes(map);
            await ensureSource(map);
            addBaseLayers(map);
            bindInteractions(map, popup);
            setMetricVisibility(map, "aging_2040", true);
            applyChomeMetricIfInMetricMode(map, "aging_2040");
            syncChomeLabelsWithVisibleLayers(map);
            enforceLayerOrder(map);
            setVisible(true);
        } else {
            setMetricVisibility(map, "aging_2040", false);
            setVisible(false);
            syncChomeLabelsWithVisibleLayers(map);
        }
    } finally { clearLoadingSoon(map, setIsLoading); }
}

/* -------------------- public styling APIs (for your React legend UI) -------------------- */
type Method = "quantile" | "equal" | "jenks" | "manual";

/** Update the choropleth palette / method / bin count / opacity for a metric. */
// export function updateKashiwaChomeStyle(
//     map: maplibregl.Map,
//     metric: Metric,
//     opts: { palette?: PaletteName; method?: Method; bins?: number; opacity?: number }
// ) {
//     // Ensure the layer exists (otherwise early out silently)
//     const fillId =
//         metric === "total" ? KASHIWA_CHOME_TOTAL_FILL :
//             metric === "aging" ? KASHIWA_CHOME_AGING_FILL :
//                 metric === "density" ? KASHIWA_CHOME_DENSITY_FILL :
//                     metric === "total_2040" ? KASHIWA_CHOME_TOTAL_2040_FILL :
//                         KASHIWA_CHOME_AGING_2040_FILL;

//     if (!map.getLayer(fillId)) return; // nothing to update yet

//     const palette: PaletteName =
//         opts.palette ??
//         (metric === "aging" || metric === "aging_2040" ? "Greens" :
//             metric === "density" ? "Oranges" :
//                 metric === "total_2040" ? "Blues" : "Purples");

//     const method = opts.method ?? "quantile";
//     const bins = Math.max(3, Math.min(7, opts.bins ?? 5));
//     const opacity = Math.max(0, Math.min(1, opts.opacity ?? 0.7));

//     const values = getValues(metric);
//     const breaks =
//         values.length === 0 ? defaultAnchorsFor(metric) :
//             method === "equal" ? equalBreaks(values, bins) :
//                 method === "jenks" ? jenksBreaks(values, bins) :
//                     quantileBreaks(values, bins);

//     const prop = METRIC_PROP[metric];
//     const colors = samplePalette(PALETTES[palette], bins);

//     map.setPaintProperty(fillId, "fill-color", buildStep(prop, breaks, colors) as any);
//     map.setPaintProperty(fillId, "fill-opacity", [
//         "case",
//         ["boolean", ["feature-state", "hover"], false],
//         Math.min(1, opacity + 0.2),
//         opacity,
//     ]);
// }

export function updateKashiwaChomeStyle(
    map: maplibregl.Map,
    metric: Metric,
    //          ⬇⬇⬇ add `breaks?: number[]` and allow "manual"
    opts: { palette?: PaletteName; method?: Method; bins?: number; breaks?: number[]; opacity?: number }
) {
    // Ensure the layer exists (otherwise early out silently)
    const fillId =
        metric === "total" ? KASHIWA_CHOME_TOTAL_FILL :
            metric === "aging" ? KASHIWA_CHOME_AGING_FILL :
                metric === "density" ? KASHIWA_CHOME_DENSITY_FILL :
                    metric === "total_2040" ? KASHIWA_CHOME_TOTAL_2040_FILL :
                        KASHIWA_CHOME_AGING_2040_FILL;

    if (!map.getLayer(fillId)) return;

    const palette: PaletteName =
        opts.palette ??
        (metric === "aging" || metric === "aging_2040" ? "Greens"
            : metric === "density" ? "Oranges"
                : metric === "total_2040" ? "Blues"
                    : "Purples");

    const method: Method = opts.method ?? "quantile";

    // Manual breaks (if provided)
    const userBreaks = method === "manual"
        ? sanitizeManualBreaks(metric, opts.breaks)
        : [];

    const userBreaksDataScale =
        method === "manual"
            ? (metric === "density" ? userBreaks.map((b) => b * 100) : userBreaks)
            : [];

    // Bins: if manual, derive from breaks; else use slider value (3..7)
    const bins =
        method === "manual" && userBreaks.length >= 1
            ? Math.max(2, Math.min(7, userBreaks.length + 1))
            : Math.max(3, Math.min(7, opts.bins ?? 5));

    const opacity = Math.max(0, Math.min(1, opts.opacity ?? 0.7));
    const colors = samplePalette(PALETTES[palette], bins);

    const values = getValues(metric);
    const prop = METRIC_PROP[metric];

    const breaks =
        method === "manual" && userBreaksDataScale.length
            ? userBreaksDataScale
            : (values.length === 0 ? defaultAnchorsFor(metric)
                : method === "equal" ? equalBreaks(values, bins)
                    : method === "jenks" ? jenksBreaks(values, bins)
                        : quantileBreaks(values, bins));

    // Apply step + opacity
    map.setPaintProperty(fillId, "fill-color", buildStep(prop, breaks, colors) as any);
    map.setPaintProperty(fillId, "fill-opacity", buildOpacityExpr(opacity, prop, __rangeByMetric[metric]));

    // Triggers legend refresh listeners
    map.triggerRepaint();
}

/** NEW: Set overall opacity for visible metric layers (or a specific metric). */
export function setKashiwaChomeOpacity(
    map: maplibregl.Map,
    opacity: number,
    metric?: Metric | "visible"
) {
    const clamped = Math.max(0, Math.min(1, opacity));
    const apply = (m: Metric) => {
        __opacityByMetric[m] = clamped;
        const fillId = metricFillId(m);
        if (!map.getLayer(fillId)) return;
        const prop = METRIC_PROP[m];
        const range = __rangeByMetric[m];
        map.setPaintProperty(fillId, "fill-opacity", buildOpacityExpr(clamped, prop, range));
    };

    if (!metric || metric === "visible") {
        ALL_METRICS.forEach((m) => { if (isMetricVisible(map, m)) apply(m); });
    } else {
        apply(metric);
    }
}

/** Optional: filter to a visible numeric range for any metric (percent or ratio ok for aging). */
export function setKashiwaChomeRangeFilter(
    map: maplibregl.Map,
    metric: Metric,
    min: number | null,
    max: number | null
) {
    const prop = METRIC_PROP[metric];

    // Normalize: if aging (0..1 in the data) and the UI passed percents (>1), convert to ratio.
    // const toDataSpace = (v: number | null) => {
    //     if (v == null) return null;
    //     if (metric === "aging") return v > 1 ? v / 100 : v;          // % → ratio
    //     // aging_2040 is already [0..100]; keep as-is
    //     return v;
    // };

    const toDataSpace = (v: number | null) => {
        if (v == null) return null;
        if (metric === "aging") return v > 1 ? v / 100 : v;   // % → ratio
        if (metric === "density") return v * 100;             // per-ha UI → per-km² data
        // aging_2040 is [0..100]; keep as-is
        return v;
    };

    const minN = toDataSpace(min);
    const maxN = toDataSpace(max);

    const conds: any[] = [];
    if (minN != null) conds.push([">=", ["to-number", ["get", prop]], minN]);
    if (maxN != null) conds.push(["<=", ["to-number", ["get", prop]], maxN]);

    const filter = conds.length ? ["all", ...conds] : null;

    const ids =
        metric === "total"
            ? [KASHIWA_CHOME_TOTAL_FILL, KASHIWA_CHOME_TOTAL_OUTLINE]
            : metric === "aging"
                ? [KASHIWA_CHOME_AGING_FILL, KASHIWA_CHOME_AGING_OUTLINE]
                : metric === "total_2040"
                    ? [KASHIWA_CHOME_TOTAL_2040_FILL, KASHIWA_CHOME_TOTAL_2040_OUTLINE]
                    : metric === "aging_2040"
                        ? [KASHIWA_CHOME_AGING_2040_FILL, KASHIWA_CHOME_AGING_2040_OUTLINE]
                        : [KASHIWA_CHOME_DENSITY_FILL, KASHIWA_CHOME_DENSITY_OUTLINE];

    ids.forEach((id) => { if (map.getLayer(id)) map.setFilter(id, filter as any); });
}
/** Toggle labels (町丁字名 or the metric value). */
export function setKashiwaChomeLabelsVisible(
    map: maplibregl.Map,
    visible: boolean,
    mode: "name" | "metric" = "name",
    metric: Metric = "total"
) {
    ensureLabels(map);
    if (!map.getLayer(KASHIWA_CHOME_LABELS)) return;

    if (mode === "name") {
        __labelMode = "name";
        map.setLayoutProperty(KASHIWA_CHOME_LABELS, "text-field",
            [
                "coalesce",
                ["get", "町丁字名"],
                ["get", "大字町丁目名"],
                ["get", "小地域名"],
                ["get", "S_NAME"],
                ["get", "NAME_JA"],
                ["get", "NAME"],
                ""
            ] as any);
    } else {
        __labelMode = "metric";
        // If selected metric layer is off, pick another visible one; else hide labels.
        const chosen = pickVisibleMetric(map, metric);
        if (!chosen) {
            map.setLayoutProperty(KASHIWA_CHOME_LABELS, "visibility", "none");
            return;
        }
        __currentLabelMetric = chosen;
        const modeForLabel = METRIC_TO_MODE[chosen];
        map.setLayoutProperty(
            KASHIWA_CHOME_LABELS,
            "text-field",
            buildChomeTextExpr(PROP_BY_MODE[modeForLabel]) as any
        );
    }
    map.setLayoutProperty(KASHIWA_CHOME_LABELS, "visibility", visible ? "visible" : "none");
    enforceLayerOrder(map);
}

/** NEW: drive your “pin” slider – scales the metric label text size. */
export function setKashiwaChomeLabelSize(map: maplibregl.Map, size: number) {
    ensureLabels(map);
    if (!map.getLayer(KASHIWA_CHOME_LABELS)) return;
    const clamped = Math.max(8, Math.min(24, size)); // sane bounds
    map.setLayoutProperty(KASHIWA_CHOME_LABELS, "text-size", clamped);
}

/* -------------------- palettes & base layer bootstrap -------------------- */
export function bootstrapKashiwaChomeLayers(
    map: maplibregl.Map,
    popup?: maplibregl.Popup
) {
    // helper you can call once on map load if you want
    (async () => {
        await ensureSource(map);
        addBaseLayers(map);
        bindInteractions(map, popup);
        enforceLayerOrder(map);
    })();
}
