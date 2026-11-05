import { supabaseClient } from '../../auth/supabase.js';
import { checkAuth } from '../../auth/auth.js';
import { map } from './map.js';
import { loadLayer as loadSupabaseLayer } from './layer-manager.js';
import './led-sms.js';
import {
    checkEtecnicToken,
    refreshChargers,
    getChargersLayer
} from './evtecnic-manager.js';

const activeLayers = {};

// =========================================================
// CARREGAR XARXES
// =========================================================

async function loadNetworks() {
    const container = document.getElementById('networks');
    if (!container) return;

    const profile = await checkAuth();

    if (!profile) return;

    const hasEtecnicToken = await checkEtecnicToken();
    
    const { data, error } = await supabaseClient
        .from('xarxes')
        .select(`
            id,
            nom,
            description,
            layers (
                id,
                table_name,
                name,
                layer_description,
                roles_allowed
            )
        `);

    if (error) {
        console.error('Error carregant xarxes:', error);
        return;
    }

    renderNetworks(data, profile.role, hasEtecnicToken);
}

// =========================================================
// RENDERITZAR XARXES
// =========================================================

function renderNetworks(networks, userRole, hasEtecnicToken) {
    const container = document.getElementById('networks');
    if (!container) return;

    container.innerHTML = '';

    networks.forEach(network => {
        const networkElement = document.createElement('div');
        networkElement.className = 'network-item';

        networkElement.innerHTML = `
            <div class="network-header" aria-expanded="false">
                <span class="material-symbols-outlined network-arrow">
                    expand_more
                </span>
                <span class="network-name"></span>
            </div>
            <div class="network-layers" hidden></div>
        `;

        networkElement.querySelector('.network-name').textContent = network.nom;

        const header = networkElement.querySelector('.network-header');
        const arrow = networkElement.querySelector('.network-arrow');
        const layersContainer = networkElement.querySelector('.network-layers');

        header.addEventListener('click', () => {
            const isOpening = layersContainer.hidden;
            layersContainer.hidden = !isOpening;

            header.setAttribute('aria-expanded', String(isOpening));
            arrow.textContent = isOpening ? 'expand_less' : 'expand_more';
        });

        (network.layers ?? []).forEach(layer => {
            if (
                layer.roles_allowed?.length &&
                !layer.roles_allowed.includes(userRole)
            ) return;

            const isEtecnic = layer.table_name?.toLowerCase() === 'evtecnic';

            if (isEtecnic && !hasEtecnicToken) return;

            const layerElement = document.createElement('div');
            layerElement.className = 'layer-item';
           
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'layer-details';
            detailsContainer.hidden = true;
            detailsContainer.dataset.layerId = layer.id;

            layerElement.innerHTML = `
                <span class="layer-name"></span>
                <div class="layer-controls">
                    ${isEtecnic ? `
                        <button
                            class="charger-refresh"
                            type="button"
                            title="Actualitzar carregadors"
                            aria-label="Actualitzar carregadors"
                            data-layer-id="${layer.id}">
                            <span class="material-symbols-outlined">sync</span>
                        </button>
                    ` : ''}
                    <label class="layer-toggle">
                        <input
                            type="checkbox"
                            data-layer-id="${layer.id}"
                            data-table="${layer.table_name}">
                        <span class="slider"></span>
                    </label>
                </div>
            `;

            layerElement.querySelector('.layer-name').textContent = layer.name;

            
            layersContainer.appendChild(layerElement);
            layersContainer.appendChild(detailsContainer);
            
        });

        container.appendChild(networkElement);
    });
}

// =========================================================
// CARREGAR CAPA
// =========================================================

async function loadLayer(layer, detailsContainer) {
    const layerId = Number(layer.id);
    const tableName = layer.table_name?.toLowerCase();

    if (tableName === 'evtecnic') return;

    if (activeLayers[layerId]) {
        map.addLayer(activeLayers[layerId]);
        return;
    }

    const leafletLayer = await loadSupabaseLayer(
        layerId,
        detailsContainer
    );

    if (leafletLayer) {
        activeLayers[layerId] = leafletLayer;
    }
}

// =========================================================
// TOGGLES I ACTUALITZACIÓ
// =========================================================

document.addEventListener('click', async event => {
    const button = event.target.closest('.charger-refresh');
    if (!button) return;

    const layer = await refreshChargers(button.dataset.layerId);

    if (layer) {
        activeLayers[button.dataset.layerId] = layer;
    }
});


document.addEventListener('change', async event => {
    const input = event.target.closest('.layer-toggle input');
    if (!input) return;

    const layerId = Number(input.dataset.layerId);

    const detailsContainer = document.querySelector(
        `.layer-details[data-layer-id="${layerId}"]`
    );

    if (input.checked) {
        input.disabled = true;

        try {
            const layerData = {
                id: layerId,
                table_name: input.dataset.table
            };

            if (layerData.table_name.toLowerCase() === 'evtecnic') {
                const layer = getChargersLayer() ||
                    await refreshChargers(layerId);

                if (layer) {
                    map.addLayer(layer);
                    activeLayers[layerId] = layer;
                }
            } else {
                await loadLayer(layerData, detailsContainer);
            }

            if (activeLayers[layerId]) {
                if (detailsContainer) {
                    detailsContainer.hidden = false;
                }
            } else {
                input.checked = false;
            }

        } catch (error) {
            console.error('Error activant capa:', error);
            input.checked = false;
        } finally {
            input.disabled = false;
        }

    } else {
        const layer = activeLayers[layerId];

        if (layer) map.removeLayer(layer);

        if (detailsContainer) {
            detailsContainer.hidden = true;
        }
    }
});


// =========================================================
// MENÚ XARXES
// =========================================================

function setupNetworksMenu() {
    const button = document.getElementById('networksButton');
    const container = document.getElementById('networks');

    if (!button || !container) return;

    button.addEventListener('click', () => {
        container.hidden = !container.hidden;

        const arrow = button.querySelector(
            '.arrow .material-symbols-outlined'
        );

        if (arrow) {
            arrow.textContent = container.hidden
                ? 'arrow_drop_down'
                : 'arrow_drop_up';
        }
    });
}

// =========================================================
// INICI
// =========================================================

setupNetworksMenu();
loadNetworks();