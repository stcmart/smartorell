import { supabaseClient } from '../../auth/supabase.js';

export async function loadSenyalitzacioLED(map) {

    const { data, error } = await supabaseClient
        .rpc('get_senyalitzacio_led');

    if (error) {
        console.error(
            'Error carregant senyalització LED:',
            error
        );
        return;
    }

    const geojson =
        typeof data === 'string'
            ? JSON.parse(data)
            : data;

    L.geoJSON(geojson, {

        pointToLayer(feature, latlng) {

            const type =
                feature.properties?.tipus;

            let color = 'gray';

            if (
                type ===
                'Tancament del gual inundable'
            ) {
                color = 'red';

            } else if (
                type ===
                'Prohibició parking risc inundació'
            ) {
                color = 'orange';
            }

            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        },

        onEachFeature(feature, layer) {

            const p = feature.properties;

            const popupHTML = `
                <div class="popup-content">

                    <div>
                        <strong>TIPUS:</strong>
                        ${p.tipus ?? ''}
                    </div>

                    <div>
                        <strong>SIM:</strong>
                        ${p.sim ?? ''}

                        <div class="sms-buttons">

                            <a
                                href="sms:${p.sim ?? ''}?body=ON"
                                class="sms-button"
                            >
                                ON
                            </a>

                            <a
                                href="sms:${p.sim ?? ''}?body=OFF"
                                class="sms-button"
                            >
                                OFF
                            </a>

                        </div>
                    </div>

                </div>
            `;

            layer.bindPopup(popupHTML);
        }

    }).addTo(map);
}