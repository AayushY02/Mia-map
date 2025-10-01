
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    X, Layers, UploadCloud, ChevronUp,
    ArrowUp, ArrowDown
} from "lucide-react";
import { nanoid } from "nanoid";
import {
    PALETTES, extractProps, collectNumeric,
    equalBreaks, quantileBreaks, legendFromBreaks
} from "@/userlayers/styleUtils";
import type {
    GraduatedMethod, GeometryKind, UserGeomStyle, UserLayer
} from "@/userlayers/types";
import {
    upsertGeomLayers, removeUserLayerFromMap
} from "@/userlayers/maplibreHelpers";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
const NONE_VALUE = "__none__";
/* ---------------------------------------------------
   Layout helpers – width between Legend and Menu
--------------------------------------------------- */
function useDockWidth() {
    const [width, setWidth] = useState(720);
    useEffect(() => {
        const compute = () => {
            const L = document.querySelector<HTMLElement>("[data-legends-stack]");
            const R = document.querySelector<HTMLElement>("[data-map-controls]");
            const left = L ? L.getBoundingClientRect().width + 24 : 300;
            const right = R ? R.getBoundingClientRect().width + 24 : 380;
            const max = Math.min(980, Math.max(360, window.innerWidth - left - right));
            setWidth(max);
        };
        compute();
        const ro = new ResizeObserver(compute);
        const l = document.querySelector("[data-legends-stack]");
        const r = document.querySelector("[data-map-controls]");
        if (l) ro.observe(l);
        if (r) ro.observe(r);
        ro.observe(document.documentElement);
        window.addEventListener("resize", compute, { passive: true });
        return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
    }, []);
    return width;
}

/* ---------------------------------------------------
   Jenks natural breaks (k classes)
   (self-contained; no other file changes)
--------------------------------------------------- */
function jenksBreaks(values: number[], k: number): number[] {
    if (values.length === 0) return [];
    const data = values.slice().sort((a, b) => a - b);
    const n = data.length;
    const m = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
    const v = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
    for (let i = 1; i <= k; i++) {
        m[0][i] = 1; v[0][i] = 0;
        for (let j = 1; j <= n; j++) v[j][i] = Infinity;
    }
    let s1 = 0, s2 = 0, w = 0;
    for (let i = 1; i <= n; i++) {
        const val = data[i - 1];
        s1 += val; s2 += val * val; w++;
        const var_ = s2 - (s1 * s1) / w;
        m[i][1] = 1; v[i][1] = var_;
    }
    for (let c = 2; c <= k; c++) {
        for (let i = c; i <= n; i++) {
            s1 = 0; s2 = 0; w = 0;
            for (let j = i; j >= c; j--) {
                const val = data[j - 1];
                s1 += val; s2 += val * val; w++;
                const var_ = s2 - (s1 * s1) / w;
                if (v[i][c] >= var_ + v[j - 1][c - 1]) {
                    m[i][c] = j; v[i][c] = var_ + v[j - 1][c - 1];
                }
            }
        }
    }
    const breaks = Array(k - 1).fill(0);
    let idx = n;
    for (let c = k; c > 1; c--) {
        const id = m[idx][c] - 1;
        breaks[c - 2] = data[id];
        idx = id;
    }
    return breaks;
}

/* ---------------------------------------------------
   Simple string slug for icon ids
--------------------------------------------------- */
const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "empty";

/* ---------------------------------------------------
   Default style factory
--------------------------------------------------- */
const DEFAULT_STYLE = (): UserGeomStyle => ({
    visible: true,
    mode: "single",
    color: "#3b82f6",
    opacity: 0.85,
    size: 6,
    outlineColor: "#ffffff",
    outlineWidth: 1,
    labelSize: 12,
});

type Props = {
    map: maplibregl.Map | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
};

export default function UserLayersPanel({ map, open, onOpenChange }: Props) {
    const width = useDockWidth();

    // ====== persisted user layers ======
    const [layers, setLayers] = useState<UserLayer[]>(() => {
        try { return JSON.parse(localStorage.getItem("userLayers") || "[]"); } catch { return []; }
    });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [heightVh, setHeightVh] = useState<number>(() => {
        const v = Number(localStorage.getItem("userPanelHeightVh") || 48);
        return Number.isFinite(v) ? v : 48;
    });
    const [prevHeightVh, setPrevHeightVh] = useState<number>(heightVh);
    const collapsed = heightVh <= 20;
    const [showUploader, setShowUploader] = useState(true);
    useEffect(() => { localStorage.setItem("userLayers", JSON.stringify(layers)); }, [layers]);
    useEffect(() => { localStorage.setItem("userPanelHeightVh", String(heightVh)); }, [heightVh]);

    // Apply base layers (from helpers) whenever styles change
    useEffect(() => {
        if (!map) return;
        for (const L of layers) {
            (["polygon", "line", "point"] as GeometryKind[]).forEach(k => {
                if (L.styles[k]) upsertGeomLayers(map, L, k);
            });
            // re-apply icon symbol & filters after base layers upsert
            applyPointIconLayer(map, L);
            applyFiltersToMap(map, L);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, layers]);

    /* ------------------- file upload ------------------- */
    function addLayerFromGeoJSON(fc: GeoJSON.FeatureCollection, name: string, filename?: string) {
        const hasPoint = fc.features.some(f => ["Point", "MultiPoint"].includes(f.geometry?.type as string));
        const hasLine = fc.features.some(f => ["LineString", "MultiLineString"].includes(f.geometry?.type as string));
        const hasPoly = fc.features.some(f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type as string));

        const id = nanoid(8);
        const base = DEFAULT_STYLE();
        const styles: any = {};
        if (hasPoint) styles.point = { ...base, size: 6, outlineWidth: 1.5, useIcons: false, iconSize: 1, iconMap: {}, iconProp: "" };
        if (hasLine) styles.line = { ...base, size: 2.5, outlineWidth: 0, filters: { combine: "AND", rules: [] } };
        if (hasPoly) styles.polygon = { ...base, size: 0, outlineWidth: 1, filters: { combine: "AND", rules: [] } };

        const L: UserLayer = { id, name, filename, data: fc, createdAt: Date.now(), styles };
        setLayers(p => [...p, L]);
        setActiveId(id);
        onOpenChange(true);
    }

    // Quick toggle of layer visibility across available geometry styles
    function setLayerVisibility(L: UserLayer, visible: boolean) {
        const kinds: GeometryKind[] = ["polygon", "line", "point"];
        const next: UserLayer = {
            ...L,
            styles: kinds.reduce((acc, k) => {
                if ((L.styles as any)[k]) {
                    (acc as any)[k] = { ...(L.styles as any)[k], visible };
                }
                return acc;
            }, { ...L.styles } as any),
        };
        setLayers(prev => prev.map(x => x.id === L.id ? next : x));
    }

    // -------- dock resize (drag handle) --------
    function startResize(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        const startY = e.clientY;
        const start = heightVh;
        const onMove = (ev: MouseEvent) => {
            const dy = startY - ev.clientY; // drag up -> increase
            const deltaVh = (dy / window.innerHeight) * 100;
            const next = Math.max(16, Math.min(80, start + deltaVh));
            setHeightVh(next);
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    // Get combined visible state (true if any geometry style is visible)
    function isLayerVisible(L: UserLayer) {
        const kinds: GeometryKind[] = ["polygon", "line", "point"];
        return kinds.some(k => (L.styles as any)[k]?.visible);
    }

    // Compute simple geometry badges for list view
    function summarizeGeometry(L: UserLayer) {
        let p = 0, l = 0, g = 0;
        try {
            for (const f of L.data.features) {
                const t = f.geometry?.type;
                if (!t) continue;
                if (t === "Point" || t === "MultiPoint") p++;
                else if (t === "LineString" || t === "MultiLineString") l++;
                else if (t === "Polygon" || t === "MultiPolygon") g++;
            }
        } catch {}
        return { point: p, line: l, polygon: g };
    }

    function removeLayer(id: string) {
        setLayers(prev => prev.filter(x => x.id !== id));
        if (map) {
            removeUserLayerFromMap(map, id);
            // also remove our symbol layer (icons)
            const symId = `user-${id}-point-symbol`;
            if (map.getLayer(symId)) map.removeLayer(symId);
            // optional: we keep images; they’re lightweight.
        }
        if (activeId === id) setActiveId(null);
    }

    async function handleFile(input: HTMLInputElement, file?: File) {
        const f = file ?? input.files?.[0];
        if (!f) return;
        try {
            const text = await f.text();
            const fc = JSON.parse(text);
            addLayerFromGeoJSON(fc, f.name.replace(/\.\w+$/, ""), f.name);
        } catch {
            alert("Invalid GeoJSON");
        } finally {
            input.value = "";
        }
    }

    /* ------------------- z-order (reorder) ------------------- */
    function moveLayerIndex(idx: number, dir: "up" | "down") {
        const next = layers.slice();
        const j = dir === "up" ? idx - 1 : idx + 1;
        if (j < 0 || j >= next.length) return;
        const tmp = next[idx]; next[idx] = next[j]; next[j] = tmp;
        setLayers(next);
        // apply to map
        if (!map) return;
        reorderAllUserLayersOnMap(map, next);
    }

    function reorderAllUserLayersOnMap(map: maplibregl.Map, order: UserLayer[]) {
        // maintain internal order per layer; move each group to the top in sequence
        const kinds: GeometryKind[] = ["polygon", "line", "point"];
        // draw labels on top for readability
        const suffixes = [
            ["fill", "outline"], // polygon (base first)
            ["main"],            // line (base)
            ["circle"],          // point base
        ];
        for (const L of order) {
            kinds.forEach((k, ki) => {
                const suf = suffixes[ki];
                for (const s of suf) {
                    const id = `user-${L.id}-${k}-${s}`;
                    if (map.getLayer(id)) map.moveLayer(id);
                }
            });
            // ensure icons and labels are on top
            const symId = `user-${L.id}-point-symbol`;
            if (map.getLayer(symId)) map.moveLayer(symId);
            const polyLbl = `user-${L.id}-polygon-label`;
            const lineLbl = `user-${L.id}-line-label`;
            const pointLbl = `user-${L.id}-point-label`;
            for (const id of [polyLbl, lineLbl, pointLbl]) if (map.getLayer(id)) map.moveLayer(id);
        }
    }

    /* ------------------- filters ------------------- */
    type FilterRule = { prop: string; op: "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains"; val: string };
    type FiltersState = { combine: "AND" | "OR"; rules: FilterRule[] };

    function applyFiltersToMap(map: maplibregl.Map, L: UserLayer) {
        const kinds: GeometryKind[] = ["polygon", "line", "point"];
        for (const k of kinds) {
            const st = (L.styles as any)[k] as UserGeomStyle & { filters?: FiltersState };
            const filter = buildFilterExpr(st?.filters);
            if (!st) continue;
            const ids: string[] = [];
            if (k === "polygon") ids.push(`user-${L.id}-polygon-fill`, `user-${L.id}-polygon-outline`, `user-${L.id}-polygon-label`);
            if (k === "line") ids.push(`user-${L.id}-line-main`, `user-${L.id}-line-label`);
            if (k === "point") ids.push(`user-${L.id}-point-circle`, `user-${L.id}-point-label`, `user-${L.id}-point-symbol`);
            for (const id of ids) if (map.getLayer(id)) map.setFilter(id, filter as any);
        }
    }

    function buildFilterExpr(filters?: FiltersState) {
        if (!filters || !filters.rules?.length) return null;
        const parts: any[] = [];
        for (const r of filters.rules) {
            const g = ["get", r.prop] as any;
            const num = Number(r.val);
            const maybeNum = Number.isFinite(num) ? ["to-number", g] : ["to-string", g];
            let expr: any;
            switch (r.op) {
                case "=": expr = ["==", maybeNum, Number.isFinite(num) ? num : r.val]; break;
                case "!=": expr = ["!=", maybeNum, Number.isFinite(num) ? num : r.val]; break;
                case ">": expr = [">", ["to-number", g], num || 0]; break;
                case ">=": expr = [">=", ["to-number", g], num || 0]; break;
                case "<": expr = ["<", ["to-number", g], num || 0]; break;
                case "<=": expr = ["<=", ["to-number", g], num || 0]; break;
                case "contains": expr = ["in", r.val, ["to-string", g]]; break;
            }
            parts.push(expr);
        }
        return filters.combine === "OR" ? ["any", ...parts] : ["all", ...parts];
    }

    /* ------------------- icons (points) ------------------- */

    // Create a default dot icon (used as fallback)
    async function ensureDefaultDotIcon(map: maplibregl.Map, id = "user-dot-6") {
        if ((map as any).hasImage?.(id)) return id;
        const size = 64;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = "#2563eb";
        ctx.fill();
        const bmp = await createImageBitmap(c);
        (map as any).addImage?.(id, bmp, { pixelRatio: 2 });
        return id;
    }

    async function fileToBitmap(file: File): Promise<ImageBitmap> {
        if ("createImageBitmap" in window) {
            return await createImageBitmap(await fileToImage(file));
        }
        // fallback via canvas
        const img = await fileToImage(file);
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return await createImageBitmap(c);
    }

    function fileToImage(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Build/refresh the symbol layer for points if useIcons is true
    async function applyPointIconLayer(map: maplibregl.Map, L: UserLayer) {
        const st = (L.styles as any).point as (UserGeomStyle & {
            useIcons?: boolean;
            iconProp?: string;
            iconMap?: Record<string, { iconId: string; title?: string }>;
            iconSize?: number;
        }) | undefined;
        if (!st) return;

        const srcId = `user-${L.id}-src`;
        const circleId = `user-${L.id}-point-circle`;
        // const labelId = `user-${L.id}-point-label`;
        const symbolId = `user-${L.id}-point-symbol`;

        if (!st.useIcons || !st.iconProp) {
            // hide symbol, show circles
            if (map.getLayer(symbolId)) map.setLayoutProperty(symbolId, "visibility", "none");
            if (map.getLayer(circleId)) map.setLayoutProperty(circleId, "visibility", st.visible ? "visible" : "none");
            return;
        }

        // ensure default dot exists
        const fallbackIcon = await ensureDefaultDotIcon(map);

        // add uploaded images (iconMap)
        const mapping = st.iconMap || {};
        for (const [val, rec] of Object.entries(mapping)) {
            console.log(val)
            const id = rec.iconId;
            if (!(map as any).hasImage?.(id)) continue; // was added earlier on upload
        }

        // build icon-image expression
        const expr: any[] = ["match", ["coalesce", ["to-string", ["get", st.iconProp]], ""]];
        for (const [val, rec] of Object.entries(mapping)) {
            expr.push(val, rec.iconId);
        }
        expr.push(fallbackIcon);

        // create or update symbol layer
        if (!map.getLayer(symbolId)) {
            map.addLayer({
                id: symbolId,
                type: "symbol",
                source: srcId,
                filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                layout: {
                    visibility: st.visible ? "visible" : "none",
                    "icon-image": expr as any,
                    "icon-size": st.iconSize ?? 1,
                    "icon-allow-overlap": true,
                },
            });
        } else {
            map.setLayoutProperty(symbolId, "visibility", st.visible ? "visible" : "none");
            map.setLayoutProperty(symbolId, "icon-image", expr as any);
            map.setLayoutProperty(symbolId, "icon-size", st.iconSize ?? 1);
        }

        // hide circle layer to avoid duplicates
        if (map.getLayer(circleId)) map.setLayoutProperty(circleId, "visibility", "none");
        // apply filters if any
        applyFiltersToMap(map, L);
    }

    async function addIconForCategory(map: maplibregl.Map, L: UserLayer, categoryValue: string, file: File) {
        const bmp = await fileToBitmap(file);
        const iconId = `user-${L.id}-icon-${slug(categoryValue)}`;
        (map as any).addImage?.(iconId, bmp, { pixelRatio: 2 });
        // persist to layer style
        const next = layers.map(x => {
            if (x.id !== L.id) return x;
            const p = (x.styles as any).point;
            const iconMap = { ...(p.iconMap || {}) };
            iconMap[categoryValue] = { iconId };
            return { ...x, styles: { ...x.styles, point: { ...p, iconMap } } };
        });
        setLayers(next);
    }

    /* ------------------- expose FC to window for stats ------------------- */
    useEffect(() => {
        (window as any).__lastFCGetter = () => {
            const l = layers.find(l => l.id === activeId);
            return l?.data;
        };
    }, [layers, activeId]);

    /* ------------------- render ------------------- */
    return (
        <>
            {/* peeking opener */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        key="peek"
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 16, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => onOpenChange(true)}
                        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40
                       px-4 py-2 rounded-full
                       bg-white/40 backdrop-blur-xl border border-white/30
                       shadow-lg hover:bg-white/55 active:scale-[0.98]"
                        title="Data & Styles"
                    >
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800">
                            <Layers className="w-4 h-4" />
                            Data & Styles
                            <ChevronUp className="w-4 h-4 opacity-70" />
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* bottom dock */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="dock"
                        initial={{ y: 40, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 40, opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 240, damping: 26 }}
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
                        style={{ width }}
                    >
                        <div
                            className="rounded-3xl overflow-hidden relative flex flex-col
                         border border-white/25
                         bg-gradient-to-b from-white/55 to-white/35
                         backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.25)]
                         ring-1 ring-black/5"
                            style={{ height: `${heightVh}vh` }}
                        >
                            {/* Resize handle */}
                            <div
                                onMouseDown={startResize}
                                className="absolute top-0 left-0 right-0 h-3 cursor-row-resize"
                                aria-hidden
                            />
                            {/* Header */}
                            <div className="relative px-4 py-3 flex items-center justify-between">
                                <div className="inline-flex items-center gap-2">
                                    <div className="h-5 w-10 rounded-full bg-white/70 backdrop-blur-sm border border-white/40" />
                                    <span className="text-sm font-semibold text-neutral-800">User Layers</span>
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/70"
                                        onClick={() => setShowUploader(v => !v)}
                                        title={showUploader ? "Hide uploader" : "Show uploader"}
                                    >
                                        {showUploader ? "Hide Upload" : "Show Upload"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/70"
                                        onClick={() => {
                                            if (collapsed) setHeightVh(prevHeightVh);
                                            else { setPrevHeightVh(heightVh); setHeightVh(18); }
                                        }}
                                        title={collapsed ? "Expand panel" : "Collapse panel"}
                                    >
                                        {collapsed ? "Expand" : "Collapse"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/60" title="Close">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-4 pb-4 flex-1 overflow-auto">
                                {/* Uploader */}
                                {showUploader && (
                                <Card className="p-4 bg-white/70 backdrop-blur border-white/40 rounded-2xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-medium">Add GeoJSON</div>
                                        <div className="text-[11px] text-neutral-600">.geojson • application/geo+json</div>
                                    </div>
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            (e.currentTarget as HTMLElement).classList.add("ring-2", "ring-blue-500/40");
                                        }}
                                        onDragLeave={(e) => {
                                            (e.currentTarget as HTMLElement).classList.remove("ring-2", "ring-blue-500/40");
                                        }}
                                        onDrop={(ev) => {
                                            ev.preventDefault();
                                            (ev.currentTarget as HTMLElement).classList.remove("ring-2", "ring-blue-500/40");
                                            const f = ev.dataTransfer.files?.[0];
                                            if (!f) return;
                                            const input = document.createElement("input");
                                            handleFile(input, f);
                                        }}
                                        className="border-2 border-dashed border-white/60 rounded-2xl p-6 text-center
                                text-sm text-neutral-700 bg-white/50 hover:bg-white/70 transition-all"
                                        role="button"
                                        aria-label="Upload GeoJSON by dropping or picking a file"
                                    >
                                        Drag & drop GeoJSON here
                                        <div className="my-2 opacity-60">or</div>
                                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/60 bg-white/80 cursor-pointer hover:bg-white">
                                            <UploadCloud className="w-4 h-4" />
                                            <span>Choose file</span>
                                            <input
                                                type="file"
                                                accept=".json,.geojson,application/geo+json,application/json"
                                                className="hidden"
                                                onChange={(e) => handleFile(e.currentTarget)}
                                            />
                                        </label>
                                    </div>
                                </Card>
                                )}

                                {/* Search + Layers list */}
                                <div className="mt-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder="Search layers by name…"
                                                className="pl-3"
                                            />
                                        </div>
                                        {!!layers.length && (
                                            <Badge variant="secondary" className="shrink-0">
                                                {layers.length}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid gap-2 pr-1">
                                        {layers
                                            .filter(L => {
                                                const q = query.trim().toLowerCase();
                                                if (!q) return true;
                                                return (
                                                    L.name.toLowerCase().includes(q) ||
                                                    (L.filename ?? "").toLowerCase().includes(q)
                                                );
                                            })
                                            .map((L, i) => (
                                        <motion.div
                                            key={L.id}
                                            layout
                                            className="rounded-2xl border border-white/40 bg-white/60 hover:bg-white/70 transition-colors backdrop-blur px-3 pt-3 pb-2 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    className="text-left truncate font-medium text-sm"
                                                    onClick={() => setActiveId(L.id)}
                                                    title={L.filename ?? L.name}
                                                >
                                                    {L.name}
                                                </button>
                                                <div className="inline-flex items-center gap-2">
                                                    {/* Quick visibility */}
                                                    <div className="inline-flex items-center gap-1 text-xs text-neutral-600">
                                                        <span className="hidden sm:inline">Visible</span>
                                                        <Switch checked={isLayerVisible(L)} onCheckedChange={(v) => setLayerVisibility(L, v)} />
                                                    </div>

                                                    {/* Reorder */}
                                                    <Button size="icon" variant="ghost" onClick={() => moveLayerIndex(i, "up")} disabled={i === 0} title="Move up">
                                                        <ArrowUp className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => moveLayerIndex(i, "down")} disabled={i === layers.length - 1} title="Move down">
                                                        <ArrowDown className="w-4 h-4" />
                                                    </Button>

                                                    <Button size="sm" variant="secondary" className="bg-white/80" onClick={() => setActiveId(L.id)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => removeLayer(L.id)}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Geometry badges */}
                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-600">
                                                {(() => { const s = summarizeGeometry(L); return (
                                                    <>
                                                        {s.point > 0 && <Badge variant="outline" className="bg-white/80">{s.point} pts</Badge>}
                                                        {s.line > 0 && <Badge variant="outline" className="bg-white/80">{s.line} lines</Badge>}
                                                        {s.polygon > 0 && <Badge variant="outline" className="bg-white/80">{s.polygon} polys</Badge>}
                                                    </>
                                                ); })()}
                                                <span className="truncate opacity-70">{L.filename}</span>
                                            </div>

                                            {activeId === L.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="mt-2 overflow-hidden"
                                                >
                                                    <LayerEditor
                                                        map={map}
                                                        layer={L}
                                                        onChange={(upd) => setLayers(prev => prev.map(x => x.id === L.id ? upd : x))}
                                                        onUploadIcon={(val, file) => map && addIconForCategory(map, L, val, file)}
                                                        onApplyIcons={() => map && applyPointIconLayer(map, L)}
                                                        onApplyFilters={() => map && applyFiltersToMap(map, L)}
                                                    />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}

                                    {!layers.length && (
                                        <div className="text-center text-xs text-neutral-600 py-6">
                                            No user layers yet. Upload a GeoJSON to get started.
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/* ==================== Editor ==================== */

// function LayerEditor({
//     map, layer, onChange,
//     onUploadIcon, onApplyIcons, onApplyFilters
// }: {
//     map: maplibregl.Map | null;
//     layer: UserLayer;
//     onChange: (l: UserLayer) => void;
//     onUploadIcon: (value: string, file: File) => void;
//     onApplyIcons: () => void;
//     onApplyFilters: () => void;
// }) {
//     const propsInfo = useMemo(() => extractProps(layer.data), [layer.data]);
//     const allProps = Object.keys(propsInfo);
//     const numericProps = allProps.filter(k => propsInfo[k].numeric);

//     function updateStyle(kind: GeometryKind, patch: Partial<UserGeomStyle> | any) {
//         const next: UserLayer = {
//             ...layer,
//             styles: { ...layer.styles, [kind]: { ...layer.styles[kind]!, ...patch } }
//         };
//         onChange(next);
//     }

//     return (
//         <div className="px-1 pb-2">
//             {(["polygon", "line", "point"] as GeometryKind[]).map(kind => layer.styles[kind] && (
//                 <Card key={kind} className="mb-3 p-3 rounded-2xl bg-white/70 backdrop-blur border-white/40">
//                     <div className="flex items-center justify-between mb-2">
//                         <div className="font-medium capitalize text-sm">{kind}</div>
//                         <label className="flex items-center gap-2 text-xs">
//                             <input
//                                 type="checkbox"
//                                 checked={!!layer.styles[kind]?.visible}
//                                 onChange={(e) => updateStyle(kind, { visible: e.target.checked })}
//                             />
//                             Visible
//                         </label>
//                     </div>

//                     <StyleBlock
//                         kind={kind}
//                         style={layer.styles[kind]!}
//                         props={allProps}
//                         numericProps={numericProps}
//                         onChange={(p) => updateStyle(kind, p)}
//                         onUploadIcon={onUploadIcon}
//                         onApplyIcons={onApplyIcons}      // ← pass it down
//                         layer={layer}
//                     />

//                     {/* Filters (all geometries) */}
//                     <FiltersBlock
//                         props={allProps}
//                         value={(layer.styles as any)[kind]?.filters}
//                         onChange={(f) => updateStyle(kind, { filters: f })}
//                         onApply={onApplyFilters}
//                     />

//                     {/* Apply to map immediately (base layers handled in parent useEffect) */}
//                     {map && <ApplyToMap map={map} layer={layer} kind={kind} />}
//                 </Card>
//             ))}
//         </div>
//     );
// }

function LayerEditor({
    map, layer, onChange,
    onUploadIcon, onApplyIcons, onApplyFilters
}: {
    map: maplibregl.Map | null;
    layer: UserLayer;
    onChange: (l: UserLayer) => void;
    onUploadIcon: (value: string, file: File) => void;
    onApplyIcons: () => void;
    onApplyFilters: () => void;
}) {
    const propsInfo = useMemo(() => extractProps(layer.data), [layer.data]);
    const allProps = Object.keys(propsInfo);
    const numericProps = allProps.filter(k => propsInfo[k].numeric);

    // Optional: show feature counts per geometry kind for nicer UI badges
    const kindCounts = useMemo(() => {
        const counts: Record<GeometryKind, number> = { polygon: 0, line: 0, point: 0 };
        try {
            for (const f of layer.data.features) {
                const t = f.geometry?.type;
                if (!t) continue;
                if (t === "Point" || t === "MultiPoint") counts.point++;
                else if (t === "LineString" || t === "MultiLineString") counts.line++;
                else if (t === "Polygon" || t === "MultiPolygon") counts.polygon++;
            }
        } catch { }
        return counts;
    }, [layer.data]);

    function updateStyle(kind: GeometryKind, patch: Partial<UserGeomStyle> | any) {
        const next: UserLayer = {
            ...layer,
            styles: { ...layer.styles, [kind]: { ...layer.styles[kind]!, ...patch } }
        };
        onChange(next);
    }

    return (
        <div className="space-y-3">
            {(["polygon", "line", "point"] as GeometryKind[]).map(kind => layer.styles[kind] && (
                <Card key={kind} className="bg-background/70 overflow-hidden">
                    <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <span className="capitalize">{kind}</span>
                                <Badge variant="secondary">{kindCounts[kind]}</Badge>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`visible-${layer.id}-${kind}`} className="text-xs text-muted-foreground">
                                    Visible
                                </Label>
                                <Switch
                                    id={`visible-${layer.id}-${kind}`}
                                    checked={!!layer.styles[kind]?.visible}
                                    onCheckedChange={(v) => updateStyle(kind, { visible: v })}
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                        {/* Style controls */}
                        <StyleBlock
                            kind={kind}
                            style={layer.styles[kind]!}
                            props={allProps}
                            numericProps={numericProps}
                            onChange={(p) => updateStyle(kind, p)}
                            onUploadIcon={onUploadIcon}
                            onApplyIcons={onApplyIcons}
                            layer={layer}
                        />

                        <Separator className="my-3" />

                        {/* Filters (all geometries) */}
                        <FiltersBlock
                            props={allProps}
                            value={(layer.styles as any)[kind]?.filters}
                            onChange={(f) => updateStyle(kind, { filters: f })}
                            onApply={onApplyFilters}
                        />

                        {/* Apply to map immediately (base upserts handled by parent useEffect) */}
                        {map && <ApplyToMap map={map} layer={layer} kind={kind} />}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/* ---------- Style + Icons ---------- */

type StyleModeEx = "single" | "categorical" | "graduated";

// function StyleBlock({
//     kind, style, props, numericProps, onChange, onUploadIcon, onApplyIcons
// }: {
//     kind: GeometryKind;
//     style: any; // allow extensions (icons, filters)
//     props: string[];
//     numericProps: string[];
//     onChange: (p: Partial<UserGeomStyle> | any) => void;
//     onUploadIcon: (value: string, file: File) => void;
//     onApplyIcons: () => void;
//     layer: UserLayer;
// }) {
//     const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>("OrRd");

//     // graduated breaks recompute (equal/quantile/jenks)
//     useEffect(() => {
//         if (style.mode !== "graduated" || !style.gradProperty) return;
//         const fc = (window as any).__lastFCGetter?.() as GeoJSON.FeatureCollection | undefined;
//         if (!fc) return;
//         const vals = collectNumeric(fc, style.gradProperty);
//         const classes = Math.max(3, Math.min(9, style.gradClasses ?? 5));
//         const method = (style.gradMethod || "equal") as GraduatedMethod | "jenks";
//         const breaks =
//             method === "equal" ? equalBreaks(vals, classes) :
//                 method === "quantile" ? quantileBreaks(vals, classes) :
//                     jenksBreaks(vals, classes);
//         const pal = PALETTES[paletteKey];
//         const colors = pal.length >= classes + 1
//             ? pal.slice(0, classes + 1)
//             : [...pal, ...new Array(classes + 1 - pal.length).fill(pal[pal.length - 1])];
//         onChange({ gradBreaks: breaks, gradPalette: colors });
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [style.mode, style.gradProperty, style.gradMethod, style.gradClasses, paletteKey]);

//     // categories list for icons (points only)
//     const [catValues, setCatValues] = useState<string[]>([]);
//     useEffect(() => {
//         if (kind !== "point" || style.mode !== "categorical" || !style.catProperty) { setCatValues([]); return; }
//         try {
//             const fc = (window as any).__lastFCGetter?.() as GeoJSON.FeatureCollection | undefined;
//             if (!fc) return;
//             const uniq = new Map<string, number>();
//             for (const f of fc.features) {
//                 const v = String((f.properties as any)?.[style.catProperty] ?? "");
//                 uniq.set(v, (uniq.get(v) ?? 0) + 1);
//             }
//             const top = [...uniq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([v]) => v);
//             setCatValues(top);
//         } catch { }
//     }, [kind, style.mode, style.catProperty]);

//     return (
//         <div className="space-y-3 text-xs">
//             {/* Mode */}
//             <div className="grid grid-cols-3 gap-2">
//                 {(["single", "categorical", "graduated"] as StyleModeEx[]).map(m => (
//                     <button
//                         key={m}
//                         className={`px-2 py-1 rounded-xl border transition
//               ${style.mode === m ? "bg-blue-600 border-blue-600 text-white"
//                                 : "bg-white border-white/60 hover:bg-white/70"}`}
//                         onClick={() => onChange({ mode: m as any })}
//                     >
//                         {m}
//                     </button>
//                 ))}
//             </div>

//             {/* Single symbol */}
//             {style.mode === "single" && (
//                 <div className="grid grid-cols-2 gap-3">
//                     <label>Color
//                         <input type="color" className="w-full h-9 block border rounded"
//                             value={style.color} onChange={e => onChange({ color: e.target.value })} />
//                     </label>
//                     <label>Opacity
//                         <input type="range" min={0.1} max={1} step={0.05} value={style.opacity}
//                             onChange={e => onChange({ opacity: Number(e.target.value) })} className="w-full" />
//                     </label>
//                     <label>{kind === "line" ? "Width" : "Size"}
//                         <input type="number" className="w-full border rounded px-2 py-1"
//                             value={style.size} onChange={e => onChange({ size: Number(e.target.value) })} />
//                     </label>
//                     <label>Outline width
//                         <input type="number" className="w-full border rounded px-2 py-1"
//                             value={style.outlineWidth} onChange={e => onChange({ outlineWidth: Number(e.target.value) })} />
//                     </label>
//                     <label>Outline color
//                         <input type="color" className="w-full h-9 block border rounded"
//                             value={style.outlineColor} onChange={e => onChange({ outlineColor: e.target.value })} />
//                     </label>
//                 </div>
//             )}

//             {/* Categorical */}
//             {style.mode === "categorical" && (
//                 <div className="space-y-2">
//                     <label>Property
//                         <select className="w-full border rounded px-2 py-1"
//                             value={style.catProperty || ""} onChange={e => onChange({ catProperty: e.target.value })}>
//                             <option value="" disabled>Select…</option>
//                             {props.map(p => <option key={p} value={p}>{p}</option>)}
//                         </select>
//                     </label>

//                     {/* Basic color mapping UI stays as-is (from previous version) */}
//                     <CatEditor
//                         prop={style.catProperty}
//                         mapping={style.catMapping}
//                         onChange={(m) => onChange({ catMapping: m })}
//                     />

//                     {/* Icons (points only) */}
//                     {kind === "point" && (
//                         <div className="mt-2 rounded-xl border border-white/60 bg-white/70 backdrop-blur p-2">
//                             <div className="flex items-center justify-between">
//                                 <div className="font-medium">Icons</div>
//                                 <label className="flex items-center gap-2">
//                                     <input type="checkbox" checked={!!style.useIcons}
//                                         onChange={(e) => onChange({ useIcons: e.target.checked })} />
//                                     <span>Use icons instead of circles</span>
//                                 </label>
//                             </div>

//                             <div className="grid grid-cols-1 gap-2 mt-2">
//                                 <label>Icon property
//                                     <select className="w-full border rounded px-2 py-1"
//                                         value={style.iconProp || ""} onChange={e => onChange({ iconProp: e.target.value })}>
//                                         <option value="" disabled>Select…</option>
//                                         {props.map(p => <option key={p} value={p}>{p}</option>)}
//                                     </select>
//                                 </label>

//                                 <label>Icon size (relative)
//                                     <input type="number" step={0.1} className="w-full border rounded px-2 py-1"
//                                         value={style.iconSize ?? 1} onChange={e => onChange({ iconSize: Number(e.target.value) })} />
//                                 </label>

//                                 {!!style.iconProp && (
//                                     <div className="space-y-1">
//                                         <div className="text-[11px] opacity-70">Upload an icon per category (top {catValues.length})</div>
//                                         {catValues.map(val => (
//                                             <div key={val} className="flex items-center justify-between gap-2">
//                                                 <div className="truncate">{val || <em>(empty)</em>}</div>
//                                                 <div className="inline-flex items-center gap-2">
//                                                     <input type="file" accept="image/*"
//                                                         onChange={(e) => {
//                                                             const f = e.currentTarget.files?.[0];
//                                                             if (!f) return;
//                                                             onUploadIcon(val, f);
//                                                         }} />
//                                                 </div>
//                                             </div>
//                                         ))}
//                                         <div className="text-[11px] opacity-60">After uploading, click “Apply icons” to refresh the layer.</div>
//                                     </div>
//                                 )}

//                                 <div className="flex justify-end">
//                                     <Button size="sm" type="button" onClick={onApplyIcons}>Apply icons</Button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* Graduated */}
//             {style.mode === "graduated" && (
//                 <div className="space-y-2">
//                     <div className="grid grid-cols-2 gap-2">
//                         <label>Property
//                             <select className="w-full border rounded px-2 py-1"
//                                 value={style.gradProperty || ""} onChange={e => onChange({ gradProperty: e.target.value })}>
//                                 <option value="" disabled>Select…</option>
//                                 {numericProps.map(p => <option key={p} value={p}>{p}</option>)}
//                             </select>
//                         </label>
//                         <label>Method
//                             <select className="w-full border rounded px-2 py-1"
//                                 value={style.gradMethod || "equal"}
//                                 onChange={e => onChange({ gradMethod: e.target.value as GraduatedMethod | "jenks" })}>
//                                 <option value="equal">equal</option>
//                                 <option value="quantile">quantile</option>
//                                 <option value="jenks">jenks</option>
//                             </select>
//                         </label>
//                         <label>Classes
//                             <input type="number" min={3} max={9} className="w-full border rounded px-2 py-1"
//                                 value={style.gradClasses ?? 5} onChange={e => onChange({ gradClasses: Number(e.target.value) })} />
//                         </label>
//                         <label>Palette
//                             <select className="w-full border rounded px-2 py-1" value={String(paletteKey)} onChange={e => setPaletteKey(e.target.value as any)}>
//                                 {Object.keys(PALETTES).map(k => <option key={k} value={k}>{k}</option>)}
//                             </select>
//                         </label>
//                     </div>

//                     {style.gradBreaks && style.gradPalette && (
//                         <Legend blocks={legendFromBreaks(style.gradBreaks, style.gradPalette)} />
//                     )}
//                 </div>
//             )}

//             {/* Labels */}
//             <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/50">
//                 <label>Label property
//                     <select className="w-full border rounded px-2 py-1"
//                         value={style.labelProperty || ""} onChange={e => onChange({ labelProperty: e.target.value || undefined })}>
//                         <option value="">(none)</option>
//                         {props.map(p => <option key={p} value={p}>{p}</option>)}
//                     </select>
//                 </label>
//                 <label>Label size
//                     <input type="number" className="w-full border rounded px-2 py-1"
//                         value={style.labelSize ?? 12} onChange={e => onChange({ labelSize: Number(e.target.value) })} />
//                 </label>
//             </div>
//         </div>
//     );
// }

function StyleBlock({
    kind, style, props, numericProps, onChange, onUploadIcon, onApplyIcons
}: {
    kind: GeometryKind;
    style: any; // allow extensions (icons, filters)
    props: string[];
    numericProps: string[];
    onChange: (p: Partial<UserGeomStyle> | any) => void;
    onUploadIcon: (value: string, file: File) => void;
    onApplyIcons: () => void;
    layer: UserLayer;
}) {
    const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>("OrRd");

    // graduated breaks recompute (equal/quantile/jenks)
    useEffect(() => {
        if (style.mode !== "graduated" || !style.gradProperty) return;
        const fc = (window as any).__lastFCGetter?.() as GeoJSON.FeatureCollection | undefined;
        if (!fc) return;
        const vals = collectNumeric(fc, style.gradProperty);
        const classes = Math.max(3, Math.min(9, style.gradClasses ?? 5));
        const method = (style.gradMethod || "equal") as GraduatedMethod | "jenks";
        const breaks =
            method === "equal" ? equalBreaks(vals, classes)
                : method === "quantile" ? quantileBreaks(vals, classes)
                    : jenksBreaks(vals, classes);
        const pal = PALETTES[paletteKey];
        const colors = pal.length >= classes + 1
            ? pal.slice(0, classes + 1)
            : [...pal, ...new Array(classes + 1 - pal.length).fill(pal[pal.length - 1])];
        onChange({ gradBreaks: breaks, gradPalette: colors });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [style.mode, style.gradProperty, style.gradMethod, style.gradClasses, paletteKey]);

    // categories list for icons (points only)
    const [catValues, setCatValues] = useState<string[]>([]);
    useEffect(() => {
        if (kind !== "point" || style.mode !== "categorical" || !style.catProperty) { setCatValues([]); return; }
        try {
            const fc = (window as any).__lastFCGetter?.() as GeoJSON.FeatureCollection | undefined;
            if (!fc) return;
            const uniq = new Map<string, number>();
            for (const f of fc.features) {
                const v = String((f.properties as any)?.[style.catProperty] ?? "");
                uniq.set(v, (uniq.get(v) ?? 0) + 1);
            }
            const top = [...uniq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([v]) => v);
            setCatValues(top);
        } catch { }
    }, [kind, style.mode, style.catProperty]);

    return (
        <div className="space-y-4 text-xs">
            {/* Mode */}
            <div className="grid grid-cols-3 gap-2">
                {(["single", "categorical", "graduated"] as StyleModeEx[]).map(m => (
                    <Button
                        key={m}
                        size="sm"
                        variant={style.mode === m ? "default" : "secondary"}
                        className="capitalize"
                        onClick={() => onChange({ mode: m as any })}
                    >
                        {m}
                    </Button>
                ))}
            </div>

            {/* Single symbol */}
            {style.mode === "single" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Color</Label>
                        <input
                            type="color"
                            className="h-9 w-full rounded-md border border-input bg-background"
                            value={style.color}
                            onChange={e => onChange({ color: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Opacity</Label>
                        <Slider
                            value={[Number(style.opacity ?? 1)]}
                            onValueChange={(v) => onChange({ opacity: v[0] })}
                            min={0.1}
                            max={1}
                            step={0.05}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>{kind === "line" ? "Width" : "Size"}</Label>
                        <Input
                            type="number"
                            value={style.size}
                            onChange={e => onChange({ size: Number(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Outline width</Label>
                        <Input
                            type="number"
                            value={style.outlineWidth}
                            onChange={e => onChange({ outlineWidth: Number(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Outline color</Label>
                        <input
                            type="color"
                            className="h-9 w-full rounded-md border border-input bg-background"
                            value={style.outlineColor}
                            onChange={e => onChange({ outlineColor: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {/* Categorical */}
            {style.mode === "categorical" && (
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>Property</Label>
                        <Select
                            value={String(style.catProperty || "")}
                            onValueChange={(v) => onChange({ catProperty: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                                {props.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <CatEditor
                        prop={style.catProperty}
                        mapping={style.catMapping}
                        onChange={(m) => onChange({ catMapping: m })}
                    />

                    {/* Icons (points only) */}
                    {kind === "point" && (
                        <Card className="mt-2">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Icons</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">Use icons instead of circles</div>
                                    <Switch
                                        checked={!!style.useIcons}
                                        onCheckedChange={(v) => onChange({ useIcons: v })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <div className="space-y-1">
                                        <Label>Icon property</Label>
                                        <Select
                                            value={String(style.iconProp || "")}
                                            onValueChange={(v) => onChange({ iconProp: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {props.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Icon size (relative)</Label>
                                        <Input
                                            type="number"
                                            step={0.1}
                                            value={style.iconSize ?? 1}
                                            onChange={(e) => onChange({ iconSize: Number(e.target.value) })}
                                        />
                                    </div>

                                    {!!style.iconProp && (
                                        <div className="space-y-2">
                                            <div className="text-[11px] text-muted-foreground">
                                                Upload an icon per category (top {catValues.length})
                                            </div>
                                            {catValues.map(val => (
                                                <div key={val} className="flex items-center justify-between gap-2">
                                                    <div className="truncate text-sm">{val || <em>(empty)</em>}</div>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const f = e.currentTarget.files?.[0];
                                                            if (!f) return;
                                                            onUploadIcon(val, f);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            <div className="text-[11px] text-muted-foreground">
                                                After uploading, click “Apply icons” to refresh the layer.
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button size="sm" type="button" onClick={onApplyIcons}>Apply icons</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Graduated */}
            {style.mode === "graduated" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Property</Label>
                            <Select
                                value={String(style.gradProperty || "")}
                                onValueChange={(v) => onChange({ gradProperty: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>
                                    {numericProps.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Method</Label>
                            <Select
                                value={String(style.gradMethod || "equal")}
                                onValueChange={(v) => onChange({ gradMethod: v as GraduatedMethod | "jenks" })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equal">equal</SelectItem>
                                    <SelectItem value="quantile">quantile</SelectItem>
                                    <SelectItem value="jenks">jenks</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Classes</Label>
                            <Input
                                type="number"
                                min={3}
                                max={9}
                                value={style.gradClasses ?? 5}
                                onChange={(e) => onChange({ gradClasses: Number(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Palette</Label>
                            <Select value={String(paletteKey)} onValueChange={(v) => setPaletteKey(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.keys(PALETTES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {style.gradBreaks && style.gradPalette && (
                        <Legend blocks={legendFromBreaks(style.gradBreaks, style.gradPalette)} />
                    )}
                </div>
            )}

            {/* Labels */}
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label>Label property</Label>
                    <Select
                        // allow "" to show the placeholder when nothing is selected
                        value={style.labelProperty ?? ""}
                        onValueChange={(v) =>
                            onChange({ labelProperty: v === NONE_VALUE ? undefined : v })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="(none)" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* use a non-empty sentinel for “none” */}
                            <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                            {props.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label>Label size</Label>
                    <Input
                        type="number"
                        value={style.labelSize ?? 12}
                        onChange={(e) => onChange({ labelSize: Number(e.target.value) })}
                    />
                </div>
            </div>
        </div>
    );
}

/* ---------- Filters Block ---------- */

// function FiltersBlock({
//     props, value, onChange, onApply
// }: {
//     props: string[];
//     value?: { combine: "AND" | "OR"; rules: { prop: string; op: string; val: string }[] };
//     onChange: (f: any) => void;
//     onApply: () => void;
// }) {
//     const filters = value || { combine: "AND", rules: [] as any[] };

//     function setRule(i: number, patch: Partial<{ prop: string; op: string; val: string }>) {
//         const rules = filters.rules.slice();
//         rules[i] = { ...rules[i], ...patch };
//         onChange({ ...filters, rules });
//     }
//     function addRule() {
//         onChange({ ...filters, rules: [...filters.rules, { prop: "", op: "=", val: "" }] });
//     }
//     function delRule(i: number) {
//         const rules = filters.rules.slice(); rules.splice(i, 1);
//         onChange({ ...filters, rules });
//     }

//     return (
//         <div className="mt-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur p-2">
//             <div className="flex items-center justify-between mb-2">
//                 <div className="font-medium">Filters</div>
//                 <div className="inline-flex items-center gap-2">
//                     <select
//                         className="border rounded px-2 py-1 text-xs"
//                         value={filters.combine}
//                         onChange={(e) => onChange({ ...filters, combine: e.target.value })}
//                     >
//                         <option value="AND">AND</option>
//                         <option value="OR">OR</option>
//                     </select>
//                     <Button size="sm" variant="secondary" className="bg-white/80" onClick={addRule}>Add rule</Button>
//                     <Button size="sm" onClick={onApply}>Apply</Button>
//                 </div>
//             </div>

//             <div className="grid gap-2">
//                 {filters.rules.map((r, i) => (
//                     <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
//                         <select className="border rounded px-2 py-1 text-xs" value={r.prop}
//                             onChange={(e) => setRule(i, { prop: e.target.value })}>
//                             <option value="" disabled>Property…</option>
//                             {props.map(p => <option key={p} value={p}>{p}</option>)}
//                         </select>
//                         <select className="border rounded px-2 py-1 text-xs" value={r.op}
//                             onChange={(e) => setRule(i, { op: e.target.value })}>
//                             <option value="=">=</option>
//                             <option value="!=">!=</option>
//                             <option value=">">&gt;</option>
//                             <option value=">=">&gt;=</option>
//                             <option value="<">&lt;</option>
//                             <option value="<=">&lt;=</option>
//                             <option value="contains">contains</option>
//                         </select>
//                         <input className="border rounded px-2 py-1 text-xs" value={r.val}
//                             onChange={(e) => setRule(i, { val: e.target.value })} placeholder="value" />
//                         <Button size="icon" variant="ghost" onClick={() => delRule(i)} title="Remove">
//                             <X className="w-4 h-4" />
//                         </Button>
//                     </div>
//                 ))}
//                 {!filters.rules.length && <div className="text-[11px] opacity-60">No filters.</div>}
//             </div>
//         </div>
//     );
// }


function FiltersBlock({
    props, value, onChange, onApply
}: {
    props: string[];
    value?: { combine: "AND" | "OR"; rules: { prop: string; op: string; val: string }[] };
    onChange: (f: any) => void;
    onApply: () => void;
}) {
    const filters = value || { combine: "AND", rules: [] as any[] };

    function setRule(i: number, patch: Partial<{ prop: string; op: string; val: string }>) {
        const rules = filters.rules.slice();
        rules[i] = { ...rules[i], ...patch };
        onChange({ ...filters, rules });
    }
    function addRule() {
        onChange({ ...filters, rules: [...filters.rules, { prop: "", op: "=", val: "" }] });
    }
    function delRule(i: number) {
        const rules = filters.rules.slice(); rules.splice(i, 1);
        onChange({ ...filters, rules });
    }

    return (
        <Card className="rounded-xl bg-background/70">
            <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">Filters</CardTitle>
                    <div className="inline-flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">Combine</div>
                        <Select
                            value={filters.combine}
                            onValueChange={(v: "AND" | "OR") => onChange({ ...filters, combine: v })}
                        >
                            <SelectTrigger className="h-8 w-[110px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" variant="secondary" onClick={addRule}>Add rule</Button>
                        <Button size="sm" onClick={onApply}>Apply</Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="grid gap-2">
                    {filters.rules.map((r, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                            {/* Property */}
                            <Select
                                value={r.prop || undefined}
                                onValueChange={(v) => setRule(i, { prop: v })}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Property…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {props.map((p) => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Operator */}
                            <Select
                                value={r.op}
                                onValueChange={(v) => setRule(i, { op: v })}
                            >
                                <SelectTrigger className="h-8 w-[96px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="!=">!=</SelectItem>
                                    <SelectItem value=">">&gt;</SelectItem>
                                    <SelectItem value=">=">&gt;=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value="<=">&lt;=</SelectItem>
                                    <SelectItem value="contains">contains</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Value */}
                            <Input
                                className="h-8"
                                value={r.val}
                                onChange={(e) => setRule(i, { val: e.target.value })}
                                placeholder="value"
                            />

                            {/* Remove */}
                            <Button size="icon" variant="ghost" onClick={() => delRule(i)} title="Remove">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    {!filters.rules.length && (
                        <div className="text-[11px] text-muted-foreground">No filters.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
/* ---------- Categorical color helper (unchanged) ---------- */

// function CatEditor({ prop, mapping, onChange }: {
//     prop?: string;
//     mapping?: Record<string, string>;
//     onChange: (m: Record<string, string>) => void;
// }) {
//     const [rows, setRows] = useState<{ v: string; c: string }[]>([]);

//     useEffect(() => {
//         if (!prop) return;
//         try {
//             const fc = (window as any).__lastFCGetter?.() as GeoJSON.FeatureCollection | undefined;
//             if (!fc) return;
//             const uniq = new Map<string, number>();
//             for (const f of fc.features) {
//                 const v = String((f.properties as any)?.[prop] ?? "");
//                 uniq.set(v, (uniq.get(v) ?? 0) + 1);
//             }
//             const top = [...uniq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([v]) => v);
//             setRows(top.map((v, i) => ({ v, c: mapping?.[v] || autoColor(i) })));
//         } catch { }
//     }, [prop]);

//     function autoColor(i: number) {
//         const s = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"];
//         return s[i % s.length];
//     }

//     useEffect(() => {
//         const out: Record<string, string> = {};
//         for (const r of rows) out[r.v] = r.c;
//         if (prop) onChange(out);
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [rows]);

//     if (!prop) return null;

//     return (
//         <div className="space-y-1">
//             {rows.map((r, i) => (
//                 <div key={i} className="flex items-center gap-2">
//                     <div className="flex-1 truncate">{r.v || <em>(empty)</em>}</div>
//                     <input type="color" value={r.c} onChange={e => {
//                         const next = rows.slice(); next[i] = { ...r, c: e.target.value }; setRows(next);
//                     }} />
//                 </div>
//             ))}
//             <div className="text-[11px] text-neutral-600">Colors shown for top {rows.length} categories.</div>
//         </div>
//     );
// }

function CatEditor({
    prop,
    mapping,
    onChange,
}: {
    prop?: string;
    mapping?: Record<string, string>;
    onChange: (m: Record<string, string>) => void;
}) {
    const [rows, setRows] = useState<{ v: string; c: string }[]>([]);

    useEffect(() => {
        if (!prop) return;
        try {
            const fc = (window as any).__lastFCGetter?.() as
                | GeoJSON.FeatureCollection
                | undefined;
            if (!fc) return;
            const uniq = new Map<string, number>();
            for (const f of fc.features) {
                const v = String((f.properties as any)?.[prop] ?? "");
                uniq.set(v, (uniq.get(v) ?? 0) + 1);
            }
            const top = [...uniq.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([v]) => v);
            setRows(top.map((v, i) => ({ v, c: mapping?.[v] || autoColor(i) })));
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prop]);

    function autoColor(i: number) {
        const s = [
            "#66c2a5",
            "#fc8d62",
            "#8da0cb",
            "#e78ac3",
            "#a6d854",
            "#ffd92f",
            "#e5c494",
            "#b3b3b3",
        ];
        return s[i % s.length];
    }

    useEffect(() => {
        const out: Record<string, string> = {};
        for (const r of rows) out[r.v] = r.c;
        if (prop) onChange(out);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows]);

    if (!prop) return null;

    return (
        <Card className="bg-background/70 overflow-hidden">
            <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">Categories</CardTitle>
                    <Badge variant="secondary">{rows.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 overflow-hidden">
                <ScrollArea className="h-48">
                    <div className="space-y-2 pr-2">
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 rounded-md border px-2 py-1.5 overflow-hidden"
                            >
                                <div className="flex-1 min-w-0 truncate text-sm">
                                    {r.v || <em>(empty)</em>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className="h-4 w-4 rounded border"
                                        style={{ background: r.c }}
                                        aria-hidden
                                    />
                                    <input
                                        type="color"
                                        value={r.c}
                                        onChange={(e) => {
                                            const next = rows.slice();
                                            next[i] = { ...r, c: e.target.value };
                                            setRows(next);
                                        }}
                                        className="h-8 w-8 rounded-md border border-input bg-background p-0"
                                        title={`Pick color for ${r.v || "(empty)"}`}
                                    />
                                </div>
                            </div>
                        ))}
                        {!rows.length && (
                            <div className="text-[11px] text-muted-foreground px-1">
                                No categories to show.
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="text-[11px] text-muted-foreground">
                    Colors shown for top {rows.length} categories.
                </div>
            </CardContent>
        </Card>
    );
}

/* ---------- Legend ---------- */

function Legend({ blocks }: { blocks: { label: string; color: string }[] }) {
    return (
        <Card className="bg-background/70">
            <CardHeader className="py-3">
                <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {blocks.map((b, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span
                                className="w-4 h-4 rounded-sm border"
                                style={{ background: b.color }}
                            />
                            <span className="truncate">{b.label}</span>
                        </div>
                    ))}
                    {!blocks?.length && (
                        <div className="text-[11px] text-muted-foreground">
                            No legend entries.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/* ---------- Apply hook (base upserts) ---------- */

function ApplyToMap({ map, layer, kind }: {
    map: maplibregl.Map;
    layer: UserLayer;
    kind: GeometryKind;
}) {
    useEffect(() => { (window as any).__lastFCGetter = () => layer.data; }, [layer.data]);
    useEffect(() => { upsertGeomLayers(map, layer, kind); }, [map, layer.styles[kind]]);
    return null;
}
