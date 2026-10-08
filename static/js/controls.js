const mapInfoControl = L.control({
    position: 'bottomleft'
});

mapInfoControl.onAdd = function (map) {

    const container = L.DomUtil.create(
        'div',
        'map-info-control'
    );


    // =========================
    // ESCALA LEAFLET
    // =========================

    const scaleControl = L.control.scale({
        metric: true,
        imperial: false,
        maxWidth: 100
    });

    // IMPORTANT:
    // Afegim realment el control al mapa perquè
    // Leaflet inicialitzi correctament _map i els seus events.
    scaleControl.addTo(map);

    // Recuperem el seu element HTML
    const scaleElement = scaleControl.getContainer();

    // El movem dins del nostre contenidor
    container.appendChild(scaleElement);


    // =========================
    // BOTÓ INFO
    // =========================

    const attributionInfo = L.DomUtil.create(
        'div',
        'map-attribution-info',
        container
    );

    const button = L.DomUtil.create(
        'button',
        'map-attribution-button',
        attributionInfo
    );

    button.type = 'button';

    button.title = 'Informació del mapa';

    button.setAttribute(
        'aria-label',
        'Informació del mapa'
    );

    button.innerHTML = `
        <span class="material-symbols-outlined">
            info
        </span>
    `;


    // =========================
    // PANEL ATRIBUCIÓ
    // =========================

    const panel = L.DomUtil.create(
        'div',
        'map-attribution-panel',
        attributionInfo
    );

    panel.innerHTML =
        map.attributionControl
            .getContainer()
            .innerHTML;


    // Evitar que els clics arribin al mapa
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);


    // Obrir / tancar informació
    L.DomEvent.on(
        button,
        'click',
        function () {

            attributionInfo.classList.toggle('open');

        }
    );


    return container;
};

function updateMapAttribution() {

    const panel = document.querySelector(
        '.map-attribution-panel'
    );

    if (!panel || !map.attributionControl) {
        return;
    }

    panel.innerHTML =
        map.attributionControl
            .getContainer()
            .innerHTML;
}

map.on('layeradd layerremove', function () {

    // Esperem que Leaflet actualitzi primer
    requestAnimationFrame(() => {
        updateMapAttribution();
    });

});

mapInfoControl.addTo(map);

/* CONTROLS */
const controls = document.getElementById("mapControls");
const mapControlsToggle = document.getElementById("mapControlsToggle");

mapControlsToggle.addEventListener("click", function () {

    mapControls.classList.toggle("collapsed");

    const icon = this.querySelector(".material-symbols-outlined");

    if (mapControls.classList.contains("collapsed")) {

        icon.textContent = "keyboard_arrow_up";
        this.title = "Mostrar controls";

    } else {

        icon.textContent = "keyboard_arrow_down";
        this.title = "Ocultar controls";

    }
});

const mapControl = L.control({
    position: "bottomright"
});

mapControl.onAdd = function(){
    return controls;
};

mapControl.addTo(map);

/* ZOOM IN */
document.getElementById("zoomInButton").addEventListener("click", function () {
    map.zoomIn();
});

/* ZOOM OUT */
document.getElementById("zoomOutButton").addEventListener("click", function () {
    map.zoomOut();
});

/* RESET ROTATE */ 
document.getElementById("rotateButton").addEventListener("click", function () {

    if (typeof map.setBearing === "function") {
        map.setBearing(0);
    }

});

/* FULLSCREEN */
document.getElementById("fullscreenButton").addEventListener("click", function () {

    if (!document.fullscreenElement) {
        document.getElementById("map").requestFullscreen();
    } else {
        document.exitFullscreen();
    }

});

/* LOCATION */
let LocateBuffer = null;
let LocateMarker = null;
let isLocating = false;
const locateButton = document.getElementById("locateButton");

locateButton.addEventListener("click", function() {

    if (isLocating) { 
        map.stopLocate(); 
        if (LocateMarker) { 
            map.removeLayer(LocateMarker); 
            LocateMarker = null; 
        } 
        if (LocateBuffer) { 
            map.removeLayer(LocateBuffer); 
            LocateBuffer = null; 
        } 
    
    locateButton.classList.remove("active"); 
    isLocating = false; 
    return;
    }
    
    isLocating = true; 
    locateButton.classList.add("active"); 
    
    map.locate({ 
        setView: true, 
        enableHighAccuracy: true, 
        minZoom: 13, 
        maxZoom: 18 
    });
});

map.on("locationfound", function(e) {

    if (LocateMarker) { 
        map.removeLayer(LocateMarker); 
    } 
    if (LocateBuffer) { 
        map.removeLayer(LocateBuffer); 
    }

    LocateMarker = L.circleMarker (e.latlng, 
        {
            radius: 6, 
            color: "#ffffff", 
            fillColor: "#318cff", 
            fillOpacity: 1, 
            weight: 3, 
            className: "location-pulse"
        })

    LocateBuffer = L.circle (e.latlng, e.accuracy/2, 
        {
        weight: 0,
        fillColor: "#136AEC",
        fillOpacity: 0.1,
        })
        
    map.addLayer(LocateMarker);
    map.addLayer(LocateBuffer);
});

map.on("locationerror", function(e){
    
    alert("No s'ha pogut obtenir la ubicació.");
});