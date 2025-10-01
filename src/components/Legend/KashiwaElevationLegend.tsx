import { Card } from "@/components/ui/card";
import { Mountain } from "lucide-react";

type Props = { className?: string };

const STEPS = [
  { label: "0 – 5",     color: "#fde0dc" },
  { label: "5 – 10",    color: "#f9bdbb" },
  { label: "10 – 15",   color: "#f69988" },
  { label: "15 – 20",   color: "#f36c60" },
  { label: "20 – 25",   color: "#e84e40" },
  { label: "25 – 30",   color: "#e51c23" },
  { label: "30 – 35",   color: "#d32f2f" },
  { label: "35 – 35.7", color: "#c62828" },
];

export default function KashiwaElevationLegend({ className }: Props) {
  return (
    <Card
      className={[
        "p-3 rounded-2xl shadow backdrop-blur bg-white/85 border",
        "ring-1 ring-black/5",
        className ?? "",
      ].join(" ")}
      role="group"
      aria-label="Elevation legend"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-neutral-600" aria-hidden />
          <div className="text-sm font-semibold">標高</div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
          m
        </span>
      </div>

      {/* Discrete ramp */}
      <div className="flex gap-0.5 mb-2 rounded overflow-hidden">
        {STEPS.map((s, i) => (
          <div
            key={`ramp-${i}`}
            className="h-2 flex-1 border border-white/60"
            style={{ background: s.color }}
            aria-hidden
          />
        ))}
      </div>

      {/* Steps (two columns on wider cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm border border-white/70 shadow-sm"
              style={{ background: s.color }}
              aria-hidden
            />
            <div className="tabular-nums text-neutral-800">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footnote */}
      <div className="mt-2 text-[10px] text-neutral-500">
        値は GeoJSON の <span className="font-mono">"標高"</span> を使用
      </div>
    </Card>
  );
}
