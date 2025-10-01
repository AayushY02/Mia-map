import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import type { UserLayerFilters } from "./types";

/* Palettes (light → dark) */
export const PALETTES: Record<string, string[]> = {
  OrRd:   ["#fff7ec","#fee8c8","#fdd49e","#fdbb84","#fc8d59","#ef6548","#d7301f","#b30000"],
  YlGnBu: ["#ffffcc","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494"],
  PuRd:   ["#f1eef6","#d7b5d8","#df65b0","#dd1c77","#980043"],
  Set2:   ["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"],
};

export function extractProps(fc: GeoJSON.FeatureCollection) {
  const props: Record<string, { numeric: boolean }> = {};
  for (const f of fc.features) {
    const p = f.properties || {};
    for (const k of Object.keys(p)) {
      const v = (p as any)[k];
      if (!props[k]) props[k] = { numeric: false };
      if (typeof v === "number") props[k].numeric = true;
      else if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
        props[k].numeric = true;
      }
    }
  }
  return props;
}

export function collectNumeric(fc: GeoJSON.FeatureCollection, prop: string): number[] {
  const out: number[] = [];
  for (const f of fc.features) {
    const v = (f.properties as any)?.[prop];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/* Equal interval */
export function equalBreaks(values: number[], k: number): number[] {
  if (!values.length) return [];
  const v = values.slice().sort((a,b)=>a-b);
  const min = v[0], max = v[v.length-1];
  const step = (max - min) / k;
  const breaks: number[] = [];
  for (let i=1;i<k;i++) breaks.push(min + i*step);
  return breaks;
}

/* Quantile */
export function quantileBreaks(values: number[], k: number): number[] {
  if (!values.length) return [];
  const v = values.slice().sort((a,b)=>a-b);
  const breaks: number[] = [];
  for (let i=1;i<k;i++) {
    const q = i/k;
    const pos = (v.length-1)*q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    const val = lo===hi ? v[lo] : v[lo]*(hi-pos)+v[hi]*(pos-lo);
    breaks.push(val);
  }
  return breaks;
}

/* Natural breaks (Jenks) */
export function jenksBreaks(values: number[], k: number): number[] {
  if (!values.length) return [];
  const data = values.slice().sort((a,b)=>a-b);
  const n = data.length;
  k = Math.max(2, Math.min(k, Math.min(9, n)));
  const mat1 = Array.from({length: n+1}, ()=>Array(k+1).fill(0));
  const mat2 = Array.from({length: n+1}, ()=>Array(k+1).fill(Infinity));
  for (let i=1;i<=k;i++){ mat1[0][i]=1; mat2[0][i]=0; for (let j=1;j<=n;j++) mat2[j][i]=Infinity; }
  for (let l=2;l<=n;l++) {
    let s1=0,s2=0,w=0;
    for (let m=1;m<=l;m++){
      const i3 = l-m+1;
      const val = data[i3-1];
      s2+=val*val; s1+=val; w+=1;
      const v = s2 - (s1*s1)/w;
      const i4 = i3-1;
      if (i4!==0) {
        for (let j=2;j<=k;j++){
          if (mat2[l][j] >= v + mat2[i4][j-1]) {
            mat1[l][j]=i3; mat2[l][j]=v + mat2[i4][j-1];
          }
        }
      }
    }
    mat1[l][1]=1; mat2[l][1]=s2 - (s1*s1)/w;
  }
  const breaks: number[] = [];
  let kclass = k; let last = n;
  while (kclass>1){
    const id = mat1[last][kclass]-2;
    breaks.push(data[id]);
    last = mat1[last][kclass]-1;
    kclass--;
  }
  breaks.sort((a,b)=>a-b);
  return breaks;
}

/* Expressions */
export function graduatedColorExpr(prop: string, breaks: number[], colors: string[]): ExpressionSpecification {
  const input: any = ["to-number", ["get", prop]];
  const expr: any[] = ["step", input, colors[0]];
  for (let i=0;i<breaks.length;i++) expr.push(breaks[i], colors[i+1]);
  return expr as ExpressionSpecification;
}
export function categoricalColorExpr(prop: string, mapping: Record<string,string>, fallback: string): ExpressionSpecification {
  const expr: any[] = ["match", ["coalesce", ["to-string", ["get", prop]], ""]];
  for (const [val, color] of Object.entries(mapping)) expr.push(val, color);
  expr.push(fallback);
  return expr as ExpressionSpecification;
}
export function lineWidthByZoom(base: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"],
    8, Math.max(0.6, base*0.35),
    12, Math.max(1.2, base*0.7),
    14, Math.max(2.0, base*1.0),
    16, Math.max(3.5, base*1.6),
    18, Math.max(6.0, base*2.4),
  ] as ExpressionSpecification;
}
export function circleRadiusByZoom(base: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"],
    8, Math.max(2, base*0.7),
    12, Math.max(4, base*1.0),
    14, Math.max(6, base*1.2),
    16, Math.max(8, base*1.5),
    18, Math.max(10, base*1.8),
  ] as ExpressionSpecification;
}

export function legendFromBreaks(breaks: number[], colors: string[]) {
  const out: {label:string;color:string}[] = [];
  const fmt = (n:number)=> Number.isFinite(n) ? (Math.abs(n)>=1000? n.toFixed(0): (+n.toFixed(2)).toString()) : "—";
  for (let i=0;i<colors.length;i++){
    if (i===0) out.push({label:`< ${fmt(breaks[0])}`, color:colors[0]});
    else if (i===colors.length-1) out.push({label:`≥ ${fmt(breaks[breaks.length-1])}`, color:colors[i]});
    else out.push({label:`${fmt(breaks[i-1])} – ${fmt(breaks[i])}`, color:colors[i]});
  }
  return out;
}

/* Build a MapLibre filter from our filter config */
export function buildFilterExpr(filters?: UserLayerFilters): FilterSpecification | null {
  if (!filters || !filters.rules?.length) return null;
  const parts: any[] = [];
  for (const r of filters.rules) {
    const gStr = ["coalesce", ["to-string", ["get", r.prop]], ""];
    const gNum = ["to-number", ["get", r.prop]];
    switch (r.op) {
      case "==": parts.push(["==", gStr, String(r.value ?? "")]); break;
      case "!=": parts.push(["!=", gStr, String(r.value ?? "")]); break;
      case ">":  parts.push([">", gNum, Number(r.value ?? 0)]); break;
      case ">=": parts.push([">=", gNum, Number(r.value ?? 0)]); break;
      case "<":  parts.push(["<", gNum, Number(r.value ?? 0)]); break;
      case "<=": parts.push(["<=", gNum, Number(r.value ?? 0)]); break;
      case "between":
        parts.push(["all", [">=", gNum, Number(r.value ?? 0)], ["<=", gNum, Number(r.value2 ?? r.value ?? 0)]]);
        break;
      case "contains": {
        const hay = r.caseInsensitive ? ["downcase", gStr] : gStr;
        const needle = r.caseInsensitive ? String(r.value ?? "").toLowerCase() : String(r.value ?? "");
        parts.push([">=", ["index-of", needle, hay], 0]);
        break;
      }
    }
  }
  return (filters.logic === "OR" ? (["any", ...parts]) : (["all", ...parts])) as any;
}
