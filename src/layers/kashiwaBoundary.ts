const KASHIWA_LAYER_IDS = ['kashiwa-mask', 'kashiwa-outline'];

export const toggleKashiwaMaskLayer = (
  map: maplibregl.Map,
  kashiwaMaskVisible: boolean,
  setIsLoading: (v: boolean) => void,
  setKashiwaMaskVisible: (v: boolean) => void
) => {
  setIsLoading(true);

  const sourceId = 'kashiwa-boundary';
  const geojsonPath = '/data/boundary.geojson';

  if (!kashiwaMaskVisible) {
    // Add source if not present
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonPath
      });
    }

    // Add mask layer to fade out everything outside
    if (!map.getLayer('kashiwa-mask')) {
      map.addLayer({
        id: 'kashiwa-mask',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': 'rgba(255, 255, 255, 0.85)',
          'fill-outline-color': 'rgba(0, 0, 0, 0.2)'
        }
      });
    } else {
      map.setLayoutProperty('kashiwa-mask', 'visibility', 'visible');
    }

    // Add outline
    if (!map.getLayer('kashiwa-outline')) {
      map.addLayer({
        id: 'kashiwa-outline',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#333333',
          'line-width': 2
        }
      });
    } else {
      map.setLayoutProperty('kashiwa-outline', 'visibility', 'visible');
    }
  } else {
    // Hide the mask and outline
    KASHIWA_LAYER_IDS.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  }

  setKashiwaMaskVisible(!kashiwaMaskVisible);

  map.once('idle', () => setIsLoading(false));
};
