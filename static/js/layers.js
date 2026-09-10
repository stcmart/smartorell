async function loadNetworks() {

    console.log("loadNetworks() iniciat");

    try {

        const response = await fetch("/api/networks");

        console.log("Resposta API:", response);

        if (!response.ok) {
            throw new Error("Error carregant les xarxes");
        }

        const data = await response.json();

        console.log("Dades API:", data);
        console.log("Xarxes:", data.networks);

        renderNetworks(data.networks);

    } catch (error) {

        console.error("Error carregant les xarxes:", error);

    }
}

function renderNetworks(networks) {

    console.log("renderNetworks()", networks);

    const container = document.getElementById("networks");

    console.log("Contenidor:", container);

    if (!container) {
        console.error("No existeix el contenidor #networks");
        return;
    }

    container.innerHTML = "";

    networks.forEach(network => {

        console.log("Renderitzant xarxa:", network);

        const networkSection = document.createElement("div");
        networkSection.className = "network";

        const networkHeader = document.createElement("button");
        networkHeader.className = "network-header";

        networkHeader.innerHTML = `
            <span>${formatName(network.name)}</span>
            <span class="arrow">⌄</span>
        `;

        const layerList = document.createElement("div");
        layerList.className = "network-layers collapsed";

        networkHeader.addEventListener("click", () => {

            layerList.classList.toggle("collapsed");
            networkHeader.classList.toggle("collapsed");

        });

        network.layers.forEach(layer => {

            console.log("Renderitzant layer:", layer);

            const layerItem = document.createElement("label");
            layerItem.className = "layer-item";

            layerItem.innerHTML = `
                <input
                    type="checkbox"
                    data-url="${layer.url}"
                >
                <span>${formatName(layer.name)}</span>
            `;

            layerList.appendChild(layerItem);

        });

        networkSection.appendChild(networkHeader);
        networkSection.appendChild(layerList);

        container.appendChild(networkSection);

    });
}


function formatName(name) {

    return name
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());

}

loadNetworks();