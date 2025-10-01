// layers/meshLayers.ts
import { getColorExpression } from '@/utils/expressions';

export const addMeshLayers = (map: maplibregl.Map, metric: string) => {
    const getLabelLayerId = (map: maplibregl.Map): string | undefined => {
        const layers = map.getStyle().layers;
        if (!layers) return;

        const labelLayer = layers.find(l =>
            l.type === 'symbol' &&
            l.layout?.['text-field'] &&
            l.id.includes('place')
        );

        return labelLayer?.id;
    };

    const labelLayerId = getLabelLayerId(map);

    if (!map.getSource('chiba-250m-mesh')) {
        map.addSource('chiba-250m-mesh', {
            type: 'geojson',
            data: '/data/population.geojson'
        });
    }

    map.addLayer({
        id: 'mesh-250m-fill',
        type: 'fill',
        source: 'chiba-250m-mesh',
        // "source-layer": "mesh-250",
        minzoom: 6,
        paint: {
            'fill-color': getColorExpression(metric),
            'fill-opacity': 0.6
        }
    }, labelLayerId);

    map.addLayer({
        id: 'mesh-250m-outline',
        type: 'line',
        source: 'chiba-250m-mesh',
        // "source-layer": "mesh-250",
        minzoom: 6,
        paint: { 'line-color': '#0099cc', 'line-width': 0.75 }
    });

    map.addSource('admin-tiles', {
        type: 'geojson',
        data: '/data/japan.geojson'
    });

    map.addLayer({
        id: 'admin-fill',
        type: 'fill',
        source: 'admin-tiles',
        // 'source-layer': 'japan-2ix0gj',
        layout: { visibility: 'none' },
        paint: {
            'fill-color': '#cccccc',
            'fill-opacity': 0.4
        }
    }, labelLayerId);

    map.addLayer({
        id: 'admin-line',
        type: 'line',
        source: 'admin-tiles',
        // 'source-layer': 'japan-2ix0gj',
        layout: { visibility: 'none' },
        paint: {
            'line-color': '#444444',
            'line-width': 1.2
        }
    }, labelLayerId);


};
