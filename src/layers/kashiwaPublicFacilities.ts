import { blobUrl } from "@/lib/blobUrl";


export const categoriesNew = [
  { label: '3', color: '#FF5733' },
  { label: '9', color: '#33FF57' },
  { label: '11', color: '#DDD92A' },
  { label: '12', color: '#313715' },
  { label: '13', color: '#91E5F6' },
  { label: '14', color: '#FF1053' },
  { label: '15', color: '#725AC1' },
  { label: '16', color: '#A1EF8B' },
  { label: '17', color: '#5D737E' },
  { label: '18', color: '#FF9000' },
  { label: '19', color: '#13070C' },
];

// export const categoriesNew = [
//   { label: '保育園・幼稚園など', color: '#0072B2' },
//   { label: '児童・保育・子育て施設', color: '#E69F00' },
//   { label: '図書館', color: '#009E73' },
//   { label: '市民サービス施設', color: '#D55E00' },
//   { label: '教育施設', color: '#CC79A7' },
//   // { label: '病院・薬局', color: '#56B4E9' },
//   { label: '病院・薬局・診療所', color: '#ef233c' },
// ];

export const toggleKashiwaPublicFacilityLayer = (
  map: maplibregl.Map,
  kashiwaPublicFacilityVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setKashiwaPublicFacilityVisible: (v: boolean) => void,
  selectedCategories: string[]
) => {
  setIsLoading(true);

  const addFacilityLayer = (map: maplibregl.Map, selectedCategories: string[]) => {
    const sourceId = 'kashiwa-public-facility';
    // const geojsonUrl = blobUrl('kashiwa_public_facilities_new.geojson');
    const geojsonUrl = '/data/PublicFacility.geojson';

    // Add the source if it's not already present
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonUrl
      });
    }

    // Define the categories and their corresponding colors


    // Check if "全て" (All) is selected
    const showAllFacilities = selectedCategories.includes('');  // Check if "全て" is selected

    // Remove "subete" layer if it exists
    if (map.getLayer('kashiwa-public-facility-subete')) {
      map.removeLayer('kashiwa-public-facility-subete');
    }

    // Add the "subete" layer if "全て" is selected
    if (showAllFacilities) {
      // Add the "subete" layer that shows all categories without any filter
      const layerId = `kashiwa-public-facility-subete`;

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 10,
            'circle-opacity': 0.8,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,

            'circle-color': [
              'match',

              ['get', 'P02_002'],
              '3', '#FF5733',  // 1
              '9', '#33FF57',   // 2
              '11', '#DDD92A',  // 3
              '12', '#313715',  // 4
              '13', '#91E5F6',  // 5  
              '14', '#FF1053',  // 6    
              '15', '#725AC1', // 7
              '16', '#A1EF8B',  // 8
              '17', '#5D737E', // 9  
              '18', '#FF9000',  // 10
              '19', '#13070C', // 11
              /* default */ '#9E9E9E'
            ]
          }
        });
      }
    } else {
      // Add layers for selected categories if "subete" is not selected
      categoriesNew.forEach((category) => {
        const layerId = `kashiwa-public-facility-${category.label}`;

        // Remove individual layer if it exists before adding a new one
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }

        // Add the layer only if it's selected
        if (selectedCategories.includes(category.label)) {
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            filter: ['==', ['get', 'P02_002'], category.label], // Apply filter by category
            paint: {
              'circle-radius': 10,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2,

              'circle-color': category.color // Set the color based on the category
            }
          });
        }
      });


    }

    // Mark layer visibility state as updated
    setKashiwaPublicFacilityVisible(!kashiwaPublicFacilityVisible);
    map.once('idle', () => setIsLoading(false));
  };
  // Ensure that the map style is loaded
  if (map.isStyleLoaded()) {

    [
      'mesh-1km-fill', 'mesh-1km-outline',
      'mesh-500m-fill', 'mesh-500m-outline',
      'mesh-250m-fill', 'mesh-250m-outline',
    ].forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    addFacilityLayer(map, selectedCategories);
  } else {
    // Wait for style to load before adding the layer
    map.on('style.load', () => {
      addFacilityLayer(map, selectedCategories);
    });
  }


};
// layers/kashiwaPublicFacilities.ts
const FAC_SRC_ID = "kashiwa-public-facility";
const FAC_GEOJSON_URL = blobUrl("kashiwa_public_facilities_new.geojson");
const LABEL_LEFT_ID = "kashiwa-public-facility-labels-left";
const LABEL_RIGHT_ID = "kashiwa-public-facility-labels-right";

function ensureFacilitySource(map: maplibregl.Map) {
  if (!map.getSource(FAC_SRC_ID)) {
    map.addSource(FAC_SRC_ID, { type: "geojson", data: FAC_GEOJSON_URL });
  }
}

/** Filter that mirrors selected categories; empty/“all” => show everything */
function facilityFilter(selectedCategories: string[]) {
  const showAll = selectedCategories.includes("") || selectedCategories.length === 0;
  return showAll ? undefined : ([
    "in",
    ["get", "P02_003"],
    ["literal", selectedCategories],
  ] as any);
}

/** Deterministic split of features into two groups using the length of NO */
function parityFilter(isRightSide: boolean) {
  const parityExpr: any = [
    "%",
    ["length", ["to-string", ["coalesce", ["get", "NO"], ["get", "No"], ["get", "no"], ""]]],
    2,
  ];
  return ["==", parityExpr, isRightSide ? 0 : 1] as any;
}

function addFacilityLabelLayers(map: maplibregl.Map, selectedCategories: string[]) {
  // Clean up old label layers
  [LABEL_LEFT_ID, LABEL_RIGHT_ID].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });

  ensureFacilitySource(map);

  const cat = facilityFilter(selectedCategories);

  // Compose final filters: categoryFilter AND parityFilter
  const leftFilter = cat ? (["all", cat, parityFilter(false)] as any) : parityFilter(false);
  const rightFilter = cat ? (["all", cat, parityFilter(true)] as any) : parityFilter(true);

  const ANCHORS_LEFT = ["left", "top-left", "bottom-left", "top", "bottom"] as (
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
  )[];
  const ANCHORS_RIGHT = ["right", "top-right", "bottom-right", "top", "bottom"] as (
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
  )[];

  // LEFT side labels
  map.addLayer({
    id: LABEL_LEFT_ID,
    type: "symbol",
    source: FAC_SRC_ID,
    filter: leftFilter,
    layout: {
      "text-field": ["to-string", ["coalesce", ["get", "NO"], ["get", "No"], ["get", "no"], ""]],
      "text-size": 12,
      "symbol-placement": "point",
      "text-variable-anchor": ANCHORS_LEFT,   // <- constant
      "text-radial-offset": 0.8,              // distance from point
      "text-offset": [-1.2, 0],               // <- constant per layer (left)
      "text-allow-overlap": false,
      "text-keep-upright": true,
      "text-padding": 2,
      "symbol-z-order": "auto",
    },
    paint: {
      "text-color": "#111111",
      "text-halo-color": "#FFFFFF",
      "text-halo-width": 1.2,
      "text-halo-blur": 0.5,
    },
  });

  // RIGHT side labels
  map.addLayer({
    id: LABEL_RIGHT_ID,
    type: "symbol",
    source: FAC_SRC_ID,
    filter: rightFilter,
    layout: {
      "text-field": ["to-string", ["coalesce", ["get", "NO"], ["get", "No"], ["get", "no"], ""]],
      "text-size": 12,
      "symbol-placement": "point",
      "text-variable-anchor": ANCHORS_RIGHT,  // <- constant
      "text-radial-offset": 0.8,
      "text-offset": [1.2, 0],                // <- constant per layer (right)
      "text-allow-overlap": false,
      "text-keep-upright": true,
      "text-padding": 2,
      "symbol-z-order": "auto",
    },
    paint: {
      "text-color": "#111111",
      "text-halo-color": "#FFFFFF",
      "text-halo-width": 1.2,
      "text-halo-blur": 0.5,
    },
  });

  // NOTE: We do NOT call moveLayer; layers render on top because they’re added last.
}

export function toggleKashiwaPublicFacilityLabels(
  map: maplibregl.Map,
  labelsVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setLabelsVisible: (v: boolean) => void,
  selectedCategories: string[]
) {
  setIsLoading(true);

  // Optional: hide meshes while toggling (kept from your pattern)
  [
    "mesh-1km-fill",
    "mesh-1km-outline",
    "mesh-500m-fill",
    "mesh-500m-outline",
    "mesh-250m-fill",
    "mesh-250m-outline",
  ].forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  });

  // OFF -> remove both layers
  if (labelsVisible) {
    [LABEL_LEFT_ID, LABEL_RIGHT_ID].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    setLabelsVisible(false);
    map.once("idle", () => setIsLoading(false));
    return;
  }

  // ON -> add both layers
  const start = () => {
    addFacilityLabelLayers(map, selectedCategories);
    setLabelsVisible(true);
    map.once("idle", () => setIsLoading(false));
  };

  if (map.isStyleLoaded()) start();
  else map.once("style.load", start);
}

/** Call this when categories change (only if label toggle is ON) */
export function updateKashiwaPublicFacilityLabelsFilter(
  map: maplibregl.Map,
  selectedCategories: string[]
) {
  if (!map.getStyle()) return;

  const cat = facilityFilter(selectedCategories);
  const left = cat ? (["all", cat, parityFilter(false)] as any) : parityFilter(false);
  const right = cat ? (["all", cat, parityFilter(true)] as any) : parityFilter(true);

  if (map.getLayer(LABEL_LEFT_ID)) map.setFilter(LABEL_LEFT_ID, left);
  if (map.getLayer(LABEL_RIGHT_ID)) map.setFilter(LABEL_RIGHT_ID, right);
}