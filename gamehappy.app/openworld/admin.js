// Admin Dashboard - Hierarchical Navigation
const API_URL = '/openworld/api/admin.php';

// Navigation state
let navState = {
    world_id: null,
    world_name: null,
    place_id: null,
    place_name: null,
    object_id: null,
    object_name: null
};

// Data cache
let worlds = [];
let places = [];
let objects = [];
let quests = [];
let currentObjectMechanics = [];
let currentPlaceExits = [];

// ===== AUTHENTICATION =====
window.addEventListener('load', () => {
    checkAuth();
});

async function checkAuth() {
    try {
        const response = await fetch('/openworld/api/auth.php?action=checkAuth');
        const data = await response.json();
        
        if (data.authenticated) {
            document.getElementById('login-screen').classList.remove('visible');
            document.getElementById('dashboard').style.display = 'block';
            // Ensure database schema is ready for connection types, coordinates, placed flag, and quests
            ensureConnectionTypeColumn();
            ensureCoordinateColumns();
            ensurePlacedColumn();
            ensureQuestTables();
            loadWorlds();
        } else {
            document.getElementById('login-screen').classList.add('visible');
            document.getElementById('dashboard').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        document.getElementById('login-screen').classList.add('visible');
    }
}

async function performLogin() {
    console.log('[performLogin] Called');
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        console.log('[performLogin] Attempting login with username:', username);
        const response = await fetch('/openworld/api/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });

        const data = await response.json();
        console.log('[performLogin] Response:', data);
        if (data.success) {
            console.log('[performLogin] Login successful, loading dashboard');
            document.getElementById('login-screen').classList.remove('visible');
            document.getElementById('dashboard').style.display = 'block';
            loadWorlds();
        } else {
            console.error('[performLogin] Login failed:', data.message);
            alert('Login failed: ' + data.message);
        }
    } catch (error) {
        console.error('[performLogin] Exception:', error);
        alert('Login error: ' + error.message);
    }
}

function logout() {
    fetch('/openworld/api/auth.php?action=logout').then(() => {
        document.getElementById('login-screen').classList.add('visible');
        document.getElementById('dashboard').style.display = 'none';
    });
}

// ===== NAVIGATION FUNCTIONS =====
function navigateToWorlds() {
    navState = { world_id: null, world_name: null, place_id: null, place_name: null, object_id: null, object_name: null };
    updateBreadcrumb();
    showView('view-worlds');
    loadWorlds();
}

function navigateToPlaces(worldId, worldName) {
    navState.world_id = worldId;
    navState.world_name = worldName;
    navState.place_id = null;
    navState.place_name = null;
    navState.object_id = null;
    navState.object_name = null;
    updateBreadcrumb();
    showView('view-places');
    loadPlacesForWorld(worldId);
}

async function navigateToQuests(worldId, worldName) {
    navState.world_id = worldId;
    navState.world_name = worldName;
    updateBreadcrumb();
    showView('view-quests');
    document.getElementById('quest-details-section').style.display = 'none';
    await loadPlacesForWorld(worldId);
    await loadObjectsForWorld(worldId);
    await loadQuests();
    renderQuestsPageList();
}

async function goBackToQuestsList() {
    document.getElementById('quest-details-section').style.display = 'none';
    await loadQuests();
    renderQuestsPageList();
}

function navigateToObjects(placeId, placeName) {
    navState.place_id = placeId;
    navState.place_name = placeName;
    navState.object_id = null;
    navState.object_name = null;
    updateBreadcrumb();
    showView('view-objects');
    currentPlaceId = placeId;
    loadObjectsForPlace(placeId);
    loadPlaceQuestTasks(placeId);
}

function navigateToObjectDetails(objectId, objectName) {
    navState.object_id = objectId;
    navState.object_name = objectName;
    updateBreadcrumb();
    showView('view-object-details');
    loadObjectDetails(objectId);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    let html = '<a href="#" onclick="navigateToWorlds(); return false;" class="breadcrumb-item">Worlds</a>';
    
    if (navState.world_id) {
        html += ` / <a href="#" onclick="navigateToPlaces(${navState.world_id}, '${escapeHtml(navState.world_name)}'); return false;" class="breadcrumb-item">${escapeHtml(navState.world_name)}</a>`;
    }
    
    if (navState.place_id) {
        html += ` / <a href="#" onclick="navigateToObjects(${navState.place_id}, '${escapeHtml(navState.place_name)}'); return false;" class="breadcrumb-item">${escapeHtml(navState.place_name)}</a>`;
    }
    
    if (navState.object_id) {
        html += ` / <span class="breadcrumb-item active">${escapeHtml(navState.object_name)}</span>`;
    }
    
    breadcrumb.innerHTML = html;
}

// ===== WORLDS =====
async function loadWorlds() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_worlds' })
        });

        const data = await response.json();
        if (data.success) {
            worlds = data.worlds;
            renderWorldsList();
        }
    } catch (error) {
        showMessage('Error loading worlds', 'error', 'world-message');
    }
}

async function createWorld(e) {
    e.preventDefault();
    const name = document.getElementById('world-name').value;
    const description = document.getElementById('world-desc').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_world',
                name: name,
                description: description
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('World created!', 'success', 'world-message');
            document.getElementById('world-form').reset();
            loadWorlds();
            closeModal('modal-create-world');
        } else {
            showMessage('Error: ' + data.message, 'error', 'world-message');
        }
    } catch (error) {
        showMessage('Error creating world', 'error', 'world-message');
    }
}

function renderWorldsList() {
    const container = document.getElementById('worlds-list');
    if (worlds.length === 0) {
        container.innerHTML = '<p class="empty-state">No worlds yet. Create one to get started!</p>';
        return;
    }

    container.innerHTML = worlds.map(world => `
        <div class="list-item">
            <div class="list-item-content clickable" onclick="navigateToPlaces(${world.id}, '${escapeHtml(world.name).replace(/'/g, "\\'")}')" style="cursor: pointer; flex: 1;">
                <div class="list-item-title">${escapeHtml(world.name)}</div>
                <div class="list-item-desc">${escapeHtml(world.description || '(no description)')}</div>
            </div>
            <button class="btn-small" onclick="navigateToQuests(${world.id}, '${escapeHtml(world.name).replace(/'/g, "\\'")}')" style="margin-left: 10px;">Quests</button>
            <button class="btn-small btn-danger" onclick="deleteWorldConfirm(${world.id}, '${escapeHtml(world.name).replace(/'/g, "\\'")}')" style="margin-left: 5px;">Delete</button>
        </div>
    `).join('');
}

function setCurrentWorldAndShowQuests(worldId, worldName) {
    // Kept for backward compatibility, redirects to new quests page
    navigateToQuests(worldId, worldName);
}

async function deleteWorldConfirm(worldId, worldName) {
    if (!confirm(`Are you sure you want to delete "${worldName}" and all its contents (places, objects, quests, tasks)? This cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_world',
                world_id: worldId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[deleteWorldConfirm] World deleted:', worldId);
            await loadWorlds();
            renderWorldsList();
            showMessage('World deleted successfully', 'success', 'world-message');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('[deleteWorldConfirm] Error:', error);
        alert('Error deleting world');
    }
}

// ===== PLACES =====
async function loadPlacesForWorld(worldId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_places',
                world_id: worldId
            })
        });

        const data = await response.json();
        if (data.success) {
            places = data.places;
            renderPlacesList();
        }
    } catch (error) {
        showMessage('Error loading places', 'error', 'place-message');
    }
}

async function loadObjectsForWorld(worldId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_all_objects',
                world_id: worldId
            })
        });

        const data = await response.json();
        if (data.success) {
            objects = data.objects || [];
        }
    } catch (error) {
        console.error('Error loading objects for world:', error);
    }
}

async function createPlace(e) {
    e.preventDefault();
    if (!navState.world_id) {
        showMessage('Select a world first', 'error', 'place-message');
        return;
    }

    const name = document.getElementById('place-name').value;
    const description = document.getElementById('place-desc').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_place',
                world_id: navState.world_id,
                name: name,
                description: description
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Place created!', 'success', 'place-message');
            document.getElementById('place-form').reset();
            loadPlacesForWorld(navState.world_id);
            closeModal('modal-create-place');
        } else {
            showMessage('Error: ' + data.message, 'error', 'place-message');
        }
    } catch (error) {
        showMessage('Error creating place', 'error', 'place-message');
    }
}

async function deletePlace(placeId, placeName) {
    if (!confirm(`Are you sure you want to delete "${placeName}"? This will also remove all exits and connections.`)) {
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_place',
                place_id: placeId
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Place deleted!', 'success', 'place-message');
            loadPlacesForWorld(navState.world_id);
        } else {
            showMessage('Error: ' + data.message, 'error', 'place-message');
        }
    } catch (error) {
        showMessage('Error deleting place', 'error', 'place-message');
    }
}

async function linkPlaces(e) {
    e.preventDefault();
    if (!navState.place_id) {
        showMessage('Select a place first', 'error', 'exit-message');
        return;
    }

    const direction = document.getElementById('exit-direction').value;
    const destination = document.getElementById('exit-destination').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'link_places',
                from_place_id: navState.place_id,
                to_place_id: destination,
                direction: direction
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Exit added!', 'success', 'exit-message');
            document.getElementById('exit-form').reset();
            loadExitsForPlace(navState.place_id);
        } else {
            showMessage('Error: ' + data.message, 'error', 'exit-message');
        }
    } catch (error) {
        showMessage('Error creating exit', 'error', 'exit-message');
    }
}

function renderPlacesList() {
    const container = document.getElementById('places-list');
    if (places.length === 0) {
        container.innerHTML = '<p class="empty-state">No places yet. Create one to get started!</p>';
        return;
    }

    container.innerHTML = places.map(place => `
        <div class="list-item">
            <div class="list-item-content" onclick="navigateToObjects(${place.id}, '${escapeHtml(place.name).replace(/'/g, "\\'")}')" style="cursor: pointer; flex: 1;">
                <div class="list-item-title">${escapeHtml(place.name)}</div>
                <div class="list-item-desc">${escapeHtml(place.description || '(no description)')}</div>
            </div>
            <button class="btn-secondary" onclick="showPlaceDetailsView(${place.id})" style="white-space: nowrap;">
                Settings
            </button>
            <button class="btn-secondary" onclick="openManageExitsModal(${place.id}, '${escapeHtml(place.name).replace(/'/g, "\\'")}')" style="white-space: nowrap;">
                Manage Exits
            </button>
            <button class="btn-danger" onclick="deletePlace(${place.id}, '${escapeHtml(place.name).replace(/'/g, "\\'")}')" style="white-space: nowrap; margin-left: 5px;">
                Delete
            </button>
        </div>
    `).join('');
}

// ===== OBJECTS =====
async function loadObjectsForPlace(placeId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_objects',
                place_id: placeId
            })
        });

        const data = await response.json();
        if (data.success) {
            objects = data.objects;
            renderObjectsList();
        }
    } catch (error) {
        showMessage('Error loading objects', 'error', 'object-message');
    }
}

async function createObject(e) {
    e.preventDefault();
    if (!navState.place_id) {
        showMessage('Select a place first', 'error', 'object-message');
        return;
    }

    const name = document.getElementById('object-name').value;
    const description = document.getElementById('object-desc').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_object',
                place_id: navState.place_id,
                name: name,
                description: description
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Object created!', 'success', 'object-message');
            document.getElementById('object-form').reset();
            loadObjectsForPlace(navState.place_id);
            closeModal('modal-create-object');
        } else {
            showMessage('Error: ' + data.message, 'error', 'object-message');
        }
    } catch (error) {
        showMessage('Error creating object', 'error', 'object-message');
    }
}

function renderObjectsList() {
    const container = document.getElementById('objects-list');
    if (objects.length === 0) {
        container.innerHTML = '<p class="empty-state">No objects yet. Create one to get started!</p>';
        return;
    }

    container.innerHTML = objects.map(obj => `
        <div class="list-item clickable" onclick="navigateToObjectDetails(${obj.id}, '${escapeHtml(obj.name).replace(/'/g, "\\'")}')" style="cursor: pointer;">
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(obj.name)}</div>
                <div class="list-item-desc">${escapeHtml(obj.description || '(no description)')}</div>
            </div>
        </div>
    `).join('');
}

// ===== OBJECT DETAILS =====
async function loadObjectDetails(objectId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_object_mechanics',
                object_id: objectId
            })
        });

        const data = await response.json();
        if (data.success) {
            renderObjectDetails(data.object, data.mechanics);
        }
    } catch (error) {
        showMessage('Error loading object details', 'error', 'mechanic-message');
    }
}

function renderObjectDetails(object, mechanics) {
    currentObjectMechanics = mechanics;
    
    const detailsDiv = document.getElementById('object-details-content');
    detailsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="color: #64b5f6; font-weight: bold; margin-bottom: 8px;">${escapeHtml(object.name)}</div>
            <div style="color: #b0bec5;">${escapeHtml(object.description || '(no description)')}</div>
        </div>
    `;

    const mechanicsList = document.getElementById('mechanics-list');
    if (mechanics.length === 0) {
        mechanicsList.innerHTML = '<p class="empty-state">No mechanics yet. Add one above!</p>';
    } else {
        mechanicsList.innerHTML = mechanics.map(m => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${escapeHtml(m.name)}</div>
                    <div style="color: #ffd700; font-size: 12px; margin-bottom: 5px;">Type: ${m.type}</div>
                    <div class="list-item-desc">${escapeHtml(m.description || '(no description)')}</div>
                    ${m.action_value ? `<div style="color: #81c784; font-size: 11px; margin-top: 8px; font-family: monospace; background: #0f1419; padding: 8px; border-radius: 3px; word-break: break-all;">Config: ${escapeHtml(typeof m.action_value === 'string' ? m.action_value : JSON.stringify(m.action_value))}</div>` : ''}
                </div>
                <button class="btn-secondary" onclick="deleteMechanic(${m.id})" style="background: #b71c1c; border-color: #ff5252; color: #ff5252;">Delete</button>
            </div>
        `).join('');
    }
}

// ===== MECHANICS =====
function showMechanicSettings() {
    const type = document.getElementById('mechanic-type').value;
    const settingsContainer = document.getElementById('mechanic-settings');
    
    if (!type) {
        settingsContainer.style.display = 'none';
        return;
    }
    
    document.querySelectorAll('[id^="mechanic-"][id$="-settings"]').forEach(el => {
        el.style.display = 'none';
    });
    
    const typeSettingsId = `mechanic-${type}-settings`;
    const typeSettingsEl = document.getElementById(typeSettingsId);
    if (typeSettingsEl) {
        typeSettingsEl.style.display = 'block';
        settingsContainer.style.display = 'block';
    } else {
        settingsContainer.style.display = 'none';
    }
}

async function addMechanic(e) {
    e.preventDefault();
    if (!navState.object_id) {
        showMessage('Select an object first', 'error', 'mechanic-message');
        return;
    }

    const type = document.getElementById('mechanic-type').value;
    const name = document.getElementById('mechanic-name').value;
    const description = document.getElementById('mechanic-desc').value;

    let actionValue = {};

    switch(type) {
        case 'open':
            actionValue = { state: document.getElementById('mechanic-open-state')?.value || 'open' };
            break;
        case 'examine':
            actionValue = { description: document.getElementById('mechanic-examine-desc')?.value || '' };
            break;
        case 'take':
            actionValue = { item: document.getElementById('mechanic-item-name')?.value || 'item' };
            break;
        case 'use':
            actionValue = { effect: document.getElementById('mechanic-use-effect')?.value || '' };
            break;
        case 'purchase':
            const priceInput = document.getElementById('mechanic-purchase-price');
            actionValue = { gold_price: parseInt(priceInput?.value || '0') || 0 };
            break;
        case 'teleport':
            actionValue = { destination: document.getElementById('mechanic-teleport-dest')?.value || '' };
            break;
        case 'create_area':
            actionValue = { area_name: document.getElementById('mechanic-create_area-name')?.value || 'New Area' };
            break;
        case 'trigger':
            actionValue = { event_name: document.getElementById('mechanic-trigger-event')?.value || 'trigger' };
            break;
        default:
            actionValue = {};
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_mechanic',
                object_id: navState.object_id,
                type: type,
                name: name,
                description: description,
                action_value: JSON.stringify(actionValue)
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Mechanic added!', 'success', 'mechanic-message');
            document.getElementById('mechanic-form').reset();
            loadObjectDetails(navState.object_id);
            closeModal('modal-add-mechanic');
        } else {
            showMessage('Error: ' + data.message, 'error', 'mechanic-message');
        }
    } catch (error) {
        showMessage('Error adding mechanic', 'error', 'mechanic-message');
    }
}

async function deleteMechanic(mechanicId) {
    if (!confirm('Delete this mechanic?')) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_mechanic',
                mechanic_id: mechanicId
            })
        });

        const data = await response.json();
        if (data.success) {
            showMessage('Mechanic deleted', 'success', 'mechanic-message');
            loadObjectDetails(navState.object_id);
        } else {
            showMessage('Error: ' + data.message, 'error', 'mechanic-message');
        }
    } catch (error) {
        showMessage('Error deleting mechanic', 'error', 'mechanic-message');
    }
}

// ===== EXIT MANAGEMENT =====
async function openManageExitsModal(placeId, placeName) {
    navState.place_id = placeId;
    navState.place_name = placeName;
    document.getElementById('exits-place-name').textContent = placeName;
    showExitsView();
    await loadExitsForPlace(placeId);
    openModal('modal-manage-exits');
}

function showExitsView() {
    document.getElementById('exits-view').style.display = 'block';
    document.getElementById('select-destination-overlay').style.display = 'none';
    document.getElementById('exit-message').textContent = '';
}

async function showDestinationView(direction) {
    // Refresh places to get latest coordinates
    await loadPlacesForWorld(navState.world_id);
    
    document.getElementById('select-destination-overlay').style.display = 'block';
    document.getElementById('selected-direction-name').textContent = direction.charAt(0).toUpperCase() + direction.slice(1);
    renderDestinationList(direction);
}

function closeDestinationSelector() {
    showExitsView();
}

async function navigateExitsMap(placeId, direction) {
    // Navigate to a different place within the exits modal with fade animation
    const container = document.getElementById('direction-buttons');
    
    // Fade out
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease-out';
    
    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Update place info
    navState.place_id = placeId;
    const place = places.find(p => p.id === placeId);
    if (place) {
        navState.place_name = place.name;
    }
    document.getElementById('exits-place-name').textContent = navState.place_name;
    
    // Load exits for new place
    await loadExitsForPlace(placeId);
    
    // Fade in
    container.style.transition = 'opacity 0.4s ease-in';
    container.style.opacity = '1';
    
    showExitsView();
}


async function loadExitsForPlace(placeId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_exits',
                place_id: placeId
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Loaded exits for place', placeId, ':', data.exits);
            renderDirectionButtons(data.exits);
        } else {
            renderDirectionButtons([]);
        }
    } catch (error) {
        console.error('Error loading exits:', error);
        renderDirectionButtons([]);
    }
}

function renderDirectionButtons(existingExits) {
    // Store exits globally for use in destination list filtering
    currentPlaceExits = existingExits;
    
    const cardinalDirections = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
    const verticalDirections = ['up', 'down'];
    const allDirections = [...cardinalDirections, ...verticalDirections];
    const existingDirections = new Set(existingExits.map(e => e.direction.toLowerCase()));
    
    const container = document.getElementById('direction-buttons');
    container.setAttribute('data-place-name', navState.place_name);
    
    const directionIcons = {
        'north': '↑',
        'south': '↓',
        'east': '→',
        'west': '←',
        'northeast': '↗',
        'northwest': '↖',
        'southeast': '↘',
        'southwest': '↙',
        'up': '⬆',
        'down': '⬇'
    };
    
    const connectionTypeLabels = {
        'full': 'Full',
        'passage': 'Passage',
        'closed': 'Closed',
        'locked': 'Locked',
        'no_throughway': 'No Path'
    };
    
    const connectionTypeColors = {
        'full': '#00ff00',
        'passage': '#00ccff',
        'closed': '#ffaa00',
        'locked': '#ff4444',
        'no_throughway': '#888888'
    };
    
    // Render cardinal directions in grid
    const gridHTML = cardinalDirections.map(dir => {
        const exists = existingDirections.has(dir);
        const exit = existingExits.find(e => e.direction.toLowerCase() === dir);
        const icon = directionIcons[dir];
        const connType = exit?.connection_type || 'full';
        
        if (exists) {
            return `
                <div class="direction-button ${dir} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${dir}')" style="cursor: pointer; position: relative;">
                    <div class="exit-content">
                        <div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                        <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button>
                    </div>
                    <div class="connection-type-badge connection-badge-${dir}" 
                         style="background-color: ${connectionTypeColors[connType]}"
                         title="${connectionTypeLabels[connType]}"
                         onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">
                        ${connectionTypeLabels[connType].charAt(0)}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="direction-button ${dir}">
                    <button type="button" class="btn-add" onclick="showDestinationView('${dir}')">
                        ${icon}
                        <span class="arrow-label">${dir.charAt(0).toUpperCase() + dir.slice(1)}</span>
                    </button>
                </div>
            `;
        }
    }).join('');
    
    // Build vertical bars HTML (for right side)
    const renderVerticalBar = (dir) => {
        const exists = existingDirections.has(dir);
        const exit = existingExits.find(e => e.direction.toLowerCase() === dir);
        const icon = directionIcons[dir];
        const connType = exit?.connection_type || 'full';
        const dirLabel = dir === 'up' ? 'Up' : 'Down';
        
        if (exists) {
            return `<div class="vertical-bar ${dir}" onclick="navigateExitsMap(${exit.to_place_id}, '${dir}')" style="cursor: pointer;">
                <div class="exit-content">
                    <div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                    <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button>
                </div>
                <div class="connection-type-badge connection-badge-${dir}" 
                     style="background-color: ${connectionTypeColors[connType]}"
                     title="${connectionTypeLabels[connType]}"
                     onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">
                    ${connectionTypeLabels[connType].charAt(0)}
                </div>
            </div>`;
        } else {
            return `<div class="vertical-bar ${dir}">
                <button type="button" class="btn-add" onclick="showDestinationView('${dir}')">
                    ${icon} ${dirLabel}
                </button>
            </div>`;
        }
    };
    
    const upBar = renderVerticalBar('up');
    const downBar = renderVerticalBar('down');
    
    // Build center tile without vertical bars
    const centerTile = `<div class="center-tile">
        <span class="place-name">${escapeHtml(navState.place_name)}</span>
    </div>`;
    
    // Inject the cardinal directions and center tile
    let gridHtml = '';
    const cardinalDirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    
    // Reconstruct HTML with proper grid positioning
    // North row
    gridHtml += cardinalDirs.filter(d => d === 'northwest').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    gridHtml += cardinalDirs.filter(d => d === 'north').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    gridHtml += cardinalDirs.filter(d => d === 'northeast').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    // Middle row
    gridHtml += cardinalDirs.filter(d => d === 'west').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    gridHtml += centerTile;
    
    gridHtml += cardinalDirs.filter(d => d === 'east').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    // Bottom row
    gridHtml += cardinalDirs.filter(d => d === 'southwest').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    gridHtml += cardinalDirs.filter(d => d === 'south').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    gridHtml += cardinalDirs.filter(d => d === 'southeast').map(d => {
        const exists = existingDirections.has(d);
        const exit = existingExits.find(e => e.direction.toLowerCase() === d);
        const icon = directionIcons[d];
        const connType = exit?.connection_type || 'full';
        if (exists) {
            return `<div class="direction-button ${d} has-exit" onclick="navigateExitsMap(${exit.to_place_id}, '${d}')" style="cursor: pointer; position: relative;">
                <div class="exit-content"><div class="exit-destination">${escapeHtml(exit.destination_name || 'Unknown')}</div>
                <button type="button" class="btn-remove" onclick="deleteExit(${exit.id}); event.stopPropagation();">Remove</button></div>
                <div class="connection-type-badge connection-badge-${d}" style="background-color: ${connectionTypeColors[connType]}" title="${connectionTypeLabels[connType]}" onclick="showConnectionTypeModal(${exit.id}, '${connType}'); event.stopPropagation();">${connectionTypeLabels[connType].charAt(0)}</div></div>`;
        } else {
            return `<div class="direction-button ${d}"><button type="button" class="btn-add" onclick="showDestinationView('${d}')"><span>${icon}</span><span class="arrow-label">${d.charAt(0).toUpperCase() + d.slice(1)}</span></button></div>`;
        }
    }).join('');
    
    // Assemble final HTML with compass grid and vertical bars underneath
    let html = `<div class="compass-grid">${gridHtml}</div>`;
    html += `<div class="vertical-bars-container">${upBar}${downBar}</div>`;
    
    container.innerHTML = html;
}

function renderDestinationList(direction) {
    const container = document.getElementById('destination-list');
    
    if (places.length === 0) {
        container.innerHTML = '<p class="empty-state">No places available</p>';
        return;
    }

    // Filter out:
    // 1. The current place
    // 2. Places that are destinations of current place's exits
    // 3. Places that are already placed (placed = true)
    const assignedPlaceIds = new Set(currentPlaceExits.map(e => e.to_place_id));
    
    console.log("[renderDestinationList] Starting filter. Total places:", places.length);
    console.log("[renderDestinationList] Current place ID:", navState.place_id);
    console.log("[renderDestinationList] Assigned place IDs:", Array.from(assignedPlaceIds));
    
    const availablePlaces = places.filter(p => {
        const isSelfPlace = p.id === navState.place_id;
        const isAssigned = assignedPlaceIds.has(p.id);
        const isPlaced = p.placed;
        
        console.log(`[renderDestinationList] Place ID ${p.id} (${p.name}): placed=${p.placed}, assigned=${isAssigned}, self=${isSelfPlace}`);
        
        return !isSelfPlace && !isAssigned && !isPlaced;
    });
    
    console.log("[renderDestinationList] Available places after filter:", availablePlaces.length);
    
    if (availablePlaces.length === 0) {
        container.innerHTML = '<p class="empty-state">No other places available</p>';
        return;
    }

    container.innerHTML = availablePlaces.map(place => {
        return `
        <div class="list-item clickable" onclick="createExitLink('${direction}', ${place.id})" style="cursor: pointer;">
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(place.name)}</div>
                <div class="list-item-desc">${escapeHtml(place.description || '(no description)')}</div>
            </div>
        </div>
    `}).join('');
}

async function createExitLink(direction, toPlaceId) {
    // Map opposite directions (including diagonals and vertical)
    const oppositeDirections = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east',
        'northeast': 'southwest',
        'southwest': 'northeast',
        'northwest': 'southeast',
        'southeast': 'northwest',
        'up': 'down',
        'down': 'up'
    };
    
    console.log("[createExitLink] Creating exit from place", navState.place_id, "to place", toPlaceId, "direction", direction);
    
    try {
        // Create the forward exit
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'link_places',
                from_place_id: navState.place_id,
                to_place_id: toPlaceId,
                direction: direction
            })
        });

        console.log("[createExitLink] Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("[createExitLink] HTTP Error:", response.status, errorText);
            showMessage(`Error creating exit: HTTP ${response.status}`, 'error', 'exit-message');
            return;
        }

        const data = await response.json();
        console.log("[createExitLink] Response data:", data);
        
        if (data.success) {
            // Check if this was an auto-stacking operation
            if (data.auto_stacked) {
                showMessage('Places stacked vertically! Up/down connections created automatically.', 'success', 'exit-message');
                await loadExitsForPlace(navState.place_id);
                showExitsView();
                return;
            }
            
            // Create the reverse exit in the destination place
            const oppositeDirection = oppositeDirections[direction];
            const reverseResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'link_places',
                    from_place_id: toPlaceId,
                    to_place_id: navState.place_id,
                    direction: oppositeDirection
                })
            });
            
            const reverseData = await reverseResponse.json();
            if (reverseData.success) {
                showMessage('Exit created with automatic reverse!', 'success', 'exit-message');
            } else {
                showMessage('Exit created but automatic reverse failed', 'warning', 'exit-message');
            }
            
            // Smart spatial synchronization for adjacent places
            // Check all 8 possible directions from the new place and auto-assign any that exist
            const allDirections = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
            const oppositeMap = {
                'north': 'south',
                'south': 'north',
                'east': 'west',
                'west': 'east',
                'northeast': 'southwest',
                'southwest': 'northeast',
                'northwest': 'southeast',
                'southeast': 'northwest'
            };
            
            for (const checkDir of allDirections) {
                // For each direction FROM the new place, find if a place exists in that calculated position
                for (const exit of currentPlaceExits) {
                    const calculatedDirection = calculateRelativeDirection(direction, exit.direction);
                    if (calculatedDirection === checkDir) {
                        try {
                            // Create exit FROM the adjacent place TO the new place in the calculated direction
                            // (not the other way around)
                            await fetch(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'link_places',
                                    from_place_id: exit.to_place_id,
                                    to_place_id: toPlaceId,
                                    direction: checkDir
                                })
                            });
                            
                            // Also create the reverse exit (FROM new place TO adjacent place)
                            const reverseDir = oppositeMap[checkDir];
                            await fetch(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'link_places',
                                    from_place_id: toPlaceId,
                                    to_place_id: exit.to_place_id,
                                    direction: reverseDir
                                })
                            });
                        } catch (error) {
                            console.error('Spatial sync failed:', error);
                        }
                        break; // Found the place for this direction, move to next
                    }
                }
            }
            
            await loadExitsForPlace(navState.place_id);
            showExitsView();
        } else {
            console.error("[createExitLink] API returned error:", data.message);
            showMessage('Error: ' + data.message, 'error', 'exit-message');
        }
    } catch (error) {
        console.error("[createExitLink] Exception caught:", error);
        showMessage('Error creating exit: ' + error.message, 'error', 'exit-message');
    }
}

function calculateRelativeDirection(fromDirection, toDirection) {
    // Calculate where place X is relative to place B if:
    // B is fromDirection from A, and X is toDirection from A
    // Returns the direction from B to X
    
    // Direction vectors
    const directionMap = {
        'north': { x: 0, y: -1 },
        'south': { x: 0, y: 1 },
        'east': { x: 1, y: 0 },
        'west': { x: -1, y: 0 },
        'northeast': { x: 1, y: -1 },
        'northwest': { x: -1, y: -1 },
        'southeast': { x: 1, y: 1 },
        'southwest': { x: -1, y: 1 }
    };
    
    const reverseMap = {
        '1,-1': 'northeast',
        '-1,-1': 'northwest',
        '1,1': 'southeast',
        '-1,1': 'southwest',
        '1,0': 'east',
        '-1,0': 'west',
        '0,1': 'south',
        '0,-1': 'north'
    };
    
    const from = directionMap[fromDirection];
    const to = directionMap[toDirection];
    
    if (!from || !to) return null;
    
    // Calculate relative position: where 'from' is relative to 'to'
    // (reverse the subtraction to get the correct direction)
    const relX = from.x - to.x;
    const relY = from.y - to.y;
    
    // Ignore if same direction
    if (relX === 0 && relY === 0) return null;
    
    return reverseMap[relX + ',' + relY] || null;
}

async function deleteExit(exitId) {
    if (!confirm('Delete this exit?')) return;
    
    // Map opposite directions (including diagonals and vertical)
    const oppositeDirections = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east',
        'northeast': 'southwest',
        'southwest': 'northeast',
        'northwest': 'southeast',
        'southeast': 'northwest',
        'up': 'down',
        'down': 'up'
    };
    
    // Find the exit to get its destination and direction
    const exitToDelete = currentPlaceExits.find(e => e.id === exitId);
    
    try {
        // Delete the forward exit
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_exit',
                exit_id: exitId
            })
        });

        const data = await response.json();
        if (data.success) {
            // If we found the exit, also delete the reverse exit in the destination place
            if (exitToDelete) {
                const oppositeDirection = oppositeDirections[exitToDelete.direction.toLowerCase()];
                
                // Find exits from the destination place back to current place
                try {
                    const reverseExitsResponse = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'get_exits',
                            place_id: exitToDelete.to_place_id
                        })
                    });
                    
                    const reverseExitsData = await reverseExitsResponse.json();
                    if (reverseExitsData.success) {
                        // Find the reverse exit
                        const reverseExit = reverseExitsData.exits.find(e => 
                            e.direction.toLowerCase() === oppositeDirection && 
                            e.to_place_id === navState.place_id
                        );
                        
                        if (reverseExit) {
                            // Delete the reverse exit
                            await fetch(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'delete_exit',
                                    exit_id: reverseExit.id
                                })
                            });
                        }
                        
                        // Spatial sync cleanup: delete corresponding exits from other adjacent places
                        // For each exit from current place, check if it relates spatially to the deleted exit
                        for (const exit of currentPlaceExits) {
                            const relatedDirection = calculateRelativeDirection(exitToDelete.direction, exit.direction);
                            if (relatedDirection) {
                                // This adjacent place has a related exit that should be deleted
                                // Find and delete exits from exit.to_place_id to exitToDelete.to_place_id in the related direction
                                try {
                                    const adjacentExitsResponse = await fetch(API_URL, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'get_exits',
                                            place_id: exit.to_place_id
                                        })
                                    });
                                    
                                    const adjacentExitsData = await adjacentExitsResponse.json();
                                    if (adjacentExitsData.success) {
                                        const exitToRemove = adjacentExitsData.exits.find(e => 
                                            e.direction.toLowerCase() === relatedDirection && 
                                            e.to_place_id === exitToDelete.to_place_id
                                        );
                                        
                                        if (exitToRemove) {
                                            await fetch(API_URL, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    action: 'delete_exit',
                                                    exit_id: exitToRemove.id
                                                })
                                            });
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error deleting spatial sync exit:', error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error deleting reverse exit:', error);
                }
            }
            
            showMessage('Exit deleted', 'success', 'exit-message');
            await loadExitsForPlace(navState.place_id);
        } else {
            showMessage('Error: ' + data.message, 'error', 'exit-message');
        }
    } catch (error) {
        showMessage('Error deleting exit', 'error', 'exit-message');
    }
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Check if any other modals are still open
        const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
        if (openModals.length === 0) {
            document.body.style.overflow = 'auto';
        }
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Close modal when clicking close button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
});

// ===== UTILITIES =====
function showMessage(message, type, elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = `message ${type}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CONNECTION TYPE FUNCTIONS =====
function showConnectionTypeModal(exitId, currentType) {
    // Store current exit ID for updating
    window.currentExitId = exitId;
    window.currentExitType = currentType;
    
    const connectionTypes = [
        { id: 'full', label: 'Full', description: 'Completely open area (like being outside or a huge room)', color: '#00ff00' },
        { id: 'passage', label: 'Passage', description: 'Open passage like an arch or doorway (can look through)', color: '#00ccff' },
        { id: 'closed', label: 'Closed', description: 'Closed door or hatch (need to open)', color: '#ffaa00' },
        { id: 'locked', label: 'Locked', description: 'Locked door or hatch (need an item)', color: '#ff4444' },
        { id: 'no_throughway', label: 'No Throughway', description: 'Exists spatially but cannot enter', color: '#888888' }
    ];
    
    const container = document.getElementById('connection-type-options');
    container.innerHTML = connectionTypes.map(type => `
        <div style="
            padding: 12px;
            margin: 8px 0;
            border: 2px solid ${type.color};
            border-radius: 4px;
            cursor: pointer;
            background: ${currentType === type.id ? 'rgba(' + hexToRgb(type.color).join(',') + ',0.2)' : 'transparent'};
            transition: all 0.2s;
        " 
        onclick="updateConnectionType('${type.id}')">
            <div style="font-weight: bold; color: ${type.color};">${type.label}</div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px;">${type.description}</div>
        </div>
    `).join('');
    
    openModal('modal-connection-type');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

async function ensureConnectionTypeColumn() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ensure_connection_type_column'
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Database schema ready:', data.message);
        }
    } catch (error) {
        console.error('Failed to ensure connection type column:', error);
    }
}

async function ensureCoordinateColumns() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ensure_coordinates'
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Coordinate columns ready:', data.message);
        }
    } catch (error) {
        console.error('Failed to ensure coordinate columns:', error);
    }
}

async function ensurePlacedColumn() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ensure_placed'
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Placed column ready:', data.message);
        }
    } catch (error) {
        console.error('Failed to ensure placed column:', error);
    }
}

async function updateConnectionType(newType) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_exit_type',
                exit_id: window.currentExitId,
                connection_type: newType
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Reload exits to show updated type
            await loadExitsForPlace(navState.place_id);
            closeModal('modal-connection-type');
        } else {
            alert('Error updating connection type: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating connection type:', error);
        alert('Error updating connection type');
    }
}

// ===== QUEST SYSTEM =====

let currentQuestTasks = [];
let currentQuestId = null;

async function ensureQuestTables() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ensure_quest_tables' })
        });
        const data = await response.json();
        console.log('[ensureQuestTables]', data.message);
    } catch (error) {
        console.error('Error ensuring quest tables:', error);
    }
}

async function loadQuests() {
    if (!navState.world_id) {
        console.warn('[loadQuests] No world_id set');
        return;
    }
    
    try {
        console.log('[loadQuests] Loading quests for world:', navState.world_id);
        const requestBody = {
            action: 'get_quests',
            world_id: navState.world_id
        };
        console.log('[loadQuests] Request body:', requestBody);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log('[loadQuests] Response status:', response.status);
        const data = await response.json();
        console.log('[loadQuests] Response data:', data);
        
        if (data.success) {
            quests = data.quests || [];
            console.log('[loadQuests] Loaded', quests.length, 'quests:', JSON.stringify(quests));
        } else {
            console.error('[loadQuests] API error:', data.message);
            quests = [];
        }
    } catch (error) {
        console.error('[loadQuests] Fetch error:', error);
        quests = [];
    }
}

async function loadQuestTasks(questId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_quest_tasks',
                quest_id: questId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            currentQuestTasks = data.tasks;
            currentQuestId = questId;
            console.log('[loadQuestTasks] Loaded', currentQuestTasks.length, 'tasks for quest', questId);
        }
    } catch (error) {
        console.error('Error loading quest tasks:', error);
    }
}

function showQuestManagement() {
    console.log('[showQuestManagement] Called - opening quest modal for world:', navState.world_id);
    console.log('[showQuestManagement] Current quests array before load:', JSON.stringify(quests));
    
    // Load quests
    loadQuests();
    
    // Give it a moment then render
    setTimeout(() => {
        console.log('[showQuestManagement] After timeout, quests array:', JSON.stringify(quests));
        renderQuestsList();
        openModal('modal-quests');
    }, 100);
}

function renderQuestsList() {
    const container = document.getElementById('quests-list');
    if (!container) {
        console.warn('[renderQuestsList] Container not found');
        return;
    }
    
    console.log('[renderQuestsList] START - Rendering', quests.length, 'quests');
    console.log('[renderQuestsList] Quests data:', JSON.stringify(quests));
    
    if (!quests || quests.length === 0) {
        console.log('[renderQuestsList] No quests, showing empty state');
        container.innerHTML = '<p class="empty-state">No quests yet</p>';
        return;
    }
    
    let html = '';
    
    quests.forEach((quest, index) => {
        console.log(`[renderQuestsList] Quest ${index}:`, quest.name, 'quest_type:', quest.quest_type, 'type:', quest.type);
        
        // Support both quest_type and type field names
        const qType = quest.quest_type || quest.type || 'unknown';
        const typeBadge = qType === 'main' ? '★ Main' : '◇ Side';
        
        html += `
            <div class="list-item">
                <div class="list-item-content" onclick="selectQuest(${quest.id}, '${escapeHtml(quest.name)}')">
                    <div class="list-item-title">${escapeHtml(quest.name)} <small style="color: #aaa;">(${typeBadge})</small></div>
                    <div class="list-item-desc">${escapeHtml(quest.description || '(no description)')}</div>
                </div>
                <button class="btn-small btn-danger" onclick="deleteQuestConfirm(${quest.id})">Delete</button>
            </div>
        `;
    });
    
    console.log('[renderQuestsList] Generated HTML length:', html.length);
    container.innerHTML = html;
    console.log('[renderQuestsList] DONE - Container now has', container.children.length, 'children');
}

async function selectQuest(questId, questName) {
    currentQuestId = questId;
    await loadQuestTasks(questId);
    renderQuestTasks();
    document.getElementById('current-quest-name').textContent = escapeHtml(questName);
    document.getElementById('quest-tasks-section').style.display = 'block';
}

function renderQuestTasks() {
    const container = document.getElementById('quest-tasks-list');
    if (!container) return;
    
    if (currentQuestTasks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tasks yet. Add one below.</p>';
        return;
    }
    
    container.innerHTML = currentQuestTasks.map(task => `
        <div class="task-item">
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.name)}</div>
                <div class="task-meta">
                    ${task.is_required ? '<span class="badge badge-required">Required</span>' : '<span class="badge badge-optional">Optional</span>'}
                    ${task.linked_place_id ? '<span class="badge">Room</span>' : ''}
                    ${task.linked_object_id ? '<span class="badge">Object</span>' : ''}
                    ${task.linked_tasks.length > 0 ? `<span class="badge">${task.linked_tasks.length} links</span>` : ''}
                </div>
                <div class="task-desc">${escapeHtml(task.description || '(no description)')}</div>
                ${task.linked_tasks.length > 0 ? `
                    <div class="task-links">
                        <strong>Links to:</strong>
                        <ul>
                            ${task.linked_tasks.map(linkedId => {
                                const linkedTask = currentQuestTasks.find(t => t.id === linkedId);
                                return linkedTask ? `<li>${escapeHtml(linkedTask.name)} <button class="btn-tiny" onclick="removeQuestTaskLink(${task.id}, ${linkedId})">✕</button></li>` : '';
                            }).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div id="task-mechanics-${task.id}" style="margin-top: 10px;"></div>
                <div id="task-kickbacks-${task.id}" style="margin-top: 10px;"></div>
            </div>
            <div class="task-actions">
                <button class="btn-small" onclick="openLinkTaskModal(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}')" title="Link this task to another">Link</button>
                <button class="btn-small" onclick="editQuestTask(${task.id})">Edit</button>
                <button class="btn-small btn-danger" onclick="deleteQuestTaskConfirm(${task.id})">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Load and display mechanics and kickbacks for each task
    currentQuestTasks.forEach(task => {
        loadTaskMechanicsDisplay(task.id);
        loadTaskKickbacksDisplay(task.id);
    });
}

async function loadTaskMechanicsDisplay(taskId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_task_mechanics',
                task_id: taskId
            })
        });
        
        const data = await response.json();
        const container = document.getElementById(`task-mechanics-${taskId}`);
        
        if (!container) return;
        
        if (data.success && data.mechanics.length > 0) {
            container.innerHTML = `
                <div style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                    <strong style="color: #81c784;">✓ Completes on:</strong>
                    <div style="font-size: 11px; color: #aaa;">
                        ${data.mechanics.map(m => `${escapeHtml(m.type)}: ${escapeHtml(m.name)}`).join(', ')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('[loadTaskMechanicsDisplay] Error:', error);
    }
}

async function loadTaskKickbacksDisplay(taskId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_task_kickbacks',
                task_id: taskId
            })
        });
        
        const data = await response.json();
        const container = document.getElementById(`task-kickbacks-${taskId}`);
        
        if (!container) return;
        
        if (data.success && data.kickbacks.length > 0) {
            container.innerHTML = `
                <div style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                    <strong style="color: #ffd54f;">⚡ Kickback Tasks:</strong>
                    <div style="font-size: 11px; color: #aaa;">
                        ${data.kickbacks.map(k => `${escapeHtml(k.kickback_name)}`).join(' or ')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('[loadTaskKickbacksDisplay] Error:', error);
    }
}

function openCreateQuestModal() {
    document.getElementById('quest-type-select').value = 'side';
    document.getElementById('quest-name-input').value = '';
    document.getElementById('quest-desc-input').value = '';
    openModal('modal-create-quest');
}

async function createNewQuest() {
    const name = document.getElementById('quest-name-input').value.trim();
    const desc = document.getElementById('quest-desc-input').value.trim();
    const type = document.getElementById('quest-type-select').value;
    
    if (!name) {
        alert('Quest name required');
        return;
    }
    
    if (type === 'main' && quests.some(q => q.quest_type === 'main')) {
        alert('A main quest already exists for this world');
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_quest',
                world_id: navState.world_id,
                name: name,
                description: desc,
                quest_type: type
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[createNewQuest] Quest created:', data.quest_id);
            await loadQuests();
            renderQuestsList();
            closeModal('modal-create-quest');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error creating quest:', error);
        alert('Error creating quest');
    }
}

function openCreateTaskModal() {
    if (!currentQuestId) {
        alert('Select a quest first');
        return;
    }
    
    document.getElementById('task-name-input').value = '';
    document.getElementById('task-desc-input').value = '';
    document.getElementById('task-required-input').checked = false;
    
    // Populate place dropdown
    const placeSelect = document.getElementById('task-place-select');
    placeSelect.innerHTML = '<option value="">-- None --</option>' + 
        places.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    
    // Populate object dropdown
    const objectSelect = document.getElementById('task-object-select');
    objectSelect.innerHTML = '<option value="">-- None --</option>' + 
        objects.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('');
    
    openModal('modal-create-task');
}

async function createNewQuestTask() {
    const name = document.getElementById('task-name-input').value.trim();
    const desc = document.getElementById('task-desc-input').value.trim();
    const isRequired = document.getElementById('task-required-input').checked ? 1 : 0;
    const placeId = document.getElementById('task-place-select').value || null;
    const objectId = document.getElementById('task-object-select').value || null;
    
    if (!name) {
        alert('Task name required');
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_quest_task',
                quest_id: currentQuestId,
                name: name,
                description: desc,
                is_required: isRequired,
                linked_place_id: placeId,
                linked_object_id: objectId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[createNewQuestTask] Task created:', data.task_id);
            await loadQuestTasks(currentQuestId);
            renderQuestTasks();
            closeModal('modal-create-task');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task');
    }
}

async function deleteQuestConfirm(questId) {
    if (confirm('Delete this quest and all its tasks?')) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_quest',
                    quest_id: questId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadQuests();
                renderQuestsList();
                renderQuestsPageList();
                document.getElementById('quest-tasks-section').style.display = 'none';
                document.getElementById('quest-details-section').style.display = 'none';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting quest:', error);
            alert('Error deleting quest');
        }
    }
}

function renderQuestsPageList() {
    const container = document.getElementById('quests-page-list');
    if (!container) return;
    
    if (!quests || quests.length === 0) {
        container.innerHTML = '<p class="empty-state">No quests yet. Create one to get started!</p>';
        return;
    }
    
    container.innerHTML = quests.map(quest => {
        const qType = quest.quest_type || quest.type || 'unknown';
        const typeBadge = qType === 'main' ? '★ Main' : '◇ Side';
        
        return `
            <div class="list-item clickable" onclick="selectQuestForPage(${quest.id}, '${escapeHtml(quest.name).replace(/'/g, "\\'")}')" style="cursor: pointer;">
                <div class="list-item-content" style="flex: 1;">
                    <div class="list-item-title">${escapeHtml(quest.name)} <small style="color: #aaa;">(${typeBadge})</small></div>
                    <div class="list-item-desc">${escapeHtml(quest.description || '(no description)')}</div>
                </div>
                <button class="btn-small" onclick="event.stopPropagation(); deleteQuestConfirm(${quest.id})" style="margin-left: 10px;">Delete</button>
            </div>
        `;
    }).join('');
}

async function selectQuestForPage(questId, questName) {
    currentQuestId = questId;
    await loadQuestTasks(questId);
    
    // Show quest details
    document.getElementById('quest-details-section').style.display = 'block';
    document.getElementById('quest-details-title').textContent = escapeHtml(questName);
    
    // Render tasks in page view
    renderQuestsPageTasks();
}

function renderQuestsPageTasks() {
    const container = document.getElementById('quest-tasks-page-list');
    if (!container) return;
    
    if (currentQuestTasks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tasks yet. Add one to get started.</p>';
        return;
    }
    
    container.innerHTML = currentQuestTasks.map(task => `
        <div class="task-item" style="margin-bottom: 15px;">
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.name)}</div>
                <div class="task-meta">
                    ${task.is_required ? '<span class="badge badge-required">Required</span>' : '<span class="badge badge-optional">Optional</span>'}
                    ${task.linked_place_id ? `<span class="badge">📍 Room</span>` : ''}
                    ${task.linked_object_id ? `<span class="badge">🔧 Object</span>` : ''}
                </div>
                <div class="task-desc" style="margin-top: 8px;">${escapeHtml(task.description || '(no description)')}</div>
                
                ${task.linked_tasks && task.linked_tasks.length > 0 ? `
                    <div style="margin-top: 10px; padding: 8px; background: #1a1a1a; border-radius: 3px;">
                        <strong style="color: #aaa;">Links to:</strong>
                        <div style="font-size: 12px; color: #81c784; margin-top: 5px;">
                            ${task.linked_tasks.map(linkedId => {
                                const linkedTask = currentQuestTasks.find(t => t.id === linkedId);
                                return linkedTask ? `<div>→ ${escapeHtml(linkedTask.name)}</div>` : '';
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div id="task-mechanics-page-${task.id}" style="margin-top: 10px;"></div>
                <div id="task-kickbacks-page-${task.id}" style="margin-top: 10px;"></div>
            </div>
            
            <div class="task-actions" style="flex-wrap: wrap;">
                <button class="btn-small" onclick="openTaskLinkingModal(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}')" title="Link this task to another">🔗 Link Task</button>
                <button class="btn-small" onclick="openTaskAssignmentModal(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}')" title="Assign to room or object">📍 Assign</button>
                <button class="btn-small" onclick="editQuestTask(${task.id})">Edit</button>
                <button class="btn-small btn-danger" onclick="deleteQuestTaskConfirm(${task.id})">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Load and display mechanics and kickbacks
    currentQuestTasks.forEach(task => {
        loadTaskMechanicsDisplayPage(task.id);
        loadTaskKickbacksDisplayPage(task.id);
    });
}

async function loadTaskMechanicsDisplayPage(taskId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_task_mechanics',
                task_id: taskId
            })
        });
        
        const data = await response.json();
        const container = document.getElementById(`task-mechanics-page-${taskId}`);
        
        if (!container) return;
        
        if (data.success && data.mechanics.length > 0) {
            container.innerHTML = `
                <div style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                    <strong style="color: #81c784;">✓ Completes on:</strong>
                    <div style="font-size: 11px; color: #aaa; margin-top: 5px;">
                        ${data.mechanics.map(m => `${escapeHtml(m.type)}: ${escapeHtml(m.name)}`).join(', ')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('[loadTaskMechanicsDisplayPage] Error:', error);
    }
}

async function loadTaskKickbacksDisplayPage(taskId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_task_kickbacks',
                task_id: taskId
            })
        });
        
        const data = await response.json();
        const container = document.getElementById(`task-kickbacks-page-${taskId}`);
        
        if (!container) return;
        
        if (data.success && data.kickbacks.length > 0) {
            container.innerHTML = `
                <div style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                    <strong style="color: #ffd54f;">⚡ Kickback Tasks:</strong>
                    <div style="font-size: 11px; color: #aaa; margin-top: 5px;">
                        ${data.kickbacks.map(k => `${escapeHtml(k.kickback_name)}`).join(' or ')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('[loadTaskKickbacksDisplayPage] Error:', error);
    }
}

async function deleteQuestTaskConfirm(taskId) {
    if (confirm('Delete this task and its links?')) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_quest_task',
                    task_id: taskId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadQuestTasks(currentQuestId);
                renderQuestTasks();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task');
        }
    }
}

let linkingFromTaskId = null;

function openLinkTaskModal(fromTaskId, fromTaskName) {
    if (currentQuestTasks.length < 2) {
        alert('You need at least 2 tasks to create links');
        return;
    }
    
    linkingFromTaskId = fromTaskId;
    
    // Display the source task
    document.getElementById('link-from-task-display').textContent = escapeHtml(fromTaskName);
    
    // Populate the "Link To" dropdown with all other tasks in this quest
    const linkToSelect = document.getElementById('link-to-task-select');
    linkToSelect.innerHTML = '<option value="">-- Select Task --</option>' +
        currentQuestTasks
            .filter(t => t.id !== fromTaskId)
            .map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
            .join('');
    
    document.getElementById('link-required-depends-checkbox').checked = true;
    
    openModal('modal-link-task');
}

async function confirmQuestTaskLink() {
    const toTaskId = document.getElementById('link-to-task-select').value;
    
    if (!toTaskId) {
        alert('Please select a task to link to');
        return;
    }
    
    if (toTaskId == linkingFromTaskId) {
        alert('Cannot link a task to itself');
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'link_quest_tasks',
                from_task_id: linkingFromTaskId,
                to_task_id: parseInt(toTaskId)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[confirmQuestTaskLink] Tasks linked:', linkingFromTaskId, '->', toTaskId);
            await loadQuestTasks(currentQuestId);
            renderQuestTasks();
            closeModal('modal-link-task');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error linking tasks:', error);
        alert('Error linking tasks');
    }
}

async function removeQuestTaskLink(fromTaskId, toTaskId) {
    if (confirm('Remove this task link?')) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_quest_task_link',
                    from_task_id: fromTaskId,
                    to_task_id: toTaskId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('[removeQuestTaskLink] Link removed:', fromTaskId, '-> ', toTaskId);
                await loadQuestTasks(currentQuestId);
                renderQuestTasks();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error removing link:', error);
            alert('Error removing link');
        }
    }
}

// ===== Place Quest Task Assignment Functions =====

let currentPlaceId = null;
let currentPlaceQuestTasks = [];

function goBackToPlaces() {
    document.getElementById('view-rooms-list').style.display = 'block';
    document.getElementById('view-quests-list').style.display = 'none';
    document.getElementById('view-place-details').style.display = 'none';
}

async function showPlaceDetailsView(placeId) {
    currentPlaceId = placeId;
    console.log('[showPlaceDetailsView] Opening place:', placeId);
    
    // Hide other views
    document.getElementById('view-rooms-list').style.display = 'none';
    document.getElementById('view-quests-list').style.display = 'none';
    document.getElementById('view-place-details').style.display = 'block';
    
    // Load and display place quest tasks
    await loadPlaceQuestTasks(placeId);
}

async function loadPlaceQuestTasks(placeId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_place_quest_tasks',
                place_id: placeId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            currentPlaceQuestTasks = data.tasks || [];
            console.log('[loadPlaceQuestTasks] Loaded', currentPlaceQuestTasks.length, 'tasks for place', placeId);
            renderPlaceQuestTasks();
        } else {
            console.error('[loadPlaceQuestTasks] Error:', data.message);
            currentPlaceQuestTasks = [];
            renderPlaceQuestTasks();
        }
    } catch (error) {
        console.error('[loadPlaceQuestTasks] Error:', error);
        currentPlaceQuestTasks = [];
        renderPlaceQuestTasks();
    }
}

function renderPlaceQuestTasks() {
    const container = document.getElementById('place-quest-tasks-list');
    if (!container) return;
    
    if (currentPlaceQuestTasks.length === 0) {
        container.innerHTML = '<p>No quest tasks assigned to this room.</p>';
        return;
    }
    
    let html = '<ul>';
    currentPlaceQuestTasks.forEach(task => {
        const type = task.quest_type === 'main' ? '<span class="badge badge-required">Main</span>' : '<span class="badge badge-optional">Side</span>';
        html += `<li>
            <strong>${escapeHtml(task.name)}</strong> ${type}
            <br><em>Quest: ${escapeHtml(task.quest_name)}</em>
            <br><small>${escapeHtml(task.description)}</small>
            <br><button class="btn-small" onclick="removeTaskFromPlace(${task.id})">Remove from Room</button>
        </li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
}

async function openAssignTasksModal() {
    console.log('[openAssignTasksModal] Opening task assignment modal');
    
    // Load all quests for dropdown
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'get_quests',
            world_id: navState.world_id
        })
    });
    
    const data = await response.json();
    if (data.success) {
        const quests = data.quests || [];
        const questSelect = document.getElementById('assign-task-quest-select');
        questSelect.innerHTML = '<option value="">-- Select a Quest --</option>';
        quests.forEach(quest => {
            questSelect.innerHTML += `<option value="${quest.id}">${escapeHtml(quest.name)}</option>`;
        });
        
        // Show modal
        openModal('modal-assign-task-to-room');
    } else {
        alert('Error loading quests: ' + data.message);
    }
}

async function loadAssignableTasksForQuest() {
    const questSelect = document.getElementById('assign-task-quest-select');
    const questId = parseInt(questSelect.value);
    
    if (!questId) {
        document.getElementById('assign-task-task-select').innerHTML = '<option value="">-- Select a Task --</option>';
        return;
    }
    
    console.log('[loadAssignableTasksForQuest] Loading tasks for quest:', questId);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_quest_tasks',
                quest_id: questId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            const tasks = data.tasks || [];
            const taskSelect = document.getElementById('assign-task-task-select');
            taskSelect.innerHTML = '<option value="">-- Select a Task --</option>';
            
            tasks.forEach(task => {
                // Only show tasks not already assigned to this place
                if (!currentPlaceQuestTasks.some(t => t.id === task.id)) {
                    taskSelect.innerHTML += `<option value="${task.id}">${escapeHtml(task.name)}</option>`;
                }
            });
        }
    } catch (error) {
        console.error('[loadAssignableTasksForQuest] Error:', error);
        alert('Error loading tasks');
    }
}

async function confirmAssignTaskToRoom() {
    const taskSelect = document.getElementById('assign-task-task-select');
    const taskId = parseInt(taskSelect.value);
    
    if (!taskId) {
        alert('Please select a task');
        return;
    }
    
    console.log('[confirmAssignTaskToRoom] Assigning task', taskId, 'to place', currentPlaceId);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_task_to_place',
                task_id: taskId,
                place_id: currentPlaceId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[confirmAssignTaskToRoom] Task assigned successfully');
            closeModal('modal-assign-task-to-room');
            await loadPlaceQuestTasks(currentPlaceId);
            renderPlaceQuestTasks();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('[confirmAssignTaskToRoom] Error:', error);
        alert('Error assigning task');
    }
}

async function removeTaskFromPlace(taskId) {
    if (!confirm('Remove this task from the room?')) return;
    
    console.log('[removeTaskFromPlace] Removing task', taskId, 'from place', currentPlaceId);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'unassign_task_from_place',
                task_id: taskId,
                place_id: currentPlaceId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[removeTaskFromPlace] Task removed successfully');
            await loadPlaceQuestTasks(currentPlaceId);
            renderPlaceQuestTasks();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('[removeTaskFromPlace] Error:', error);
        alert('Error removing task');
    }
}

// ===== ENHANCED TASK CREATION WORKFLOW =====

let taskEnhancedData = {
    selectedMechanics: [],
    selectedKickbacks: []
};

function openCreateTaskModalEnhanced() {
    console.log('[openCreateTaskModalEnhanced] Opening');
    
    // Reset form
    document.getElementById('task-enh-name-input').value = '';
    document.getElementById('task-enh-desc-input').value = '';
    document.getElementById('task-enh-required-input').checked = false;
    document.getElementById('task-enh-place-select').value = '';
    document.getElementById('task-enh-object-select').value = '';
    
    taskEnhancedData = { selectedMechanics: [], selectedKickbacks: [] };
    
    // Populate places
    const placeSelect = document.getElementById('task-enh-place-select');
    placeSelect.innerHTML = '<option value="">-- None --</option>';
    places.forEach(place => {
        if (place.world_id === navState.world_id) {
            placeSelect.innerHTML += `<option value="${place.id}">${escapeHtml(place.name)}</option>`;
        }
    });
    
    // Populate kickback task options
    updateKickbackTaskOptions();
    
    renderTaskEnhancedMechanics();
    renderTaskEnhancedKickbacks();
    
    openModal('modal-create-task-enhanced');
}

function updateTaskEnhancedObjects() {
    const placeId = parseInt(document.getElementById('task-enh-place-select').value);
    const objectSelect = document.getElementById('task-enh-object-select');
    
    objectSelect.innerHTML = '<option value="">-- None --</option>';
    
    if (!placeId) {
        objectSelect.disabled = true;
        return;
    }
    
    objectSelect.disabled = false;
    const roomObjects = objects.filter(o => o.place_id === placeId);
    roomObjects.forEach(obj => {
        objectSelect.innerHTML += `<option value="${obj.id}">${escapeHtml(obj.name)}</option>`;
    });
    
    // Reset mechanics when place changes
    document.getElementById('task-enh-object-select').value = '';
    renderTaskEnhancedMechanics();
}

async function updateTaskEnhancedMechanics() {
    const objectId = parseInt(document.getElementById('task-enh-object-select').value);
    const mechanicsContainer = document.getElementById('task-enh-mechanics-list');
    
    if (!objectId) {
        mechanicsContainer.innerHTML = '<p style="color: #666; text-align: center;">Select an object above to see available mechanics</p>';
        taskEnhancedData.selectedMechanics = [];
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_compatible_mechanics',
                object_id: objectId
            })
        });
        
        const data = await response.json();
        if (data.success && data.mechanics.length > 0) {
            mechanicsContainer.innerHTML = data.mechanics.map(m => `
                <div style="display: flex; align-items: center; padding: 8px; background: #1a1a1a; margin: 5px 0; border-radius: 3px; border: 1px solid #333;">
                    <input type="checkbox" id="mechanic-${m.id}" onchange="toggleTaskMechanic(${m.id})" style="margin-right: 10px;">
                    <div style="flex: 1;">
                        <strong>${escapeHtml(m.type)}</strong> - ${escapeHtml(m.name)}
                        <div style="color: #aaa; font-size: 11px;">${escapeHtml(m.description || '(no description)')}</div>
                    </div>
                </div>
            `).join('');
        } else {
            mechanicsContainer.innerHTML = '<p style="color: #666; text-align: center;">No mechanics available for this object</p>';
            taskEnhancedData.selectedMechanics = [];
        }
    } catch (error) {
        console.error('[updateTaskEnhancedMechanics] Error:', error);
        mechanicsContainer.innerHTML = '<p style="color: #c44;">Error loading mechanics</p>';
    }
}

function toggleTaskMechanic(mechanicId) {
    const checkbox = document.getElementById(`mechanic-${mechanicId}`);
    if (checkbox.checked) {
        if (!taskEnhancedData.selectedMechanics.includes(mechanicId)) {
            taskEnhancedData.selectedMechanics.push(mechanicId);
        }
    } else {
        taskEnhancedData.selectedMechanics = taskEnhancedData.selectedMechanics.filter(id => id !== mechanicId);
    }
    console.log('[toggleTaskMechanic] Selected mechanics:', taskEnhancedData.selectedMechanics);
}

function updateKickbackTaskOptions() {
    const kickbackSelect = document.getElementById('task-enh-kickback-select');
    kickbackSelect.innerHTML = '<option value="">-- Select Task --</option>';
    
    // Show all tasks from current quest except the one being created
    if (currentQuestId && currentQuestTasks) {
        currentQuestTasks.forEach(task => {
            kickbackSelect.innerHTML += `<option value="${task.id}">${escapeHtml(task.name)}</option>`;
        });
    }
}

function addTaskKickbackToList() {
    const kickbackSelect = document.getElementById('task-enh-kickback-select');
    const taskId = parseInt(kickbackSelect.value);
    
    if (!taskId) {
        alert('Please select a task');
        return;
    }
    
    if (taskEnhancedData.selectedKickbacks.includes(taskId)) {
        alert('This task is already added');
        return;
    }
    
    const task = currentQuestTasks.find(t => t.id === taskId);
    if (task) {
        taskEnhancedData.selectedKickbacks.push(taskId);
        kickbackSelect.value = '';
        renderTaskEnhancedKickbacks();
    }
}

function removeTaskKickbackFromList(taskId) {
    taskEnhancedData.selectedKickbacks = taskEnhancedData.selectedKickbacks.filter(id => id !== taskId);
    renderTaskEnhancedKickbacks();
}

function renderTaskEnhancedMechanics() {
    const container = document.getElementById('task-enh-mechanics-list');
    if (taskEnhancedData.selectedMechanics.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Select an object above to see available mechanics</p>';
    }
}

function renderTaskEnhancedKickbacks() {
    const container = document.getElementById('task-enh-kickbacks-list');
    
    if (taskEnhancedData.selectedKickbacks.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">No kickback tasks added yet</p>';
        return;
    }
    
    container.innerHTML = taskEnhancedData.selectedKickbacks.map(kickbackId => {
        const task = currentQuestTasks.find(t => t.id === kickbackId);
        return task ? `
            <div style="display: flex; align-items: center; padding: 8px; background: #1a1a1a; margin: 5px 0; border-radius: 3px; border-left: 3px solid #81c784;">
                <div style="flex: 1;">
                    <strong>${escapeHtml(task.name)}</strong>
                    <div style="color: #aaa; font-size: 11px;">${escapeHtml(task.description || '')}</div>
                </div>
                <button class="btn-tiny" onclick="removeTaskKickbackFromList(${kickbackId})">✕ Remove</button>
            </div>
        ` : '';
    }).join('');
}

async function createNewQuestTaskEnhanced() {
    const name = document.getElementById('task-enh-name-input').value.trim();
    const description = document.getElementById('task-enh-desc-input').value.trim();
    const isRequired = document.getElementById('task-enh-required-input').checked;
    const placeId = parseInt(document.getElementById('task-enh-place-select').value) || null;
    const objectId = parseInt(document.getElementById('task-enh-object-select').value) || null;
    
    if (!name) {
        alert('Task name required');
        return;
    }
    
    if (!currentQuestId) {
        alert('No quest selected');
        return;
    }
    
    try {
        // Step 1: Create the task
        const createResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_quest_task',
                quest_id: currentQuestId,
                name: name,
                description: description,
                is_required: isRequired ? 1 : 0,
                linked_place_id: placeId,
                linked_object_id: objectId
            })
        });
        
        const createData = await createResponse.json();
        if (!createData.success) {
            throw new Error(createData.message || 'Failed to create task');
        }
        
        const newTaskId = createData.task_id;
        console.log('[createNewQuestTaskEnhanced] Task created:', newTaskId);
        
        // Step 2: Link mechanics to task
        for (const mechanicId of taskEnhancedData.selectedMechanics) {
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'link_task_mechanic',
                        task_id: newTaskId,
                        mechanic_id: mechanicId
                    })
                });
            } catch (error) {
                console.error('[createNewQuestTaskEnhanced] Error linking mechanic:', error);
            }
        }
        
        // Step 3: Add kickback tasks
        for (const kickbackId of taskEnhancedData.selectedKickbacks) {
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'add_task_kickback',
                        original_task_id: newTaskId,
                        kickback_task_id: kickbackId,
                        priority: 0
                    })
                });
            } catch (error) {
                console.error('[createNewQuestTaskEnhanced] Error adding kickback:', error);
            }
        }
        
        console.log('[createNewQuestTaskEnhanced] Task fully configured');
        closeModal('modal-create-task-enhanced');
        
        // Reload and re-render
        await loadQuestTasks(currentQuestId);
        renderQuestTasks();
        renderQuestsPageTasks();
        
    } catch (error) {
        console.error('[createNewQuestTaskEnhanced] Error:', error);
        alert('Error creating task: ' + error.message);
    }
}

// ===== VISUAL QUEST BUILDER =====

let visualBuilderData = {
    taskPositions: {},
    selectedTask: null,
    connectingFromTask: null
};

function showQuestView(viewType) {
    const listView = document.getElementById('quest-view-list');
    const visualView = document.getElementById('quest-view-visual');
    const btnList = document.getElementById('btn-quest-list-view');
    const btnVisual = document.getElementById('btn-quest-visual-view');
    
    if (viewType === 'list') {
        listView.style.display = 'block';
        visualView.style.display = 'none';
        btnList.style.background = '#81c784';
        btnVisual.style.background = '';
    } else {
        listView.style.display = 'none';
        visualView.style.display = 'block';
        btnList.style.background = '';
        btnVisual.style.background = '#81c784';
        renderVisualBuilder();
    }
}

function renderVisualBuilder() {
    const container = document.getElementById('visual-builder-content');
    if (!currentQuestTasks || currentQuestTasks.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">No tasks yet. Add one to start building!</div>';
        return;
    }
    
    // Initialize view position if not set
    if (!visualBuilderData.viewPos) {
        visualBuilderData.viewPos = { x: 1, y: 1, z: 0 };
    }
    
    // Get places by coordinates
    const placesByCoord = {};
    places.forEach(place => {
        const x = place.x || 1;
        const y = place.y || 1;
        const z = place.z || 0;
        const key = `${x},${y},${z}`;
        if (!placesByCoord[key]) placesByCoord[key] = [];
        placesByCoord[key].push(place);
    });
    
    const viewX = visualBuilderData.viewPos.x;
    const viewY = visualBuilderData.viewPos.y;
    const viewZ = visualBuilderData.viewPos.z;
    
    // Get places to display in carousel (only at current Y,Z - horizontal scrolling)
    const displayPlaces = [];
    for (let i = 0; i < 5; i++) {
        const x = viewX + i;
        const key = `${x},${viewY},${viewZ}`;
        const placesAtCoord = placesByCoord[key] || [];
        displayPlaces.push(...placesAtCoord);
    }
    
    // Check for navigation - only places at viewX, viewY, viewZ
    const hasNorth = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x === viewX && y > viewY && z === viewZ;
    });
    
    const hasSouth = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x === viewX && y < viewY && z === viewZ;
    });
    
    const hasUp = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x === viewX && y === viewY && z > viewZ;
    });
    
    const hasDown = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x === viewX && y === viewY && z < viewZ;
    });
    
    const hasWest = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x < viewX && y === viewY && z === viewZ;
    });
    
    const hasEast = Object.keys(placesByCoord).some(key => {
        const [x, y, z] = key.split(',').map(Number);
        return x > viewX + 4 && y === viewY && z === viewZ;
    });
    
    // LAYOUT: Tasks on left, carousel below
    let html = '<div style="display: flex; width: 100%; height: 100%; flex-direction: column;">';
    
    // TOP: Task Cards on left side + Map Carousel on right side
    html += '<div style="display: flex; gap: 20px; flex: 1; overflow: hidden;">';
    
    // LEFT SIDE: Task Cards
    html += '<div style="flex: 0 0 400px; display: flex; flex-wrap: wrap; gap: 15px; align-content: flex-start; overflow-y: auto; padding: 15px; background: #0a0d1a; border-right: 1px solid #444;">';
    
    currentQuestTasks.forEach((task) => {
        const assignment = getTaskAssignmentLabel(task);
        const hasLinkedTasks = task.linked_tasks && task.linked_tasks.length > 0;
        
        let cardColor = '#333';
        let dotColor = '#999';
        let borderColor = '#444';
        
        if (task.linked_place_id && task.linked_object_id) {
            cardColor = '#1a3a1a';
            dotColor = '#4a9d6f';
            borderColor = '#4a9d6f';
        } else if (task.linked_place_id || task.linked_object_id) {
            cardColor = '#1a2540';
            dotColor = '#4a7fd9';
            borderColor = '#4a7fd9';
        }
        
        html += `
            <div 
                class="task-card-visual" 
                id="task-card-${task.id}"
                draggable="true"
                ondragstart="startTaskDrag(event, ${task.id})"
                ondragend="endTaskDrag(event)"
                onclick="selectVisualTask(${task.id})"
                style="
                    flex: 0 0 calc(100% - 0px);
                    padding: 12px;
                    background: ${cardColor};
                    border: 2px solid ${visualBuilderData.selectedTask === task.id ? '#81c784' : borderColor};
                    border-radius: 6px;
                    cursor: move;
                    transition: all 0.2s;
                    user-select: none;
                "
            >
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 16px; color: ${dotColor};">●</span>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #fff; word-break: break-word; font-size: 12px;">${escapeHtml(task.name)}</div>
                        <div style="font-size: 10px; color: #aaa; margin-top: 3px;">${assignment}</div>
                    </div>
                </div>
                
                ${task.is_required ? '<span style="display: inline-block; padding: 2px 4px; background: #d32f2f; color: #fff; border-radius: 2px; font-size: 9px; margin-bottom: 8px;">Required</span>' : ''}
                
                <div style="font-size: 10px; color: #bbb; line-height: 1.3; margin-bottom: 8px;">
                    ${escapeHtml(task.description || '(no description)').substring(0, 60)}${task.description && task.description.length > 60 ? '...' : ''}
                </div>
                
                ${hasLinkedTasks ? `
                    <div style="border-top: 1px solid #555; padding-top: 6px; margin-top: 6px;">
                        <div style="font-size: 9px; color: #81c784; margin-bottom: 3px;">→ Links:</div>
                        ${task.linked_tasks.map(linkedId => {
                            const linkedTask = currentQuestTasks.find(t => t.id === linkedId);
                            return linkedTask ? `<div style="font-size: 9px; color: #666;">${escapeHtml(linkedTask.name)}</div>` : '';
                        }).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 10px;">
                    <button class="btn-tiny" onclick="event.stopPropagation(); openTaskAssignmentModal(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}')" style="width: 100%;">📍 Assign</button>
                    <button class="btn-tiny" onclick="event.stopPropagation(); openTaskLinkingModal(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}')" style="width: 100%;">🔗 Link</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // RIGHT SIDE: Map Carousel Area
    html += '<div style="flex: 1; background: #0f1419; border: 1px solid #444; border-radius: 8px; padding: 20px; display: flex; flex-direction: column;">';
    
    // Navigation Buttons (Up/Down/Vertical)
    html += '<div style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center; flex-wrap: wrap;">';
    if (hasNorth) {
        html += `<button class="btn-primary" onclick="moveMapView(0, 1, 0)" style="padding: 8px 12px;">⬆️ North</button>`;
    }
    if (hasSouth) {
        html += `<button class="btn-primary" onclick="moveMapView(0, -1, 0)" style="padding: 8px 12px;">⬇️ South</button>`;
    }
    if (hasUp) {
        html += `<button class="btn-primary" onclick="moveMapView(0, 0, 1)" style="padding: 8px 12px;">⬆ Up</button>`;
    }
    if (hasDown) {
        html += `<button class="btn-primary" onclick="moveMapView(0, 0, -1)" style="padding: 8px 12px;">⬇ Down</button>`;
    }
    html += '</div>';
    
    // Carousel Area
    html += '<div style="display: flex; gap: 10px; align-items: stretch; flex: 1;">';
    
    // Left scroll button
    if (hasWest) {
        html += `<button class="btn-primary" onclick="moveMapView(-1, 0, 0)" style="padding: 10px 15px; align-self: center;">◀️</button>`;
    }
    
    // Places carousel (4 full + 1 peek)
    html += '<div style="display: flex; gap: 15px; flex: 1; overflow: hidden;">';
    
    if (displayPlaces.length === 0) {
        html += '<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #666;">No places at this location</div>';
    } else {
        for (let i = 0; i < Math.min(5, displayPlaces.length); i++) {
            const place = displayPlaces[i];
            const placeObjects = objects.filter(o => o.place_id === place.id);
            const tasksInPlace = currentQuestTasks.filter(t => t.linked_place_id === place.id);
            const isPeek = i === 4;
            const opacity = isPeek ? 0.6 : 1;
            
            html += `
                <div 
                    style="
                        flex: 0 0 calc(20% - 12px);
                        ${isPeek ? 'margin-right: auto;' : ''}
                        padding: 15px;
                        background: #1a2540;
                        border: 2px solid #4a7fd9;
                        border-radius: 8px;
                        opacity: ${opacity};
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    "
                    ondrop="dropTaskOnPlace(event, ${place.id})"
                    ondragover="allowDrop(event)"
                    ondragleave="event.target.style.opacity = '1'"
                    onmouseenter="this.style.opacity = ${isPeek ? '0.8' : '0.95'}"
                    onmouseleave="this.style.opacity = ${opacity}"
                >
                    <div style="font-weight: bold; color: #81c784; font-size: 13px;">🏠 ${escapeHtml(place.name)}</div>
                    <div style="font-size: 10px; color: #aaa;">(${place.x || 1}, ${place.y || 1}, ${place.z || 0})</div>
                    
                    ${tasksInPlace.length > 0 ? `
                        <div style="padding: 8px; background: #0f1419; border-radius: 3px;">
                            <div style="color: #81c784; font-size: 10px; margin-bottom: 4px;">📋 Tasks (${tasksInPlace.length}):</div>
                            ${tasksInPlace.map(t => `<div style="font-size: 9px; color: #aaa;">• ${escapeHtml(t.name)}</div>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${placeObjects.length > 0 ? `
                        <div style="padding: 8px; background: #0f1419; border-radius: 3px;">
                            <div style="color: #4a9d6f; font-size: 10px; margin-bottom: 4px;">🔧 Objects (${placeObjects.length}):</div>
                            ${placeObjects.map(obj => {
                                const objTasks = currentQuestTasks.filter(t => t.linked_object_id === obj.id);
                                return `
                                    <div 
                                        style="
                                            margin: 4px 0;
                                            padding: 4px;
                                            background: #0a0d1a;
                                            border-left: 2px solid #4a9d6f;
                                            border-radius: 2px;
                                            font-size: 9px;
                                            color: #aaa;
                                        "
                                        ondrop="dropTaskOnObject(event, ${obj.id})"
                                        ondragover="allowDrop(event)"
                                        onmouseenter="this.style.opacity = '0.8'"
                                        onmouseleave="this.style.opacity = '1'"
                                    >
                                        🔧 ${escapeHtml(obj.name)} ${objTasks.length > 0 ? `(${objTasks.length})` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }
    
    html += '</div>';
    
    // Right scroll button
    if (hasEast) {
        html += `<button class="btn-primary" onclick="moveMapView(1, 0, 0)" style="padding: 10px 15px; align-self: center;">▶️</button>`;
    }
    
    html += '</div></div></div>';
    
    container.innerHTML = html;
    
    // Draw connections
    drawTaskConnections();
}

function moveMapView(dx, dy, dz) {
    if (!visualBuilderData.viewPos) {
        visualBuilderData.viewPos = { x: 1, y: 1, z: 0 };
    }
    visualBuilderData.viewPos.x += dx;
    visualBuilderData.viewPos.y += dy;
    visualBuilderData.viewPos.z += dz;
    renderVisualBuilder();
}

function calculateTaskPositions(tasks) {
    const positions = {};
    
    // Group tasks by depth (how many tasks must come before them)
    const taskDepth = {};
    const visited = new Set();
    
    function getDepth(taskId) {
        if (taskDepth[taskId] !== undefined) return taskDepth[taskId];
        if (visited.has(taskId)) return 0; // Circular reference, reset
        
        visited.add(taskId);
        const task = currentQuestTasks.find(t => t.id === taskId);
        
        if (!task || !task.linked_tasks || task.linked_tasks.length === 0) {
            taskDepth[taskId] = 0;
            visited.delete(taskId);
            return 0;
        }
        
        let maxDepth = 0;
        task.linked_tasks.forEach(linkedId => {
            maxDepth = Math.max(maxDepth, getDepth(linkedId) + 1);
        });
        
        taskDepth[taskId] = maxDepth;
        visited.delete(taskId);
        return maxDepth;
    }
    
    tasks.forEach(task => getDepth(task.id));
    
    // Position tasks based on depth
    const depthGroups = {};
    Object.keys(taskDepth).forEach(taskId => {
        const depth = taskDepth[taskId];
        if (!depthGroups[depth]) depthGroups[depth] = [];
        depthGroups[depth].push(parseInt(taskId));
    });
    
    Object.keys(depthGroups).forEach(depth => {
        const group = depthGroups[depth];
        group.forEach((taskId, index) => {
            positions[taskId] = {
                x: 20 + index * 230,
                y: 20 + parseInt(depth) * 150
            };
        });
    });
    
    return positions;
}

function getTaskAssignmentLabel(task) {
    if (task.linked_place_id && task.linked_object_id) {
        const place = places.find(p => p.id === task.linked_place_id);
        const object = objects.find(o => o.id === task.linked_object_id);
        return `📍 ${place ? escapeHtml(place.name) : 'Room'} • 🔧 ${object ? escapeHtml(object.name) : 'Object'}`;
    } else if (task.linked_place_id) {
        const place = places.find(p => p.id === task.linked_place_id);
        return `📍 ${place ? escapeHtml(place.name) : 'Room'}`;
    } else if (task.linked_object_id) {
        const object = objects.find(o => o.id === task.linked_object_id);
        return `🔧 ${object ? escapeHtml(object.name) : 'Object'}`;
    }
    return 'Unassigned';
}

function selectVisualTask(taskId) {
    visualBuilderData.selectedTask = visualBuilderData.selectedTask === taskId ? null : taskId;
    renderVisualBuilder();
}

function startTaskDrag(event, taskId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('taskId', taskId);
    event.target.style.opacity = '0.7';
}

function endTaskDrag(event) {
    event.target.style.opacity = '1';
}

function allowDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.target.style.opacity = '0.8';
}

async function dropTaskOnPlace(event, placeId) {
    event.preventDefault();
    event.stopPropagation();
    event.target.style.opacity = '1';
    
    const taskId = parseInt(event.dataTransfer.getData('taskId'));
    if (!taskId) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_task_to_place',
                task_id: taskId,
                place_id: placeId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update local task data
            const task = currentQuestTasks.find(t => t.id === taskId);
            if (task) {
                task.linked_place_id = placeId;
                // Keep existing object assignment if any
            }
            renderVisualBuilder();
        } else {
            alert('Error assigning task: ' + data.message);
        }
    } catch (error) {
        console.error('[dropTaskOnPlace] Error:', error);
        alert('Error assigning task');
    }
}

async function dropTaskOnObject(event, objectId) {
    event.preventDefault();
    event.stopPropagation();
    event.target.style.opacity = '1';
    
    const taskId = parseInt(event.dataTransfer.getData('taskId'));
    if (!taskId) return;
    
    // Find the object to get its place_id
    const object = objects.find(o => o.id === objectId);
    if (!object) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_task_to_object',
                task_id: taskId,
                object_id: objectId,
                place_id: object.place_id
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update local task data
            const task = currentQuestTasks.find(t => t.id === taskId);
            if (task) {
                task.linked_object_id = objectId;
                task.linked_place_id = object.place_id;
            }
            renderVisualBuilder();
        } else {
            alert('Error assigning task: ' + data.message);
        }
    } catch (error) {
        console.error('[dropTaskOnObject] Error:', error);
        alert('Error assigning task');
    }
}

function drawTaskConnections() {
    const svg = document.getElementById('task-connections-svg');
    if (!svg) return;
    
    svg.innerHTML = '';
    const canvas = document.getElementById('visual-builder-canvas');
    const viewport = document.getElementById('visual-builder-content');
    
    // Set SVG size to match content
    svg.setAttribute('width', viewport.offsetWidth);
    svg.setAttribute('height', viewport.offsetHeight);
    
    // Draw connections
    currentQuestTasks.forEach(task => {
        if (task.linked_tasks && task.linked_tasks.length > 0) {
            task.linked_tasks.forEach(linkedId => {
                const fromCard = document.getElementById(`task-card-${task.id}`);
                const toCard = document.getElementById(`task-card-${linkedId}`);
                
                if (fromCard && toCard) {
                    const fromRect = fromCard.getBoundingClientRect();
                    const toRect = toCard.getBoundingClientRect();
                    const svgRect = svg.getBoundingClientRect();
                    
                    const x1 = fromRect.right - svgRect.left;
                    const y1 = fromRect.top - svgRect.top + fromRect.height / 2;
                    const x2 = toRect.left - svgRect.left;
                    const y2 = toRect.top - svgRect.top + toRect.height / 2;
                    
                    // Draw curved arrow
                    const controlX = (x1 + x2) / 2;
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${x1} ${y1} Q ${controlX} ${(y1 + y2) / 2} ${x2} ${y2}`);
                    path.setAttribute('stroke', '#81c784');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    path.setAttribute('marker-end', 'url(#arrowhead)');
                    
                    svg.appendChild(path);
                }
            });
        }
    });
    
    // Add arrow marker if it doesn't exist
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        marker.innerHTML = '<polygon points="0 0, 10 3, 0 6" fill="#81c784" />';
        defs.appendChild(marker);
        svg.appendChild(defs);
    }
}

function resetVisualBuilder() {
    visualBuilderData.selectedTask = null;
    visualBuilderData.connectingFromTask = null;
    renderVisualBuilder();
}

// ===== SIMPLIFIED MODALS FOR QUESTS PAGE =====

function openTaskLinkingModal(taskId, taskName) {
    const task = currentQuestTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('modal-linking-title').textContent = `Link "${taskName}" to another task`;
    document.getElementById('modal-linking-desc').textContent = `When this task is complete, which task should come next?`;
    
    // Populate select with other tasks
    const select = document.getElementById('task-link-to-select');
    select.innerHTML = '<option value="">-- Select Task --</option>';
    
    currentQuestTasks.filter(t => t.id !== taskId).forEach(t => {
        select.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`;
    });
    
    // Check if already required
    document.getElementById('task-link-required-checkbox').checked = task.is_required;
    
    // Store current task ID for confirmation
    window.currentLinkingTaskId = taskId;
    
    openModal('modal-simple-task-linking');
}

async function confirmSimpleTaskLink() {
    const toTaskId = parseInt(document.getElementById('task-link-to-select').value);
    const fromTaskId = window.currentLinkingTaskId;
    
    if (!toTaskId) {
        alert('Please select a task to link to');
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'link_quest_tasks',
                from_task_id: fromTaskId,
                to_task_id: toTaskId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[confirmSimpleTaskLink] Tasks linked');
            await loadQuestTasks(currentQuestId);
            renderQuestsPageTasks();
            closeModal('modal-simple-task-linking');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('[confirmSimpleTaskLink] Error:', error);
        alert('Error linking tasks');
    }
}

function openTaskAssignmentModal(taskId, taskName) {
    document.getElementById('modal-assignment-title').textContent = `Assign "${taskName}"`;
    
    // Populate places
    const placeSelect = document.getElementById('task-assign-place-select');
    placeSelect.innerHTML = '<option value="">-- None --</option>';
    places.filter(p => p.world_id === navState.world_id).forEach(p => {
        placeSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
    });
    
    // Clear objects
    document.getElementById('task-assign-object-select').innerHTML = '<option value="">-- None --</option>';
    document.getElementById('task-assign-object-select').disabled = true;
    
    // Store task ID
    window.currentAssignmentTaskId = taskId;
    
    openModal('modal-simple-task-assignment');
}

function updateAssignmentObjects() {
    const placeId = parseInt(document.getElementById('task-assign-place-select').value);
    const objectSelect = document.getElementById('task-assign-object-select');
    
    if (!placeId) {
        objectSelect.innerHTML = '<option value="">-- None --</option>';
        objectSelect.disabled = true;
        return;
    }
    
    objectSelect.disabled = false;
    objectSelect.innerHTML = '<option value="">-- None --</option>';
    
    const roomObjects = objects.filter(o => o.place_id === placeId);
    roomObjects.forEach(obj => {
        objectSelect.innerHTML += `<option value="${obj.id}">${escapeHtml(obj.name)}</option>`;
    });
}

async function confirmSimpleTaskAssignment() {
    const placeId = parseInt(document.getElementById('task-assign-place-select').value) || null;
    const objectId = parseInt(document.getElementById('task-assign-object-select').value) || null;
    const taskId = window.currentAssignmentTaskId;
    
    if (!placeId && !objectId) {
        alert('Please select at least a room or object');
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_task_to_place',
                task_id: taskId,
                place_id: placeId || currentPlaceId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[confirmSimpleTaskAssignment] Task assigned');
            await loadQuestTasks(currentQuestId);
            renderQuestsPageTasks();
            closeModal('modal-simple-task-assignment');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('[confirmSimpleTaskAssignment] Error:', error);
        alert('Error assigning task');
    }
}

