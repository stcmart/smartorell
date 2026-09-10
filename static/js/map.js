/* Initialize map */
const map = L.map("map", {
    zoomControl: false,
    minZoom: 13,
    maxZoom: 18,
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    dragRotate: true,
}).setView(
    [41.4747, 1.9292],
    14
);

/* Popups*/

function crearPopup(feature) {

    if (!feature.properties || Object.keys(feature.properties).length === 0) {
        return "Sense informació";
    }

    let html = `<div class="popup-content">`;

    for (const key in feature.properties) {

        const value = feature.properties[key];

        html += `
            <div>
                <strong>${key}</strong>: ${value ?? ""}
            </div>
        `;
    }

    html += `</div>`;

    return html;
}