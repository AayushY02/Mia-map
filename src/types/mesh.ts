// frontend/src/types/mesh.ts
export interface MeshFeature {
  id: string;                       // e.g. "533946112"
  level: '250m' | '500m' | '1km';
  properties: Record<string, number | string | null>;
}
