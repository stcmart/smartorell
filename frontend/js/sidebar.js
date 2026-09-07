/* Sidebar toogle */
const sidebar = document.getElementById("sidebar");

const sidebarToggle = document.getElementById("sidebarToggle");

sidebarToggle.addEventListener("click", function() {
  sidebar.classList.toggle("hidden");
  
  this.classList.toggle("hidden");
  if (sidebar.classList.contains("hidden")) {
    this.textContent = "›";
    this.title = "Mostrar menú";
  } else {
    this.textContent = "‹";
    this.title = "Ocultar menú";
  }
  setTimeout(() => map.invalidateSize(), 350);
  }
);

/* Layer button*/
const layerButton = document.getElementById("layerButton");

document.querySelectorAll(".section-content").forEach(section => {
    section.classList.add("collapsed");
});

document.querySelectorAll(".section-header").forEach(header => {
    header.classList.add("collapsed");
});

/* Toogle layer menú */
layerButton.addEventListener("click", function() {
    sidebar.classList.toggle("layers-open");
    this.classList.toggle("active");
});

/* Capes obertes */ 
document.querySelectorAll(".section-header").forEach(header => {

    header.addEventListener("click", function () {

        const sectionId = this.dataset.section;

        const section = document.getElementById(sectionId);

        if (!section) {
            console.error("No s'ha trobat:", sectionId);
            return;
        }

        section.classList.toggle("collapsed");

        this.classList.toggle("collapsed");

    });

});

/* Search button */
document.getElementById("searchButton").addEventListener("click", function() {
  const search = prompt("Introdueix una adreça o lloc:");
  if (!search) {
    return;
  }
  console.log("Cerca:", search);
});


/* Add temp senyalització */

fetch('./data/senyalitzacio.geojson')
    .then(response => response.json())
    .then(geojsonFeature => {
        const senyalitzacioLayer = L.geoJSON(geojsonFeature, {

            pointToLayer: function (feature, latlng) {

                const comentari = feature.properties.comentari;

                let color = 'gray';

                if (comentari === 'Tancament del gual inundable') {
                    color = 'red';
                } else if (comentari === 'Prohibició parking risc inundació') {
                    color = 'orange';
                } 
                
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: color,
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            }
            }).addTo(map);
    })
    .catch(error => {
        console.error('Error carregant el GeoJSON:', error);
    });

/* Enviament SMS */

document.getElementById("alertButton").addEventListener("click", () => {
    const numbers_alert = [
        "+345901020317654",
        "+345901020354121",
        "+345901020349954",
        "+345901020345062",
        "+345901020379297",
        "+345901020379425"
    ];

    window.location.href = `sms:${numbers_alert.join(",")}?body=ON`;
});

document.getElementById("forbiddenButton").addEventListener("click", () => {
    const numbers_forbidden = [
        "+345901020364235",
        "+345901020353409",
        "+345901020364235",
        "+345901020354249",
        "+345901020320295"
    ];

    window.location.href = `sms:${numbers_forbidden.join(",")}?body=ON`;
});