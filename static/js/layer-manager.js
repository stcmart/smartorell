import { supabaseClient } from '../../auth/supabase.js';
import { map } from './maps.js';
import { renderLayer } from './layer-renderer.js';

// Memòria cau
const layerCache = {};

// Expedient del quadre 
async function getExpedientUrl(storage, filename) {

    const { data, error } = await supabaseClient
        .storage
        .from(storage)
        .createSignedUrl(filename, 300, {
            download: true
        });

    if (error) {
        console.error('Error generant URL expedient:', error);
        return null;
    }

    return data.signedUrl;
}

/* Carrega les dades i configuracions d'una capa. */
export async function loadLayerConfig(layerId) {

    const { data, error } = await supabaseClient
        .schema('management')
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
    layerCache[layerId] = config;
    return config;  
}

/* Carrega i representa una capa al mapa. */
export async function loadLayer(layerId, controlsContainer = null) {
    const config = await loadLayerConfig(layerId);
    if (!config) return null;

    const layer = renderLayer({
        ...config,
        getExpedientUrl
    }, controlsContainer);

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
