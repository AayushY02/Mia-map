import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import clsx from "clsx";

/** ---------- Types ---------- */
type InterpolateStop = [value: number, radius: number];

type LayerLegendConfig = {
  id: string;
  label: string;
  color: string;
  strokeColor?: string;
  opacity?: number;
  stops: InterpolateStop[];
  visible: boolean;
  border?: string;
};

type RouteLegendConfig = {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  width?: number; // px
};

type Props = {
  busPassengerLayerVisible: boolean;
  sakaeCourseRideLayerVisible: boolean;
  sakaeCourseDropLayerVisible: boolean;
  masuoCourseRideLayerVisible: boolean;
  masuoCourseDropLayerVisible: boolean;
  shonanCourseRideLayerVisible: boolean;
  shonanCourseDropLayerVisible: boolean;

  /** NEW: course route line legends */
  sakaiRouteVisible: boolean;
  masuoRouteVisible: boolean;
  shonanRouteVisible: boolean;

  waniOutboundRideLayerVisible: boolean;
  waniOutboundDropLayerVisible: boolean;
  waniReturnRideLayerVisible: boolean;
  waniReturnDropLayerVisible: boolean;
  waniRouteVisible: boolean;
};

/** ---------- Small reusable size legend (inline) ---------- */
function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}
function stopsToLabels(stops: InterpolateStop[]) {
  const s = [...stops].sort((a, b) => a[0] - b[0]);
  return s.map(([v, r], idx) => {
    const next = s[idx + 1]?.[0];
    const label = next === undefined ? `${formatNumber(v)} –` : `${formatNumber(v)} – ${formatNumber(next)}`;
    return { label, radius: r };
  });
}
const SizeLegendInline: React.FC<{
  title?: string;
  subtitle?: string;
  color: string;
  strokeColor?: string;
  opacity?: number;
  stops: InterpolateStop[];
}> = ({ title, subtitle, color, strokeColor = "#fff", opacity = 0.8, stops }) => {
  const items = stopsToLabels(stops);
  const maxR = Math.max(...stops.map(([, r]) => r));
  const maxD = maxR * 2;
  return (
    <div className="rounded-xl bg-white/90 p-3 ">
      {(title || subtitle) && (
        <div className="mb-2">
          {title && <div className="text-sm font-semibold ">{title}</div>}
          {subtitle && <div className="text-xs ">{subtitle}</div>}
        </div>
      )}
      <ul className="space-y-2" style={{ ["--swatch" as any]: `${maxD}px` }}>
        {items.map((it, i) => (
          <li key={i} className="grid grid-cols-[var(--swatch)_1fr] items-center gap-3 text-xs ">
            {/* Fixed-width swatch cell */}
            <span className="relative inline-flex items-center justify-center h-[var(--swatch)] w-[var(--swatch)]">
              <span
                className="block rounded-full"
                style={{
                  width: it.radius * 2,
                  height: it.radius * 2,
                  backgroundColor: color,
                  opacity,
                  outline: `1px solid ${strokeColor}`, // crisp border
                }}
              />
            </span>
            <span className="tabular-nums font-mono">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** ---------- Small inline line legend for course routes ---------- */
const LineLegendInline: React.FC<{ items: RouteLegendConfig[]; title?: string }> = ({ items, title }) => {
  const visible = items.filter((i) => i.visible);
  if (visible.length === 0) return null;
  return (
    <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
      {title && <div className="text-xs font-semibold mb-2">{title}</div>}
      <ul className="grid grid-cols-1 gap-2">
        {visible.map((l) => (
          <li key={l.id} className="grid grid-cols-[28px_1fr] items-center gap-2 text-xs">
            <span
              className="h-[4px] w-[28px] rounded-full"
              style={{ backgroundColor: l.color }}
              aria-hidden
            />
            <span className="leading-none">{l.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** ---------- Helpers ---------- */
function stopsKey(stops: InterpolateStop[]) {
  const s = [...stops].sort((a, b) => a[0] - b[0]);
  return JSON.stringify(s);
}

/** ---------- The legend that groups layers by stops ---------- */
const MultiLayerSizeLegend: React.FC<{
  layers: LayerLegendConfig[];
  /** only show layers that are currently visible (default true) */
  onlyVisible?: boolean;
}> = ({ layers, onlyVisible = true }) => {
  const filtered = onlyVisible ? layers.filter((l) => l.visible) : layers;

  // Group layers by identical stops (so we render the size scale once per group)
  const groups = new Map<string, { stops: InterpolateStop[]; layers: LayerLegendConfig[] }>();
  filtered.forEach((layer) => {
    const key = stopsKey(layer.stops);
    const entry = groups.get(key);
    if (entry) entry.layers.push(layer);
    else groups.set(key, { stops: layer.stops, layers: [layer] });
  });

  if (filtered.length === 0) {
    return <div className="text-xs ">表示中の凡例はありません。</div>;
  }

  return (
    <div className="space-y-4">
      {[...groups.values()].map((group, idx) => (
        <div key={idx} className="space-y-3">
          {/* Layer color keys for this size scale */}
          <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
            <div className="text-xs font-semibold  mb-2">レイヤー</div>
            <ul className="grid grid-cols-1 gap-2">
              {group.layers.map((l) => (
                <li key={l.id} className="grid grid-cols-[20px_1fr] items-center gap-2 text-xs ">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ring-1 `}
                    style={{ backgroundColor: l.color, boxShadow: `0 0 0 1px ${l.border || "rgba(0,0,0,0.1)"}` }}
                  />
                  <span className="leading-none">{l.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <SizeLegendInline
            title={groups.size > 1 ? "サイズ凡例" : undefined}
            subtitle="円の大きさ＝人数"
            color={"#000" /* dummy color for size scale only; colors per-layer above */}
            strokeColor="#ffffff"
            opacity={1}
            stops={group.stops}
          />
        </div>
      ))}
    </div>
  );
};

/** ---------- Your component wired with visibility flags ---------- */
export default function BusPassengerLayerLegend(props: Props & { className?: string }) {
  const {
    busPassengerLayerVisible,
    sakaeCourseRideLayerVisible,
    sakaeCourseDropLayerVisible,
    masuoCourseRideLayerVisible,
    masuoCourseDropLayerVisible,
    shonanCourseRideLayerVisible,
    shonanCourseDropLayerVisible,

    waniOutboundRideLayerVisible,
    waniOutboundDropLayerVisible,
    waniReturnRideLayerVisible,
    waniReturnDropLayerVisible,
    waniRouteVisible,

    // NEW: route line visibilities
    sakaiRouteVisible,
    masuoRouteVisible,
    shonanRouteVisible,
  } = props;

  const anyVisible = [
    busPassengerLayerVisible,
    sakaeCourseRideLayerVisible,
    sakaeCourseDropLayerVisible,
    masuoCourseRideLayerVisible,
    masuoCourseDropLayerVisible,
    shonanCourseRideLayerVisible,
    shonanCourseDropLayerVisible,
    sakaiRouteVisible,
    masuoRouteVisible,
    shonanRouteVisible,
    shonanCourseDropLayerVisible,
    waniRouteVisible,
    waniOutboundRideLayerVisible,
    waniOutboundDropLayerVisible,
    waniReturnRideLayerVisible,
    waniReturnDropLayerVisible,
  ].some(Boolean);

  if (!anyVisible) return null; // <- nothing to show

  // Shared stops for size-encoded circle layers
  const sharedStops: InterpolateStop[] = [
    [0, 6],
    [1000, 10],
    [2000, 18],
    [3000, 25],
  ];

  // Colors aligned with your route layer definitions
  const ROUTE_COLORS = {
    shonan: "#1f78b4", // blue
    masuo: "#33a02c",  // green
    sakai: "#e31a1c",  // red
    wani: "#ef4444",
  };

  const layers = React.useMemo<LayerLegendConfig[]>(
    () => [
      { id: "bus-stops", label: "バス停レイヤー", color: "#fff", stops: sharedStops, visible: busPassengerLayerVisible, opacity: 0.8, border: "#e11d48" },
      { id: "sakae-ride", label: "逆井 コース - 乗車", color: "#16a34a", stops: sharedStops, visible: sakaeCourseRideLayerVisible, opacity: 0.8 },
      { id: "sakae-drop", label: "逆井 コース - 降車", color: "#f2f", stops: sharedStops, visible: sakaeCourseDropLayerVisible, opacity: 0.8 },
      { id: "masuo-ride", label: "南増尾 コース - 乗車", color: "#543553", stops: sharedStops, visible: masuoCourseRideLayerVisible, opacity: 0.8 },
      { id: "masuo-drop", label: "南増尾 コース - 降車", color: "#d42", stops: sharedStops, visible: masuoCourseDropLayerVisible, opacity: 0.8 },
      { id: "shonan-ride", label: "沼南コース - 乗車", color: "#10b981", stops: sharedStops, visible: shonanCourseRideLayerVisible, opacity: 0.8 },
      { id: "shonan-drop", label: "沼南コース - 降車", color: "#f97316", stops: sharedStops, visible: shonanCourseDropLayerVisible, opacity: 0.8 },
      { id: "wani-outbound-ride", label: "ワニバース（往路）乗車", color: "#26F0F1", stops: sharedStops, visible: waniOutboundRideLayerVisible, opacity: 0.8 },
      { id: "wani-outbound-drop", label: "ワニバース（往路）降車", color: "#700548", stops: sharedStops, visible: waniOutboundDropLayerVisible, opacity: 0.8 },
      { id: "wani-return-ride", label: "ワニバース（復路）乗車", color: "#433E0E", stops: sharedStops, visible: waniReturnRideLayerVisible, opacity: 0.8 },
      { id: "wani-return-drop", label: "ワニバース（復路）降車", color: "#60a5fa", stops: sharedStops, visible: waniReturnDropLayerVisible, opacity: 0.8 },
    ],
    [
      busPassengerLayerVisible,
      sakaeCourseRideLayerVisible,
      sakaeCourseDropLayerVisible,
      masuoCourseRideLayerVisible,
      masuoCourseDropLayerVisible,
      shonanCourseRideLayerVisible,
      shonanCourseDropLayerVisible,
      waniOutboundRideLayerVisible,
     waniOutboundDropLayerVisible,
     waniReturnRideLayerVisible,
     waniReturnDropLayerVisible,
    ]
  );

  const routeItems: RouteLegendConfig[] = React.useMemo(
    () => [
      { id: "route-sakai", label: "逆井コース（ルート）", color: ROUTE_COLORS.sakai, visible: sakaiRouteVisible },
      { id: "route-masuo", label: "南増尾コース（ルート）", color: ROUTE_COLORS.masuo, visible: masuoRouteVisible },
      { id: "route-shonan", label: "沼南コース（ルート）", color: ROUTE_COLORS.shonan, visible: shonanRouteVisible },
      { id: "route-wani", label: "ワニバース（市役所線）ルート", color: ROUTE_COLORS.wani, visible: waniRouteVisible },
    ],
    [sakaiRouteVisible, masuoRouteVisible, shonanRouteVisible, waniRouteVisible]
  );

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl border-0 text-xs", props.className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">
            ワニバースとカシワニクルのバス停毎の乗車数/降車数
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2">
          {/* Circles (size-encoded) */}
          <MultiLayerSizeLegend layers={layers} onlyVisible />

          {/* NEW: Course routes (colored lines) */}
          <LineLegendInline title="コース（ルート）" items={routeItems} />
        </CardContent>
      </div>
    </Card>
  );
}
