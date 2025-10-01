
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  /** Normal legend content (existing children) */
  children: React.ReactNode;
  /** Optional: tables content to render above the legend panel */
  tables?: React.ReactNode;
  /** Controls visibility of the tables toggle (driven by MapControls) */
  tablesVisible?: boolean;
  /** Whether the normal legend is allowed to show at all (computed in MapView) */
  legendEnabled?: boolean;
  /** Master visibility (same as before) */
  visible: boolean;
  /** Fixed width for the whole stack (same as before) */
  width?: string;
  /** Optional labels */
  tablesLabel?: string;
  legendLabel?: string;
  /** Start states (optional) */
  defaultTablesCollapsed?: boolean;
  defaultLegendCollapsed?: boolean;
};

export default function LegendsStack({
  children,
  tables,
  tablesVisible = false,
  legendEnabled = true,
  visible,
  width = "w-72",
  tablesLabel = "一覧 / テーブル",
  legendLabel = "凡例",
  defaultTablesCollapsed = true,
  defaultLegendCollapsed = false, // open by default (same as before)
}: Props) {
  const [collapsedTables, setCollapsedTables] = useState(defaultTablesCollapsed);
  const [collapsedLegend, setCollapsedLegend] = useState(defaultLegendCollapsed);

  // If tables get turned on from MapControls, auto-open that panel
  useEffect(() => {
    if (tablesVisible) setCollapsedTables(false);
  }, [tablesVisible]);

  // If legend becomes disabled (no layers selected), make sure it is collapsed
  useEffect(() => {
    if (!legendEnabled && !collapsedLegend) {
      setCollapsedLegend(true);
    }
  }, [legendEnabled, collapsedLegend]);

  // Track viewport to split height when both panels are open
  const [vh, setVh] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 1080);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const hasTables = !!tables && tablesVisible;
  const legendVisibleNow = legendEnabled; // hard gate for normal legend

  const bothOpen = hasTables && !collapsedTables && legendVisibleNow && !collapsedLegend;

  // Height budget from the anchored bottom position
  const BOTTOM_OFFSET_PX = 32;      // bottom-8
  const HEADERS_AND_GAPS_PX = 120;  // two headers + gaps
  const available = Math.max(200, vh - BOTTOM_OFFSET_PX - HEADERS_AND_GAPS_PX);

  const maxHeightBothPx = Math.floor(available / 2);
  const maxHeightSoloPx = Math.floor(available);

  const tablesMaxHeight = bothOpen ? maxHeightBothPx : maxHeightSoloPx;
  const legendMaxHeight = bothOpen ? maxHeightBothPx : maxHeightSoloPx;

  return (
    <motion.div
      data-legends-stack
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "fixed bottom-8 left-3 z-30 pointer-events-auto rounded-2xl space-y-2",
        width,
        !visible && "pointer-events-none"
      )}
    >
      {/* ======= Tables Toggle (independent; always allowed when tablesVisible) ======= */}
      {hasTables && (
        <>
          <button
            type="button"
            aria-expanded={!collapsedTables}
            onClick={() => setCollapsedTables((prev) => !prev)}
            className="flex w-full items-center justify-between bg-white/70 backdrop-blur-sm px-3 py-2 rounded-2xl cursor-pointer border border-black/10"
          >
            <span className="text-xs font-bold text-black">{tablesLabel}</span>
            <motion.span
              aria-hidden
              initial={false}
              animate={{ rotate: collapsedTables ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="text-gray-600"
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {!collapsedTables && (
              <motion.div
                key="tables-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-col gap-3 overflow-y-auto bg-white/50 backdrop-blur-sm py-4 px-4 border border-black/10 rounded-2xl"
                  style={{ minHeight: 100, maxHeight: tablesMaxHeight }}
                >
                  {tables}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ======= Normal Legend (hard-hidden when legendEnabled = false) ======= */}
      {legendVisibleNow && (
        <>
          <button
            type="button"
            aria-expanded={!collapsedLegend}
            onClick={() => setCollapsedLegend((prev) => !prev)}
            className="flex w-full items-center justify-between bg-white/70 backdrop-blur-sm px-3 py-2 rounded-2xl cursor-pointer border border-black/10"
          >
            <span className="text-xs font-bold text-black">{legendLabel}</span>
            <motion.span
              aria-hidden
              initial={false}
              animate={{ rotate: collapsedLegend ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="text-gray-600"
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {!collapsedLegend && (
              <motion.div
                key="legend-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-col gap-3 overflow-y-auto bg-white/50 backdrop-blur-sm py-4 px-4 border border-black/10 rounded-2xl"
                  style={{ minHeight: 100, maxHeight: legendMaxHeight }}
                >
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
