import { supabaseClient } from '../../auth/supabase.js';
import { map } from './maps.js';
import { renderFeature } from './layer-renderer.js';

let chargersLayer = null;

// =========================================================
// CONFIGURACIÓ D'ESTATS
// =========================================================

const STATUS = {
    '0': { text: 'Disponible', color: '#64bd63' },
    '1': { text: 'Carregant', color: '#5dc4bf' },
    '3': { text: 'Fora de servei', color: '#555555' },
    '9': { text: 'Error', color: '#dd5826' }
};

function getStatus(status) {
    return STATUS[String(status)] ?? {
        text: 'Desconegut',
        color: '#888888'
    };
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

// =========================================================
// POPUPS
// =========================================================

function createPopup(charger) {
    const sockets = charger.charger_sockets ?? [];

    const rows = sockets.map(socket => {
        const status = getStatus(socket.id_status);

        return `
            <tr>
                <td>${escapeHTML(socket.connector_type_name ?? '—')}</td>
                <td>
                    <span style="color:${status.color};font-weight:600">
                        ${status.text}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="evtecnic-popup">
            <h3>${escapeHTML(charger.name ?? 'Carregador')}</h3>

            <p>
                <strong>Carrer:</strong>
                ${escapeHTML(charger.address ?? 'No disponible')}
            </p>

            <p>
                <strong>Tomes:</strong> ${sockets.length}
            </p>

            <table class="evtecnic-sockets">
                <thead>
                    <tr>
                        <th>Connector</th>
                        <th>Estat</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="2">Sense tomes</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

// =========================================================
// MARCADORS
// =========================================================

function addEvtecnicMarkers(layerGroup, chargers, styleConfig) {

    const geojson = {
        type: 'FeatureCollection',
        features: chargers
            .filter(charger =>
                Number.isFinite(Number(charger.latitude)) &&
                Number.isFinite(Number(charger.longitude))
            )
            .map(charger => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [
                        Number(charger.longitude),
                        Number(charger.latitude)
                    ]
                },
                properties: {
                    ...charger,
                    id_status: String(charger.id_status)
                }
            }))
    };

    const layer = L.geoJSON(geojson, {

        pointToLayer(feature, latlng) {
            return renderFeature(feature, latlng, styleConfig);
        },

        onEachFeature(feature, marker) {
            marker.bindPopup(createPopup(feature.properties));
        }
    });

    layerGroup.addLayer(layer);
}

// =========================================================
// CARREGADORS
// =========================================================

async function loadChargers() {
    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error || !session) {
        console.error('Cal iniciar sessió.');
        return [];
    }

    const { data, error: functionError } =
        await supabaseClient.functions.invoke('get-chargers');

    if (functionError) {
        console.error('Error de la funció:', functionError);

        if (functionError.context) {
            console.error(
                'Resposta:',
                await functionError.context.text()
            );
        }
        return [];
    }

    console.log('Carregadors rebuts (no filtrats):', data?.chargers);

    const chargers_filters = data?.chargers?.filter(
        charger => charger.mobile_app_manage === true
    );

    console.log ('Carregadors filtrats:', chargers_filters);

    return chargers_filters ?? [];
}

// =========================================================
// COMPROVAR TOKEN
// =========================================================

export async function checkEtecnicToken() {
    const { data: { user }, error: authError } =
        await supabaseClient.auth.getUser();

    if (authError || !user) return false;

    const { data, error } = await supabaseClient
        .from('tokens')
        .select('token')
        .eq('usuari', user.id)
        .eq('platform', 'etecnic')
        .maybeSingle();

    if (error) {
        console.error('Error comprovant token Etecnic:', error);
        return false;
    }

    return Boolean(data?.token);
}

// =========================================================
// ACTUALITZAR CARREGADORS
// =========================================================

export async function refreshChargers(layerId) {

    const button = document.querySelector(
        `.charger-refresh[data-layer-id="${layerId}"]`
    );

    if (!button || button.disabled) return null;

    button.disabled = true;
    button.classList.add('loading');

    try {
        
        const [chargers, styleConfig] = await Promise.all([
            loadChargers(),
            getChargerStyle(layerId)
        ]);

        if (!styleConfig) {
            console.error('No hi ha configuració JSONB per als carregadors.');
            return null;
        }

        if (!chargersLayer) {
            chargersLayer = L.layerGroup();
        }

        chargersLayer.clearLayers();

        addEvtecnicMarkers(
            chargersLayer,
            chargers,
            styleConfig
        );

        const checkbox = document.querySelector(
            `.layer-toggle input[data-layer-id="${layerId}"]`
        );

        if (checkbox?.checked) {
            map.addLayer(chargersLayer);
        }

        return chargersLayer;

    } catch (error) {
        console.error('Error actualitzant carregadors:', error);
        return null;

    } finally {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// =========================================================
// SIMBOLITZACIÓ DES DE SUPABASE
// =========================================================

async function getChargerStyle(layerId) {

    const { data, error } = await supabaseClient
        .schema('management')
        .from('layer_styles')
        .select('config')
        .eq('layer_id', layerId)
        .maybeSingle();

    if (error) {
        console.error('Error carregant simbolització:', error);
        return null;
    }

    return data?.config ?? null;
}

// =========================================================
// OBTENIR CAPA
// =========================================================

export function getChargersLayer() {
    return chargersLayer;
}
