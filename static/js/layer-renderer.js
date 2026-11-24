import { map } from './maps.js';

// Configuration
let popupCloseInitialized = false;
let mapSelectionEventsInitialized = false;
let selectedLayer = null;
let selectionToken = 0;
let selectedLayerRemoveHandler = null;

// Simbology logic
export function renderFeature(feature, latlng, config = {}) {

    const symbol = getFeatureSymbol(feature, config);
    const geometry = feature.geometry?.type;

    // Points
    if (latlng) {

        if (symbol.type === 'circleMarker') {

            const style = { ...symbol.style };

            style.fillColor ??= style.backgroundColor;
            style.color ??= style.borderColor;
            style.weight ??= style.borderWidth;

            return L.circleMarker(latlng, {
                ...symbol.style,
                radius: symbol.radius ?? symbol.size ?? 8
            });
        }

        return L.marker(latlng, {
            icon: createFeatureIcon(symbol, feature)
        });
    }

    // Lines and polygons
    const style = { ...symbol.style };

    if (geometry === 'Polygon' || geometry === 'MultiPolygon') {
        return style;
    }

    if (geometry === 'LineString' || geometry === 'MultiLineString') {
        return style;
    }

    return style;
}
// Get the symbol for a feature
function getFeatureSymbol(feature, config = {}) {

    const base = config.symbol ?? {
        type: config.renderer === 'circleMarker'
            ? 'circleMarker'
            : 'marker',
        value: config.icon ?? 'location_on',
        size: config.icon_size?.[0] ?? 32,
        anchor: config.icon_anchor ?? [16, 16],
        style: config.style ?? {}
    };

    const symbol = structuredClone(base);

    // Compatibilitat amb configuracions antigues
    if (config.style && !config.symbol) {
        symbol.style = { ...config.style };
    }

    const rule = matchRules(feature, config);

    if (rule?.symbol) {
        Object.assign(symbol, rule.symbol);

        symbol.style = {
            ...(base.style ?? {}),
            ...(rule.symbol.style ?? {})
        };
    } else if (rule?.style) {
        symbol.style = {
            ...(symbol.style ?? {}),
            ...rule.style
        };
    }

    return symbol;
}

// Rules
function matchRules(feature, config = {}) {

    if (config.renderer?.type === 'single') {
        return null;
    }

    const rules = [...(config.rules ?? [])]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return rules.find(rule =>
        evaluateFilter(feature.properties ?? {}, rule.filter ?? rule)
    );
}

// Filter
function evaluateFilter(properties, filter) {

    if (filter.and) {
        return filter.and.every(item =>
            evaluateFilter(properties, item)
        );
    }

    if (filter.or) {
        return filter.or.some(item =>
            evaluateFilter(properties, item)
        );
    }

    const actual = properties[filter.field];
    const expected = filter.value;

    switch (filter.operator ?? 'equals') {

        case 'equals':
            return actual === expected;

        case 'not_equals':
            return actual !== expected;

        case 'in':
            return Array.isArray(expected) &&
                expected.includes(actual);

        case 'greater_than':
            return Number(actual) > Number(expected);

        case 'less_than':
            return Number(actual) < Number(expected);

        case 'between':
            return Array.isArray(expected) &&
                Number(actual) >= Number(expected[0]) &&
                Number(actual) <= Number(expected[1]);

        case 'contains':
            return String(actual ?? '').includes(String(expected));

        case 'is_null':
            return actual == null;

        default:
            return false;
    }
}

// Icon maker
function createFeatureIcon(symbol, feature = {}) {

    const source = symbol.source ?? 'material-symbols';
    const value = symbol.value ?? 'location_on';

    const size = Number(symbol.size ?? 36);
    const iconSize = Number(symbol.iconSize ?? 24);
    const style = symbol.style ?? {};

    const segments = symbol.segments;

    let background = style.backgroundColor ?? 'transparent';
    let color = style.iconColor ?? style.color ?? '';
    let border = style.borderColor ?? 'transparent';

    if (segments?.field && segments?.valueField) {

        const items = getNestedValue(
            feature.properties ?? {},
            segments.field
        );

        if (Array.isArray(items) && items.length) {

            const colors = items.map(item => {

                const status = getNestedValue(
                    item,
                    segments.valueField
                );

                return segments.colors?.[String(status)]
                    ?? segments.fallback
                    ?? '#888888';
            });

            const stops = colors.map((color, index) => {

                const start = (index / colors.length) * 100;
                const end = ((index + 1) / colors.length) * 100;

                return `${color} ${start}% ${end}%`;
            });

            background = `conic-gradient(${stops.join(', ')})`;

            // Vora i icona segons el primer connector
            const firstStatus = getNestedValue(
                items[0],
                segments.valueField
            );

            border = segments.borderColors?.[String(firstStatus)]
                ?? border;

            color = segments.iconColors?.[String(firstStatus)]
                ?? color;

        } else {

            background = segments.fallback ?? background;
        }
    }

    const borderWidth = style.borderWidth ?? 0;

    const borderWidthCSS = typeof borderWidth === 'number'
        ? `${borderWidth}px`
        : String(borderWidth);

    const customStyle = [
        `font-size:${iconSize}px`,
        color && `color:${color}`,
        `background:${background}`,
        `border:${borderWidthCSS} solid ${border}`,
        `opacity:${style.opacity ?? 1}`,
        `border-radius:${style.borderRadius ?? '50%'}`,
        `box-shadow:${style.boxShadow ?? 'none'}`,
        `width:${size}px`,
        `height:${size}px`,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'box-sizing:border-box'
    ]
        .filter(Boolean)
        .map(safeCSS)
        .filter(Boolean)
        .join(';');

    let content = '';

    switch (source) {

        case 'material-symbols':

            content = `
                <span class="material-symbols-outlined"
                    style="${escapeHTML(customStyle)}">
                    ${escapeHTML(value)}
                </span>`;

            break;

        case 'font-awesome':

            content = `
                <i class="${escapeHTML(value)}"
                    style="${escapeHTML(customStyle)}"></i>`;

            break;

        case 'storage':
        case 'url':
        case 'svg':

            content = `
                <img
                    src="${escapeHTML(value)}"
                    style="${escapeHTML([
                        `width:${size}px`,
                        `height:${size}px`,
                        'object-fit:contain',
                        `opacity:${style.opacity ?? 1}`
                    ].map(safeCSS).join(';'))}"
                >`;

            break;

        default:

            content = `
                <span class="material-symbols-outlined">
                    location_on
                </span>`;
    }

    return L.divIcon({
        className: '',
        html: content,
        iconSize: [size, size],
        iconAnchor: symbol.anchor ?? [size / 2, size / 2]
    });
}

function getNestedValue(object, path) {

    return String(path).split('.').reduce(
        (value, key) => value?.[key],
        object
    );
}

// Dynamic labels
function renderLabels(feature, layer, config = {}) {

    if (!config.enabled) return;

    const properties = feature.properties ?? {};

    // Estil general de les etiquetes
    const label = structuredClone(config);

    // Regles independents de les regles de simbolització
    const rules = [...(config.rules ?? [])]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const rule = rules.find(item =>
        evaluateFilter(properties, item.filter ?? item)
    );

    if (rule) {
        Object.assign(label, rule);
        label.style = {
            ...(config.style ?? {}),
            ...(rule.style ?? {})
        };
    }

    // Text de l'etiqueta
    let content = label.template ?? (
        label.field ? String(properties[label.field] ?? '') : ''
    );

    content = content.replace(
        /\{(\w+)\}/g,
        (_, field) => String(properties[field] ?? '')
    );

    if (!content) return;

    const style = label.style ?? {};

    const css = {
        color: style.color ?? '#222222',
        'font-size': style.fontSize ?? '12px',
        'font-family': style.fontFamily ?? 'inherit',
        'font-weight': style.fontWeight ?? 'normal',
        'font-style': style.fontStyle ?? 'normal',
        'text-align': style.textAlign ?? 'center',
        'background-color': style.backgroundColor ?? 'transparent',
        'border': `${style.borderWidth ?? 0}px solid ${style.borderColor ?? 'transparent'}`,
        'border-radius': style.borderRadius ?? '3px',
        'padding': style.padding ?? '2px 5px',
        'text-shadow': style.textShadow ?? 'none',
        'white-space': 'nowrap'
    };

    const inlineStyle = Object.entries(css)
        .map(([key, value]) => {
            const safe = safeCSS(`${key}:${value}`);
            return safe;
        })
        .filter(Boolean)
        .join(';');

    const html = `
        <span style="${escapeHTML(inlineStyle)}">
            ${escapeHTML(content)}
        </span>
    `;

    layer.bindTooltip(html, {
        permanent: label.permanent ?? true,
        direction: label.direction ?? 'center',
        offset: label.offset ?? [0, 0],
        opacity: label.opacity ?? 1,
        interactive: false
    });
}

// CSS validation for inline styles
function safeCSS(value) {

    const text = String(value);

    if (/[<>{};]/.test(text)) return '';

    return text;
}

// Main renderer
export function renderLayer(config, controlsContainer = null) {

    if (!config?.data) {
        console.error('La capa no conté dades GeoJSON.');
        return null;
    }

    const styleConfig = config.styles?.[0]?.config ??
        config.styles?.[0] ?? {};

    const popupConfig = config.popups?.[0]?.config ??
        config.popups?.[0] ?? {};

    if (controlsContainer) {

        controlsContainer.replaceChildren();

        renderLegends(
            config.legends?.map(item => item.config ?? item) ?? [],
            controlsContainer
        );

        renderActions(
            config.actions?.map(item => item.config ?? item) ?? [],
            controlsContainer
        );
    }

    return L.geoJSON(config.data, {

        pointToLayer(feature, latlng) {
            return renderFeature(feature, latlng, styleConfig);
        },

        style(feature) {
            return renderFeature(feature, null, styleConfig);
        },

        onEachFeature(feature, layer) {

            renderLabels(
                feature,
                layer,
                styleConfig.labels ?? {}
            );

            renderPopup(
                feature,
                layer,
                popupConfig,
                config.getExpedientUrl
            );
        }
    });
}

// Popup renderer
function renderPopup(feature, layer, config, getExpedientUrl) {

    if (!config) return;

    const properties = feature.properties ?? {};

    const titleTemplate = config.title?.title ?? '';

    const title = titleTemplate.replace(
        /\{(\w+)\}/g,
        (_, field) => escapeHTML(String(properties[field] ?? ''))
    );

    let html = '';

    // Camps normals
    (config.fields ?? []).forEach(item => {

        const value = properties[item.field] ?? '';

        html += `
            <div class="popup-field">
                <strong>${escapeHTML(item.label)}</strong>
                <span>${escapeHTML(String(value))}</span>
            </div>
        `;
    });

    // Documents
    for (const item of config.documents ?? []) {

        const filename = (item.filename ?? '')
            .replaceAll('{quadre_id}', properties.quadre_id ?? '')
            .replaceAll('{ritsic}', properties.ritsic ?? '');

        if (!filename) continue;

        html += `
            <div class="popup-field">
                <strong>${escapeHTML(item.label)}</strong>
                <a
                    href="#"
                    class="popup-document-link"
                    data-storage="${escapeHTML(item.storage)}"
                    data-filename="${escapeHTML(filename)}"
                >
                    ${escapeHTML(String(properties[item.field] ?? ''))}
                </a>
            </div>
        `;
    }

    // Elements addicionals
    (config.elements ?? []).forEach(element => {

        if (element.type !== 'buttons') return;

        const value = properties[element.field];

        if (!value) return;

        html += `<div class="${escapeHTML(element.class ?? '')}">`;

        (element.buttons ?? []).forEach(button => {

            const url = (element.url ?? '')
                .replaceAll('{value}', String(value).trim())
                .replaceAll('{message}', encodeURIComponent(button.message ?? ''));

            html += `
                <a
                    href="${escapeHTML(url)}"
                    class="${escapeHTML(element.class_button ?? '')}"
                >
                    ${escapeHTML(button.label ?? '')}
                </a>
            `;
        });

        html += '</div>';
    });

    initializePopupClose();
    initializeMapSelectionEvents();

    // Selecció del feature al fer clic
    layer.on('click', () => {
        selectFeature(layer, title, html, getExpedientUrl);
    });
}

// Legends
function renderLegends(legends, container) {

    legends.forEach(config => {
        const legend = document.createElement('div');
        legend.className = 'led-legend';

        (config.items ?? []).forEach(item => {
            const row = document.createElement('div');
            row.className = 'led-group';

            row.dataset.actionGroup = item.action_group ?? '';

            const info = document.createElement('div');
            info.className = 'led-info';

            const dot = document.createElement('span');
            dot.className = 'led-symbol';
            dot.style.backgroundColor = item.color ?? 'gray';

            const label = document.createElement('span');
            label.textContent = item.label ?? '';

            info.append(dot, label);
            row.appendChild(info);

            legend.appendChild(row);
        });

        container.appendChild(legend);
    });
}

// Actions
function renderActions(actions, container) {

    actions.forEach(config => {

        if (config.type !== 'sms') return;

        const row = [...container.querySelectorAll('.led-group')]
            .find(item =>
                item.dataset.actionGroup === config.group
            );

        if (!row) return;

        let buttons = row.querySelector('.led-actions');

        if (!buttons) {
            buttons = document.createElement('div');
            buttons.className = 'led-actions';
            row.appendChild(buttons);
        }

        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'led-sms-button led-sms-button';

        button.textContent = config.label ?? '';

        button.dataset.ledGroup = config.group;
        button.dataset.message = config.message ?? '';

        // Colors ON / OFF
        button.classList.add(
            config.message === 'ON' ? 'led-on' : 'led-off'
        );

        buttons.appendChild(button);
    });
}

// Map feature focus 
function focusFeatureOnMap(layer, card) {

    if (!map || !layer) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const cardHeight = card.getBoundingClientRect().height;

    const bounds = typeof layer.getBounds === 'function'
        ? layer.getBounds()
        : null;

    // =====================================================
    // PUNTS
    // =====================================================

    if (typeof layer.getLatLng === 'function') {

        const latlng = layer.getLatLng();

        const targetZoom = Math.min(
            Math.max(map.getZoom(), 17),
            19
        );

        map.flyTo(latlng, targetZoom, {
            animate: true,
            duration: 0.6
        });

        if (isMobile) {
            map.once('moveend', () => {
                map.panBy(
                    [0, (cardHeight / 2) + 20],
                    { animate: true, duration: 0.4 }
                );
            });
        }

        return;
    }

    // =====================================================
    // LÍNIES I POLÍGONS
    // =====================================================

    if (bounds?.isValid()) {

        map.fitBounds(bounds, {
            animate: true,
            duration: 0.6,
            maxZoom: 17,
            paddingTopLeft: [24, 24],
            paddingBottomRight: [
                24,
                isMobile ? cardHeight + 40 : 24
            ]
        });
    }
}

// Clear selection
function clearFeatureSelection() {

    selectionToken++;

    if (selectedLayer && selectedLayerRemoveHandler) {
        selectedLayer.off('remove', selectedLayerRemoveHandler);
    }

    selectedLayer = null;
    selectedLayerRemoveHandler = null;

    const card = document.getElementById('map-feature-card');

    if (card) {
        card.hidden = true;
        card.setAttribute('aria-hidden', 'true');
    }
}

// Select feature
export function selectFeature(layer, title, html, getExpedientUrl) {

    if (selectedLayer === layer) return;

    // Eliminar selecció anterior
    clearFeatureSelection();

    selectedLayer = layer;

    const currentToken = selectionToken;

    const card = document.getElementById('map-feature-card');
    const titleElement = document.getElementById('map-feature-title');
    const contentElement = document.getElementById('map-feature-content');

    if (!card || !titleElement || !contentElement) return;

    titleElement.innerHTML = title;
    contentElement.innerHTML = html;

    card.hidden = false;
    card.setAttribute('aria-hidden', 'false');

    // Tancar si la feature desapareix del mapa
    selectedLayerRemoveHandler = () => {
        if (selectedLayer === layer) {
            clearFeatureSelection();
        }
    };

    layer.on('remove', selectedLayerRemoveHandler);

    // Zoom i centratge
    requestAnimationFrame(() => {
        if (selectedLayer === layer) {
            focusFeatureOnMap(layer, card);
        }
    });

    // Carregar documents
    const links = contentElement.querySelectorAll('.popup-document-link');

    links.forEach(async link => {

        link.addEventListener('click', e => {
            if (!link.dataset.ready) e.preventDefault();
        });

        const url = await getExpedientUrl(
            link.dataset.storage,
            link.dataset.filename
        );

        if (
            currentToken !== selectionToken ||
            !link.isConnected
        ) return;

        if (!url) {
            link.textContent = 'Document no disponible';
            link.removeAttribute('href');
            return;
        }

        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.ready = 'true';
    });
}

function initializeMapSelectionEvents() {

    if (mapSelectionEventsInitialized) return;

    map.on('click', event => {

        const target = event.originalEvent?.target;

        // No deseleccionar quan el clic prové d'una feature
        if (target?.closest(
            '.leaflet-interactive, .leaflet-marker-icon'
        )) return;

        clearFeatureSelection();
    });

    mapSelectionEventsInitialized = true;
}

// Floating card - close button
function initializePopupClose() {

    if (popupCloseInitialized) return;

    const card = document.getElementById('map-feature-card');

    if (!card) return;

    const closeButton = card.querySelector('.map-feature-card__close');

    if (!closeButton) return;

    closeButton.addEventListener('click', clearFeatureSelection);

    popupCloseInitialized = true;
}

// Escape HTML for security
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}