import { blobUrl } from "@/lib/blobUrl";

const BUS_LAYER_IDS = ['new-bus-layer'];

export const toggleNewBusPassengerLayer = (
    map: maplibregl.Map,
    busLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setBusLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'new-bus-stops';
    const layerId = 'new-bus-layer';
    const geojsonUrl = blobUrl('new_kashiwakuru_stops.geojson'); // 🧠 Ensure this path is served in your Vite public folder

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!busLayerVisible) {
        // Add GeoJSON source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonUrl
            });
        }

        // Add circle layer for bus stops
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': 6,
                    'circle-stroke-color': '#299999',
                    'circle-opacity': 0.8,
                    'circle-stroke-width': 1,
                    "circle-color": "#fff"
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty(layerId, 'visibility', 'visible');
        }

        // Hide conflicting layers
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
        // Hide bus layer
        BUS_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });
    }

    setBusLayerVisible(!busLayerVisible);

    map.once('idle', () => setIsLoading(false));
};




// const SAKAE_LAYER_IDS = ['sakae-course-ride'];



export const toggleNewKashiwakuruRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'ride-data';
    const layerId = 'ride-data';
    const geojsonUrl = blobUrl('new_kashiwakuru_stops.geojson')

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース

        // Add source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonUrl
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonUrl);
        }

        // Add circle layer for 逆井 コース
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['exponential', 1.5],
                        ['get', '乗車数'],
                        0, 4,
                        10, 6,
                        50, 10,
                        100, 14,
                        500, 20,
                        1000, 28,
                        3000, 36
                    ],
                    'circle-color': '#543553',
                    'circle-opacity': 0.8,
                    'circle-stroke-color': '#fff',
                    'circle-stroke-width': 1
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty(layerId, 'visibility', 'visible');
        }

        // Hide conflicting layers
        [
            'mesh-1km-fill', 'mesh-1km-outline',
            'mesh-500m-fill', 'mesh-500m-outline',
            'mesh-250m-fill', 'mesh-250m-outline',
        ].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

        setLayerVisible(true);
        map.once('idle', () => setIsLoading(false));

    } else {
        // Hide sakae layer
        ['ride-data'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};

export const toggleNewKashiwakuruDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'drop-data';
    const layerId = 'drop-data';
    const geojsonUrl = blobUrl('new_kashiwakuru_stops.geojson')

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース


        // Add source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonUrl
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonUrl);
        }

        // Add circle layer for 逆井 コース
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['exponential', 1.5],
                        ['get', '降車数'],
                        0, 4,
                        10, 6,
                        50, 10,
                        100, 14,
                        500, 20,
                        1000, 28,
                        3000, 36
                    ],
                    'circle-color': '#d42',
                    'circle-opacity': 0.8,
                    'circle-stroke-color': '#fff',
                    'circle-stroke-width': 1
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty(layerId, 'visibility', 'visible');
        }

        // Hide conflicting layers
        [
            'mesh-1km-fill', 'mesh-1km-outline',
            'mesh-500m-fill', 'mesh-500m-outline',
            'mesh-250m-fill', 'mesh-250m-outline',
        ].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

        setLayerVisible(true);
        map.once('idle', () => setIsLoading(false));

    } else {
        // Hide sakae layer
        ['drop-data'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};
