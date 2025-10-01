
export const JAPAN_BOUNDS: maplibregl.LngLatBoundsLike = [
  [122.93457, 20.42596],
  [153.98667, 45.55148]
];

export const CHIBA_BOUNDS: maplibregl.LngLatBoundsLike = [
  [139.50, 34.70],   // Southwest (slightly lower to include southern tip)
  [141.00, 36.20]    // Northeast (higher to include full northern edge)
];


export const INABE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [136.408295, 35.064335], // 南西
  [136.593994, 35.257534]  // 北東
];

// Approximate bounding box for Aichi Prefecture
// Southwest corner to Northeast corner (covers Nagoya and surrounding area)
export const MIE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [135.853104, 33.723335], // 南西
  [136.986404, 35.257534]  // 北東
];
