import { Card } from "@/components/ui/card";
import { Route } from "lucide-react";

type Props = { className?: string };

const ROWS = [
  { value: 1, label: "高速道路",    color: "#911" }, // green
  { value: 2, label: "一般道路",    color: "#519" }, // yellow
  { value: 3, label: "主要地方道",  color: "#F98989" }, // pink
];

export default function ChibaRoadsLegend({ className }: Props) {
  return (
    <Card
      className={[
        "p-3 rounded-2xl shadow backdrop-blur bg-white/85 border ring-1 ring-black/5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-neutral-600" aria-hidden />
          <div className="text-sm font-semibold">道路種別</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 text-xs">
        {ROWS.map((r) => (
          <div key={r.value} className="flex items-center gap-2">
            {/* tiny line sample */}
            <div className="flex items-center mr-1">
              <span
                className="inline-block h-0.5 w-6 rounded-full"
                style={{ background: "#ffffff", boxShadow: "0 0 0 2px #ffffff" }}
                aria-hidden
              />
              <span
                className="inline-block h-0.5 w-6 -ml-6 rounded-full"
                style={{ background: r.color }}
                aria-hidden
              />
            </div>
            <div className="tabular-nums text-neutral-800">{r.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
