import { blobUrl } from "@/lib/blobUrl";

const BUS_LAYER_IDS = ['bus-layer'];

export function endLoadingWhenGeoJSONReady(
    map: maplibregl.Map,
    sourceId: string,
    done: () => void,
    timeoutMs = 800
) {
    let finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        map.off("sourcedata", onSourceData as any);
        done();
    };

    const onSourceData = (e: any) => {
        if (e?.sourceId === sourceId) {
            // For GeoJSON, the source becomes available very quickly.
            // Either isSourceLoaded or just the source event is enough for UX.
            if (e.isSourceLoaded || e.dataType === "source") {
                // wait one render tick so the layer paints
                map.once("render", finish);
            }
        }
    };

    map.on("sourcedata", onSourceData as any);

    // Safety: stop spinner even if nothing fires (bad network, etc.)
    const t = setTimeout(finish, timeoutMs);
    // If we finished early, clear the timeout (optional, harmless if left)
    map.once("render", () => { if (finished) clearTimeout(t); });
}

export const toggleBusPassengerLayer = (
    map: maplibregl.Map,
    busLayerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setBusLayerVisible: (v: boolean) => void,

) => {
    setIsLoading(true);

    const sourceId = 'bus-stops';
    const layerId = 'bus-layer';
    // const geojsonUrl = '/data/bus_passenger_layer_new.geojson'; // 🧠 Ensure this path is served in your Vite public folder
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson'); // 🧠 Ensure this path is served in your Vite public folder

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
                    'circle-stroke-color': '#e11d48',
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

export const toggleSakaeCourseRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'sakae-course-ride';
    const layerId = 'sakae-course-ride';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '逆井 コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '逆井 コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    sakae_ride: course ? Number(course.ride) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'sakae_ride'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
                            ],
                            'circle-color': '#16a34a',
                            'circle-opacity': 0.8,
                            'circle-stroke-color': '#fff',
                            'circle-stroke-width': 1
                        }
                    }, labelLayerId);
                } else {
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
            });
    } else {
        // Hide sakae layer
        ['sakae-course-ride'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};

export const toggleSakaeCourseDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'sakae-course-drop';
    const layerId = 'sakae-course-drop';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '逆井 コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '逆井 コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    sakae_drop: course ? Number(course.drop) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'sakae_drop'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
                            ],
                            'circle-color': '#f2f',
                            'circle-opacity': 0.8,
                            'circle-stroke-color': '#fff',
                            'circle-stroke-width': 1
                        }
                    }, labelLayerId);
                } else {
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
            });
    } else {
        // Hide sakae layer
        ['sakae-course-drop'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};

export const toggleMasuoCourseRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'masuo-course-ride';
    const layerId = 'masuo-course-ride';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '南増尾 コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '南増尾 コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    masuo_ride: course ? Number(course.ride) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'masuo_ride'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
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

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
                // map.once('idle', () => setIsLoading(false));
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        // Hide sakae layer
        ['masuo-course-ride'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });

        setLayerVisible(false);
        // map.once('idle', () => setIsLoading(false));
        setIsLoading(false);
    }
};

export const toggleMasuoCourseDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'masuo-course-drop';
    const layerId = 'masuo-course-drop';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '南増尾 コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '南増尾 コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    masuo_drop: course ? Number(course.drop) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'masuo_drop'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
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

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
            });
    } else {
        // Hide sakae layer
        ['masuo-course-drop'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });
        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};


export const toggleShonanCourseRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'shonan-course-ride';
    const layerId = 'shonan-course-ride';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '沼南コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '沼南コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    shonan_ride: course ? Number(course.ride) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'shonan_ride'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
                            ],
                            'circle-color': '#10b981',
                            'circle-opacity': 0.8,
                            'circle-stroke-color': '#fff',
                            'circle-stroke-width': 1
                        }
                    }, labelLayerId);
                } else {
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
            });
    } else {
        // Hide sakae layer
        ['shonan-course-ride'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};

export const toggleShonanCourseDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);

    const sourceId = 'shonan-course-drop';
    const layerId = 'shonan-course-drop';
    const geojsonUrl = blobUrl('bus_passenger_layer_new.geojson');

    const labelLayerId = map.getStyle().layers?.find(
        l => l.type === 'symbol' && l.layout?.['text-field'] && l.id.includes('place')
    )?.id;

    if (!layerVisible) {
        // Load GeoJSON and filter for 逆井 コース
        fetch(geojsonUrl)
            .then(res => res.json())
            .then(rawGeoJson => {
                const filteredGeoJson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: 'FeatureCollection',
                    features: rawGeoJson.features
                        .filter((feature: any) =>
                            feature.properties.Courses?.some((c: any) => c.name === '沼南コース')
                        )
                        .map((feature: any) => {
                            const course = feature.properties.Courses.find((c: any) => c.name === '沼南コース');
                            return {
                                ...feature,
                                properties: {
                                    ...feature.properties,
                                    shonan_drop: course ? Number(course.drop) : 0
                                }
                            };
                        })
                };

                // Add source
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: filteredGeoJson
                    });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(filteredGeoJson);
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
                                ['linear'],
                                ['get', 'shonan_drop'],
                                0, 6,
                                1000, 10,
                                2000, 18,
                                3000, 25
                            ],
                            'circle-color': '#f97316',
                            'circle-opacity': 0.8,
                            'circle-stroke-color': '#fff',
                            'circle-stroke-width': 1
                        }
                    }, labelLayerId);
                } else {
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);

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
            });
    } else {
        // Hide sakae layer
        ['shonan-course-drop'].forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', 'none');
                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
            }
        });

        setLayerVisible(false);
        map.once('idle', () => setIsLoading(false));
    }
};
export const PASSENGER_CIRCLE_LAYER_IDS = [
    "sakae-course-ride",
    "sakae-course-drop",
    "masuo-course-ride",
    "masuo-course-drop",
    "shonan-course-ride",
    "shonan-course-drop",
    "wani-outbound-ride", "wani-outbound-drop",
    "wani-return-ride", "wani-return-drop",
] as const;
export type CircleLayerId = typeof PASSENGER_CIRCLE_LAYER_IDS[number];

const TEXT_PROP_BY_LAYER: Record<CircleLayerId, string> = {
    "sakae-course-ride": "sakae_ride",
    "sakae-course-drop": "sakae_drop",
    "masuo-course-ride": "masuo_ride",
    "masuo-course-drop": "masuo_drop",
    "shonan-course-ride": "shonan_ride",
    "shonan-course-drop": "shonan_drop",
    "wani-outbound-ride": "ride_outbound",
    "wani-outbound-drop": "drop_outbound",
    "wani-return-ride": "ride_return",
    "wani-return-drop": "drop_return",
};

// Push label (and optionally its circle) to the very top of the stack
function bringLabelAboveCircle(map: maplibregl.Map, circleId: CircleLayerId) {
    const labelId = `${circleId}-label`;
    if (map.getLayer(circleId)) {
        try { map.moveLayer(circleId); } catch { }
    }
    if (map.getLayer(labelId)) {
        try { map.moveLayer(labelId); } catch { }
    }
}

/** Create the label layer once with readable styling and correct z-order. */
function ensureLabelForCircle(map: maplibregl.Map, circleId: CircleLayerId) {
    const labelId = `${circleId}-label`;
    if (map.getLayer(labelId)) return;

    const circle = map.getLayer(circleId) as any;
    if (!circle) return; // circle not present yet

    const source = circle.source;
    const sourceLayer = circle["source-layer"];
    const filter = circle.filter ?? undefined;
    const textProp = TEXT_PROP_BY_LAYER[circleId];

    // Readable style:
    // - bold-ish, slightly larger text
    // - strong white halo (like a pill) so it pops over any line/terrain
    // - offset to the right of the circle
    map.addLayer({
        id: labelId,
        type: "symbol",
        source,
        ...(sourceLayer ? { "source-layer": sourceLayer } : {}),
        ...(filter ? { filter } : {}),
        layout: {
            "text-field": ["to-string", ["get", textProp]],
            "text-size": 13,                     // a touch larger
            "text-font": ["Noto Sans Regular"],  // use whatever your style supports; safe default
            "text-anchor": "left",
            "text-offset": [1.2, 0],             // push text away from the circle
            "text-allow-overlap": true,          // always draw for screenshots
            "text-keep-upright": true,
            "symbol-placement": "point",
            "visibility": "none",                // default hidden (global toggle decides)
        },
        paint: {
            "text-color": "#111111",
            "text-halo-color": "rgba(255,255,255,0.98)", // near-opaque halo
            "text-halo-width": 3,                        // thicker halo -> "pill" effect
            "text-halo-blur": 0.3,                       // crisp edges
        },
    });

    // Always ensure label is above its circle (and above routes)
    bringLabelAboveCircle(map, circleId);
}

/** Global button handler: show labels only for circles that are currently visible. */
export function setAllPassengerLabelsVisible(map: maplibregl.Map, globalOn: boolean) {
    for (const id of PASSENGER_CIRCLE_LAYER_IDS) {
        if (!map.getLayer(id)) continue;

        const circleVisible = map.getLayoutProperty(id, "visibility") !== "none";
        ensureLabelForCircle(map, id);

        const labelId = `${id}-label`;
        if (!map.getLayer(labelId)) continue;

        const shouldShow = globalOn && circleVisible;
        map.setLayoutProperty(labelId, "visibility", shouldShow ? "visible" : "none");

        // When showing, bring label above circle so it never hides under it
        if (shouldShow) bringLabelAboveCircle(map, id);
    }
}

/** Call this right after you show/hide ONE circle layer to keep its label aligned with the global toggle. */
export function syncPassengerLabelForCircle(map: maplibregl.Map, circleId: CircleLayerId, globalOn: boolean) {
    if (!map.getLayer(circleId)) return;

    const circleVisible = map.getLayoutProperty(circleId, "visibility") !== "none";
    ensureLabelForCircle(map, circleId);

    const labelId = `${circleId}-label`;
    if (!map.getLayer(labelId)) return;

    const shouldShow = globalOn && circleVisible;
    map.setLayoutProperty(labelId, "visibility", shouldShow ? "visible" : "none");

    if (shouldShow) bringLabelAboveCircle(map, circleId);
}
// === end labels =========================================


const WANI_PASSENGERS_URL = blobUrl("city_hall_stops.geojson");
const WANI_ROUTE_URL = blobUrl("kashiwa_city_hall_route.geojson");


// === Waniverse (市役所線) – Outbound Ride ===
export const toggleWaniOutboundRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);
    const sourceId = "wani-outbound-ride";
    const layerId = "wani-outbound-ride";

    const labelLayerId = map.getStyle().layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"] && l.id.includes("place")
    )?.id;

    if (!layerVisible) {

        [
            "mesh-1km-fill", "mesh-1km-outline",
            "mesh-500m-fill", "mesh-500m-outline",
            "mesh-250m-fill", "mesh-250m-outline",
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });

        fetch(WANI_PASSENGERS_URL)
            .then((r) => r.json())
            .then((fc) => {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: fc });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
                }

                if (!map.getLayer(layerId)) {
                    map.addLayer(
                        {
                            id: layerId,
                            type: "circle",
                            source: sourceId,
                            paint: {
                                "circle-radius": [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "ride_outbound"],
                                    0, 6,
                                    1000, 10,
                                    2000, 18,
                                    3000, 25
                                ],
                                "circle-color": "#26F0F1",
                                "circle-opacity": 0.8,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-width": 1
                            },
                            filter: [">", ["get", "ride_outbound"], 0]
                        },
                        labelLayerId
                    );
                } else {
                    map.setLayoutProperty(layerId, "visibility", "visible");
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
                setLayerVisible(true);
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
            syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
        }
        setLayerVisible(false);
        map.once("idle", () => setIsLoading(false));
    }
};

// === Waniverse (市役所線) – Outbound Drop ===
export const toggleWaniOutboundDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);
    const sourceId = "wani-outbound-drop";
    const layerId = "wani-outbound-drop";

    const labelLayerId = map.getStyle().layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"] && l.id.includes("place")
    )?.id;

    if (!layerVisible) {

        [
            "mesh-1km-fill", "mesh-1km-outline",
            "mesh-500m-fill", "mesh-500m-outline",
            "mesh-250m-fill", "mesh-250m-outline",
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });
        fetch(WANI_PASSENGERS_URL)
            .then((r) => r.json())
            .then((fc) => {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: fc });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
                }

                if (!map.getLayer(layerId)) {
                    map.addLayer(
                        {
                            id: layerId,
                            type: "circle",
                            source: sourceId,
                            paint: {
                                "circle-radius": [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "drop_outbound"],
                                    0, 6,
                                    1000, 10,
                                    2000, 18,
                                    3000, 25
                                ],
                                "circle-color": "#700548",
                                "circle-opacity": 0.8,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-width": 1
                            },
                            filter: [">", ["get", "drop_outbound"], 0]
                        },
                        labelLayerId
                    );
                } else {
                    map.setLayoutProperty(layerId, "visibility", "visible");
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
                setLayerVisible(true);
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
            syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
        }
        setLayerVisible(false);
        map.once("idle", () => setIsLoading(false));
    }
};

// === Waniverse (市役所線) – Return Ride ===
export const toggleWaniReturnRideLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);
    const sourceId = "wani-return-ride";
    const layerId = "wani-return-ride";

    const labelLayerId = map.getStyle().layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"] && l.id.includes("place")
    )?.id;

    if (!layerVisible) {

        [
            "mesh-1km-fill", "mesh-1km-outline",
            "mesh-500m-fill", "mesh-500m-outline",
            "mesh-250m-fill", "mesh-250m-outline",
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });
        fetch(WANI_PASSENGERS_URL)
            .then((r) => r.json())
            .then((fc) => {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: fc });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
                }

                if (!map.getLayer(layerId)) {
                    map.addLayer(
                        {
                            id: layerId,
                            type: "circle",
                            source: sourceId,
                            paint: {
                                "circle-radius": [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "ride_return"],
                                    0, 6,
                                    1000, 10,
                                    2000, 18,
                                    3000, 25
                                ],
                                "circle-color": "#433E0E",
                                "circle-opacity": 0.8,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-width": 1
                            },
                            filter: [">", ["get", "ride_return"], 0]
                        },
                        labelLayerId
                    );
                } else {
                    map.setLayoutProperty(layerId, "visibility", "visible");
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
                setLayerVisible(true);
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
            syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
        }
        setLayerVisible(false);
        map.once("idle", () => setIsLoading(false));
    }
};

// === Waniverse (市役所線) – Return Drop ===
export const toggleWaniReturnDropLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void,
    globalLabelsOn: boolean
) => {
    setIsLoading(true);
    const sourceId = "wani-return-drop";
    const layerId = "wani-return-drop";

    const labelLayerId = map.getStyle().layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"] && l.id.includes("place")
    )?.id;

    if (!layerVisible) {

        [
            "mesh-1km-fill", "mesh-1km-outline",
            "mesh-500m-fill", "mesh-500m-outline",
            "mesh-250m-fill", "mesh-250m-outline",
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });

        fetch(WANI_PASSENGERS_URL)
            .then((r) => r.json())
            .then((fc) => {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: fc });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
                }

                if (!map.getLayer(layerId)) {
                    map.addLayer(
                        {
                            id: layerId,
                            type: "circle",
                            source: sourceId,
                            paint: {
                                "circle-radius": [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "drop_return"],
                                    0, 6,
                                    1000, 10,
                                    2000, 18,
                                    3000, 25
                                ],
                                "circle-color": "#60a5fa",
                                "circle-opacity": 0.8,
                                "circle-stroke-color": "#fff",
                                "circle-stroke-width": 1
                            },
                            filter: [">", ["get", "drop_return"], 0]
                        },
                        labelLayerId
                    );
                } else {
                    map.setLayoutProperty(layerId, "visibility", "visible");
                }

                syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
                setLayerVisible(true);
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
            syncPassengerLabelForCircle(map, layerId as CircleLayerId, globalLabelsOn);
        }
        setLayerVisible(false);
        map.once("idle", () => setIsLoading(false));
    }
};

export const toggleWaniCityHallRouteLayer = (
    map: maplibregl.Map,
    layerVisible: boolean,
    setIsLoading: (v: boolean) => void,
    setLayerVisible: (v: boolean) => void
) => {
    setIsLoading(true);
    const sourceId = "wani-cityhall-route";
    const casingId = "wani-cityhall-route-casing";
    const lineId = "wani-cityhall-route";

    const labelLayerId = map.getStyle().layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"] && l.id.includes("place")
    )?.id;

    if (!layerVisible) {

        [
            "mesh-1km-fill", "mesh-1km-outline",
            "mesh-500m-fill", "mesh-500m-outline",
            "mesh-250m-fill", "mesh-250m-outline",
        ].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
        });

        fetch(WANI_ROUTE_URL)
            .then((r) => r.json())
            .then((routeFC) => {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: routeFC });
                } else {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(routeFC);
                }

                if (!map.getLayer(casingId)) {
                    map.addLayer(
                        {
                            id: casingId,
                            type: "line",
                            source: sourceId,
                            paint: { "line-color": "#fff", "line-width": 6, "line-opacity": 0.9 }
                        },
                        labelLayerId
                    );
                }
                if (!map.getLayer(lineId)) {
                    map.addLayer(
                        {
                            id: lineId,
                            type: "line",
                            source: sourceId,
                            paint: { "line-color": "#ef4444", "line-width": 3.2, "line-opacity": 0.95 }
                        },
                        labelLayerId
                    );
                } else {
                    map.setLayoutProperty(casingId, "visibility", "visible");
                    map.setLayoutProperty(lineId, "visibility", "visible");
                }

                setLayerVisible(true);
                endLoadingWhenGeoJSONReady(map, sourceId, () => setIsLoading(false));
            });
    } else {
        if (map.getLayer(casingId)) map.setLayoutProperty(casingId, "visibility", "none");
        if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", "none");
        setLayerVisible(false);
        map.once("idle", () => setIsLoading(false));
    }
};
