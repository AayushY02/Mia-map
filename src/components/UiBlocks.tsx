// src/components/UiBlocks.tsx
import type { UiDoc, UiBlock } from "@/lib/qaClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/** ----- tone helpers for shadcn Alert ----- */
type CalloutTone = "info" | "success" | "warning" | "danger" | "destructive";

const toAlertVariant = (tone?: CalloutTone): "default" | "destructive" =>
  tone === "danger" || tone === "destructive" ? "destructive" : "default";

// Add color via Tailwind classes (Alert supports only "default" | "destructive")
const toCalloutClasses = (tone?: CalloutTone) => {
  switch (tone) {
    case "success":
      return "bg-green-50 border-green-200 text-green-900";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "danger":
    case "destructive":
      return "bg-red-50 border-red-200 text-red-900";
    case "info":
    default:
      return "bg-blue-50 border-blue-200 text-blue-900";
  }
};

/** ----- individual renderers ----- */
function BlockKpis({ block }: { block: Extract<UiBlock, { type: "kpis" }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {block.items.map((it, i) => (
        <Card key={i} className="border">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-semibold mt-1">
              {it.value}
              {it.suffix ? (
                <span className="ml-1 text-sm text-muted-foreground">{it.suffix}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BlockTable({ block }: { block: Extract<UiBlock, { type: "table" }> }) {
  return (
    <Card className="border">
      {block.title ? (
        <CardHeader className="py-2">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="py-2">
        <Table>
          <TableHeader>
            <TableRow>
              {block.columns.map((c, i) => (
                <TableHead key={i}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci}>{cell ?? ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BlockList({ block }: { block: Extract<UiBlock, { type: "list" }> }) {
  return (
    <Card className="border">
      {block.title ? (
        <CardHeader className="py-2">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="py-3">
        {block.ordered ? (
          <ol className="list-decimal pl-5 space-y-1">
            {block.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {block.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BlockCallout({ block }: { block: Extract<UiBlock, { type: "callout" }> }) {
  return (
    <Alert variant={toAlertVariant(block.tone)} className={toCalloutClasses(block.tone)}>
      {block.title ? <AlertTitle>{block.title}</AlertTitle> : null}
      <AlertDescription>{block.text}</AlertDescription>
    </Alert>
  );
}

function BlockChips({ block }: { block: Extract<UiBlock, { type: "chips" }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.items.map((chip, i) => (
        <Badge key={i} variant="secondary">
          {chip.text}
        </Badge>
      ))}
    </div>
  );
}

/** ----- main renderer ----- */
export function UiBlocks({ ui }: { ui?: UiDoc }) {
  if (!ui?.blocks?.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {ui.blocks.map((b, i) => {
        switch (b.type) {
          case "kpis":
            return <BlockKpis key={i} block={b} />;
          case "table":
            return <BlockTable key={i} block={b} />;
          case "list":
            return <BlockList key={i} block={b} />;
          case "callout":
            return <BlockCallout key={i} block={b} />;
          case "chips":
            return <BlockChips key={i} block={b} />;
          default:
            return null; // unknown block type: ignore gracefully
        }
      })}
    </div>
  );
}
