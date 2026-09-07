/* ESCALE */
L.control.scale({
    imperial: false,
    metric: true
}).addTo(map);

/* CONTROLS */
const controls = document.getElementById("mapControls");

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