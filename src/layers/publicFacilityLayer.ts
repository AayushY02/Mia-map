// import { blobUrl } from "@/lib/blobUrl";

const PB_FACILITY_LAYER_IDS = ['facilities-circle'];

export const togglePublicFacilityLayer = (
    map: maplibregl.Map,
    pbFacilityVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setPbFacilityVisibleVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'public-facilities';
    // const tilesetUrl = 'mapbox://frame-ark.public-facilities';
    // const sourceLayer = 'public-facilities';
    // const DATA_URL = blobUrl("KS_PublicFacility_enriched.geojson");
    const DATA_URL = "/data/PublicFacility.geojson";
    

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!pbFacilityVisible) {
        // Add vector source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: DATA_URL });
        }

        // Add circle layer
        if (!map.getLayer('facilities-circle')) {
            map.addLayer({
                id: 'facilities-circle',
                type: 'circle',
                source: sourceId,
                // 'source-layer': sourceLayer,
                minzoom: 5,
                layout: { visibility: 'visible' },
                paint: {
                    'circle-radius': 6,
                    'circle-color': ['get', 'MarkerColor'],
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 1
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty('facilities-circle', 'visibility', 'visible');
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
        PB_FACILITY_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });

    }

    setPbFacilityVisibleVisible(!pbFacilityVisible);

    map.once('idle', () => setIsLoading(false));
};

