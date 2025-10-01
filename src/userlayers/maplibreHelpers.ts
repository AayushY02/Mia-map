import maplibregl from "maplibre-gl";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import type { GeometryKind, IconMap, UserGeomStyle, UserLayer } from "./types";
import {
    categoricalColorExpr, graduatedColorExpr,
    lineWidthByZoom, circleRadiusByZoom, buildFilterExpr
} from "./styleUtils";

/* deterministic ids */
const lid = (id: string, kind: GeometryKind, suffix: string) => `user-${id}-${kind}-${suffix}`;
export const srcId = (id: string) => `user-${id}-src`;

export function ensureSource(map: maplibregl.Map, layer: UserLayer) {
    const src = srcId(layer.id);
    if (!map.getSource(src)) map.addSource(src, { type: "geojson", data: layer.data });
}

/* ---------- icons handling ---------- */

async function dataUrlToImageBitmap(dataUrl: string): Promise<ImageBitmap> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return await createImageBitmap(blob);
}

export async function ensureIconsOnMap(map: maplibregl.Map, iconMap?: IconMap) {
    if (!iconMap) return;
    for (const rec of Object.values(iconMap)) {
        if (!(map as any).hasImage?.(rec.id)) {
            try {
                const bmp = await dataUrlToImageBitmap(rec.dataUrl);
                (map as any).addImage?.(rec.id, bmp, { pixelRatio: 2 });
            } catch {
                /* ignore broken images */
            }
        }
    }
}

function iconImageExpr(prop: string, iconMap: IconMap, fallbackId: string): ExpressionSpecification {
    const expr: any[] = ["match", ["coalesce", ["to-string", ["get", prop]], ""]];
    for (const [val, rec] of Object.entries(iconMap)) {
        expr.push(val, rec.id);
    }
    expr.push(fallbackId);
    return expr as ExpressionSpecification;
}

/* ---------- color/size helpers ---------- */
function colorFor(kind: GeometryKind, s: UserGeomStyle): ExpressionSpecification | string {
    console.log(kind)
    if (s.mode === "single") return s.color || "#3b82f6";
    if (s.mode === "categorical" && s.catProperty && s.catMapping)
        return categoricalColorExpr(s.catProperty, s.catMapping, s.catDefault || "#bdbdbd");
    if (s.mode === "graduated" && s.gradProperty && s.gradBreaks && s.gradPalette)
        return graduatedColorExpr(s.gradProperty, s.gradBreaks, s.gradPalette);
    return "#3b82f6";
}
function sizeFor(kind: GeometryKind, s: UserGeomStyle): ExpressionSpecification | number {
    const base = Math.max(1, s.size ?? (kind === "line" ? 2 : 6));
    return kind === "line" ? lineWidthByZoom(base) : circleRadiusByZoom(base);
}

/* ---------- upsert layers per geometry ---------- */
export async function upsertGeomLayers(map: maplibregl.Map, layer: UserLayer, kind: GeometryKind) {
    ensureSource(map, layer);
    const cfg = layer.styles[kind]!;
    const source = srcId(layer.id);
    const vis = cfg.visible ? "visible" : "none";
    const filterExpr = buildFilterExpr(layer.filters);

    const colorExpr = colorFor(kind, cfg);
    const sizeExpr = sizeFor(kind, cfg);

    // FILL + outline
    if (kind === "polygon") {
        const fillId = lid(layer.id, "polygon", "fill");
        const lineId = lid(layer.id, "polygon", "outline");
        const lblId = lid(layer.id, "polygon", "label");

        if (!map.getLayer(fillId)) {
            map.addLayer({
                id: fillId, type: "fill", source,
                filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                layout: { visibility: vis },
                paint: { "fill-color": colorExpr as any, "fill-opacity": cfg.opacity ?? 0.8 }
            });
        }
        map.setLayoutProperty(fillId, "visibility", vis);
        map.setFilter(fillId, filterExpr as FilterSpecification | null);
        map.setPaintProperty(fillId, "fill-color", colorExpr as any);
        map.setPaintProperty(fillId, "fill-opacity", cfg.opacity ?? 0.8);

        if (!map.getLayer(lineId)) {
            map.addLayer({
                id: lineId, type: "line", source,
                filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                layout: { visibility: vis, "line-join": "round" },
                paint: {
                    "line-color": cfg.outlineColor || "#ffffff",
                    "line-width": cfg.outlineWidth ?? 0.8,
                    "line-opacity": Math.min(1, (cfg.opacity ?? 0.8) + 0.15),
                },
            });
        }
        map.setLayoutProperty(lineId, "visibility", vis);
        map.setFilter(lineId, filterExpr as FilterSpecification | null);
        map.setPaintProperty(lineId, "line-color", cfg.outlineColor || "#ffffff");
        map.setPaintProperty(lineId, "line-width", cfg.outlineWidth ?? 0.8);
        map.setPaintProperty(lineId, "line-opacity", Math.min(1, (cfg.opacity ?? 0.8) + 0.15));

        // polygon labels (optional)
        if (cfg.labelProperty) {
            if (!map.getLayer(lblId)) {
                map.addLayer({
                    id: lblId, type: "symbol", source,
                    filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                    layout: {
                        visibility: vis,
                        "text-field": ["to-string", ["get", cfg.labelProperty]],
                        "text-size": cfg.labelSize ?? 12,
                        "symbol-placement": "point",
                        "text-allow-overlap": false,
                        "text-anchor": "center",
                    },
                    paint: {
                        "text-color": "#111827",
                        "text-halo-color": "#ffffff",
                        "text-halo-width": 0.8,
                        "text-halo-blur": 0.1,
                    },
                });
            }
            map.setFilter(lblId, filterExpr as FilterSpecification | null);
            map.setLayoutProperty(lblId, "visibility", vis);
            map.setLayoutProperty(lblId, "text-field", ["to-string", ["get", cfg.labelProperty]] as any);
            map.setLayoutProperty(lblId, "text-size", cfg.labelSize ?? 12);
        } else if (map.getLayer(lblId)) {
            map.setLayoutProperty(lblId, "visibility", "none");
        }
    }

    // LINE
    if (kind === "line") {
        const lnId = lid(layer.id, "line", "main");
        const lblId = lid(layer.id, "line", "label");
        if (!map.getLayer(lnId)) {
            map.addLayer({
                id: lnId, type: "line", source,
                filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
                layout: { visibility: vis, "line-join": "round", "line-cap": "round" },
                paint: { "line-color": colorExpr as any, "line-width": sizeExpr as any, "line-opacity": cfg.opacity ?? 0.95 },
            });
        }
        map.setLayoutProperty(lnId, "visibility", vis);
        map.setFilter(lnId, filterExpr as FilterSpecification | null);
        map.setPaintProperty(lnId, "line-color", colorExpr as any);
        map.setPaintProperty(lnId, "line-width", sizeExpr as any);
        map.setPaintProperty(lnId, "line-opacity", cfg.opacity ?? 0.95);

        // line labels (optional)
        if (cfg.labelProperty) {
            if (!map.getLayer(lblId)) {
                map.addLayer({
                    id: lblId, type: "symbol", source,
                    filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
                    layout: {
                        visibility: vis,
                        "text-field": ["to-string", ["get", cfg.labelProperty]],
                        "text-size": cfg.labelSize ?? 12,
                        "symbol-placement": "line",
                        "text-allow-overlap": false,
                    },
                    paint: {
                        "text-color": "#111827",
                        "text-halo-color": "#ffffff",
                        "text-halo-width": 0.8,
                        "text-halo-blur": 0.1,
                    },
                });
            }
            map.setFilter(lblId, filterExpr as FilterSpecification | null);
            map.setLayoutProperty(lblId, "visibility", vis);
            map.setLayoutProperty(lblId, "text-field", ["to-string", ["get", cfg.labelProperty]] as any);
            map.setLayoutProperty(lblId, "text-size", cfg.labelSize ?? 12);
        } else if (map.getLayer(lblId)) {
            map.setLayoutProperty(lblId, "visibility", "none");
        }
    }

    // POINT – either circles or icons
    if (kind === "point") {
        const circleId = lid(layer.id, "point", "circle");
        const symId = lid(layer.id, "point", "symbol");
        const lblId = lid(layer.id, "point", "label");

        const wantIcons = (cfg.render === "icon") ||
            (!!cfg.iconProperty && !!cfg.iconMap && Object.keys(cfg.iconMap).length > 0);

        if (wantIcons) {
            // ensure icons exist
            await ensureIconsOnMap(map, cfg.iconMap);

            // remove circle layer if it exists (we'll use symbols)
            if (map.getLayer(circleId)) map.removeLayer(circleId);

            const firstIcon = cfg.iconMap ? Object.values(cfg.iconMap)[0]?.id : "";
            const imageExpr = cfg.iconProperty && cfg.iconMap
                ? iconImageExpr(cfg.iconProperty, cfg.iconMap, firstIcon)
                : firstIcon;

            if (!map.getLayer(symId)) {
                map.addLayer({
                    id: symId, type: "symbol", source,
                    filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                    layout: {
                        visibility: vis,
                        "icon-image": imageExpr as any,
                        "icon-size": cfg.iconSize ?? 0.85,
                        "icon-allow-overlap": true,
                    },
                });
            }
            map.setLayoutProperty(symId, "visibility", vis);
            map.setFilter(symId, filterExpr as FilterSpecification | null);
            map.setLayoutProperty(symId, "icon-image", imageExpr as any);
            map.setLayoutProperty(symId, "icon-size", cfg.iconSize ?? 0.85);
        } else {
            // remove symbol layer if present
            if (map.getLayer(symId)) map.removeLayer(symId);

            if (!map.getLayer(circleId)) {
                map.addLayer({
                    id: circleId, type: "circle", source,
                    filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                    layout: { visibility: vis },
                    paint: {
                        "circle-color": colorExpr as any,
                        "circle-opacity": cfg.opacity ?? 0.9,
                        "circle-radius": sizeExpr as any,
                        "circle-stroke-color": cfg.outlineColor || "#ffffff",
                        "circle-stroke-width": cfg.outlineWidth ?? 1,
                    },
                });
            }
            map.setLayoutProperty(circleId, "visibility", vis);
            map.setFilter(circleId, filterExpr as FilterSpecification | null);
            map.setPaintProperty(circleId, "circle-color", colorExpr as any);
            map.setPaintProperty(circleId, "circle-opacity", cfg.opacity ?? 0.9);
            map.setPaintProperty(circleId, "circle-radius", sizeExpr as any);
            map.setPaintProperty(circleId, "circle-stroke-color", cfg.outlineColor || "#ffffff");
            map.setPaintProperty(circleId, "circle-stroke-width", cfg.outlineWidth ?? 1);
        }

        // labels (optional) – stick with symbol text
        if (cfg.labelProperty) {
            if (!map.getLayer(lblId)) {
                map.addLayer({
                    id: lblId, type: "symbol", source,
                    filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                    layout: {
                        "text-field": ["to-string", ["get", cfg.labelProperty]],
                        "text-size": cfg.labelSize ?? 12,
                        "text-offset": [0, 1.0],
                        "text-anchor": "top",
                        "text-allow-overlap": false,
                        visibility: vis,
                    },
                    paint: {
                        "text-color": "#111827",
                        "text-halo-color": "#ffffff",
                        "text-halo-width": 0.8,
                        "text-halo-blur": 0.1,
                    },
                });
            }
            map.setFilter(lblId, filterExpr as FilterSpecification | null);
            map.setLayoutProperty(lblId, "text-field", ["to-string", ["get", cfg.labelProperty]] as any);
            map.setLayoutProperty(lblId, "text-size", cfg.labelSize ?? 12);
            map.setLayoutProperty(lblId, "visibility", vis);
        } else if (map.getLayer(lblId)) {
            map.setLayoutProperty(lblId, "visibility", "none");
        }
    }
}

/* Remove all map pieces for a user layer */
export function removeUserLayerFromMap(map: maplibregl.Map, id: string) {
    for (const kind of ["polygon", "line", "point"] as GeometryKind[]) {
        for (const suffix of ["fill", "outline", "main", "circle", "symbol", "label"]) {
            const lid_ = lid(id, kind, suffix);
            if (map.getLayer(lid_)) map.removeLayer(lid_);
        }
    }
    const src = srcId(id);
    if (map.getSource(src)) map.removeSource(src);
}

/* Reorder: move each layer group's layers to the top in array order */
export function reorderUserLayers(map: maplibregl.Map, layers: UserLayer[]) {
    // Move bottom→top in given order
    for (const L of layers) {
        const ids = [
            lid(L.id, "polygon", "fill"),
            lid(L.id, "polygon", "outline"),
            lid(L.id, "line", "main"),
            lid(L.id, "point", "circle"),
            lid(L.id, "point", "symbol"),
            // place labels on top
            lid(L.id, "polygon", "label"),
            lid(L.id, "line", "label"),
            lid(L.id, "point", "label"),
        ];
        for (const id of ids) if (map.getLayer(id)) map.moveLayer(id);
    }
}
