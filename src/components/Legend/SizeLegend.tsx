/**
 * A reusable legend for Mapbox layers where a numeric property controls a circle's radius.
 *
 * Works great for paint expressions like:
 *  'circle-radius': ['interpolate', ['linear'], ['get', 'sakae_ride'], 0, 6, 1000, 10, 2000, 18, 3000, 25]
 *
 * You can supply either `items` directly or the raw `stops` from your interpolate expression
 * and the component will generate range labels for you.
 */
export type SizeLegendItem = {
  /** Visible label (e.g. "0 – 1,000" or "3000 –") */
  label: string;
  /** Circle radius (px) used in the layer for the LOWER bound of this range */
  radius: number;
};

export type InterpolateStop = [value: number, radius: number];

export interface SizeLegendProps {
  /** Title on top (optional) */
  title?: string;
  /** Second line (e.g., layer description + unit) */
  subtitle?: string;
  /** Swatch (circle) fill color; should match your layer's `circle-color` */
  color?: string;
  /** Circle border color; should match your layer's `circle-stroke-color` */
  strokeColor?: string;
  /** Circle opacity (0–1); should match your layer's `circle-opacity` */
  opacity?: number;
  /** Provide legend rows explicitly */
  items?: SizeLegendItem[];
  /** Or provide the Mapbox interpolate stops and we will derive labels */
  stops?: InterpolateStop[];
  /** Custom formatter for values when deriving labels from `stops` */
  formatValue?: (n: number) => string;
  /** Layout classes override (e.g., "w-64") */
  className?: string;
}

function defaultFormat(n: number) {
  return new Intl.NumberFormat().format(n);
}

function stopsToItems(
  stops: InterpolateStop[],
  formatValue: (n: number) => string = defaultFormat
): SizeLegendItem[] {
  if (!stops.length) return [];
  // Ensure sorted by value
  const s = [...stops].sort((a, b) => a[0] - b[0]);
  const items: SizeLegendItem[] = [];
  for (let i = 0; i < s.length; i++) {
    const [v, r] = s[i];
    const next = s[i + 1]?.[0];
    const label = next === undefined
      ? `${formatValue(v)} –`
      : `${formatValue(v)} – ${formatValue(next)}`;
    items.push({ label, radius: r });
  }
  return items;
}

export const SizeLegend: React.FC<SizeLegendProps> = ({
  title,
  subtitle,
  color = "#16a34a",
  strokeColor = "#ffffff",
  opacity = 0.8,
  items,
  stops,
  formatValue = defaultFormat,
  className = "",
}) => {
  const derivedItems = items ?? (stops ? stopsToItems(stops, formatValue) : []);

  return (
    <div className={`select-none rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-2">
          {title && <div className="text-sm font-semibold text-gray-900">{title}</div>}
          {subtitle && <div className="text-xs text-gray-600 leading-snug">{subtitle}</div>}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {derivedItems.map((it, idx) => (
          <li key={idx} className="flex items-center gap-3 text-xs text-gray-800">
            {/* Circle swatch */}
            <span
              aria-hidden
              className="inline-flex shrink-0 items-center justify-center"
              style={{ width: it.radius * 2, height: it.radius * 2 }}
            >
              <span
                className="block rounded-full"
                style={{
                  width: it.radius * 2,
                  height: it.radius * 2,
                  backgroundColor: color,
                  opacity,
                  border: `1px solid ${strokeColor}`,
                }}
              />
            </span>
            <span className="tabular-nums">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};