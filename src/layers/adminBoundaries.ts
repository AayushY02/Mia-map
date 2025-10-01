// layers/adminBoundaries.ts

export const toggleAdminBoundaries = (
    map: maplibregl.Map,
    adminVisible: boolean,
    setAdminVisible: (v: boolean) => void
) => {
    const visibility = adminVisible ? 'none' : 'visible';

    ['admin-fill', 'admin-line'].forEach(id => {
        if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', visibility);
        }
    });

    setAdminVisible(!adminVisible);
};
