import { supabaseClient } from '../../auth/supabase.js';
import { map } from './map.js';
import { renderLayer } from './layer-renderer.js';

// Memòria cau
const layerCache = {};

/* Carrega les dades i configuracions d'una capa. */
export async function loadLayerConfig(layerId) {

    /* if (layerCache[layerId]) {
        return layerCache[layerId];
    } */

    const { data, error } = await supabaseClient
        .rpc('get_layer_config', {
            p_layer_id: layerId
        });

    if (error) {
        console.error(`Error carregant capa ${layerId}:`, error);
        return null;
    }

    if (!data) return null;

    const config = typeof data === 'string'
        ? JSON.parse(data)
        : data;

    if (typeof config.data === 'string') {
        config.data = JSON.parse(config.data);
    }

    console.log('RESPOSTA SUPABASE:', data);
    console.log('ERROR SUPABASE:', error);

    console.log('CONFIG RPC:', config);
    console.log('STYLES:', config.styles);
    console.log('POPUPS:', config.popups);

    layerCache[layerId] = config;
    return config;  
}

/* Carrega i representa una capa al mapa. */
export async function loadLayer(layerId, controlsContainer = null) {
    const config = await loadLayerConfig(layerId);
    if (!config) return null;

    const layer = renderLayer(config, controlsContainer);

    if (layer) layer.addTo(map);

    return layer;
}

/* Neteja la memòria cau. */
export function clearLayerCache(layerId) {

    if (layerId) {
        delete layerCache[layerId];
    } else {
        Object.keys(layerCache).forEach(key => {
            delete layerCache[key];
        });
    }  
}
