// src/layers/aiMesh.ts
import maplibregl from "maplibre-gl";

/** Public IDs that MapView imports */
export const AI_MESH_SRC = "ai-mesh-src";
export const AI_MESH_FILL = "ai-mesh-fill";
export const AI_MESH_LINE = "ai-mesh-line";
export const AI_MESH_BASE = "ai-mesh-base";

/** Internal helper IDs for the drag box overlay */
const DRAG_SRC = "ai-mesh-drag-src";
const DRAG_FILL = "ai-mesh-drag-fill";
const DRAG_LINE = "ai-mesh-drag-line";

/** -------- Layer bootstrap -------- */
export function ensureAiMeshLayers(map: maplibregl.Map) {


    if (!map.getSource(AI_MESH_SRC)) {
        map.addSource(AI_MESH_SRC, {
            type: "geojson",
            data: emptyFC(),
            // critical: lets us use setFeatureState with our string ids
            promoteId: "id",
        } as any);

        // 0) Base fill (always visible light gray so the grid is visible no matter what)
        if (!map.getLayer(AI_MESH_BASE)) {
            map.addLayer({
                id: AI_MESH_BASE,
                type: "fill",
                source: AI_MESH_SRC,
                paint: {
                    "fill-color": "#bfc5cd",     // soft gray
                    "fill-opacity": 0.18,
                },
            });
        }



        // Neutral fill that becomes vivid when selected/hovered via feature-state
        map.addLayer({
            id: AI_MESH_FILL,
            type: "fill",
            source: AI_MESH_SRC,
            paint: {
                // vivid green when selected, lime when hover, muted when idle
                "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "selected"], false], "#16a34a",  // selected
                    ["boolean", ["feature-state", "hover"], false], "#86efac",  // hover
                    "#9ca3af"                                                     // base (gray)
                ],
                "fill-opacity": [
                    "case",
                    ["boolean", ["feature-state", "selected"], false], 0.7,
                    ["boolean", ["feature-state", "hover"], false], 0.35,
                    0.12
                ],
                // optional outline color to reinforce the state
                "fill-outline-color": [
                    "case",
                    ["boolean", ["feature-state", "selected"], false], "#065f46",
                    ["boolean", ["feature-state", "hover"], false], "#10b981",
                    "#6b7280"
                ],
            },
        });

        map.addLayer({
            id: AI_MESH_LINE,
            type: "line",
            source: AI_MESH_SRC,
            paint: {
                "line-color": [
                    "case",
                    ["boolean", ["feature-state", "selected"], false], "#065f46",
                    ["boolean", ["feature-state", "hover"], false], "#10b981",
                    "#6b7280"
                ],
                "line-width": [
                    "case",
                    ["boolean", ["feature-state", "selected"], false], 2,
                    ["boolean", ["feature-state", "hover"], false], 1.5,
                    0.7
                ],
                "line-opacity": 1
            },
        });
    }

    wireHoverOnce(map);
}

/** Inject features (GeoJSON) the way buildMeshForBounds()/coverBox produce them.
 *  We make sure each feature has `id = properties.mesh_id` so feature-state works.
 */
export function setAiMeshSourceData(
    map: maplibregl.Map,
    features: Array<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>>
) {
    const normalized = (features || []).map((f) => {
        const props = (f.properties || {}) as any;
        const meshId =
            props.mesh_id ??
            props.MESH_ID ??
            (typeof (f as any).id === "string" ? (f as any).id : undefined);

        if (!meshId) {
            throw new Error("aiMesh: feature missing mesh_id / MESH_ID / id");
        }

        // ensure id + canonical property
        return {
            type: "Feature",
            geometry: f.geometry,
            id: String(meshId),
            properties: { ...props, mesh_id: String(meshId) },
        } as GeoJSON.Feature;
    });

    const src = map.getSource(AI_MESH_SRC) as maplibregl.GeoJSONSource;
    src.setData({ type: "FeatureCollection", features: normalized });
}

/** Toggle the 'selected' feature-state on a cell by id (mesh_id) */
export function toggleFeatureState(
    map: maplibregl.Map,
    meshId: string,
    selected: boolean
) {
    map.setFeatureState(
        { source: AI_MESH_SRC, id: meshId },
        { selected }
    );
}

/** Clear ALL feature-state (selected/hover) for this source */
export function clearAllFeatureStates(map: maplibregl.Map) {
    try {
        map.removeFeatureState({ source: AI_MESH_SRC });
    } catch { }
}

/** SHIFT+drag a rectangle, emit a Polygon to your callback, and draw a ghost box while dragging.
 *  Returns a cleanup() to remove listeners and overlay.
 */
export function enableShiftDragBox(
    map: maplibregl.Map,
    onComplete: (poly: GeoJSON.Polygon) => void
): () => void {
    // One overlay source/layer pair reused per activation
    if (!map.getSource(DRAG_SRC)) {
        map.addSource(DRAG_SRC, { type: "geojson", data: emptyFC() });
        map.addLayer({
            id: DRAG_FILL,
            type: "fill",
            source: DRAG_SRC,
            paint: { "fill-color": "#000", "fill-opacity": 0.08 },
        });
        map.addLayer({
            id: DRAG_LINE,
            type: "line",
            source: DRAG_SRC,
            paint: { "line-color": "#000", "line-width": 1.2, "line-opacity": 0.45 },
        });
    } else {
        (map.getSource(DRAG_SRC) as maplibregl.GeoJSONSource).setData(emptyFC());
    }

    // Disable built-in SHIFT box-zoom & panning while our tool is active
    const boxZoomWasEnabled = map.boxZoom.isEnabled();
    const dragPanWasEnabled = map.dragPan.isEnabled();
    map.boxZoom.disable();
    map.dragPan.disable();

    let active = false;
    let start: maplibregl.LngLat | null = null;

    const onMouseDown = (e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) => {
        if (!e.originalEvent.shiftKey || e.originalEvent.button !== 0) return;
        active = true;
        start = e.lngLat;
        map.getCanvas().style.cursor = "crosshair";
        map.dragPan.disable();
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
        if (!active || !start) return;
        const poly = rectToPolygon(start, e.lngLat);
        (map.getSource(DRAG_SRC) as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: poly, properties: {} }],
        });
    };

    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
        if (!active || !start) return;
        active = false;
        const poly = rectToPolygon(start, e.lngLat);
        (map.getSource(DRAG_SRC) as maplibregl.GeoJSONSource).setData(emptyFC());
        map.getCanvas().style.cursor = "";
        start = null;

        // Emit the selection polygon
        onComplete(poly);
    };

    const onEsc = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape") return;
        active = false;
        start = null;
        (map.getSource(DRAG_SRC) as maplibregl.GeoJSONSource).setData(emptyFC());
        map.getCanvas().style.cursor = "";
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    window.addEventListener("keydown", onEsc);

    // Cleanup function (called when Ask mode ends / component unmounts)
    return () => {
        try {
            map.off("mousedown", onMouseDown);
            map.off("mousemove", onMouseMove);
            map.off("mouseup", onMouseUp);
            window.removeEventListener("keydown", onEsc);
            // Clear overlay geometry
            const dragSrc = map.getSource(DRAG_SRC) as maplibregl.GeoJSONSource | undefined;
            dragSrc?.setData(emptyFC());
        } finally {
            // restore original interactions
            if (boxZoomWasEnabled) map.boxZoom.enable(); else map.boxZoom.disable();
            if (dragPanWasEnabled) map.dragPan.enable(); else map.dragPan.disable();
            map.getCanvas().style.cursor = "";
        }
    };
}

/** -------- Internal helpers -------- */

function emptyFC(): GeoJSON.FeatureCollection {
    return { type: "FeatureCollection", features: [] };
}

function rectToPolygon(a: maplibregl.LngLat, b: maplibregl.LngLat): GeoJSON.Polygon {
    const west = Math.min(a.lng, b.lng);
    const east = Math.max(a.lng, b.lng);
    const south = Math.min(a.lat, b.lat);
    const north = Math.max(a.lat, b.lat);
    const ring: [number, number][] = [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south], // close ring
    ];
    return { type: "Polygon", coordinates: [ring] };
}

// Hover effect (kept inside this module so MapView doesn’t have to wire it)
function wireHoverOnce(map: maplibregl.Map) {
    const M = map as any;
    if (M.__aiMeshHoverWired) return;
    M.__aiMeshHoverWired = true;

    let hoveredId: string | null = null;

    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        const id = f?.id != null ? String(f.id) : null;
        if (id === hoveredId) return;
        if (hoveredId) map.setFeatureState({ source: AI_MESH_SRC, id: hoveredId }, { hover: false });
        if (id) map.setFeatureState({ source: AI_MESH_SRC, id }, { hover: true });
        hoveredId = id;
    };

    const onLeave = () => {
        if (hoveredId) map.setFeatureState({ source: AI_MESH_SRC, id: hoveredId }, { hover: false });
        hoveredId = null;
    };

    map.on("mousemove", AI_MESH_FILL, onMove);
    map.on("mouseleave", AI_MESH_FILL, onLeave);
}
