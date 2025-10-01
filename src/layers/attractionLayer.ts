
const ATTRACTION_LAYER_IDS = ['attraction-layer'];

export const toggleAttractionLayer = (
    map: maplibregl.Map,
    attractionLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setAttractionLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'attraction-layer';
    // const tilesetUrl = 'mapbox://frame-ark.attraction-layer';
    // const sourceLayer = 'attraction-layer';
    // const DATA_URL = blobUrl("attraction.geojson");
    const DATA_URL = "/data/attractions.geojson";
    

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!attractionLayerVisible) {
        // Add vector source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: DATA_URL });
        }

        // Add circle layer
        if (!map.getLayer('attraction-layer')) {
            map.addLayer({
                id: 'attraction-layer',
                type: 'symbol',
                source: sourceId,
                // 'source-layer': sourceLayer,
                minzoom: 5,
                layout: {
                    'icon-image': 'beach',
                    'icon-size': 1.5,
                    'icon-allow-overlap': true,
                    'icon-anchor': 'bottom',
                    visibility: 'visible'
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty('attraction-layer', 'visibility', 'visible');
        }

        // Hide all other relevant layers
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
        // Hide facility layer
        ATTRACTION_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });
    }

    setAttractionLayerVisible(!attractionLayerVisible);

    map.once('idle', () => setIsLoading(false));
};