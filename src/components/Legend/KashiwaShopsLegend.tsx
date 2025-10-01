// // components/KashiwaShopsLegend.tsx
// import React from "react";
// import clsx from "clsx";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// type ShopLegendItem = {
//   /** Visible label in the legend */
//   label: string;
//   /** Category key ('' means "全て") */
//   category: string;
//   /** Optional color for the chip; a fallback palette will be used if omitted */
//   color?: string;
//   /** Optional border color for better contrast on light/white fills */
//   border?: string;
//   /** Optional icon to display next to the label (from your Accordion config) */
//   icon?: React.ReactNode;
// };

// interface Props {
//   className?: string;
//   /** The same categories array you use for the Accordion (you may add `color`/`border` here) */
//   categories: ShopLegendItem[];
//   /** The selected categories from your UI (includes '' when "全て" is on) */
//   selectedCategories: string[];
// }

// /** Simple fallback palette if a category doesn't provide a color */
// const FALLBACK_COLORS = [
//   "#1d4ed8", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6",
//   "#06b6d4", "#f97316", "#22c55e", "#e11d48", "#0ea5e9",
// ];

// export const shopCategoriesLegend = [
//   { label: "全て", category: "" }, // special row; not shown in legend
//   { label: "デパート・ショッピングモール", category: "デパート・ショッピングモール", color: "#FF5733" },
//   { label: "スーパーマーケット", category: "スーパーマーケット", color: "#33FF57" },
// ];

// /** Utility: pick a color fallback deterministically */
// function colorFor(idx: number, provided?: string) {
//   return provided ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
// }

// export default function KashiwaShopsLegend({
//   className,
//   categories,
//   selectedCategories,
// }: Props) {
//   // Filter out the special "全て" row from legend items
//   const normalCats = categories.filter(c => c.category !== "");

//   // Determine which categories should show in the legend:
//   // - If "全て" ('') is selected, show every non-empty category.
//   // - Else, show only the categories included in selectedCategories.
//   const showAll = selectedCategories.includes("");
//   const visibleItems = showAll
//     ? normalCats
//     : normalCats.filter(c => selectedCategories.includes(c.category));

//   // Render nothing if no relevant categories are selected
//   if (visibleItems.length === 0) return null;

//   return (
//     <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
//       <div className="space-y-2">
//         <CardHeader className="p-0">
//           <CardTitle className="font-semibold text-center text-sm">柏市のお店</CardTitle>
//         </CardHeader>

//         <CardContent className="p-0 space-y-2">
//           {/* Color key list — fixed 20px swatch column keeps labels aligned */}
//           <div className="rounded-xl bg-white/90 p-3 shadow ring-1 ring-black/5">
//             <div className="text-xs font-semibold text-gray-900 mb-2">レイヤー</div>
//             <ul className="grid grid-cols-1 gap-2">
//               {visibleItems.map((item, idx) => {
//                 const fill = colorFor(idx, item.color);
//                 const outline = item.border ?? "rgba(0,0,0,1)";
//                 return (
//                   <li
//                     key={item.label}
//                     className="grid grid-cols-[20px_1fr] items-center gap-2 text-xs text-gray-800"
//                   >
//                     <span
//                       className="inline-block h-3 w-3 rounded-full"
//                       style={{ backgroundColor: fill, outline: `1px solid ${outline}` }}
//                     />
//                     <span className="leading-none flex items-center gap-2">
//                       {/* Optional icon from your Accordion config */}
//                       {item.icon ? <span className="inline-flex">{item.icon}</span> : null}
//                       {item.label}
//                     </span>
//                   </li>
//                 );
//               })}
//             </ul>
//           </div>
//         </CardContent>
//       </div>
//     </Card>
//   );
// }


// components/KashiwaShopsLegend.tsx
import React from "react";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShopLegendItem = {
  /** Visible label in the legend */
  label: string;
  /** Category key ('' means "全て") */
  category: string;
  /** Optional color for the chip; a fallback palette will be used if omitted */
  color?: string;
  /** Optional border color for better contrast on light/white fills */
  border?: string;
  /** Optional icon to display next to the label (from your Accordion config) */
  icon?: React.ReactNode;
};

interface Props {
  className?: string;
  /** The same categories array you use for the Accordion (you may add `color`/`border` here) */
  categories: ShopLegendItem[];
  /** The selected categories from your UI (includes '' when "全て" is on) */
  selectedCategories: string[];
}

/** Simple fallback palette if a category doesn't provide a color */
const FALLBACK_COLORS = [
  "#1d4ed8", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#22c55e", "#e11d48", "#0ea5e9",
];

export const shopCategoriesLegend = [
  { label: "全て", category: "" }, // special row; not shown in legend
  { label: "デパート・ショッピングモール", category: "デパート・ショッピングモール", color: "#FF5733" },
  { label: "スーパーマーケット", category: "スーパーマーケット", color: "#33FF57" },
  { label: "その他", category: "その他", color: "#FF99C8" },
];

/** Utility: pick a color fallback deterministically */
function colorFor(idx: number, provided?: string) {
  return provided ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

export default function KashiwaShopsLegend({
  className,
  categories,
  selectedCategories,
}: Props) {
  // Filter out the special "全て" row from legend items
  const normalCats = categories.filter(c => c.category !== "");

  // Determine which categories should show in the legend:
  const showAll = selectedCategories.includes("");
  const visibleItems = showAll
    ? normalCats
    : normalCats.filter(c => selectedCategories.includes(c.category));

  if (visibleItems.length === 0) return null;

  return (
    <Card className={clsx("bg-white backdrop-blur-2xl p-3 rounded-2xl text-xs", className)}>
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="font-semibold text-center text-sm">柏市のお店</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-2">
          <div className="rounded-xl bg-white/90 p-3 ">
            <div className="text-xs font-semibold text-gray-900 mb-2">レイヤー</div>
            <ul className="grid grid-cols-1 gap-2">
              {visibleItems.map((item, idx) => {
                const fill = colorFor(idx, item.color);
                const outline = item.border ?? "rgba(255,255,255,1)";
                return (
                  <li
                    key={item.label}
                    className="grid grid-cols-[20px_1fr] items-center gap-2 text-xs text-gray-800"
                  >
                    <span
                      className="inline-block h-4 w-4"
                      style={{
                        backgroundColor: fill,
                        border: `1px solid  ${outline}`,
                      }}
                    />
                    <span className="leading-none flex items-center gap-2">
                      {item.icon ? <span className="inline-flex">{item.icon}</span> : null}
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
