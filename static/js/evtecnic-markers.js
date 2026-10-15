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

function createPopup(charger) {
    const sockets = charger.charger_sockets ?? [];

    const rows = sockets.map(socket => {
        const status = getStatus(socket.id_status);

        return `
            <tr>
                <td>${socket.connector_type_name ?? '—'}</td>
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
            <h3>${charger.name ?? 'Carregador'}</h3>

            <p>
                <strong>Carrer:</strong>
                ${charger.address ?? 'No disponible'}
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

export function addEvtecnicMarkers(map, chargers) {
    const markers = [];

    chargers.forEach(charger => {
        const lat = Number(charger.latitude);
        const lng = Number(charger.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

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
        marker.addTo(map);

        markers.push(marker);
    });

    return markers;
}