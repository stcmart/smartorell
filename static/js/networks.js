import { supabaseClient } from '../../auth/supabase.js';

import { map } from './map.js';

import { loadQuadres } from './quadres.js';
import { loadSenyalitzacioLED } from './senyalitzacio_LED.js';


// =========================================================
// LOADERS DE CAPES
// =========================================================

const layerLoaders = {
    quadres: loadQuadres,
    senyalitzacio_led: loadSenyalitzacioLED
};


// Capes actualment carregades
const activeLayers = {};


// SIMs de la senyalització
let senyalitzacioSims = {
    tancament: [],
    prohibicio: []
};


// =========================================================
// CARREGAR XARXES
// =========================================================

async function loadNetworks() {

    const container =
        document.getElementById('networks');

    if (!container) {
        console.error('No s\'ha trobat #networks');
        return;
    }


    const { data, error } =
        await supabaseClient
            .from('xarxes')
            .select(`
                id,
                nom,
                description,
                layers (
                    id,
                    table_name,
                    name,
                    layer_description
                )
            `);


    if (error) {

        console.error(
            'Error carregant xarxes:',
            error
        );

        return;
    }


    renderNetworks(data);
}


// =========================================================
// RENDER TREE
// =========================================================

function renderNetworks(networks) {

    const container =
        document.getElementById('networks');

    if (!container) return;

    container.innerHTML = '';


    networks.forEach(network => {

        const networkElement =
            document.createElement('div');

        networkElement.className =
            'network-item';


        networkElement.innerHTML = `
            <div class="network-header">

                <span class="material-symbols-outlined network-arrow">
                    expand_more
                </span>

                <span class="network-name">
                    ${network.nom}
                </span>

            </div>

            <div class="network-layers"></div>
        `;


        const layersContainer =
            networkElement.querySelector(
                '.network-layers'
            );


        network.layers.forEach(layer => {

            const layerElement =
                document.createElement('div');

            layerElement.className =
                'layer-item';


            layerElement.innerHTML = `
                <span class="layer-name">
                    ${layer.name}
                </span>

                <label class="layer-toggle">

                    <input
                        type="checkbox"
                        checked
                        data-layer-id="${layer.id}"
                        data-table="${layer.table_name}"
                    >

                    <span class="slider"></span>

                </label>
            `;


            layersContainer.appendChild(
                layerElement
            );


            loadLayer(layer);


            // Llegenda de la capa LED
            if (
                layer.table_name.toLowerCase() ===
                'senyalitzacio_led'
            ) {

                layersContainer.appendChild(
                    createSenyalitzacioLegend()
                );

            }

        });


        container.appendChild(
            networkElement
        );

    });
}

// =========================================================
// CARREGAR CAPA LEAFLET
// =========================================================

async function loadLayer(layer) {

    const tableName =
        layer.table_name.toLowerCase();


    const loader =
        layerLoaders[tableName];


    if (!loader) {

        console.warn(
            'No existeix loader per:',
            tableName
        );

        return;
    }


    const leafletLayer =
        await loader();


    if (!leafletLayer) {

        console.warn(
            'La capa no ha retornat cap Leaflet layer:',
            tableName
        );

        return;
    }


    console.log(
        'Layer carregada:',
        tableName,
        leafletLayer
    );


    activeLayers[layer.id] =
        leafletLayer;


    // Visible inicialment
    map.addLayer(leafletLayer);
}


// =========================================================
// TOGGLE CAPES
// =========================================================

document.addEventListener(
    'change',
    event => {

        const input =
            event.target.closest(
                '.layer-toggle input'
            );


        if (!input) return;


        const layerId =
            input.dataset.layerId;


        const layer =
            activeLayers[layerId];


        if (!layer) return;


        if (input.checked) {

            map.addLayer(layer);

        } else {

            map.removeLayer(layer);

        }

    }
);


// =========================================================
// MENÚ XARXES
// =========================================================

function setupNetworksMenu() {

    const button =
        document.getElementById('networksButton');

    const container =
        document.getElementById('networks');


    if (!button || !container) {

        console.error(
            'No s\'ha trobat el menú Xarxes'
        );

        return;
    }


    button.addEventListener(
        'click',
        () => {

            container.hidden =
                !container.hidden;


            const arrow =
                button.querySelector(
                    '.arrow .material-symbols-outlined'
                );


            if (arrow) {

                arrow.textContent =
                    container.hidden
                        ? 'arrow_drop_down'
                        : 'arrow_drop_up';

            }

        }
    );
}


// =========================================================
// SIMS SENYALITZACIÓ
// =========================================================

async function loadSenyalitzacioSims() {

    const { data, error } =
        await supabaseClient
            .rpc(
                'get_senyalitzacio_led_sims'
            );


    if (error) {

        console.error(
            'Error carregant SIMs de senyalització:',
            error
        );

        return;
    }


    senyalitzacioSims =
        data;


    console.log(
        'SIMs senyalització:',
        senyalitzacioSims
    );
}


// =========================================================
// LLEGENDA SENYALITZACIÓ LED
// =========================================================

function createSenyalitzacioLegend() {

    const legend =
        document.createElement('div');


    legend.className =
        'led-legend';


    legend.innerHTML = `

        <div class="led-group">

            <div class="led-info">

                <span class="led-symbol led-red"></span>

                <span>
                    Tancament del gual inundable
                </span>

            </div>


            <div class="led-actions">

                <button
                    class="led-sms-button led-on"
                    data-led-group="tancament"
                    data-message="ON">
                    ON
                </button>


                <button
                    class="led-sms-button led-off"
                    data-led-group="tancament"
                    data-message="OFF">
                    OFF
                </button>

            </div>

        </div>


        <div class="led-group">

            <div class="led-info">

                <span class="led-symbol led-yellow"></span>

                <span>
                    Prohibició parking risc inundació
                </span>

            </div>


            <div class="led-actions">

                <button
                    class="led-sms-button led-on"
                    data-led-group="prohibicio"
                    data-message="ON">
                    ON
                </button>


                <button
                    class="led-sms-button led-off"
                    data-led-group="prohibicio"
                    data-message="OFF">
                    OFF
                </button>

            </div>

        </div>

    `;


    return legend;
}


// =========================================================
// SMS GRUPALS
// =========================================================

document.addEventListener(
    'click',
    event => {

        const button =
            event.target.closest(
                '.led-sms-button'
            );


        if (!button) return;


        const group =
            button.dataset.ledGroup;


        const message =
            button.dataset.message;


        const sims =
            senyalitzacioSims[group] || [];


        if (!sims.length) {

            console.warn(
                `No hi ha SIMs per al grup: ${group}`
            );

            return;
        }


        const recipients =
            sims.join(',');


        window.location.href =
            `sms:${recipients}?body=${encodeURIComponent(message)}`;

    }
);

// =========================================================
// INICI
// =========================================================

loadNetworks();

setupNetworksMenu();

loadSenyalitzacioSims();