import { checkAuth } from '../../auth/auth.js';
import { loadChargers } from '../js/evtecnic.js';
import { addEvtecnicMarkers } from '../js/evtecnic-markers.js';

const map = L.map("map", {
    zoomControl: false,
    minZoom: 13,
    maxZoom: 18,
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    dragRotate: true,
}).setView(
    [41.4747, 1.9292],
    14
);

export { map };

const profile = await checkAuth();

if (profile) {

    const role = profile.role;

    console.log('Rol:', role);

    if (role === 'viewer/chargers') {

        const chargers = await loadChargers();

        addEvtecnicMarkers(map, chargers);
    }
}