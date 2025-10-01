import fs from 'fs';
import YAML from 'js-yaml';
import JSONStream from 'JSONStream';
import { japanmesh } from 'japanmesh';
import centroid from '@turf/centroid';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

type Layer = {
    key: string;
    path: string;
    mesh_id_field?: string;
    count_in_property?: string[];
    geom_type?: 'point' | 'line' | 'polygon';
    id_field?: string;
    name_fields?: string[];
    sample_fields?: string[];
    mesh_level?: 1 | 2 | 3;
};

const layers = YAML.load(fs.readFileSync('layers.yaml', 'utf8')) as Layer[];
const cards = new Map<string, any>();

function touch(level: number, mesh: string, key: string, datum: any) {
    const composite = `${level}|${mesh}`;
    let card = cards.get(composite);
    if (!card) {
        card = { mesh_level: level, mesh_code: mesh, layers: {} };
        cards.set(composite, card);
    }
    const L = card.layers[key] ??= {
        count: 0,
        sample: [] as string[],
        ids: [] as any[],
        props: {} as Record<string, number>,
        samples_by_prop: {} as Record<string, any[]>
    };

    if (datum.prop) {
        L.props[datum.prop] = (L.props[datum.prop] || 0) + (datum.count || 0);
    } else if (datum.count != null) {
        L.count += datum.count;
    } else {
        L.count++;
        if (datum.name && L.sample.length < 5) L.sample.push(datum.name);
        if (datum.id) L.ids.push(datum.id);
        for (const sf of datum.sample_fields || []) {
            const arr = L.samples_by_prop[sf] ??= [];
            if (arr.length < 5) arr.push(datum[sf]);
        }
    }
}

// 1) Stream each layer
for (const layer of layers) {
    fs.createReadStream(layer.path)
        .pipe(JSONStream.parse('features.*'))
        .on('data', (feat: any) => {
            // A) Mesh-polygon layers with pre-tiled IDs + counts
            if (layer.mesh_id_field && layer.count_in_property?.length) {
                const mesh = String(feat.properties[layer.mesh_id_field]);
                for (const propName of layer.count_in_property) {
                    const cnt = Number(feat.properties[propName] || 0);
                    touch(layer.mesh_level!, mesh, layer.key, { prop: propName, count: cnt });
                }
                return;
            }

            // B) Other features → compute centroid or use point coords
            let lon: number, lat: number;
            if (layer.geom_type === 'point') {
                [lon, lat] = feat.geometry.coordinates;
            } else if (layer.geom_type === 'line') {
                const coords = feat.geometry.coordinates;
                const mid = coords[Math.floor(coords.length / 2)];
                [lon, lat] = mid;
            } else {
                const ctr = centroid(feat).geometry.coordinates as [number, number];
                [lon, lat] = ctr;
            }

            // replicate into all 3 mesh levels
            for (const res of [1000, 500, 250] as const) {
                const mesh = japanmesh.toCode(lat, lon, res);
                touch(res === 1000 ? 1 : res === 500 ? 2 : 3, mesh, layer.key, {
                    id: layer.id_field ? feat.properties[layer.id_field] : undefined,
                    name: layer.name_fields?.map(f => feat.properties[f]).find(Boolean),
                    sample_fields: layer.sample_fields,
                    ...layer.sample_fields?.reduce((acc, f) => ({ ...acc, [f]: feat.properties[f] }), {})
                });
            }
        });
}

// 2) Flush to Supabase when done
process.on('beforeExit', async () => {
    const supa = createClient(process.env.SUPA_URL!, process.env.SUPA_KEY!);
    const rows = [...cards.values()].map(c => ({
        mesh_level: c.mesh_level,
        mesh_code: c.mesh_code,
        facts: c
    }));

    // onConflict must be a single string (comma-separated columns)
    const { error } = await supa
        .from('mesh_cards')
        .upsert(rows, { onConflict: 'mesh_level,mesh_code' });

    if (error) {
        console.error('Upsert error', error);
    } else {
        console.log(`✅ Upserted ${rows.length} mesh cards`);
    }
});
