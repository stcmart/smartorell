
import { supabaseClient } from '../../auth/supabase.js';
import { map } from './map.js';

let chargersLayer = null;

// =========================================================
// CONFIGURACIÓ D'ESTATS
// =========================================================

const STATUS = {
    '0': { text: 'Disponible', color: '#64bd63' },
    '1': { text: 'Carregant', color: '#5dc4bf' },
    '3': { text: 'Fora de servei', color: '#900c3f' },
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

function addEvtecnicMarkers(layerGroup, chargers) {
    const markers = [];

    chargers.forEach(charger => {
        const lat = Number(charger.latitude);
        const lng = Number(charger.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const status = getStatus(charger.id_status);

        const marker = L.circleMarker([lat, lng], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillColor: status.color,
            fillOpacity: 1
        });

        marker.bindPopup(createPopup(charger));

        layerGroup.addLayer(marker);
        markers.push(marker);
    });

    return markers;
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

    console.log('Carregadors rebuts:', data?.chargers);

    return data?.chargers ?? [];
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
        const chargers = await loadChargers();

        if (!chargers) return null;

        if (!chargersLayer) {
            chargersLayer = L.layerGroup();
        }

        chargersLayer.clearLayers();
        addEvtecnicMarkers(chargersLayer, chargers);

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
// OBTENIR CAPA
// =========================================================

export function getChargersLayer() {
    return chargersLayer;
}
