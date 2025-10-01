// src/components/BusCoverageLegend.tsx
import type maplibregl from "maplibre-gl";

type Props = {
  map: maplibregl.Map | null;
  visible: boolean;
  radius: number;
  onRadiusChange: (r: number) => void;
  coverageOn: boolean;
  pointsOn: boolean;
  onExport?: () => void;
  onZoomToCoverage?: () => void;
};

export default function BusCoverageLegend({
  visible,
//   radius,
//   onRadiusChange,
  coverageOn,
  pointsOn,
//   onExport,
//   onZoomToCoverage,
}: Props) {
  if (!visible) return null;

  return (
    <div className="select-none rounded-2xl bg-white/70 backdrop-blur-md shadow-xl ring-1 ring-black/10 p-3 w-72 space-y-3">
      <div className="text-sm font-semibold">バス停カバレッジ</div>

      {/* Key */}
      <ul className="space-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#8a2be2" }} />
          <span className="text-gray-800">バス停 300mカバレッジ（合成）</span>
          {!coverageOn && <span className="ml-auto text-[10px] text-gray-500">OFF</span>}
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#d00", border: "1px solid #fff" }} />
          <span className="text-gray-800">バス停（点）</span>
          {!pointsOn && <span className="ml-auto text-[10px] text-gray-500">OFF</span>}
        </li>
      </ul>

      {/* Radius slider */}
      {/* <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-700">バッファ半径</span>
          <span className="font-mono">{radius} m</span>
        </div>
        <input
          type="range"
          min={100}
          max={800}
          step={50}
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full accent-purple-600"
        />
        <div className="text-[11px] text-gray-500">半径を変更すると、合成カバレッジが即時更新されます。</div>
      </div> */}
     
    </div>
  );
}
