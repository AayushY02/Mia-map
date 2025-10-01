import maplibregl from "maplibre-gl";

type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;

const SRC_ID = "kashiwa-elevation-src";
const FILL_ID = "kashiwa-elev-grid-fill";
const LINE_ID = "kashiwa-elev-grid-outline";

/**
 * Change this if your file name/path differs.
 * Must be a GeoJSON FeatureCollection of (square) polygons with a numeric property "標高".
 * Example feature: { "type":"Feature", "properties": { "標高": 23.4 }, "geometry": {...} }
 */
const DATA_URL = "/data/kashiwa_elevation_grid.geojson";

/** Step colors that match the legend image (light → dark red) */
const ELEV_COLORS = {
    // bins: 0–5, 5–10, 10–15, 15–20, 20–25, 25–30, 30–35, 35–35.7
    // feel free to tweak to your exact hexes
    steps: [
        5,  "#ffdbdb",
        10, "#ffb6b6",
        15, "#ff9292",
        20, "#ff6d6d",
        25, "#ff4949",
        30, "#ff2424",
        35, "#ff0000",
    ],
    base: "#fdecea",  // < 5
    outline: "#ffffff",
};

function ensureSource(map: maplibregl.Map) {
    if (map.getSource(SRC_ID)) return;
    map.addSource(SRC_ID, {
        type: "geojson",
        data: DATA_URL,
        attribution: "標高グリッド（柏市）",
    });
}

function ensureLayers(map: maplibregl.Map) {
    if (!map.getLayer(FILL_ID)) {
        map.addLayer({
            id: FILL_ID,
            type: "fill",
            source: SRC_ID,
            paint: {
                "fill-color": [
                    "step",
                    // coerce to number; fall back to -9999 so invalid/missing goes to base
                    ["coalesce", ["to-number", ["get", "標高"]], -9999],
                    // default ( < 5 )
                    "#fde0dc",
                    // [stop, color] pairs
                    5, "#f9bdbb",
                    10, "#f69988",
                    15, "#f36c60",
                    20, "#e84e40",
                    25, "#e51c23",
                    30, "#d32f2f",
                    35, "#c62828" // ≥ 35
                ],
                "fill-opacity": 0.85,
            },
        });
    }
    if (!map.getLayer(LINE_ID)) {
        map.addLayer({
            id: LINE_ID,
            type: "line",
            source: SRC_ID,
            paint: {
                "line-color": ELEV_COLORS.outline,
                "line-width": 0.3,
                "line-opacity": 0.6,
            },
        });
    }
}

function setVisibility(map: maplibregl.Map, visible: boolean) {
    const v = visible ? "visible" : "none";
    if (map.getLayer(FILL_ID)) map.setLayoutProperty(FILL_ID, "visibility", v);
    if (map.getLayer(LINE_ID)) map.setLayoutProperty(LINE_ID, "visibility", v);
}

export function toggleKashiwaElevationLayer(
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

/** Optional: keep a tiny helper for hover text */
export function formatElevation(val: unknown) {
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? `${n.toFixed(1)} m` : "N/A";
}
