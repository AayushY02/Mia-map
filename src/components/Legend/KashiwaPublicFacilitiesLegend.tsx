// KashiwaPublicFacilitiesLegend.tsx
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FacilityCategory = {
  label: string;
  category: string; // '' means 全て (all)
  color: string;
};

export const facilityCategories = [
  { label: '全て', category: '', color: '#808080' },
  { label: '建物', category: '3', color: '#FF5733' },
  { label: 'その他', category: '9', color: '#33FF57' },
  { label: '国の機関', category: '11', color: '#DDD92A' },
  { label: '地方公共団体', category: '12', color: '#313715' },
  { label: '厚生機関', category: '13', color: '#91E5F6' },
  { label: '警察機関', category: '14', color: '#FF1053' },
  { label: '消防署', category: '15', color: '#725AC1' },
  { label: '学校', category: '16', color: '#A1EF8B' },
  { label: '病院', category: '17', color: '#5D737E' },
  { label: '郵便局', category: '18', color: '#FF9000' },
  { label: '福祉施設', category: '19', color: '#13070C' },
];


export const facilityCategoriesNew: FacilityCategory[] = [
  { label: '全て', category: '', color: '#808080' },
  { label: '建物', category: '3', color: '#FF5733' },
  { label: 'その他', category: '9', color: '#33FF57' },
  { label: '国の機関', category: '11', color: '#DDD92A' },
  { label: '地方公共団体', category: '12', color: '#313715' },
  { label: '厚生機関', category: '13', color: '#91E5F6' },
  { label: '警察機関', category: '14', color: '#FF1053' },
  { label: '消防署', category: '15', color: '#725AC1' },
  { label: '学校', category: '16', color: '#A1EF8B' },
  { label: '病院', category: '17', color: '#5D737E' },
  { label: '郵便局', category: '18', color: '#FF9000' },
  { label: '福祉施設', category: '19', color: '#13070C' },
];

type Props = {
  className?: string;
  /** The full catalog of categories (same list you use in the Accordion). */
  categories: FacilityCategory[];
  /** The selected (toggled) categories from parent. If includes '' (全て), we show all. */
  selectedCategories: string[];
};

export default function KashiwaPublicFacilitiesLegend({
  className,
  categories,
  selectedCategories,
}: Props) {
  // If nothing is selected, hide the legend entirely.
  if (!selectedCategories || selectedCategories.length === 0) return null;

  // If "全て" (category === '') is selected, show all; else show only selected
  const showAll = selectedCategories.includes("");
  const visibleCats = showAll
    ? categories.filter(c => c.category !== "") // exclude the "全て" meta row from the legend list
    : categories.filter(c => c.category && selectedCategories.includes(c.category));

  if (visibleCats.length === 0) return null;

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl  text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">柏市の公共施設（カテゴリ凡例）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="grid grid-cols-1 gap-2">
            {visibleCats.map((c) => (
              <li
                key={c.label}
                className="grid grid-cols-[20px_1fr] items-center gap-2 text-xs text-black"
              >
                {/* fixed swatch cell -> labels align vertically */}
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: c.color,
                    outline: `1px solid rgba(255,255,255,1)`,
                  }}
                />
                <span className="leading-none">{c.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </div>
    </Card>
  );
}
