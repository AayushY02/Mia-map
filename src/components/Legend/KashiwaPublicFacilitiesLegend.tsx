// KashiwaPublicFacilitiesLegend.tsx
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FacilityCategory = {
  label: string;
  category: string; // '' means 全て (all)
  color: string;
};

export const facilityCategories = [
  { label: "全て", category: "", color: "#808080" },
  { label: "公立保育園", category: "公立保育園", color: "#FF5733" },
  { label: "私立認可保育園", category: "私立認可保育園", color: "#33FF57" },
  { label: "小規模保育施設", category: "小規模保育施設", color: "#DDD92A" },
  { label: "私立幼稚園", category: "私立幼稚園", color: "#313715" },
  { label: "認定こども園", category: "認定こども園", color: "#91E5F6" },
  { label: "児童センター", category: "児童センター", color: "#FF1053" },
  { label: "地域子育て支援拠点", category: "地域子育て支援拠点", color: "#725AC1" },
  { label: "こどもルーム", category: "こどもルーム", color: "#A1EF8B" },
  { label: "こども図書館", category: "こども図書館", color: "#5D737E" },
  { label: "市役所・支所・出張所", category: "市役所・支所・出張所", color: "#FF9000" },
  { label: "図書館", category: "図書館", color: "#13070C" },
  { label: "薬局", category: "薬局", color: "#7fc6a4" },
  { label: "市立小学校", category: "市立小学校", color: "#3357FF" },
  { label: "市内中学校", category: "市内中学校", color: "#B1740F" },
  { label: "高等学校", category: "高等学校", color: "#23022E" },
  { label: "大学・大学校", category: "大学・大学校", color: "#764134" },
  { label: "特別支援学校", category: "特別支援学校", color: "#BD2D87" },
];


export const facilityCategoriesNew: FacilityCategory[] = [
  { label: "全て", category: "", color: "#808080" },
  { label: "保育園・幼稚園など", category: "保育園・幼稚園など", color: "#0072B2" },
  { label: "児童・保育・子育て施設", category: "児童・保育・子育て施設", color: "#E69F00" },
  { label: "図書館", category: "図書館", color: "#009E73" },
  { label: "市民サービス施設", category: "市民サービス施設", color: "#D55E00" },
  { label: "教育施設", category: "教育施設", color: "#CC79A7" },
  // { label: "病院・薬局", category: "病院・薬局", color: "#56B4E9" },
  { label: "病院・薬局・診療所", category: "病院・薬局・診療所", color: "#ef233c" },
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
