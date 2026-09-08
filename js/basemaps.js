
/* Basemaps available */ 
const icgcTopografic = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "topografic",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

const icgcTopograficGris = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "topografic-gris",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

const icgcEstandard = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "estandard",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

const icgcEstandardGris = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "estandard-gris",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

const icgcSimplificat = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "simplificat",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

const icgcOrtofoto = L.tileLayer.wms(
    "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?",
    {
        layers: "orto",
        format: "image/png",
        transparent: false,
        version: "1.3.0",
        attribution: "&copy; ICGC"
    }
);

/* Selecting default map */
icgcEstandard.addTo(map);

/* Change basemaps*/
document.querySelectorAll('input[name="basemap"]').forEach(radio => {
    radio.addEventListener("change", function(){
        if (!this.checked) {
            return;
        }

        /* Eliminar tots els basemaps */
        map.removeLayer(icgcTopografic);
        map.removeLayer(icgcTopograficGris);
        map.removeLayer(icgcEstandardGris);
        map.removeLayer(icgcSimplificat);
        map.removeLayer(icgcOrtofoto);

        /* Activar el seleccionat */
        switch (this.value) {
            case "icgcTopografic":
                icgcTopografic.addTo(map);
            break;

            case "icgcTopograficGris":
                icgcTopograficGris.addTo(map);
            break;

            case "icgcEstandardGris":
                icgcEstandardGris.addTo(map);
            break;

            case "icgcSimplificat":
                icgcSimplificat.addTo(map);
            break;

            case "icgcOrtofoto":
                icgcOrtofoto.addTo(map);
            break;
        }
    });
});