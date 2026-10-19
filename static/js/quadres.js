import { supabaseClient } from '../../auth/supabase.js';

export async function loadQuadres() {

    const { data, error } = await supabaseClient
        .rpc('get_quadres');

    if (error) {
        console.error(
            'Error carregant quadres:',
            error
        );
        return null;
    }

    const geojson =
        typeof data === 'string'
            ? JSON.parse(data)
            : data;

    const layer = L.geoJSON(geojson, {

        pointToLayer(feature, latlng) {

            return L.marker(latlng, {
                icon: L.divIcon({
                    className: 'quadre-marker',
                    html: `
                        <span class="material-symbols-outlined">
                            electrical_services
                        </span>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            });
        },

        onEachFeature(feature, layer) {

            const p = feature.properties;

            const popupHTML = `
                <div class="popup-content">

                    <div class="popup-title">
                        Quadre núm. ${p.id ?? ''}
                    </div>

                    <div class="popup-body">

                        <div>
                            <b>Núm. CUPS</b>
                            ${p.cups_num ?? ''}
                        </div>

                        <div>
                            <b>Núm. Expedient</b>
                            ${p.exp_num ?? ''}
                        </div>

                        <div>
                            <b>Estat legalització</b>
                            ${p.legalitzacio ?? ''}
                        </div>

                        <div>
                            <b>Tipus control</b>
                            ${p.tipus_control ?? ''}
                        </div>

                    </div>

                </div>
            `;

            layer.bindPopup(popupHTML);
        }

    });

    return layer;
}