// src/lib/qaClient.ts
export type MeshLevel = "250m" | "500m" | "1km";
export type MeshRef = { level: MeshLevel; id: string };

export type UiDoc = { blocks?: UiBlock[] } | null | undefined;

export type UiBlock =
  | { type: "kpis"; items: { label: string; value: string | number; suffix?: string }[] }
  | { type: "table"; title?: string; columns: string[]; rows: (string | number | null)[][] }
  | { type: "list"; title?: string; ordered?: boolean; items: string[] }
  | { type: "callout"; tone?: "info" | "success" | "warning" | "danger" | "destructive"; text: string; title?: string }
  | { type: "chips"; items: { text: string }[] };

export async function askMeshQA(payload: {
  meshRef?: MeshRef;
  selectedFeature?: { lon: number; lat: number; globalId?: string; layerId?: string; name?: string };
  question: string;
}) {
  const r = await fetch("http://localhost:4000/api/mesh-qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as { answer: string; ui?: UiDoc };
}
