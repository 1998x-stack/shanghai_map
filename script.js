// Initialize map with Shanghai coordinates
const map = L.map('map').setView([31.2304, 121.4737], 12);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Add custom zoom controls
document.getElementById('zoom-in').addEventListener('click', () => {
    map.zoomIn();
    updateZoomLevel();
});

document.getElementById('zoom-out').addEventListener('click', () => {
    map.zoomOut();
    updateZoomLevel();
});

// Update zoom level display
function updateZoomLevel() {
    document.getElementById('zoom-level').textContent = map.getZoom();
}

// Add Shanghai marker with custom icon
const shanghaiIcon = L.divIcon({
    className: 'shanghai-marker',
    html: '●',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

L.marker([31.2304, 121.4737], {icon: shanghaiIcon})
    .addTo(map)
    .bindPopup('<b>Shanghai</b><br>Population: 26.32 million')
    .openPopup();

// Initial zoom level display
updateZoomLevel();
