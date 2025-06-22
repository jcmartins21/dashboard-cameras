// Initialize the map
let map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Fetch and display camera data
async function fetchCameraData() {
    try {
        const response = await fetch('/api/cameras/all');
        const data = await response.json();
        updateDashboard(data);
        updateMap(data);
        updateModelList();
    } catch (error) {
        console.error('Error fetching camera data:', error);
    }
}

// Update dashboard statistics
function updateDashboard(data) {
    const totalCameras = data.length;
    const totalStorage = data.reduce((sum, camera) => sum + camera.image_storage_gb, 0);
    const todayIncidents = data.reduce((sum, camera) => sum + camera.incidents_captured, 0);
    const activeCameras = data.filter(camera => camera.status === 'active').length;

    document.getElementById('total-cameras').textContent = totalCameras;
    document.getElementById('total-storage').textContent = `${totalStorage.toFixed(2)} GB`;
    document.getElementById('today-incidents').textContent = todayIncidents;
    document.getElementById('active-cameras').textContent = activeCameras;

    // Update storage chart
    updateStorageChart(data);
    // Update incidents chart
    updateIncidentsChart(data);
}

// Update map with camera locations
function updateMap(data) {
    // Clear existing markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Add new markers
    data.forEach(camera => {
        const marker = L.marker([camera.location_x, camera.location_y])
            .bindPopup(`
                <strong>${camera.model}</strong><br>
                Serial: ${camera.serial_number}<br>
                Status: ${camera.status}<br>
                Storage: ${camera.image_storage_gb.toFixed(2)} GB
            `);
        marker.addTo(map);
    });
}

// Update storage chart
function updateStorageChart(data) {
    // Agrupar armazenamento por modelo
    const storageByModel = {};
    data.forEach(camera => {
        if (!storageByModel[camera.model]) {
            storageByModel[camera.model] = 0;
        }
        storageByModel[camera.model] += camera.image_storage_gb;
    });
    const models = Object.keys(storageByModel);
    const values = Object.values(storageByModel);
    const storageData = [{
        x: models,
        y: values,
        type: 'bar',
        name: 'Armazenamento Total (GB)'
    }];
    const layout = {
        title: 'Armazenamento por Modelo',
        xaxis: { title: 'Modelo' },
        yaxis: { title: 'Armazenamento (GB)' }
    };
    Plotly.newPlot('storage-chart', storageData, layout);
}

// Update incidents chart
function updateIncidentsChart(data) {
    // Agrupar ocorrências por modelo
    const incidentsByModel = {};
    data.forEach(camera => {
        if (!incidentsByModel[camera.model]) {
            incidentsByModel[camera.model] = 0;
        }
        incidentsByModel[camera.model] += camera.incidents_captured;
    });
    const models = Object.keys(incidentsByModel);
    const values = Object.values(incidentsByModel);
    const incidentsData = [{
        x: models,
        y: values,
        type: 'bar',
        name: 'Ocorrências Totais'
    }];
    const layout = {
        title: 'Ocorrências por Modelo',
        xaxis: { title: 'Modelo' },
        yaxis: { title: 'Total de Ocorrências' }
    };
    Plotly.newPlot('incidents-chart', incidentsData, layout);
}

// Toggle model form visibility
function toggleModelForm() {
    const formContainer = document.getElementById('newModelFormContainer');
    if (formContainer.style.display === 'none') {
        formContainer.style.display = 'block';
        // Limpar o formulário quando abrir
        document.getElementById('newModelForm').reset();
    } else {
        formContainer.style.display = 'none';
    }
}

// Update model list in sidebar
async function updateModelList() {
    try {
        const response = await fetch('/api/models');
        const models = await response.json();
        const modelList = document.getElementById('modelList');
        // Exibir todos os modelos cadastrados
        modelList.innerHTML = models.map(model => `
            <li class="nav-item">
                <a class="nav-link text-white" href="/camera/${model.name}">
                    <i class='bx bxs-camera'></i>
                    ${model.name}
                </a>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

// Update model image preview
function updateModelImage() {
    const select = document.getElementById('cameraModel');
    const selectedOption = select.options[select.selectedIndex];
    const previewDiv = document.getElementById('modelImagePreview');
    const modelImage = document.getElementById('selectedModelImage');
    const modelDescription = document.getElementById('modelDescription');

    if (select.value) {
        const imagePath = selectedOption.getAttribute('data-image');
        const description = selectedOption.getAttribute('data-description');
        
        modelImage.src = `/static/images/models/${imagePath}`;
        modelDescription.textContent = description;
        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

// Submit new camera
async function submitNewCamera() {
    const form = document.getElementById('newCameraForm');
    const formData = {
        model: document.getElementById('cameraModel').value,
        serial_number: document.getElementById('serialNumber').value,
        installation_date: document.getElementById('installationDate').value,
        location_x: document.getElementById('locationX').value,
        location_y: document.getElementById('locationY').value,
        image_storage: document.getElementById('imageStorage').value,
        incidents_captured: document.getElementById('incidentsCaptured').value
    };

    try {
        const response = await fetch('/api/cameras', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('newCameraModal'));
            modal.hide();
            form.reset();
            fetchCameraData();
        } else {
            alert('Erro ao adicionar câmera');
        }
    } catch (error) {
        console.error('Error submitting camera:', error);
        alert('Erro ao adicionar câmera');
    }
}

// Submit new model
async function submitNewModel() {
    const form = document.getElementById('newModelForm');
    const formData = new FormData();
    // Dados do modelo
    formData.append('name', document.getElementById('modelName').value);
    formData.append('description', document.getElementById('modelDescription').value);
    formData.append('image', document.getElementById('modelImage').files[0]);
    // Dados da primeira câmera
    formData.append('serial_number', document.getElementById('serialNumber').value);
    formData.append('installation_date', document.getElementById('installationDate').value);
    formData.append('location_x', document.getElementById('locationX').value);
    formData.append('location_y', document.getElementById('locationY').value);
    formData.append('image_storage', document.getElementById('imageStorage').value);
    formData.append('incidents_captured', document.getElementById('incidentsCaptured').value);

    try {
        const response = await fetch('/api/models', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            // Limpar o formulário
            form.reset();
            // Esconder o formulário
            toggleModelForm();
            // Atualizar a lista de modelos e dashboard
            await updateModelList();
            await fetchCameraData();
            // Mostrar mensagem de sucesso
            alert('Modelo e primeira câmera adicionados com sucesso!');
        } else {
            const error = await response.json();
            alert(error.error || 'Erro ao adicionar modelo');
        }
    } catch (error) {
        console.error('Error submitting model:', error);
        alert('Erro ao adicionar modelo');
    }
}

// Toggle admin panel (área de administração)
function toggleAdminPanel() {
    let adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) {
        adminPanel = document.createElement('div');
        adminPanel.id = 'adminPanel';
        adminPanel.className = 'card mb-4';
        adminPanel.innerHTML = `
            <div class="card-header"><h5>Administração de Modelos e Câmeras</h5></div>
            <div class="card-body">
                <div id="adminContent">Carregando...</div>
            </div>
        `;
        document.querySelector('main').prepend(adminPanel);
        loadAdminContent();
    } else {
        if (adminPanel.style.display === 'none') {
            adminPanel.style.display = 'block';
            loadAdminContent();
        } else {
            adminPanel.style.display = 'none';
        }
    }
}

// Carregar conteúdo de administração
async function loadAdminContent() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = '<b>Modelos:</b><br><ul id="adminModelList"></ul><hr><b>Câmeras:</b><br><ul id="adminCameraList"></ul>';
    // Listar modelos
    const models = await fetch('/api/models').then(r => r.json());
    const modelList = document.getElementById('adminModelList');
    modelList.innerHTML = models.map(model => `
        <li>
            <b>${model.name}</b> - ${model.description}
            <button class='btn btn-sm btn-success' onclick='addCameraToModel("${model.name}")'>Adicionar Câmera</button>
            <button class='btn btn-sm btn-warning' onclick='editModel("${model.id}")'>Editar</button>
            <button class='btn btn-sm btn-danger' onclick='deleteModel("${model.id}")'>Excluir</button>
        </li>
    `).join('');
    // Listar câmeras
    const cameras = await fetch('/api/cameras/all').then(r => r.json());
    const cameraList = document.getElementById('adminCameraList');
    cameraList.innerHTML = cameras.map(cam => `
        <li>
            <b>${cam.model}</b> - Serial: ${cam.serial_number}
            <button class='btn btn-sm btn-info' onclick='feedCameraData(${cam.id})'>Alimentar Dados</button>
            <button class='btn btn-sm btn-warning' onclick='editCamera(${cam.id})'>Editar</button>
            <button class='btn btn-sm btn-danger' onclick='deleteCamera(${cam.id})'>Excluir</button>
        </li>
    `).join('');
}

// Funções de exclusão para administração
async function deleteModel(id) {
    if (confirm('Tem certeza que deseja excluir este modelo e todas as suas câmeras?')) {
        await fetch(`/api/models/${id}`, { method: 'DELETE' });
        await loadAdminContent();
        await updateModelList();
        await fetchCameraData();
    }
}
async function deleteCamera(id) {
    if (confirm('Tem certeza que deseja excluir esta câmera?')) {
        await fetch(`/api/cameras/${id}`, { method: 'DELETE' });
        await loadAdminContent();
        await fetchCameraData();
    }
}

// Alimentar dados de câmera (ocorrências/GB)
async function feedCameraData(cameraId) {
    const gb = prompt('Adicionar quantos GB de armazenamento? (deixe em branco para não alterar)');
    const ocorr = prompt('Adicionar quantas ocorrências? (deixe em branco para não alterar)');
    if (gb || ocorr) {
        await fetch(`/api/cameras/${cameraId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gb: gb || 0, ocorr: ocorr || 0 })
        });
        await loadAdminContent();
        await fetchCameraData();
    }
}

// Adicionar nova câmera a um modelo existente (abre modal)
function addCameraToModel(modelName) {
    document.getElementById('addCameraModelName').value = modelName;
    document.getElementById('addCameraForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addCameraModal'));
    modal.show();
}

// Submeter o formulário do modal para adicionar câmera
async function submitAddCamera() {
    const model = document.getElementById('addCameraModelName').value;
    const serial_number = document.getElementById('addSerialNumber').value;
    const installation_date = document.getElementById('addInstallationDate').value;
    const location_x = document.getElementById('addLocationX').value;
    const location_y = document.getElementById('addLocationY').value;
    const image_storage = document.getElementById('addImageStorage').value;
    const incidents_captured = document.getElementById('addIncidentsCaptured').value;
    if (model && serial_number && installation_date && location_x && location_y && image_storage && incidents_captured) {
        await fetch('/api/cameras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                serial_number,
                installation_date,
                location_x,
                location_y,
                image_storage,
                incidents_captured
            })
        });
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCameraModal'));
        modal.hide();
        await loadAdminContent();
        await fetchCameraData();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchCameraData();
    
    // Refresh data every 5 minutes
    setInterval(fetchCameraData, 300000);
}); 