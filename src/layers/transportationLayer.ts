// import { blobUrl } from "@/lib/blobUrl";

const TRANSPORT_LAYER_IDS = ['transportation-line', 'transportation-line-hover'];


export const toggleBoardingLayer = (
    map: maplibregl.Map,
    setVisible: (v: boolean) => void
) => {
    const layerId = 'boarding-layer';
    if (!map.getLayer(layerId)) return;
    const isVisible = map.getLayoutProperty(layerId, 'visibility') === 'visible';
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'none' : 'visible');
    setVisible(!isVisible);
};

export const toggleAlightingLayer = (
    map: maplibregl.Map,
    setVisible: (v: boolean) => void
) => {
    const layerId = 'alighting-layer';
    if (!map.getLayer(layerId)) return;
    const isVisible = map.getLayoutProperty(layerId, 'visibility') === 'visible';
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'none' : 'visible');
    setVisible(!isVisible);
};
export const toggleTransportationLayer = (
    map: maplibregl.Map,
    transportVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setTransportVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'transportation-info-2022';
    // const tilesetUrl = 'mapbox://frame-ark.transportation';
    // const sourceLayer = 'transportation';
    // const DATA_URL = blobUrl("transportation.geojson");
    const DATA_URL = "/data/bus_route.geojson";


    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    const addVectorSource = (id: string, url: string) => {
        if (!map.getSource(id)) {
            map.addSource(id, { type: 'geojson', data: url });
        }
    };

    if (!transportVisible) {
        // add vector source once
        addVectorSource(sourceId, DATA_URL);
        // addVectorSource('bus-flows', 'mapbox://frame-ark.bus-flows');


        if (!map.getLayer('transportation-line')) {
            map.addLayer({
                id: 'transportation-line',
                type: 'line',
                source: sourceId,
                minzoom: 0,
                // 'source-layer': sourceLayer,
                layout: { visibility: 'visible' },
                paint: {
                    'line-color': "#f21",
                    'line-width': 2
                }
            }, labelLayerId);
        } else {
            map.setLayoutProperty('transportation-line', 'visibility', 'visible');
        }

        if (!map.getLayer('transportation-line-hover')) {
            map.addLayer({
                id: 'transportation-line-hover',
                type: 'line',
                source: sourceId,
                // 'source-layer': sourceLayer,
                layout: {},
                paint: {
                    'line-color': '#000000',
                    'line-opacity': 0,
                    'line-width': 15 // Invisible but catches mouse events
                }
            });
        }



        // if (!map.getLayer('boarding-layer')) {
        //     map.addLayer({
        //         id: 'boarding-layer',
        //         type: 'circle',
        //         source: 'bus-flows',
        //         'source-layer': 'bus-flows',
        //         filter: ['==', ['get', 'type'], 'boarding'],
        //         paint: {
        //             'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 0, 4, 100, 20],
        //             'circle-color': '#27ae60',
        //             'circle-opacity': 0.6
        //         }
        //     });
        // }

        // if (!map.getLayer('alighting-layer')) {
        //     map.addLayer({
        //         id: 'alighting-layer',
        //         type: 'circle',
        //         source: 'bus-flows',
        //         'source-layer': 'bus-flows',
        //         filter: ['==', ['get', 'type'], 'alighting'],
        //         paint: {
        //             'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 0, 4, 100, 20],
        //             'circle-color': '#e74c3c',
        //             'circle-opacity': 0.6
        //         }
        //     });
        // }



        // hide everything else
        [
           
            'mesh-250m-fill', 'mesh-250m-outline',
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
        });

    } else {
        // hide the transport layer
        TRANSPORT_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
        });
    }

    setTransportVisible(!transportVisible);

    map.once('idle', () => setIsLoading(false));
};


const BUS_STOP_LAYER_IDS = ['bus-stops'];

export const toggleBusStops = (
    map: maplibregl.Map,
    busStopsLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setBusStopsLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);

    const sourceId = 'bus-stops';
    // const tilesetUrl = 'mapbox://frame-ark.bus-stops';
    // const sourceLayer = 'bus-stops';

    const beforeId = map.getLayer('transportation-line-hover') ? 'transportation-line-hover' : undefined;
    const customIconId = 'custom-bus-icon';

    const ensureCustomIcon = async (map: maplibregl.Map) => {
        if (map.hasImage(customIconId)) return;

        const res = await map.loadImage('/icons/bus_custom.png');
        const image = res.data; // ✅ extract the actual image

        if (!map.hasImage(customIconId)) {
            map.addImage(customIconId, image);
        }
    };
    // const labelLayerId = map.getStyle().layers?.find(
    //     l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    // )?.id;

    if (!busStopsLayerVisible) {
        // Add vector source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: "/data/bus_stop.geojson" });
        }

        // Add circle layer
        // if (!map.getLayer('bus-stops')) {
        //     map.addLayer({
        //         id: 'bus-stops',
        //         type: 'symbol',
        //         source: sourceId,
        //         // 'source-layer': sourceLayer,
        //         minzoom: 5,
        //         layout: {
        //             'icon-image': 'bus-15',
        //             'icon-size': 1,
        //             'icon-allow-overlap': true,
        //             'icon-anchor': 'bottom',
        //             visibility: 'visible'
        //         }
        //     }, beforeId);
        ensureCustomIcon(map).then(() => {
            if (!map.getLayer('bus-stops')) {
                map.addLayer({
                    id: 'bus-stops',
                    type: 'symbol',
                    source: sourceId,
                    // 'source-layer': sourceLayer,   // REQUIRED for vector/pmtiles
                    minzoom: 5,
                    layout: {
                        'icon-image': customIconId,      // ✅ built-in Maki icon
                        'icon-size': 0.4,
                        'icon-allow-overlap': true,
                        'icon-anchor': 'bottom',
                        'visibility': 'visible',
                        'text-field': ['get', 'stop_name'], // optional: label from your data
                        'text-size': 11,
                        'text-offset': [0, 0.6],
                        'text-optional': true
                    },
                    paint: {
                        'text-halo-width': 1,
                        'text-halo-color': '#ffffff'
                    }
                }, beforeId);




            } else {
                map.setLayoutProperty('bus-stops', 'visibility', 'visible');
            }
        }).catch(console.error);

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
        BUS_STOP_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
            }
        });
    }

    setBusStopsLayerVisible(!busStopsLayerVisible);

    map.once('idle', () => setIsLoading(false));
};