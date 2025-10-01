import * as React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export type LegendRow = {
  group: string;        // 凡例グループ
  no: string | number;  // 施設番号 (NO)
  name: string;         // 施設名 / 名前 / 店舗名
};

// Same palette logic as your dialog
function paletteForGroup(group?: string) {
  const g = `${group ?? ""}`;
  if (/教育|学校|学園/i.test(g))         return { head: "bg-emerald-200",  row: "bg-emerald-50",  border: "border-emerald-300" };
  if (/市民|サービス|行政|出張所/i.test(g))  return { head: "bg-sky-200",      row: "bg-sky-50",      border: "border-sky-300" };
  if (/児童|保育|子育て|こども園/i.test(g))  return { head: "bg-amber-200",    row: "bg-amber-50",    border: "border-amber-300" };
  if (/文化|スポーツ|体育|図書|芸術/i.test(g)) return { head: "bg-indigo-200",  row: "bg-indigo-50",   border: "border-indigo-300" };
  if (/医療|病院|診療|福祉|介護/i.test(g))    return { head: "bg-rose-200",    row: "bg-rose-50",     border: "border-rose-300" };
  const families = [
    { head: "bg-emerald-200", row: "bg-emerald-50", border: "border-emerald-300" },
    { head: "bg-sky-200",     row: "bg-sky-50",     border: "border-sky-300" },
    { head: "bg-amber-200",   row: "bg-amber-50",   border: "border-amber-300" },
    { head: "bg-indigo-200",  row: "bg-indigo-50",  border: "border-indigo-300" },
    { head: "bg-rose-200",    row: "bg-rose-50",    border: "border-rose-300" },
    { head: "bg-lime-200",    row: "bg-lime-50",    border: "border-lime-300" },
    { head: "bg-fuchsia-200", row: "bg-fuchsia-50", border: "border-fuchsia-300" },
    { head: "bg-cyan-200",    row: "bg-cyan-50",    border: "border-cyan-300" },
  ];
  let hash = 0;
  for (let i = 0; i < g.length; i++) hash = (hash * 33 + g.charCodeAt(i)) >>> 0;
  return families[hash % families.length];
}

export default function LegendGroupTableInline({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: LegendRow[];
  onClose?: () => void;
}) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      String(r.group ?? "").toLowerCase().includes(s) ||
      String(r.no ?? "").toLowerCase().includes(s) ||
      String(r.name ?? "").toLowerCase().includes(s)
    );
  }, [q, rows]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, LegendRow[]>();
    for (const r of filtered) {
      const key = r.group || "（未分類）";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "ja"));
  }, [filtered]);

  return (
    <Card className="bg-white/70 backdrop-blur-2xl rounded-2xl border border-black/10 pb-3 px-0 pt-0" >
      <div className="p-3 border  bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center gap-2">
        <CardTitle className="text-sm font-semibold flex-1 text-center">{title}</CardTitle>
        {onClose && (
          <button
            type="button"
            aria-label="close inline table"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-lg border bg-white hover:bg-white/80"
          >
            閉じる
          </button>
        )}
      </div>

      <CardContent className="px-3 pt-0 space-y-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="グループ / 番号 / 名称でフィルター…"
          className="h-8 rounded-xl bg-white/80"
        />

        {grouped.length === 0 ? (
          <div className="rounded-xl border bg-white/60 backdrop-blur p-6 text-center text-sm text-muted-foreground">
            No rows match your filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {grouped.map(([groupLabel, list]) => {
              const pal = paletteForGroup(groupLabel);
              return (
                <section key={groupLabel} className={`rounded-2xl overflow-hidden border ${pal.border} bg-white/70`}>
                  <div className={`px-4 py-2 text-sm font-semibold ${pal.head} border-b ${pal.border}`}>
                    {groupLabel}
                  </div>
                  <Table className="w-full text-sm">
                    <TableHeader />
                    <TableBody>
                      {list.map((r, i) => (
                        <TableRow key={i} className={`${pal.row} hover:bg-white transition-colors`}>
                          <TableCell className={`align-top border-r ${pal.border}`}>{r.no ?? ""}</TableCell>
                          <TableCell className="whitespace-normal break-words">{r.name ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              );
            })}
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-1">
          Showing {filtered.length.toLocaleString()} / {rows.length.toLocaleString()} rows
        </div>
      </CardContent>
    </Card>
  );
}
