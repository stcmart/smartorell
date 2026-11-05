
function renderPoint(latlng, feature, config) {
    switch (config.renderer) {

        case 'marker':
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: config.class_name ?? '',
                    html: `<span class="material-symbols-outlined">${escapeHTML(config.icon ?? 'location_on')}</span>`,
                    iconSize: config.icon_size ?? [32, 32],
                    iconAnchor: config.icon_anchor ?? [16, 16]
                })
            });

        case 'circleMarker': {
            const style = { ...(config.style ?? {}) };

            const rule = config.rules?.find(
                r => feature.properties?.[r.field] === r.value
            );

            if (rule?.style) {
                Object.assign(style, rule.style);
            }

            return L.circleMarker(latlng, style);
        }

        default:
            return L.marker(latlng);
    }
}

// =========================================================
// RENDERITZADOR PRINCIPAL
// =========================================================

export function renderLayer(config, controlsContainer = null) {

    if (!config?.data) {
        console.error('La capa no conté dades GeoJSON.');
        return null;
    }

    const styleConfig = config.styles?.[0] ?? {};
    const popupConfig = config.popups?.[0] ?? {};

    if (controlsContainer) {
        controlsContainer.replaceChildren();

        // Primer llegendes, després accions
        renderLegends(config.legends ?? [], controlsContainer);
        renderActions(config.actions ?? [], controlsContainer);
    }

    return L.geoJSON(config.data, {

        pointToLayer(feature, latlng) {
            return renderPoint(latlng, feature, styleConfig);
        },

        style() {
            return styleConfig.style ?? {};
        },

        onEachFeature(feature, layer) {
            renderPopup(feature, layer, popupConfig);
        }
    });
}

// =========================================================
// LLEGENDES
// =========================================================

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

// =========================================================
// ACCIONS
// =========================================================

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

// =========================================================
// POPUPS
// =========================================================

function renderPopup(feature, layer, config) {

    if (!config) return;

    const properties = feature.properties ?? {};

    const titleTemplate = config.title?.title ?? '';

    const title = titleTemplate.replace(
        /\{(\w+)\}/g,
        (_, field) => escapeHTML(String(properties[field] ?? ''))
    );

    let html = '<div class="popup-content">';

    // Títol
    if (title) {
        html += `<h3>${title}</h3>`;
    }

    // Camps configurats al JSON
    (config.fields ?? []).forEach(item => {

        const value = properties[item.field] ?? '';

        html += `
            <div>
                <strong>${escapeHTML(item.label)}:</strong>
                ${escapeHTML(String(value))}
            </div>
        `;
    });

    // Elements addicionals
    (config.elements ?? []).forEach(element => {

        if (element.type === 'buttons') {

            const value = properties[element.field];

            if (!value) return;

            html += `<div class="${escapeHTML(element.class ?? '')}">`;

            (element.buttons ?? []).forEach(button => {

                const url = (element.url ?? '')
                    .replaceAll('{value}', String(value).trim())
                    .replaceAll('{message}', encodeURIComponent(button.message ?? ''));
                
                
                console.log('PROPERTIES POPUP:', properties);
                console.log('SIM:', properties.sim);

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
        }
    });

    html += '</div>';

    layer.bindPopup(html);

}

// =========================================================
// SEGURETAT HTML
// =========================================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}