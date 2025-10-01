// layers/terrain.ts
import type maplibregl from "maplibre-gl";

const DEM_SOURCE_ID = "terrain-dem";
const HILLSHADE_LAYER_ID = "terrain-hillshade";

/**
 * Toggle MapTiler 3D terrain (raster-dem + hillshade) ON/OFF.
 * Matches your existing layer toggle pattern (e.g., medical layer).
 *
 * @param map MapLibre map instance
 * @param terrainEnabled current visibility flag
 * @param setIsLoading react setter to show/hide loading UI
 * @param setTerrainEnabled react setter to flip terrainEnabled
 * @param maptilerKey your MapTiler API key
 * @param options optional placement + exaggeration
 *        { exaggeration?: number; hillshadeBeforeId?: string }
 */
export const toggleTerrainLayer = (
  map: maplibregl.Map,
  terrainEnabled: boolean,
  setIsLoading: (v: boolean) => void,
  setTerrainEnabled: (v: boolean) => void,
  options?: { exaggeration?: number; hillshadeBeforeId?: string }
) => {
  setIsLoading(true);

  const url = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=HCoMhdrImqEq1BdoYmms`;
  const exaggeration = options?.exaggeration ?? 1.5;

  // pick a label layer to insert hillshade beneath (similar to your medical pattern)
  const labelLayerId =
    options?.hillshadeBeforeId ??
    map.getStyle().layers?.find(
      (l) =>
        l.type === "symbol" &&
        // keep close to your existing heuristic
        (l.layout as any)?.["text-field"] &&
        l.id.includes("place")
    )?.id;

  if (!terrainEnabled) {
    // ADD: source
    if (!map.getSource(DEM_SOURCE_ID)) {
      map.addSource(DEM_SOURCE_ID, {
        type: "raster-dem",
        url,
        tileSize: 256,
        maxzoom: 14,
      } as any);
    }

    // ENABLE terrain
    (map as any).setTerrain({ source: DEM_SOURCE_ID, exaggeration });

    // ADD: hillshade layer (optional but nice)
    if (!map.getLayer(HILLSHADE_LAYER_ID)) {
      map.addLayer(
        {
          id: HILLSHADE_LAYER_ID,
          type: "hillshade",
          source: DEM_SOURCE_ID,
          layout: { visibility: "visible" },
          paint: { "hillshade-shadow-color": "#473B24" },
        } as any,
        labelLayerId // place below labels if found
      );
    } else {
      map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", "visible");
    }
  } else {
    // DISABLE terrain
    (map as any).setTerrain(null);

    // REMOVE/Hide hillshade
    if (map.getLayer(HILLSHADE_LAYER_ID)) {
      map.removeLayer(HILLSHADE_LAYER_ID);
    }

    // REMOVE source
    if (map.getSource(DEM_SOURCE_ID)) {
      map.removeSource(DEM_SOURCE_ID);
    }
  }

  setTerrainEnabled(!terrainEnabled);

  map.once("idle", () => setIsLoading(false));
};
