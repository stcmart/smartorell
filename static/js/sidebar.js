import { map } from './map.js';

/* Sidebar toogle */
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

sidebarToggle.addEventListener("click", function() {

    sidebar.classList.toggle("hidden");
    this.classList.toggle("hidden");

    const icon = this.querySelector(".material-symbols-outlined");

    if (sidebar.classList.contains("hidden")) {
        icon.textContent = "arrow_forward_ios";
        this.title = "Mostrar menú";
    } else {
        icon.textContent = "arrow_back_ios";
        this.title = "Ocultar menú";
    }

    setTimeout(() => map.invalidateSize(), 350);

});

/* Account button */
const accountButton = document.getElementById("accountButton");

accountButton.addEventListener("click", () => {
    sidebar.classList.toggle("account-open");
    sidebar.classList.remove("layers-open");
});

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
    sidebar.classList.remove("account-open");
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