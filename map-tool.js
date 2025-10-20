// Interactive Map Tool JavaScript
// Handles drawing, pins, notes, and save/load functionality

let canvas, ctx;
let currentTool = null;
let isDrawing = false;
let isPanning = false;
let isSpacePressed = false;
let currentMarkerType = 'Danger';
let currentMarkerColor = '#ff4444';
let pins = [];
let drawingHistory = [];
let mapImage = null;
let baseMapImageData = null; // compressed base image
let zoomLevel = 1;
let offsetX = 0;
let offsetY = 0;
let panStart = { x: 0, y: 0 };
let offsetStart = { x: 0, y: 0 };
let saveDebounceId = null;
let selectedMap = 'Farm';

// Shipped base data
let basePins = [];
let baseCategories = [];
let visibleBaseCategories = new Set();

// Authoring state
let authorMode = false;
let draftBasePins = [];

// Debug: temporary click markers for authoring visibility
let clickMarkers = [];
function addClickMarker(x, y) {
    clickMarkers.push({ x, y, t: Date.now() });
    // keep only last 20 markers
    if (clickMarkers.length > 20) clickMarkers.shift();
}

function drawClickMarkers() {
    const now = Date.now();
    clickMarkers = clickMarkers.filter(m => now - m.t < 8000);
    clickMarkers.forEach(m => {
        const age = (now - m.t) / 8000; // 0..1
        const alpha = 1 - age;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x - 10, m.y);
        ctx.lineTo(m.x + 10, m.y);
        ctx.moveTo(m.x, m.y - 10);
        ctx.lineTo(m.x, m.y + 10);
        ctx.stroke();
        ctx.restore();
    });
}

// Hook up Author Mode UI after DOM ready additions
(function wireAuthorUI(){
    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('authorToggle');
        const catSel = document.getElementById('authorCategory');
        const exportBtn = document.getElementById('exportBasePinsBtn');
        const clearDraftBtn = document.getElementById('clearDraftPinsBtn');
        if (toggle) {
            toggle.addEventListener('change', () => {
                authorMode = !!toggle.checked;
                if (authorMode) {
                    try { setTool('pin'); } catch(_) {}
                }
            });
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', exportBasePinsJSON);
        }
        if (clearDraftBtn) {
            clearDraftBtn.addEventListener('click', () => {
                if (draftBasePins.length === 0) return;
                if (confirm('Clear all draft base pins?')) {
                    draftBasePins = [];
                    updateDraftCounter();
                    renderCanvas();
                }
            });
        }
    });
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('mapCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up file upload
    document.getElementById('mapUpload').addEventListener('change', handleMapUpload);
    
    // Set up drawing settings
    document.getElementById('brushSize').addEventListener('input', function() {
        document.getElementById('brushSizeValue').textContent = this.value;
    });
    
    document.getElementById('drawOpacity').addEventListener('input', function() {
        document.getElementById('opacityValue').textContent = this.value;
    });
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Keyboard for pan (Space)
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            isSpacePressed = true;
        }
    });
    document.addEventListener('keyup', function(e) {
        if (e.code === 'Space') {
            isSpacePressed = false;
            isPanning = false;
        }
    });

    // Map selection
    const mapSelect = document.getElementById('mapSelect');
    if (mapSelect) {
        const savedSelected = localStorage.getItem('mapTool:selectedMap');
        if (savedSelected) selectedMap = savedSelected;
        mapSelect.value = selectedMap;
        mapSelect.addEventListener('change', function() {
            // Save current before switching
            saveMapData();
            selectedMap = this.value;
            localStorage.setItem('mapTool:selectedMap', selectedMap);
            // Clear current view and load per-map data
            pins = [];
            drawingHistory = [];
            mapImage = null;
            baseMapImageData = null;
            canvas.style.display = 'none';
            document.getElementById('noMapMessage').style.display = 'block';
            updatePinsList();
            loadBaseDataForSelectedMap();
            loadMapData();
        });
    }
    
    // Load base shipped data and saved data
    loadBaseDataForSelectedMap();
    loadMapData();
    
    console.log('Interactive Map Tool loaded!');
});

// Ensure clicks land even if CSS transforms/pointer-events interfere
(function bindContainerEvents(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container');
        if (!container) return;
        container.addEventListener('mousedown', (e) => {
            if (!canvas) return;
            // ignore clicks on buttons/controls inside container
            const target = e.target;
            if (target && (target.closest('.zoom-controls') || target.closest('.map-info'))) return;
            // Compute canvas-space coordinates
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            // Simulate direct canvas mousedown
            // set flag and call underlying logic
            if (isSpacePressed) {
                isPanning = true;
                panStart = { x: e.clientX, y: e.clientY };
                offsetStart = { x: offsetX, y: offsetY };
            } else if (currentTool === 'pin') {
                logCanvasInfo('container-click-pin', x, y);
                addPin(x, y);
            } else if (currentTool === 'draw' || currentTool === 'erase') {
                logCanvasInfo('container-click-draw-start', x, y);
                isDrawing = true;
                drawingHistory.push({
                    tool: currentTool,
                    color: document.getElementById('drawColor').value,
                    size: parseInt(document.getElementById('brushSize').value),
                    opacity: parseInt(document.getElementById('drawOpacity').value) / 100,
                    points: [{x, y}]
                });
            }
        });
        container.addEventListener('mousemove', (e) => {
            if (!canvas) return;
            if (!isDrawing && !isPanning) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            if (isPanning) {
                const dx = e.clientX - panStart.x;
                const dy = e.clientY - panStart.y;
                offsetX = offsetStart.x + dx;
                offsetY = offsetStart.y + dy;
                applyZoom();
                return;
            }
            const currentDrawing = drawingHistory[drawingHistory.length - 1];
            currentDrawing.points.push({x, y});
            renderCanvas();
        });
        ['mouseup','mouseleave'].forEach(ev => {
            container.addEventListener(ev, () => {
                if (isPanning) { isPanning = false; return; }
                if (isDrawing) { isDrawing = false; saveMapData(); }
            });
        });
    });
})();

// Handle map image upload
function handleMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress to JPEG and keep as base
            try {
                const off = document.createElement('canvas');
                off.width = img.width;
                off.height = img.height;
                const octx = off.getContext('2d');
                octx.drawImage(img, 0, 0);
                baseMapImageData = off.toDataURL('image/jpeg', 0.8);
            } catch (err) {
                // Fallback to original
                baseMapImageData = e.target.result;
            }
            const baseImg = new Image();
            baseImg.onload = function() {
                mapImage = baseImg;

                // Set canvas size to match image
                canvas.width = baseImg.width;
                canvas.height = baseImg.height;

                // Show canvas, hide message
                canvas.style.display = 'block';
                document.getElementById('noMapMessage').style.display = 'none';

                // Render everything
                renderCanvas();
                saveMapData();

                console.log('Map loaded:', baseImg.width, 'x', baseImg.height);
            };
            baseImg.src = baseMapImageData;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Set active tool
function setTool(tool) {
    currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1)).classList.add('active');
    
    // Show/hide relevant sections
    document.getElementById('pinTypesSection').style.display = tool === 'pin' ? 'block' : 'none';
    document.getElementById('drawSettingsSection').style.display = tool === 'draw' ? 'block' : 'none';
    
    // Update info
    const toolNames = {
        pin: 'Click to add a pin',
        draw: 'Click and drag to draw',
        erase: 'Click and drag to erase'
    };
    document.getElementById('toolInfo').textContent = toolNames[tool] || 'Select a tool';
    
    // Update cursor
    if (tool === 'draw' || tool === 'erase') {
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'pin') {
        canvas.style.cursor = 'pointer';
    }
}

// Set marker type for pins (supports setMarkerType(el,type,color) or setMarkerType(type,color))
function setMarkerType(a, b, c) {
    let el = null, type = null, color = null;
    if (c !== undefined) {
        el = a; type = b; color = c;
    } else {
        type = a; color = b;
    }
    currentMarkerType = type;
    currentMarkerColor = color;
    // Update active state only if element is provided
    document.querySelectorAll('.marker-type').forEach(marker => {
        marker.classList.remove('active');
    });
    if (el && el.classList) el.classList.add('active');
}

// Mouse event handlers
function handleMouseDown(e) {
    if (!mapImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    if (isSpacePressed) {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        offsetStart = { x: offsetX, y: offsetY };
    } else if (currentTool === 'pin') {
        logCanvasInfo('click-pin', x, y);
        addPin(x, y);
    } else if (currentTool === 'draw' || currentTool === 'erase') {
        logCanvasInfo('click-draw-start', x, y);
        isDrawing = true;
        drawingHistory.push({
            tool: currentTool,
            color: document.getElementById('drawColor').value,
            size: parseInt(document.getElementById('brushSize').value),
            opacity: parseInt(document.getElementById('drawOpacity').value) / 100,
            points: [{x, y}]
        });
    }
}

function handleMouseMove(e) {
    if (!mapImage) return;
    if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        offsetX = offsetStart.x + dx;
        offsetY = offsetStart.y + dy;
        applyZoom();
        return;
    }
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Add point to current drawing
    const currentDrawing = drawingHistory[drawingHistory.length - 1];
    currentDrawing.points.push({x, y});
    
    renderCanvas();
    // Debounced save during drawing
    if (saveDebounceId) clearTimeout(saveDebounceId);
    saveDebounceId = setTimeout(() => {
        saveMapData();
    }, 750);
}

function handleMouseUp() {
    if (isPanning) {
        isPanning = false;
        return;
    }
    if (isDrawing) {
        isDrawing = false;
        saveMapData();
    }
}

// Add a pin with note
function addPin(x, y) {
    const note = prompt('Add a note for this pin (optional):');
    
    const pin = {
        id: Date.now(),
        x: x,
        y: y,
        type: currentMarkerType,
        color: currentMarkerColor,
        note: note || ''
    };
    
    pins.push(pin);
    updatePinsList();
    renderCanvas();
    saveMapData();
}

// Override addPin to handle author mode for base pins creation
const _addPin_original = addPin;
addPin = function(x, y) {
    if (authorMode) {
        const catSel = document.getElementById('authorCategory');
        const category = catSel ? catSel.value : 'Keys';
        const label = prompt('Label for this base pin (optional):', '');
        draftBasePins.push({ x, y, category, label: label || '' });
        try { console.log('Draft base pin added', { x, y, category, label }); } catch (_) {}
        updateDraftCounter();
        addClickMarker(x, y);
        renderCanvas();
        return;
    }
    // user pins (default)
    _addPin_original(x, y);
}

// Update pins list in sidebar
function updatePinsList() {
    const pinsList = document.getElementById('pinsList');
    document.getElementById('pinCount').textContent = pins.length;
    
    if (pins.length === 0) {
        pinsList.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center;">No pins yet</p>';
        return;
    }
    
    pinsList.innerHTML = pins.map(pin => `
        <div class="pin-item" style="--pin-color: ${pin.color}" onclick="focusPin(${pin.id})">
            <div class="pin-item-header">
                <span class="pin-type">${pin.type}</span>
                <button class="delete-btn" onclick="event.stopPropagation(); deletePin(${pin.id})">Delete</button>
            </div>
            ${pin.note ? `<div class="pin-note">${escapeHtml(pin.note)}</div>` : ''}
        </div>
    `).join('');
}

// Focus on a specific pin
function focusPin(pinId) {
    const pin = pins.find(p => p.id === pinId);
    if (!pin) return;
    
    // Flash the pin
    renderCanvas();
    
    // Draw a pulsing circle around the pin
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 30, 0, Math.PI * 2);
    ctx.stroke();
}

// Delete a pin
function deletePin(pinId) {
    pins = pins.filter(p => p.id !== pinId);
    updatePinsList();
    renderCanvas();
    saveMapData();
}

// Clear all pins
function clearAllPins() {
    if (pins.length === 0) return;
    
    if (confirm('Clear all pins?')) {
        pins = [];
        updatePinsList();
        renderCanvas();
        saveMapData();
    }
}

// Clear all drawings
function clearDrawing() {
    if (drawingHistory.length === 0) return;
    
    if (confirm('Clear all drawings?')) {
        drawingHistory = [];
        renderCanvas();
        saveMapData();
    }
}

// Clear entire map
function clearMap() {
    if (!mapImage) return;
    
    if (confirm('Clear entire map (including pins and drawings)?')) {
        mapImage = null;
        pins = [];
        drawingHistory = [];
        canvas.style.display = 'none';
        document.getElementById('noMapMessage').style.display = 'block';
        updatePinsList();
        saveMapData();
    }
}

// Render the entire canvas
function renderCanvas() {
    if (!mapImage) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw map image
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    // Ensure we draw overlays normally on top of the map
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // DEBUG: visible overlay rectangle to verify drawing
    ctx.save();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 80, 80);
    ctx.restore();

    // Draw base pins (shipped)
    drawBasePins();
    
    // Draw all drawing strokes
    drawingHistory.forEach(drawing => {
        if (drawing.points.length < 2) return;
        
        ctx.strokeStyle = drawing.tool === 'erase' ? 'rgba(0,0,0,1)' : drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = drawing.tool === 'erase' ? 1 : drawing.opacity;
        ctx.globalCompositeOperation = drawing.tool === 'erase' ? 'destination-out' : 'source-over';
        
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        
        for (let i = 1; i < drawing.points.length; i++) {
            ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    });
    
    // Draw all user pins on top
    pins.forEach(pin => {
        // Draw pin circle
        ctx.fillStyle = pin.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw pin border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw pin label
        if (pin.note) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(pin.x + 15, pin.y - 10, 20, 20);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText('📝', pin.x + 17, pin.y + 5);
        }
    });
    // Finally draw any draft base pins above everything
    drawDraftBasePinsOnTop();
    drawClickMarkers();
    updateDraftCounter(); // Update counter after rendering
}

// Draw base pins (shipped)
function drawBasePins() {
    if (!basePins || basePins.length === 0) return;
    const categoryColor = {
        'Keys': '#ffaa00',
        'Spawns': '#44ff44',
        'Extracts': '#00d4ff'
    };
    basePins.forEach(pin => {
        const cat = pin.category || pin.type || 'Misc';
        if (visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
        const color = pin.color || categoryColor[cat] || '#cccccc';
        // Diamond shape
        ctx.save();
        ctx.translate(pin.x, pin.y);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (pin.label) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(pin.label, pin.x + 14, pin.y + 4);
        }
    });
}

function drawDraftBasePinsOnTop() {
    if (!draftBasePins || draftBasePins.length === 0) return;
    const categoryColor = {
        'Keys': '#ffaa00',
        'Spawns': '#44ff44',
        'Extracts': '#00d4ff'
    };
    const categoryEmoji = {
        'Keys': '🔑',
        'Spawns': '🧍',
        'Extracts': '🚪'
    };
    draftBasePins.forEach(pin => {
        const color = categoryColor[pin.category] || '#cccccc';
        // Outer glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        ctx.restore();
        // Inner circle
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Emoji label
        const emoji = categoryEmoji[pin.category] || '📍';
        ctx.font = '16px Segoe UI Emoji, Apple Color Emoji';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(emoji, pin.x - 7, pin.y + 6);
        if (pin.label) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(pin.label, pin.x + 20, pin.y + 6);
        }
    });
}

// Zoom functions
function zoomIn() {
    zoomLevel *= 1.2;
    applyZoom();
}

function zoomOut() {
    zoomLevel /= 1.2;
    if (zoomLevel < 0.5) zoomLevel = 0.5;
    applyZoom();
}

function resetZoom() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    applyZoom();
}

function applyZoom() {
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
    const label = document.getElementById('zoomLabel');
    if (label) label.textContent = Math.round(zoomLevel * 100) + '%';
}

// Save map data to localStorage
function getStorageKey() {
    return 'mapToolData:' + selectedMap;
}

function saveMapData() {
    const data = {
        pins: pins,
        drawings: drawingHistory,
        baseMapImageData: baseMapImageData
    };
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(data));
        console.log('Map data saved for', selectedMap);
    } catch (e) {
        console.error('Failed to save map data:', e);
        alert('Failed to save map data. Your browser storage might be full.');
    }
}

// Load map data from localStorage
function loadMapData() {
    try {
        const saved = localStorage.getItem(getStorageKey());
        if (!saved) {
            // No local save: load shipped image
            loadDefaultMapImage();
            updatePinsList();
            return;
        }
        const data = JSON.parse(saved);
        pins = data.pins || [];
        drawingHistory = data.drawings || [];
        baseMapImageData = data.baseMapImageData || null;
        if (baseMapImageData) {
            const img = new Image();
            img.onload = function() {
                mapImage = img;
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.style.display = 'block';
                document.getElementById('noMapMessage').style.display = 'none';
                renderCanvas();
                updatePinsList();
            };
            img.src = baseMapImageData;
        } else {
            // Fallback to shipped image
            loadDefaultMapImage();
            updatePinsList();
        }
        console.log('Map data loaded for', selectedMap);
    } catch (e) {
        console.error('Failed to load map data:', e);
    }
}

// Export map as image
function exportMapImage() {
    if (!mapImage) {
        alert('No map loaded to export');
        return;
    }
    
    // Create a temporary link to download the canvas
    const link = document.createElement('a');
    link.download = 'project-breakpoint-map-' + Date.now() + '.png';
    link.href = canvas.toDataURL();
    link.click();
    
    console.log('Map exported');
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === '1') setTool('pin');
    if (e.key === '2') setTool('draw');
    if (e.key === '3') setTool('erase');
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveMapData();
        alert('Map saved!');
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'z' && drawingHistory.length > 0) {
        e.preventDefault();
        drawingHistory.pop();
        renderCanvas();
        saveMapData();
    }
});

console.log('Map Tool JS loaded. Keyboard shortcuts: 1=Pin, 2=Draw, 3=Erase, Space=Pan, Ctrl+S=Save, Ctrl+Z=Undo');

// Load default image for selected map from assets
function loadDefaultMapImage() {
    const slug = getMapSlug(selectedMap);
    const path = `assets/maps/${slug}.png`;
    const img = new Image();
    img.onload = function() {
        // Compress to JPEG and set as base
        try {
            const off = document.createElement('canvas');
            off.width = img.width;
            off.height = img.height;
            const octx = off.getContext('2d');
            octx.drawImage(img, 0, 0);
            baseMapImageData = off.toDataURL('image/jpeg', 0.8);
        } catch (err) {
            baseMapImageData = path; // fallback
        }
        const baseImg = new Image();
        baseImg.onload = function() {
            mapImage = baseImg;
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            canvas.style.display = 'block';
            document.getElementById('noMapMessage').style.display = 'none';
            renderCanvas();
            saveMapData();
            console.log('Default map loaded for', selectedMap);
        };
        baseImg.src = baseMapImageData;
    };
    img.onerror = function() {
        alert('Default image not found at ' + path + '. Place an image there or use Load Map Image.');
    };
    img.src = path;
}

function getMapSlug(name) {
    const mapToSlug = {
        'Farm': 'farm',
        'Valley': 'valley',
        'Northridge': 'northridge',
        'Armory': 'armory',
        'TV Station': 'tv-station'
    };
    return mapToSlug[name] || name.toLowerCase().replace(/\s+/g, '-');
}

function loadBaseDataForSelectedMap() {
    const slug = getMapSlug(selectedMap);
    const url = `assets/maps/data/${slug}.json`;
    basePins = [];
    baseCategories = [];
    const togglesRoot = document.getElementById('baseLayerToggles');
    const section = document.getElementById('baseLayersSection');
    if (togglesRoot) togglesRoot.innerHTML = '';
    if (section) section.style.display = 'none';
    fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return;
        basePins = Array.isArray(data.basePins) ? data.basePins : [];
        baseCategories = Array.isArray(data.categories) ? data.categories : [];
        // Initialize visibility from localStorage or default to all
        const visKey = 'mapTool:visibleCats:' + selectedMap;
        const saved = localStorage.getItem(visKey);
        if (saved) {
            try {
                visibleBaseCategories = new Set(JSON.parse(saved));
            } catch (_) {
                visibleBaseCategories = new Set(baseCategories);
            }
        } else {
            visibleBaseCategories = new Set(baseCategories);
        }
        if (section && togglesRoot && baseCategories.length > 0) {
            section.style.display = 'block';
            baseCategories.forEach(cat => {
                const id = 'bl-' + cat.replace(/[^a-z0-9]/ig, '').toLowerCase();
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.gap = '0.5rem';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = id;
                input.checked = visibleBaseCategories.has(cat);
                const label = document.createElement('label');
                label.htmlFor = id;
                label.textContent = cat;
                input.addEventListener('change', () => {
                    if (input.checked) visibleBaseCategories.add(cat); else visibleBaseCategories.delete(cat);
                    localStorage.setItem(visKey, JSON.stringify(Array.from(visibleBaseCategories)));
                    renderCanvas();
                });
                wrapper.appendChild(input);
                wrapper.appendChild(label);
                togglesRoot.appendChild(wrapper);
            });
        }
        renderCanvas();
    }).catch(() => {
        // no base data
    });
}

async function exportBasePinsJSON() {
    try {
        // Merge draft pins into base pins grouped by category
        const merged = (basePins || []).concat(draftBasePins || []);
        const payload = {
            map: selectedMap,
            image: `assets/maps/${getMapSlug(selectedMap)}.png`,
            categories: baseCategories.length ? baseCategories : ['Keys','Spawns','Extracts'],
            basePins: merged
        };
        // Request folder: ask for the project root (containing index.html)
        const supportsFS = 'showDirectoryPicker' in window;
        if (!supportsFS) {
            alert('Your browser does not support exporting. Please use a Chromium-based browser.');
            return;
        }
        alert('Select the project folder (the one that contains index.html). The tool will write into assets/maps/data/.');
        const dirHandle = await window.showDirectoryPicker();
        const hasIndex = await dirHandle.getFileHandle('index.html').then(() => true).catch(() => false);
        if (!hasIndex) {
            const proceed = confirm('Selected folder does not contain index.html. Continue anyway?');
            if (!proceed) return;
        }
        // Create nested directories assets/maps/data
        const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
        const mapsDir = await assetsDir.getDirectoryHandle('maps', { create: true });
        const dataDir = await mapsDir.getDirectoryHandle('data', { create: true });
        const fileName = `${getMapSlug(selectedMap)}.json`;
        const fileHandle = await dataDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        await writable.close();
        alert('Exported base pins to assets/maps/data/' + fileName + '\nCommit and push to ship these to everyone.');
        // Replace in-memory basePins with merged and clear draft
        basePins = merged;
        draftBasePins = [];
        renderCanvas();
    } catch (err) {
        console.error(err);
        alert('Export failed: ' + err.message);
    }
}

function updateDraftCounter() {
    const el = document.getElementById('draftCount');
    if (el) el.textContent = 'Draft pins: ' + (draftBasePins ? draftBasePins.length : 0);
}

// Sanity logging
function logCanvasInfo(prefix, x, y) {
    try { console.log(prefix, { canvasWidth: canvas && canvas.width, canvasHeight: canvas && canvas.height, x, y, tool: currentTool, authorMode }); } catch(_) {}
}

// Tooltip hover for pins
(function wirePinTooltip(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container');
        const tooltip = document.getElementById('pinTooltip');
        if (!container || !tooltip) return;
        const pickNearestPin = (mx, my) => {
            let best = null; let bestD2 = Infinity;
            const consider = [];
            // Include draft base pins
            (draftBasePins || []).forEach(p => consider.push({ x:p.x, y:p.y, label:p.label || p.category || 'Pin' }));
            // Include base shipped pins (respect visibility)
            (basePins || []).forEach(p => {
                const cat = p.category || p.type || 'Misc';
                if (visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
                consider.push({ x:p.x, y:p.y, label:p.label || cat });
            });
            // Include user pins
            (pins || []).forEach(p => consider.push({ x:p.x, y:p.y, label:p.note || p.type || 'Pin' }));
            consider.forEach(p => {
                const dx = p.x - mx, dy = p.y - my; const d2 = dx*dx + dy*dy;
                if (d2 < bestD2) { bestD2 = d2; best = p; }
            });
            if (best && bestD2 <= (40*40)) return best; // threshold ~40px
            return null;
        };
        container.addEventListener('mousemove', (e) => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);
            const hit = pickNearestPin(mx, my);
            if (hit) {
                // Position tooltip at cursor
                tooltip.style.display = '';
                tooltip.textContent = hit.label || 'Pin';
                const cx = e.clientX - container.getBoundingClientRect().left;
                const cy = e.clientY - container.getBoundingClientRect().top;
                tooltip.style.left = cx + 'px';
                tooltip.style.top = cy + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        });
        container.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display = 'none'; });
    });
})();

