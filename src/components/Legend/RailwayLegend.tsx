// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// type Props = {
//   className?: string;
//   railLinesVisible: boolean;
//   railStationsVisible: boolean;
//   stationPassengersVisible: boolean;
// };

// export default function RailwayLegend({
//   className,
//   railLinesVisible,
//   railStationsVisible,
//   stationPassengersVisible,
// }: Props) {
//   const sections = [
//     railLinesVisible,
//     railStationsVisible,
//     stationPassengersVisible,
//   ].some(Boolean);

//   if (!sections) return null;

//   const jrColor = "#38b000";
//   const txColor = "#1b4ae0";
//   const otherColor = "#004b23";
//   const stationFill = "#f72585";
//   const paxFill = "#4361ee";

//   // Same size stops you used in the layer (px)
//   const ramp = [
//     { v: 100, r: 4 },
//     { v: 500, r: 6 },
//     { v: 2000, r: 9 },
//     { v: 10000, r: 14 },
//     { v: 25000, r: 18 },
//     { v: 60000, r: 24 },
//   ];

//   return (
//     <Card className={`bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs ${className || ""}`}>
//       <div className="space-y-3">
//         <CardHeader className="p-0">
//           <CardTitle className="font-semibold text-center text-sm">鉄道レイヤー凡例</CardTitle>
//         </CardHeader>
//         <CardContent className="p-0 space-y-4">

//           {/* Lines */}
//           {railLinesVisible && (
//             <section className="space-y-2">
//               <div className="font-semibold text-xs">路線（JR / TX / その他）</div>
//               <ul className="grid grid-cols-1 gap-2">
//                 {/* JR: green + white dash overlay */}
//                 <li className="flex items-center gap-2">
//                   <span
//                     className="inline-block h-2 w-10 rounded"
//                     style={{
//                       background:
//                         `linear-gradient(to right, ${jrColor}, ${jrColor})`,
//                       position: "relative",
//                     }}
//                   />
//                   <span className="relative -ml-10 inline-block h-2 w-10">
//                     <span
//                       className="absolute inset-0 rounded"
//                       style={{
//                         background:
//                           "repeating-linear-gradient(90deg, #ffffff, #ffffff 4px, transparent 4px, transparent 14px)",
//                         opacity: 1,
//                         mixBlendMode: "normal",
//                       }}
//                     />
//                   </span>
//                   <span>JR系</span>
//                 </li>

//                 {/* TX: deep blue + white dots overlay */}
//                 <li className="flex items-center gap-2">
//                   <span
//                     className="inline-block h-2 w-10 rounded"
//                     style={{ background: txColor }}
//                   />
//                   <span className="relative -ml-10 inline-block h-2 w-10">
//                     <span
//                       className="absolute inset-0 rounded"
//                       style={{
//                         background:
//                           "radial-gradient(#ffffff 40%, transparent 42%)",
//                         backgroundSize: "8px 8px",
//                         backgroundRepeat: "repeat",
//                       }}
//                     />
//                   </span>
//                   <span>つくばエクスプレス系</span>
//                 </li>

//                 {/* Other: dark green + perpendicular ticks (symbolic) */}
//                 <li className="flex items-center gap-2">
//                   <span
//                     className="inline-block h-2 w-10 rounded"
//                     style={{ background: otherColor }}
//                   />
//                   <span className="relative -ml-10 inline-block h-2 w-10">
//                     <span
//                       className="absolute inset-0"
//                       style={{
//                         background:
//                           "repeating-linear-gradient(90deg, transparent, transparent 6px, #ffffff 6px, #ffffff 8px, transparent 8px)",
//                         opacity: 1,
//                       }}
//                     />
//                   </span>
//                   <span>その他の鉄道</span>
//                 </li>
//               </ul>
//             </section>
//           )}

//           {/* Stations */}
//           {railStationsVisible && (
//             <section className="space-y-2">
//               <div className="font-semibold text-xs">駅（重複統合済み）</div>
//               <div className="flex items-center gap-2">
//                 <span
//                   className="inline-block h-3 w-3 rounded-full"
//                   style={{ backgroundColor: stationFill, outline: "1px solid #fff" }}
//                 />
//                 <span>1駅 = 1点（グループ×650m で同名駅を集約）</span>
//               </div>
//             </section>
//           )}

//           {/* Passengers 2023 */}
//           {stationPassengersVisible && (
//             <section className="space-y-2">
//               <div className="font-semibold text-xs">駅別乗降客数（人/日, 2023）</div>
//               <div className="flex items-end gap-3">
//                 {ramp.map(({ v, r }) => (
//                   <div key={v} className="flex flex-col items-center gap-1">
//                     <span
//                       className="rounded-full"
//                       style={{
//                         width: `${r}px`,
//                         height: `${r}px`,
//                         backgroundColor: paxFill,
//                         outline: "1px solid #fff",
//                         opacity: 0.75,
//                       }}
//                       title={`${v.toLocaleString()} 人/日`}
//                     />
//                     <span className="text-[10px] text-gray-700">
//                       {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//               <div className="text-[10px] text-gray-600">
//                 ソース: 国土数値情報 S12（駅別乗降客数）。2023年列（S12_057）を使用。
//               </div>
//             </section>
//           )}

//         </CardContent>
//       </div>
//     </Card>
//   );
// }


// src/components/Legend/RailwayLegend.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  className?: string;

  // existing
  railLinesVisible: boolean;
  railStationsVisible: boolean;
  stationPassengersVisible: boolean;

  // NEW: station coverage
  stationCoverageVisible: boolean;
  stationCoverageRadiusMeters?: number | null; // optional
};

export default function RailwayLegend({
  className,
  railLinesVisible,
  railStationsVisible,
  stationPassengersVisible,
  stationCoverageVisible,
  stationCoverageRadiusMeters,
}: Props) {
  const anyVisible =
    railLinesVisible ||
    railStationsVisible ||
    stationPassengersVisible ||
    stationCoverageVisible;

  if (!anyVisible) return null;

  // color tokens mirroring your layer styles
  const jrColor = "#38b000";
  const txColor = "#1b4ae0";
  const otherColor = "#004b23";
  const stationFill = "#4F200D";
  const paxFill = "#4361ee";

  // coverage style (adjust if your layer uses different colors)
  const coverageStroke = "#4361ee";
  const coverageFill = "rgba(67, 97, 238, 0.15)";

  // passenger size ramp (px) aligned with the layer
  const ramp = [
    { v: 100, r: 4 },
    { v: 500, r: 6 },
    { v: 2000, r: 9 },
    { v: 10000, r: 14 },
    { v: 25000, r: 18 },
    { v: 60000, r: 24 },
  ];

  const formatMeters = (n: number) =>
    new Intl.NumberFormat("ja-JP").format(Math.round(n));

  return (
    <Card className={`bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs ${className || ""}`}>
      <div className="space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">鉄道レイヤー凡例</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Lines */}
          {railLinesVisible && (
            <section className="space-y-2">
              <div className="font-semibold text-xs">路線（JR / TX / その他）</div>
              <ul className="grid grid-cols-1 gap-2">
                {/* JR */}
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-10 rounded" style={{ background: jrColor }} />
                  <span className="relative -ml-10 inline-block h-2 w-10">
                    <span
                      className="absolute inset-0 rounded"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, #ffffff, #ffffff 4px, transparent 4px, transparent 14px)",
                      }}
                    />
                  </span>
                  <span>JR系</span>
                </li>

                {/* TX */}
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-10 rounded" style={{ background: txColor }} />
                  <span className="relative -ml-10 inline-block h-2 w-10">
                    <span
                      className="absolute inset-0 rounded"
                      style={{
                        background:
                          "radial-gradient(#ffffff 40%, transparent 42%)",
                        backgroundSize: "8px 8px",
                        backgroundRepeat: "repeat",
                      }}
                    />
                  </span>
                  <span>つくばエクスプレス系</span>
                </li>

                {/* Other */}
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-10 rounded" style={{ background: otherColor }} />
                  <span className="relative -ml-10 inline-block h-2 w-10">
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, transparent, transparent 6px, #ffffff 6px, #ffffff 8px, transparent 8px)",
                      }}
                    />
                  </span>
                  <span>その他の鉄道</span>
                </li>
              </ul>
            </section>
          )}

          {/* Stations */}
          {railStationsVisible && (
            <section className="space-y-2">
              <div className="font-semibold text-xs">駅（重複統合済み）</div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: stationFill, outline: "1px solid #fff" }}
                />
                <span>1駅 = 1点（グループ×650m で同名駅を集約）</span>
              </div>
            </section>
          )}

          {/* Passengers 2023 */}
          {stationPassengersVisible && (
            <section className="space-y-2">
              <div className="font-semibold text-xs">駅別乗降客数（人/日, 2023）</div>
              <div className="flex items-end gap-3">
                {ramp.map(({ v, r }) => (
                  <div key={v} className="flex flex-col items-center gap-1">
                    <span
                      className="rounded-full"
                      style={{
                        width: `${r}px`,
                        height: `${r}px`,
                        backgroundColor: paxFill,
                        outline: "1px solid #fff",
                        opacity: 0.75,
                      }}
                      title={`${v.toLocaleString()} 人/日`}
                    />
                    <span className="text-[10px] text-gray-700">
                      {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-600">
                ソース: 国土数値情報 S12（駅別乗降客数）。2023年列（S12_057）を使用。
              </div>
            </section>
          )}

          {/* NEW: Station Coverage */}
          {stationCoverageVisible && (
            <section className="space-y-2">
              <div className="font-semibold text-xs">駅カバレッジ（バッファ）</div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-block rounded"
                  style={{
                    width: 18,
                    height: 14,
                    backgroundColor: coverageFill,
                    boxShadow: `inset 0 0 0 1.5px ${coverageStroke}`,
                  }}
                />
                <div className="flex flex-col">
                  <span>各駅を中心に円形バッファを表示</span>
                  <span className="text-[10px] text-gray-700">
                    半径:
                    {" "}
                    {Number.isFinite(stationCoverageRadiusMeters ?? NaN)
                      ? `${formatMeters(stationCoverageRadiusMeters as number)} m`
                      : "ステーションごとに設定 / 変動"}
                  </span>
                </div>
              </div>
            </section>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
