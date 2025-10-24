// Interactive Map Tool JavaScript
// Handles drawing, pins, notes, and save/load functionality

let canvas, ctx;
let currentTool = 'cursor';
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

// Simple HTML escaper for safe tooltip and list rendering
function escapeHtml(value) {
    const text = String(value == null ? '' : value);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, ch => map[ch]);
}

// Robust unique id generator for user pins
function generateId() {
    return (Date.now() * 1000) + Math.floor(Math.random() * 1000);
}

// Heuristic to identify building-like pins (base/draft)
function isBuildingLikePin(pin) {
    if (!pin || typeof pin !== 'object') return false;
    const fields = [pin.category, pin.type, pin.kind];
    for (let i = 0; i < fields.length; i++) {
        const v = fields[i];
        if (typeof v === 'string' && /\b(build|bldg)\b/i.test(v)) return true;
    }
    if (pin.isBuilding === true) return true;
    return false;
}

// Shipped base data
let basePins = [];
let baseCategories = [];
let visibleBaseCategories = new Set();
let baseBuildings = [];
let showBuildings = true;
let draftBuildings = [];
let authorAddingBuilding = false;

// Authoring state (always enabled)
let authorMode = true;
let draftBasePins = [];

// Cached project folder handle (not persisted across browser restarts)
let projectFolderHandle = null;

// IndexedDB helpers for persisting directory handle
async function idbOpen() {
    return await new Promise((resolve, reject) => {
        const req = indexedDB.open('mapToolDB', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbSet(store, key, value) {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
async function idbGet(store, key) {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

const PROJECT_HANDLE_KEY = 'projectFolderHandle';

async function tryRestoreProjectFolderHandle() {
    if (!('showDirectoryPicker' in window) || !('indexedDB' in window)) return null;
    try {
        const handle = await idbGet('settings', PROJECT_HANDLE_KEY);
        if (!handle) return null;
        if (typeof handle.requestPermission === 'function') {
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') { projectFolderHandle = handle; return handle; }
            const req = await handle.requestPermission({ mode: 'readwrite' });
            if (req === 'granted') { projectFolderHandle = handle; return handle; }
        }
        return null;
    } catch (_) { return null; }
}

function updateProjectFolderStatus() {
    const el = document.getElementById('projectFolderStatus');
    if (!el) return;
    const isSet = !!projectFolderHandle;
    el.textContent = isSet ? 'Set' : 'Not set';
}

(function wireSettings(){
    document.addEventListener('DOMContentLoaded', async () => {
        await tryRestoreProjectFolderHandle();
        updateProjectFolderStatus();
        const setBtn = document.getElementById('settingsSetProjectFolderBtn');
        const clearBtn = document.getElementById('settingsClearProjectFolderBtn');
        if (setBtn) setBtn.addEventListener('click', async () => {
            try {
                if (!('showDirectoryPicker' in window)) { alert('Use a Chromium-based browser.'); return; }
                alert('Select the project folder (contains index.html).');
                projectFolderHandle = await window.showDirectoryPicker();
                const hasIndex = await projectFolderHandle.getFileHandle('index.html').then(() => true).catch(() => false);
                if (!hasIndex) alert('Selected folder does not contain index.html.');
                if ('indexedDB' in window) await idbSet('settings', PROJECT_HANDLE_KEY, projectFolderHandle);
                updateProjectFolderStatus();
            } catch (err) {
                console.error(err);
                alert('Failed to set project folder: ' + err.message);
            }
        });
        if (clearBtn) clearBtn.addEventListener('click', async () => {
            projectFolderHandle = null;
            if ('indexedDB' in window) await idbSet('settings', PROJECT_HANDLE_KEY, null);
            updateProjectFolderStatus();
            alert('Cleared saved project folder. You will be prompted next time a save is needed.');
        });
    });
})();

async function getProjectFolderHandleOrPrompt(message) {
    if (projectFolderHandle) return projectFolderHandle;
    await tryRestoreProjectFolderHandle();
    if (projectFolderHandle) return projectFolderHandle;
    // Be quiet by default: do not prompt automatically; callers can decide if they want to force prompt
    return null;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('mapCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up file upload
    document.getElementById('mapUpload').addEventListener('change', handleMapUpload);
    // Ensure final state persists on tab close/refresh
    window.addEventListener('beforeunload', () => { try { saveMapData(); } catch(_) {} });
    
    // Set up drawing settings
    const bs = document.getElementById('brushSize');
    const doEl = document.getElementById('drawOpacity');
    if (bs) bs.addEventListener('input', function() { const el = document.getElementById('brushSizeValue'); if (el) el.textContent = this.value; });
    if (doEl) doEl.addEventListener('input', function() { const el = document.getElementById('opacityValue'); if (el) el.textContent = this.value; });
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Keyboard for pan (Space)
    document.addEventListener('keydown', function(e) { if (e.code === 'Space') isSpacePressed = true; });
    document.addEventListener('keyup', function(e) { if (e.code === 'Space') { isSpacePressed = false; isPanning = false; } });

    // Map selection
    const mapSelect = document.getElementById('mapSelect');
    if (mapSelect) {
        const savedSelected = localStorage.getItem('mapTool:selectedMap');
        if (savedSelected) selectedMap = savedSelected;
        mapSelect.value = selectedMap;
        mapSelect.addEventListener('change', function() {
            saveMapData();
            selectedMap = this.value;
            localStorage.setItem('mapTool:selectedMap', selectedMap);
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

	// Layer preset bar (chips) wiring
	(function wireLayerPresetBar(){
		const bar = document.getElementById('layerPresetBar');
		if (!bar) return;
		const visKey = () => 'mapTool:visibleCats:' + selectedMap;
		const showBuildingsKey = () => 'mapTool:showBuildings:' + selectedMap;
		function updateChipsActive() {
			bar.querySelectorAll('button[data-toggle]').forEach(btn => {
				const cat = btn.getAttribute('data-toggle');
				if (visibleBaseCategories.has(cat)) btn.classList.add('active');
				else btn.classList.remove('active');
			});
			const b = bar.querySelector('button[data-toggle-buildings="true"]');
			if (b) {
				if (showBuildings) b.classList.add('active'); else b.classList.remove('active');
			}
		}
		bar.addEventListener('click', (e) => {
			const t = e.target.closest('button');
			if (!t) return;
			if (t.hasAttribute('data-toggle')) {
				const cat = t.getAttribute('data-toggle');
				if (visibleBaseCategories.has(cat)) visibleBaseCategories.delete(cat); else visibleBaseCategories.add(cat);
				try { localStorage.setItem(visKey(), JSON.stringify(Array.from(visibleBaseCategories))); } catch(_) {}
				renderCanvas();
				updateChipsActive();
				return;
			}
			if (t.hasAttribute('data-toggle-buildings')) {
				showBuildings = !showBuildings;
				try { localStorage.setItem(showBuildingsKey(), JSON.stringify(showBuildings)); } catch(_) {}
				renderCanvas();
				updateChipsActive();
				return;
			}
		});
		// Initialize from saved
		try {
			const savedShow = localStorage.getItem(showBuildingsKey());
			if (savedShow !== null) showBuildings = JSON.parse(savedShow);
		} catch(_) {}
		updateChipsActive();
	})();
    
    // Load base shipped data and saved data
    loadBaseDataForSelectedMap();
    loadMapData();
});

// Set active tool
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-button').forEach(btn => { btn.classList.remove('active'); });
    const btnId = 'tool' + tool.charAt(0).toUpperCase() + tool.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');

    // Update info
    const toolNames = { cursor: 'Hover/click pins to inspect', pin: 'Click to add a pin', draw: 'Click and drag to draw', erase: 'Click and drag to erase' };
    const info = document.getElementById('toolInfo');
    if (info) info.textContent = toolNames[tool] || 'Select a tool';

    // Update cursor
    if (tool === 'draw' || tool === 'erase') canvas.style.cursor = 'crosshair';
    else if (tool === 'pin') canvas.style.cursor = 'pointer';
    else canvas.style.cursor = 'default';
}

// Marker type selection (used by sidebar pin type buttons)
function setMarkerType(type, color) {
    currentMarkerType = type;
    if (color) currentMarkerColor = color;
    try {
        const section = document.getElementById('pinTypesSection');
        if (section) {
            section.querySelectorAll('.marker-type').forEach(el => el.classList.remove('active'));
            const match = Array.from(section.querySelectorAll('.marker-type')).find(el => (el.style.getPropertyValue('--marker-color') || '').trim() === (color || '').trim());
            if (match) match.classList.add('active');
        }
    } catch (_) {}
    setTool('pin');
}


// Handle map image upload
function handleMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            try {
                const off = document.createElement('canvas');
                off.width = img.width; off.height = img.height;
                const octx = off.getContext('2d'); octx.drawImage(img, 0, 0);
                baseMapImageData = off.toDataURL('image/jpeg', 0.8);
            } catch (err) { baseMapImageData = e.target.result; }
            const baseImg = new Image();
            baseImg.onload = function() {
                mapImage = baseImg;
                canvas.width = baseImg.width; canvas.height = baseImg.height;
                canvas.style.display = 'block';
                document.getElementById('noMapMessage').style.display = 'none';
                renderCanvas();
                saveMapData();
            };
            baseImg.src = baseMapImageData;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

// Mouse event handlers
function handleMouseDown(e) {
    if (!mapImage) return;
    if (e && e.stopPropagation) e.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (isSpacePressed) { isPanning = true; panStart = { x: e.clientX, y: e.clientY }; offsetStart = { x: offsetX, y: offsetY }; }
    else if (currentTool === 'pin') {
        addPin(x, y);
        saveMapData();
        setTool('cursor');
    } else if (authorMode && authorAddingBuilding) {
        const name = prompt('Building name:','');
        if (name && name.trim()) { draftBuildings.push({ x, y, name: name.trim() }); renderCanvas(); saveMapData(); autoSave(); }
        authorAddingBuilding = false;
    } else if (currentTool === 'draw' || currentTool === 'erase') {
        isDrawing = true;
        drawingHistory.push({ tool: currentTool, color: document.getElementById('drawColor').value, size: parseInt(document.getElementById('brushSize').value), opacity: parseInt(document.getElementById('drawOpacity').value) / 100, points: [{x, y}] });
    }
}

function handleMouseMove(e) {
    if (!mapImage) return;
    if (e && e.stopPropagation) e.stopPropagation();
    if (isPanning) { const dx = e.clientX - panStart.x; const dy = e.clientY - panStart.y; offsetX = offsetStart.x + dx; offsetY = offsetStart.y + dy; applyZoom(); return; }
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const currentDrawing = drawingHistory[drawingHistory.length - 1]; currentDrawing.points.push({x, y});
        renderCanvas(); saveMapData();
    if (saveDebounceId) clearTimeout(saveDebounceId);
    saveDebounceId = setTimeout(() => { saveMapData(); }, 750);
}

function handleMouseUp(e) { if (e && e.stopPropagation) e.stopPropagation(); if (isPanning) { isPanning = false; return; } if (isDrawing) { isDrawing = false; saveMapData(); } }

// Add a pin (user pins)
function addPin(x, y) {
    const note = prompt('Add a note for this pin (optional):');
    const pin = { id: generateId(), x, y, type: currentMarkerType, color: currentMarkerColor, note: note || '' };
    pins.push(pin); updatePinsList(); renderCanvas(); saveMapData();
}

// Update pins list in sidebar
function updatePinsList() {
    const pinsList = document.getElementById('pinsList'); if (!pinsList) return;
    const pc = document.getElementById('pinCount'); if (pc) pc.textContent = 0;
    pinsList.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center;">Pins are shown on the map. Sidebar list hidden.</p>';
}

function focusPin(pinId) { const pin = pins.find(p => p.id === pinId); if (!pin) return; renderCanvas(); ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pin.x, pin.y, 30, 0, Math.PI * 2); ctx.stroke(); }
function deletePin(pinId) { pins = pins.filter(p => p.id !== pinId); updatePinsList(); renderCanvas(); saveMapData(); }

// Clear drawing/pins
function clearAllPins() { if (pins.length === 0) return; if (confirm('Clear all pins?')) { pins = []; updatePinsList(); renderCanvas(); saveMapData(); } }
function clearDrawing() { if (drawingHistory.length === 0) return; if (confirm('Clear all drawings?')) { drawingHistory = []; renderCanvas(); saveMapData(); } }

// Render the entire canvas
function renderCanvas() {
    if (!mapImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // Buildings
    drawBuildings();
    // Base pins
    drawBasePins();

    // Draw drawings
    drawingHistory.forEach(d => {
        if (d.points.length < 2) return;
        ctx.strokeStyle = d.tool === 'erase' ? 'rgba(0,0,0,1)' : d.color;
        ctx.lineWidth = d.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = d.tool === 'erase' ? 1 : d.opacity; ctx.globalCompositeOperation = d.tool === 'erase' ? 'destination-out' : 'source-over';
        ctx.beginPath(); ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i=1;i<d.points.length;i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    });

    // User pins - use same glyphs as base and respect visibility toggles
    pins.forEach(pin => {
        const typeRaw = String(pin.type || '');
        const type = typeRaw.toLowerCase();
        const isBuilding = type.includes('building');
        if (isBuilding) {
            if (!showBuildings) return;
        } else {
            const cat = (typeRaw === 'Keys' || type === 'keys') ? 'Keys' : (typeRaw === 'Spawns' || type === 'spawns') ? 'Spawns' : (typeRaw === 'Extracts' || type === 'extracts') ? 'Extracts' : null;
            if (cat && visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
        }
        if (isBuilding) {
            // Render building label text only (no dot)
            ctx.fillStyle = '#ffffff';
            ctx.font = `${pin.labelSize || 16}px Arial`;
            const label = pin.label || pin.note || pin.type || 'Building';
            ctx.fillText(label, pin.x + 4, pin.y + 4);
            return;
        }
        // Icon markers aligned with base semantics
        const colorMap = { 'keys':'#ffaa00','spawns':'#44ff44','extracts':'#00d4ff' };
        const color = colorMap[type] || pin.color || '#cccccc';
        ctx.save(); ctx.translate(pin.x, pin.y);
        ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        if (type === 'keys') {
            // Draw an emoji-like key using text for consistency
            ctx.font = '20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial';
            ctx.fillText('🔑', -6, 6);
        } else if (type === 'spawns') {
            ctx.font = '20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial';
            ctx.fillText('⬇️', -8, 6);
        } else if (type === 'extracts') {
            ctx.font = '20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial';
            ctx.fillText('⬆️', -8, 6);
        } else {
            // Fallback: if user pin has a known label like 'Keys' etc, use emoji mapping
            if ((pin.label||'').toLowerCase()==='keys') { ctx.font='20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial'; ctx.fillText('🔑', -6, 6); }
            else if ((pin.label||'').toLowerCase()==='spawns') { ctx.font='20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial'; ctx.fillText('⬇️', -8, 6); }
            else if ((pin.label||'').toLowerCase()==='extracts') { ctx.font='20px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial'; ctx.fillText('⬆️', -8, 6); }
            else { ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        }
        ctx.restore();
        // Draw label/title next to marker if available
        const labelText = pin.label || '';
        if (labelText) { ctx.fillStyle = '#fff'; ctx.font = `${pin.labelSize || 12}px Arial`; ctx.fillText(labelText, pin.x + 20, pin.y + 6); }
    });

    // Draft base pins on top
    drawDraftBasePinsOnTop();

    // Keep layer chips visually in sync after any render
    try { if (typeof window !== 'undefined' && typeof window.syncLayerChipsNow === 'function') window.syncLayerChipsNow(); } catch(_) {}
}

// Draw base pins (shipped)
function drawBasePins() {
    if (!basePins || basePins.length === 0) return;
    const categoryColor = { 'Keys': '#ffaa00', 'Spawns': '#44ff44', 'Extracts': '#00d4ff' };
    basePins.forEach(pin => {
        const cat = pin.category || pin.type || 'Misc';
        const isBuilding = isBuildingLikePin(pin) || String(cat).toLowerCase()==='buildings';
        if (isBuilding) {
            if (!showBuildings) return;
            // Render building label text only (no marker)
            const text = pin.label || pin.name || pin.type || '';
            if (!text) return;
            ctx.fillStyle = '#ffffff';
            ctx.font = `${pin.labelSize || 16}px Arial`;
            ctx.fillText(text, pin.x + 4, pin.y + 4);
            return;
        }
        if (visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
        const color = pin.color || categoryColor[cat] || '#cccccc';
        ctx.save(); ctx.translate(pin.x, pin.y); ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        if (pin.label) { ctx.fillStyle = '#fff'; ctx.font = `${pin.labelSize || 12}px Arial`; ctx.fillText(pin.label, pin.x + 14, pin.y + 4); }
    });
}

// Draw buildings
function drawBuildings() {
    if (!showBuildings) return; if (!baseBuildings || baseBuildings.length === 0) return;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font = 'bold 18px Segoe UI, Roboto, Arial';
    baseBuildings.forEach(b => { const name=b.name||b.label||''; if (!name) return; ctx.fillStyle='rgba(0,0,0,0.55)'; for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++){ if(dx===0&&dy===0) continue; ctx.fillText(name,b.x+dx,b.y+dy);} ctx.fillStyle='#66b3ff'; ctx.fillText(name,b.x,b.y); });
    ctx.restore();
}

function drawDraftBasePinsOnTop() {
    if (!draftBasePins || draftBasePins.length === 0) return;
    const categoryColor = { 'Keys': '#ffaa00', 'Spawns': '#44ff44', 'Extracts': '#00d4ff', 'Loot':'#44ff44','Vantage':'#44ffff','Danger':'#ff4444','Buildings':'#66b3ff' };
    draftBasePins.forEach(pin => {
        const cat = pin.category || pin.type || 'Misc';
        const isBuilding = isBuildingLikePin(pin) || String(cat).toLowerCase()==='buildings';
        if (isBuilding) {
            if (!showBuildings) return;
            // Text only for building labels
            const text = pin.label || pin.name || pin.type || '';
            if (!text) return;
            ctx.fillStyle = '#ffffff';
            ctx.font = `${pin.labelSize || 16}px Arial`;
            ctx.fillText(text, pin.x + 4, pin.y + 6);
            return;
        }
        if (visibleBaseCategories.size > 0 && !visibleBaseCategories.has(cat)) return;
        const color = categoryColor[cat] || '#cccccc';
        ctx.beginPath(); ctx.arc(pin.x, pin.y, 14, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        if (pin.label) { ctx.fillStyle = '#fff'; ctx.font = `${pin.labelSize || 12}px Arial`; ctx.fillText(pin.label, pin.x + 20, pin.y + 6); }
    });
}

// Zoom functions
function zoomIn() { zoomLevel *= 1.2; applyZoom(); }
function zoomOut() { zoomLevel /= 1.2; if (zoomLevel < 0.5) zoomLevel = 0.5; applyZoom(); }
function resetZoom() { zoomLevel = 1; offsetX = 0; offsetY = 0; applyZoom(); }
function applyZoom() { canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`; const label = document.getElementById('zoomLabel'); if (label) label.textContent = Math.round(zoomLevel * 100) + '%'; }

// Save map data to localStorage
function getStorageKey() { return 'mapToolData:' + selectedMap; }
function saveMapData() {
    const data = { pins: pins, drawings: drawingHistory, baseMapImageData: baseMapImageData, draftBasePins: draftBasePins, draftBuildings: draftBuildings };
    try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) { console.error('Failed to save map data:', e); }
}

// Load map data from localStorage
function loadMapData() {
    try {
        const saved = localStorage.getItem(getStorageKey());
        if (!saved) { loadDefaultMapImage(); updatePinsList(); return; }
        const data = JSON.parse(saved);
        pins = data.pins || []; drawingHistory = data.drawings || []; baseMapImageData = data.baseMapImageData || null; draftBasePins = data.draftBasePins || []; draftBuildings = data.draftBuildings || [];
        if (baseMapImageData) { const img = new Image(); img.onload = function(){ mapImage = img; canvas.width=img.width; canvas.height=img.height; canvas.style.display='block'; document.getElementById('noMapMessage').style.display='none'; renderCanvas(); updatePinsList(); }; img.src = baseMapImageData; }
        else { loadDefaultMapImage(); updatePinsList(); }
    } catch (e) { console.error('Failed to load map data:', e); }
}

// Default image loader
function loadDefaultMapImage() {
    const slug = getMapSlug(selectedMap); const path = `assets/maps/${slug}.png`;
    const img = new Image(); img.onload = function(){ try{ const off=document.createElement('canvas'); off.width=img.width; off.height=img.height; const octx=off.getContext('2d'); octx.drawImage(img,0,0); baseMapImageData=off.toDataURL('image/jpeg',0.8);}catch(err){ baseMapImageData=path; } const baseImg=new Image(); baseImg.onload=function(){ mapImage=baseImg; canvas.width=baseImg.width; canvas.height=baseImg.height; canvas.style.display='block'; document.getElementById('noMapMessage').style.display='none'; renderCanvas(); saveMapData(); }; baseImg.src=baseMapImageData; }; img.onerror=function(){ alert('Default image not found at ' + path + '.'); }; img.src=path; }

function getMapSlug(name) { const mapToSlug = { 'Farm': 'farm', 'Valley': 'valley', 'Northridge': 'northridge', 'Armory': 'armory', 'TV Station': 'tv-station' }; return mapToSlug[name] || name.toLowerCase().replace(/\s+/g, '-'); }

// Project folder selection
(function wireProjectFolderSetter(){ document.addEventListener('DOMContentLoaded', () => { const btn=document.getElementById('setProjectFolderBtn'); if(!btn) return; btn.addEventListener('click', async()=>{ try{ if(!('showDirectoryPicker'in window)){ alert('Use a Chromium-based browser.'); return;} alert('Select the project folder (contains index.html).'); projectFolderHandle = await window.showDirectoryPicker(); const hasIndex=await projectFolderHandle.getFileHandle('index.html').then(()=>true).catch(()=>false); if(!hasIndex) alert('Selected folder does not contain index.html.'); else alert('Project folder set.'); }catch(err){ console.error(err); alert('Failed to set project folder: '+err.message);} }); }); })();

// Remove duplicate noisy prompt version; rely on the quiet/restoring version above

// Author image attach
(function wireAuthorImageAttach(){ document.addEventListener('DOMContentLoaded', () => { const attachBtn=document.getElementById('attachImageBtn'); const fileInput=document.getElementById('authorImageInput'); if(!attachBtn||!fileInput) return; attachBtn.addEventListener('click', async()=>{ if (draftBasePins.length===0) { alert('Create a pin first.'); return; } fileInput.click(); }); fileInput.addEventListener('change', async(e)=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; try{ const dirHandle=await getProjectFolderHandleOrPrompt(); if(!dirHandle){ alert('Set project folder in Settings to attach images.'); return; } const hasIndex=await dirHandle.getFileHandle('index.html').then(()=>true).catch(()=>false); if(!hasIndex){ return; } const assetsDir=await dirHandle.getDirectoryHandle('assets',{create:true}); const mapsDir=await assetsDir.getDirectoryHandle('maps',{create:true}); const imagesDir=await mapsDir.getDirectoryHandle('images',{create:true}); const targetName=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const fileHandle=await imagesDir.getFileHandle(targetName,{create:true}); const writable=await fileHandle.createWritable(); await writable.write(file); await writable.close(); const last=draftBasePins[draftBasePins.length-1]; last.image=`assets/maps/images/${targetName}`; renderCanvas(); saveMapData(); await autoSave(); }catch(err){ console.error(err); alert('Attach failed: '+err.message);} finally{ fileInput.value=''; } }); }); })();

// Export base pins JSON (used by auto-save)
async function exportBasePinsJSON() {
    const merged = (basePins || []).concat(draftBasePins || []);
    const usedCats = new Set((baseCategories && baseCategories.length ? baseCategories : ['Keys','Spawns','Extracts']));
    merged.forEach(p => usedCats.add(p.category || p.type || 'Misc'));
    const payload = { map: selectedMap, image: `assets/maps/${getMapSlug(selectedMap)}.png`, categories: Array.from(usedCats), buildings: (baseBuildings || []).concat(draftBuildings || []), basePins: merged };
    try { localStorage.setItem(getShippedDataKey(), JSON.stringify(payload)); } catch(_) {}
    const dirHandle = await getProjectFolderHandleOrPrompt();
    if (!dirHandle) return; // Skip writing if no project selected
    const hasIndex = await dirHandle.getFileHandle('index.html').then(() => true).catch(() => false);
    if (!hasIndex) return; // Quietly skip if structure isn't recognized
    const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
    const mapsDir = await assetsDir.getDirectoryHandle('maps', { create: true });
    const dataDir = await mapsDir.getDirectoryHandle('data', { create: true });
    const fileName = `${getMapSlug(selectedMap)}.json`;
    const fileHandle = await dataDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable(); await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); await writable.close();
    basePins = merged; baseBuildings = payload.buildings; draftBasePins = []; draftBuildings = []; renderCanvas();
}

async function autoSave() { try { await exportBasePinsJSON(); } catch (e) { console.error('Auto-save failed:', e); } }

// Shipped data cache key
function getShippedDataKey() { return 'mapTool:shippedData:' + getMapSlug(selectedMap); }

// Load base data
function loadBaseDataForSelectedMap() {
    const slug = getMapSlug(selectedMap);
    const url = `assets/maps/data/${slug}.json?t=${Date.now()}`; // cache-bust
    basePins = []; baseCategories = []; baseBuildings = [];
    const togglesRoot = document.getElementById('baseLayerToggles'); const section = document.getElementById('baseLayersSection');
    if (togglesRoot) togglesRoot.innerHTML = ''; if (section) section.style.display = 'block';
    const applyData = (data) => {
        if (!data) return false;
        basePins = Array.isArray(data.basePins) ? data.basePins : [];
        baseCategories = Array.isArray(data.categories) ? data.categories : [];
        baseBuildings = Array.isArray(data.buildings) ? data.buildings : [];
        const visKey = 'mapTool:visibleCats:' + selectedMap;
        // Default to ALL categories visible on load (ignore any stale saved state)
        visibleBaseCategories = new Set(baseCategories);
        localStorage.setItem(visKey, JSON.stringify(Array.from(visibleBaseCategories)));
        // Default buildings ON on load
        showBuildings = true;
        // Render and sync chips
        renderCanvas();
        if (typeof syncLayerChipsNow === 'function') try { syncLayerChipsNow(); } catch(_) {}
        return true;
    };
    fetch(url, { cache: 'no-store' }).then(r=>r.ok?r.json():null).then(data=>{ if (data) { applyData(data); try{ localStorage.setItem(getShippedDataKey(), JSON.stringify(data)); }catch(_){} return; } try{ const cached=localStorage.getItem(getShippedDataKey()); if(cached){ const parsed=JSON.parse(cached); if(applyData(parsed)) return; } }catch(_){} console.warn('No base data found for', slug); }).catch(()=>{ try{ const cached=localStorage.getItem(getShippedDataKey()); if(cached){ const parsed=JSON.parse(cached); applyData(parsed); } }catch(_){} });
}

// Layer toggle chips
(function wireLayerToggleChips(){
    document.addEventListener('DOMContentLoaded', () => {
        const bar = document.getElementById('layerPresetBar'); if (!bar) return;
        const getVisKey = () => 'mapTool:visibleCats:' + selectedMap;
        const sync = () => { renderCanvas(); if (typeof syncLayerChipsNow === 'function') { try { syncLayerChipsNow(); } catch(_) {} } };
        bar.addEventListener('click', (e) => {
            const b = e.target.closest('button'); if (!b) return;
            if (b.hasAttribute('data-toggle-buildings')) { showBuildings = !showBuildings; sync(); return; }
            const cat = b.getAttribute('data-toggle'); if (!cat) return;
            if (visibleBaseCategories.has(cat)) visibleBaseCategories.delete(cat); else visibleBaseCategories.add(cat);
            localStorage.setItem(getVisKey(), JSON.stringify(Array.from(visibleBaseCategories)));
            sync();
        });
    });
})();

// Tooltip hover for pins (always on hover or click)
(function wirePinTooltip(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container'); const tooltip = document.getElementById('pinTooltip'); if (!container || !tooltip) return;
        const surface = document.getElementById('mapCanvas') || container;
        const pickNearestPin = (e) => {
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            // Convert mouse to canvas coordinate space for hit testing
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);
            let best = null; let bestD2 = Infinity; const consider = [];
            (draftBasePins || []).forEach(p => {
                const cat=p.category||p.type||'Misc';
                const isBuilding = isBuildingLikePin(p) || String(cat).toLowerCase()==='buildings';
                if (isBuilding && !showBuildings) return;
                if (!isBuilding && visibleBaseCategories.size>0 && !visibleBaseCategories.has(cat)) return;
                consider.push({ x:p.x, y:p.y, title:p.label || cat || 'Pin', notes:p.notes || '', image:p.image || '', type: 'draft', category: cat, noteSize: p.noteSize });
            });
            (basePins || []).forEach(p => { const cat=p.category||p.type||'Misc'; const isBuilding=isBuildingLikePin(p)||String(cat).toLowerCase()==='buildings'; if (isBuilding && !showBuildings) return; if (!isBuilding && visibleBaseCategories.size>0 && !visibleBaseCategories.has(cat)) return; consider.push({ x:p.x, y:p.y, title:p.label || cat, notes:p.notes || p.description || '', image:p.image || '', type:'base', category:cat, noteSize: p.noteSize }); });
            // User pins include label/title and category for tooltip
            (pins || []).forEach(p => {
                const tRaw = String(p.type || '');
                const t = tRaw.toLowerCase();
                const isB = t.includes('building');
                if (isB && !showBuildings) return;
                const cat = (tRaw === 'Keys' || t==='keys') ? 'Keys' : (tRaw === 'Spawns' || t==='spawns') ? 'Spawns' : (tRaw === 'Extracts' || t==='extracts') ? 'Extracts' : null;
                if (!isB && cat && visibleBaseCategories.size>0 && !visibleBaseCategories.has(cat)) return;
                consider.push({ x:p.x, y:p.y, title:p.label || p.type || 'Pin', notes:p.note || '', image:p.image || '', type:'user', category: cat || (isB ? 'Buildings' : ''), noteSize: p.noteSize });
            });
            consider.forEach(p=>{ const dx=p.x-mx, dy=p.y-my; const d2=dx*dx+dy*dy; if(d2<bestD2){bestD2=d2; best=p;} });
            if (best && bestD2 <= (64*64)) return best; return null;
        };
        const buildTooltip = (hit) => {
            let content = '<div class="title">' + escapeHtml(hit.title) + '</div>';
            if (hit.category) content += '<div class="category" style="color:#ffaa44; font-size:0.9rem; margin-bottom:0.5rem;">📌 ' + escapeHtml(hit.category) + '</div>';
            const size = parseInt(hit.noteSize || 16, 10); // slightly larger default for readability
            if (hit.notes && String(hit.notes).trim()) content += `<div class=\"notes\" style=\"font-size:${size}px; max-width: 420px\">` + escapeHtml(hit.notes) + '</div>'; else content += '<div class="notes" style="color:#888; font-style:italic;">No additional details available</div>';
            if (hit.image && String(hit.image).trim()) content += '<img class="preview" src="' + hit.image + '" alt="preview"/>';
            return content;
        };
        surface.addEventListener('mousemove', (e) => { const hit = pickNearestPin(e); if (hit) { tooltip.style.display=''; tooltip.innerHTML = buildTooltip(hit); const crect=container.getBoundingClientRect(); const cx=e.clientX - crect.left; const cy=e.clientY - crect.top; tooltip.style.left=cx+'px'; tooltip.style.top=(cy-10)+'px'; } else { tooltip.style.display='none'; } });
        surface.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display='none'; });
        let lastClickedKey=null, tooltipVisible=false;
        surface.addEventListener('click', (e) => { const hit = pickNearestPin(e); if (hit) { const key=(hit.type||'pin')+':' +(hit.category||'')+':'+(Math.round(hit.x)+','+Math.round(hit.y))+':'+(hit.title||''); if (lastClickedKey===key && tooltipVisible) { tooltip.style.display='none'; tooltipVisible=false; lastClickedKey=null; } else { tooltip.style.display=''; tooltip.innerHTML = buildTooltip(hit); const crect=container.getBoundingClientRect(); const cx=e.clientX - crect.left; const cy=e.clientY - crect.top; tooltip.style.left=cx+'px'; tooltip.style.top=(cy-10)+'px'; tooltipVisible=true; lastClickedKey=key; } } else { tooltip.style.display='none'; tooltipVisible=false; lastClickedKey=null; } });
    });
})();

// Context menu logic and auto-save
(function wireContextMenu(){
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.map-canvas-container'); const menu = document.getElementById('pinContextMenu'); const tooltip = document.getElementById('pinTooltip'); if (!container || !menu) return;
        let ctxTarget = null;
        const positionMenu = (e) => { const rect=container.getBoundingClientRect(); menu.style.left=(e.clientX-rect.left)+'px'; menu.style.top=(e.clientY-rect.top)+'px'; };
        const hitTest = (e) => { const rect=canvas.getBoundingClientRect(); const mx=(e.clientX-rect.left)*(canvas.width/rect.width); const my=(e.clientY-rect.top)*(canvas.height/rect.height); const all=[]; (draftBasePins||[]).forEach((p,i)=>all.push({src:'draft',i,x:p.x,y:p.y,p})); (basePins||[]).forEach((p,i)=>all.push({src:'base',i,x:p.x,y:p.y,p})); (pins||[]).forEach((p,i)=>all.push({src:'user',i,x:p.x,y:p.y,p})); let best=null,bestD2=Infinity; all.forEach(it=>{ const dx=it.x-mx,dy=it.y-my; const d2=dx*dx+dy*dy; if(d2<bestD2){bestD2=d2; best=it;} }); if (best && bestD2 <= 40*40) return best; return { src:'empty', x:mx, y:my } };
        container.addEventListener('contextmenu', (e) => { if (!canvas) return; e.preventDefault(); tooltip&&(tooltip.style.display='none'); ctxTarget = hitTest(e); positionMenu(e); menu.style.display=''; });
        document.addEventListener('click', (e) => { if (menu.contains(e.target)) return; menu.style.display='none'; });
        // Quiet ensure: if a project folder isn't set, skip writing instead of spamming prompts
        const ensureProject = async () => {
            try {
                if (!projectFolderHandle) return null;
                return projectFolderHandle;
            } catch(_) { return null; }
        };
        const addPinAt = async (category, x, y) => {
            const title=prompt(category+': Title', '')||'';
            const notes=prompt('Notes/details:', '')||'';
            // For user-facing data consistency: create user pins for Keys/Spawns/Extracts; Buildings remain draft base pins
            if (category === 'Buildings') {
                draftBasePins.push({ x, y, category, label:title, notes, image:'', labelSize:18, noteSize:16, isBuilding:true, id: generateId() }); saveMapData();
            } else {
                // Create user pin with a label so it renders text and tooltips correctly
                const newPin = { id: generateId(), x, y, type: category, label: title, color: '', note: notes, labelSize: 12, noteSize: 16 };
                pins = pins.concat([ newPin ]); // ensure no accidental reference overwrite
                updatePinsList();
                saveMapData();
            }
            renderCanvas();
            const hadProject=await ensureProject(); if (hadProject) await autoSave();
            
        };
        const editPin = async (target) => { if (!target || target.src==='empty') return; const p = target.p; const newTitle = prompt('Edit title:', p.label || p.type || ''); if (newTitle === null) return; const newNotes = prompt('Edit notes:', p.notes || p.note || ''); if (target.src==='draft'||target.src==='base') { p.label = newTitle; p.notes = newNotes || ''; } else if (target.src==='user') { p.label = newTitle || p.label; p.note = newNotes || ''; } renderCanvas(); saveMapData(); const hadProject=await ensureProject(); if (hadProject) await autoSave(); };
        const adjustNoteSize = async (target, delta) => { if (!target || target.src==='empty') return; const p=target.p; let size = parseInt(p.noteSize,10); if (!isFinite(size)) size = 14; size = Math.max(10, Math.min(48, size + delta)); p.noteSize = size; renderCanvas(); saveMapData(); const hadProject=await ensureProject(); if (hadProject) await autoSave(); };
        const adjustLabelSize = async (target, delta) => { if (!target || target.src==='empty') return; const p=target.p; let size = parseInt(p.labelSize,10); if (!isFinite(size)) size = 12; size = Math.max(10, Math.min(48, size + delta)); p.labelSize = size; renderCanvas(); saveMapData(); const hadProject=await ensureProject(); if (hadProject) await autoSave(); };
        const doDelete = async (target) => { if (!target) return; if (target.src === 'draft') { draftBasePins.splice(target.i,1); } else if (target.src === 'base') { basePins.splice(target.i,1); } else if (target.src === 'user') { pins.splice(target.i,1); updatePinsList(); } renderCanvas(); saveMapData(); const hadProject=await ensureProject(); if (hadProject) await autoSave(); };
        const doMove = async (target) => { if (!target || target.src==='empty') return; alert('Click the new location.'); let moving=true; const onClick=async(ev)=>{ if(!moving) return; moving=false; const rect=canvas.getBoundingClientRect(); const nx=(ev.clientX-rect.left)*(canvas.width/rect.width); const ny=(ev.clientY-rect.top)*(canvas.height/rect.height); if (target.src==='draft') { draftBasePins[target.i].x=nx; draftBasePins[target.i].y=ny; } else if (target.src==='base') { basePins[target.i].x=nx; basePins[target.i].y=ny; } else if (target.src==='user') { pins[target.i].x=nx; pins[target.i].y=ny; } renderCanvas(); if (target.src==='user') saveMapData(); const hadProject=await ensureProject(); if (hadProject) await autoSave(); container.removeEventListener('click', onClick, true); }; container.addEventListener('click', onClick, true); };
        menu.addEventListener('click', async (e) => { const btn = e.target.closest('button[data-act]'); if (!btn) return; const act=btn.getAttribute('data-act'); const t=ctxTarget; const isSizeAct = (act==='note-plus'||act==='note-minus'||act==='label-plus'||act==='label-minus'); if (!isSizeAct) { ctxTarget=null; menu.style.display='none'; } if (act.startsWith('add-')) { const catMap={ 'add-keys':'Keys','add-spawns':'Spawns','add-extracts':'Extracts','add-building':'Buildings' }; const cat=catMap[act]; await addPinAt(cat, t.x, t.y); return; } if (act==='delete') { await doDelete(t); return; } if (act==='move') { await doMove(t); return; } if (act==='show') { /* tooltip shows on hover/click */ return; } if (act==='edit') { await editPin(t); return; } if (act==='note-plus') { await adjustNoteSize(t, +2); return; } if (act==='note-minus') { await adjustNoteSize(t, -2); return; } if (act==='label-plus') { await adjustLabelSize(t, +2); return; } if (act==='label-minus') { await adjustLabelSize(t, -2); return; } });
    });
})();

// Editor/Inspector wiring
(function wireEditorInspector(){
    document.addEventListener('DOMContentLoaded', () => {
        const editor = document.getElementById('pinEditor');
        const peTitle = document.getElementById('peTitle');
        const peNotes = document.getElementById('peNotes');
        const peLabelSize = document.getElementById('peLabelSize');
        const peNoteSize = document.getElementById('peNoteSize');
        const peImage = document.getElementById('peImage');
        const peAttach = document.getElementById('peAttach');
        const peSave = document.getElementById('peSave');
        const peCancel = document.getElementById('peCancel');
        const inspector = document.getElementById('pinInspector');
        const piTitle = document.getElementById('piTitle');
        const piMeta = document.getElementById('piMeta');
        const piEdit = document.getElementById('piEdit');
        const piMove = document.getElementById('piMove');
        const piDelete = document.getElementById('piDelete');
        if (!editor || !inspector) return;

        let currentTarget = null; // {src, i, p}

        function openEditor(target) {
            currentTarget = target;
            const p = target.p;
            peTitle.value = p.label || p.type || '';
            peNotes.value = p.notes || p.note || '';
            peLabelSize.value = p.labelSize || 12;
            peNoteSize.value = p.noteSize || 16;
            peImage.value = p.image || '';
            editor.style.display = 'block';
            inspector.style.display = 'none';
            peTitle.focus();
        }
        function closeEditor() { editor.style.display = 'none'; }
        function openInspector(target) {
            currentTarget = target;
            const p = target.p; const cat = p.category || p.type || 'Pin';
            piTitle.textContent = p.label || p.type || 'Pin';
            piMeta.textContent = `${cat} • label ${p.labelSize||12}px • note ${p.noteSize||16}px`;
            inspector.style.display = 'block';
        }
        function closeInspector() { inspector.style.display = 'none'; }

        // Attach image to the pin currently being edited (works for user/base/draft)
        let peAttachTarget = null; // freeze target at time of click to avoid races
        const peHiddenFile = document.createElement('input');
        peHiddenFile.type = 'file'; peHiddenFile.accept = 'image/*'; peHiddenFile.style.display = 'none';
        editor.appendChild(peHiddenFile);
        peAttach.addEventListener('click', () => { peAttachTarget = currentTarget; peHiddenFile.click(); });
        peHiddenFile.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            const tgt = peAttachTarget; peAttachTarget = null;
            if (!file || !tgt) { peHiddenFile.value = ''; return; }
            try {
                const dirHandle = await getProjectFolderHandleOrPrompt();
                if (!dirHandle) { alert('Set project folder in Settings to attach images.'); peHiddenFile.value = ''; return; }
                const hasIndex = await dirHandle.getFileHandle('index.html').then(() => true).catch(() => false);
                if (!hasIndex) { peHiddenFile.value = ''; return; }
                const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
                const mapsDir = await assetsDir.getDirectoryHandle('maps', { create: true });
                const imagesDir = await mapsDir.getDirectoryHandle('images', { create: true });
                const targetName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
                const fileHandle = await imagesDir.getFileHandle(targetName, { create: true });
                const writable = await fileHandle.createWritable(); await writable.write(file); await writable.close();
                tgt.p.image = `assets/maps/images/${targetName}`;
                // Ensure user pins retain their category/type so icons remain (e.g., Keys)
                if (!tgt.p.label && (tgt.p.type)) tgt.p.label = tgt.p.type;
                renderCanvas(); saveMapData(); await autoSave();
            } catch (err) {
                console.error(err); alert('Attach failed: ' + err.message);
            } finally {
                peHiddenFile.value = '';
            }
        });
        peCancel.addEventListener('click', () => { closeEditor(); });
        peSave.addEventListener('click', async () => {
            if (!currentTarget) return;
            const p = currentTarget.p;
            const newTitle = peTitle.value || '';
            const newNotes = peNotes.value || '';
            const ls = parseInt(peLabelSize.value||12,10);
            const ns = parseInt(peNoteSize.value||16,10);
            const img = peImage.value || '';
            if (currentTarget.src==='user') { p.label = newTitle || p.label; p.note = newNotes; p.image = img || p.image; }
            else { p.label = newTitle; p.notes = newNotes; p.image = img; }
            p.labelSize = Math.max(10, Math.min(48, ls));
            p.noteSize = Math.max(10, Math.min(48, ns));
            closeEditor(); renderCanvas(); if (currentTarget.src==='user') saveMapData(); await autoSave();
        });

        // Connect inspector buttons
        piEdit.addEventListener('click', () => { if (currentTarget) openEditor(currentTarget); });
        piMove.addEventListener('click', async () => {
            if (!currentTarget) return;
            const tgt = currentTarget; currentTarget = null; closeInspector();
            const rect = canvas.getBoundingClientRect();
            let moving = true; alert('Click the new location.');
            const onClick = async (ev) => { if (!moving) return; moving=false; const nx=(ev.clientX-rect.left)*(canvas.width/rect.width); const ny=(ev.clientY-rect.top)*(canvas.height/rect.height); tgt.p.x=nx; tgt.p.y=ny; renderCanvas(); saveMapData(); await autoSave(); container.removeEventListener('click', onClick, true); };
            const container = document.querySelector('.map-canvas-container');
            container.addEventListener('click', onClick, true);
        });
        piDelete.addEventListener('click', async () => {
            if (!currentTarget) return; const t=currentTarget; currentTarget=null; closeInspector();
            if (t.src==='draft') draftBasePins.splice(t.i,1);
            else if (t.src==='base') basePins.splice(t.i,1);
            else if (t.src==='user') { pins.splice(t.i,1); updatePinsList(); }
            renderCanvas(); if (t.src==='user') saveMapData(); await autoSave();
        });

        // Open inspector on left-click selection
        const container = document.querySelector('.map-canvas-container');
        if (container) {
            container.addEventListener('click', (e) => {
                // Reuse context hitTest
                const rect = canvas.getBoundingClientRect();
                const mx=(e.clientX-rect.left)*(canvas.width/rect.width); const my=(e.clientY-rect.top)*(canvas.height/rect.height);
                const all=[]; (draftBasePins||[]).forEach((p,i)=>all.push({src:'draft',i,x:p.x,y:p.y,p})); (basePins||[]).forEach((p,i)=>all.push({src:'base',i,x:p.x,y:p.y,p})); (pins||[]).forEach((p,i)=>all.push({src:'user',i,x:p.x,y:p.y,p})); let best=null,bestD2=Infinity; all.forEach(it=>{ const dx=it.x-mx,dy=it.y-my; const d2=dx*dx+dy*dy; if(d2<bestD2){bestD2=d2; best=it;} });
                if (best && bestD2 <= 36*36) openInspector(best); else closeInspector();
            });
        }

        // Keyboard polish
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeEditor(); closeInspector(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (editor.style.display==='block') peSave.click(); }
        });
    });
})();

// Chip active styling sync
(function syncChipActive(){
    document.addEventListener('DOMContentLoaded', () => {
        const bar = document.getElementById('layerPresetBar'); if (!bar) return;
        const setActive = () => {
            bar.querySelectorAll('button[data-toggle]').forEach(btn => {
                const cat = btn.getAttribute('data-toggle');
                btn.classList.toggle('active', visibleBaseCategories.has(cat));
            });
            const b = bar.querySelector('button[data-toggle-buildings]'); if (b) b.classList.toggle('active', !!showBuildings);
        };
        setActive();
        bar.addEventListener('click', () => setTimeout(setActive, 0));
        // Expose a one-off sync function for initial load
        window.syncLayerChipsNow = setActive;
    });
})();

// Clear the current map and user data for the selected map
function clearMap() {
    if (!confirm('Clear the current map image and all pins/drawings for this map?')) return;
    pins = [];
    drawingHistory = [];
    baseMapImageData = null;
    mapImage = null;
    canvas.style.display = 'none';
    const msg = document.getElementById('noMapMessage'); if (msg) msg.style.display = 'block';
    updatePinsList();
    saveMapData();
}

// Export current canvas as an image (PNG)
function exportMapImage() {
    if (!canvas) return;
    try {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `map-${getMapSlug(selectedMap)}-${ts}.png`;
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export image: ' + err.message);
    }
}

