
import { supabaseClient } from '../../auth/supabase.js';
import { map } from './maps.js';
import { renderLayer } from './layer-renderer.js';

// CONFIGURACIÓ
const BATCH_SIZE = 1000;
const DEBOUNCE_TIME = 400;
const MAX_CACHE_SIZE = 5;

const layerCache = {};
const spatialCache = new Map();
const loadedLayers = new Map();

let spatialRefreshTimer = null;
let spatialEventsInitialized = false;

// EXPEDIENTS
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

// CONFIGURACIÓ DE CAPES
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

    // Compatibilitat amb capes antigues
    config.load_all ??= true;

    layerCache[layerId] = config;

    return config;
}

// CARREGAR CAPA
export async function loadLayer(layerId, controlsContainer = null) {
    const config = await loadLayerConfig(layerId);

    if (!config) return null;

    if (!config.load_all) {
        config.data = {
            type: 'FeatureCollection',
            features: []
        };
    } else if (!config.data) {
        console.error(`La capa ${layerId} no conté dades.`);
        return null;
    }

    const layer = renderLayer({
        ...config,
        getExpedientUrl
    }, controlsContainer);

    if (!layer) return null;

    layer._layerId = layerId;
    layer._layerConfig = config;

    layer.addTo(map);

    if (config.load_all === false) {
        registerSpatialLayer(
            layer,
            config.layer_id ?? layerId,
            config.min_zoom ?? 0
        );
    }

    return layer;
}

// REGISTRE DE CAPES ESPACIALS
function registerSpatialLayer(layer, layerId, minZoom = 0) {
    loadedLayers.set(layer, {
        layer,
        layerId,
        minZoom,
        requestId: 0,
        loadingKey: null,
        lastKey: null
    });

    initializeSpatialEvents();

    refreshSpatialLayer(loadedLayers.get(layer));
}

function initializeSpatialEvents() {
    if (spatialEventsInitialized) return;

    map.on('zoomend moveend', scheduleSpatialRefresh);

    spatialEventsInitialized = true;
}

// ESDEVENIMENTS DEL MAPA
function scheduleSpatialRefresh() {
    clearTimeout(spatialRefreshTimer);

    spatialRefreshTimer = setTimeout(() => {
        loadedLayers.forEach(state => {
            refreshSpatialLayer(state);
        });
    }, DEBOUNCE_TIME);
}

// BOUNDS
function getSpatialBoundsKey(bounds) {
    return [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ]
        .map(value => value.toFixed(5))
        .join(':');
}

// CONSULTA D'UN LOT
async function loadLayerFeaturesByBounds(layerId, bounds, offset = 0) {
    const { data, error } = await supabaseClient
        .schema('management')
        .rpc('get_layer_features_by_bounds', {
            p_layer_id: String(layerId),
            p_west: bounds.getWest(),
            p_south: bounds.getSouth(),
            p_east: bounds.getEast(),
            p_north: bounds.getNorth(),
            p_limit: BATCH_SIZE,
            p_offset: offset
        });

    if (error) throw error;

    return typeof data === 'string'
        ? JSON.parse(data)
        : data;
}
// CÀRREGA PROGRESSIVA
async function refreshSpatialLayer(state) {
    const { layer, layerId, minZoom } = state;

    if (!map.hasLayer(layer)) return;

    // Comprovar zoom mínim
    if (map.getZoom() < minZoom) {
        state.requestId++;
        state.loadingKey = null;
        state.lastKey = null;

        return;
    }

    const bounds = map.getBounds();
    const boundsKey = getSpatialBoundsKey(bounds);
    const cacheKey = `${layerId}:${boundsKey}`;

    // Evitar repetir una càrrega ja completada
    if (state.lastKey === cacheKey) return;

    // Evitar peticions duplicades
    if (state.loadingKey === cacheKey) return;

    const requestId = ++state.requestId;

    state.loadingKey = cacheKey;

    const isCurrentRequest = () =>
        state.requestId === requestId &&
        map.hasLayer(layer) &&
        map.getZoom() >= minZoom &&
        getSpatialBoundsKey(map.getBounds()) === boundsKey;

    try {
        // MEMÒRIA CAU
        if (spatialCache.has(cacheKey)) {
            const cached = spatialCache.get(cacheKey);

            // Actualitzar ordre de la memòria cau
            spatialCache.delete(cacheKey);
            spatialCache.set(cacheKey, cached);

            if (isCurrentRequest()) {
                layer.addData(cached);
                state.lastKey = cacheKey;
            }

            return;
        }
        // RECUPERACIÓ PROGRESSIVA
        let offset = 0;
        const allFeatures = [];

        while (true) {
            if (!isCurrentRequest()) return;

            const batch = await loadLayerFeaturesByBounds(
                layerId,
                bounds,
                offset
            );

            if (!isCurrentRequest()) return;

            const features = batch?.features ?? [];

            // Afegir immediatament el lot al mapa
            if (features.length > 0) {
                allFeatures.push(...features);
            }

            // Si hi ha menys de 1.000, hem acabat
            if (features.length < BATCH_SIZE) break;

            offset += BATCH_SIZE;
        }

        // DESAR MEMÒRIA CAU
        if (isCurrentRequest()) {
            const geojson = {
                type: 'FeatureCollection',
                features: allFeatures
            };

            syncSpatialFeatures(layer, geojson);

            spatialCache.set(cacheKey, geojson);
            state.lastKey = cacheKey;
        }

    } catch (error) {
        console.error(
            `Error carregant la capa ${layerId}:`,
            error
        );

    } finally {
        if (state.requestId === requestId) {
            state.loadingKey = null;
        }
    }
}

function syncSpatialFeatures(layer, geojson) {
    const existingLayers = new Map();

    // Indexar elements ja carregats
    layer.eachLayer(item => {
        const id = item.feature?.properties?.id;

        if (id != null) {
            existingLayers.set(String(id), item);
        }
    });

    const receivedIds = new Set();

    for (const feature of geojson.features ?? []) {
        const id = feature.properties?.id;

        if (id == null) continue;

        const key = String(id);
        receivedIds.add(key);

        const existing = existingLayers.get(key);

        if (existing) {
            // Actualitzar geometria i propietats sense substituir la capa
            existing.feature = feature;

            if (feature.geometry?.type === 'Point') {
                const [lng, lat] = feature.geometry.coordinates;
                existing.setLatLng([lat, lng]);
            } else if (typeof existing.setLatLngs === 'function') {
                const temporary = L.geoJSON(feature);
                const updated = temporary.getLayers()[0];

                if (updated?.getLatLngs) {
                    existing.setLatLngs(updated.getLatLngs());
                }
            }

            existing.setStyle?.(
                getFeatureStyle(feature)
            );

        } else {
            // Afegir només els elements nous
            layer.addData(feature);
        }
    }

    // Eliminar elements que ja no pertanyen al resultat espacial
    existingLayers.forEach((item, id) => {
        if (!receivedIds.has(id)) {
            layer.removeLayer(item);
        }
    });
}

// NETEJA DE MEMÒRIA CAU
export function clearLayerCache(layerId = null) {
    if (layerId == null) {
        spatialCache.clear();
        Object.keys(layerCache).forEach(key => {
            delete layerCache[key];
        });

        loadedLayers.forEach(state => {
            state.requestId++;
            state.loadingKey = null;
            state.lastKey = null;
        });

        return;
    }

    delete layerCache[layerId];

    for (const key of spatialCache.keys()) {
        if (key.startsWith(`${layerId}:`)) {
            spatialCache.delete(key);
        }
    }

    loadedLayers.forEach(state => {
        if (String(state.layerId) === String(layerId)) {
            state.requestId++;
            state.loadingKey = null;
            state.lastKey = null;
        }
    });
}