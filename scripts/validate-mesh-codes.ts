// scripts/validate-mesh-codes.ts
import fs from 'fs';
import JSONStream from 'JSONStream';
import { japanmesh } from 'japanmesh';
import centroid from '@turf/centroid';

// === CONFIGURE THESE ===
const GEOJSON_PATH = '../data/12_chiba_1km_pop.geojson';  // path to your mesh file
const MESH_ID_FIELD = 'MESH_ID';                      // the property holding the mesh code
// ======================

// The three “levels” we want to check, in metres:
const RESOLUTIONS = [1000, 500, 250] as const;

type Mismatch = { resolution: number; prop: string; calc: string; featureIndex: number };

const mismatches: Mismatch[] = [];

// We’ll stream once, and for each feature test all resolutions
let featureIndex = 0;
fs.createReadStream(GEOJSON_PATH)
  .pipe(JSONStream.parse('features.*'))
  .on('data', (feat: any) => {
    featureIndex++;
    // Compute a representative point:
    const [lon, lat] = feat.geometry.type === 'Point'
      ? feat.geometry.coordinates
      : (centroid(feat).geometry.coordinates as [number, number]);

    const prop = String(feat.properties[MESH_ID_FIELD] ?? '').padStart(6, '0');

    for (const res of RESOLUTIONS) {
      const calc = japanmesh.toCode(lat, lon, res);
      if (prop !== calc) {
        mismatches.push({ resolution: res, prop, calc, featureIndex });
      }
    }
  })
  .on('end', () => {
    console.log(`\nChecked ${featureIndex} features across ${RESOLUTIONS.length} resolutions.`);
    if (mismatches.length === 0) {
      console.log('✅ All mesh IDs match the standard JIS codes at 1km, 500m & 250m.');
    } else {
      console.log(`❌ Found ${mismatches.length} total mismatches:`);
      // Print first few
      mismatches.slice(0, 10).forEach(m =>
        console.warn(
          `  [feat #${m.featureIndex}] ${m.resolution}m: prop=${m.prop} vs calc=${m.calc}`
        )
      );
    }
  }
  );
