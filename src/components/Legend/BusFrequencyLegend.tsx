import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FreqStyleConfig, FrequencyDay } from "@/layers/BusFrequencyLayer";

type Props = {
  className?: string;
  /** Show legend when the layer is visible */
  visible: boolean;
  /** "weekday" | "saturday" | "holiday" */
  day: FrequencyDay;
  /** Current thresholds, colors, widthRange from MapControls */
  style: FreqStyleConfig;
};

const DAY_LABEL: Record<FrequencyDay, string> = {
  weekday: "平日",
  saturday: "土曜",
  holiday: "日祝",
};

function bandLabel(i: number, thresholds: number[]) {
  if (i === 0) return `< ${thresholds[0] ?? "t0"}`;
  const lo = thresholds[i - 1];
  const hi = thresholds[i] ?? "∞";
  return `[${lo}, ${hi})`;
}

export default function BusFrequencyLegend({ className, visible, day, style }: Props) {
  if (!visible) return null;

  // Ensure colors length = thresholds length + 1
  const need = style.thresholds.length + 1;
  const colors = (() => {
    const out = [...style.colors];
    while (out.length < need) out.push(out[out.length - 1] ?? "#000000");
    if (out.length > need) out.length = need;
    return out;
  })();

  const labels = new Array(need).fill(0).map((_, i) => bandLabel(i, style.thresholds));

  // Make a pleasant width preview across bands (min..max)
  const previewWidths = colors.map((_, i) => {
    const { min, max } = style.widthRange;
    const denom = Math.max(1, colors.length - 1);
    return min + ((max - min) * i) / denom;
  });

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">
            バス路線（本数スタイル）
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-2">
          {/* Day badge */}
          <div className="text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-gray-500" />
              対象日：{DAY_LABEL[day]}
            </span>
          </div>

          {/* Color & width keys (one row per band) */}
          <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
            <div className="text-xs font-semibold text-gray-900 mb-2">色 × 太さ ＝ 運行本数</div>
            <ul className="grid grid-cols-1 gap-2">
              {colors.map((c, i) => (
                <li key={i} className="grid grid-cols-[28px_1fr] items-center gap-2">
                  <span
                    aria-hidden
                    className="rounded-full"
                    style={{ backgroundColor: c, height: `${previewWidths[i]}px`, width: "28px" }}
                  />
                  <span className="tabular-nums">{labels[i]}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Width note */}
          <div className="text-[11px] text-gray-700">
            線幅：{style.widthRange.min.toFixed(1)}px – {style.widthRange.max.toFixed(1)}px
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
