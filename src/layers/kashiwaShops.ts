


// export const shopCategories = [
//     { label: 'デパート・ショッピングモール', color: '#FF5733' }, // Red for Shopping Mall
//     { label: 'スーパーマーケット', color: '#33FF57' },           // Green for Supermarket
//     { label: 'その他', color: '#FF99C8' },           // Green for Supermarket
// ];

import { blobUrl } from "@/lib/blobUrl";

// function registerShopSquareImages(map: maplibregl.Map) {
//     const baseSize = 80;  // px
//     const border = 10;     // px
//     const idsAndColors: Array<[string, string]> = [
//         ['shop-square-デパート・ショッピングモール', '#FF5733'],
//         ['shop-square-スーパーマーケット', '#33FF57'],
//         ['shop-square-その他', '#FF99C8'], // default
//     ];

//     const makeSquare = (fill: string) => {
//         const canvas = document.createElement('canvas');
//         canvas.width = baseSize;
//         canvas.height = baseSize;
//         const ctx = canvas.getContext('2d')!;
//         ctx.clearRect(0, 0, baseSize, baseSize);
//         // outer white
//         ctx.fillStyle = '#FFFFFF';
//         ctx.fillRect(0, 0, baseSize, baseSize);
//         // inner fill
//         ctx.fillStyle = fill;
//         ctx.fillRect(border, border, baseSize - border * 2, baseSize - border * 2);

//         // Get pixel data
//         const imageData = ctx.getImageData(0, 0, baseSize, baseSize);
//         return {
//             width: imageData.width,
//             height: imageData.height,
//             data: new Uint8ClampedArray(imageData.data.buffer),
//         };
//     };

//     idsAndColors.forEach(([id, color]) => {
//         if (!map.hasImage(id)) {
//             map.addImage(id, makeSquare(color), { pixelRatio: 2 });
//         }
//     });
// }
// export const toggleKashiwaShopsLayer = (
//     map: maplibregl.Map,
//     kashiwaShopsVisible: boolean,
//     setIsLoading: (v: boolean) => void,
//     setKashiwaShopsVisible: (v: boolean) => void,
//     selectedCategories: string[]
// ) => {
//     setIsLoading(true);

//     const addShopsLayer = (map: maplibregl.Map, selectedCategories: string[]) => {
//         const sourceId = 'kashiwa-shops';
//         const geojsonUrl = '/data/kashiwa_shops.geojson';

//         // Add or refresh the source
//         if (!map.getSource(sourceId)) {
//             map.addSource(sourceId, {
//                 type: 'geojson',
//                 data: geojsonUrl
//             });
//         } else {
//             const src = map.getSource(sourceId) as maplibregl.GeoJSONSource;
//             // @ts-ignore
//             src.setData(geojsonUrl);
//         }

//         // Ensure our square icons are registered
//         registerShopSquareImages(map);

//         // "All" toggle
//         const showAllShops = selectedCategories.includes('');

//         // Remove "subete" (all) layer if it exists
//         if (map.getLayer('kashiwa-shops-subete')) {
//             map.removeLayer('kashiwa-shops-subete');
//         }

//         if (showAllShops) {
//             // SYMBOL layer with square icons selected by category
//             const layerId = 'kashiwa-shops-subete';
//             if (!map.getLayer(layerId)) {
//                 map.addLayer({
//                     id: layerId,
//                     type: 'symbol',
//                     source: sourceId,
//                     layout: {
//                         // pick an icon per feature based on カテゴリ
//                         'icon-image': [
//                             'match',
//                             ['get', 'カテゴリ'],
//                             'デパート・ショッピングモール', 'shop-square-デパート・ショッピングモール',
//                             'スーパーマーケット', 'shop-square-スーパーマーケット',

//               /* default */ 'shop-square-その他'
//                         ],
//                         'icon-size': 0.5,            // ≈12px on a 24px base
//                         'icon-allow-overlap': true,
//                         'icon-ignore-placement': true
//                     },
//                     paint: {
//                         'icon-opacity': 0.9
//                     }
//                 });
//             }
//         } else {
//             // Per-category layers
//             shopCategories.forEach((category) => {
//                 const layerId = `kashiwa-shops-${category.label}`;

//                 // Remove if exists
//                 if (map.getLayer(layerId)) {
//                     map.removeLayer(layerId);
//                 }

//                 if (selectedCategories.includes(category.label)) {
//                     map.addLayer({
//                         id: layerId,
//                         type: 'symbol',
//                         source: sourceId,
//                         filter: ['==', ['get', 'カテゴリ'], category.label],
//                         layout: {
//                             'icon-image':
//                                 category.label === 'デパート・ショッピングモール'
//                                     ? 'shop-square-デパート・ショッピングモール'
//                                     : category.label === 'スーパーマーケット'
//                                         ? 'shop-square-スーパーマーケット'
//                                         : 'shop-square-その他',
//                             'icon-size': 0.5,
//                             'icon-allow-overlap': true,
//                             'icon-ignore-placement': true
//                         },
//                         paint: {
//                             'icon-opacity': 0.9
//                         }
//                     });
//                 }
//             });
//         }

//         // Mark layer visibility state as updated
//         setKashiwaShopsVisible(!kashiwaShopsVisible);
//         map.once('idle', () => setIsLoading(false));
//     };

//     // Ensure that the map style is loaded
//     if (map.isStyleLoaded()) {
//         [
//             'mesh-1km-fill', 'mesh-1km-outline',
//             'mesh-500m-fill', 'mesh-500m-outline',
//             'mesh-250m-fill', 'mesh-250m-outline',
//         ].forEach(id => {
//             if (map.getLayer(id)) {
//                 map.setLayoutProperty(id, 'visibility', 'none');
//             }
//         });

//         addShopsLayer(map, selectedCategories);
//     } else {
//         map.on('style.load', () => {
//             addShopsLayer(map, selectedCategories);
//         });
//     }
// };












export const shopCategories = [
    { label: 'デパート・ショッピングモール', color: '#FF5733' },
    { label: 'スーパーマーケット', color: '#33FF57' },
    { label: 'その他', color: '#FF99C8' },
];

function registerShopSquareImages(map: maplibregl.Map) {
    const baseSize = 80;  // px
    const border = 10;    // px
    const idsAndColors: Array<[string, string]> = [
        ['shop-square-デパート・ショッピングモール', '#FF5733'],
        ['shop-square-スーパーマーケット', '#33FF57'],
        ['shop-square-その他', '#FF99C8'], // default
    ];

    const makeSquare = (fill: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = baseSize;
        canvas.height = baseSize;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, baseSize, baseSize);

        // outer white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, baseSize, baseSize);

        // inner fill
        ctx.fillStyle = fill;
        ctx.fillRect(border, border, baseSize - border * 2, baseSize - border * 2);

        const imageData = ctx.getImageData(0, 0, baseSize, baseSize);
        return {
            width: imageData.width,
            height: imageData.height,
            data: new Uint8ClampedArray(imageData.data.buffer),
        };
    };

    idsAndColors.forEach(([id, color]) => {
        if (!map.hasImage(id)) {
            map.addImage(id, makeSquare(color), { pixelRatio: 2 });
        }
    });
}

/**
 * Filter for “その他” = anything that is NOT in the two main categories,
 * plus records with missing/empty カテゴリ.
 */
const SONOTA_FILTER: any = [
    'any',
    ['!', ['has', 'カテゴリ']],                                                    // property missing
    ['==', ['coalesce', ['to-string', ['get', 'カテゴリ']], ''], ''],             // empty/null -> empty string
    ['!', ['match', ['to-string', ['get', 'カテゴリ']],                           // NOT IN set
        ['デパート・ショッピングモール', 'スーパーマーケット'],
        true,   // if in the set
        false   // if not in the set
    ]],
];

export const toggleKashiwaShopsLayer = (
    map: maplibregl.Map,
    kashiwaShopsVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setKashiwaShopsVisible: (v: boolean) => void,
    selectedCategories: string[]
) => {
    setIsLoading(true);

    const addShopsLayer = (map: maplibregl.Map, selectedCategories: string[]) => {
        const sourceId = 'kashiwa-shops';
        const geojsonUrl = blobUrl('kashiwa_shops.geojson');

        // Add or refresh the source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonUrl,
            });
        } else {
            const src = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            // @ts-ignore - allow setting URL to refresh
            src.setData(geojsonUrl);
        }

        // Ensure our square icons are registered
        registerShopSquareImages(map);

        // “All” toggle
        const showAllShops = selectedCategories.includes('');

        // Clean up any existing shop layers to avoid duplicates
        if (map.getLayer('kashiwa-shops-subete')) {
            map.removeLayer('kashiwa-shops-subete');
        }
        shopCategories.forEach((c) => {
            const lid = `kashiwa-shops-${c.label}`;
            if (map.getLayer(lid)) {
                map.removeLayer(lid);
            }
        });

        if (showAllShops) {
            // One layer showing all features, with per-feature icon
            const layerId = 'kashiwa-shops-subete';
            if (!map.getLayer(layerId)) {
                map.addLayer({
                    id: layerId,
                    type: 'symbol',
                    source: sourceId,
                    layout: {
                        'icon-image': [
                            'match',
                            ['get', 'カテゴリ'],
                            'デパート・ショッピングモール', 'shop-square-デパート・ショッピングモール',
                            'スーパーマーケット', 'shop-square-スーパーマーケット',
              /* default */ 'shop-square-その他',
                        ],
                        'icon-size': 0.5,
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                    },
                    paint: {
                        'icon-opacity': 0.9,
                    },
                });
            }
        } else {
            // Per-category layers
            shopCategories.forEach((category) => {
                if (!selectedCategories.includes(category.label)) return;

                const layerId = `kashiwa-shops-${category.label}`;
                const isSonota = category.label === 'その他';

                map.addLayer({
                    id: layerId,
                    type: 'symbol',
                    source: sourceId,
                    filter: isSonota
                        ? SONOTA_FILTER
                        : ['==', ['get', 'カテゴリ'], category.label],
                    layout: {
                        'icon-image':
                            category.label === 'デパート・ショッピングモール'
                                ? 'shop-square-デパート・ショッピングモール'
                                : category.label === 'スーパーマーケット'
                                    ? 'shop-square-スーパーマーケット'
                                    : 'shop-square-その他',
                        'icon-size': 0.5,
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                    },
                    paint: {
                        'icon-opacity': 0.9,
                    },
                });
            });
        }

        // Mark layer visibility state as updated
        setKashiwaShopsVisible(!kashiwaShopsVisible);
        map.once('idle', () => setIsLoading(false));
    };

    // Ensure that the map style is loaded
    if (map.isStyleLoaded()) {
        // Hide mesh layers if desired when showing shops
        [
            'mesh-1km-fill', 'mesh-1km-outline',
            'mesh-500m-fill', 'mesh-500m-outline',
            'mesh-250m-fill', 'mesh-250m-outline',
        ].forEach((id) => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

        addShopsLayer(map, selectedCategories);
    } else {
        map.on('style.load', () => addShopsLayer(map, selectedCategories));
    }
};




const SHOP_LABEL_LEFT_ID = "kashiwa-shops-labels-left";
const SHOP_LABEL_RIGHT_ID = "kashiwa-shops-labels-right";
const SHOP_SRC_ID = "kashiwa-shops";
const SHOP_GEOJSON_URL = blobUrl("kashiwa_shops.geojson");

/** Ensure source exists (same URL as icons) */
function ensureShopSource(map: maplibregl.Map) {
    if (!map.getSource(SHOP_SRC_ID)) {
        map.addSource(SHOP_SRC_ID, { type: "geojson", data: SHOP_GEOJSON_URL });
    }
}

/** Build a filter that mirrors selected categories including 「その他」 */
function shopsAnyFilter(selectedCategories: string[]) {
    const showAll = selectedCategories.includes("") || selectedCategories.length === 0;
    if (showAll) return undefined;

    // Build OR (any) over selected categories; 「その他」 uses SONOTA_FILTER
    const clauses: any[] = [];
    selectedCategories.forEach((label) => {
        if (label === "その他") {
            clauses.push(SONOTA_FILTER);
        } else {
            clauses.push(["==", ["get", "カテゴリ"], label]);
        }
    });

    if (clauses.length === 0) {
        // Nothing selected → always false filter
        return ["==", 1, 0] as any;
    }
    return ["any", ...clauses] as any;
}

/** Deterministic split: length of label string % 2 alternates left/right */
function parityFilter(isRightSide: boolean) {
    const labelExpr: any = [
        "to-string",
        [
            "coalesce",
            ["get", "店舗名"],
            ["get", "名称"],
            ["get", "店名"],
            ["get", "name"],
            ["get", "Name"],
            ["get", "NAME"],
            ["get", "施設名"],
            "",
        ],
    ];
    const parityExpr: any = ["%", ["length", labelExpr], 2];
    return ["==", parityExpr, isRightSide ? 0 : 1] as any;
}

/** Add both left/right label layers with constant anchors (no data expressions!) */
function addShopsLabelLayers(map: maplibregl.Map, selectedCategories: string[]) {
    // Clean up old
    [SHOP_LABEL_LEFT_ID, SHOP_LABEL_RIGHT_ID].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
    });

    ensureShopSource(map);

    const baseFilter = shopsAnyFilter(selectedCategories);
    const leftFilter = baseFilter ? (["all", baseFilter, parityFilter(false)] as any) : parityFilter(false);
    const rightFilter = baseFilter ? (["all", baseFilter, parityFilter(true)] as any) : parityFilter(true);

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

    const TEXT_FIELD = ["to-string", ["coalesce", ["get", "NO"], ["get", "No"], ["get", "no"], ""]] as any;

    // LEFT labels
    map.addLayer({
        id: SHOP_LABEL_LEFT_ID,
        type: "symbol",
        source: SHOP_SRC_ID,
        filter: leftFilter,
        layout: {
            "text-field": TEXT_FIELD,
            "text-size": 12,
            "symbol-placement": "point",
            "text-variable-anchor": ANCHORS_LEFT, // constant, type-safe
            "text-radial-offset": 0.9,
            "text-offset": [-1.2, 0],
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

    // RIGHT labels
    map.addLayer({
        id: SHOP_LABEL_RIGHT_ID,
        type: "symbol",
        source: SHOP_SRC_ID,
        filter: rightFilter,
        layout: {
            "text-field": TEXT_FIELD,
            "text-size": 12,
            "symbol-placement": "point",
            "text-variable-anchor": ANCHORS_RIGHT, // constant, type-safe
            "text-radial-offset": 0.9,
            "text-offset": [1.2, 0],
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
}

/** Public API: independent toggle for shop name labels */
export function toggleKashiwaShopsLabels(
    map: maplibregl.Map,
    shopsLabelsVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setShopsLabelsVisible: (v: boolean) => void,
    selectedCategories: string[]
) {
    setIsLoading(true);

    // OFF -> remove
    if (shopsLabelsVisible) {
        [SHOP_LABEL_LEFT_ID, SHOP_LABEL_RIGHT_ID].forEach((id) => {
            if (map.getLayer(id)) map.removeLayer(id);
        });
        setShopsLabelsVisible(false);
        map.once("idle", () => setIsLoading(false));
        return;
    }

    // ON -> add both
    const start = () => {
        addShopsLabelLayers(map, selectedCategories);
        setShopsLabelsVisible(true);
        map.once("idle", () => setIsLoading(false));
    };

    if (map.isStyleLoaded()) start();
    else map.once("style.load", start);
}

/** Call when category filter changes (if labels are ON) */
export function updateKashiwaShopsLabelsFilter(
    map: maplibregl.Map,
    selectedCategories: string[]
) {
    if (!map.getStyle()) return;

    const baseFilter = shopsAnyFilter(selectedCategories);
    const leftFilter = baseFilter ? (["all", baseFilter, parityFilter(false)] as any) : parityFilter(false);
    const rightFilter = baseFilter ? (["all", baseFilter, parityFilter(true)] as any) : parityFilter(true);

    if (map.getLayer(SHOP_LABEL_LEFT_ID)) map.setFilter(SHOP_LABEL_LEFT_ID, leftFilter);
    if (map.getLayer(SHOP_LABEL_RIGHT_ID)) map.setFilter(SHOP_LABEL_RIGHT_ID, rightFilter);
}