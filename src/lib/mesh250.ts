// src/lib/mesh250.ts
// 250 m Web Mercator mesh (EPSG:3857) — client-side generator
// IDs match backend: m250_3857_<x0Meters>_<y0Meters>

const R = 6378137;                 // Web Mercator sphere
const CELL = 250;                  // 250 m
const PI = Math.PI;

export type Bounds = { west: number; south: number; east: number; north: number };

function fwd(lng: number, lat: number): { x: number; y: number } {
  const λ = (lng * PI) / 180;
  const φ = (lat * PI) / 180;
  const x = R * λ;
  const y = R * Math.log(Math.tan(PI / 4 + φ / 2));
  return { x, y };
}

function inv(x: number, y: number): { lng: number; lat: number } {
  const λ = x / R;
  const φ = 2 * Math.atan(Math.exp(y / R)) - PI / 2;
  return { lng: (λ * 180) / PI, lat: (φ * 180) / PI };
}

function snapDown(m: number, step = CELL) {
  // Ensure we snap *down* even for negative coordinates
  return Math.floor(m / step) * step;
}
function snapUp(m: number, step = CELL) {
  return Math.ceil(m / step) * step;
}

export function meshIdFromMeters(x0: number, y0: number) {
  // integers (no decimals) to match DB mesh_id strings
  return `m250_3857_${x0}_${y0}`;
}

export function meshIdFromLngLat(lng: number, lat: number) {
  const { x, y } = fwd(lng, lat);
  const x0 = snapDown(x);
  const y0 = snapDown(y);
  return meshIdFromMeters(x0, y0);
}

export function cellPolygonFromMeters(x0: number, y0: number): GeoJSON.Polygon {
  const x1 = x0 + CELL;
  const y1 = y0 + CELL;
  const sw = inv(x0, y0);
  const se = inv(x1, y0);
  const ne = inv(x1, y1);
  const nw = inv(x0, y1);
  return {
    type: "Polygon",
    coordinates: [[
      [sw.lng, sw.lat],
      [se.lng, se.lat],
      [ne.lng, ne.lat],
      [nw.lng, nw.lat],
      [sw.lng, sw.lat],
    ]],
  };
}

export function buildMeshForBounds(
  b: Bounds,
  maxCells = 20000
): { features: GeoJSON.Feature[]; meshIds: string[]; n: number; tooMany: boolean } {
  // convert bounds to meters
  const pSW = fwd(b.west, b.south);
  const pNE = fwd(b.east, b.north);

  const minX = Math.min(pSW.x, pNE.x);
  const maxX = Math.max(pSW.x, pNE.x);
  const minY = Math.min(pSW.y, pNE.y);
  const maxY = Math.max(pSW.y, pNE.y);

  const xStart = snapDown(minX);
  const xEnd = snapUp(maxX);
  const yStart = snapDown(minY);
  const yEnd = snapUp(maxY);

  const nx = Math.max(0, Math.round((xEnd - xStart) / CELL));
  const ny = Math.max(0, Math.round((yEnd - yStart) / CELL));
  const n = nx * ny;

  if (n > maxCells) {
    return { features: [], meshIds: [], n, tooMany: true };
  }

  const features: GeoJSON.Feature[] = [];
  const meshIds: string[] = [];

  for (let xi = xStart; xi < xEnd; xi += CELL) {
    for (let yi = yStart; yi < yEnd; yi += CELL) {
      const id = meshIdFromMeters(xi, yi);
      meshIds.push(id);
      features.push({
        type: "Feature",
        id,
        properties: { mesh_id: id },
        geometry: cellPolygonFromMeters(xi, yi),
      } as GeoJSON.Feature);
    }
  }

  return { features, meshIds, n, tooMany: false };
}

// Simple point-in-polygon for convex-ish selection (ray cast)
function pointInRing([px, py]: [number, number], ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Given a polygon selection (Lng/Lat), return meshIds whose cell centers fall inside. */
export function coverBox(
  poly: GeoJSON.Polygon,
  maxCells = 20000
): { meshIds: string[]; n: number; tooMany: boolean } {
  const ring = poly.coordinates[0] as [number, number][];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const bounds: Bounds = {
    west: Math.min(...xs),
    east: Math.max(...xs),
    south: Math.min(...ys),
    north: Math.max(...ys),
  };

  const coarse = buildMeshForBounds(bounds, maxCells);
  if (coarse.tooMany) return coarse;

  // filter to cells whose centers are in the polygon
  const meshIds: string[] = [];
  for (const f of coarse.features) {
    // center from meters of lower-left + 125,125
    const id = (f.id as string) || (f.properties as any)?.mesh_id;
    if (!id) continue;
    const [, , x0s, y0s] = id.split("_");
    const x0 = parseInt(x0s, 10);
    const y0 = parseInt(y0s, 10);
    const c = inv(x0 + CELL / 2, y0 + CELL / 2);
    if (pointInRing([c.lng, c.lat], ring)) meshIds.push(id);
  }

  return { meshIds, n: meshIds.length, tooMany: false };
}
