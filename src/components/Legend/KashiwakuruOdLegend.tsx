// components/Legend/KashiwakuruOdLegend.tsx
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  className?: string;
  /** Show when the OD layer is visible (parent can hide otherwise) */
  visible: boolean;
  /** Whether hour filtering is enabled */
  filterOn?: boolean;
  /** Current hour (start) shown on the slider */
  hour?: number;
};

const COLORS = {
  line: "#1d4ed8",        // OD base lines (matches layer)
  highlight: "#f59e0b",   // endpoint-focused highlight
  origin: "#059669",      // origin circles
  dest: "#dc2626",        // destination circles
};

/** Same breakpoints as your line paint:
 *   1→1px, 5→2.5px, 10→4px, 20→6px, 50→9px, 100→12px
 * We'll present an intuitive "Trip count → line width" legend.
 */
const WIDTH_STOPS: Array<{ label: string; width: number }> = [
  { label: "1 – 4", width: 1 },
  { label: "5 – 9", width: 2.5 },
  { label: "10 – 19", width: 4 },
  { label: "20 – 49", width: 6 },
  { label: "50 – 99", width: 9 },
  { label: "100+", width: 12 },
];

export default function KashiwakuruOdLegend({ className, visible, filterOn, hour }: Props) {
  if (!visible) return null;

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">カシワニクル OD フロー</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-2">
          {/* Color keys */}
          <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
            <div className="text-xs font-semibold text-gray-900 mb-2">レイヤー</div>
            <ul className="grid grid-cols-1 gap-2">
              <li className="grid grid-cols-[28px_1fr] items-center gap-2">
                <span className="h-[4px] w-[28px] rounded-full" style={{ backgroundColor: COLORS.line }} />
                <span className="leading-none">OD ライン</span>
              </li>
              <li className="grid grid-cols-[28px_1fr] items-center gap-2">
                <span className="h-[6px] w-[28px] rounded-full" style={{ backgroundColor: COLORS.highlight }} />
                <span className="leading-none">ハイライト（選択した出発/到着地）</span>
              </li>
              <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.origin, outline: "1px solid #fff" }} />
                <span className="leading-none">出発地（Origin）</span>
              </li>
              <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.dest, outline: "1px solid #fff" }} />
                <span className="leading-none">到着地（Destination）</span>
              </li>
            </ul>
          </div>

          {/* Line width scale */}
          <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
            <div className="text-xs font-semibold text-gray-900 mb-2">線の太さ ＝ トリップ数</div>
            <ul className="grid grid-cols-1 gap-2">
              {WIDTH_STOPS.map((it, i) => (
                <li key={i} className="grid grid-cols-[28px_1fr] items-center gap-2">
                  <span
                    aria-hidden
                    className="rounded-full"
                    style={{ backgroundColor: COLORS.line, height: `${it.width}px`, width: "28px" }}
                  />
                  <span className="tabular-nums">{it.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Optional filter status */}
          {filterOn && typeof hour === "number" && (
            <div className="text-[11px] text-gray-700">
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-gray-500" />
                フィルター中：{hour}:00 – {hour + 1}:00
              </span>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
