
// type RouteArgs = {
//   id: "shonan" | "masuo" | "sakai";
//   url: string;
//   color: string;
//   lineWidth?: number;
//   beforeId?: string; // optional: place under labels if you want
// };

import { blobUrl } from "@/lib/blobUrl";

// const MESH_LAYER_IDS = [
//   "mesh-1km-fill", "mesh-1km-outline",
//   "mesh-500m-fill", "mesh-500m-outline",
//   "mesh-250m-fill", "mesh-250m-outline",
// ];

// // keep previous mesh visibility so we can restore exactly
// const meshPrevVisibility = new Map<string, "visible" | "none">();

// function hideMeshes(map: maplibregl.Map) {
//   MESH_LAYER_IDS.forEach((id) => {
//     if (!map.getLayer(id)) return;
//     const prev =
//       (map.getLayoutProperty(id, "visibility") as "visible" | "none") ??
//       "visible";
//     if (!meshPrevVisibility.has(id)) meshPrevVisibility.set(id, prev);
//     map.setLayoutProperty(id, "visibility", "none");
//   });
// }

// function restoreMeshes(map: maplibregl.Map) {
//   MESH_LAYER_IDS.forEach((id) => {
//     if (!map.getLayer(id)) return;
//     const prev = meshPrevVisibility.get(id) ?? "visible";
//     map.setLayoutProperty(id, "visibility", prev);
//     meshPrevVisibility.delete(id);
//   });
// }

// function ensureRouteScaffolding(map: maplibregl.Map, args: RouteArgs) {
//   const srcId = `route-${args.id}-src`;
//   const lineId = `route-${args.id}-line`;
//   const casingId = `route-${args.id}-casing`;

//   if (!map.getSource(srcId)) {
//     map.addSource(srcId, { type: "geojson", data: args.url });

//     // subtle white casing for contrast
//     if (!map.getLayer(casingId)) {
//       map.addLayer(
//         {
//           id: casingId,
//           type: "line",
//           source: srcId,
//           paint: {
//             "line-color": "#ffffff",
//             "line-width": (args.lineWidth ?? 3) + 3,
//             "line-opacity": 0.6,
//           },
//           layout: { visibility: "none" },
//         },
//         args.beforeId
//       );
//     }

//     if (!map.getLayer(lineId)) {
//       map.addLayer(
//         {
//           id: lineId,
//           type: "line",
//           source: srcId,
//           paint: {
//             "line-color": args.color,
//             "line-width": args.lineWidth ?? 3,
//           },
//           layout: { visibility: "none" },
//         },
//         args.beforeId
//       );
//     }
//   }

//   return { srcId, lineId, casingId };
// }

// function setRouteVisibility(
//   map: maplibregl.Map,
//   ids: { lineId: string; casingId: string },
//   vis: "visible" | "none"
// ) {
//   if (map.getLayer(ids.casingId)) {
//     map.setLayoutProperty(ids.casingId, "visibility", vis);
//   }
//   if (map.getLayer(ids.lineId)) {
//     map.setLayoutProperty(ids.lineId, "visibility", vis);
//   }
// }

// const addRouteLayer = (
//   map: maplibregl.Map,
//   routeVisible: boolean,
//   setRouteVisible: (v: boolean) => void,
//   args: RouteArgs
// ) => {
//   // 1) make sure source + layers exist
//   const ids = ensureRouteScaffolding(map, args);

//   // 2) toggle -> follow the same style as shops: perform visibility ops, then flip the state, then rely on idle to end loading
//   const nextVisible = !routeVisible;

//   if (nextVisible) {
//     // Hide mesh like your shops layer does before adding
//     hideMeshes(map);
//     setRouteVisibility(map, ids, "visible");
//     setRouteVisible(true);
//   } else {
//     setRouteVisibility(map, ids, "none");
//     // Bring meshes back when route is hidden
//     restoreMeshes(map);
//     setRouteVisible(false);
//   }
// };

// async function toggleRoute(
//   map: maplibregl.Map,
//   routeVisible: boolean,
//   setIsLoading: (v: boolean) => void,
//   setRouteVisible: (v: boolean) => void,
//   args: RouteArgs
// ) {
//   setIsLoading(true);

//   const run = () => {
//     addRouteLayer(map, routeVisible, setRouteVisible, args);
//     // match your pattern: finish loading on idle
//     map.once("idle", () => setIsLoading(false));
//   };

//   if (map.isStyleLoaded()) {
//     run();
//   } else {
//     map.once("style.load", run);
//   }
// }

// // --- Public helpers (wired exactly like MapView/MapControls import) -------

// export const toggleShonanRoute = (
//   map: maplibregl.Map,
//   shonanRouteVisible: boolean,
//   setIsLoading: (v: boolean) => void,
//   setShonanRouteVisible: (v: boolean) => void
// ) =>
//   toggleRoute(map, shonanRouteVisible, setIsLoading, setShonanRouteVisible, {
//     id: "shonan",
//     url: "/data/Bus_Route_Shonan.geojson",
//     color: "#1f78b4", // blue
//   });

// export const toggleMasuoRoute = (
//   map: maplibregl.Map,
//   masuoRouteVisible: boolean,
//   setIsLoading: (v: boolean) => void,
//   setMasuoRouteVisible: (v: boolean) => void
// ) =>
//   toggleRoute(map, masuoRouteVisible, setIsLoading, setMasuoRouteVisible, {
//     id: "masuo",
//     url: "/data/Bus_Route_Masuo.geojson",
//     color: "#33a02c", // green
//   });

// export const toggleSakaiRoute = (
//   map: maplibregl.Map,
//   sakaiRouteVisible: boolean,
//   setIsLoading: (v: boolean) => void,
//   setSakaiRouteVisible: (v: boolean) => void
// ) =>
//   toggleRoute(map, sakaiRouteVisible, setIsLoading, setSakaiRouteVisible, {
//     id: "sakai",
//     url: "/data/Bus_Route_Sakai.geojson",
//     color: "#e31a1c", // red
//   });

type RouteArgs = {
  id: "shonan" | "masuo" | "sakai";
  url: string;
  color: string;
  lineWidth?: number;
};

const MESH_LAYER_IDS = [
  "mesh-250m-fill", "mesh-250m-outline",
];


// Keep meshes hidden once we hide them
let meshesForcedHidden = false;
// Avoid attaching the style handler multiple times
let meshHandlerAttached = false;

// Track which routes are currently visible (so we can restore meshes only when none are left)
const visibleRoutes = new Set<RouteArgs["id"]>();

// keep previous mesh visibility so we can restore exactly
const meshPrevVisibility = new Map<string, "visible" | "none">();

function hideMeshes(map: maplibregl.Map) {
  meshesForcedHidden = true; // ← NEW
  MESH_LAYER_IDS.forEach((id) => {
    if (!map.getLayer(id)) return;
    const prev =
      (map.getLayoutProperty(id, "visibility") as "visible" | "none") ?? "visible";
    if (!meshPrevVisibility.has(id)) meshPrevVisibility.set(id, prev);
    if (prev !== "none") map.setLayoutProperty(id, "visibility", "none");
  });
}

// ❌ We will keep this function for potential future use,
// but we WON'T call it from toggleRoute anymore.
// function restoreMeshes(map: maplibregl.Map) {
//   MESH_LAYER_IDS.forEach((id) => {
//     if (!map.getLayer(id)) return;
//     const prev = meshPrevVisibility.get(id) ?? "visible";
//     map.setLayoutProperty(id, "visibility", prev);
//     meshPrevVisibility.delete(id);
//   });
// }
// Reusable: ensure source + (casing,line) exist
function ensureRouteLayers(map: maplibregl.Map, args: RouteArgs, beforeId?: string) {
  const srcId = `route-${args.id}-src`;
  const lineId = `route-${args.id}-line`;
  const casingId = `route-${args.id}-casing`;

  if (!map.getSource(srcId)) {
    map.addSource(srcId, { type: "geojson", data: args.url });
  }

  if (!map.getLayer(casingId)) {
    map.addLayer(
      {
        id: casingId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": "#ffffff",
          "line-width": (args.lineWidth ?? 3) + 3,
          "line-opacity": 0.6,
        },
        layout: { visibility: "none" },
      },
      beforeId
    );
  }

  if (!map.getLayer(lineId)) {
    map.addLayer(
      {
        id: lineId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": args.color,
          "line-width": args.lineWidth ?? 3,
        },
        layout: { visibility: "none" },
      },
      beforeId
    );
  }

  return { srcId, lineId, casingId };
}

function setRouteVisibility(
  map: maplibregl.Map,
  ids: { lineId: string; casingId: string },
  vis: "visible" | "none"
) {
  if (map.getLayer(ids.casingId)) {
    map.setLayoutProperty(ids.casingId, "visibility", vis);
  }
  if (map.getLayer(ids.lineId)) {
    map.setLayoutProperty(ids.lineId, "visibility", vis);
  }
}

function attachMeshStyleGuard(map: maplibregl.Map) {
  if (meshHandlerAttached) return;
  meshHandlerAttached = true;
  map.on("style.load", () => {
    if (meshesForcedHidden) {
      // style changed; hide meshes again if present in the new style
      hideMeshes(map);
    }
  });
}

// function addOrToggleRoute(
//   map: maplibregl.Map,
//   routeVisible: boolean,
//   setRouteVisible: (v: boolean) => void,
//   args: RouteArgs
// ) {
//   // place routes under the first place label (same pattern you use elsewhere)
//   const labelLayerId = map.getStyle().layers?.find(
//     (l) => l.type === "symbol" && (l as any).layout?.["text-field"] && l.id.includes("place")
//   )?.id;

//   const ids = ensureRouteLayers(map, args, labelLayerId);
//   const nextVisible = !routeVisible;

//   if (nextVisible) {
//     // If this is the first visible route, hide mesh layers
//     if (visibleRoutes.size === 0) hideMeshes(map);

//     visibleRoutes.add(args.id);
//     setRouteVisibility(map, ids, "visible");
//     setRouteVisible(true);
//   } else {
//     setRouteVisibility(map, ids, "none");
//     visibleRoutes.delete(args.id);

//     // If no routes remain, restore meshes
//     if (visibleRoutes.size === 0) restoreMeshes(map);
//     setRouteVisible(false);
//   }
// }

function addOrToggleRoute(
  map: maplibregl.Map,
  routeVisible: boolean,
  setRouteVisible: (v: boolean) => void,
  args: RouteArgs
) {
  // place routes under the first place label (same pattern you use elsewhere)
  const labelLayerId = map.getStyle().layers?.find(
    (l) => l.type === "symbol" && (l as any).layout?.["text-field"] && l.id.includes("place")
  )?.id;

  const ids = ensureRouteLayers(map, args, labelLayerId);
  const nextVisible = !routeVisible;

  if (nextVisible) {
    // If this is the first visible route, hide mesh layers and set up guard
    if (visibleRoutes.size === 0) {
      hideMeshes(map);
      attachMeshStyleGuard(map); // ← NEW: keep them hidden across style changes
    }
    visibleRoutes.add(args.id);
    setRouteVisibility(map, ids, "visible");
    setRouteVisible(true);
  } else {
    setRouteVisibility(map, ids, "none");
    visibleRoutes.delete(args.id);

    // IMPORTANT: DO NOT RESTORE MESHES when last route turns off
    // if (visibleRoutes.size === 0) restoreMeshes(map); // ← removed on purpose

    setRouteVisible(false);
  }
}

function runWithStyleReady(
  map: maplibregl.Map,
  fn: () => void
) {
  if (map.isStyleLoaded()) {
    fn();
  } else {
    map.once("style.load", fn);
  }
}

function toggleRoute(
  map: maplibregl.Map,
  routeVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setRouteVisible: (v: boolean) => void,
  args: RouteArgs
) {
  setIsLoading(true);

  const work = () => {
    addOrToggleRoute(map, routeVisible, setRouteVisible, args);
    map.once("idle", () => setIsLoading(false));
  };

  runWithStyleReady(map, work);
}

// ---- Public helpers (same signature you already call from MapControls) ----

export const toggleShonanRoute = (
  map: maplibregl.Map,
  shonanRouteVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setShonanRouteVisible: (v: boolean) => void
) =>
  toggleRoute(map, shonanRouteVisible, setIsLoading, setShonanRouteVisible, {
    id: "shonan",
    url: blobUrl("Bus_Route_Shonan.geojson"),
    color: "#1f78b4", // blue
  });

export const toggleMasuoRoute = (
  map: maplibregl.Map,
  masuoRouteVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setMasuoRouteVisible: (v: boolean) => void
) =>
  toggleRoute(map, masuoRouteVisible, setIsLoading, setMasuoRouteVisible, {
    id: "masuo",
    url:  blobUrl("Bus_Route_Masuo.geojson"),
    color: "#33a02c", // green
  });

export const toggleSakaiRoute = (
  map: maplibregl.Map,
  sakaiRouteVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setSakaiRouteVisible: (v: boolean) => void
) =>
  toggleRoute(map, sakaiRouteVisible, setIsLoading, setSakaiRouteVisible, {
    id: "sakai",
    url: "/data/Bus_Route_Sakai.geojson",
    color: "#e31a1c", // red
  });
