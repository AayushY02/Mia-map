// layers/agriLayer.ts

import { blobUrl } from "@/lib/blobUrl";

export const toggleAgriLayer = (
    map: maplibregl.Map,
    agriLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setAgriLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    // const sourceLayer = 'agriculture';
    const DATA_URL = blobUrl("agriculture-land.geojson");


    if (!agriLayerVisible) {
        if (!map.getSource('kashiwa-agri')) {
            map.addSource('kashiwa-agri', {
                type: 'geojson',
                data: DATA_URL
            });
        }

        if (!map.getLayer('agri-fill')) {
            map.addLayer({
                id: 'agri-fill',
                type: 'fill',
                source: 'kashiwa-agri',
                // 'source-layer': sourceLayer,
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'KOUCHI'],
                        '畑', '#8bc34a',
                        '田', '#4caf50',
                        '樹園地', '#aed581',
                        'その他', '#c8e6c9',
                        '#e0e0e0'
                    ],
                    'fill-opacity': 0.6
                }
            });
        }

        if (!map.getLayer('agri-outline')) {
            map.addLayer({
                id: 'agri-outline',
                type: 'line',
                source: 'kashiwa-agri',
                // 'source-layer': sourceLayer,
                paint: {
                    'line-color': '#2e7d32',
                    'line-width': 1
                }
            });
        }

        if (!map.getLayer('agri-labels')) {
            map.addLayer({
                id: 'agri-labels',
                type: 'symbol',
                source: 'kashiwa-agri',
                //  'source-layer': sourceLayer,
                layout: {
                    'text-field': ['get', 'KOUCHI'],
                    'text-size': 11,
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': '#1b5e20',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1
                }
            });
        }

        const layersToHide = [
            'mesh-1km-fill', 'mesh-1km-outline',
            'mesh-500m-fill', 'mesh-500m-outline',
            'mesh-250m-fill', 'mesh-250m-outline',
            'admin-fill', 'admin-line'
        ];

        layersToHide.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

    } else {
        ['agri-fill', 'agri-outline', 'agri-labels'].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
        });

        if (map.getSource('kashiwa-agri')) {
            map.removeSource('kashiwa-agri');
        }

    }

    setAgriLayerVisible(!agriLayerVisible);

    map.once('idle', () => {
        setIsLoading(false);
    });
};