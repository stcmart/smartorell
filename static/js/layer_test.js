import { map } from './map.js';
import { supabaseClient } from '../../auth/supabase.js';

async function loadQuadres() {

    const { data, error } =
        await supabaseClient.rpc('get_quadres');

    if (error) {
        console.error('Error carregant quadres:', error);
        return;
    }

    console.log('Quadres:', data);

    L.geoJSON(data, {
        onEachFeature: function (feature, layer) {

            layer.bindPopup(`
                <strong>Quadre</strong><br>
                ID: ${feature.id}
            `);

        }
    }).addTo(map);
}

loadQuadres();