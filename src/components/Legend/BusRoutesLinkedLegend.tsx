// src/components/Legend/BusRoutesLinkedLegend.tsx
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Legend for bus routes split into:
 *  - Common code + has start/end stops (yellow)
 *  - No common code OR missing start/end (gray)
 *
 * Matches the design/style of your other legends.
 */
export default function BusRoutesLinkedLegend({
  className,
  commonVisible,
  otherVisible,
  colorCommon = "#DB3A34", // keep in sync with busRoutesLinkedLayer.ts
  colorOther = "#000000",  // keep in sync with busRoutesLinkedLayer.ts
}: {
  className?: string;
  commonVisible: boolean;
  otherVisible: boolean;
  colorCommon?: string;
  colorOther?: string;
}) {
  const anyOn = commonVisible || otherVisible;
  if (!anyOn) return null;

  const items = [
    { id: "bus-routes-common", label: "路線（共通コード＋始終点あり）", color: colorCommon, visible: commonVisible },
    { id: "bus-routes-other", label: "路線（無共通コード／始終点欠落）", color: colorOther, visible: otherVisible },
  ].filter((i) => i.visible);

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">バス路線（共通コード判定）</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-2">
          {/* Color keys (line swatches) */}
          <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
            <div className="text-xs font-semibold mb-2">レイヤー</div>
            <ul className="grid grid-cols-1 gap-2">
              {items.map((l) => (
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

          {/* Definition helper (optional, small) */}
          <div className="text-[11px] text-gray-700">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span>
                定義：「共通」＝ <span className="font-medium">has_common_code</span> が <span className="font-mono">true</span> かつ
                <span className="font-medium"> start_stop_ids / end_stop_ids</span> が空でない
              </span>
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
