import { useEffect, useMemo, useState, type JSX } from "react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

// 🔒 Single source of truth for layer IDs — import from the layer module
import {
  KASHIWA_CHOME_TOTAL_FILL as TOTAL_FILL_ID,
  KASHIWA_CHOME_AGING_FILL as AGING_FILL_ID,
  KASHIWA_CHOME_DENSITY_FILL as DENSITY_FILL_ID,
  KASHIWA_CHOME_TOTAL_2040_FILL as TOTAL_2040_FILL_ID,
  KASHIWA_CHOME_AGING_2040_FILL as AGING_2040_FILL_ID,
} from "@/layers/kashiwaChomePopulationLayer";

type Props = {
  map?: maplibregl.Map | null;
  totalVisible: boolean;
  agingVisible: boolean;
  densityVisible: boolean;
  // 2040 optional (only render if parent passes these AND the layers are visible)
  total2040Visible?: boolean;
  aging2040Visible?: boolean;
};

/** Parse a Mapbox "step" expression of the form:
 * ["step", inputExpr, color0, break1, color1, break2, color2, ...]
 */
function parseStepExpression(expr: any): { breaks: number[]; colors: string[] } | null {
  if (!Array.isArray(expr) || expr[0] !== "step") return null;
  const parts = expr.slice(2); // [color0, b1, color1, b2, color2, ...]
  if (!parts.length) return null;

  const colors: string[] = [];
  const breaks: number[] = [];
  colors.push(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const br = parts[i];
    const col = parts[i + 1];
    if (typeof br === "number") breaks.push(br);
    if (typeof col === "string") colors.push(col);
  }
  return { breaks, colors };
}

/** Format numbers nicely; aging is percentage.
 *  Auto-detect if breaks are already 0–100 (avoid double ×100). */
// function formatBucketLabel(
//   idx: number,
//   breaks: number[],
//   metric: "total" | "aging" | "density"
// ) {
//   const fmtNum = (n: number) => n.toLocaleString("ja-JP");
//   const alreadyPercent = metric === "aging" && breaks.some((b) => b > 1);
//   const fmtPct = (n: number) => `${(alreadyPercent ? n : n * 100).toFixed(0)}%`;
//   const format = (v: number) => (metric === "aging" ? fmtPct(v) : fmtNum(v));

//   if (breaks.length === 0) return "すべて";
//   if (idx === 0) return `< ${format(breaks[0])}`;
//   if (idx < breaks.length) return `${format(breaks[idx - 1])} – < ${format(breaks[idx])}`;
//   return `≥ ${format(breaks[breaks.length - 1])}`;
// }

function formatBucketLabel(
  idx: number,
  breaks: number[],
  metric: "total" | "aging" | "density"
) {
  const fmtInt = (n: number) => n.toLocaleString("ja-JP");
  const fmtPct = (n: number, alreadyPercent: boolean) =>
    `${(alreadyPercent ? n : n * 100).toFixed(0)}%`;

  // NEW: density per ha
  const fmtDensity = (nKm2: number) =>
    (nKm2 / 100).toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const alreadyPercent = metric === "aging" && breaks.some((b) => b > 1);
  const format = (v: number) =>
    metric === "aging" ? fmtPct(v, alreadyPercent) :
      metric === "density" ? fmtDensity(v) :
        fmtInt(v);

  if (breaks.length === 0) return "すべて";
  if (idx === 0) return `< ${format(breaks[0])}`;
  if (idx < breaks.length) return `${format(breaks[idx - 1])} – < ${format(breaks[idx])}`;
  return `≥ ${format(breaks[breaks.length - 1])}`;
}

function SwatchRow({
  title,
  colors,
  breaks,
  metric,
}: {
  title: string;
  colors: string[];
  breaks: number[];
  metric: "total" | "aging" | "density";
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-black font-medium">{title}</div>
      <div className="flex flex-col gap-1">
        {colors.map((c, i) => (
          <div key={`${title}-${i}`} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-6 rounded-sm border border-black/10"
              style={{ backgroundColor: c }}
            />
            <span className="text-[11px] text-black">
              {formatBucketLabel(i, breaks, metric)}
              {metric === "density" ? " 人/ha" : metric === "total" ? " 人" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KashiwaChomePopulationLegend({
  map,
  totalVisible,
  agingVisible,
  densityVisible,
  total2040Visible,
  aging2040Visible,
}: Props) {
  const [total, setTotal] = useState<{ breaks: number[]; colors: string[] } | null>(null);
  const [aging, setAging] = useState<{ breaks: number[]; colors: string[] } | null>(null);
  const [density, setDensity] = useState<{ breaks: number[]; colors: string[] } | null>(null);
  const [total2040, setTotal2040] = useState<{ breaks: number[]; colors: string[] } | null>(null);
  const [aging2040, setAging2040] = useState<{ breaks: number[]; colors: string[] } | null>(null);

  const refresh = useMemo(
    () => () => {
      if (!map) return;
      try {
        if (map.getLayer(TOTAL_FILL_ID)) {
          setTotal(parseStepExpression(map.getPaintProperty(TOTAL_FILL_ID, "fill-color") as any));
        } else setTotal(null);

        if (map.getLayer(AGING_FILL_ID)) {
          setAging(parseStepExpression(map.getPaintProperty(AGING_FILL_ID, "fill-color") as any));
        } else setAging(null);

        if (map.getLayer(DENSITY_FILL_ID)) {
          setDensity(parseStepExpression(map.getPaintProperty(DENSITY_FILL_ID, "fill-color") as any));
        } else setDensity(null);

        if (map.getLayer(TOTAL_2040_FILL_ID)) {
          setTotal2040(
            parseStepExpression(map.getPaintProperty(TOTAL_2040_FILL_ID, "fill-color") as any)
          );
        } else setTotal2040(null);

        if (map.getLayer(AGING_2040_FILL_ID)) {
          setAging2040(
            parseStepExpression(map.getPaintProperty(AGING_2040_FILL_ID, "fill-color") as any)
          );
        } else setAging2040(null);
      } catch {
        // ignore
      }
    },
    [map]
  );

  useEffect(() => {
    if (!map) return;
    refresh();
    const onStyle = () => refresh();
    const onData = () => refresh();
    const onIdle = () => refresh();
    map.on("styledata", onStyle);
    map.on("data", onData);
    map.on("idle", onIdle);
    return () => {
      map.off("styledata", onStyle);
      map.off("data", onData);
      map.off("idle", onIdle);
    };
  }, [map, refresh]);

  const showAny =
    totalVisible || agingVisible || densityVisible || !!total2040Visible || !!aging2040Visible;
  if (!showAny) return null;

  const blocks: JSX.Element[] = [];

  if (totalVisible && total) {
    blocks.push(
      <SwatchRow key="row-total" title="総数（G）" colors={total.colors} breaks={total.breaks} metric="total" />
    );
  }
  if (agingVisible && aging) {
    if (blocks.length) blocks.push(<Separator key="sep-1" />);
    blocks.push(
      <SwatchRow key="row-aging" title="高齢化率（K）" colors={aging.colors} breaks={aging.breaks} metric="aging" />
    );
  }
  if (densityVisible && density) {
    if (blocks.length) blocks.push(<Separator key="sep-2" />);
    blocks.push(
      <SwatchRow key="row-density" title="人口密度（L）" colors={density.colors} breaks={density.breaks} metric="density" />
    );
  }
  if (!!total2040Visible && total2040) {
    if (blocks.length) blocks.push(<Separator key="sep-3" />);
    blocks.push(
      <SwatchRow
        key="row-total-2040"
        title="総数（2040年・推計）"
        colors={total2040.colors}
        breaks={total2040.breaks}
        metric="total"
      />
    );
  }
  if (!!aging2040Visible && aging2040) {
    if (blocks.length) blocks.push(<Separator key="sep-4" />);
    blocks.push(
      <SwatchRow
        key="row-aging-2040"
        title="高齢化率（2040年・推計）"
        colors={aging2040.colors}
        breaks={aging2040.breaks}
        metric="aging"
      />
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 shadow bg-white backdrop-blur-sm p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-black">町丁目人口レイヤー</Label>
        <span className="text-[11px] text-muted-foreground">凡例</span>
      </div>
      {blocks}
    </div>
  );
}
