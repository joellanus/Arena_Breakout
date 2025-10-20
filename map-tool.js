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
            loadMapData();
        });
    }
    
    // Load saved data if exists
    loadMapData();
    
    console.log('Interactive Map Tool loaded!');
});

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

// Set marker type for pins
function setMarkerType(el, type, color) {
    currentMarkerType = type;
    currentMarkerColor = color;
    
    // Update active state
    document.querySelectorAll('.marker-type').forEach(marker => {
        marker.classList.remove('active');
    });
    if (el) el.classList.add('active');
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
        addPin(x, y);
    } else if (currentTool === 'draw' || currentTool === 'erase') {
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
    
    // Draw all pins
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
    const mapToSlug = {
        'Farm': 'farm',
        'Valley': 'valley',
        'Northridge': 'northridge',
        'Armory': 'armory',
        'TV Station': 'tv-station'
    };
    const slug = mapToSlug[selectedMap] || selectedMap.toLowerCase().replace(/\s+/g, '-');
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

