
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'

function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef(null)
  const [roadsVisible, setRoadsVisible] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);

  const ROAD_LAYER_IDS = [
    'road',
    'road-street',
    'road-street-low',
    'road-secondary-tertiary',
    'road-primary',
    'road-trunk',
    'road-motorway',
    'road-rail',
    'road-path',
    'road-network' // most visible ones
  ];

  // Toggle visibility of road layers
  const toggleRoads = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const visibility = roadsVisible ? 'none' : 'visible';
    ROAD_LAYER_IDS.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility);
      }
    });
    setRoadsVisible(!roadsVisible);
  };

  const toggleAdminLayer = () => {
    const map = mapRef.current;
    if (!map) return;
    const visibility = adminVisible ? 'none' : 'visible';
    if (map.getLayer('admin-fill')) {
      map.setLayoutProperty('admin-fill', 'visibility', visibility);
    }
    if (map.getLayer('admin-line')) {
      map.setLayoutProperty('admin-line', 'visibility', visibility);
    }
    setAdminVisible(!adminVisible);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const bounds: mapboxgl.LngLatBoundsLike = [
      [122.93457, 20.42596],
      [153.98667, 45.55148]
    ];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6917, 35.6895],
      zoom: 5.5,
      minZoom: 4.5,
      maxZoom: 18,
      maxBounds: bounds
    });

    map.on('load', () => {
      map.fitBounds(bounds, { padding: 20, duration: 0 });
    });
    mapRef.current = map;

    map.on('load', async () => {
      // Initially hide road layers
      ROAD_LAYER_IDS.forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
      });
      const adminGeo = await fetch(
        'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson'
      ).then(res => res.json());

      map.addSource('admin', {
        type: 'geojson',
        data: adminGeo
      });

      const features = adminGeo.features
      const prefNames: string[] = features.map((f: any) => f.properties.name)
      const colorMap: Record<string, string> = Object.fromEntries(
        prefNames.map(name => [
          name,
          `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
        ])
      )

      const matchExpr: mapboxgl.Expression = [
        'match',
        ['get', 'name'],
        ...Object.entries(colorMap).flat(),
        '#cccccc' // fallback
      ];

      map.addLayer({
        id: 'admin-fill',
        type: 'fill',
        source: 'admin',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': matchExpr,
          'fill-opacity': 0.2
        }
      });

      map.addLayer({
        id: 'admin-line',
        type: 'line',
        source: 'admin',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#0369a1',
          'line-width': 1
        }
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen">
      {/* UI Buttons */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <button
          onClick={toggleRoads}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm shadow"
        >
          {roadsVisible ? 'Hide 道路' : 'Show 道路'}
        </button>
        <button
          onClick={toggleAdminLayer}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm shadow"
        >
          {adminVisible ? 'Hide 行政界' : 'Show 行政界'}
        </button>
      </div>

      {/* Map */}
      <div id="map-container" ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}

export default App
