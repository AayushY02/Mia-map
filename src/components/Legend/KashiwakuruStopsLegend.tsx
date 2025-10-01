// components/KashiwakuruStopsLegend.tsx
import React from "react";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** ---------- Types ---------- */
type InterpolateStop = [value: number, radius: number];

type LayerLegendConfig = {
    id: string;
    label: string;
    color: string;
    border?: string;   // outline color (useful if color is light/white)
    opacity?: number;
    stops: InterpolateStop[];
    visible: boolean;
};

/** ---------- Helpers ---------- */
const fmt = (n: number) => new Intl.NumberFormat().format(n);

function stopsToItems(stops: InterpolateStop[]) {
    const s = [...stops].sort((a, b) => a[0] - b[0]);
    return s.map(([v, r], i) => {
        const next = s[i + 1]?.[0];
        return { label: next === undefined ? `${fmt(v)} –` : `${fmt(v)} – ${fmt(next)}`, radius: r };
    });
}

const stopsKey = (stops: InterpolateStop[]) =>
    JSON.stringify([...stops].sort((a, b) => a[0] - b[0]));

/** ---------- Size legend (fixed swatch column so labels align) ---------- */
function SizeLegendInline({
    color,
    strokeColor = "#ffffff",
    opacity = 0.8,
    stops,
}: {
    color: string;
    strokeColor?: string;
    opacity?: number;
    stops: InterpolateStop[];
}) {
    const items = stopsToItems(stops);
    const maxR = Math.max(...stops.map(([, r]) => r));
    const maxD = maxR * 2; // max diameter for the swatch column

    return (
        <ul className="space-y-2" style={{ ["--swatch" as any]: `${maxD}px` }}>
            {items.map((it, i) => (
                <li
                    key={i}
                    className="grid grid-cols-[var(--swatch)_1fr] items-center gap-3 text-xs text-gray-800"
                >
                    {/* Fixed-width swatch cell, circle centered inside */}
                    <span className="relative inline-flex items-center justify-center h-[var(--swatch)] w-[var(--swatch)]">
                        <span
                            className="block rounded-full"
                            style={{
                                width: it.radius * 2,
                                height: it.radius * 2,
                                backgroundColor: color,
                                opacity,
                                outline: `1px solid ${strokeColor}`,
                            }}
                        />
                    </span>
                    <span className="tabular-nums font-mono">{it.label}</span>
                </li>
            ))}
        </ul>
    );
}

/** ---------- Multi-layer legend (COMPACT mode by default) ---------- */
const MultiLayerSizeLegend: React.FC<{
    layers: LayerLegendConfig[];
    /** Only show layers whose `visible` is true (default: true) */
    onlyVisible?: boolean;
}> = ({ layers, onlyVisible = true }) => {
    const filtered = onlyVisible ? layers.filter((l) => l.visible) : layers;
    if (filtered.length === 0) {
        return <div className="text-xs text-gray-500">表示中の凡例はありません。</div>;
    }

    // Group layers by identical stops so each group renders one size scale
    const groups = new Map<string, { stops: InterpolateStop[]; layers: LayerLegendConfig[] }>();
    filtered.forEach((l) => {
        const key = stopsKey(l.stops);
        const g = groups.get(key);
        g ? g.layers.push(l) : groups.set(key, { stops: l.stops, layers: [l] });
    });

    return (
        <div className="space-y-4">
            {[...groups.values()].map((group, idx) => (
                <div key={idx} className="space-y-2">

                    {/* Color key list — fixed 20px swatch column keeps labels aligned */}
                    <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
                        <div className="text-xs font-semibold text-gray-900 mb-2">レイヤー</div>
                        <ul className="grid grid-cols-1 gap-2">
                            {group.layers.map((l) => (
                                <li
                                    key={l.id}
                                    className="grid grid-cols-[20px_1fr] items-center gap-2 text-xs text-gray-800"
                                >
                                    <span
                                        className="inline-block h-3 w-3 rounded-full"
                                        style={{
                                            backgroundColor: l.color,
                                            outline: `1px solid ${l.border ?? "rgba(0,0,0,0.1)"}`,
                                        }}
                                    />
                                    <span className="leading-none text-black">{l.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Single neutral size scale (teaches size mapping) */}
                    <SizeLegendInline
                        color="#000"
                        strokeColor="#ffffff"
                        opacity={1}
                        stops={group.stops}
                    />
                </div>
            ))}
        </div>
    );
};

/** ---------- Exported legend for 「カシワニクル乗降場」 ---------- */
export default function KashiwakuruStopsLegend({
    className,
    newbusLayerVisible,
    newKashiwakuruRideLayerVisible,
    newKashiwakuruDropLayerVisible,
}: {
    className?: string;
    newbusLayerVisible: boolean;
    newKashiwakuruRideLayerVisible: boolean;
    newKashiwakuruDropLayerVisible: boolean;
}) {
    // Don’t render at all if none are on
    const anyVisible =
        newbusLayerVisible || newKashiwakuruRideLayerVisible || newKashiwakuruDropLayerVisible;
    if (!anyVisible) return null;

    // Use the same radius stops as your Mapbox layer’s circle-radius expression
    const sharedStops: InterpolateStop[] = [
        [0, 4],
        [10, 6],
        [50, 10],
        [100, 14],
        [500, 20],
        [1000, 28],
        [3000, 36],
    ];

    // Colors and optional borders (adjust to match your actual layer paint)
    const layers: LayerLegendConfig[] = [
        {
            id: "new-bus",
            label: "バス停レイヤー",
            color: "#fff",
            border: "#299999",
            stops: sharedStops,
            visible: newbusLayerVisible,
            opacity: 0.8,
        },
        {
            id: "k-ride",
            label: "カシワニクル乗車",
            color: "#543553",
            border: "#fff",
            stops: sharedStops,
            visible: newKashiwakuruRideLayerVisible,
            opacity: 0.8,
        },
        {
            id: "k-drop",
            label: "カシワニクル降車",
            color: "#d42",
            border: "#fff",
            stops: sharedStops,
            visible: newKashiwakuruDropLayerVisible,
            opacity: 0.8,
        },
    ];

    return (
        <Card className={clsx("bg-white  p-3 rounded-2xl text-xs", className)}>
            <div className="space-y-2">
                <CardHeader className="p-0">
                    <CardTitle className="font-semibold text-center text-sm">カシワニクル乗降場</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-2">
                    <MultiLayerSizeLegend layers={layers} onlyVisible />
                </CardContent>
            </div>
        </Card>
    );
}
