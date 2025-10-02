import { Label } from "@/components/ui/label";
import { getColorExpression } from "@/utils/expressions";

type Props = {
  selectedMetric: string;
  className?: string;
};

// Parse an 'interpolate' expression of the form:
// ["interpolate", ["linear"], ["get", field], stop0, color0, stop1, color1, ...]
function parseInterpolate(expr: any): { thresholds: number[]; colors: string[] } | null {
  if (!Array.isArray(expr)) return null;
  if (expr[0] !== "interpolate") return null;
  const parts = expr.slice(3); // [stop0, color0, stop1, color1, ...]
  if (!parts.length) return null;
  const thresholds: number[] = [];
  const colors: string[] = [];
  // parts pairs: number, string
  for (let i = 0; i < parts.length; i += 2) {
    const stop = parts[i];
    const color = parts[i + 1];
    if (typeof stop === "number" && typeof color === "string") {
      // the first stop is the lower bound for the first color; we build colors sequentially
      colors.push(color);
      // collect thresholds for bins except the very first (0 or min)
      if (i > 0) thresholds.push(stop);
    }
  }
  return { thresholds, colors };
}

function formatRangeLabel(idx: number, thresholds: number[], metric: string): string {
  const isRatio = metric === "RTC_2025"; // aged ratio (0..1)
  const fmtInt = (n: number) => n.toLocaleString("ja-JP");
  const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;

  const toLabel = (v: number) => (isRatio ? fmtPct(v) : fmtInt(v));

  if (thresholds.length === 0) return "すべて";
  if (idx === 0) return `< ${toLabel(thresholds[0])}`;
  if (idx < thresholds.length) return `${toLabel(thresholds[idx - 1])} 〜 ${toLabel(thresholds[idx])}`;
  return `≥ ${toLabel(thresholds[thresholds.length - 1])}`;
}

const METRIC_TITLES: Record<string, string> = {
  PTN_2025: "総人口（2025年）",
  PTC_2025: "65歳以上の人口（2025年）",
  PTA_2025: "0〜14歳の人口（2025年）",
  RTC_2025: "高齢者比率（65歳以上／総人口）",
};

export default function PopulationMeshLegend({ selectedMetric, className }: Props) {
  const expr = getColorExpression(selectedMetric) as any;
  const parsed = parseInterpolate(expr);
  if (!parsed) return null;

  const title = METRIC_TITLES[selectedMetric] ?? "人口（メッシュ）";
  const { thresholds, colors } = parsed;

  return (
    <div className={`rounded-xl border border-gray-200 shadow bg-white backdrop-blur-sm p-3 space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-black">{title}</Label>
        <span className="text-[11px] text-muted-foreground">凡例</span>
      </div>
      <div className="flex flex-col gap-1">
        {colors.map((c, i) => (
          <div key={`mesh-legend-${i}`} className="flex items-center gap-2">
            <span className="inline-block h-3 w-6 rounded-sm border border-black/10" style={{ backgroundColor: c }} />
            <span className="text-[11px] text-black">
              {formatRangeLabel(i, thresholds, selectedMetric)}
              {selectedMetric === "RTC_2025" ? "" : " 人"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

