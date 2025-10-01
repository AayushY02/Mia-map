import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  visible: boolean;
  /** 0..1 */
  opacity: number;
  onChange: (val: number) => void;
};

const PRESETS = [0.25, 0.5, 0.75, 0.85, 1.0];

export default function CityMaskLegend({ className, visible, opacity, onChange }: Props) {
  if (!visible) return null;
  const pct = Math.round(opacity * 100);

  const handleSlider = (vals: number[]) => {
    const v = Math.max(0, Math.min(1, Number(vals?.[0] ?? 0)));
    onChange(v);
  };

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl border-0 text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">柏市マスク</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-3">
          {/* Preview swatch */}
          <div className="rounded-xl bg-white/90 p-1 space-y-4">
            <div className="text-xs font-semibold text-black">外側の不透明度</div>

            {/* Visual preview of dim strength */}
            <div className="relative h-10 w-full overflow-hidden rounded-lg ring-1 ring-black/5">
              {/* Faux “map” texture */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, #e5e7eb 0 8px, #f3f4f6 8px 16px)",
                }}
              />
              {/* Dim overlay using current opacity */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: "#000000", opacity }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-5 text-[10px] text-gray-600">
                <span>薄い</span>
                <span>{pct}%</span>
                <span>濃い</span>
              </div>
            </div>

            {/* Slider (0..1) */}
            <div className="px-1">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[opacity]}
                onValueChange={handleSlider}
                aria-label="外側の不透明度"
              />
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => {
                const active = Math.abs(p - opacity) < 0.005;
                return (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "secondary"}
                    className={clsx(
                      "px-2 py-1 text-[11px]",
                      active ? "" : "bg-gray-200"
                    )}
                    onClick={() => onChange(p)}
                  >
                    {Math.round(p * 100)}%
                  </Button>
                );
              })}
            </div>

            <div className="text-[11px] text-gray-700">
              * 100% にすると、柏市外は完全に隠れます。
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
