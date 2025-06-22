// Initialize the floor map
let floorMap = L.map('floor-map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(floorMap);

// Get model from URL
const model = window.location.pathname.split('/').pop();

// Fetch and display camera model data
async function fetchModelData() {
    try {
        const response = await fetch(`/api/cameras/${model}`);
        const data = await response.json();
        updateModelInfo(data);
        updateFloorMap(data);
        updateCharts(data);
    } catch (error) {
        console.error('Error fetching model data:', error);
    }
}

// Update model information
function updateModelInfo(data) {
    const modelInfo = document.getElementById('model-info');
    const totalInstalled = data.length;
    const totalStorage = data.reduce((sum, camera) => sum + camera.image_storage_gb, 0);
    const totalIncidents = data.reduce((sum, camera) => sum + camera.incidents_captured, 0);

    modelInfo.innerHTML = `
        <div class="mb-3">
            <h6>Total Instalado</h6>
            <p class="h4">${totalInstalled}</p>
        </div>
        <div class="mb-3">
            <h6>Armazenamento Total</h6>
            <p class="h4">${totalStorage.toFixed(2)} GB</p>
        </div>
        <div class="mb-3">
            <h6>Total de Ocorrências</h6>
            <p class="h4">${totalIncidents}</p>
        </div>
    `;
}

// Update floor map with camera locations
function updateFloorMap(data) {
    // Clear existing markers
    floorMap.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            floorMap.removeLayer(layer);
        }
    });

    // Add new markers
    data.forEach(camera => {
        const marker = L.marker([camera.location_x, camera.location_y])
            .bindPopup(`
                <strong>Serial: ${camera.serial_number}</strong><br>
                Instalação: ${new Date(camera.installation_date).toLocaleDateString()}<br>
                Status: ${camera.status}<br>
                Storage: ${camera.image_storage_gb.toFixed(2)} GB<br>
                Ocorrências: ${camera.incidents_captured}
            `)
            .on('click', () => showCameraDetails(camera));
        marker.addTo(floorMap);
    });
}

// Update charts
function updateCharts(data) {
    // Incidents chart
    const incidentsData = [{
        x: data.map(camera => camera.serial_number),
        y: data.map(camera => camera.incidents_captured),
        type: 'bar',
        name: 'Ocorrências'
    }];

    const incidentsLayout = {
        title: 'Ocorrências por Câmera',
        xaxis: { title: 'Número de Série' },
        yaxis: { title: 'Número de Ocorrências' }
    };

    Plotly.newPlot('incidents-chart', incidentsData, incidentsLayout);

    // Storage chart
    const storageData = [{
        x: data.map(camera => camera.serial_number),
        y: data.map(camera => camera.image_storage_gb),
        type: 'bar',
        name: 'Armazenamento'
    }];

    const storageLayout = {
        title: 'Armazenamento por Câmera',
        xaxis: { title: 'Número de Série' },
        yaxis: { title: 'Armazenamento (GB)' }
    };

    Plotly.newPlot('storage-chart', storageData, storageLayout);
}

// Show camera details in modal
function showCameraDetails(camera) {
    const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const details = document.getElementById('camera-details');
    
    details.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Número de Série:</strong> ${camera.serial_number}</p>
                <p><strong>Data de Instalação:</strong> ${new Date(camera.installation_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${camera.status}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Armazenamento:</strong> ${camera.image_storage_gb.toFixed(2)} GB</p>
                <p><strong>Ocorrências:</strong> ${camera.incidents_captured}</p>
                <p><strong>Localização:</strong> X: ${camera.location_x}, Y: ${camera.location_y}</p>
            </div>
        </div>
    `;
    
    modal.show();
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchModelData();
    
    // Refresh data every 5 minutes
    setInterval(fetchModelData, 300000);
}); 