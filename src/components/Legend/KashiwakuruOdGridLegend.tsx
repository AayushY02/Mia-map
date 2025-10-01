// components/Legend/KashiwakuruOdGridLegend.tsx
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
    className?: string;

    /** show legend (usually when the OD grid layer is visible) */
    visible: boolean;

    /** options to reflect current state in the legend */
    options?: {
        filterOn?: boolean;
        hour?: number;
        showGrid?: boolean;
        undirected?: boolean;
        minVol?: number;
        showStops?: boolean;
    };
};

const COLORS = {
    line: "#0f7282",         // OD (aggregated) line color — keep in sync with layer
    highlight: "#111111",    // isolated/highlighted line
    origin: "#059669",       // O=green
    dest: "#dc2626",         // D=red
    od: "#6b7280",           // O&D together (if you ever show as grey)
    cell: "#111111",         // selected cell stroke
};

const WIDTH_STOPS: Array<{ label: string; width: number }> = [
    { label: "1 – 4", width: 1 },
    { label: "5 – 9", width: 2.5 },
    { label: "10 – 19", width: 4 },
    { label: "20 – 49", width: 6 },
    { label: "50 – 99", width: 9 },
    { label: "100+", width: 12 },
];

export default function KashiwakuruOdGridLegend({ className, visible, options }: Props) {
    if (!visible) return null;

    const { filterOn, hour, showGrid, undirected, minVol, showStops } = options || {};

    return (
        <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
            <div className="space-y-2">
                <CardHeader className="p-0">
                    <CardTitle className="font-semibold text-center text-sm">カシワニクル OD（100mメッシュ）</CardTitle>
                </CardHeader>

                <CardContent className="p-0 space-y-3">
                    {/* Layer keys */}
                    <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
                        <div className="text-xs font-semibold text-gray-900 mb-2">レイヤー</div>
                        <ul className="grid grid-cols-1 gap-2">
                            <li className="grid grid-cols-[28px_1fr] items-center gap-2">
                                <span className="h-[4px] w-[28px] rounded-full" style={{ backgroundColor: COLORS.line }} />
                                <span className="leading-none">OD ライン（集約）</span>
                            </li>
                            <li className="grid grid-cols-[28px_1fr] items-center gap-2">
                                <span className="h-[6px] w-[28px] rounded-full" style={{ backgroundColor: COLORS.highlight }} />
                                <span className="leading-none">選択ライン（ハイライト）</span>
                            </li>

                            {/* Stops */}
                            <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.origin, outline: "1px solid #fff" }} />
                                <span className="leading-none">出発地（O）</span>
                            </li>
                            <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.dest, outline: "1px solid #fff" }} />
                                <span className="leading-none">到着地（D）</span>
                            </li>

                            <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                                <span
                                    className="inline-block h-3 w-3 rounded-full"
                                    style={{ backgroundColor: COLORS.od, outline: "1px solid #fff" }}
                                />
                                <span className="leading-none">出発兼到着（OD）</span>
                            </li>

                            {/* Selected cell */}
                            <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "repeating-linear-gradient(45deg, #00000022 0 6px, #00000011 6px 12px)", outline: `2px solid ${COLORS.cell}` }} />
                                <span className="leading-none">選択メッシュ（100m）</span>
                            </li>


                        </ul>
                    </div>

                    {/* Width scale */}
                    <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
                        <div className="text-xs font-semibold text-gray-900 mb-2">線の太さ ＝ トリップ数</div>
                        <ul className="grid grid-cols-1 gap-2">
                            {WIDTH_STOPS.map((it, i) => (
                                <li key={i} className="grid grid-cols-[28px_1fr] items-center gap-2">
                                    <span aria-hidden className="rounded-full" style={{ backgroundColor: COLORS.line, height: `${it.width}px`, width: "28px" }} />
                                    <span className="tabular-nums">{it.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Status pills */}
                    <div className="flex flex-wrap gap-2">
                        {filterOn && typeof hour === "number" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-gray-500" />
                                時間帯：{hour}:00–{hour + 1}:00
                            </span>
                        )}
                        {typeof minVol === "number" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-gray-500" />
                                最小ボリューム：{minVol}
                            </span>
                        )}
                        {showGrid && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-gray-500" />
                                100m グリッド表示
                            </span>
                        )}
                        {showStops && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-gray-500" />
                                バス停 O/D 表示
                            </span>
                        )}
                        {undirected && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-gray-500" />
                                双方向で集計
                            </span>
                        )}
                    </div>

                    {/* Short tips */}
                    <div className="text-[11px] text-gray-700">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>メッシュをクリック：そのセルに関わるラインだけを表示</li>
                            <li>ラインをクリック：その1本のみを強調</li>
                            <li>ツールバーの「解除」で元に戻します</li>
                            <li>グレーの停留所：出発・到着の両方で使用（OD）</li>
                        </ul>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
