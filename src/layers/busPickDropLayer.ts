import { blobUrl } from "@/lib/blobUrl";

const BUS_PICK_DROP_LAYER_IDS = ['bus-pick-drop-polygons', 'bus-pick-drop-points'];

export const toggleBusPickDropLayer = (
    map: maplibregl.Map,
    busPickDropLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setBusPickDropLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'bus-pick-drop-source';
    // const tilesetUrl = 'mapbox://frame-ark.bus-pick-drop';
    // const sourceLayer = 'bus-pick-drop-layer';
    const DATA_URL = blobUrl("bus-pick-drop.geojson");

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!busPickDropLayerVisible) {
        // Add vector source if not already present
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                // url: tilesetUrl
                data: DATA_URL
            });
        }

        // 🟩 Add Polygon Layer
        if (!map.getLayer('bus-pick-drop-polygons')) {
            map.addLayer({
                id: 'bus-pick-drop-polygons',
                type: 'fill',
                source: sourceId,
                // 'source-layer': sourceLayer,
                minzoom: 5,
                filter: ['==', '$type', 'Polygon'],
                paint: {
                    'fill-color': [
                        'case',
                        ['==', ['get', 'name'], 'Ｂ区域'], '#FFA500', // Orange for Ｂ区域
                        ['==', ['get', 'name'], 'A 区域'], '#FFFF00', // Yellow for A 区域
                        '#d42' // Default color if name is neither A nor B 区域
                    ],
                    'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.5],
                    'fill-outline-color': ['get', 'stroke']
                }
            });
        } else {
            map.setLayoutProperty('bus-pick-drop-polygons', 'visibility', 'visible');
        }

        if (!map.getLayer('bus-pick-drop-points')) {
            map.addLayer({
                id: 'bus-pick-drop-points',
                type: 'circle',
                source: sourceId,
                // 'source-layer': sourceLayer,
                minzoom: 5,
                filter: ['==', '$type', 'Point'],
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#0074D9',              // Deep blue
                    'circle-opacity': 0.9,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty('bus-pick-drop-points', 'visibility', 'visible');
        }

        // 🔧 Hide background layers for clarity
        [
            'mesh-1km-fill', 'mesh-1km-outline',
            'mesh-500m-fill', 'mesh-500m-outline',
            'mesh-250m-fill', 'mesh-250m-outline',

        ].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

    } else {
        // 🚫 Hide both polygon and point layers
        BUS_PICK_DROP_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

    }

    setBusPickDropLayerVisible(!busPickDropLayerVisible);
    map.once('idle', () => setIsLoading(false));
};
