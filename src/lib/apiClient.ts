// src/lib/apiClient.ts
export type CoverResp = {
  ok: true;
  data: {
    meshIds: string[];
    cellCount: number;
    area_m2: number;
    cells?: { mesh_id: string; geometry: GeoJSON.Geometry }[];
  };
};

export type AskResp = {
  ok: true;
  data: {
    questionId: number;
    answer: string;
    facts: any;
  };
};

const BASE = import.meta.env.VITE_BACKEND_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

async function req<T>(path: string, init: RequestInit): Promise<T> {
  const res = await withTimeout(fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(init.headers || {}),
    }
  }));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${text}`.slice(0, 512));
  }
  return res.json() as Promise<T>;
}

export async function gridCover(geom: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection, opts?: {
  coverage?: number;
  buffer_m?: number;
  returnGeoJson?: boolean;
  limit?: number;
}): Promise<CoverResp> {
  return req<CoverResp>('/grid/cover', {
    method: 'POST',
    body: JSON.stringify({
      geom, coverage: 0, buffer_m: 0, returnGeoJson: false, limit: 20000, ...(opts || {})
    })
  });
}

export async function askAI(params: { meshIds: string[]; question: string; metricKeys?: string[]; snapshot?: string; }): Promise<AskResp> {
  return req<AskResp>('/ask', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}
