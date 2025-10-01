// import { blobUrl } from "@/lib/blobUrl";

const SCHOOL_LAYER_IDS = ['medical-layer'];

export const toggleMedicalLayer = (
    map: maplibregl.Map,
    medicalLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setMedicalLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'medical-institute-land';
    // const tilesetUrl = 'mapbox://frame-ark.medical-institute-land';
    // const sourceLayer = 'medical-institute-land';
        // const DATA_URL = blobUrl("medical_institute_land.geojson");
        const DATA_URL = "/data/medical.geojson";


    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!medicalLayerVisible) {
        // Add vector source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: DATA_URL});
        }

        // Add circle layer
        if (!map.getLayer('medical-layer')) {
            map.addLayer({
                id: 'medical-layer',
                type: 'symbol',
                source: sourceId,
                // 'source-layer': sourceLayer,
                minzoom: 5,
                layout: {
                    'icon-image': 'hospital', // built-in Mapbox icon
                    'icon-size': 1,
                    'icon-allow-overlap': true,
                    'icon-anchor': 'bottom',
                    visibility: 'visible'
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty('medical-layer', 'visibility', 'visible');
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
        SCHOOL_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });
    }

    setMedicalLayerVisible(!medicalLayerVisible);

    map.once('idle', () => setIsLoading(false));
};