const map = L.map("map", {
    zoomControl: false,
    minZoom: 13,
    maxZoom: 18,
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    dragRotate: true
}).setView(
    [41.4747, 1.9292],
    14
);

export { map };